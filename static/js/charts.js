// Chart Manager for Personal Finance Manager
class ChartManager {
    constructor() {
        this.categoryChart = null;
        this.monthlyChart = null;
        this.chartColors = [
            '#667eea', '#764ba2', '#f093fb', '#4facfe',
            '#00f2fe', '#43e97b', '#38f9d7', '#fa709a',
            '#fee140', '#30cfd0', '#a8edea', '#fed6e3'
        ];
    }

    // Destroy all existing charts
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

    // Update all charts with new data
    updateAllCharts(summary) {
        if (!summary) return;

        this.updateCategoryChart(summary.category_breakdown || {});
        this.updateMonthlyChart(summary.monthly_breakdown || {});
    }

    // Create/Update Category Spending Chart (Doughnut)
    updateCategoryChart(categoryData) {
        const canvas = document.getElementById('categoryChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Destroy existing chart
        if (this.categoryChart) {
            this.categoryChart.destroy();
        }

        // Prepare data
        const categories = Object.keys(categoryData);
        const amounts = Object.values(categoryData);

        // Handle empty data
        if (categories.length === 0) {
            this.showEmptyChartMessage(ctx, canvas, 'No spending data available');
            return;
        }

        // Create chart
        this.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categories,
                datasets: [{
                    label: 'Spending by Category',
                    data: amounts,
                    backgroundColor: this.chartColors.slice(0, categories.length),
                    borderColor: '#ffffff',
                    borderWidth: 2,
                    hoverOffset: 10
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            padding: 15,
                            font: {
                                size: 12,
                                family: 'Inter, sans-serif'
                            },
                            usePointStyle: true,
                            pointStyle: 'circle'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = context.parsed || 0;
                                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                const percentage = ((value / total) * 100).toFixed(1);
                                return `${label}: $${value.toFixed(2)} (${percentage}%)`;
                            }
                        },
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        }
                    }
                }
            }
        });
    }

    // Create/Update Monthly Spending Chart (Line)
    updateMonthlyChart(monthlyData) {
        const canvas = document.getElementById('monthlyChart');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');

        // Destroy existing chart
        if (this.monthlyChart) {
            this.monthlyChart.destroy();
        }

        // Prepare and sort data by date
        const sortedMonths = Object.keys(monthlyData).sort();
        const amounts = sortedMonths.map(month => monthlyData[month]);

        // Format month labels (e.g., "2024-01" -> "Jan 2024")
        const labels = sortedMonths.map(month => {
            const [year, monthNum] = month.split('-');
            const date = new Date(year, monthNum - 1);
            return date.toLocaleDateString('en-US', { 
                month: 'short', 
                year: 'numeric' 
            });
        });

        // Handle empty data
        if (sortedMonths.length === 0) {
            this.showEmptyChartMessage(ctx, canvas, 'No monthly data available');
            return;
        }

        // Create chart
        this.monthlyChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Monthly Spending',
                    data: amounts,
                    borderColor: '#667eea',
                    backgroundColor: 'rgba(102, 126, 234, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointRadius: 5,
                    pointHoverRadius: 7,
                    pointBackgroundColor: '#667eea',
                    pointBorderColor: '#ffffff',
                    pointBorderWidth: 2,
                    pointHoverBackgroundColor: '#764ba2',
                    pointHoverBorderColor: '#ffffff'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                plugins: {
                    legend: {
                        display: false
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                return `Spending: $${context.parsed.y.toFixed(2)}`;
                            }
                        },
                        backgroundColor: 'rgba(0, 0, 0, 0.8)',
                        padding: 12,
                        cornerRadius: 8,
                        titleFont: {
                            size: 14,
                            weight: 'bold'
                        },
                        bodyFont: {
                            size: 13
                        }
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: function(value) {
                                return '$' + value.toFixed(0);
                            },
                            font: {
                                size: 11,
                                family: 'Inter, sans-serif'
                            }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)',
                            drawBorder: false
                        }
                    },
                    x: {
                        ticks: {
                            font: {
                                size: 11,
                                family: 'Inter, sans-serif'
                            }
                        },
                        grid: {
                            display: false,
                            drawBorder: false
                        }
                    }
                }
            }
        });
    }

    // Show message when no data is available
    showEmptyChartMessage(ctx, canvas, message) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.font = '16px Inter, sans-serif';
        ctx.fillStyle = '#64748b';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(message, canvas.width / 2, canvas.height / 2);
    }

    // Get color for category (consistent coloring)
    getCategoryColor(index) {
        return this.chartColors[index % this.chartColors.length];
    }
}
