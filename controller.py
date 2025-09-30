from flask import Flask, render_template, request, jsonify, session
import os
import logging
from datetime import datetime, timezone, timedelta
from decimal import Decimal, InvalidOperation
import json
from functools import wraps

# Import our models
from config import config
from model import db, User, Account, Category, Transaction, init_default_categories

def create_app(config_name=None):
    """Application factory pattern for Flask app creation"""
    app = Flask(__name__)
    
    # Configuration
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'production')
    app.config.from_object(config[config_name])
    
    # Initialize extensions
    db.init_app(app)
    
    # Handle Render proxy
    if os.environ.get('RENDER_EXTERNAL_URL'):
        from werkzeug.middleware.proxy_fix import ProxyFix
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
    
    # Create database tables
    with app.app_context():
        try:
            db.create_all()
            app.logger.info('Database tables created successfully')
        except Exception as e:
            app.logger.error(f'Database creation error: {str(e)}')
    
    return app

# Create the Flask application
app = create_app()

# Authentication decorator
def require_auth(f):
    """Decorator to require authentication for API endpoints"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = session.get('user_id')
        if not user_id:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

@app.route('/')
def index():
    """Main application page - SPA entry point"""
    return render_template('index.html')

@app.route('/api/health')
def health_check():
    """Health check endpoint for monitoring"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'version': '1.0.0'
    })

@app.route('/api/demo-login', methods=['POST'])
def demo_login():
    """Demo login endpoint - creates and logs in demo user"""
    try:
        # Check if demo user exists
        demo_user = User.query.filter_by(email='demo@finance.app').first()
        
        if not demo_user:
            # Create demo user
            demo_user = User(
                email='demo@finance.app',
                username='demo_user'
            )
            demo_user.set_password('demo123')
            db.session.add(demo_user)
            db.session.flush()
            
            # Initialize default categories
            init_default_categories(demo_user.id)
            
            # Create demo accounts
            demo_accounts = [
                Account(
                    user_id=demo_user.id,
                    name='Main Checking',
                    account_type='checking',
                    balance=Decimal('2847.50'),
                    currency='USD'
                )
            ]
            
            for account in demo_accounts:
                db.session.add(account)
            
            db.session.commit()
        
        # Log in the user
        session['user_id'] = demo_user.id
        session['username'] = demo_user.username
        
        return jsonify({
            'message': 'Logged in successfully',
            'user': demo_user.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': 'Failed to create demo session'}), 500

@app.route('/api/dashboard')
@require_auth
def get_dashboard_data():
    """Get dashboard data"""
    user_id = session.get('user_id')
    
    try:
        accounts = Account.query.filter_by(user_id=user_id, is_active=True).all()
        total_balance = sum(account.balance for account in accounts)
        
        return jsonify({
            'total_balance': float(total_balance),
            'accounts': [account.to_dict() for account in accounts]
        })
        
    except Exception as e:
        return jsonify({'error': 'Failed to load dashboard data'}), 500

@app.route('/api/accounts')
@require_auth
def get_accounts():
    """Get all user accounts"""
    user_id = session.get('user_id')
    accounts = Account.query.filter_by(user_id=user_id, is_active=True).all()
    return jsonify({'accounts': [account.to_dict() for account in accounts]})

@app.route('/api/categories')
@require_auth
def get_categories():
    """Get all user categories"""
    user_id = session.get('user_id')
    categories = Category.query.filter_by(user_id=user_id, is_active=True).all()
    return jsonify({'categories': [cat.to_dict() for cat in categories]})

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)
