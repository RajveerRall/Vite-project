#!/bin/bash

# Yoread Deployment Script
# This script automates the build and deployment process for the Vite Reader app

set -e  # Exit on any error

echo "🚀 Starting Yoread deployment..."
echo "=================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_DIR="$HOME/Vite-project"
DEPLOY_DIR="/var/www/yoread.com"
BRANCH=${1:-$(git branch --show-current)}

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

# Check if we're in the right directory
if [ ! -d "$PROJECT_DIR" ]; then
    print_error "Project directory $PROJECT_DIR not found!"
    print_error "Please make sure the Vite-reader project is cloned to $PROJECT_DIR"
    exit 1
fi

cd "$PROJECT_DIR"

# Step 1: Check git status and branch
print_status "Checking git status and branch..."
CURRENT_BRANCH=$(git branch --show-current)

if [ "$CURRENT_BRANCH" != "$BRANCH" ]; then
    print_warning "Current branch is '$CURRENT_BRANCH', expected '$BRANCH'"
    print_status "Switching to $BRANCH branch..."
    git checkout "$BRANCH"
fi

print_success "On branch: $(git branch --show-current)"

# Step 2: Fetch latest changes
print_status "Fetching latest changes from remote..."
git fetch origin

# Check if there are updates
LOCAL=$(git rev-parse HEAD)
REMOTE=$(git rev-parse origin/$BRANCH)

if [ "$LOCAL" = "$REMOTE" ]; then
    print_status "Already up to date."
else
    print_status "Updates available. Syncing with remote..."
    
    # Check if branches have diverged (common after force push)
    if git merge-base --is-ancestor HEAD origin/$BRANCH 2>/dev/null; then
        # Local is behind remote - can fast-forward
        print_status "Fast-forwarding to remote branch..."
        git merge --ff-only origin/$BRANCH
        print_success "Successfully fast-forwarded to latest changes"
    else
        # Branches have diverged - reset to match remote exactly
        print_warning "Branches have diverged (likely due to force push on remote)"
        print_status "Resetting local branch to match remote exactly..."
        git reset --hard origin/$BRANCH
        print_success "Successfully reset to match remote branch"
    fi
fi

# Step 3: Install dependencies (if needed)
print_status "Checking dependencies..."
if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
    print_status "Installing/updating dependencies..."
    yarn install
    print_success "Dependencies installed"
else
    print_status "Dependencies are up to date"
fi

# Step 4: Build the application
print_status "Building the application..."
yarn build

if [ $? -eq 0 ]; then
    print_success "Build completed successfully"
else
    print_error "Build failed!"
    exit 1
fi

# Step 5: Backup current deployment (optional)
if [ -d "$DEPLOY_DIR" ] && [ "$(ls -A $DEPLOY_DIR)" ]; then
    print_status "Creating backup of current deployment..."
    sudo cp -r "$DEPLOY_DIR" "${DEPLOY_DIR}.backup.$(date +%Y%m%d_%H%M%S)"
    print_success "Backup created"
fi

# Step 6: Remove old deployment
print_status "Removing old deployment files..."
sudo rm -rf "$DEPLOY_DIR"/*

# Step 7: Copy new build to deployment directory
print_status "Copying new build to deployment directory..."
sudo cp -r dist/* "$DEPLOY_DIR/"

# Step 8: Copy sample book covers
print_status "Copying sample book covers..."
if [ -d "public/sample-book-covers" ]; then
    sudo cp -r public/sample-book-covers "$DEPLOY_DIR/"
    print_success "Sample book covers copied"
else
    print_warning "Sample book covers directory not found, skipping..."
fi

# Step 9: Set proper permissions
print_status "Setting proper permissions..."
sudo chown -R www-data:www-data "$DEPLOY_DIR"
sudo chmod -R 755 "$DEPLOY_DIR"

# Step 10: Verify deployment
print_status "Verifying deployment..."
if [ -f "$DEPLOY_DIR/index.html" ]; then
    print_success "Deployment verified - index.html found"
else
    print_error "Deployment verification failed - index.html not found"
    exit 1
fi

# Final status
echo ""
echo "=================================="
print_success "🎉 Deployment completed successfully!"
echo ""
print_status "Deployment Summary:"
echo "  - Branch: $BRANCH"
echo "  - Project: $PROJECT_DIR"
echo "  - Deploy to: $DEPLOY_DIR"
echo "  - Timestamp: $(date)"
echo ""
print_status "Your app should now be live at your domain!"
echo "==================================" 