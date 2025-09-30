"""
Configuration management for Personal Finance Manager
Supports both development (SQLite) and production (PostgreSQL) environments
"""

import os
from pathlib import Path
from typing import Optional
import logging
from datetime import timedelta

class Config:
    """Base configuration with secure defaults"""

    # Flask Configuration
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-key-change-in-production'
    FLASK_ENV = os.environ.get('FLASK_ENV', 'production')
    DEBUG = FLASK_ENV == 'development'

    # Database Configuration - Auto-detect environment
    DATABASE_URL = os.environ.get('DATABASE_URL')
    if DATABASE_URL and DATABASE_URL.startswith('postgres://'):
        # Fix for newer PostgreSQL versions
        DATABASE_URL = DATABASE_URL.replace('postgres://', 'postgresql://', 1)

    # SQLite fallback for development
    SQLITE_DB_PATH = Path(__file__).parent / 'data' / 'finance.db'

    # Security Headers
    SECURITY_HEADERS = {
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
    }

    # Rate Limiting
    RATELIMIT_STORAGE_URL = 'memory://'
    RATELIMIT_DEFAULT = "100 per hour"

    # Logging Configuration
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_FILE = Path(__file__).parent / 'logs' / 'app.log'

    # CORS Settings for API
    CORS_ORIGINS = ['http://localhost:3000', 'http://localhost:5000']

    # Session Configuration
    SESSION_COOKIE_SECURE = FLASK_ENV == 'production'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    PERMANENT_SESSION_LIFETIME = timedelta(hours=24)

    # File Upload Settings
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size

    @staticmethod
    def is_production() -> bool:
        """Check if running in production environment"""
        return os.environ.get('DATABASE_URL') is not None

    @staticmethod
    def get_database_url() -> str:
        """Get appropriate database URL for current environment"""
        if Config.is_production():
            return Config.DATABASE_URL
        else:
            return f"sqlite:///{Config.SQLITE_DB_PATH}"

    @staticmethod
    def setup_logging() -> None:
        """Configure application logging"""
        log_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'

        # Ensure logs directory exists
        Config.LOG_FILE.parent.mkdir(exist_ok=True)

        logging.basicConfig(
            level=getattr(logging, Config.LOG_LEVEL),
            format=log_format,
            handlers=[
                logging.StreamHandler(),  # Console output
                logging.FileHandler(Config.LOG_FILE) if not Config.is_production() else logging.NullHandler()
            ]
        )

class DevelopmentConfig(Config):
    """Development-specific configuration"""
    DEBUG = True
    FLASK_ENV = 'development'

class ProductionConfig(Config):
    """Production-specific configuration with enhanced security"""
    DEBUG = False
    FLASK_ENV = 'production'

    # Enhanced security for production
    SESSION_COOKIE_SECURE = True
    WTF_CSRF_TIME_LIMIT = None

# Export configurations
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'default': ProductionConfig
}

def get_config(config_name: Optional[str] = None) -> Config:
    """Get configuration based on environment"""
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'production')

    return config.get(config_name, ProductionConfig)
