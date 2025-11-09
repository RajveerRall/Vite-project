@echo off
echo Building Full Cast TTS Executable...
echo.

REM Check if Node.js is available
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js 18+ and add it to your PATH
    pause
    exit /b 1
)

REM Navigate to server directory
cd /d "%~dp0"

REM Check if node_modules exists, install if needed
if not exist node_modules (
    echo Installing dependencies...
    call npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Install pkg globally if not installed
where pkg >nul 2>&1
if errorlevel 1 (
    echo Installing pkg globally...
    npm install -g pkg
    if errorlevel 1 (
        echo ERROR: Failed to install pkg
        pause
        exit /b 1
    )
)

REM Create dist directory
if not exist dist mkdir dist

REM Build executable
echo.
echo Building executable with pkg...
pkg portable-launcher.js --targets node18-win-x64 --output dist/full-cast-tts.exe

if errorlevel 1 (
    echo ERROR: pkg build failed
    pause
    exit /b 1
)

echo.
echo Build complete! Executable is in: dist\full-cast-tts.exe
echo.
echo To test, run: dist\full-cast-tts.exe --port 4001
echo.
pause


