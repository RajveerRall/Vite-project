# Troubleshooting Video Generator Build

## Python/pip Issues

### Problem: "No module named pip"

This means your Python installation doesn't have pip installed or accessible.

**Solution 1: Install pip for your Python**
```bash
py -m ensurepip --upgrade
```
or
```bash
python -m ensurepip --upgrade
```

**Solution 2: Reinstall Python**
1. Download Python from https://www.python.org/downloads/
2. During installation, check:
   - ✅ "Add Python to PATH"
   - ✅ "Install pip" (should be checked by default)
3. Complete the installation

**Solution 3: Use Python from Windows Store**
If you have multiple Python installations, the `py` launcher might be pointing to one without pip. Try:
```bash
# See all Python installations
py --list

# Use specific version
py -3.11 -m pip install pyinstaller
```

### Problem: "Could not find platform independent libraries"

This usually means Python installation is incomplete or corrupted.

**Solution:**
1. Uninstall Python completely
2. Delete Python folders:
   - `C:\Python313\` (or wherever Python is installed)
   - `C:\Users\YourName\AppData\Local\Programs\Python\`
3. Reinstall Python fresh

### Problem: Multiple Python Installations

If you have multiple Python versions installed, `py` launcher might use the wrong one.

**Check which Python is being used:**
```bash
py --version
py --list
where python
where py
```

**Use specific Python version:**
Edit `build-executable.bat` and change:
```batch
set "PYTHON_CMD=py -3.11"
```
Replace `3.11` with your desired Python version.

## PyInstaller Issues

### Problem: "PyInstaller not found" after installation

**Solution:**
Verify installation:
```bash
py -m pip show pyinstaller
py -m PyInstaller --version
```

If it's installed but not found, try:
```bash
py -m pip install --upgrade pyinstaller
```

### Problem: Build fails with import errors

**Solution:**
Install all dependencies first:
```bash
cd youtube-video-generator
py -m pip install -r requirements.txt
py -m pip install -r requirements-build.txt
```

## Quick Fix for Common Issues

If you're having persistent issues, try this clean setup:

1. **Verify Python:**
   ```bash
   py --version
   py -m pip --version
   ```

2. **Install build tools:**
   ```bash
   py -m pip install --upgrade pip
   py -m pip install pyinstaller
   ```

3. **Install dependencies:**
   ```bash
   cd youtube-video-generator
   py -m pip install -r requirements.txt
   ```

4. **Test PyInstaller:**
   ```bash
   py -m PyInstaller --version
   ```

5. **Run build:**
   ```bash
   build-executable.bat
   ```

## Alternative: Manual Build

If the batch script doesn't work, build manually:

```bash
cd youtube-video-generator
py -m PyInstaller --clean --noconfirm pyinstaller.spec
```

The executable will be in `dist\video-generator.exe`.


