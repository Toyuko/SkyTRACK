//! Minimal FSUIPC "user mode" (shared memory) client for 64-bit Windows.
//!
//! The upstream `fsuipc` crate gates its user-mode implementation to 32-bit
//! because the IPC header includes raw pointers, whose field width differs on
//! x64. MSFS / MSFS 2024 + FSUIPC7 are 64-bit, so we provide an x64 version
//! of the same protocol here.

#![cfg(all(windows, target_pointer_width = "64"))]

use byteorder::{LittleEndian, ReadBytesExt, WriteBytesExt};
use std::ffi::CString;
use std::io;
use std::io::{Read, Write};
use std::os::raw::c_void;
use std::ptr;

use windows_sys::Win32::Foundation::{CloseHandle, HANDLE, HWND};
use windows_sys::Win32::System::Memory::{
    CreateFileMappingA, MapViewOfFile, UnmapViewOfFile, MEMORY_MAPPED_VIEW_ADDRESS, FILE_MAP_WRITE,
    PAGE_READWRITE,
};
use windows_sys::Win32::System::DataExchange::{GlobalAddAtomA, GlobalDeleteAtom};
use windows_sys::Win32::System::Threading::GetCurrentProcessId;
use windows_sys::Win32::UI::WindowsAndMessaging::{
    FindWindowExA, RegisterWindowMessageA, SendMessageA,
};

const FS6IPC_MESSAGE_SUCCESS: isize = 1;
const FILE_MAPPING_LEN: usize = 64 * 1024;

static mut FILE_MAPPING_INDEX: u32 = 0;

fn next_file_mapping_index() -> u32 {
    unsafe {
        let next = FILE_MAPPING_INDEX;
        FILE_MAPPING_INDEX += 1;
        next
    }
}

pub struct UserHandle64 {
    hwnd: HWND,
    file_mapping_atom: u16,
    file_mapping: HANDLE,
    msg_id: u32,
    data: *mut u8,
}

// We access this handle through `Mutex` and perform all operations on the same
// thread that created the mapping. Marking as `Send` is safe for our usage.
unsafe impl Send for UserHandle64 {}

impl UserHandle64 {
    pub fn new() -> io::Result<Self> {
        unsafe {
            let win_name = CString::new("UIPCMAIN").unwrap();
            let hwnd = FindWindowExA(ptr::null_mut(), ptr::null_mut(), win_name.as_ptr() as *const u8, ptr::null());
            if hwnd.is_null() {
                return Err(io::Error::new(
                    io::ErrorKind::ConnectionRefused,
                    "cannot connect to FSUIPC: cannot find UIPCMAIN window (is FSUIPC running?)",
                ));
            }

            let msg_name = CString::new("FsasmLib:IPC").unwrap();
            let msg_id = RegisterWindowMessageA(msg_name.as_ptr() as *const u8);
            if msg_id == 0 {
                return Err(io::Error::new(
                    io::ErrorKind::ConnectionRefused,
                    "cannot connect to FSUIPC: cannot register window message",
                ));
            }

            let file_mapping_name = CString::new(format!(
                "FsasmLib:IPC:{:x}:{:x}",
                GetCurrentProcessId(),
                next_file_mapping_index()
            ))
            .unwrap();

            let file_mapping_atom = GlobalAddAtomA(file_mapping_name.as_ptr() as *const u8);
            if file_mapping_atom == 0 {
                return Err(io::Error::new(
                    io::ErrorKind::ConnectionRefused,
                    "cannot connect to FSUIPC: cannot add global atom",
                ));
            }

            // INVALID_HANDLE_VALUE = -1 (cast to HANDLE)
            let file_mapping = CreateFileMappingA(
                (-1isize) as HANDLE,
                ptr::null(),
                PAGE_READWRITE,
                0,
                FILE_MAPPING_LEN as u32,
                file_mapping_name.as_ptr() as *const u8,
            );
            if file_mapping.is_null() {
                GlobalDeleteAtom(file_mapping_atom);
                return Err(io::Error::new(
                    io::ErrorKind::ConnectionRefused,
                    "cannot connect to FSUIPC: cannot create file mapping",
                ));
            }

            let view = MapViewOfFile(file_mapping, FILE_MAP_WRITE, 0, 0, 0);
            let data = view.Value as *mut u8;
            if data.is_null() {
                CloseHandle(file_mapping);
                GlobalDeleteAtom(file_mapping_atom);
                return Err(io::Error::new(
                    io::ErrorKind::ConnectionRefused,
                    "cannot connect to FSUIPC: cannot map view of file",
                ));
            }

            Ok(Self {
                hwnd,
                file_mapping_atom,
                file_mapping,
                msg_id,
                data,
            })
        }
    }

    pub fn session(&mut self) -> UserSession64<'_> {
        let data = self.data;
        UserSession64 {
            handle: self,
            write_cursor: MutRawCursor::new(data, FILE_MAPPING_LEN),
        }
    }
}

impl Drop for UserHandle64 {
    fn drop(&mut self) {
        unsafe {
            GlobalDeleteAtom(self.file_mapping_atom);
            UnmapViewOfFile(MEMORY_MAPPED_VIEW_ADDRESS {
                Value: self.data as *mut c_void,
            });
            CloseHandle(self.file_mapping);
        }
    }
}

pub struct UserSession64<'a> {
    handle: &'a mut UserHandle64,
    write_cursor: MutRawCursor,
}

impl<'a> UserSession64<'a> {
    pub fn read_bytes(&mut self, offset: u16, dest: *mut u8, len: usize) -> io::Result<()> {
        write_rsd64(&mut self.write_cursor, offset, dest, len)?;
        Ok(())
    }

    pub fn read<T>(&mut self, offset: u16, out: &mut T) -> io::Result<()> {
        self.read_bytes(offset, out as *mut T as *mut u8, std::mem::size_of::<T>())
    }

    pub fn process(mut self) -> io::Result<()> {
        // termination mark
        self.write_cursor.write_u32::<LittleEndian>(0)?;

        unsafe {
            let send_result = SendMessageA(
                self.handle.hwnd,
                self.handle.msg_id,
                self.handle.file_mapping_atom as usize,
                0,
            );
            if send_result != FS6IPC_MESSAGE_SUCCESS {
                return Err(io::Error::new(
                    io::ErrorKind::InvalidData,
                    format!(
                        "FSUIPC rejected the requests with error {}; possible buffer corruption",
                        send_result
                    ),
                ));
            }
        }

        // Parse responses from shared memory and copy into requested destinations.
        let mut reader = RawCursor::new(self.handle.data as *const u8, FILE_MAPPING_LEN);
        loop {
            let msg_id = reader.read_u32::<LittleEndian>()?;
            match msg_id {
                0 => return Ok(()),
                1 => {
                    let _offset = reader.read_u32::<LittleEndian>()? as u16;
                    let len = reader.read_u32::<LittleEndian>()? as usize;
                    let target = reader.read_u64::<LittleEndian>()? as *mut u8;
                    let mut out = MutRawBytes::new(target, len);
                    copy_body(&mut reader, &mut out, len)?;
                }
                2 => {
                    let _offset = reader.read_u32::<LittleEndian>()? as u16;
                    let len = reader.read_u32::<LittleEndian>()? as usize;
                    // Skip body
                    reader.skip(len)?;
                }
                other => {
                    return Err(io::Error::new(
                        io::ErrorKind::InvalidData,
                        format!("unexpected message id {} while reading IPC response", other),
                    ));
                }
            }
        }
    }
}

fn write_rsd64<W: Write>(
    w: &mut W,
    offset: u16,
    dest: *mut u8,
    len: usize,
) -> io::Result<()> {
    // Header:
    // u32 id=1, u32 offset, u32 len, u64 target
    w.write_u32::<LittleEndian>(1)?;
    w.write_u32::<LittleEndian>(offset as u32)?;
    w.write_u32::<LittleEndian>(len as u32)?;
    w.write_u64::<LittleEndian>(dest as u64)?;
    // Body: len bytes of padding (zeros)
    for _ in 0..len {
        w.write_u8(0)?;
    }
    Ok(())
}

fn copy_body<R: Read, W: Write>(r: &mut R, w: &mut W, len: usize) -> io::Result<()> {
    for _ in 0..len {
        w.write_u8(r.read_u8()?)?;
    }
    Ok(())
}

struct RawCursor {
    ptr: *const u8,
    remaining: usize,
}

impl RawCursor {
    fn new(ptr: *const u8, len: usize) -> Self {
        Self { ptr, remaining: len }
    }

    fn skip(&mut self, n: usize) -> io::Result<()> {
        if n > self.remaining {
            return Err(io::Error::new(io::ErrorKind::UnexpectedEof, "IPC buffer underflow"));
        }
        unsafe {
            self.ptr = self.ptr.add(n);
        }
        self.remaining -= n;
        Ok(())
    }
}

impl Read for RawCursor {
    fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
        let n = std::cmp::min(self.remaining, buf.len());
        unsafe {
            ptr::copy_nonoverlapping(self.ptr, buf.as_mut_ptr(), n);
            self.ptr = self.ptr.add(n);
        }
        self.remaining -= n;
        Ok(n)
    }
}

struct MutRawCursor {
    ptr: *mut u8,
    remaining: usize,
}

impl MutRawCursor {
    fn new(ptr: *mut u8, len: usize) -> Self {
        Self { ptr, remaining: len }
    }
}

impl Write for MutRawCursor {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        let n = std::cmp::min(self.remaining, buf.len());
        unsafe {
            ptr::copy_nonoverlapping(buf.as_ptr(), self.ptr, n);
            self.ptr = self.ptr.add(n);
        }
        self.remaining -= n;
        Ok(n)
    }

    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

struct MutRawBytes {
    ptr: *mut u8,
    remaining: usize,
}

impl MutRawBytes {
    fn new(ptr: *mut u8, len: usize) -> Self {
        Self { ptr, remaining: len }
    }
}

impl Write for MutRawBytes {
    fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        let n = std::cmp::min(self.remaining, buf.len());
        unsafe {
            ptr::copy_nonoverlapping(buf.as_ptr(), self.ptr, n);
            self.ptr = self.ptr.add(n);
        }
        self.remaining -= n;
        Ok(n)
    }

    fn flush(&mut self) -> io::Result<()> {
        Ok(())
    }
}

