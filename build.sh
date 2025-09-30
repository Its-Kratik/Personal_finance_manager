#!/usr/bin/env bash
set -o errexit

echo "🚀 Starting minimal build..."

# Upgrade pip
python -m pip install --upgrade pip

# Install minimal dependencies
echo "📦 Installing minimal dependencies..."
pip install --no-cache-dir Flask==3.0.0
pip install --no-cache-dir Flask-SQLAlchemy==3.1.1
pip install --no-cache-dir psycopg2-binary==2.9.9
pip install --no-cache-dir gunicorn==21.2.0

# Create directories
echo "📁 Creating directories..."
mkdir -p logs data

echo "✅ Minimal build completed!"
