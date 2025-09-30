// Modern JavaScript with ES6+ features and proper error handling

class FinanceManager {
    constructor() {
        this.apiBase = '/api';
        this.charts = {};
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.initCharts();
        this.setCurrentDate();
    }

    // API Methods
    async apiCall(endpoint, options = {}) {
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        try {
            const response = await fetch(`${this.apiBase}${endpoint}`, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            this.showNotification(error.message, 'error');
            throw error;
        }
    }

    async loadData() {
        try {
            this.showLoading(true);
            const [summary, budgets] = await Promise.all([
                this.apiCall('/summary'),
                this.apiCall('/budgets')
            ]);
            
            this.updateSummaryCards(summary.monthly_summary);
            this.updateCharts(summary.category_spending, budgets.budgets);
        } catch (error) {
            console.error('Failed to load data:', error);
        } finally {
            this.showLoading(false);
        }
    }

    // UI Updates
    updateSummaryCards(summary) {
        const elements = {
            totalIncome: summary.total_income || 0,
            totalExpenses: summary.total_expense || 0,
            netSavings: summary.net_savings || 0,
            savingsRate: `${(summary.savings_rate || 0).toFixed(1)}%`
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                const displayValue = typeof value === 'number' ? `$${value.toFixed(2)}` : value;
                this.animateValue(element, displayValue);
            }
        });
    }

    animateValue(element, newValue) {
        element.style.opacity = '0.5';
        setTimeout(() => {
            element.textContent = newValue;
            element.style.opacity = '1';
        }, 150);
    }

    // Chart Methods
    initCharts() {
        this.initCategoryChart();
        this.initBudgetChart();
    }

    initCategoryChart() {
        const ctx = document.getElementById('categoryChart');
        if (!ctx) return;

        this.charts.category = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    backgroundColor: [
                        '#EF4444', '#F97316', '#F59E0B', '#EAB308',
                        '#84CC16', '#22C55E', '#10B981', '#14B8A6',
                        '#06B6D4', '#0EA5E9', '#3B82F6', '#6366F1',
                        '#8B5CF6', '#A855F7', '#D946EF', '#EC4899'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom'
                    }
                }
            }
        });
    }

    initBudgetChart() {
        const ctx = document.getElementById('budgetChart');
        if (!ctx) return;

        this.charts.budget = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: [],
                datasets: [{
                    label: 'Spent',
                    data: [],
                    backgroundColor: '#EF4444'
                }, {
                    label: 'Budget',
                    data: [],
                    backgroundColor: '#22C55E'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(0);
                            }
                        }
                    }
                }
            }
        });
    }

    updateCharts(categorySpending, budgets) {
        // Update category chart
        if (this.charts.category && categorySpending.length > 0) {
            this.charts.category.data.labels = categorySpending.map(c => c.category);
            this.charts.category.data.datasets[0].data = categorySpending.map(c => c.total_expense);
            this.charts.category.update('none');
        }

        // Update budget chart
        if (this.charts.budget && budgets.length > 0) {
            this.charts.budget.data.labels = budgets.map(b => b.category);
            this.charts.budget.data.datasets[0].data = budgets.map(b => b.spent);
            this.charts.budget.data.datasets[1].data = budgets.map(b => b.amount);
            this.charts.budget.update('none');
        }
    }

    // Event Listeners
    setupEventListeners() {
        // Transaction form
        const form = document.getElementById('transactionForm');
        if (form) {
            form.addEventListener('submit', (e) => this.handleTransactionSubmit(e));
        }

        // Modal events
        window.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                this.closeModal();
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.closeModal();
            if (e.key === 'n' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.showAddTransactionModal();
            }
        });
    }

    // Transaction Methods
    async handleTransactionSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        // Validate amount
        const amount = parseFloat(data.amount);
        if (isNaN(amount) || amount <= 0) {
            this.showNotification('Please enter a valid amount', 'error');
            return;
        }

        try {
            this.showLoading(true);
            
            await this.apiCall('/transactions', {
                method: 'POST',
                body: JSON.stringify(data)
            });

            this.showNotification('Transaction added successfully!', 'success');
            this.closeModal();
            e.target.reset();
            await this.loadData();
            this.refreshTransactionTable();
            
        } catch (error) {
            console.error('Failed to add transaction:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async deleteTransaction(id) {
        if (!confirm('Are you sure you want to delete this transaction?')) return;

        try {
            this.showLoading(true);
            
            await this.apiCall(`/transactions/${id}`, {
                method: 'DELETE'
            });

            this.showNotification('Transaction deleted successfully!', 'success');
            await this.loadData();
            this.refreshTransactionTable();
            
        } catch (error) {
            console.error('Failed to delete transaction:', error);
        } finally {
            this.showLoading(false);
        }
    }

    async refreshTransactionTable() {
        try {
            const response = await this.apiCall('/transactions?limit=10');
            this.updateTransactionTable(response.transactions);
        } catch (error) {
            console.error('Failed to refresh transactions:', error);
        }
    }

    updateTransactionTable(transactions) {
        const tbody = document.querySelector('#transactionTable tbody');
        if (!tbody) return;

        tbody.innerHTML = transactions.map(t => `
            <tr>
                <td>${t.date}</td>
                <td>${t.description}</td>
                <td><span class="category-badge">${t.category}</span></td>
                <td class="amount ${t.transaction_type}">
                    ${t.transaction_type === 'income' ? '+' : '-'}$${parseFloat(t.amount).toFixed(2)}
                </td>
                <td>
                    <button class="btn-icon btn-danger" onclick="financeManager.deleteTransaction(${t.id})">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Modal Methods
    showAddTransactionModal() {
        const modal = document.getElementById('addTransactionModal');
        if (modal) {
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            modal.style.display = 'none';
        });
        document.body.style.overflow = 'auto';
    }

    // Utility Methods
    showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.style.display = show ? 'flex' : 'none';
        }
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <span>${message}</span>
            <button onclick="this.parentElement.remove()">&times;</button>
        `;

        // Add notification styles if not already added
        if (!document.querySelector('#notification-styles')) {
            const styles = document.createElement('style');
            styles.id = 'notification-styles';
            styles.textContent = `
                .notification {
                    position: fixed;
                    top: 20px;
                    right: 20px;
                    padding: 16px 20px;
                    border-radius: 8px;
                    color: white;
                    z-index: 10000;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    min-width: 300px;
                    animation: slideInRight 0.3s ease-out;
                }
                .notification-success { background-color: #10B981; }
                .notification-error { background-color: #EF4444; }
                .notification-info { background-color: #3B82F6; }
                .notification button {
                    background: none;
                    border: none;
                    color: white;
                    font-size: 18px;
                    cursor: pointer;
                    margin-left: 10px;
                }
                @keyframes slideInRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
            `;
            document.head.appendChild(styles);
        }

        document.body.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);
    }

    setCurrentDate() {
        const dateInput = document.getElementById('date');
        if (dateInput) {
            dateInput.value = new Date().toISOString().split('T')[0];
        }
    }
}

// Global functions for HTML onclick handlers
function showAddTransactionModal() {
    financeManager.showAddTransactionModal();
}

function closeModal() {
    financeManager.closeModal();
}

function deleteTransaction(id) {
    financeManager.deleteTransaction(id);
}

// Initialize app when DOM is loaded
let financeManager;
document.addEventListener('DOMContentLoaded', () => {
    financeManager = new FinanceManager();
});

// PWA Service Worker Registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/static/sw.js')
            .then(registration => console.log('SW registered'))
            .catch(error => console.log('SW registration failed'));
    });
}
