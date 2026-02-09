/* Minimal SimConnect declarations for SkyNET - no Windows.h, C-only for bindgen */
#ifndef SIMCONNECT_MINIMAL_H
#define SIMCONNECT_MINIMAL_H

#ifdef _WIN32
typedef unsigned long DWORD;
typedef void* HANDLE;
typedef void* HWND;
typedef const char* LPCSTR;
typedef int BOOL;
#else
typedef unsigned long DWORD;
typedef void* HANDLE;
typedef void* HWND;
typedef const char* LPCSTR;
typedef int BOOL;
#endif

typedef DWORD SIMCONNECT_OBJECT_ID;
typedef DWORD SIMCONNECT_DATA_DEFINITION_ID;
typedef DWORD SIMCONNECT_DATA_REQUEST_ID;
typedef DWORD SIMCONNECT_DATA_REQUEST_FLAG;

typedef enum {
    SIMCONNECT_DATATYPE_INT32 = 1,
    SIMCONNECT_DATATYPE_FLOAT64 = 4,
    SIMCONNECT_DATATYPE_STRING256 = 8,
} SIMCONNECT_DATATYPE;

typedef enum {
    SIMCONNECT_PERIOD_NEVER = 0,
    SIMCONNECT_PERIOD_ONCE = 1,
    SIMCONNECT_PERIOD_VISUAL_FRAME = 2,
    SIMCONNECT_PERIOD_SIM_FRAME = 3,
    SIMCONNECT_PERIOD_SECOND = 4,
} SIMCONNECT_PERIOD;

#define SIMCONNECT_OBJECT_ID_USER 0
#define SIMCONNECT_UNUSED 0xFFFFFFFF

#pragma pack(push, 1)
typedef struct {
    DWORD dwSize;
    DWORD dwVersion;
    DWORD dwID;
} SIMCONNECT_RECV;

typedef struct {
    SIMCONNECT_RECV recv;
    DWORD dwRequestID;
    DWORD dwObjectID;
    DWORD dwDefineID;
    DWORD dwFlags;
    DWORD dwentrynumber;
    DWORD dwoutof;
    DWORD dwDefineCount;
    /* data follows - variable length */
} SIMCONNECT_RECV_SIMOBJECT_DATA;
#pragma pack(pop)

#define SIMCONNECT_RECV_ID_OPEN 2
#define SIMCONNECT_RECV_ID_SIMOBJECT_DATA 8

/* On x64 Windows there is only one calling convention; on x86 use __stdcall to match SimConnect.lib */
#ifdef _WIN32
 #ifdef _M_X64
  #define SIMCONNECTAPI
 #else
  #define SIMCONNECTAPI __stdcall
 #endif
#else
 #define SIMCONNECTAPI
#endif

typedef long HRESULT;

extern HRESULT SIMCONNECTAPI SimConnect_Open(HANDLE* phSimConnect, LPCSTR szName, HWND hWnd, DWORD UserEventWin32, HANDLE hEventHandle, DWORD ConfigIndex);
extern HRESULT SIMCONNECTAPI SimConnect_Close(HANDLE hSimConnect);
extern HRESULT SIMCONNECTAPI SimConnect_GetNextDispatch(HANDLE hSimConnect, SIMCONNECT_RECV** ppData, DWORD* pcbData);
extern HRESULT SIMCONNECTAPI SimConnect_AddToDataDefinition(HANDLE hSimConnect, SIMCONNECT_DATA_DEFINITION_ID DefineID, const char* DatumName, const char* UnitsName, SIMCONNECT_DATATYPE DatumType, float fEpsilon, DWORD DatumID);
extern HRESULT SIMCONNECTAPI SimConnect_ClearDataDefinition(HANDLE hSimConnect, SIMCONNECT_DATA_DEFINITION_ID DefineID);
extern HRESULT SIMCONNECTAPI SimConnect_RequestDataOnSimObject(HANDLE hSimConnect, SIMCONNECT_DATA_REQUEST_ID RequestID, SIMCONNECT_DATA_DEFINITION_ID DefineID, SIMCONNECT_OBJECT_ID ObjectID, SIMCONNECT_PERIOD Period, SIMCONNECT_DATA_REQUEST_FLAG Flags, DWORD origin, DWORD interval, DWORD limit);

#endif
