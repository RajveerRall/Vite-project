#!/bin/bash

# Sync vendor directory with installed packages
# Run this after npm install or package updates

echo "Syncing vendor directory with installed packages..."

# Remove old vendor directory
if [ -d "vendor/modular-tts" ]; then
    rm -rf "vendor/modular-tts"
    echo "Removed old vendor/modular-tts"
fi

# Copy from node_modules
if [ -d "node_modules/@your-scope/modular-tts" ]; then
    cp -r "node_modules/@your-scope/modular-tts" "vendor/"
    echo "Updated vendor/modular-tts with latest version"
else
    echo "Warning: Package @your-scope/modular-tts not found in node_modules"
fi

echo "Vendor sync complete!"
