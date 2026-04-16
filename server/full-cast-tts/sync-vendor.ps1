# Sync vendor directory with installed packages
# Run this after npm install or package updates

Write-Host "Syncing vendor directory with installed packages..."

# Remove old vendor directory
if (Test-Path "vendor/modular-tts") {
    Remove-Item -Recurse -Force "vendor/modular-tts"
    Write-Host "Removed old vendor/modular-tts"
}

# Copy from node_modules
if (Test-Path "node_modules/@your-scope/modular-tts") {
    Copy-Item -Recurse -Force "node_modules/@your-scope/modular-tts" "vendor/"
    Write-Host "Updated vendor/modular-tts with latest version"
} else {
    Write-Warning "Package @your-scope/modular-tts not found in node_modules"
}

Write-Host "Vendor sync complete!"
