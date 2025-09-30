#!/usr/bin/env bash
# Build script for Render deployment

set -o errexit  # exit on error

# Install dependencies
pip install -r requirements.txt

# Create necessary directories
mkdir -p logs data

# Initialize database
python -c "
from controller import app, db
with app.app_context():
    db.create_all()
    print('Database initialized successfully')
"
