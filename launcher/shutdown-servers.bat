@echo off
REM Shutdown script to stop both servers

echo Stopping YoRead Portable Desktop App servers...
echo.

REM Kill Full Cast TTS server
taskkill /FI "WINDOWTITLE eq Full Cast TTS Server*" /T /F >nul 2>&1
taskkill /FI "IMAGENAME eq full-cast-tts.exe" /T /F >nul 2>&1
echo Stopped Full Cast TTS server

REM Kill Video Generator server
taskkill /FI "WINDOWTITLE eq Video Generator Server*" /T /F >nul 2>&1
taskkill /FI "IMAGENAME eq video-generator.exe" /T /F >nul 2>&1
echo Stopped Video Generator server

REM Clean up PID files
set "PID_DIR=%~dp0pids"
if exist "%PID_DIR%" (
    del /q "%PID_DIR%\*" >nul 2>&1
)

echo.
echo All servers stopped.


