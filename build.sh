#!/usr/bin/env bash
# Exit on error
set -o errexit

echo "🚀 Starting build process..."

# Upgrade pip first
echo "📦 Upgrading pip..."
python -m pip install --upgrade pip

# Install dependencies with verbose output
echo "📋 Installing dependencies..."
pip install --no-cache-dir -r requirements.txt

echo "📁 Creating necessary directories..."
mkdir -p logs data

echo "🗄️ Initializing database..."
python -c "
import os
import sys
sys.path.insert(0, '.')

try:
    from controller import app
    from model import db
    with app.app_context():
        db.create_all()
        print('✅ Database initialized successfully')
except Exception as e:
    print(f'⚠️ Database initialization error: {e}')
    # Don't fail the build for database issues
"

echo "🎉 Build completed successfully!"
