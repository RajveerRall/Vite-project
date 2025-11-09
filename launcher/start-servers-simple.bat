@echo off
REM Simple launcher script to start both servers
REM This version avoids PowerShell compatibility issues

setlocal enabledelayedexpansion

REM Get the directory where this script is located
set "LAUNCHER_DIR=%~dp0"
set "ROOT_DIR=%LAUNCHER_DIR%..\"

REM Configuration
set "FULL_CAST_PORT=4001"
set "VIDEO_GEN_PORT=8000"
set "FULL_CAST_EXE=%ROOT_DIR%servers\full-cast-tts.exe"
set "VIDEO_GEN_EXE=%ROOT_DIR%servers\video-generator.exe"

echo ========================================
echo YoRead Portable Desktop App - Servers
echo ========================================
echo.

REM Check if executables exist
if not exist "%FULL_CAST_EXE%" (
    echo ERROR: Full Cast TTS executable not found at:
    echo   %FULL_CAST_EXE%
    pause
    exit /b 1
)

if not exist "%VIDEO_GEN_EXE%" (
    echo ERROR: Video Generator executable not found at:
    echo   %VIDEO_GEN_EXE%
    pause
    exit /b 1
)

REM Start Full Cast TTS server in a new window
echo Starting Full Cast TTS server on port %FULL_CAST_PORT%...
start "Full Cast TTS Server" "%FULL_CAST_EXE%" --port %FULL_CAST_PORT%
timeout /t 2 /nobreak >nul 2>&1

REM Start Video Generator server in a new window
echo Starting Video Generator server on port %VIDEO_GEN_PORT%...
start "Video Generator Server" "%VIDEO_GEN_EXE%" --port %VIDEO_GEN_PORT%
timeout /t 2 /nobreak >nul 2>&1

REM Wait for servers to start
echo.
echo Waiting for servers to initialize...
timeout /t 5 /nobreak >nul 2>&1

echo.
echo ========================================
echo Servers should now be running!
echo.
echo Full Cast TTS:    http://localhost:%FULL_CAST_PORT%
echo Video Generator:  http://localhost:%VIDEO_GEN_PORT%
echo.
echo Check the server windows for status.
echo To stop servers, close their windows or run: shutdown-servers.bat
echo ========================================
echo.
pause


