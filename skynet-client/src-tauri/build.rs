fn main() {
    tauri_build::build();

    #[cfg(windows)]
    {
        use std::env;
        use std::path::PathBuf;

        let out_dir = PathBuf::from(env::var("OUT_DIR").unwrap());
        let manifest_dir = PathBuf::from(env::var("CARGO_MANIFEST_DIR").unwrap());
        let ffi_include = manifest_dir.join("simconnect-ffi/include");
        let ffi_lib = manifest_dir.join("simconnect-ffi/lib");

        let header = ffi_include.join("simconnect_minimal.h");
        if !header.exists() {
            return;
        }

        let bindings = bindgen::Builder::default()
            .header(header.to_string_lossy())
            .parse_callbacks(Box::new(bindgen::CargoCallbacks::new()))
            .generate()
            .expect("Failed to generate SimConnect bindings");

        bindings
            .write_to_file(out_dir.join("simconnect_bindings.rs"))
            .expect("Failed to write SimConnect bindings");

        println!("cargo:rerun-if-changed=simconnect-ffi/include/simconnect_minimal.h");
        println!("cargo:rustc-link-search=native={}", ffi_lib.display());
        println!("cargo:rustc-link-lib=SimConnect");

        for f in &["SimConnect.lib", "SimConnect.dll"] {
            let src = ffi_lib.join(f);
            if src.exists() {
                std::fs::copy(&src, out_dir.join(f)).ok();
            }
        }

        // Copy SimConnect.dll next to the executable so the app finds it at runtime
        let dll_src = ffi_lib.join("SimConnect.dll");
        if dll_src.exists() {
            // OUT_DIR is target/debug/build/<pkg>/out, so target/debug is out_dir/../..
            if let Some(target_debug) = out_dir.parent().and_then(|p| p.parent()) {
                let _ = std::fs::copy(&dll_src, target_debug.join("SimConnect.dll"));
            }
        }
    }
}
