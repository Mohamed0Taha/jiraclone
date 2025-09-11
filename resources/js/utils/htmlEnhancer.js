export const enhanceGeneratedHTML = (htmlContent) => {
    // Create a temporary container to work with the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = htmlContent;
    
    // Check if HTML already contains advanced features (our new enhanced generation)
    const hasAdvancedFeatures = htmlContent.includes('AppStateManager') && 
                                htmlContent.includes('CRUDManager') &&
                                htmlContent.includes('UIEnhancer');
    
    if (hasAdvancedFeatures) {
        console.log('[HTML Enhancer] Detected advanced SPA features, skipping basic enhancements');
        return htmlContent; // Return as-is if already enhanced
    }
    
    console.log('[HTML Enhancer] Applying legacy enhancements to basic SPA');
    
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
    
    // Enhanced script with better state management and features
    const enhancementScript = `
        <script>
            // Enhanced SPA framework for legacy SPAs
            (function() {
                console.log('[SPA Enhancement] Initializing enhanced framework for legacy SPA');
                
                // Simple state manager for legacy SPAs
                class LegacyStateManager {
                    constructor() {
                        this.state = this.loadState();
                        this.listeners = new Set();
                    }
                    
                    loadState() {
                        try {
                            const saved = localStorage.getItem('legacy-spa-state');
                            return saved ? JSON.parse(saved) : {};
                        } catch (e) {
                            return {};
                        }
                    }
                    
                    saveState() {
                        try {
                            localStorage.setItem('legacy-spa-state', JSON.stringify(this.state));
                            this.notifyListeners();
                        } catch (e) {
                            console.warn('Failed to save state:', e);
                        }
                    }
                    
                    setState(updates) {
                        Object.assign(this.state, updates);
                        this.saveState();
                    }
                    
                    getState(key = null) {
                        return key ? this.state[key] : this.state;
                    }
                    
                    addListener(callback) {
                        this.listeners.add(callback);
                    }
                    
                    notifyListeners() {
                        this.listeners.forEach(callback => {
                            try {
                                callback(this.state);
                            } catch (e) {
                                console.warn('Listener error:', e);
                            }
                        });
                    }
                }
                
                // Initialize state manager
                window.legacyStateManager = new LegacyStateManager();
                
                // Enhanced form handling with state persistence
                const handleSpaFormSubmission = async (event) => {
                    event.preventDefault();
                    console.log('[SPA Form] Enhanced form submission intercepted');
                    const form = event.target;
                    const submitButton = form.querySelector('button[type="submit"], input[type="submit"]');
                    
                    if (submitButton) {
                        submitButton.disabled = true;
                        const originalText = submitButton.textContent || submitButton.value;
                        if (submitButton.textContent) {
                            submitButton.textContent = 'Processing...';
                        } else {
                            submitButton.value = 'Processing...';
                        }
                        
                        // Add loading animation
                        submitButton.style.position = 'relative';
                        const loader = document.createElement('div');
                        loader.style.cssText = \`
                            position: absolute;
                            top: 50%;
                            right: 10px;
                            transform: translateY(-50%);
                            width: 16px;
                            height: 16px;
                            border: 2px solid transparent;
                            border-top: 2px solid white;
                            border-radius: 50%;
                            animation: spin 1s linear infinite;
                        \`;
                        submitButton.appendChild(loader);
                        
                        setTimeout(() => {
                            submitButton.disabled = false;
                            if (submitButton.textContent && originalText) {
                                submitButton.textContent = originalText;
                            } else if (submitButton.value && originalText) {
                                submitButton.value = originalText;
                            }
                            if (loader.parentNode) {
                                loader.remove();
                            }
                            showEnhancedNotification('✅ Data saved successfully!', 'success');
                            console.log('[SPA Form] Enhanced form data saved');
                        }, 1200);
                    }
                    
                    try {
                        const formData = new FormData(form);
                        const data = Object.fromEntries(formData);
                        console.log('[SPA Form] Enhanced form data collected:', data);
                        
                        // Store in enhanced state manager
                        const formKey = form.dataset.formKey || \`form-\${Date.now()}\`;
                        const formState = window.legacyStateManager.getState('forms') || {};
                        formState[formKey] = {
                            ...data,
                            timestamp: new Date().toISOString(),
                            url: window.location.href,
                            formId: form.id || 'unnamed-form'
                        };
                        
                        window.legacyStateManager.setState({ forms: formState });
                        
                        // Also trigger any table updates if this is CRUD
                        if (form.classList.contains('crud-form') || form.dataset.crudTable) {
                            updateCrudTable(form.dataset.crudTable || 'main-table', data);
                        }
                        
                    } catch (error) {
                        console.error('[SPA Form] Enhanced form submission error:', error);
                        showEnhancedNotification('❌ Failed to save data. Please try again.', 'error');
                    }
                };
                
                // Enhanced CRUD operations for tables
                function updateCrudTable(tableId, data) {
                    const table = document.getElementById(tableId) || document.querySelector('table');
                    if (!table) return;
                    
                    const tbody = table.querySelector('tbody');
                    if (!tbody) return;
                    
                    // Create new row with the data
                    const row = document.createElement('tr');
                    row.innerHTML = Object.values(data).map(value => \`<td>\${value}</td>\`).join('') +
                        \`<td>
                            <button onclick="editTableRow(this)" class="btn-small">Edit</button>
                            <button onclick="deleteTableRow(this)" class="btn-small btn-danger">Delete</button>
                        </td>\`;
                    
                    // Add with animation
                    row.style.opacity = '0';
                    row.style.transform = 'translateY(-10px)';
                    tbody.appendChild(row);
                    
                    setTimeout(() => {
                        row.style.transition = 'all 0.3s ease';
                        row.style.opacity = '1';
                        row.style.transform = 'translateY(0)';
                    }, 100);
                    
                    console.log('[CRUD] Added new row to table:', tableId);
                }
                
                // Enhanced button interactions with better UX
                const enhanceSpaButtons = () => {
                    document.querySelectorAll('[data-spa-button]').forEach(button => {
                        if (!button.hasAttribute('data-enhanced')) {
                            button.setAttribute('data-enhanced', 'true');
                            
                            button.addEventListener('click', function(e) {
                                // Enhanced ripple effect
                                const rect = this.getBoundingClientRect();
                                const size = Math.max(rect.width, rect.height);
                                const x = e.clientX - rect.left - size / 2;
                                const y = e.clientY - rect.top - size / 2;
                                
                                const ripple = document.createElement('span');
                                ripple.style.cssText = \`
                                    position: absolute;
                                    border-radius: 50%;
                                    background: rgba(255,255,255,0.7);
                                    width: \${size}px;
                                    height: \${size}px;
                                    left: \${x}px;
                                    top: \${y}px;
                                    animation: ripple 0.6s ease-out;
                                    pointer-events: none;
                                \`;
                                
                                this.style.position = 'relative';
                                this.style.overflow = 'hidden';
                                this.appendChild(ripple);
                                
                                setTimeout(() => ripple.remove(), 600);
                                
                                // Enhanced delete operations with confirmation
                                if (this.classList.contains('delete-btn') || 
                                    this.classList.contains('btn-danger') || 
                                    this.textContent.toLowerCase().includes('delete')) {
                                    e.preventDefault();
                                    console.log('[SPA Button] Enhanced delete button clicked');
                                    
                                    const confirmDialog = createConfirmDialog(
                                        'Confirm Deletion',
                                        'Are you sure you want to delete this item? This action cannot be undone.',
                                        () => {
                                            const row = this.closest('tr, .card, .item, .entry');
                                            if (row) {
                                                console.log('[SPA Button] Deleting item with animation');
                                                row.style.transition = 'all 0.4s ease';
                                                row.style.opacity = '0';
                                                row.style.transform = 'translateX(-100%)';
                                                setTimeout(() => {
                                                    row.remove();
                                                    showEnhancedNotification('🗑️ Item deleted successfully!', 'success');
                                                }, 400);
                                            }
                                        }
                                    );
                                    
                                    document.body.appendChild(confirmDialog);
                                } else if (this.textContent.toLowerCase().includes('edit')) {
                                    // Enhanced edit functionality
                                    e.preventDefault();
                                    const row = this.closest('tr');
                                    if (row) {
                                        toggleRowEdit(row);
                                    }
                                }
                            });
                        }
                    });
                };
                
                // Enhanced table row editing
                function toggleRowEdit(row) {
                    const cells = row.querySelectorAll('td:not(:last-child)');
                    const isEditing = row.hasAttribute('data-editing');
                    
                    if (isEditing) {
                        // Save changes
                        cells.forEach(cell => {
                            const input = cell.querySelector('input');
                            if (input) {
                                cell.textContent = input.value;
                            }
                        });
                        row.removeAttribute('data-editing');
                        row.style.background = '';
                        showEnhancedNotification('💾 Changes saved!', 'success');
                    } else {
                        // Enter edit mode
                        cells.forEach(cell => {
                            const currentValue = cell.textContent.trim();
                            cell.innerHTML = \`<input type="text" value="\${currentValue}" style="width: 100%; border: 1px solid #ddd; padding: 4px; border-radius: 4px;">\`;
                        });
                        row.setAttribute('data-editing', 'true');
                        row.style.background = 'rgba(59, 130, 246, 0.1)';
                        
                        // Focus first input
                        const firstInput = cells[0]?.querySelector('input');
                        if (firstInput) firstInput.focus();
                    }
                }
                
                // Enhanced form handling with auto-save
                const enhanceSpeForms = () => {
                    console.log('[SPA Enhancement] Enhancing forms with advanced features');
                    document.querySelectorAll('[data-spa-form]').forEach(form => {
                        if (!form.hasAttribute('data-enhanced')) {
                            form.setAttribute('data-enhanced', 'true');
                            form.addEventListener('submit', handleSpaFormSubmission);
                            
                            // Enhanced form validation
                            const inputs = form.querySelectorAll('input, textarea, select');
                            inputs.forEach(input => {
                                if (!input.hasAttribute('data-enhanced')) {
                                    input.setAttribute('data-enhanced', 'true');
                                    
                                    // Real-time validation
                                    input.addEventListener('blur', (e) => {
                                        validateInput(e.target);
                                    });
                                    
                                    // Enhanced auto-save with debouncing
                                    let saveTimer;
                                    input.addEventListener('input', (e) => {
                                        clearTimeout(saveTimer);
                                        saveTimer = setTimeout(() => {
                                            console.log('[SPA Input] Auto-saving:', e.target.name, e.target.value);
                                            const formData = new FormData(form);
                                            const data = Object.fromEntries(formData);
                                            const formKey = form.dataset.formKey || \`autosave-\${form.id || 'form'}\`;
                                            const formState = window.legacyStateManager.getState('forms') || {};
                                            formState[formKey] = {
                                                ...data,
                                                timestamp: new Date().toISOString(),
                                                autoSaved: true
                                            };
                                            window.legacyStateManager.setState({ forms: formState });
                                            
                                            // Show subtle save indicator
                                            showSaveIndicator(form);
                                        }, 1000);
                                    });
                                    
                                    // Restore data on page load
                                    restoreFormData(form, input);
                                }
                            });
                            
                            console.log('[SPA Enhancement] Form enhanced with', inputs.length, 'inputs');
                        }
                    });
                };
                
                // Enhanced input validation
                function validateInput(input) {
                    const value = input.value.trim();
                    let isValid = true;
                    let message = '';
                    
                    // Remove existing validation styling
                    input.style.borderColor = '';
                    const existingError = input.parentNode.querySelector('.validation-error');
                    if (existingError) existingError.remove();
                    
                    // Required field validation
                    if (input.hasAttribute('required') && !value) {
                        isValid = false;
                        message = 'This field is required';
                    }
                    
                    // Email validation
                    if (input.type === 'email' && value && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(value)) {
                        isValid = false;
                        message = 'Please enter a valid email address';
                    }
                    
                    // Number validation
                    if (input.type === 'number' && value && isNaN(value)) {
                        isValid = false;
                        message = 'Please enter a valid number';
                    }
                    
                    if (!isValid) {
                        input.style.borderColor = '#ef4444';
                        const errorDiv = document.createElement('div');
                        errorDiv.className = 'validation-error';
                        errorDiv.style.cssText = 'color: #ef4444; font-size: 0.875rem; margin-top: 4px;';
                        errorDiv.textContent = message;
                        input.parentNode.appendChild(errorDiv);
                    }
                    
                    return isValid;
                }
                
                // Show save indicator
                function showSaveIndicator(form) {
                    let indicator = form.querySelector('.save-indicator');
                    if (!indicator) {
                        indicator = document.createElement('div');
                        indicator.className = 'save-indicator';
                        indicator.style.cssText = \`
                            position: absolute;
                            top: -10px;
                            right: 10px;
                            background: #10b981;
                            color: white;
                            padding: 4px 8px;
                            border-radius: 4px;
                            font-size: 0.75rem;
                            opacity: 0;
                            transition: opacity 0.3s;
                        \`;
                        indicator.textContent = '💾 Saved';
                        form.style.position = 'relative';
                        form.appendChild(indicator);
                    }
                    
                    indicator.style.opacity = '1';
                    setTimeout(() => {
                        indicator.style.opacity = '0';
                    }, 2000);
                }
                
                // Restore form data from state
                function restoreFormData(form, input) {
                    const formKey = form.dataset.formKey || \`autosave-\${form.id || 'form'}\`;
                    const formState = window.legacyStateManager.getState('forms') || {};
                    const savedData = formState[formKey];
                    
                    if (savedData && savedData[input.name] !== undefined) {
                        try {
                            if (input.type === 'checkbox') {
                                input.checked = savedData[input.name] === 'on' || savedData[input.name] === true;
                            } else if (input.type === 'radio') {
                                input.checked = input.value === savedData[input.name];
                            } else {
                                input.value = savedData[input.name];
                            }
                            console.log('[SPA Input] Restored value for:', input.name, savedData[input.name]);
                        } catch (e) {
                            console.warn('[SPA Input] Failed to restore data:', e);
                        }
                    }
                }
                
                // Enhanced table functionality with CRUD operations
                const enhanceSpaTables = () => {
                    document.querySelectorAll('[data-spa-table]').forEach(table => {
                        if (!table.hasAttribute('data-enhanced')) {
                            table.setAttribute('data-enhanced', 'true');
                            
                            // Add enhanced search if not present
                            if (!table.previousElementSibling || !table.previousElementSibling.classList.contains('spa-search')) {
                                addEnhancedTableControls(table);
                            }
                            
                            // Add sortable headers
                            const headers = table.querySelectorAll('thead th');
                            headers.forEach((header, index) => {
                                if (!header.classList.contains('no-sort')) {
                                    header.style.cursor = 'pointer';
                                    header.style.userSelect = 'none';
                                    header.style.position = 'relative';
                                    
                                    if (!header.querySelector('.sort-indicator')) {
                                        const indicator = document.createElement('span');
                                        indicator.className = 'sort-indicator';
                                        indicator.style.cssText = 'margin-left: 8px; opacity: 0.5;';
                                        indicator.textContent = '↕️';
                                        header.appendChild(indicator);
                                    }
                                    
                                    header.addEventListener('click', () => sortTable(table, index));
                                }
                            });
                        }
                    });
                };
                
                // Add enhanced table controls
                function addEnhancedTableControls(table) {
                    const controlsContainer = document.createElement('div');
                    controlsContainer.className = 'spa-table-controls';
                    controlsContainer.style.cssText = \`
                        margin-bottom: 15px;
                        display: flex;
                        gap: 10px;
                        align-items: center;
                        flex-wrap: wrap;
                    \`;
                    
                    // Enhanced search
                    const searchInput = document.createElement('input');
                    searchInput.type = 'text';
                    searchInput.placeholder = '🔍 Search table...';
                    searchInput.style.cssText = \`
                        padding: 8px 12px;
                        border: 2px solid #e5e7eb;
                        border-radius: 8px;
                        flex: 1;
                        min-width: 200px;
                        transition: border-color 0.3s;
                    \`;
                    
                    searchInput.addEventListener('focus', () => {
                        searchInput.style.borderColor = '#3b82f6';
                    });
                    
                    searchInput.addEventListener('blur', () => {
                        searchInput.style.borderColor = '#e5e7eb';
                    });
                    
                    // Export button
                    const exportBtn = document.createElement('button');
                    exportBtn.textContent = '📥 Export CSV';
                    exportBtn.style.cssText = \`
                        padding: 8px 16px;
                        background: #10b981;
                        color: white;
                        border: none;
                        border-radius: 8px;
                        cursor: pointer;
                        transition: background 0.3s;
                    \`;
                    exportBtn.addEventListener('click', () => exportTableToCSV(table));
                    
                    controlsContainer.appendChild(searchInput);
                    controlsContainer.appendChild(exportBtn);
                    table.parentNode.insertBefore(controlsContainer, table);
                    
                    // Enhanced search functionality with highlighting
                    let debounceTimer;
                    searchInput.addEventListener('input', (event) => {
                        clearTimeout(debounceTimer);
                        debounceTimer = setTimeout(() => {
                            const searchTerm = event.target.value.toLowerCase();
                            const rows = table.querySelectorAll('tbody tr');
                            let visibleRows = 0;
                            
                            rows.forEach(row => {
                                const text = row.textContent.toLowerCase();
                                const isVisible = text.includes(searchTerm);
                                row.style.display = isVisible ? '' : 'none';
                                
                                if (isVisible) {
                                    visibleRows++;
                                    // Highlight matching text
                                    if (searchTerm) {
                                        highlightSearchTerm(row, searchTerm);
                                    } else {
                                        removeHighlights(row);
                                    }
                                }
                            });
                            
                            // Update status
                            updateSearchStatus(controlsContainer, visibleRows, rows.length);
                        }, 300);
                    });
                }
                
                // Highlight search terms
                function highlightSearchTerm(row, term) {
                    const cells = row.querySelectorAll('td');
                    cells.forEach(cell => {
                        const text = cell.textContent;
                        const regex = new RegExp(\`(\${term})\`, 'gi');
                        const highlighted = text.replace(regex, '<mark style="background: #fef08a; padding: 1px 3px; border-radius: 2px;">$1</mark>');
                        if (highlighted !== text) {
                            cell.innerHTML = highlighted;
                        }
                    });
                }
                
                // Remove highlights
                function removeHighlights(row) {
                    const marks = row.querySelectorAll('mark');
                    marks.forEach(mark => {
                        mark.outerHTML = mark.textContent;
                    });
                }
                
                // Update search status
                function updateSearchStatus(container, visible, total) {
                    let statusDiv = container.querySelector('.search-status');
                    if (!statusDiv) {
                        statusDiv = document.createElement('div');
                        statusDiv.className = 'search-status';
                        statusDiv.style.cssText = 'font-size: 0.875rem; color: #6b7280; margin-left: auto;';
                        container.appendChild(statusDiv);
                    }
                    statusDiv.textContent = \`Showing \${visible} of \${total} rows\`;
                }
                
                // Sort table functionality
                function sortTable(table, columnIndex) {
                    const tbody = table.querySelector('tbody');
                    const rows = Array.from(tbody.querySelectorAll('tr'));
                    const header = table.querySelectorAll('thead th')[columnIndex];
                    const indicator = header.querySelector('.sort-indicator');
                    
                    // Determine sort direction
                    const currentSort = header.dataset.sort || 'none';
                    const newSort = currentSort === 'asc' ? 'desc' : 'asc';
                    
                    // Clear all sort indicators
                    table.querySelectorAll('thead th').forEach(th => {
                        th.dataset.sort = 'none';
                        const ind = th.querySelector('.sort-indicator');
                        if (ind) ind.textContent = '↕️';
                    });
                    
                    // Set new sort
                    header.dataset.sort = newSort;
                    indicator.textContent = newSort === 'asc' ? '↑' : '↓';
                    
                    // Sort rows
                    rows.sort((a, b) => {
                        const aText = a.cells[columnIndex].textContent.trim();
                        const bText = b.cells[columnIndex].textContent.trim();
                        
                        // Try to parse as numbers
                        const aNum = parseFloat(aText);
                        const bNum = parseFloat(bText);
                        
                        if (!isNaN(aNum) && !isNaN(bNum)) {
                            return newSort === 'asc' ? aNum - bNum : bNum - aNum;
                        } else {
                            return newSort === 'asc' 
                                ? aText.localeCompare(bText)
                                : bText.localeCompare(aText);
                        }
                    });
                    
                    // Reappend sorted rows
                    rows.forEach(row => tbody.appendChild(row));
                }
                
                // Export table to CSV
                function exportTableToCSV(table) {
                    const rows = table.querySelectorAll('tr');
                    const csvContent = Array.from(rows).map(row => {
                        const cells = Array.from(row.querySelectorAll('th, td'));
                        return cells.map(cell => {
                            const text = cell.textContent.trim();
                            return text.includes(',') ? \`"\${text}"\` : text;
                        }).join(',');
                    }).join('\\n');
                    
                    const blob = new Blob([csvContent], { type: 'text/csv' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = \`table-export-\${new Date().toISOString().split('T')[0]}.csv\`;
                    a.click();
                    URL.revokeObjectURL(url);
                    
                    showEnhancedNotification('📊 Table exported successfully!', 'success');
                }
                
                // Create confirmation dialog
                function createConfirmDialog(title, message, onConfirm) {
                    const dialog = document.createElement('div');
                    dialog.style.cssText = \`
                        position: fixed;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        background: rgba(0, 0, 0, 0.5);
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        z-index: 10000;
                        backdrop-filter: blur(4px);
                    \`;
                    
                    dialog.innerHTML = \`
                        <div style="background: white; border-radius: 12px; padding: 24px; max-width: 400px; width: 90%; box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);">
                            <h3 style="margin: 0 0 16px 0; color: #1f2937; font-size: 1.25rem; font-weight: 600;">\${title}</h3>
                            <p style="margin: 0 0 24px 0; color: #6b7280; line-height: 1.6;">\${message}</p>
                            <div style="display: flex; gap: 12px; justify-content: flex-end;">
                                <button onclick="this.closest('div').remove()" style="padding: 8px 16px; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 6px; cursor: pointer;">Cancel</button>
                                <button onclick="confirmAction()" style="padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">Delete</button>
                            </div>
                        </div>
                    \`;
                    
                    // Add confirm action
                    dialog.querySelector('button[onclick="confirmAction()"]').onclick = () => {
                        onConfirm();
                        dialog.remove();
                    };
                    
                    return dialog;
                }
                
                // Enhanced notification system
                window.showEnhancedNotification = function(message, type = 'info') {
                    const notification = document.createElement('div');
                    notification.style.cssText = \`
                        position: fixed;
                        top: 20px;
                        right: 20px;
                        padding: 16px 20px;
                        border-radius: 8px;
                        color: white;
                        font-weight: 500;
                        z-index: 10000;
                        min-width: 300px;
                        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
                        transform: translateX(100%);
                        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                        background: \${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
                        border-left: 4px solid \${type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : '#1d4ed8'};
                    \`;
                    
                    notification.innerHTML = \`
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <span style="font-size: 1.2em;">\${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'}</span>
                            <span>\${message}</span>
                        </div>
                    \`;
                    
                    document.body.appendChild(notification);
                    
                    setTimeout(() => notification.style.transform = 'translateX(0)', 100);
                    setTimeout(() => {
                        notification.style.transform = 'translateX(100%)';
                        setTimeout(() => document.body.removeChild(notification), 300);
                    }, 4000);
                };
                
                // Global table row functions
                window.editTableRow = function(button) {
                    const row = button.closest('tr');
                    if (row) toggleRowEdit(row);
                };
                
                window.deleteTableRow = function(button) {
                    const row = button.closest('tr');
                    if (row && confirm('Delete this item?')) {
                        row.style.transition = 'all 0.4s ease';
                        row.style.opacity = '0';
                        row.style.transform = 'translateX(-100%)';
                        setTimeout(() => row.remove(), 400);
                        showEnhancedNotification('🗑️ Item deleted!', 'success');
                    }
                };
                
                // Initialize all enhancements
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
                
                // Add enhanced CSS animations
                if (!document.querySelector('#spa-enhanced-animations')) {
                    const style = document.createElement('style');
                    style.id = 'spa-enhanced-animations';
                    style.textContent = \`
                        @keyframes ripple {
                            to {
                                transform: scale(4);
                                opacity: 0;
                            }
                        }
                        
                        @keyframes spin {
                            from { transform: rotate(0deg); }
                            to { transform: rotate(360deg); }
                        }
                        
                        @keyframes slideInFromRight {
                            from {
                                transform: translateX(100%);
                                opacity: 0;
                            }
                            to {
                                transform: translateX(0);
                                opacity: 1;
                            }
                        }
                        
                        @keyframes fadeInUp {
                            from {
                                transform: translateY(20px);
                                opacity: 0;
                            }
                            to {
                                transform: translateY(0);
                                opacity: 1;
                            }
                        }
                        
                        .spa-fade-in {
                            animation: fadeInUp 0.6s ease-out;
                        }
                        
                        .spa-enhanced button:hover {
                            transform: translateY(-1px);
                            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                        }
                        
                        .spa-enhanced input:focus,
                        .spa-enhanced textarea:focus,
                        .spa-enhanced select:focus {
                            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
                            border-color: #3b82f6;
                        }
                    \`;
                    document.head.appendChild(style);
                }
                
                // Mark body as enhanced
                document.body.classList.add('spa-enhanced');
                
                console.log('[SPA Enhancement] Legacy SPA enhanced with advanced features');
                showEnhancedNotification('🚀 Enhanced SPA features loaded successfully!', 'success');
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