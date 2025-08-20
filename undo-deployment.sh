#!/bin/bash

# Yoread Deployment Undo Script
# Quickly rollback to the previous backup when deployment goes wrong

set -e  # Exit on any error

echo "🔄 Yoread Deployment Rollback"
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
DEPLOY_DIR="/var/www/yoread.com"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to list available backups
list_backups() {
    print_status "Available backups:"
    echo ""
    
    # Find all backup directories
    BACKUPS=($(find /var/www -maxdepth 1 -name "yoread.com.backup.*" -type d | sort -r))
    
    if [ ${#BACKUPS[@]} -eq 0 ]; then
        print_warning "No backups found!"
        echo "Backups are created automatically when you run ./deploy.sh"
        exit 1
    fi
    
    # Display backups with numbers
    for i in "${!BACKUPS[@]}"; do
        backup_dir="${BACKUPS[$i]}"
        backup_name=$(basename "$backup_dir")
        timestamp=$(echo "$backup_name" | sed 's/yoread.com.backup.//')
        
        # Convert timestamp to readable format
        if [[ $timestamp =~ ^([0-9]{4})([0-9]{2})([0-9]{2})_([0-9]{2})([0-9]{2})([0-9]{2})$ ]]; then
            year="${BASH_REMATCH[1]}"
            month="${BASH_REMATCH[2]}"
            day="${BASH_REMATCH[3]}"
            hour="${BASH_REMATCH[4]}"
            minute="${BASH_REMATCH[5]}"
            second="${BASH_REMATCH[6]}"
            readable_date="$year-$month-$day $hour:$minute:$second"
        else
            readable_date="$timestamp"
        fi
        
        echo "  $((i+1)). $backup_name"
        echo "     Date: $readable_date"
        echo "     Path: $backup_dir"
        echo ""
    done
    
    return 0
}

# Function to rollback to a specific backup
rollback_to_backup() {
    local backup_dir="$1"
    local backup_name=$(basename "$backup_dir")
    
    print_status "Rolling back to: $backup_name"
    
    # Verify backup exists and has content
    if [ ! -d "$backup_dir" ]; then
        print_error "Backup directory does not exist: $backup_dir"
        exit 1
    fi
    
    if [ ! -f "$backup_dir/index.html" ]; then
        print_error "Backup appears to be incomplete (no index.html found)"
        exit 1
    fi
    
    # Create a backup of current deployment before rollback
    if [ -d "$DEPLOY_DIR" ] && [ "$(ls -A $DEPLOY_DIR 2>/dev/null)" ]; then
        current_backup="${DEPLOY_DIR}.before-rollback.$(date +%Y%m%d_%H%M%S)"
        print_status "Creating backup of current deployment before rollback..."
        sudo cp -r "$DEPLOY_DIR" "$current_backup"
        print_success "Current deployment backed up to: $(basename $current_backup)"
    fi
    
    # Perform the rollback
    print_status "Removing current deployment..."
    sudo rm -rf "$DEPLOY_DIR"/*
    
    print_status "Restoring from backup..."
    sudo cp -r "$backup_dir"/* "$DEPLOY_DIR/"
    
    print_status "Setting proper permissions..."
    sudo chown -R www-data:www-data "$DEPLOY_DIR"
    sudo chmod -R 755 "$DEPLOY_DIR"
    
    # Verify rollback
    if [ -f "$DEPLOY_DIR/index.html" ]; then
        print_success "✅ Rollback completed successfully!"
        print_success "Your website has been restored to: $backup_name"
    else
        print_error "❌ Rollback verification failed!"
        exit 1
    fi
}

# Main script logic
if [ "$1" = "--list" ] || [ "$1" = "-l" ]; then
    list_backups
    exit 0
fi

if [ "$1" = "--latest" ]; then
    print_status "Rolling back to the most recent backup..."
    LATEST_BACKUP=$(find /var/www -maxdepth 1 -name "yoread.com.backup.*" -type d | sort -r | head -1)
    
    if [ -z "$LATEST_BACKUP" ]; then
        print_error "No backups found!"
        exit 1
    fi
    
    rollback_to_backup "$LATEST_BACKUP"
    exit 0
fi

if [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "Yoread Deployment Undo Script"
    echo ""
    echo "Usage:"
    echo "  ./undo-deployment.sh                 # Interactive mode - choose backup"
    echo "  ./undo-deployment.sh --latest        # Rollback to most recent backup"
    echo "  ./undo-deployment.sh --list          # List available backups"
    echo "  ./undo-deployment.sh --help          # Show this help"
    echo ""
    exit 0
fi

# Interactive mode - let user choose backup
print_status "🔄 Interactive Rollback Mode"
echo ""

list_backups

BACKUPS=($(find /var/www -maxdepth 1 -name "yoread.com.backup.*" -type d | sort -r))

echo ""
print_status "Which backup would you like to restore?"
echo "Enter the number (1-${#BACKUPS[@]}) or 'q' to quit:"

while true; do
    read -p "> " choice
    
    if [ "$choice" = "q" ] || [ "$choice" = "Q" ]; then
        print_status "Rollback cancelled."
        exit 0
    fi
    
    if [[ "$choice" =~ ^[0-9]+$ ]] && [ "$choice" -ge 1 ] && [ "$choice" -le "${#BACKUPS[@]}" ]; then
        selected_backup="${BACKUPS[$((choice-1))]}"
        backup_name=$(basename "$selected_backup")
        
        echo ""
        print_warning "⚠️  You are about to rollback to: $backup_name"
        print_warning "This will replace your current live website!"
        echo ""
        read -p "Are you sure? (y/N): " confirm
        
        if [ "$confirm" = "y" ] || [ "$confirm" = "Y" ]; then
            rollback_to_backup "$selected_backup"
            break
        else
            print_status "Rollback cancelled."
            exit 0
        fi
    else
        print_error "Invalid choice. Please enter a number between 1 and ${#BACKUPS[@]}, or 'q' to quit."
    fi
done

echo ""
echo "=================================="
print_success "🎉 Rollback completed!"
echo ""
print_status "Your website should now be restored to the previous version."
print_status "Check your site to confirm everything is working correctly."
echo "==================================" 