@echo off
REM Launcher script to start both servers for portable desktop app
REM This script starts the Full Cast TTS server and Python video generator

setlocal enabledelayedexpansion

REM Get the directory where this script is located
set "LAUNCHER_DIR=%~dp0"
set "ROOT_DIR=%LAUNCHER_DIR%..\"

REM Configuration
set "FULL_CAST_PORT=4001"
set "VIDEO_GEN_PORT=8000"
REM In portable distribution, executables are in servers\ directory
set "FULL_CAST_EXE=%ROOT_DIR%servers\full-cast-tts.exe"
set "VIDEO_GEN_EXE=%ROOT_DIR%servers\video-generator.exe"

REM PID files for tracking processes
set "PID_DIR=%ROOT_DIR%launcher\pids"
if not exist "%PID_DIR%" mkdir "%PID_DIR%"
set "FULL_CAST_PID=%PID_DIR%\full-cast.pid"
set "VIDEO_GEN_PID=%PID_DIR%\video-gen.pid"

echo ========================================
echo YoRead Portable Desktop App - Servers
echo ========================================
echo.

REM Check if executables exist
if not exist "%FULL_CAST_EXE%" (
    echo ERROR: Full Cast TTS executable not found at:
    echo   %FULL_CAST_EXE%
    echo.
    echo Please ensure the portable distribution was built correctly.
    echo The executable should be in: servers\full-cast-tts.exe
    pause
    exit /b 1
)

if not exist "%VIDEO_GEN_EXE%" (
    echo ERROR: Video Generator executable not found at:
    echo   %VIDEO_GEN_EXE%
    echo.
    echo Please ensure the portable distribution was built correctly.
    echo The executable should be in: servers\video-generator.exe
    pause
    exit /b 1
)

REM Check if ports are already in use
netstat -ano | findstr ":%FULL_CAST_PORT% " >nul 2>&1
if not errorlevel 1 (
    echo WARNING: Port %FULL_CAST_PORT% is already in use
    echo The Full Cast TTS server may already be running
)

netstat -ano | findstr ":%VIDEO_GEN_PORT% " >nul 2>&1
if not errorlevel 1 (
    echo WARNING: Port %VIDEO_GEN_PORT% is already in use
    echo The Video Generator server may already be running
)

REM Start Full Cast TTS server
echo Starting Full Cast TTS server on port %FULL_CAST_PORT%...
start "Full Cast TTS Server" /MIN cmd /c ""%FULL_CAST_EXE%" --port %FULL_CAST_PORT%"
timeout /t 2 /nobreak >nul

REM Start Video Generator server
echo Starting Video Generator server on port %VIDEO_GEN_PORT%...
start "Video Generator Server" /MIN cmd /c ""%VIDEO_GEN_EXE%" --port %VIDEO_GEN_PORT%"
timeout /t 2 /nobreak >nul

REM Wait for servers to start
echo.
echo Waiting for servers to initialize...
timeout /t 5 /nobreak >nul

REM Check if servers are responding
echo Checking server health...
set "FULL_CAST_OK=0"
set "VIDEO_GEN_OK=0"

curl -s http://localhost:%FULL_CAST_PORT%/health >nul 2>nul
if not errorlevel 1 set FULL_CAST_OK=1

curl -s http://localhost:%VIDEO_GEN_PORT%/health >nul 2>nul
if not errorlevel 1 set VIDEO_GEN_OK=1

echo.
if !FULL_CAST_OK!==1 (
    echo [OK] Full Cast TTS server is running on port %FULL_CAST_PORT%
) else (
    echo [WARNING] Full Cast TTS server may not be ready yet
)

if !VIDEO_GEN_OK!==1 (
    echo [OK] Video Generator server is running on port %VIDEO_GEN_PORT%
) else (
    echo [WARNING] Video Generator server may not be ready yet
)

echo.
echo ========================================
echo Servers started! You can now use the application.
echo.
echo Full Cast TTS:    http://localhost:%FULL_CAST_PORT%
echo Video Generator:  http://localhost:%VIDEO_GEN_PORT%
echo.
echo To stop servers, run: shutdown-servers.bat
echo ========================================
echo.
echo Servers are running in background. This window will remain open.
echo Close this window to stop the servers.
echo.

REM Keep window open and monitor servers
:monitor
timeout /t 5 /nobreak >nul 2>nul
tasklist 2>nul | findstr /i "full-cast-tts.exe video-generator.exe" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] One or more servers have stopped
)
goto monitor

