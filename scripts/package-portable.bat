@echo off
REM Package portable app into a distributable zip file

setlocal

set "ROOT_DIR=%~dp0..\"
set "BUILD_DIR=%ROOT_DIR%dist-portable"
set "VERSION=1.0.0"
set "PACKAGE_NAME=YoRead-Portable-v%VERSION%"

echo ========================================
echo Packaging Portable Desktop App
echo ========================================
echo.

REM Check if build directory exists
if not exist "%BUILD_DIR%" (
    echo ERROR: Build directory not found: %BUILD_DIR%
    echo Please run build-portable.bat first
    pause
    exit /b 1
)

REM Check if PowerShell is available (for creating zip)
powershell -Command "Get-Command Compress-Archive" >nul 2>&1
if errorlevel 1 (
    echo ERROR: PowerShell is required for packaging
    pause
    exit /b 1
)

REM Create package directory
set "PACKAGE_DIR=%ROOT_DIR%packages"
if not exist "%PACKAGE_DIR%" mkdir "%PACKAGE_DIR%"

REM Remove old package if exists
if exist "%PACKAGE_DIR%\%PACKAGE_NAME%.zip" del "%PACKAGE_DIR%\%PACKAGE_NAME%.zip"

echo Creating zip package...
powershell -Command "Compress-Archive -Path '%BUILD_DIR%\*' -DestinationPath '%PACKAGE_DIR%\%PACKAGE_NAME%.zip' -Force"

if errorlevel 1 (
    echo ERROR: Failed to create zip package
    pause
    exit /b 1
)

echo.
echo ========================================
echo Package created successfully!
echo.
echo Package: %PACKAGE_DIR%\%PACKAGE_NAME%.zip
echo.
echo To distribute:
echo   1. Extract the zip to any directory
echo   2. Run launcher\start-app.bat
echo ========================================
echo.
pause


