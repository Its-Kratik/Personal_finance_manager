// Personal Finance Manager - Main Application
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
        this.addEvent('dashboardBtn', 'click', () => this.showSection('dashboard'));
        this.addEvent('expensesBtn', 'click', () => this.showSection('expenses'));
        this.addEvent('analyticsBtn', 'click', () => this.showSection('analytics'));
        this.addEvent('logoutBtn', 'click', () => this.logout());

        // Expense actions
        this.addEvent('addExpenseBtn', 'click', () => this.showExpenseModal());
        this.addEvent('applyFilters', 'click', () => this.applyFilters());

        // Forms
        this.addEvent('loginForm', 'submit', (e) => this.handleLogin(e));
        this.addEvent('registerForm', 'submit', (e) => this.handleRegister(e));
        this.addEvent('expenseForm', 'submit', (e) => this.handleAddExpense(e));

        // Auth tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchAuthTab(btn.dataset.tab));
        });

        // Modal close buttons
        document.querySelectorAll('.close').forEach(closeBtn => {
            closeBtn.addEventListener('click', (e) => {
                this.closeModal(e.target.closest('.modal'));
            });
        });

        // Close modals on backdrop click
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal(e.target);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal[style*="display: block"]');
                if (openModal) this.closeModal(openModal);
            }
        });
    }

    addEvent(elementId, event, handler) {
        const element = document.getElementById(elementId);
        if (element) {
            element.addEventListener(event, handler);
        }
    }

    async checkAuth() {
        try {
            await Utils.apiCall('/api/expenses?limit=1');
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
        } catch (error) {
            console.error('Failed to load initial data:', error);
            this.showToast('Failed to load data', 'error');
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
        // Update active tab button
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        
        // Show/hide forms
        document.getElementById('loginForm').classList.toggle('hidden', tab !== 'login');
        document.getElementById('registerForm').classList.toggle('hidden', tab !== 'register');
    }

    async handleLogin(e) {
        e.preventDefault();
        this.showLoading();

        const username = document.getElementById('loginUsername').value.trim();
        const password = document.getElementById('loginPassword').value;

        if (!username || !password) {
            this.showToast('Please fill in all fields', 'error');
            this.hideLoading();
            return;
        }

        try {
            const data = await Utils.apiCall('/api/login', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            this.currentUser = data.user;
            await this.loadInitialData();
            this.showApp();
            this.showToast('Welcome back!', 'success');
        } catch (error) {
            this.showToast(error.message || 'Login failed', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async handleRegister(e) {
        e.preventDefault();
        this.showLoading();

        const username = document.getElementById('registerUsername').value.trim();
        const password = document.getElementById('registerPassword').value;

        if (!username || !password) {
            this.showToast('Please fill in all fields', 'error');
            this.hideLoading();
            return;
        }

        if (password.length < 6) {
            this.showToast('Password must be at least 6 characters', 'error');
            this.hideLoading();
            return;
        }

        try {
            await Utils.apiCall('/api/register', {
                method: 'POST',
                body: JSON.stringify({ username, password })
            });

            this.showToast('Registration successful! Please login.', 'success');
            this.switchAuthTab('login');
            document.getElementById('registerForm').reset();
            document.getElementById('loginUsername').value = username;
        } catch (error) {
            this.showToast(error.message || 'Registration failed', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async logout() {
        if (!confirm('Are you sure you want to logout?')) return;

        try {
            await Utils.apiCall('/api/logout', { method: 'POST' });
            this.currentUser = null;
            this.expenses = [];
            this.categories = [];
            this.chartManager.destroyAllCharts();
            this.showAuthModal();
            this.showToast('Logged out successfully', 'success');
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
            throw error;
        }
    }

    populateCategorySelects() {
        const selects = document.querySelectorAll('#expenseCategory, #categoryFilter');
        
        selects.forEach(select => {
            const placeholder = select.querySelector('option[value=""]');
            const placeholderText = placeholder ? placeholder.textContent : 'Select Category';
            
            select.innerHTML = `<option value="">${placeholderText}</option>`;
            
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
            throw error;
        }
    }

    async loadSummary() {
        try {
            const summary = await Utils.apiCall('/api/summary');
            this.updateSummaryCards(summary);
            this.chartManager.updateAllCharts(summary);
        } catch (error) {
            console.error('Failed to load summary:', error);
            throw error;
        }
    }

    updateSummaryCards(summary) {
        // Update total amount
        Utils.animateNumber(
            document.getElementById('totalAmount'), 
            0, 
            summary.total_amount
        );

        // Update total count
        const countElement = document.getElementById('totalCount');
        countElement.textContent = summary.total_count;

        // Update average
        Utils.animateNumber(
            document.getElementById('averageAmount'), 
            0, 
            summary.average_per_expense
        );

        // Calculate and update this month's total
        const currentMonth = new Date().toISOString().slice(0, 7);
        const monthlyAmount = summary.monthly_breakdown?.[currentMonth] || 0;
        Utils.animateNumber(
            document.getElementById('monthlyAmount'), 
            0, 
            monthlyAmount
        );
    }

    displayRecentExpenses() {
        const container = document.getElementById('recentExpensesList');
        const recentExpenses = this.expenses.slice(0, 5);
        
        if (recentExpenses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No expenses yet</h3>
                    <p>Start tracking your expenses by clicking "Add Expense"</p>
                </div>
            `;
            return;
        }

        container.innerHTML = recentExpenses.map(expense => 
            this.createExpenseHTML(expense)
        ).join('');
    }

    displayAllExpenses() {
        const container = document.getElementById('expensesList');
        
        if (this.expenses.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <h3>No expenses found</h3>
                    <p>Start tracking your spending to see insights here</p>
                </div>
            `;
            return;
        }

        container.innerHTML = this.expenses.map(expense => 
            this.createExpenseHTML(expense)
        ).join('');
    }

    createExpenseHTML(expense) {
        return `
            <div class="expense-item" data-expense-id="${expense.id}">
                <div class="expense-info">
                    <div class="expense-description">${Utils.escapeHtml(expense.description)}</div>
                    <div class="expense-meta">
                        <span class="expense-category">${Utils.escapeHtml(expense.category)}</span>
                        <span class="expense-date">${Utils.formatDate(expense.date)}</span>
                    </div>
                </div>
                <div class="expense-amount">${Utils.formatCurrency(expense.amount)}</div>
                <button class="btn btn-danger" onclick="app.deleteExpense(${expense.id})" type="button" aria-label="Delete expense">
                    Delete
                </button>
            </div>
        `;
    }

    showExpenseModal() {
        document.getElementById('expenseModal').style.display = 'block';
        setTimeout(() => {
            document.getElementById('expenseDescription').focus();
        }, 100);
    }

    async handleAddExpense(e) {
        e.preventDefault();
        
        const formData = {
            description: document.getElementById('expenseDescription').value.trim(),
            amount: parseFloat(document.getElementById('expenseAmount').value),
            category_id: parseInt(document.getElementById('expenseCategory').value),
            date: document.getElementById('expenseDate').value
        };

        // Validate form
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
            
            this.showToast('Expense added successfully!', 'success');
        } catch (error) {
            this.showToast(error.message || 'Failed to add expense', 'error');
        } finally {
            this.hideLoading();
        }
    }

    async deleteExpense(expenseId) {
        if (!confirm('Are you sure you want to delete this expense?')) return;

        this.showLoading();

        try {
            await Utils.apiCall(`/api/expenses/${expenseId}`, { 
                method: 'DELETE' 
            });
            
            await this.loadExpenses();
            await this.loadSummary();
            
            this.showToast('Expense deleted successfully!', 'success');
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
            this.showToast('Filters applied', 'success');
        } catch (error) {
            this.showToast('Failed to apply filters', 'error');
        } finally {
            this.hideLoading();
        }
    }

    showSection(sectionName) {
        // Update navigation
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.toggle('active', btn.id === `${sectionName}Btn`);
        });

        // Show/hide sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.toggle('hidden', section.id !== sectionName);
        });

        // Reload analytics data when showing that section
        if (sectionName === 'analytics') {
            setTimeout(() => this.loadSummary(), 100);
        }
    }

    closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
        }
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        const dateInput = document.getElementById('expenseDate');
        if (dateInput) {
            dateInput.value = today;
        }
    }

    showLoading() {
        document.getElementById('loadingSpinner')?.classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loadingSpinner')?.classList.add('hidden');
    }

    showToast(message, type = 'success') {
        const toast = document.getElementById('toast');
        if (!toast) return;

        toast.textContent = message;
        toast.className = `toast ${type} show`;
        
        setTimeout(() => {
            toast.classList.remove('show');
        }, 4000);
    }
}

// Initialize app
document.addEventListener('DOMContentLoaded', () => {
    window.app = new FinanceApp();
});
