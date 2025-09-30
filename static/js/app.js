// Personal Finance Manager - Enhanced Application with Charts
class FinanceApp {
    constructor() {
        this.currentUser = null;
        this.expenses = [];
        this.categories = [];
        this.chartManager = new ChartManager();
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
            const response = await Utils.apiCall('/api/expenses?limit=1');
            await this.loadInitialData();
            this.showApp();
        } catch (error) {
            this.showAuthModal();
        }
    }

    async loadInitialData() {
        this.showLoading();
        try {
            await Promise.all([
                this.loadCategories(),
                this.loadExpenses(),
                this.loadSummary()
            ]);
        } finally {
            this.hideLoading();
        }
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
            const data = await Utils.apiCall('/api/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            this.currentUser = data.user;
            await this.loadInitialData();
            this.showApp();
            this.showToast('Welcome back! 🎉', 'success');
        } catch (error) {
            this.showToast(error.message || 'Login failed', 'error');
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
            await Utils.apiCall('/api/register', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            this.showToast('Registration successful! Please login. ✅', 'success');
            this.switchAuthTab('login');
            document.getElementById('registerForm').reset();
        } catch (error) {
            this.showToast(error.message || 'Registration failed', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async logout() {
        try {
            await Utils.apiCall('/api/logout', { method: 'POST' });
            this.currentUser = null;
            this.expenses = [];
            this.categories = [];
            this.chartManager.destroyAllCharts();
            this.showAuthModal();
            this.showToast('Logged out successfully 👋', 'success');
        } catch (error) {
            this.showToast('Logout failed', 'error');
        }
    }

    async loadCategories() {
        try {
            this.categories = await Utils.apiCall('/api/categories');
            this.populateCategorySelects();
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
            this.expenses = await Utils.apiCall('/api/expenses');
            this.displayRecentExpenses();
            this.displayAllExpenses();
        } catch (error) {
            console.error('Failed to load expenses:', error);
        }
    }

    async loadSummary() {
        try {
            const summary = await Utils.apiCall('/api/summary');
            this.updateSummaryCards(summary);
            this.chartManager.updateAllCharts(summary);
        } catch (error) {
            console.error('Failed to load summary:', error);
        }
    }

    updateSummaryCards(summary) {
        // Animate the numbers for better UX
        Utils.animateNumber(document.getElementById('totalAmount'), 0, summary.total_amount);
        Utils.animateNumber(document.getElementById('totalCount'), 0, summary.total_count);
        Utils.animateNumber(document.getElementById('averageAmount'), 0, summary.average_per_expense);
        
        // Calculate this month's total
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyAmount = summary.monthly_breakdown[currentMonth] || 0;
        Utils.animateNumber(document.getElementById('monthlyAmount'), 0, monthlyAmount);
    }

    updateCharts(summary) {
        this.chartManager.updateAllCharts(summary);
    }

    displayRecentExpenses() {
        const container = document.getElementById('recentExpensesList');
        const recentExpenses = this.expenses.slice(0, 5);
        
        if (recentExpenses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No expenses yet! 💸</h3>
                    <p>Start tracking your expenses by clicking "Add Expense"</p>
                </div>
            `;
            return;
        }

        container.innerHTML = recentExpenses.map(expense => `
            <div class="expense-item" data-expense-id="${expense.id}">
                <div class="expense-info">
                    <div class="expense-description">${expense.description}</div>
                    <div class="expense-meta">
                        <span class="expense-category">${expense.category}</span>
                        <span class="expense-date">${Utils.formatDate(expense.date)}</span>
                    </div>
                </div>
                <div class="expense-amount">${Utils.formatCurrency(expense.amount)}</div>
                <button class="btn btn-danger" onclick="app.deleteExpense(${expense.id})">
                    🗑️ Delete
                </button>
            </div>
        `).join('');
    }

    displayAllExpenses() {
        const container = document.getElementById('expensesList');
        
        if (this.expenses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No expenses found 📊</h3>
                    <p>Start tracking your spending to see insights here!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.expenses.map(expense => `
            <div class="expense-item" data-expense-id="${expense.id}">
                <div class="expense-info">
                    <div class="expense-description">${expense.description}</div>
                    <div class="expense-meta">
                        <span class="expense-category">${expense.category}</span>
                        <span class="expense-date">${Utils.formatDate(expense.date)}</span>
                    </div>
                </div>
                <div class="expense-amount">${Utils.formatCurrency(expense.amount)}</div>
                <button class="btn btn-danger" onclick="app.deleteExpense(${expense.id})">
                    🗑️ Delete
                </button>
            </div>
        `).join('');
    }

    showExpenseModal() {
        document.getElementById('expenseModal').style.display = 'block';
        document.getElementById('expenseDescription').focus();
    }

    async handleAddExpense(e) {
        e.preventDefault();
        
        const formData = {
            description: document.getElementById('expenseDescription').value,
            amount: parseFloat(document.getElementById('expenseAmount').value),
            category_id: parseInt(document.getElementById('expenseCategory').value),
            date: document.getElementById('expenseDate').value
        };

        // Validate form data
        const errors = Utils.validateExpenseForm(formData);
        if (errors.length > 0) {
            this.showToast(errors[0], 'error');
            return;
        }

        this.showLoading();

        try {
            await Utils.apiCall('/api/expenses', {
                method: 'POST',
                body: JSON.stringify(formData)
            });

            this.closeModal(document.getElementById('expenseModal'));
            document.getElementById('expenseForm').reset();
            this.setDefaultDate();
            
            await this.loadExpenses();
            await this.loadSummary();
            
            this.showToast('💰 Expense added successfully!', 'success');
        } catch (error) {
            this.showToast(error.message || 'Failed to add expense', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async deleteExpense(expenseId) {
        if (!confirm('Are you sure you want to delete this expense? 🗑️')) return;

        this.showLoading();

        try {
            await Utils.apiCall(`/api/expenses/${expenseId}`, { method: 'DELETE' });
            
            await this.loadExpenses();
            await this.loadSummary();
            
            this.showToast('🗑️ Expense deleted successfully!', 'success');
        } catch (error) {
            this.showToast(error.message || 'Failed to delete expense', 'error');
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

        this.showLoading();

        try {
            this.expenses = await Utils.apiCall(`/api/expenses?${params}`);
            this.displayAllExpenses();
            this.showToast('🔍 Filters applied!', 'success');
        } catch (error) {
            this.showToast('Failed to apply filters', 'error');
        } finally {
            this.hideLoading();
        }
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
        }, 4000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FinanceApp();
});
