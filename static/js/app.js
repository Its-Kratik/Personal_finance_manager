// Personal Finance Manager - Main Application
class FinanceApp {
    constructor() {
        this.currentUser = null;
        this.expenses = [];
        this.categories = [];
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuth();
        this.setDefaultDate();
    }

    setupEventListeners() {
        // Navigation
        document.getElementById('dashboardBtn').addEventListener('click', () => this.showSection('dashboard'));
        document.getElementById('expensesBtn').addEventListener('click', () => this.showSection('expenses'));
        document.getElementById('analyticsBtn').addEventListener('click', () => this.showSection('analytics'));
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());

        // Modals
        document.getElementById('addExpenseBtn').addEventListener('click', () => this.showExpenseModal());
        
        // Forms
        document.getElementById('loginForm').addEventListener('submit', (e) => this.handleLogin(e));
        document.getElementById('registerForm').addEventListener('submit', (e) => this.handleRegister(e));
        document.getElementById('expenseForm').addEventListener('submit', (e) => this.handleAddExpense(e));

        // Auth tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchAuthTab(btn.dataset.tab));
        });

        // Close modals
        document.querySelectorAll('.close').forEach(close => {
            close.addEventListener('click', (e) => this.closeModal(e.target.closest('.modal')));
        });

        // Filters
        document.getElementById('applyFilters').addEventListener('click', () => this.applyFilters());

        // Close modals on outside click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target);
            }
        });
    }

    async checkAuth() {
        try {
            const response = await fetch('/api/expenses?limit=1');
            if (response.ok) {
                await this.loadInitialData();
                this.showApp();
            } else {
                this.showAuthModal();
            }
        } catch (error) {
            this.showAuthModal();
        }
    }

    async loadInitialData() {
        await Promise.all([
            this.loadCategories(),
            this.loadExpenses(),
            this.loadSummary()
        ]);
    }

    showApp() {
        document.querySelector('.navbar').style.display = 'flex';
        document.querySelector('.main-content').style.display = 'block';
        this.closeModal(document.getElementById('authModal'));
    }

    showAuthModal() {
        document.querySelector('.navbar').style.display = 'none';
        document.querySelector('.main-content').style.display = 'none';
        document.getElementById('authModal').style.display = 'block';
    }

    switchAuthTab(tab) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelector(`[data-tab="${tab}"]`).classList.add('active');
        
        if (tab === 'login') {
            document.getElementById('loginForm').classList.remove('hidden');
            document.getElementById('registerForm').classList.add('hidden');
        } else {
            document.getElementById('loginForm').classList.add('hidden');
            document.getElementById('registerForm').classList.remove('hidden');
        }
    }

    async handleLogin(e) {
        e.preventDefault();
        this.showLoading();

        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.currentUser = data.user;
                await this.loadInitialData();
                this.showApp();
                this.showToast('Login successful!', 'success');
            } else {
                this.showToast(data.error || 'Login failed', 'error');
            }
        } catch (error) {
            this.showToast('Network error. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        this.showLoading();

        const username = document.getElementById('registerUsername').value;
        const password = document.getElementById('registerPassword').value;

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (response.ok) {
                this.showToast('Registration successful! Please login.', 'success');
                this.switchAuthTab('login');
                document.getElementById('registerForm').reset();
            } else {
                this.showToast(data.error || 'Registration failed', 'error');
            }
        } catch (error) {
            this.showToast('Network error. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async logout() {
        try {
            await fetch('/api/logout', { method: 'POST' });
            this.currentUser = null;
            this.expenses = [];
            this.categories = [];
            this.showAuthModal();
            this.showToast('Logged out successfully', 'success');
        } catch (error) {
            this.showToast('Logout failed', 'error');
        }
    }

    async loadCategories() {
        try {
            const response = await fetch('/api/categories');
            if (response.ok) {
                this.categories = await response.json();
                this.populateCategorySelects();
            }
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    }

    populateCategorySelects() {
        const selects = document.querySelectorAll('#expenseCategory, #categoryFilter');
        selects.forEach(select => {
            // Keep the first option (placeholder)
            const firstOption = select.querySelector('option');
            select.innerHTML = '';
            if (firstOption) select.appendChild(firstOption);

            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.name;
                select.appendChild(option);
            });
        });
    }

    async loadExpenses() {
        try {
            const response = await fetch('/api/expenses');
            if (response.ok) {
                this.expenses = await response.json();
                this.displayRecentExpenses();
                this.displayAllExpenses();
            }
        } catch (error) {
            console.error('Failed to load expenses:', error);
        }
    }

    async loadSummary() {
        try {
            const response = await fetch('/api/summary');
            if (response.ok) {
                const summary = await response.json();
                this.updateSummaryCards(summary);
                this.updateCharts(summary);
            }
        } catch (error) {
            console.error('Failed to load summary:', error);
        }
    }

    updateSummaryCards(summary) {
        document.getElementById('totalAmount').textContent = `$${summary.total_amount.toFixed(2)}`;
        document.getElementById('totalCount').textContent = summary.total_count;
        document.getElementById('averageAmount').textContent = `$${summary.average_per_expense.toFixed(2)}`;
        
        // Calculate this month's total
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyAmount = summary.monthly_breakdown[currentMonth] || 0;
        document.getElementById('monthlyAmount').textContent = `$${monthlyAmount.toFixed(2)}`;
    }

    displayRecentExpenses() {
        const container = document.getElementById('recentExpensesList');
        const recentExpenses = this.expenses.slice(0, 5);
        
        if (recentExpenses.length === 0) {
            container.innerHTML = '<p>No expenses yet. Add your first expense!</p>';
            return;
        }

        container.innerHTML = recentExpenses.map(expense => `
            <div class="expense-item">
                <div class="expense-info">
                    <div class="expense-description">${expense.description}</div>
                    <div class="expense-meta">${expense.category} • ${this.formatDate(expense.date)}</div>
                </div>
                <div class="expense-amount">$${expense.amount.toFixed(2)}</div>
                <button class="btn btn-danger" onclick="app.deleteExpense(${expense.id})">Delete</button>
            </div>
        `).join('');
    }

    displayAllExpenses() {
        const container = document.getElementById('expensesList');
        
        if (this.expenses.length === 0) {
            container.innerHTML = '<div class="card"><p>No expenses found. Start tracking your expenses!</p></div>';
            return;
        }

        container.innerHTML = this.expenses.map(expense => `
            <div class="expense-item">
                <div class="expense-info">
                    <div class="expense-description">${expense.description}</div>
                    <div class="expense-meta">${expense.category} • ${this.formatDate(expense.date)}</div>
                </div>
                <div class="expense-amount">$${expense.amount.toFixed(2)}</div>
                <button class="btn btn-danger" onclick="app.deleteExpense(${expense.id})">Delete</button>
            </div>
        `).join('');
    }

    showExpenseModal() {
        document.getElementById('expenseModal').style.display = 'block';
    }

    async handleAddExpense(e) {
        e.preventDefault();
        this.showLoading();

        const formData = {
            description: document.getElementById('expenseDescription').value,
            amount: parseFloat(document.getElementById('expenseAmount').value),
            category_id: parseInt(document.getElementById('expenseCategory').value),
            date: document.getElementById('expenseDate').value
        };

        try {
            const response = await fetch('/api/expenses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (response.ok) {
                this.closeModal(document.getElementById('expenseModal'));
                document.getElementById('expenseForm').reset();
                this.setDefaultDate();
                await this.loadExpenses();
                await this.loadSummary();
                this.showToast('Expense added successfully!', 'success');
            } else {
                this.showToast(data.error || 'Failed to add expense', 'error');
            }
        } catch (error) {
            this.showToast('Network error. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async deleteExpense(expenseId) {
        if (!confirm('Are you sure you want to delete this expense?')) return;

        this.showLoading();

        try {
            const response = await fetch(`/api/expenses/${expenseId}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                await this.loadExpenses();
                await this.loadSummary();
                this.showToast('Expense deleted successfully!', 'success');
            } else {
                const data = await response.json();
                this.showToast(data.error || 'Failed to delete expense', 'error');
            }
        } catch (error) {
            this.showToast('Network error. Please try again.', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async applyFilters() {
        const categoryId = document.getElementById('categoryFilter').value;
        const startDate = document.getElementById('startDateFilter').value;
        const endDate = document.getElementById('endDateFilter').value;

        const params = new URLSearchParams();
        if (categoryId) params.append('category_id', categoryId);
        if (startDate) params.append('start_date', startDate);
        if (endDate) params.append('end_date', endDate);

        try {
            const response = await fetch(`/api/expenses?${params}`);
            if (response.ok) {
                this.expenses = await response.json();
                this.displayAllExpenses();
            }
        } catch (error) {
            this.showToast('Failed to apply filters', 'error');
        }
    }

    updateCharts(summary) {
        this.updateCategoryChart(summary.category_breakdown);
        this.updateMonthlyChart(summary.monthly_breakdown);
    }

    showSection(sectionName) {
        // Update nav buttons
        document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`${sectionName}Btn`).classList.add('active');

        // Show/hide sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.add('hidden');
        });
        document.getElementById(sectionName).classList.remove('hidden');

        // Load analytics when showing analytics section
        if (sectionName === 'analytics') {
            setTimeout(() => this.loadSummary(), 100);
        }
    }

    closeModal(modal) {
        modal.style.display = 'none';
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('expenseDate').value = today;
    }

    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString();
    }

    showLoading() {
        document.getElementById('loadingSpinner').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loadingSpinner').classList.add('hidden');
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FinanceApp();
});
