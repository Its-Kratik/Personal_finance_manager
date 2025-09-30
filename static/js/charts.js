// Personal Finance Manager - Chart Management

class ChartManager {
    constructor() {
        this.categoryChart = null;
        this.monthlyChart = null;
    }

    updateCategoryChart(categoryData) {
        const canvas = document.getElementById('categoryChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        // Destroy existing chart
        if (this.categoryChart) {
            this.categoryChart.destroy();
        }

        const labels = Object.keys(categoryData);
        const data = Object.values(categoryData);
        const colors = [
            '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe', 
            '#00f2fe', '#43e97b', '#38f9d7', '#fa709a', '#fee140'
        ];

        this.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                    borderWidth: 2,
                    hoverOffset: 8
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 20,
                            usePointStyle: true,
                            color: 'white',
                            font: { size: 12 }
                        }
                    },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = Utils.formatCurrency(context.parsed);
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((context.parsed / total) * 100).toFixed(1);
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                },
                animation: {
                    animateScale: true,
                    animateRotate: true,
                    duration: 1000
                }
            }
        });
    }

    updateMonthlyChart(monthlyData) {
        const canvas = document.getElementById('monthlyChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        
        if (this.monthlyChart) {
            this.monthlyChart.destroy();
        }

        const sortedMonths = Object.keys(monthlyData).sort();
        const last12Months = sortedMonths.slice(-12);
        
        const labels = last12Months.map(month => {
            const [year, monthNum] = month.split('-');
            const date = new Date(year, monthNum - 1);
            return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        });
        
        const data = last12Months.map(month => monthlyData[month] || 0);

        this.monthlyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Monthly Spending',
                    data: data,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 3,
                    pointRadius: 6,
                    pointHoverRadius: 8,
                    pointHoverBackgroundColor: '#764ba2',
                    pointHoverBorderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        titleColor: 'white',
                        bodyColor: 'white',
                        borderColor: 'rgba(255, 255, 255, 0.2)',
                        borderWidth: 1,
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                return `Spending: ${Utils.formatCurrency(context.parsed.y)}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { display: false },
                        ticks: { color: 'rgba(255, 255, 255, 0.8)', font: { size: 12 } }
                    },
                    y: {
                        beginAtZero: true,
                        grid: { color: 'rgba(255, 255, 255, 0.1)' },
                        ticks: {
                            color: 'rgba(255, 255, 255, 0.8)',
                            font: { size: 12 },
                            callback: function(value) {
                                return Utils.formatCurrency(value);
                            }
                        }
                    }
                },
                interaction: { intersect: false, mode: 'index' },
                animation: { duration: 1000, easing: 'easeInOutQuart' }
            }
        });
    }

    updateAllCharts(summaryData) {
        this.updateCategoryChart(summaryData.category_breakdown || {});
        this.updateMonthlyChart(summaryData.monthly_breakdown || {});
    }

    destroyAllCharts() {
        if (this.categoryChart) {
            this.categoryChart.destroy();
            this.categoryChart = null;
        }
        if (this.monthlyChart) {
            this.monthlyChart.destroy();
            this.monthlyChart = null;
        }
    }
}

window.ChartManager = ChartManager;
