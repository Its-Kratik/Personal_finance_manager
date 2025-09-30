"""
Personal Finance Manager - Main Controller
Flask application with RESTful API endpoints
"""

import os
import logging
from datetime import datetime
from flask import Flask, render_template, request, jsonify, session
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
from sqlalchemy import text

from model import db, User, Expense, Category
from config import Config

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(Config)

# Initialize database
db.init_app(app)

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s %(levelname)s: %(message)s',
    handlers=[
        logging.FileHandler('logs/app.log'),
        logging.StreamHandler()
    ]
)

# Initialize database tables and default categories
def init_database():
    """Initialize database tables and default categories"""
    db.create_all()
    
    # Create default categories if they don't exist
    default_categories = [
        'Food & Dining', 'Transportation', 'Shopping', 'Entertainment',
        'Bills & Utilities', 'Health & Fitness', 'Travel', 'Education',
        'Personal Care', 'Other'
    ]
    
    for cat_name in default_categories:
        if not Category.query.filter_by(name=cat_name).first():
            category = Category(name=cat_name)
            db.session.add(category)
    
    db.session.commit()

# Initialize database when app starts
with app.app_context():
    try:
        init_database()
        
        # Test database connection using proper SQLAlchemy 2.0 syntax
        result = db.session.execute(text('SELECT 1 as test')).fetchone()
        if result:
            print('✅ Database connection test passed')
    except Exception as e:
        print(f'❌ Database initialization error: {e}')

def login_required(f):
    """Decorator to require login for protected routes"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if 'user_id' not in session:
            return jsonify({'error': 'Authentication required'}), 401
        return f(*args, **kwargs)
    return decorated_function

def validate_expense_data(data):
    """Validate expense data"""
    required_fields = ['description', 'amount', 'category_id']
    for field in required_fields:
        if field not in data or not data[field]:
            return False, f'Missing required field: {field}'
    
    try:
        amount = float(data['amount'])
        if amount <= 0:
            return False, 'Amount must be positive'
    except ValueError:
        return False, 'Invalid amount format'
    
    return True, None

@app.route('/')
def index():
    """Serve the main application page"""
    return render_template('index.html')

@app.route('/api/register', methods=['POST'])
def register():
    """User registration endpoint"""
    try:
        data = request.get_json()
        
        # Validate input
        if not data or not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Username and password required'}), 400
        
        username = data['username'].strip().lower()
        password = data['password']
        
        # Check if user already exists
        if User.query.filter_by(username=username).first():
            return jsonify({'error': 'Username already exists'}), 400
        
        # Create new user
        user = User(
            username=username,
            password_hash=generate_password_hash(password)
        )
        
        db.session.add(user)
        db.session.commit()
        
        logging.info(f'New user registered: {username}')
        return jsonify({'message': 'User registered successfully'}), 201
        
    except Exception as e:
        logging.error(f'Registration error: {str(e)}')
        return jsonify({'error': 'Registration failed'}), 500

@app.route('/api/login', methods=['POST'])
def login():
    """User login endpoint"""
    try:
        data = request.get_json()
        
        if not data or not data.get('username') or not data.get('password'):
            return jsonify({'error': 'Username and password required'}), 400
        
        username = data['username'].strip().lower()
        password = data['password']
        
        user = User.query.filter_by(username=username).first()
        
        if user and check_password_hash(user.password_hash, password):
            session['user_id'] = user.id
            session['username'] = user.username
            logging.info(f'User logged in: {username}')
            return jsonify({
                'message': 'Login successful',
                'user': {'id': user.id, 'username': user.username}
            }), 200
        else:
            return jsonify({'error': 'Invalid credentials'}), 401
            
    except Exception as e:
        logging.error(f'Login error: {str(e)}')
        return jsonify({'error': 'Login failed'}), 500

@app.route('/api/logout', methods=['POST'])
@login_required
def logout():
    """User logout endpoint"""
    username = session.get('username')
    session.clear()
    logging.info(f'User logged out: {username}')
    return jsonify({'message': 'Logged out successfully'}), 200

@app.route('/api/categories', methods=['GET'])
@login_required
def get_categories():
    """Get all expense categories"""
    try:
        categories = Category.query.all()
        return jsonify([{
            'id': cat.id,
            'name': cat.name
        } for cat in categories]), 200
    except Exception as e:
        logging.error(f'Get categories error: {str(e)}')
        return jsonify({'error': 'Failed to fetch categories'}), 500

@app.route('/api/expenses', methods=['GET'])
@login_required
def get_expenses():
    """Get user expenses with optional filtering"""
    try:
        user_id = session['user_id']
        
        # Get query parameters
        category_id = request.args.get('category_id', type=int)
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        limit = request.args.get('limit', 50, type=int)
        
        # Build query
        query = Expense.query.filter_by(user_id=user_id)
        
        if category_id:
            query = query.filter_by(category_id=category_id)
        
        if start_date:
            query = query.filter(Expense.date >= datetime.fromisoformat(start_date))
        
        if end_date:
            query = query.filter(Expense.date <= datetime.fromisoformat(end_date))
        
        expenses = query.order_by(Expense.date.desc()).limit(limit).all()
        
        return jsonify([{
            'id': exp.id,
            'description': exp.description,
            'amount': float(exp.amount),
            'category': exp.category.name,
            'category_id': exp.category_id,
            'date': exp.date.isoformat(),
            'created_at': exp.created_at.isoformat()
        } for exp in expenses]), 200
        
    except Exception as e:
        logging.error(f'Get expenses error: {str(e)}')
        return jsonify({'error': 'Failed to fetch expenses'}), 500

@app.route('/api/expenses', methods=['POST'])
@login_required
def add_expense():
    """Add a new expense"""
    try:
        data = request.get_json()
        
        # Validate input
        is_valid, error_msg = validate_expense_data(data)
        if not is_valid:
            return jsonify({'error': error_msg}), 400
        
        # Check if category exists
        category = Category.query.get(data['category_id'])
        if not category:
            return jsonify({'error': 'Invalid category'}), 400
        
        # Create expense
        expense = Expense(
            user_id=session['user_id'],
            description=data['description'].strip(),
            amount=float(data['amount']),
            category_id=data['category_id'],
            date=datetime.fromisoformat(data.get('date', datetime.now().isoformat()))
        )
        
        db.session.add(expense)
        db.session.commit()
        
        logging.info(f'Expense added: {expense.description} - ${expense.amount}')
        
        return jsonify({
            'id': expense.id,
            'description': expense.description,
            'amount': float(expense.amount),
            'category': expense.category.name,
            'category_id': expense.category_id,
            'date': expense.date.isoformat(),
            'created_at': expense.created_at.isoformat()
        }), 201
        
    except Exception as e:
        logging.error(f'Add expense error: {str(e)}')
        return jsonify({'error': 'Failed to add expense'}), 500

@app.route('/api/expenses/<int:expense_id>', methods=['DELETE'])
@login_required
def delete_expense(expense_id):
    """Delete an expense"""
    try:
        expense = Expense.query.filter_by(
            id=expense_id, 
            user_id=session['user_id']
        ).first()
        
        if not expense:
            return jsonify({'error': 'Expense not found'}), 404
        
        db.session.delete(expense)
        db.session.commit()
        
        logging.info(f'Expense deleted: {expense.description}')
        return jsonify({'message': 'Expense deleted successfully'}), 200
        
    except Exception as e:
        logging.error(f'Delete expense error: {str(e)}')
        return jsonify({'error': 'Failed to delete expense'}), 500

@app.route('/api/summary', methods=['GET'])
@login_required
def get_summary():
    """Get expense summary and analytics"""
    try:
        user_id = session['user_id']
        
        # Get date range
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Build base query
        query = Expense.query.filter_by(user_id=user_id)
        
        if start_date:
            query = query.filter(Expense.date >= datetime.fromisoformat(start_date))
        if end_date:
            query = query.filter(Expense.date <= datetime.fromisoformat(end_date))
        
        expenses = query.all()
        
        # Calculate totals
        total_amount = sum(exp.amount for exp in expenses)
        total_count = len(expenses)
        
        # Category breakdown
        category_totals = {}
        for expense in expenses:
            cat_name = expense.category.name
            category_totals[cat_name] = category_totals.get(cat_name, 0) + float(expense.amount)
        
        # Monthly breakdown (last 12 months)
        monthly_totals = {}
        for expense in expenses:
            month_key = expense.date.strftime('%Y-%m')
            monthly_totals[month_key] = monthly_totals.get(month_key, 0) + float(expense.amount)
        
        return jsonify({
            'total_amount': float(total_amount),
            'total_count': total_count,
            'category_breakdown': category_totals,
            'monthly_breakdown': monthly_totals,
            'average_per_expense': float(total_amount / max(total_count, 1))
        }), 200
        
    except Exception as e:
        logging.error(f'Get summary error: {str(e)}')
        return jsonify({'error': 'Failed to fetch summary'}), 500

@app.errorhandler(404)
def not_found(error):
    """Handle 404 errors"""
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    """Handle 500 errors"""
    db.session.rollback()
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=False)
