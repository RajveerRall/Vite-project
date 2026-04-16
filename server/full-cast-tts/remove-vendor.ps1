# Option to remove vendor directory entirely
# Only use this if you don't need the fallback mechanism

Write-Host "Removing vendor directory..."

if (Test-Path "vendor") {
    Remove-Item -Recurse -Force "vendor"
    Write-Host "Vendor directory removed"
} else {
    Write-Host "Vendor directory doesn't exist"
}

Write-Host "Done!"
