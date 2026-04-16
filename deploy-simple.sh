#!/bin/bash

# Simple Yoread Deployment Script
# Quick deployment without all the checks

echo "🚀 Quick deployment starting..."

cd ~/Vite-project

# Pull latest changes
git pull

# Build
yarn build

# Deploy
sudo rm -rf /var/www/yoread.com/*
sudo cp -r dist/* /var/www/yoread.com/
sudo cp -r public/sample-book-covers /var/www/yoread.com/
sudo chown -R www-data:www-data /var/www/yoread.com

echo "✅ Deployment complete!" 