"""
Database models and operations for Personal Finance Manager
Supports both PostgreSQL (production) and SQLite (development)
"""

import sqlite3
import psycopg2
import psycopg2.extras
import logging
from datetime import datetime, date
from decimal import Decimal
from typing import List, Dict, Optional, Any, Union
from contextlib import contextmanager
from dataclasses import dataclass
from config import Config

logger = logging.getLogger(__name__)

@dataclass
class Transaction:
    """Data class for transaction records"""
    id: Optional[int] = None
    amount: Decimal = Decimal('0.00')
    category: str = ''
    description: str = ''
    transaction_type: str = 'expense'  # 'income' or 'expense'
    date: date = None
    created_at: datetime = None
    tags: str = ''  # Comma-separated tags

    def __post_init__(self):
        if self.date is None:
            self.date = date.today()
        if self.created_at is None:
            self.created_at = datetime.now()

@dataclass
class Budget:
    """Data class for budget records"""
    id: Optional[int] = None
    category: str = ''
    amount: Decimal = Decimal('0.00')
    period: str = 'monthly'  # 'weekly', 'monthly', 'yearly'
    created_at: datetime = None

    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()

class DatabaseManager:
    """Modern database manager with dual PostgreSQL/SQLite support"""

    def __init__(self, config: Config):
        self.config = config
        self.db_url = config.get_database_url()
        self.is_postgres = config.is_production()

        logger.info(f"Initializing database manager (PostgreSQL: {self.is_postgres})")
        self.init_database()

    @contextmanager
    def get_connection(self):
        """Context manager for database connections with proper error handling"""
        conn = None
        try:
            if self.is_postgres:
                conn = psycopg2.connect(self.config.DATABASE_URL)
                conn.autocommit = False
            else:
                # Extract path from SQLite URL
                db_path = self.db_url.replace('sqlite:///', '')
                conn = sqlite3.connect(db_path)
                conn.row_factory = sqlite3.Row  # Enable column access by name

            yield conn

            if self.is_postgres:
                conn.commit()
            else:
                conn.commit()

        except Exception as e:
            if conn:
                conn.rollback()
            logger.error(f"Database error: {e}")
            raise
        finally:
            if conn:
                conn.close()

    def init_database(self) -> None:
        """Initialize database tables with modern schema design"""

        if self.is_postgres:
            # PostgreSQL schema with advanced features
            create_transactions_table = """
                CREATE TABLE IF NOT EXISTS transactions (
                    id SERIAL PRIMARY KEY,
                    amount DECIMAL(12, 2) NOT NULL CHECK (amount != 0),
                    category VARCHAR(100) NOT NULL,
                    description TEXT DEFAULT '',
                    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('income', 'expense')),
                    date DATE NOT NULL DEFAULT CURRENT_DATE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    tags VARCHAR(500) DEFAULT '',
                    CONSTRAINT valid_amount CHECK (amount > -999999999.99 AND amount < 999999999.99)
                );

                CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
                CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
                CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(transaction_type);
            """

            create_budgets_table = """
                CREATE TABLE IF NOT EXISTS budgets (
                    id SERIAL PRIMARY KEY,
                    category VARCHAR(100) NOT NULL UNIQUE,
                    amount DECIMAL(12, 2) NOT NULL CHECK (amount > 0),
                    period VARCHAR(20) NOT NULL DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly', 'yearly')),
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE
                );
            """

            create_categories_table = """
                CREATE TABLE IF NOT EXISTS categories (
                    id SERIAL PRIMARY KEY,
                    name VARCHAR(100) NOT NULL UNIQUE,
                    type VARCHAR(10) NOT NULL CHECK (type IN ('income', 'expense', 'both')),
                    color VARCHAR(7) DEFAULT '#3B82F6',
                    icon VARCHAR(50) DEFAULT '💰',
                    is_default BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
                );
            """

        else:
            # SQLite schema (simplified for development)
            create_transactions_table = """
                CREATE TABLE IF NOT EXISTS transactions (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    amount DECIMAL(12, 2) NOT NULL,
                    category TEXT NOT NULL,
                    description TEXT DEFAULT '',
                    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('income', 'expense')),
                    date DATE NOT NULL DEFAULT (date('now')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    tags TEXT DEFAULT ''
                );

                CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
                CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
            """

            create_budgets_table = """
                CREATE TABLE IF NOT EXISTS budgets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    category TEXT NOT NULL UNIQUE,
                    amount DECIMAL(12, 2) NOT NULL,
                    period TEXT NOT NULL DEFAULT 'monthly' CHECK (period IN ('weekly', 'monthly', 'yearly')),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    is_active BOOLEAN DEFAULT TRUE
                );
            """

            create_categories_table = """
                CREATE TABLE IF NOT EXISTS categories (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL UNIQUE,
                    type TEXT NOT NULL CHECK (type IN ('income', 'expense', 'both')),
                    color TEXT DEFAULT '#3B82F6',
                    icon TEXT DEFAULT '💰',
                    is_default BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """

        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()

                # Create tables
                cursor.execute(create_transactions_table)
                cursor.execute(create_budgets_table)
                cursor.execute(create_categories_table)

                # Insert default categories
                self._insert_default_categories(cursor)

                logger.info("Database initialized successfully")

        except Exception as e:
            logger.error(f"Failed to initialize database: {e}")
            raise

    def _insert_default_categories(self, cursor) -> None:
        """Insert default categories if they don't exist"""
        default_categories = [
            ('Food & Dining', 'expense', '#EF4444', '🍽️'),
            ('Transportation', 'expense', '#F97316', '🚗'),
            ('Shopping', 'expense', '#8B5CF6', '🛍️'),
            ('Entertainment', 'expense', '#EC4899', '🎬'),
            ('Bills & Utilities', 'expense', '#06B6D4', '⚡'),
            ('Healthcare', 'expense', '#10B981', '🏥'),
            ('Education', 'expense', '#3B82F6', '📚'),
            ('Travel', 'expense', '#F59E0B', '✈️'),
            ('Salary', 'income', '#22C55E', '💼'),
            ('Freelance', 'income', '#84CC16', '💻'),
            ('Investment', 'income', '#06B6D4', '📈'),
            ('Other Income', 'income', '#8B5CF6', '💰'),
        ]

        if self.is_postgres:
            insert_sql = """
                INSERT INTO categories (name, type, color, icon, is_default) 
                VALUES %s ON CONFLICT (name) DO NOTHING
            """
            values = [(name, type_, color, icon, True) for name, type_, color, icon in default_categories]
            psycopg2.extras.execute_values(cursor, insert_sql, values)
        else:
            insert_sql = """
                INSERT OR IGNORE INTO categories (name, type, color, icon, is_default) 
                VALUES (?, ?, ?, ?, 1)
            """
            cursor.executemany(insert_sql, default_categories)

    # Transaction CRUD operations
    def add_transaction(self, transaction: Transaction) -> int:
        """Add a new transaction with validation"""
        sql = """
            INSERT INTO transactions (amount, category, description, transaction_type, date, tags)
            VALUES ({}, {}, {}, {}, {}, {})
            RETURNING id
        """.format(*(['%s'] * 6 if self.is_postgres else ['?'] * 6))

        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(sql, (
                    float(transaction.amount),
                    transaction.category,
                    transaction.description,
                    transaction.transaction_type,
                    transaction.date,
                    transaction.tags
                ))

                if self.is_postgres:
                    transaction_id = cursor.fetchone()[0]
                else:
                    transaction_id = cursor.lastrowid

                logger.info(f"Transaction added with ID: {transaction_id}")
                return transaction_id

        except Exception as e:
            logger.error(f"Failed to add transaction: {e}")
            raise

    def get_transactions(self, limit: int = 100, offset: int = 0, 
                        category: Optional[str] = None,
                        transaction_type: Optional[str] = None,
                        date_from: Optional[date] = None,
                        date_to: Optional[date] = None) -> List[Dict[str, Any]]:
        """Get transactions with filtering and pagination"""

        base_sql = "SELECT * FROM transactions WHERE 1=1"
        params = []

        if category:
            base_sql += f" AND category = {'%s' if self.is_postgres else '?'}"
            params.append(category)

        if transaction_type:
            base_sql += f" AND transaction_type = {'%s' if self.is_postgres else '?'}"
            params.append(transaction_type)

        if date_from:
            base_sql += f" AND date >= {'%s' if self.is_postgres else '?'}"
            params.append(date_from)

        if date_to:
            base_sql += f" AND date <= {'%s' if self.is_postgres else '?'}"
            params.append(date_to)

        base_sql += f" ORDER BY date DESC, created_at DESC LIMIT {'%s' if self.is_postgres else '?'} OFFSET {'%s' if self.is_postgres else '?'}"
        params.extend([limit, offset])

        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(base_sql, params)

                if self.is_postgres:
                    columns = [desc[0] for desc in cursor.description]
                    return [dict(zip(columns, row)) for row in cursor.fetchall()]
                else:
                    return [dict(row) for row in cursor.fetchall()]

        except Exception as e:
            logger.error(f"Failed to fetch transactions: {e}")
            raise

    def get_spending_by_category(self, days: int = 30) -> List[Dict[str, Any]]:
        """Get spending summary by category for the last N days"""
        sql = f"""
            SELECT 
                category,
                SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as total_expense,
                SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as total_income,
                COUNT(*) as transaction_count
            FROM transactions 
            WHERE date >= {'%s' if self.is_postgres else '?'}
            GROUP BY category
            ORDER BY total_expense DESC
        """

        from_date = date.today().replace(day=1) if days == 30 else                    date.today().replace(day=date.today().day - days + 1)

        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(sql, (from_date,))

                if self.is_postgres:
                    columns = [desc[0] for desc in cursor.description]
                    return [dict(zip(columns, row)) for row in cursor.fetchall()]
                else:
                    return [dict(row) for row in cursor.fetchall()]

        except Exception as e:
            logger.error(f"Failed to get spending by category: {e}")
            raise

    def get_monthly_summary(self, year: int, month: int) -> Dict[str, Any]:
        """Get comprehensive monthly financial summary"""
        sql = f"""
            SELECT 
                SUM(CASE WHEN transaction_type = 'income' THEN amount ELSE 0 END) as total_income,
                SUM(CASE WHEN transaction_type = 'expense' THEN amount ELSE 0 END) as total_expense,
                COUNT(CASE WHEN transaction_type = 'income' THEN 1 END) as income_count,
                COUNT(CASE WHEN transaction_type = 'expense' THEN 1 END) as expense_count
            FROM transactions 
            WHERE {'EXTRACT(YEAR FROM date)' if self.is_postgres else 'strftime("%Y", date)'} = {'%s' if self.is_postgres else '?'}
            AND {'EXTRACT(MONTH FROM date)' if self.is_postgres else 'strftime("%m", date)'} = {'%s' if self.is_postgres else '?'}
        """

        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(sql, (year, month))

                if self.is_postgres:
                    columns = [desc[0] for desc in cursor.description]
                    result = dict(zip(columns, cursor.fetchone() or [0, 0, 0, 0]))
                else:
                    row = cursor.fetchone()
                    result = dict(row) if row else {'total_income': 0, 'total_expense': 0, 'income_count': 0, 'expense_count': 0}

                # Calculate net savings
                result['net_savings'] = float(result.get('total_income', 0)) - float(result.get('total_expense', 0))
                result['savings_rate'] = (result['net_savings'] / float(result.get('total_income', 1))) * 100 if result.get('total_income', 0) > 0 else 0

                return result

        except Exception as e:
            logger.error(f"Failed to get monthly summary: {e}")
            raise

    def delete_transaction(self, transaction_id: int) -> bool:
        """Delete a transaction by ID"""
        sql = f"DELETE FROM transactions WHERE id = {'%s' if self.is_postgres else '?'}"

        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(sql, (transaction_id,))

                deleted = cursor.rowcount > 0
                if deleted:
                    logger.info(f"Transaction {transaction_id} deleted")
                return deleted

        except Exception as e:
            logger.error(f"Failed to delete transaction {transaction_id}: {e}")
            raise

    # Budget operations
    def add_budget(self, budget: Budget) -> int:
        """Add or update budget for a category"""
        sql = f"""
            {'INSERT INTO budgets (category, amount, period) VALUES (%s, %s, %s) ON CONFLICT (category) DO UPDATE SET amount = EXCLUDED.amount, period = EXCLUDED.period RETURNING id' if self.is_postgres else 
             'INSERT OR REPLACE INTO budgets (category, amount, period) VALUES (?, ?, ?)'}
        """

        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(sql, (budget.category, float(budget.amount), budget.period))

                if self.is_postgres:
                    budget_id = cursor.fetchone()[0]
                else:
                    budget_id = cursor.lastrowid

                logger.info(f"Budget set for {budget.category}: ${budget.amount}")
                return budget_id

        except Exception as e:
            logger.error(f"Failed to add budget: {e}")
            raise

    def get_budgets(self) -> List[Dict[str, Any]]:
        """Get all active budgets with spending comparison"""
        sql = """
            SELECT 
                b.*,
                COALESCE(SUM(t.amount), 0) as spent
            FROM budgets b
            LEFT JOIN transactions t ON b.category = t.category 
                AND t.transaction_type = 'expense'
                AND t.date >= date_trunc('month', CURRENT_DATE)
            WHERE b.is_active = true
            GROUP BY b.id, b.category, b.amount, b.period, b.created_at, b.updated_at
            ORDER BY b.category
        """ if self.is_postgres else """
            SELECT 
                b.*,
                COALESCE(SUM(t.amount), 0) as spent
            FROM budgets b
            LEFT JOIN transactions t ON b.category = t.category 
                AND t.transaction_type = 'expense'
                AND t.date >= date('now', 'start of month')
            WHERE b.is_active = 1
            GROUP BY b.id, b.category, b.amount, b.period, b.created_at, b.updated_at
            ORDER BY b.category
        """

        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(sql)

                if self.is_postgres:
                    columns = [desc[0] for desc in cursor.description]
                    budgets = [dict(zip(columns, row)) for row in cursor.fetchall()]
                else:
                    budgets = [dict(row) for row in cursor.fetchall()]

                # Calculate budget utilization
                for budget in budgets:
                    budget['utilization'] = (float(budget['spent']) / float(budget['amount'])) * 100
                    budget['remaining'] = float(budget['amount']) - float(budget['spent'])

                return budgets

        except Exception as e:
            logger.error(f"Failed to get budgets: {e}")
            raise

# Database instance (will be initialized by the Flask app)
db_manager: Optional[DatabaseManager] = None

def init_database(config: Config) -> DatabaseManager:
    """Initialize the database manager"""
    global db_manager
    db_manager = DatabaseManager(config)
    return db_manager

def get_db_manager() -> DatabaseManager:
    """Get the current database manager instance"""
    if db_manager is None:
        raise RuntimeError("Database not initialized. Call init_database() first.")
    return db_manager
