// Utility Functions for Personal Finance Manager
class Utils {
    // API call wrapper with error handling
    static async apiCall(endpoint, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'same-origin'
        };

        const config = { ...defaultOptions, ...options };

        try {
            const response = await fetch(endpoint, config);
            
            // Handle non-OK responses
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            // Return JSON data
            return await response.json();
        } catch (error) {
            // Network or parsing errors
            if (error instanceof TypeError) {
                throw new Error('Network error. Please check your connection.');
            }
            throw error;
        }
    }

    // Format currency with proper symbol and decimals
    static formatCurrency(amount) {
        if (amount === null || amount === undefined || isNaN(amount)) {
            return '$0.00';
        }

        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    }

    // Format date to readable format
    static formatDate(dateString) {
        if (!dateString) return 'N/A';

        try {
            const date = new Date(dateString);
            
            // Check for invalid date
            if (isNaN(date.getTime())) {
                return 'Invalid Date';
            }

            // Format as "Jan 15, 2024"
            return date.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (error) {
            return 'Invalid Date';
        }
    }

    // Format date to relative time (e.g., "2 days ago")
    static formatRelativeDate(dateString) {
        if (!dateString) return 'N/A';

        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffMs = now - date;
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

            if (diffDays === 0) return 'Today';
            if (diffDays === 1) return 'Yesterday';
            if (diffDays < 7) return `${diffDays} days ago`;
            if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
            if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
            return `${Math.floor(diffDays / 365)} years ago`;
        } catch (error) {
            return this.formatDate(dateString);
        }
    }

    // Animate number changes for better UX
    static animateNumber(element, start, end, duration = 1000) {
        if (!element) return;

        // If numbers are the same, just set it
        if (start === end) {
            element.textContent = this.formatCurrency(end);
            return;
        }

        const startTime = performance.now();
        const difference = end - start;

        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);

            // Easing function (ease-out)
            const easeOut = 1 - Math.pow(1 - progress, 3);
            const current = start + (difference * easeOut);

            element.textContent = this.formatCurrency(current);

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                element.textContent = this.formatCurrency(end);
            }
        };

        requestAnimationFrame(animate);
    }

    // Validate expense form data
    static validateExpenseForm(formData) {
        const errors = [];

        // Validate description
        if (!formData.description || formData.description.trim() === '') {
            errors.push('Description is required');
        } else if (formData.description.length > 200) {
            errors.push('Description must be less than 200 characters');
        }

        // Validate amount
        if (!formData.amount || isNaN(formData.amount)) {
            errors.push('Valid amount is required');
        } else if (formData.amount <= 0) {
            errors.push('Amount must be greater than 0');
        } else if (formData.amount > 1000000) {
            errors.push('Amount must be less than $1,000,000');
        }

        // Validate category
        if (!formData.category_id || isNaN(formData.category_id)) {
            errors.push('Category is required');
        }

        // Validate date
        if (!formData.date) {
            errors.push('Date is required');
        } else {
            const expenseDate = new Date(formData.date);
            const today = new Date();
            today.setHours(23, 59, 59, 999);

            if (isNaN(expenseDate.getTime())) {
                errors.push('Valid date is required');
            } else if (expenseDate > today) {
                errors.push('Date cannot be in the future');
            }
        }

        return errors;
    }

    // Escape HTML to prevent XSS attacks
    static escapeHtml(text) {
        if (!text) return '';

        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Debounce function for search/filter inputs
    static debounce(func, wait = 300) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    // Throttle function for scroll/resize events
    static throttle(func, limit = 100) {
        let inThrottle;
        return function(...args) {
            if (!inThrottle) {
                func.apply(this, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    }

    // Calculate percentage of total
    static calculatePercentage(value, total) {
        if (!total || total === 0) return 0;
        return ((value / total) * 100).toFixed(1);
    }

    // Group expenses by category
    static groupByCategory(expenses) {
        return expenses.reduce((acc, expense) => {
            const category = expense.category || 'Uncategorized';
            if (!acc[category]) {
                acc[category] = {
                    total: 0,
                    count: 0,
                    expenses: []
                };
            }
            acc[category].total += parseFloat(expense.amount);
            acc[category].count += 1;
            acc[category].expenses.push(expense);
            return acc;
        }, {});
    }

    // Group expenses by month
    static groupByMonth(expenses) {
        return expenses.reduce((acc, expense) => {
            const month = expense.date.slice(0, 7); // YYYY-MM
            if (!acc[month]) {
                acc[month] = {
                    total: 0,
                    count: 0,
                    expenses: []
                };
            }
            acc[month].total += parseFloat(expense.amount);
            acc[month].count += 1;
            acc[month].expenses.push(expense);
            return acc;
        }, {});
    }

    // Sort expenses by date (newest first)
    static sortExpensesByDate(expenses, descending = true) {
        return [...expenses].sort((a, b) => {
            const dateA = new Date(a.date);
            const dateB = new Date(b.date);
            return descending ? dateB - dateA : dateA - dateB;
        });
    }

    // Sort expenses by amount
    static sortExpensesByAmount(expenses, descending = true) {
        return [...expenses].sort((a, b) => {
            return descending ? b.amount - a.amount : a.amount - b.amount;
        });
    }

    // Filter expenses by date range
    static filterByDateRange(expenses, startDate, endDate) {
        return expenses.filter(expense => {
            const expenseDate = new Date(expense.date);
            const start = startDate ? new Date(startDate) : null;
            const end = endDate ? new Date(endDate) : null;

            if (start && expenseDate < start) return false;
            if (end && expenseDate > end) return false;
            return true;
        });
    }

    // Calculate statistics for expenses
    static calculateStats(expenses) {
        if (!expenses || expenses.length === 0) {
            return {
                total: 0,
                count: 0,
                average: 0,
                min: 0,
                max: 0
            };
        }

        const amounts = expenses.map(e => parseFloat(e.amount));
        const total = amounts.reduce((sum, amount) => sum + amount, 0);

        return {
            total: total,
            count: expenses.length,
            average: total / expenses.length,
            min: Math.min(...amounts),
            max: Math.max(...amounts)
        };
    }

    // Export expenses to CSV
    static exportToCSV(expenses, filename = 'expenses.csv') {
        if (!expenses || expenses.length === 0) {
            alert('No expenses to export');
            return;
        }

        // CSV headers
        const headers = ['Date', 'Description', 'Category', 'Amount'];
        
        // CSV rows
        const rows = expenses.map(expense => [
            expense.date,
            `"${expense.description.replace(/"/g, '""')}"`, // Escape quotes
            expense.category,
            expense.amount
        ]);

        // Combine headers and rows
        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        // Create and download file
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', filename);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    }

    // Get current month date range
    static getCurrentMonthRange() {
        const now = new Date();
        const start = new Date(now.getFullYear(), now.getMonth(), 1);
        const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0]
        };
    }

    // Check if browser supports required features
    static checkBrowserSupport() {
        const features = {
            fetch: 'fetch' in window,
            localStorage: 'localStorage' in window,
            promises: 'Promise' in window,
            async: typeof (async () => {}) === 'function'
        };

        const unsupported = Object.entries(features)
            .filter(([key, value]) => !value)
            .map(([key]) => key);

        if (unsupported.length > 0) {
            console.warn('Unsupported features:', unsupported);
            return false;
        }

        return true;
    }

    // Format large numbers with K, M, B suffixes
    static formatLargeNumber(num) {
        if (num >= 1000000000) {
            return (num / 1000000000).toFixed(1) + 'B';
        }
        if (num >= 1000000) {
            return (num / 1000000).toFixed(1) + 'M';
        }
        if (num >= 1000) {
            return (num / 1000).toFixed(1) + 'K';
        }
        return num.toString();
    }
}
