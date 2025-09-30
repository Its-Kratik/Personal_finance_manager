"""
Personal Finance Manager - Configuration
Environment-based configuration for Flask app
"""

import os
from datetime import timedelta

class Config:
    """Base configuration class"""
    
    # Basic Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Database configuration - Use DATABASE_URL directly
    database_url = os.environ.get('DATABASE_URL', '').strip()
    
    if database_url and database_url.startswith(('postgres://', 'postgresql://')):
        # Production: Use the provided DATABASE_URL
        SQLALCHEMY_DATABASE_URI = database_url
        
        # Extract hostname for display (fix the parsing)
        try:
            if '@' in database_url:
                hostname_part = database_url.split('@')[1].split('/')[0]
                print(f"Using PostgreSQL database: {hostname_part}")
            else:
                print("Using PostgreSQL database")
        except:
            print("Using PostgreSQL database")
    else:
        # Development: Use SQLite
        basedir = os.path.abspath(os.path.dirname(__file__))
        sqlite_path = os.path.join(basedir, "data", "finance.db")
        SQLALCHEMY_DATABASE_URI = f'sqlite:///{sqlite_path}'
        print(f"Using SQLite database: {SQLALCHEMY_DATABASE_URI}")
        
        # Ensure data directory exists
        os.makedirs(os.path.dirname(sqlite_path), exist_ok=True)
    
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SQLALCHEMY_ENGINE_OPTIONS = {
        'pool_pre_ping': True,
        'pool_recycle': 300,
        'pool_size': 10,
        'max_overflow': 20
    }
    
    # Session configuration
    PERMANENT_SESSION_LIFETIME = timedelta(days=7)
    SESSION_COOKIE_SECURE = os.environ.get('FLASK_ENV') == 'production'
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # Security headers
    WTF_CSRF_ENABLED = True
    WTF_CSRF_TIME_LIMIT = None
    
    # Application settings
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024  # 16MB max file size
    JSON_SORT_KEYS = False
    
    # Logging
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    
    @staticmethod
    def init_app(app):
        """Initialize application with this config"""
        pass

class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    FLASK_ENV = 'development'

class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    FLASK_ENV = 'production'

class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = 'sqlite:///:memory:'
    WTF_CSRF_ENABLED = False

# Configuration mapping
config = {
    'development': DevelopmentConfig,
    'production': ProductionConfig,
    'testing': TestingConfig,
    'default': DevelopmentConfig
}
