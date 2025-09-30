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

# Check if DATABASE_URL is set (it might not be during initial build)
if [ -z "$DATABASE_URL" ]; then
    echo "DATABASE_URL not set - using SQLite for initialization"
    # Initialize database with SQLite (will be overridden by PostgreSQL in production)
    python -c "
import os
os.environ.pop('DATABASE_URL', None)  # Remove empty DATABASE_URL if present
from controller import app, db
with app.app_context():
    try:
        db.create_all()
        print('Database initialized successfully with SQLite')
    except Exception as e:
        print(f'Database initialization warning: {e}')
        print('This is normal if PostgreSQL is not connected yet')
"
else
    echo "DATABASE_URL is set - initializing PostgreSQL database"
    # Initialize database with PostgreSQL
    python -c "
from controller import app, db
with app.app_context():
    try:
        db.create_all()
        print('Database initialized successfully with PostgreSQL')
    except Exception as e:
        print(f'Database initialization error: {e}')
        exit(1
"
fi

echo "Build process completed successfully!"
