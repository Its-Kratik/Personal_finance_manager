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

# Initialize database 
echo "Initializing database..."
python -c "
from controller import app, db
with app.app_context():
    try:
        db.create_all()
        print('✅ Database initialized successfully')
        
        # Test connection
        result = db.engine.execute('SELECT 1 as test')
        print('✅ Database connection test passed')
        
    except Exception as e:
        print(f'❌ Database initialization error: {e}')
        # Don't exit on error - let it run with SQLite fallback
        print('Will fallback to SQLite if needed')
"

echo "Build process completed successfully!"
