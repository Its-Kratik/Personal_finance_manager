// Enhanced Personal Finance Manager - Modern Utilities

class ModernUtils {
    // Format currency with animation support
    static formatCurrency(amount, options = {}) {
        const defaultOptions = {
            style: 'currency',
            currency: options.currency || 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        };
        
        try {
            return new Intl.NumberFormat('en-US', defaultOptions).format(amount);
        } catch (error) {
            console.warn('Currency formatting failed:', error);
            return `$${parseFloat(amount || 0).toFixed(2)}`;
        }
    }

    // Format date with modern styling and relative time
    static formatDate(dateString) {
        try {
            const date = new Date(dateString);
            const now = new Date();
            const diffTime = Math.abs(now - date);
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            
            // Return relative time for recent dates
            if (diffDays === 0) {
                return 'Today';
            } else if (diffDays === 1) {
                return 'Yesterday';
            } else if (diffDays <= 7) {
                return `${diffDays} days ago`;
            } else if (diffDays <= 30) {
                const weeks = Math.floor(diffDays / 7);
                return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
            } else {
                return date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
                });
            }
        } catch (error) {
            console.warn('Date formatting failed:', error);
            return 'Invalid date';
        }
    }

    // Format date for input fields
    static formatDateForInput(date = new Date()) {
        try {
            const d = new Date(date);
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch (error) {
            console.warn('Date input formatting failed:', error);
            const today = new Date();
            return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        }
    }

    // Generate beautiful gradient colors for charts
    static generateGradientColors(count) {
        const gradients = [
            'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
            'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
            'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
            'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
            'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
            'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
            'linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%)',
            'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
            'linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)'
        ];
        
        // Generate solid colors for Chart.js compatibility
        const solidColors = [
            '#667eea', '#764ba2', '#f093fb', '#f5576c', '#4facfe',
            '#00f2fe', '#43e97b', '#38f9d7', '#fa709a', '#fee140',
            '#a8edea', '#fed6e3', '#ff9a9e', '#fecfef', '#ffecd2'
        ];
        
        return Array.from({length: count}, (_, i) => solidColors[i % solidColors.length]);
    }

    // Smooth number animation with easing
    static animateNumber(element, start, end, duration = 1200, easing = 'easeOutCubic') {
        if (!element) {
            console.warn('Element not found for number animation');
            return;
        }

        const startTime = performance.now();
        const startVal = parseFloat(start) || 0;
        const endVal = parseFloat(end) || 0;
        
        const easingFunctions = {
            linear: t => t,
            easeInQuad: t => t * t,
            easeOutQuad: t => t * (2 - t),
            easeInOutQuad: t => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t,
            easeOutCubic: t => (--t) * t * t + 1,
            easeInOutCubic: t => t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1
        };
        
        const easeFn = easingFunctions[easing] || easingFunctions.easeOutCubic;
        
        function updateNumber(currentTime) {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const easedProgress = easeFn(progress);
            
            const currentVal = startVal + (endVal - startVal) * easedProgress;
            
            try {
                if (element.classList.contains('amount')) {
                    element.textContent = ModernUtils.formatCurrency(currentVal);
                } else {
                    element.textContent = Math.round(currentVal).toLocaleString();
                }
            } catch (error) {
                console.warn('Number animation update failed:', error);
                element.textContent = Math.round(currentVal);
            }
            
            if (progress < 1) {
                requestAnimationFrame(updateNumber);
            } else {
                // Add completion animation
                element.style.transition = 'transform 0.2s ease';
                element.style.transform = 'scale(1.05)';
                setTimeout(() => {
                    element.style.transform = 'scale(1)';
                    setTimeout(() => {
                        element.style.transition = '';
                    }, 200);
                }, 200);
            }
        }
        
        requestAnimationFrame(updateNumber);
    }

    // Modern toast notification with icons and better UX
    static showToast(message, type = 'success', duration = 4000) {
        const toast = document.getElementById('toast');
        if (!toast) {
            console.warn('Toast element not found');
            return;
        }
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        const icon = icons[type] || icons.info;
        
        // Clear any existing timeout
        if (toast.hideTimeout) {
            clearTimeout(toast.hideTimeout);
        }
        
        toast.innerHTML = `
            <div style="display: flex; align-items: center; gap: 0.75rem;">
                <span style="font-size: 1.2rem; flex-shrink: 0;">${icon}</span>
                <span style="line-height: 1.4;">${message}</span>
            </div>
        `;
        
        toast.className = `toast ${type} show`;
        
        // Add click to dismiss
        const dismissToast = () => {
            toast.classList.remove('show');
            toast.onclick = null;
        };
        
        toast.onclick = dismissToast;
        
        // Auto hide
        toast.hideTimeout = setTimeout(dismissToast, duration);
    }

    // Stagger animation for lists with intersection observer
    static staggerAnimation(elements, delay = 100, threshold = 0.1) {
        if (!elements || elements.length === 0) return;
        
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    const element = entry.target;
                    const index = Array.from(elements).indexOf(element);
                    
                    element.style.opacity = '0';
                    element.style.transform = 'translateY(30px)';
                    element.style.transition = 'all 0.6s ease';
                    
                    setTimeout(() => {
                        element.style.opacity = '1';
                        element.style.transform = 'translateY(0)';
                    }, index * delay);
                    
                    observer.unobserve(element);
                }
            });
        }, { threshold });

        elements.forEach(element => {
            observer.observe(element);
        });
    }

    // Create particle effect for interactions
    static createParticleEffect(x, y, color = '#667eea', particleCount = 12) {
        const particles = [];
        
        for (let i = 0; i < particleCount; i++) {
            const particle = document.createElement('div');
            particle.style.cssText = `
                position: fixed;
                width: 6px;
                height: 6px;
                background: ${color};
                border-radius: 50%;
                pointer-events: none;
                z-index: 9999;
                left: ${x}px;
                top: ${y}px;
                opacity: 1;
                box-shadow: 0 0 6px ${color};
            `;
            
            document.body.appendChild(particle);
            particles.push(particle);
            
            const angle = (i * (360 / particleCount)) * Math.PI / 180;
            const velocity = 80 + Math.random() * 40;
            const vx = Math.cos(angle) * velocity;
            const vy = Math.sin(angle) * velocity;
            
            let opacity = 1;
            let currentX = x;
            let currentY = y;
            let gravity = 2;
            
            const animate = () => {
                currentX += vx * 0.02;
                currentY += vy * 0.02 + gravity * 0.02;
                opacity -= 0.025;
                gravity += 0.5;
                
                particle.style.left = currentX + 'px';
                particle.style.top = currentY + 'px';
                particle.style.opacity = opacity;
                particle.style.transform = `scale(${opacity})`;
                
                if (opacity > 0) {
                    requestAnimationFrame(animate);
                } else {
                    try {
                        document.body.removeChild(particle);
                    } catch (error) {
                        // Particle already removed
                    }
                }
            };
            
            requestAnimationFrame(animate);
        }
    }

    // Enhanced loading state manager
    static setLoading(element, loading = true) {
        if (!element) {
            console.warn('Element not found for loading state');
            return;
        }

        if (loading) {
            element.dataset.originalText = element.innerHTML;
            element.innerHTML = `
                <div style="display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                    <div style="
                        width: 16px; 
                        height: 16px; 
                        border: 2px solid rgba(255,255,255,0.3); 
                        border-top: 2px solid currentColor; 
                        border-radius: 50%; 
                        animation: spin 1s linear infinite;
                    "></div>
                    <span>Loading...</span>
                </div>
            `;
            element.disabled = true;
            element.style.cursor = 'not-allowed';
            element.style.opacity = '0.8';
        } else {
            element.innerHTML = element.dataset.originalText || 'Submit';
            element.disabled = false;
            element.style.cursor = 'pointer';
            element.style.opacity = '1';
            delete element.dataset.originalText;
        }
    }

    // Advanced form validation with custom rules
    static validateForm(formData, rules) {
        const errors = [];
        
        for (const [field, rule] of Object.entries(rules)) {
            const value = formData[field];
            
            // Required field validation
            if (rule.required && (!value || value.toString().trim() === '')) {
                errors.push(`${rule.label || field} is required`);
                continue;
            }
            
            // Skip other validations if field is empty and not required
            if (!value && !rule.required) continue;
            
            const stringValue = value.toString();
            
            // Length validations
            if (rule.minLength && stringValue.length < rule.minLength) {
                errors.push(`${rule.label || field} must be at least ${rule.minLength} characters`);
            }
            
            if (rule.maxLength && stringValue.length > rule.maxLength) {
                errors.push(`${rule.label || field} must not exceed ${rule.maxLength} characters`);
            }
            
            // Numeric validations
            const numValue = parseFloat(value);
            if (rule.min !== undefined && numValue < rule.min) {
                errors.push(`${rule.label || field} must be at least ${rule.min}`);
            }
            
            if (rule.max !== undefined && numValue > rule.max) {
                errors.push(`${rule.label || field} must not exceed ${rule.max}`);
            }
            
            // Pattern validation
            if (rule.pattern && !rule.pattern.test(stringValue)) {
                errors.push(rule.message || `${rule.label || field} format is invalid`);
            }
            
            // Custom validation function
            if (rule.custom && typeof rule.custom === 'function') {
                const customResult = rule.custom(value, formData);
                if (customResult !== true) {
                    errors.push(customResult || `${rule.label || field} is invalid`);
                }
            }
        }
        
        return errors;
    }

    // Smooth scroll with easing
    static smoothScrollTo(element, duration = 800, offset = 0) {
        if (!element) return;
        
        const targetPosition = element.offsetTop - offset;
        const startPosition = window.pageYOffset;
        const distance = targetPosition - startPosition;
        let startTime = null;
        
        function animation(currentTime) {
            if (startTime === null) startTime = currentTime;
            const timeElapsed = currentTime - startTime;
            const progress = Math.min(timeElapsed / duration, 1);
            const ease = ModernUtils.easeInOutCubic(progress);
            
            window.scrollTo(0, startPosition + distance * ease);
            
            if (progress < 1) {
                requestAnimationFrame(animation);
            }
        }
        
        requestAnimationFrame(animation);
    }

    // Easing function
    static easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1;
    }

    // Modern API calls with retry logic and better error handling
    static async apiCall(url, options = {}) {
        const defaultOptions = {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        };

        let attempts = 0;
        const maxAttempts = options.retry || 3;
        const delay = options.retryDelay || 1000;

        while (attempts < maxAttempts) {
            try {
                const response = await fetch(url, defaultOptions);
                
                if (!response.ok) {
                    let errorData = {};
                    try {
                        errorData = await response.json();
                    } catch (e) {
                        // Response is not JSON
                    }
                    
                    const errorMessage = errorData.error || 
                                       errorData.message || 
                                       `HTTP ${response.status}: ${response.statusText}`;
                    
                    throw new Error(errorMessage);
                }

                return await response.json();
            } catch (error) {
                attempts++;
                
                if (attempts >= maxAttempts) {
                    console.error(`API call failed after ${maxAttempts} attempts:`, error);
                    
                    // Provide user-friendly error messages
                    if (error.name === 'TypeError' && error.message.includes('fetch')) {
                        throw new Error('Network error. Please check your connection and try again.');
                    }
                    
                    throw error;
                }
                
                // Wait before retry with exponential backoff
                await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, attempts - 1)));
            }
        }
    }

    // Local storage with expiration and compression
    static setStorageWithExpiry(key, value, ttl = 24 * 60 * 60 * 1000) {
        const now = new Date();
        const item = {
            value: value,
            expiry: now.getTime() + ttl,
            version: '1.0' // for future compatibility
        };
        
        try {
            const serialized = JSON.stringify(item);
            localStorage.setItem(key, serialized);
            return true;
        } catch (error) {
            console.warn('Could not save to localStorage:', error);
            return false;
        }
    }

    static getStorageWithExpiry(key) {
        try {
            const itemStr = localStorage.getItem(key);
            if (!itemStr) return null;
            
            const item = JSON.parse(itemStr);
            const now = new Date();
            
            if (now.getTime() > item.expiry) {
                localStorage.removeItem(key);
                return null;
            }
            
            return item.value;
        } catch (error) {
            console.warn('Could not read from localStorage:', error);
            localStorage.removeItem(key); // Clean up corrupted data
            return null;
        }
    }

    // Theme utilities
    static setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('preferred-theme', theme);
        
        // Trigger theme change event
        window.dispatchEvent(new CustomEvent('themeChanged', { detail: { theme } }));
    }

    static getTheme() {
        return localStorage.getItem('preferred-theme') || 
               (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    }

    // Debounced search with cancel support
    static createDebouncedSearch(callback, delay = 300) {
        let timeoutId;
        
        const debouncedFn = function(searchTerm) {
            clearTimeout(timeoutId);
            
            timeoutId = setTimeout(() => {
                callback(searchTerm);
            }, delay);
        };
        
        debouncedFn.cancel = () => {
            clearTimeout(timeoutId);
        };
        
        return debouncedFn;
    }

    // Throttle function for scroll events
    static throttle(func, delay = 100) {
        let timeoutId;
        let lastExecTime = 0;
        
        return function(...args) {
            const currentTime = Date.now();
            
            if (currentTime - lastExecTime > delay) {
                func.apply(this, args);
                lastExecTime = currentTime;
            } else {
                clearTimeout(timeoutId);
                timeoutId = setTimeout(() => {
                    func.apply(this, args);
                    lastExecTime = Date.now();
                }, delay - (currentTime - lastExecTime));
            }
        };
    }

    // Copy to clipboard with fallback
    static async copyToClipboard(text) {
        try {
            if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
            } else {
                // Fallback for older browsers
                const textArea = document.createElement('textarea');
                textArea.value = text;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                document.execCommand('copy');
                document.body.removeChild(textArea);
            }
            ModernUtils.showToast('Copied to clipboard! 📋', 'success', 2000);
            return true;
        } catch (error) {
            console.warn('Copy to clipboard failed:', error);
            ModernUtils.showToast('Failed to copy to clipboard', 'error');
            return false;
        }
    }

    // Format number with locale support
    static formatNumber(number, options = {}) {
        try {
            return new Intl.NumberFormat(options.locale || 'en-US', {
                minimumFractionDigits: options.decimals || 0,
                maximumFractionDigits: options.decimals || 2,
                ...options
            }).format(number);
        } catch (error) {
            console.warn('Number formatting failed:', error);
            return number.toString();
        }
    }

    // Generate unique ID
    static generateId(prefix = 'id') {
        return `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    // Escape HTML to prevent XSS
    static escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    // Check if element is in viewport
    static isInViewport(element, threshold = 0) {
        if (!element) return false;
        
        const rect = element.getBoundingClientRect();
        const windowHeight = window.innerHeight || document.documentElement.clientHeight;
        const windowWidth = window.innerWidth || document.documentElement.clientWidth;
        
        return (
            rect.top >= -threshold &&
            rect.left >= -threshold &&
            rect.bottom <= windowHeight + threshold &&
            rect.right <= windowWidth + threshold
        );
    }

    // Device detection
    static getDeviceInfo() {
        const ua = navigator.userAgent;
        const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        const isTablet = /iPad|Android/i.test(ua) && !/Mobile/i.test(ua);
        const isDesktop = !isMobile && !isTablet;
        
        return {
            isMobile,
            isTablet,
            isDesktop,
            touchSupport: 'ontouchstart' in window,
            userAgent: ua
        };
    }

    // Performance measurement
    static measurePerformance(name, fn) {
        return async function(...args) {
            const start = performance.now();
            const result = await fn.apply(this, args);
            const end = performance.now();
            console.log(`${name} took ${end - start} milliseconds`);
            return result;
        };
    }
}

// Make ModernUtils available globally
window.Utils = ModernUtils;
window.ModernUtils = ModernUtils;

// Add CSS animation keyframes if not exists
if (!document.querySelector('#modern-animations-utils')) {
    const style = document.createElement('style');
    style.id = 'modern-animations-utils';
    style.textContent = `
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
        
        @keyframes fadeInUp {
            from {
                opacity: 0;
                transform: translateY(30px);
            }
            to {
                opacity: 1;
                transform: translateY(0);
            }
        }
        
        @keyframes slideInRight {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        
        @keyframes pulse {
            0%, 100% {
                opacity: 1;
                transform: scale(1);
            }
            50% {
                opacity: 0.8;
                transform: scale(1.05);
            }
        }
        
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-5px); }
            75% { transform: translateX(5px); }
        }
        
        @keyframes bounce {
            0%, 20%, 53%, 80%, 100% { transform: translateY(0); }
            40%, 43% { transform: translateY(-10px); }
            70% { transform: translateY(-5px); }
            90% { transform: translateY(-2px); }
        }
    `;
    
    document.head.appendChild(style);
}

// Initialize device-specific optimizations
document.addEventListener('DOMContentLoaded', () => {
    const deviceInfo = ModernUtils.getDeviceInfo();
    document.body.classList.add(
        deviceInfo.isMobile ? 'mobile-device' : 
        deviceInfo.isTablet ? 'tablet-device' : 'desktop-device'
    );
    
    if (deviceInfo.touchSupport) {
        document.body.classList.add('touch-device');
    }
});

// Handle offline/online states
window.addEventListener('online', () => {
    ModernUtils.showToast('Back online! 🌐', 'success', 3000);
});

window.addEventListener('offline', () => {
    ModernUtils.showToast('You are offline 📡', 'warning', 5000);
});

// Export for potential module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModernUtils;
}
