@echo off
REM Main build script for portable desktop application
REM Builds all executables and prepares distribution

setlocal enabledelayedexpansion

set "ROOT_DIR=%~dp0..\"
set "BUILD_DIR=%ROOT_DIR%dist-portable"
set "ERRORS=0"

echo ========================================
echo YoRead Portable Desktop App - Build Script
echo ========================================
echo.

REM Create build directory
if not exist "%BUILD_DIR%" mkdir "%BUILD_DIR%"

echo Step 1: Building React Frontend...
cd /d "%ROOT_DIR%"
call npm run build
if errorlevel 1 (
    echo ERROR: Frontend build failed
    set /a ERRORS+=1
    goto :cleanup
) else (
    echo [OK] Frontend built successfully
)
echo.

echo Step 2: Building Full Cast TTS Server Executable...
cd /d "%ROOT_DIR%server\full-cast-tts"
call build-executable.bat
if errorlevel 1 (
    echo ERROR: Full Cast TTS build failed
    set /a ERRORS+=1
    goto :cleanup
) else (
    echo [OK] Full Cast TTS executable built successfully
)
echo.

echo Step 3: Building Video Generator Server Executable...
cd /d "%ROOT_DIR%youtube-video-generator"
call build-executable.bat
if errorlevel 1 (
    echo ERROR: Video Generator build failed
    set /a ERRORS+=1
    goto :cleanup
) else (
    echo [OK] Video Generator executable built successfully
)
echo.

echo Step 4: Copying files to distribution directory...
cd /d "%ROOT_DIR%"

REM Copy frontend build
if exist "%BUILD_DIR%\frontend" rmdir /s /q "%BUILD_DIR%\frontend"
xcopy /E /I /Y "dist\*" "%BUILD_DIR%\frontend\"
REM Copy frontend server script
copy /Y "frontend-server.py" "%BUILD_DIR%\frontend\" >nul 2>&1
echo [OK] Frontend copied

REM Copy executables
if not exist "%BUILD_DIR%\servers" mkdir "%BUILD_DIR%\servers"
copy /Y "server\full-cast-tts\dist\full-cast-tts.exe" "%BUILD_DIR%\servers\" >nul 2>&1
copy /Y "youtube-video-generator\dist\video-generator.exe" "%BUILD_DIR%\servers\" >nul 2>&1
echo [OK] Server executables copied

REM Copy launcher files
if not exist "%BUILD_DIR%\launcher" mkdir "%BUILD_DIR%\launcher"
xcopy /E /I /Y "launcher\*.bat" "%BUILD_DIR%\launcher\" >nul 2>&1
if exist "launcher\README.md" copy /Y "launcher\README.md" "%BUILD_DIR%\launcher\" >nul 2>&1
REM Ensure start-servers-simple.bat is copied (in case xcopy missed it)
if exist "launcher\start-servers-simple.bat" copy /Y "launcher\start-servers-simple.bat" "%BUILD_DIR%\launcher\" >nul 2>&1
echo [OK] Launcher scripts copied

REM Create README
echo Creating README...
(
echo # YoRead Portable Desktop App
echo.
echo This is a portable version of YoRead that includes all necessary servers.
echo.
echo ## Quick Start
echo.
echo 1. Run launcher\start-app.bat to start the application
echo 2. The servers will start automatically
echo 3. Open your browser to the frontend URL
echo.
echo ## Files
echo.
echo * launcher\ - Launcher scripts
echo * servers\ - Server executables
echo * frontend\ - Built frontend application
echo.
echo ## Server Ports
echo.
echo * Frontend: http://localhost:8080
echo * Full Cast TTS: http://localhost:4001
echo * Video Generator: http://localhost:8000
echo.
echo ## Requirements
echo.
echo * Windows 10 or later
echo * Python 3.8+ ^(for frontend server^)
echo * FFmpeg ^(for video generation^) - must be installed separately or bundled
echo.
) > "%BUILD_DIR%\README.md"

echo.
echo ========================================
if !ERRORS!==0 (
    echo Build completed successfully!
    echo.
    echo Distribution package is in: %BUILD_DIR%
    echo.
    echo To test, run: %BUILD_DIR%\launcher\start-app.bat
) else (
    echo Build completed with errors.
    echo Please check the output above for details.
)
echo ========================================
echo.

:cleanup
cd /d "%ROOT_DIR%"
if !ERRORS!==0 exit /b 0
exit /b 1

