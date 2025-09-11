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
    
    // Mark forms for enhancement (event listeners will be attached after DOM insertion)
    const forms = tempDiv.querySelectorAll('form');
    forms.forEach(form => {
        form.setAttribute('data-spa-form', 'true');
        form.setAttribute('onsubmit', 'return false;'); // Prevent default submission
    });
    
    // Mark buttons for enhancement
    const buttons = tempDiv.querySelectorAll('button:not([data-enhanced])');
    buttons.forEach(button => {
        button.setAttribute('data-spa-button', 'true');
    });
    
    // Mark tables for enhancement
    const tables = tempDiv.querySelectorAll('table:not([data-enhanced])');
    tables.forEach(table => {
        table.setAttribute('data-spa-table', 'true');
    });
    
    // Add inline script to handle form submissions and interactions
    const enhancementScript = `
        <script>
            // Enhanced form handling for SPA
            (function() {
                const handleSpaFormSubmission = async (event) => {
                    event.preventDefault();
                    const form = event.target;
                    const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
                    
                    if (submitButton) {
                        submitButton.disabled = true;
                        const originalText = submitButton.textContent;
                        submitButton.textContent = 'Saving...';
                        
                        setTimeout(() => {
                            submitButton.disabled = false;
                            submitButton.textContent = originalText;
                            showNotification('Data saved locally!', 'success');
                        }, 1000);
                    }
                    
                    try {
                        const formData = new FormData(form);
                        const data = Object.fromEntries(formData);
                        
                        // Store in local storage
                        const storageKey = form.dataset.storageKey || 'spa-form-' + Date.now();
                        localStorage.setItem(storageKey, JSON.stringify(data));
                        
                    } catch (error) {
                        console.error('Form submission error:', error);
                        showNotification('Failed to save data. Please try again.', 'error');
                    }
                };
                
                // Enhanced button interactions
                const enhanceSpaButtons = () => {
                    document.querySelectorAll('[data-spa-button]').forEach(button => {
                        if (!button.hasAttribute('data-enhanced')) {
                            button.setAttribute('data-enhanced', 'true');
                            
                            button.addEventListener('click', function(e) {
                                // Add ripple effect
                                const ripple = document.createElement('span');
                                ripple.style.cssText = 'position: absolute; border-radius: 50%; background: rgba(255,255,255,0.6); animation: ripple 0.6s linear; pointer-events: none; width: 20px; height: 20px; top: 50%; left: 50%; transform: translate(-50%, -50%);';
                                
                                this.style.position = 'relative';
                                this.style.overflow = 'hidden';
                                this.appendChild(ripple);
                                
                                setTimeout(() => ripple.remove(), 600);
                                
                                // Handle delete operations
                                if (this.classList.contains('delete-btn') || this.textContent.toLowerCase().includes('delete')) {
                                    e.preventDefault();
                                    if (confirm('Are you sure you want to delete this item?')) {
                                        const row = this.closest('tr, .card, .item, .entry');
                                        if (row) {
                                            row.style.transition = 'opacity 0.3s';
                                            row.style.opacity = '0';
                                            setTimeout(() => row.remove(), 300);
                                            showNotification('Item deleted!', 'success');
                                        }
                                    }
                                }
                            });
                        }
                    });
                };
                
                // Enhanced form handling
                const enhanceSpeForms = () => {
                    document.querySelectorAll('[data-spa-form]').forEach(form => {
                        if (!form.hasAttribute('data-enhanced')) {
                            form.setAttribute('data-enhanced', 'true');
                            form.addEventListener('submit', handleSpaFormSubmission);
                        }
                    });
                };
                
                // Enhanced table functionality
                const enhanceSpaTables = () => {
                    document.querySelectorAll('[data-spa-table]').forEach(table => {
                        if (!table.hasAttribute('data-enhanced')) {
                            table.setAttribute('data-enhanced', 'true');
                            
                            // Add search if not present
                            if (!table.previousElementSibling || !table.previousElementSibling.classList.contains('spa-search')) {
                                const searchContainer = document.createElement('div');
                                searchContainer.className = 'spa-search';
                                searchContainer.style.cssText = 'margin-bottom: 10px;';
                                
                                const searchInput = document.createElement('input');
                                searchInput.type = 'text';
                                searchInput.placeholder = 'Search table...';
                                searchInput.style.cssText = 'padding: 8px; border: 1px solid #ddd; border-radius: 4px; width: 100%; max-width: 300px;';
                                
                                searchContainer.appendChild(searchInput);
                                table.parentNode.insertBefore(searchContainer, table);
                                
                                // Add search functionality
                                let debounceTimer;
                                searchInput.addEventListener('input', (event) => {
                                    clearTimeout(debounceTimer);
                                    debounceTimer = setTimeout(() => {
                                        const searchTerm = event.target.value.toLowerCase();
                                        const rows = table.querySelectorAll('tbody tr');
                                        
                                        rows.forEach(row => {
                                            const text = row.textContent.toLowerCase();
                                            row.style.display = text.includes(searchTerm) ? '' : 'none';
                                        });
                                    }, 300);
                                });
                            }
                        }
                    });
                };
                
                // Show notification function
                window.showNotification = function(message, type = 'info') {
                    const notification = document.createElement('div');
                    notification.style.cssText = \`
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        padding: 12px 20px;
                        border-radius: 4px;
                        color: white;
                        font-weight: 500;
                        z-index: 10000;
                        transition: all 0.3s ease;
                        background: \${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
                    \`;
                    notification.textContent = message;
                    
                    document.body.appendChild(notification);
                    
                    setTimeout(() => {
                        notification.style.opacity = '0';
                        notification.style.transform = 'translateY(-20px)';
                        setTimeout(() => document.body.removeChild(notification), 300);
                    }, 3000);
                };
                
                // Initialize enhancements
                const initializeEnhancements = () => {
                    enhanceSpeForms();
                    enhanceSpaButtons();
                    enhanceSpaTables();
                };
                
                // Run immediately and set up observer for dynamic content
                initializeEnhancements();
                
                // Set up mutation observer to handle dynamically added content
                const observer = new MutationObserver((mutations) => {
                    mutations.forEach((mutation) => {
                        if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
                            initializeEnhancements();
                        }
                    });
                });
                
                observer.observe(document.body, {
                    childList: true,
                    subtree: true
                });
                
                // Add CSS for ripple animation
                if (!document.querySelector('#spa-animations')) {
                    const style = document.createElement('style');
                    style.id = 'spa-animations';
                    style.textContent = \`
                        @keyframes ripple {
                            to {
                                transform: scale(4);
                                opacity: 0;
                            }
                        }
                    \`;
                    document.head.appendChild(style);
                }
            })();
        </script>
    `;
    
    return tempDiv.innerHTML + enhancementScript;
};

// Legacy utility functions - kept for backward compatibility
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