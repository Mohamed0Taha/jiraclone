import React from 'react';

/**
 * ReactComponentRenderer - Safely renders AI-generated React components
 * This component takes stringified React code and renders it as a live component
 */
export class ReactComponentRenderer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            Component: null,
            error: null,
            loading: true
        };
    }

    componentDidMount() {
        this.renderComponent();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.componentCode !== this.props.componentCode) {
            this.renderComponent();
        }
    }

    renderComponent = async () => {
        const { componentCode, project, auth, viewName } = this.props;
        
        if (!componentCode) {
            this.setState({ Component: null, loading: false });
            return;
        }

        try {
            this.setState({ loading: true, error: null });

            // Create a safe component from the code string
            const Component = await this.createComponentFromCode(componentCode, project?.id, viewName);
            
            this.setState({ 
                Component, 
                error: null, 
                loading: false 
            });
        } catch (error) {
            console.error('Error rendering AI-generated component:', error);
            this.setState({ 
                error: error.message, 
                Component: null, 
                loading: false 
            });
        }
    };

    createComponentFromCode = async (code, projectId, viewName) => {
        // Clean the code string
        let cleanCode = (code || '').trim();

        // Remove markdown code blocks if present
        cleanCode = cleanCode.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');

        // Remove import lines (we'll inject dependencies manually)
        cleanCode = cleanCode.replace(/(^|\n)\s*import[^;]+;?/g, '');

        // Determine component name and normalize exports
        let componentName = 'GeneratedComponent';
        const defaultFnExport = cleanCode.match(/export\s+default\s+function\s+(\w+)/);
        const normalFn = cleanCode.match(/function\s+(\w+)\s*\(/);
        const defaultVarExport = cleanCode.match(/export\s+default\s+(\w+)/);

        if (defaultFnExport) {
            componentName = defaultFnExport[1];
            cleanCode = cleanCode.replace(/export\s+default\s+function/, 'function');
        } else if (defaultVarExport) {
            componentName = defaultVarExport[1];
            cleanCode = cleanCode.replace(/export\s+default\s+(\w+);?/, '$1;');
        } else if (normalFn) {
            componentName = normalFn[1];
        }

        // Transform JSX -> JS using Babel standalone
        try {
            // Lazy-load Babel to avoid bloating the main bundle
            const BabelMod = await import('@babel/standalone');
            const babel = BabelMod?.default || BabelMod; // support different module shapes
            let transformed = babel.transform(cleanCode, {
                presets: [[
                    'react',
                    {
                        runtime: 'classic', // ensure React.createElement, no jsx-runtime import
                        development: false,
                    },
                ]],
                plugins: [],
                sourceType: 'script',
            }).code;

            // Make hook calls explicit to React.* to avoid undefined identifiers
            const hookCall = (name) => new RegExp(String.raw`\b${name}\s*\(`, 'g');
            transformed = transformed
                .replace(hookCall('useState'), 'React.useState(')
                .replace(hookCall('useEffect'), 'React.useEffect(')
                .replace(hookCall('useMemo'), 'React.useMemo(')
                .replace(hookCall('useRef'), 'React.useRef(')
                .replace(hookCall('useCallback'), 'React.useCallback(')
                .replace(hookCall('useReducer'), 'React.useReducer(')
                .replace(hookCall('useContext'), 'React.useContext(');

            // Provide a minimal csrfFetch in scope with smart interception for demo endpoints
            const localCsrfFetch = async (url, options = {}) => {
                const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');

                // Normalize URL to inspect pathname (handles absolute and relative)
                let u;
                try {
                    u = new URL(url, window.location.origin);
                } catch {
                    // If URL constructor fails, fall back to direct fetch
                    return fetch(url, {
                        ...options,
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': token,
                            ...options.headers,
                        },
                    });
                }

                // Simple, per-microapp, local CRUD store to avoid hitting non-existent /api/* endpoints
                const path = u.pathname;
                const method = (options.method || 'GET').toUpperCase();
                const isLocalApi = /^\/api\/(?!projects|auth|user|csrf)/.test(path); // Intercept all /api/* except core app routes

                if (isLocalApi) {
                    // Use namespaced storage to isolate each micro-app's dataset
                    const ns = `microapp-${projectId || 'unknown'}-${viewName || 'default'}-`;
                    
                    // Extract resource name from path (e.g., /api/milestones -> milestones, /api/data -> data)
                    const resourceMatch = path.match(/^\/api\/([^\/]+)/);
                    const resourceName = resourceMatch ? resourceMatch[1] : 'items';
                    const storeKey = ns + resourceName;

                    const readStore = () => {
                        try {
                            const raw = window.localStorage.getItem(storeKey);
                            if (raw) return JSON.parse(raw);
                            // Back-compat: migrate from any previous key the app may have used
                            const legacyKeys = [
                                ns + 'microapp-data',
                                ns + 'data-items', 
                                'microapp-data',
                                `microapp-${resourceName}`
                            ];
                            for (const legacyKey of legacyKeys) {
                                const legacyRaw = window.localStorage.getItem(legacyKey);
                                if (legacyRaw) {
                                    try {
                                        const legacy = JSON.parse(legacyRaw);
                                        // Normalize into array of items if legacy is array
                                        const items = Array.isArray(legacy) ? legacy : [];
                                        window.localStorage.setItem(storeKey, JSON.stringify(items));
                                        return items;
                                    } catch {}
                                }
                            }
                            return [];
                        } catch {
                            return [];
                        }
                    };

                    const writeStore = (items) => {
                        try {
                            window.localStorage.setItem(storeKey, JSON.stringify(items));
                        } catch {}
                    };

                    const jsonResponse = (body, init = {}) => {
                        return new Response(JSON.stringify(body), {
                            status: 200,
                            headers: { 'Content-Type': 'application/json' },
                            ...init,
                        });
                    };

                    const notFound = () => new Response(JSON.stringify({ message: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
                    const noContent = () => new Response(null, { status: 204 });

                    let items = readStore();

                    // GET /api/{resource}
                    if (method === 'GET' && resourceMatch && !path.match(/\/\d+$/)) {
                        return jsonResponse(items);
                    }

                    // POST /api/{resource}
                    if (method === 'POST' && resourceMatch && !path.match(/\/\d+$/)) {
                        let body = {};
                        try { body = options.body ? JSON.parse(options.body) : {}; } catch {}
                        const nextId = items.length ? Math.max(...items.map(i => i.id || 0)) + 1 : 1;
                        const created = { id: nextId, ...body };
                        items.push(created);
                        writeStore(items);
                        return jsonResponse(created, { status: 201 });
                    }

                    // GET/PUT/PATCH/DELETE /api/{resource}/:id
                    const itemMatch = path.match(/^\/api\/[^\/]+\/(\d+)$/);
                    if (itemMatch) {
                        const id = parseInt(itemMatch[1], 10);
                        const idx = items.findIndex(i => (i.id || 0) === id);

                        if (method === 'GET') {
                            if (idx === -1) return notFound();
                            return jsonResponse(items[idx]);
                        }

                        if (method === 'PUT' || method === 'PATCH') {
                            if (idx === -1) return notFound();
                            let body = {};
                            try { body = options.body ? JSON.parse(options.body) : {}; } catch {}
                            items[idx] = { ...items[idx], ...body, id };
                            writeStore(items);
                            return jsonResponse(items[idx]);
                        }

                        if (method === 'DELETE') {
                            if (idx === -1) return notFound();
                            items.splice(idx, 1);
                            writeStore(items);
                            return noContent();
                        }
                    }

                    // Fallback for unexpected method/path under /api/*
                    return new Response(JSON.stringify({ message: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
                }

                // Default: pass-through to network
                return fetch(u.toString(), {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': token,
                        ...options.headers,
                    },
                    credentials: options.credentials || 'same-origin',
                });
            };

            // Namespace localStorage so each micro-app stores under its own keys
            const ns = `microapp-${projectId || 'unknown'}-${viewName || 'default'}-`;
            const localStorageProxy = {
                getItem: (key) => {
                    const nsKey = ns + key;
                    let val = window.localStorage.getItem(nsKey);
                    // Back-compat: if no namespaced value exists, try migrating from global key once
                    if (val === null) {
                        const legacy = window.localStorage.getItem(key);
                        if (legacy !== null) {
                            try { window.localStorage.setItem(nsKey, legacy); } catch {}
                            val = legacy;
                        }
                    }
                    return val;
                },
                setItem: (key, value) => window.localStorage.setItem(ns + key, value),
                removeItem: (key) => window.localStorage.removeItem(ns + key),
                clear: () => {
                    const toRemove = [];
                    for (let i = 0; i < window.localStorage.length; i++) {
                        const k = window.localStorage.key(i);
                        if (k && k.startsWith(ns)) toRemove.push(k);
                    }
                    toRemove.forEach((k) => window.localStorage.removeItem(k));
                },
                key: (index) => {
                    // Only expose keys in this namespace
                    const keys = [];
                    for (let i = 0; i < window.localStorage.length; i++) {
                        const k = window.localStorage.key(i);
                        if (k && k.startsWith(ns)) keys.push(k.substring(ns.length));
                    }
                    return keys[index] || null;
                },
                get length() {
                    let count = 0;
                    for (let i = 0; i < window.localStorage.length; i++) {
                        const k = window.localStorage.key(i);
                        if (k && k.startsWith(ns)) count++;
                    }
                    return count;
                },
            };

            // Wrap transformed code and return the component reference
            const factory = new Function(
                'React',
                'csrfFetch',
                'localStorage',
                // Real project data injected into component scope
                'project',
                'tasks',
                'allTasks',
                'users',
                'methodology',
                `"use strict";\nconst { useState, useEffect, useMemo, useRef, useCallback, useReducer, useContext } = React;\n// Expose data as globals within the eval scope for AI components\nconst __project = project;\nconst __tasks = tasks;\nconst __allTasks = allTasks;\nconst __users = users;\nconst __methodology = methodology;\n// Build a flat list of tasks for convenience
const __flatTasks = Array.isArray(__allTasks)
  ? __allTasks
  : (Array.isArray(__tasks)
      ? __tasks
      : (__tasks && typeof __tasks === 'object'
          ? Object.values(__tasks).reduce((acc, arr) => acc.concat(arr || []), [])
          : []));
// Encourage components to use these names\nconst projectData = __project;\nconst tasksDataFromProps = __flatTasks;\nconst allTasksDataFromProps = __flatTasks;\nconst usersDataFromProps = __users;\nconst methodologyDataFromProps = __methodology;\n${transformed}\nreturn (${componentName});`
            );

            return factory(
                React,
                localCsrfFetch,
                localStorageProxy,
                // Inject the real props provided to the renderer
                this.props.project,
                this.props.tasks,
                this.props.allTasks,
                this.props.users,
                this.props.methodology,
            );
        } catch (error) {
            throw new Error(`Failed to create component: ${error.message}`);
        }
    };

    render() {
        const { Component, error, loading } = this.state;
        const { project, auth, onError } = this.props;

        if (loading) {
            return (
                <div className="flex items-center justify-center p-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-gray-600">Loading micro-application...</span>
                </div>
            );
        }

        if (error) {
            onError?.(error);
            return (
                <div className="bg-red-50 border border-red-200 rounded-lg p-6 m-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">
                                Error Loading Component
                            </h3>
                            <div className="mt-2 text-sm text-red-700">
                                <p>{error}</p>
                                <p className="mt-2">Please try regenerating the component or contact support.</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (!Component) {
            return (
                <div className="text-center p-8 text-gray-500">
                    <p>No micro-application available.</p>
                    <p className="text-sm mt-2">Use the chat assistant to create a custom application.</p>
                </div>
            );
        }

        // Render the AI-generated component with error boundary
        return (
            <ErrorBoundary onError={onError}>
                <div className="micro-app-wrapper">
                    {/* Provide real data props to the AI-generated component */}
                    <Component 
                        project={project} 
                        auth={auth} 
                        /** Real project context for data-aware components */
                        tasks={this.props.tasks}
                        allTasks={this.props.allTasks}
                        users={this.props.users}
                        methodology={this.props.methodology}
                    />
                </div>
            </ErrorBoundary>
        );
    }
}

/**
 * Error Boundary for AI-generated components
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        console.error('AI Component Error:', error, errorInfo);
        this.props.onError?.(error.message);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 m-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                                Component Runtime Error
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700">
                                <p>The micro-application encountered an error while running.</p>
                                <p className="mt-1">{this.state.error?.message}</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ReactComponentRenderer;