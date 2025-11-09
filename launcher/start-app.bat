@echo off
REM Main launcher - starts servers and opens frontend

setlocal

set "LAUNCHER_DIR=%~dp0"
set "ROOT_DIR=%LAUNCHER_DIR%..\"

REM Check if we're in portable mode (executables exist)
REM In portable distribution, executables are in servers\ directory
set "FULL_CAST_EXE=%ROOT_DIR%servers\full-cast-tts.exe"
set "VIDEO_GEN_EXE=%ROOT_DIR%servers\video-generator.exe"

if exist "%FULL_CAST_EXE%" (
    if exist "%VIDEO_GEN_EXE%" (
        REM Portable mode - use executables
        echo Starting servers in portable mode...
        call "%LAUNCHER_DIR%start-servers-simple.bat"
        
        REM Wait a moment for servers to start
        timeout /t 3 /nobreak >nul
        
        REM Start frontend server
        echo.
        echo Starting frontend server...
        if exist "%ROOT_DIR%frontend\index.html" (
            REM Check if Python is available
            python --version >nul 2>&1
            if errorlevel 1 (
                echo ERROR: Python is not installed or not in PATH
                echo.
                echo Please install Python 3.8+ to run the frontend server.
                echo Or manually start a HTTP server:
                echo   cd %ROOT_DIR%frontend
                echo   python -m http.server 8080
                echo.
                pause
                exit /b 1
            )
            
            REM Check if frontend-server.py exists
            if exist "%ROOT_DIR%frontend\frontend-server.py" (
                REM Start the SPA-aware frontend server
                echo Starting frontend server with SPA routing support...
                start "Frontend Server" cmd /c "cd /d %ROOT_DIR%frontend && python frontend-server.py"
                timeout /t 2 /nobreak >nul
                echo.
                echo Frontend server started!
                echo Opening browser to http://localhost:8080
                echo.
                start "" "http://localhost:8080"
            ) else (
                REM Fallback to basic Python HTTP server
                echo Frontend server script not found. Using basic HTTP server...
                start "Frontend Server" cmd /c "cd /d %ROOT_DIR%frontend && python -m http.server 8080"
                timeout /t 2 /nobreak >nul
                echo.
                echo Frontend server started!
                echo Opening browser to http://localhost:8080
                echo.
                echo NOTE: Basic HTTP server may not support SPA routing correctly.
                echo For best results, rebuild the distribution with frontend-server.py
                echo.
                start "" "http://localhost:8080"
            )
        ) else (
            echo.
            echo Frontend not found. Running in development mode...
            echo Please start the frontend dev server manually:
            echo   npm run dev
            echo.
            pause
        )
    ) else (
        goto :not_found
    )
) else (
    :not_found
    REM Development mode - provide instructions
    echo ========================================
    echo YoRead Portable Desktop App
    echo ========================================
    echo.
    echo Portable executables not found. Running in development mode.
    echo.
    echo To build portable executables:
    echo   1. Build Full Cast TTS: server\full-cast-tts\build-executable.bat
    echo   2. Build Video Generator: youtube-video-generator\build-executable.bat
    echo.
    echo Then run this script again.
    echo.
    pause
)

