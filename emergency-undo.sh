#!/bin/bash

# Emergency Undo Script - Super Quick Rollback
# Use this when you need to rollback IMMEDIATELY

echo "🚨 EMERGENCY ROLLBACK - Restoring to latest backup..."

# Find the most recent backup
LATEST_BACKUP=$(find /var/www -maxdepth 1 -name "yoread.com.backup.*" -type d | sort -r | head -1)

if [ -z "$LATEST_BACKUP" ]; then
    echo "❌ ERROR: No backups found!"
    exit 1
fi

echo "📁 Found backup: $(basename $LATEST_BACKUP)"
echo "🔄 Rolling back..."

# Quick rollback - no confirmations, no extra backups
sudo rm -rf /var/www/yoread.com/*
sudo cp -r "$LATEST_BACKUP"/* /var/www/yoread.com/
sudo chown -R www-data:www-data /var/www/yoread.com

echo "✅ EMERGENCY ROLLBACK COMPLETE!"
echo "🌐 Your website has been restored to the previous version." 