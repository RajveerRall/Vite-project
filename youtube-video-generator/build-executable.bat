@echo off
echo Building Video Generator Executable...
echo.

REM Check if Python is available (try Windows launcher first, then python command)
set "PYTHON_CMD="
py --version >nul 2>&1
if not errorlevel 1 (
    set "PYTHON_CMD=py"
    echo Found Python via Windows launcher (py)
    goto :python_found
)

python --version >nul 2>&1
if not errorlevel 1 (
    set "PYTHON_CMD=python"
    echo Found Python via python command
    goto :python_found
)

REM If we get here, Python was not found
echo ERROR: Python is not installed or not in PATH
echo.
echo Please install Python 3.8+ from https://www.python.org/downloads/
echo Make sure to check "Add Python to PATH" during installation
echo.
echo Alternatively, if Python is installed but not in PATH:
echo   1. Find your Python installation (e.g., C:\Python39\python.exe)
echo   2. Add it to your system PATH, or
echo   3. Run this script with full path to python.exe
echo.
pause
exit /b 1

:python_found
REM Display Python version
echo Checking Python version...
%PYTHON_CMD% --version

REM Check if pip is available
%PYTHON_CMD% -m pip --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: pip is not available for this Python installation
    echo.
    echo Python was found at: %PYTHON_CMD%
    echo.
    echo Solutions:
    echo   1. Reinstall Python and ensure pip is included
    echo   2. Install pip manually: %PYTHON_CMD% -m ensurepip --upgrade
    echo   3. Or use a different Python installation that has pip
    echo.
    echo Attempting to install pip...
    %PYTHON_CMD% -m ensurepip --upgrade
    if errorlevel 1 (
        echo.
        echo Failed to install pip. Please fix your Python installation.
        pause
        exit /b 1
    )
    echo pip installed successfully!
)

REM Check if PyInstaller is installed
%PYTHON_CMD% -c "import PyInstaller" >nul 2>&1
if errorlevel 1 (
    echo Installing PyInstaller...
    %PYTHON_CMD% -m pip install pyinstaller
    if errorlevel 1 (
        echo ERROR: Failed to install PyInstaller
        echo.
        echo Troubleshooting:
        echo   1. Check your internet connection
        echo   2. Try manually: %PYTHON_CMD% -m pip install pyinstaller
        echo   3. Or use: %PYTHON_CMD% -m pip install --user pyinstaller
        pause
        exit /b 1
    )
    echo PyInstaller installed successfully!
)

REM Install build requirements if needed
if exist requirements-build.txt (
    echo Installing build requirements...
    %PYTHON_CMD% -m pip install -r requirements-build.txt
    if errorlevel 1 (
        echo Warning: Some build requirements may have failed to install
        echo Continuing anyway...
    )
)

REM Create dist directory
if not exist dist mkdir dist

REM Run PyInstaller
echo.
echo Running PyInstaller...
%PYTHON_CMD% -m PyInstaller --clean --noconfirm pyinstaller.spec

if errorlevel 1 (
    echo ERROR: PyInstaller build failed
    echo.
    echo Troubleshooting:
    echo   1. Ensure all dependencies are installed: %PYTHON_CMD% -m pip install -r requirements.txt
    echo   2. Try running PyInstaller directly: %PYTHON_CMD% -m PyInstaller --clean pyinstaller.spec
    echo   3. Check PyInstaller documentation: https://pyinstaller.org/
    pause
    exit /b 1
)

echo.
echo Build complete! Executable is in: dist\video-generator.exe
echo.
echo To test, run: dist\video-generator.exe --port 8000
echo.
pause

