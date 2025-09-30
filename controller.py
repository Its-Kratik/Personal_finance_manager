from flask import Flask, render_template, request, jsonify, session, redirect, url_for, flash
from flask_wtf.csrf import CSRFProtect, validate_csrf
from flask_talisman import Talisman
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from werkzeug.exceptions import BadRequest
import os
import logging
from datetime import datetime, timezone, timedelta
from decimal import Decimal, InvalidOperation
import json
import uuid
from functools import wraps

from config import config
from model import db, User, Account, Category, Transaction, Budget, init_default_categories

def create_app(config_name=None):
    """Application factory pattern for Flask app creation"""
    app = Flask(__name__)
    
    # Configuration
    if config_name is None:
        config_name = os.environ.get('FLASK_ENV', 'production')
    app.config.from_object(config[config_name])
    
    # Security extensions
    csrf = CSRFProtect(app)
    
    # Configure Talisman for security headers (2025 best practices)
    csp = {
        'default-src': "'self'",
        'script-src': "'self' 'unsafe-inline' https://cdn.jsdelivr.net",
        'style-src': "'self' 'unsafe-inline' https://fonts.googleapis.com",
        'font-src': "'self' https://fonts.gstatic.com",
        'img-src': "'self' data: https:",
        'connect-src': "'self'",
        'frame-ancestors': "'none'",
        'base-uri': "'self'",
        'form-action': "'self'",
    }
    
    Talisman(app, 
             force_https=app.config.get('FORCE_HTTPS', False),
             content_security_policy=csp,
             referrer_policy='strict-origin-when-cross-origin',
             feature_policy={
                 'geolocation': "'none'",
                 'camera': "'none'",
                 'microphone': "'none'",
             })
    
    # Handle reverse proxy (Render deployment)
    if os.environ.get('RENDER_EXTERNAL_URL'):
        app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1, x_prefix=1)
    
    # Initialize extensions
    db.init_app(app)
    CORS(app, supports_credentials=True, origins=['https://*.onrender.com', 'http://localhost:5000'])
    
    # Logging configuration
    if not app.debug:
        logging.basicConfig(
            level=getattr(logging, app.config.get('LOG_LEVEL', 'INFO')),
            format='%(asctime)s %(levelname)s %(name)s %(message)s'
        )
        
        # File logging for production
        if not os.path.exists('logs'):
            os.mkdir('logs')
        file_handler = logging.FileHandler('logs/app.log')
        file_handler.setFormatter(logging.Formatter(
            '%(asctime)s %(levelname)s: %(message)s [in %(pathname)s:%(lineno)d]'
        ))
        file_handler.setLevel(logging.INFO)
        app.logger.addHandler(file_handler)
        app.logger.setLevel(logging.INFO)
        app.logger.info('Personal Finance Manager startup')
    
    # Create database tables
    with app.app_context():
        db.create_all()
    
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
            return jsonify({'error': 'Authentication required', 'code': 'AUTH_REQUIRED'}), 401
        return f(*args, **kwargs)
    return decorated_function

# Input validation decorator
def validate_json(required_fields=None):
    """Decorator to validate JSON input"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return jsonify({'error': 'Content-Type must be application/json'}), 400
            
            data = request.get_json()
            if not data:
                return jsonify({'error': 'Invalid JSON payload'}), 400
            
            if required_fields:
                missing_fields = [field for field in required_fields if not data.get(field)]
                if missing_fields:
                    return jsonify({
                        'error': f'Missing required fields: {", ".join(missing_fields)}'
                    }), 400
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

# =====================
# MAIN ROUTES
# =====================

@app.route('/')
def index():
    """Main application page - SPA entry point"""
    return render_template('index.html')

@app.route('/api/health')
def health_check():
    """Health check endpoint for monitoring and load balancers"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now(timezone.utc).isoformat(),
        'version': '1.0.0',
        'environment': app.config.get('ENV', 'unknown')
    })

# =====================
# AUTHENTICATION ROUTES
# =====================

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
            db.session.flush()  # Get the ID without committing
            
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
                ),
                Account(
                    user_id=demo_user.id,
                    name='Savings Account',
                    account_type='savings',
                    balance=Decimal('8500.00'),
                    currency='USD'
                ),
                Account(
                    user_id=demo_user.id,
                    name='Credit Card',
                    account_type='credit',
                    balance=Decimal('-1250.75'),
                    currency='USD'
                )
            ]
            
            for account in demo_accounts:
                db.session.add(account)
            
            db.session.commit()
            app.logger.info(f'Demo user created: {demo_user.id}')
        
        # Log in the user
        session['user_id'] = demo_user.id
        session['username'] = demo_user.username
        session.permanent = True
        
        return jsonify({
            'message': 'Logged in successfully',
            'user': demo_user.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Demo login error: {str(e)}')
        return jsonify({'error': 'Failed to create demo session'}), 500

@app.route('/api/logout', methods=['POST'])
def logout():
    """Logout endpoint"""
    session.clear()
    return jsonify({'message': 'Logged out successfully'})

@app.route('/api/auth/status')
def auth_status():
    """Check authentication status"""
    user_id = session.get('user_id')
    if user_id:
        user = User.query.get(user_id)
        if user:
            return jsonify({
                'authenticated': True,
                'user': user.to_dict()
            })
    
    return jsonify({'authenticated': False})

# =====================
# DASHBOARD ROUTES
# =====================

@app.route('/api/dashboard')
@require_auth
def get_dashboard_data():
    """Get comprehensive dashboard data"""
    user_id = session.get('user_id')
    
    try:
        # Get all user accounts
        accounts = Account.query.filter_by(user_id=user_id, is_active=True).all()
        
        # Calculate total balance
        total_balance = sum(account.balance for account in accounts)
        
        # Get current month transactions
        now = datetime.now()
        current_month_start = datetime(now.year, now.month, 1).date()
        next_month = (now.replace(day=28) + timedelta(days=4)).replace(day=1)
        current_month_end = (next_month - timedelta(days=1)).date()
        
        # Monthly income and expenses
        monthly_transactions = Transaction.query.join(Account).filter(
            Account.user_id == user_id,
            Transaction.transaction_date >= current_month_start,
            Transaction.transaction_date <= current_month_end
        ).all()
        
        monthly_income = sum(
            t.amount for t in monthly_transactions 
            if t.transaction_type == 'income'
        )
        monthly_expenses = sum(
            t.amount for t in monthly_transactions 
            if t.transaction_type == 'expense'
        )
        
        # Recent transactions (last 10)
        recent_transactions = Transaction.query.join(Account).filter(
            Account.user_id == user_id
        ).order_by(Transaction.created_at.desc()).limit(10).all()
        
        # Spending by category (current month)
        spending_by_category = db.session.query(
            Category.name,
            Category.color,
            Category.icon,
            db.func.sum(Transaction.amount).label('total')
        ).join(Transaction).join(Account).filter(
            Account.user_id == user_id,
            Transaction.transaction_type == 'expense',
            Transaction.transaction_date >= current_month_start,
            Transaction.transaction_date <= current_month_end
        ).group_by(Category.id, Category.name, Category.color, Category.icon).all()
        
        # Account balances by type
        account_balances = {}
        for account in accounts:
            account_type = account.account_type
            if account_type not in account_balances:
                account_balances[account_type] = 0
            account_balances[account_type] += float(account.balance)
        
        return jsonify({
            'total_balance': float(total_balance),
            'monthly_income': float(monthly_income),
            'monthly_expenses': float(monthly_expenses),
            'net_income': float(monthly_income - monthly_expenses),
            'accounts': [account.to_dict() for account in accounts],
            'account_balances': account_balances,
            'recent_transactions': [transaction.to_dict() for transaction in recent_transactions],
            'spending_by_category': [{
                'category': row.name,
                'color': row.color,
                'icon': row.icon,
                'amount': float(row.total)
            } for row in spending_by_category],
            'summary': {
                'total_accounts': len(accounts),
                'active_accounts': len([a for a in accounts if a.is_active]),
                'total_transactions_this_month': len(monthly_transactions)
            }
        })
        
    except Exception as e:
        app.logger.error(f'Dashboard data error: {str(e)}')
        return jsonify({'error': 'Failed to load dashboard data'}), 500

# =====================
# TRANSACTION ROUTES
# =====================

@app.route('/api/transactions', methods=['GET'])
@require_auth
def get_transactions():
    """Get paginated transactions with filtering"""
    user_id = session.get('user_id')
    
    try:
        # Query parameters
        page = request.args.get('page', 1, type=int)
        per_page = min(request.args.get('per_page', 20, type=int), 100)  # Max 100 per page
        category_id = request.args.get('category_id')
        account_id = request.args.get('account_id')
        transaction_type = request.args.get('type')
        search = request.args.get('search', '').strip()
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')
        
        # Build query
        query = Transaction.query.join(Account).filter(Account.user_id == user_id)
        
        # Apply filters
        if category_id:
            query = query.filter(Transaction.category_id == category_id)
        
        if account_id:
            query = query.filter(Transaction.account_id == account_id)
        
        if transaction_type in ['income', 'expense']:
            query = query.filter(Transaction.transaction_type == transaction_type)
        
        if search:
            query = query.filter(Transaction.description.ilike(f'%{search}%'))
        
        if date_from:
            try:
                date_from_obj = datetime.strptime(date_from, '%Y-%m-%d').date()
                query = query.filter(Transaction.transaction_date >= date_from_obj)
            except ValueError:
                pass
        
        if date_to:
            try:
                date_to_obj = datetime.strptime(date_to, '%Y-%m-%d').date()
                query = query.filter(Transaction.transaction_date <= date_to_obj)
            except ValueError:
                pass
        
        # Execute paginated query
        transactions = query.order_by(
            Transaction.transaction_date.desc(),
            Transaction.created_at.desc()
        ).paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            'transactions': [transaction.to_dict() for transaction in transactions.items],
            'pagination': {
                'total': transactions.total,
                'pages': transactions.pages,
                'current_page': page,
                'per_page': per_page,
                'has_next': transactions.has_next,
                'has_prev': transactions.has_prev
            }
        })
        
    except Exception as e:
        app.logger.error(f'Transaction fetch error: {str(e)}')
        return jsonify({'error': 'Failed to fetch transactions'}), 500

@app.route('/api/transactions', methods=['POST'])
@require_auth
@validate_json(['account_id', 'category_id', 'amount', 'description', 'transaction_type'])
def create_transaction():
    """Create a new transaction"""
    user_id = session.get('user_id')
    data = request.get_json()
    
    try:
        # Validate CSRF token
        validate_csrf(data.get('csrf_token'))
        
        # Validate transaction type
        if data['transaction_type'] not in ['income', 'expense']:
            return jsonify({'error': 'Invalid transaction type'}), 400
        
        # Validate amount
        try:
            amount = Decimal(str(data['amount']))
            if amount <= 0:
                return jsonify({'error': 'Amount must be positive'}), 400
        except (InvalidOperation, ValueError):
            return jsonify({'error': 'Invalid amount format'}), 400
        
        # Verify account belongs to user
        account = Account.query.filter_by(
            id=data['account_id'], 
            user_id=user_id,
            is_active=True
        ).first()
        if not account:
            return jsonify({'error': 'Invalid account'}), 400
        
        # Verify category belongs to user
        category = Category.query.filter_by(
            id=data['category_id'],
            user_id=user_id,
            is_active=True
        ).first()
        if not category:
            return jsonify({'error': 'Invalid category'}), 400
        
        # Validate category type matches transaction type
        if category.category_type != data['transaction_type']:
            return jsonify({'error': 'Category type does not match transaction type'}), 400
        
        # Parse transaction date
        transaction_date = datetime.now().date()
        if data.get('transaction_date'):
            try:
                transaction_date = datetime.strptime(data['transaction_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid date format'}), 400
        
        # Create transaction
        transaction = Transaction(
            account_id=data['account_id'],
            category_id=data['category_id'],
            amount=amount,
            description=data['description'][:255],  # Truncate if too long
            transaction_type=data['transaction_type'],
            transaction_date=transaction_date
        )
        
        # Update account balance
        if data['transaction_type'] == 'expense':
            account.balance -= amount
        else:  # income
            account.balance += amount
        
        db.session.add(transaction)
        db.session.commit()
        
        app.logger.info(f'Transaction created: {transaction.id} for user {user_id}')
        
        return jsonify({
            'message': 'Transaction created successfully',
            'transaction': transaction.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Transaction creation error: {str(e)}')
        return jsonify({'error': 'Failed to create transaction'}), 500

@app.route('/api/transactions/<transaction_id>', methods=['PUT'])
@require_auth
def update_transaction(transaction_id):
    """Update an existing transaction"""
    user_id = session.get('user_id')
    data = request.get_json()
    
    try:
        # Find transaction
        transaction = Transaction.query.join(Account).filter(
            Transaction.id == transaction_id,
            Account.user_id == user_id
        ).first()
        
        if not transaction:
            return jsonify({'error': 'Transaction not found'}), 404
        
        # Store old values for balance adjustment
        old_amount = transaction.amount
        old_type = transaction.transaction_type
        
        # Update fields if provided
        if 'amount' in data:
            try:
                new_amount = Decimal(str(data['amount']))
                if new_amount <= 0:
                    return jsonify({'error': 'Amount must be positive'}), 400
                transaction.amount = new_amount
            except (InvalidOperation, ValueError):
                return jsonify({'error': 'Invalid amount format'}), 400
        
        if 'description' in data:
            transaction.description = data['description'][:255]
        
        if 'transaction_date' in data:
            try:
                transaction.transaction_date = datetime.strptime(data['transaction_date'], '%Y-%m-%d').date()
            except ValueError:
                return jsonify({'error': 'Invalid date format'}), 400
        
        # Recalculate account balance
        account = transaction.account
        
        # Reverse old transaction effect
        if old_type == 'expense':
            account.balance += old_amount
        else:
            account.balance -= old_amount
        
        # Apply new transaction effect
        if transaction.transaction_type == 'expense':
            account.balance -= transaction.amount
        else:
            account.balance += transaction.amount
        
        db.session.commit()
        
        return jsonify({
            'message': 'Transaction updated successfully',
            'transaction': transaction.to_dict()
        })
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Transaction update error: {str(e)}')
        return jsonify({'error': 'Failed to update transaction'}), 500

@app.route('/api/transactions/<transaction_id>', methods=['DELETE'])
@require_auth
def delete_transaction(transaction_id):
    """Delete a transaction"""
    user_id = session.get('user_id')
    
    try:
        # Find transaction
        transaction = Transaction.query.join(Account).filter(
            Transaction.id == transaction_id,
            Account.user_id == user_id
        ).first()
        
        if not transaction:
            return jsonify({'error': 'Transaction not found'}), 404
        
        # Reverse transaction effect on account balance
        account = transaction.account
        if transaction.transaction_type == 'expense':
            account.balance += transaction.amount
        else:
            account.balance -= transaction.amount
        
        db.session.delete(transaction)
        db.session.commit()
        
        return jsonify({'message': 'Transaction deleted successfully'})
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Transaction deletion error: {str(e)}')
        return jsonify({'error': 'Failed to delete transaction'}), 500

# =====================
# ACCOUNT ROUTES
# =====================

@app.route('/api/accounts', methods=['GET'])
@require_auth
def get_accounts():
    """Get all user accounts"""
    user_id = session.get('user_id')
    
    try:
        accounts = Account.query.filter_by(user_id=user_id, is_active=True).all()
        return jsonify({
            'accounts': [account.to_dict() for account in accounts]
        })
    except Exception as e:
        app.logger.error(f'Account fetch error: {str(e)}')
        return jsonify({'error': 'Failed to fetch accounts'}), 500

@app.route('/api/accounts', methods=['POST'])
@require_auth
@validate_json(['name', 'account_type'])
def create_account():
    """Create a new account"""
    user_id = session.get('user_id')
    data = request.get_json()
    
    try:
        # Validate account type
        valid_types = ['checking', 'savings', 'credit', 'cash', 'investment']
        if data['account_type'] not in valid_types:
            return jsonify({'error': 'Invalid account type'}), 400
        
        # Validate initial balance
        initial_balance = Decimal('0')
        if 'balance' in data:
            try:
                initial_balance = Decimal(str(data['balance']))
            except (InvalidOperation, ValueError):
                return jsonify({'error': 'Invalid balance format'}), 400
        
        account = Account(
            user_id=user_id,
            name=data['name'][:100],
            account_type=data['account_type'],
            balance=initial_balance,
            currency=data.get('currency', 'USD')
        )
        
        db.session.add(account)
        db.session.commit()
        
        app.logger.info(f'Account created: {account.id} for user {user_id}')
        
        return jsonify({
            'message': 'Account created successfully',
            'account': account.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        app.logger.error(f'Account creation error: {str(e)}')
        return jsonify({'error': 'Failed to create account'}), 500

# =====================
# CATEGORY ROUTES
# =====================

@app.route('/api/categories')
@require_auth
def get_categories():
    """Get all user categories"""
    user_id = session.get('user_id')
    
    try:
        categories = Category.query.filter_by(user_id=user_id, is_active=True).all()
        
        # Group by type
        income_categories = [cat.to_dict() for cat in categories if cat.category_type == 'income']
        expense_categories = [cat.to_dict() for cat in categories if cat.category_type == 'expense']
        
        return jsonify({
            'categories': [cat.to_dict() for cat in categories],
            'income_categories': income_categories,
            'expense_categories': expense_categories
        })
    except Exception as e:
        app.logger.error(f'Category fetch error: {str(e)}')
        return jsonify({'error': 'Failed to fetch categories'}), 500

# =====================
# ANALYTICS ROUTES
# =====================

@app.route('/api/analytics/spending-trends')
@require_auth
def get_spending_trends():
    """Get spending trends over time"""
    user_id = session.get('user_id')
    months = request.args.get('months', 6, type=int)
    
    try:
        # Calculate date range
        end_date = datetime.now().date()
        start_date = (datetime.now() - timedelta(days=months * 30)).date()
        
        # Get monthly spending data
        monthly_data = db.session.query(
            db.extract('year', Transaction.transaction_date).label('year'),
            db.extract('month', Transaction.transaction_date).label('month'),
            db.func.sum(Transaction.amount).label('total')
        ).join(Account).filter(
            Account.user_id == user_id,
            Transaction.transaction_type == 'expense',
            Transaction.transaction_date >= start_date,
            Transaction.transaction_date <= end_date
        ).group_by(
            db.extract('year', Transaction.transaction_date),
            db.extract('month', Transaction.transaction_date)
        ).order_by('year', 'month').all()
        
        return jsonify({
            'trends': [{
                'year': int(row.year),
                'month': int(row.month),
                'total': float(row.total)
            } for row in monthly_data]
        })
        
    except Exception as e:
        app.logger.error(f'Analytics error: {str(e)}')
        return jsonify({'error': 'Failed to fetch analytics data'}), 500

# =====================
# ERROR HANDLERS
# =====================

@app.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400

@app.errorhandler(401)
def unauthorized(error):
    return jsonify({'error': 'Unauthorized'}), 401

@app.errorhandler(403)
def forbidden(error):
    return jsonify({'error': 'Forbidden'}), 403

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    db.session.rollback()
    app.logger.error(f'Internal error: {str(error)}')
    return jsonify({'error': 'Internal server error'}), 500

# =====================
# APPLICATION STARTUP
# =====================

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5000))
    debug_mode = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
    
    app.logger.info(f'Starting Personal Finance Manager on port {port}')
    app.run(host="0.0.0.0", port=port, debug=debug_mode)
