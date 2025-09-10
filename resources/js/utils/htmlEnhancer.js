export const enhanceGeneratedHTML = (htmlContent) => {
    // Create a temporary container to work with the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Add meta viewport if not present
    if (!tempDiv.querySelector('meta[name="viewport"]')) {
        const viewport = document.createElement('meta');
        viewport.name = 'viewport';
        viewport.content = 'width=device-width, initial-scale=1.0';
        tempDiv.querySelector('head')?.appendChild(viewport);
    }
    
    // Add CSRF token meta if not present
    if (!tempDiv.querySelector('meta[name="csrf-token"]')) {
        const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
        if (csrfToken) {
            const csrf = document.createElement('meta');
            csrf.name = 'csrf-token';
            csrf.content = csrfToken;
            tempDiv.querySelector('head')?.appendChild(csrf);
        }
    }
    
    // Enhance forms with proper submission handling
    const forms = tempDiv.querySelectorAll('form');
    forms.forEach(form => {
        if (!form.hasAttribute('data-enhanced')) {
            form.setAttribute('data-enhanced', 'true');
            form.addEventListener('submit', handleFormSubmission);
        }
    });
    
    // Add keyboard shortcuts
    addKeyboardShortcuts(tempDiv);
    
    // Add loading states to buttons
    enhanceButtons(tempDiv);
    
    // Add search functionality to tables
    enhanceTables(tempDiv);
    
    // Add local storage persistence
    addLocalStoragePersistence(tempDiv);
    
    return tempDiv.innerHTML;
};

const handleFormSubmission = async (event) => {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
    
    if (submitButton) {
        submitButton.disabled = true;
        submitButton.textContent = submitButton.textContent.replace(/^/, 'Saving... ');
    }
    
    try {
        const formData = new FormData(form);
        const data = Object.fromEntries(formData);
        
        // Store in local storage as well
        const storageKey = form.dataset.storageKey || 'custom-view-form-data';
        localStorage.setItem(storageKey, JSON.stringify(data));
        
        // Show success message
        showNotification('Data saved successfully!', 'success');
        
    } catch (error) {
        console.error('Form submission error:', error);
        showNotification('Failed to save data. Please try again.', 'error');
    } finally {
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = submitButton.textContent.replace('Saving... ', '');
        }
    }
};

const addKeyboardShortcuts = (container) => {
    document.addEventListener('keydown', (event) => {
        // Ctrl+S to save forms
        if (event.ctrlKey && event.key === 's') {
            event.preventDefault();
            const form = container.querySelector('form');
            if (form) {
                form.dispatchEvent(new Event('submit'));
            }
        }
        
        // Esc to close modals
        if (event.key === 'Escape') {
            const modals = container.querySelectorAll('.modal, .dialog');
            modals.forEach(modal => {
                if (modal.style.display !== 'none') {
                    modal.style.display = 'none';
                }
            });
        }
    });
};

const enhanceButtons = (container) => {
    const buttons = container.querySelectorAll('button:not([data-enhanced])');
    buttons.forEach(button => {
        button.setAttribute('data-enhanced', 'true');
        
        button.addEventListener('click', function() {
            // Add ripple effect
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            ripple.style.cssText = `
                position: absolute;
                border-radius: 50%;
                background: rgba(255,255,255,0.6);
                animation: ripple 0.6s linear;
                pointer-events: none;
            `;
            
            this.style.position = 'relative';
            this.style.overflow = 'hidden';
            this.appendChild(ripple);
            
            setTimeout(() => ripple.remove(), 600);
        });
    });
};

const enhanceTables = (container) => {
    const tables = container.querySelectorAll('table:not([data-enhanced])');
    tables.forEach(table => {
        table.setAttribute('data-enhanced', 'true');
        
        // Add search functionality
        const searchInput = document.createElement('input');
        searchInput.type = 'text';
        searchInput.placeholder = 'Search table...';
        searchInput.style.cssText = `
            margin-bottom: 10px;
            padding: 8px;
            border: 1px solid #ddd;
            border-radius: 4px;
            width: 100%;
            max-width: 300px;
        `;
        
        table.parentNode.insertBefore(searchInput, table);
        
        searchInput.addEventListener('input', debounce((event) => {
            const searchTerm = event.target.value.toLowerCase();
            const rows = table.querySelectorAll('tbody tr');
            
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                row.style.display = text.includes(searchTerm) ? '' : 'none';
            });
        }, 300));
    });
};

const addLocalStoragePersistence = (container) => {
    const inputs = container.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
        const storageKey = `custom-view-${input.name || input.id}`;
        
        // Load saved value
        const savedValue = localStorage.getItem(storageKey);
        if (savedValue && !input.value) {
            input.value = savedValue;
        }
        
        // Save on change
        input.addEventListener('change', () => {
            localStorage.setItem(storageKey, input.value);
        });
    });
};

const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

const showNotification = (message, type = 'info') => {
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 12px 20px;
        background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        color: white;
        border-radius: 4px;
        z-index: 10000;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes ripple {
        to {
            transform: scale(4);
            opacity: 0;
        }
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(100%);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);