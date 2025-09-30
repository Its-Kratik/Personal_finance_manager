#!/usr/bin/env bash
# Build script for Render deployment

set -o errexit  # exit on error

echo "Starting build process..."

# Install dependencies
echo "Installing Python dependencies..."
pip install -r requirements.txt

# Create necessary directories
echo "Creating directories..."
mkdir -p logs data

echo "Build process completed successfully!"
echo "Database will be initialized on first run."
