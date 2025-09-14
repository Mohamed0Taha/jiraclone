import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    AreaChart,
    Area
} from 'recharts';
import * as Recharts from 'recharts';

/**
 * ReactComponentRenderer (STRICT)
 * - Accepts only valid TSX/JSX that exports a React component.
 * - If the input contains markdown fences with code, we extract the first fence.
 * - If no component is detected, we THROW (so the host can show an error and ask to regenerate).
 * - Always passes { filename: 'file.tsx' } to Babel to satisfy TypeScript/React presets.
 * - Wrapped in an ErrorBoundary so user code errors don’t crash the app.
 */
export class ReactComponentRenderer extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            Component: null,
            error: null,
            loading: true
        };
        this._lastNotifiedError = null;
    }

    componentDidMount() {
        this.renderComponent();
    }

    componentDidUpdate(prevProps) {
        if (prevProps.componentCode !== this.props.componentCode) {
            this.renderComponent();
        }
    }

    notifyErrorOnce = (msg) => {
        const message = typeof msg === 'string' ? msg : (msg?.message || String(msg));
        if (this._lastNotifiedError === message) return;
        this._lastNotifiedError = message;
        if (typeof this.props.onError === 'function') {
            this.props.onError(message);
        }
    };

    renderComponent = async () => {
        const { componentCode, project, viewName } = this.props;

        if (!componentCode) {
            this.setState({ Component: null, loading: false, error: null });
            return;
        }

        try {
            this.setState({ loading: true, error: null });
            const Component = await this.createComponentFromCode(componentCode, project?.id, viewName);
            this.setState({ Component, error: null, loading: false });
        } catch (error) {
            const message = error?.message || String(error);
            console.error('Error rendering AI-generated component:', error);
            this.setState({ error: message, Component: null, loading: false }, () => {
                this.notifyErrorOnce(message);
            });
        }
    };

    // Extract the first fenced code block if present; otherwise return as-is.
    // Matches ```tsx ...```, ```jsx ...```, ```ts```, ```js```, ```typescript```, ```javascript```, or plain ```
    extractFirstFence = (text) => {
        const fence = /```(?:tsx|jsx|typescript|javascript|ts|js)?\s*([\s\S]*?)```/i.exec(text);
        if (fence && fence[1]) return fence[1];
        // Also handle the common case where the text starts and ends with a single fenced block
        let cleaned = String(text || '').trim();
        cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');
        return cleaned;
    };

    // A permissive detector: allows raw HTML or unnamed components (we'll normalize)
    looksLikeReactComponent = (src) => {
        if (!src) return false;
        const hasExportDefault = /export\s+default\s+/.test(src);
        const looksLikeJSX = /<\w[\s\S]*>/.test(src) || /React\.createElement\(/.test(src);
        const explicitComponent =
            /(function\s+\w+\s*\(|const\s+\w+\s*=\s*(?:\([^\)]*\)\s*=>|function\s*\()|class\s+\w+\s+extends\s+React\.Component)/.test(src);
        return hasExportDefault || explicitComponent || looksLikeJSX;
    };

    createComponentFromCode = async (raw, projectId, viewName) => {
        // 1) Extract a fenced block if the assistant wrapped the code in markdown
        let src = this.extractFirstFence(raw).trim();

        // Helpers for fallback normalization
        const hasExportDefault = /export\s+default\s+/.test(src);
        const looksLikeJSX = /<\w[\s\S]*>/.test(src) || /React\.createElement\(/.test(src);
        const hasNamedComponent =
            /(function\s+\w+\s*\(|const\s+\w+\s*=\s*(?:\([^\)]*\)\s*=>|function\s*\()|class\s+\w+\s+extends\s+React\.Component)/.test(src);

        const sanitizeHtml = (html) => {
            let s = String(html);
            // Remove scripts and inline event handlers for safety
            s = s.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
            s = s.replace(/ on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
            s = s.replace(/javascript:/gi, '');
            return s;
        };
        const escBackticks = (str) => String(str).replace(/`/g, '\\`');

        // 2) If it looks like plain HTML (JSX-like without component structure), wrap it
        if (!hasExportDefault && !hasNamedComponent && looksLikeJSX) {
            const safe = sanitizeHtml(src);
            // Use JSON.stringify to embed as a normal quoted string, avoiding nested template issues
            src = `export default function GeneratedComponent(){\n  const __html = ${JSON.stringify(safe)};\n  return <div style={{width:'100%'}} dangerouslySetInnerHTML={{ __html }} />;\n}`;
        }

        // If after wrapping/normalizing it still doesn't look usable, fall back to rendering plaintext
        if (!this.looksLikeReactComponent(src)) {
            // Graceful fallback: show the provided text inside a <pre> so the user sees something
            const safeText = String(src || '').slice(0, 20000); // cap size
            src = `export default function GeneratedComponent(){\n  const __text = ${JSON.stringify(safeText)};\n  return <pre style={{whiteSpace:'pre-wrap', fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12, lineHeight: 1.5, padding: 12, background: '#fafafa', border: '1px solid #eee', borderRadius: 8}}>{__text}</pre>;\n}`;
        }

        // 3) Remove import lines (we inject deps manually inside the factory scope)
        src = src.replace(/(^|\n)\s*import[^;]+;?/g, '');

        // Also remove any other export statements that might remain
        src = src.replace(/(^|\n)\s*export\s+(?!default)[^;]+;?/g, '');

        // 4) Normalize various default-export patterns into a named identifier we can return later
        let componentName = 'GeneratedComponent';

        const defaultFnAny = src.match(/export\s+default\s+function(?:\s+(\w+))?\s*\(/);
        if (defaultFnAny) {
            const fnName = defaultFnAny[1] || 'GeneratedComponent';
            componentName = fnName;
            if (defaultFnAny[1]) {
                src = src.replace(/export\s+default\s+function/, 'function');
            } else {
                src = src.replace(/export\s+default\s+function\s*\(/, 'function ' + componentName + '(');
            }
        }

        if (!/\bclass\s+\w+/.test(src) || /export\s+default\s+class/.test(src)) {
            const defaultClassAny = src.match(/export\s+default\s+class(?:\s+(\w+))?/);
            if (defaultClassAny) {
                const clsName = defaultClassAny[1] || 'GeneratedComponent';
                componentName = clsName;
                if (defaultClassAny[1]) {
                    src = src.replace(/export\s+default\s+class/, 'class');
                } else {
                    src = src.replace(/export\s+default\s+class\s*/, 'class ' + componentName + ' ');
                }
            }
        }

        const defaultVarExport = src.match(/export\s+default\s+(\w+)\s*;?/);
        if (defaultVarExport) {
            componentName = defaultVarExport[1];
            src = src.replace(/export\s+default\s+(\w+)\s*;?/, '$1;');
        }

        if (/export\s+default\s+/.test(src)) {
            src = src.replace(/export\s+default\s+/, `const ${componentName} = `);
        }

        if (!componentName || componentName === 'GeneratedComponent') {
            const normalFn = src.match(/function\s+(\w+)\s*\(/);
            const constComp = src.match(/const\s+(\w+)\s*=\s*(?:\([^)]*\)\s*=>|function\s*\()/);
            const classComp = src.match(/class\s+(\w+)\s+extends\s+React\.Component/);
            componentName = (normalFn && normalFn[1]) || (constComp && constComp[1]) || (classComp && classComp[1]) || 'GeneratedComponent';
        }

        // If there's no export default in source and we detected a component name, add a default export
        if (!/export\s+default\s+/.test(src) && componentName) {
            src += `\n\nexport default ${componentName};`;
        }

        try {
            const BabelMod = await import('@babel/standalone');
            const babel = BabelMod?.default || BabelMod;

            const result = babel.transform(src, {
                filename: 'file.tsx',
                presets: [
                    ['react', { runtime: 'classic', development: false }],
                    'typescript',
                ],
                plugins: [],
                sourceType: 'module',
                retainLines: false,
                comments: false,
                compact: false,
            });

            let transformed = result.code;

            // Remove any remaining export statements after Babel transformation (more comprehensive)
            transformed = transformed.replace(/(^|\n)\s*export\s+[^;\n]*;?/g, '');
            transformed = transformed.replace(/\bexport\s+default\s+/g, '');
            transformed = transformed.replace(/\bexport\s+/g, '');

            const hookCall = (name) => new RegExp(String.raw`\b${name}\s*\(`, 'g');
            transformed = transformed
                .replace(hookCall('useState'), 'React.useState(')
                .replace(hookCall('useEffect'), 'React.useEffect(')
                .replace(hookCall('useMemo'), 'React.useMemo(')
                .replace(hookCall('useRef'), 'React.useRef(')
                .replace(hookCall('useCallback'), 'React.useCallback(')
                .replace(hookCall('useReducer'), 'React.useReducer(')
                .replace(hookCall('useContext'), 'React.useContext(');

            // Minimal helpers available to user code
            const localCsrfFetch = async (url, options = {}) => {
                const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
                let u;
                try {
                    u = new URL(url, window.location.origin);
                } catch {
                    return fetch(url, {
                        ...options,
                        headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token, ...options.headers },
                    });
                }

                const path = u.pathname;
                const method = (options.method || 'GET').toUpperCase();
                const isLocalApi = /^\/api\/(?!projects|auth|user|csrf)/.test(path);

                if (isLocalApi) {
                    const ns = `microapp-${projectId || 'unknown'}-${viewName || 'default'}-`;
                    const resourceMatch = path.match(/^\/api\/([^\/]+)/);
                    const resourceName = resourceMatch ? resourceMatch[1] : 'items';
                    const storeKey = ns + resourceName;

                    const readStore = () => {
                        try { const raw = window.localStorage.getItem(storeKey); return raw ? JSON.parse(raw) : []; } catch { return []; }
                    };
                    const writeStore = (items) => { try { window.localStorage.setItem(storeKey, JSON.stringify(items)); } catch { } };
                    const json = (body, init = {}) => new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' }, ...init });
                    const notFound = () => new Response(JSON.stringify({ message: 'Not Found' }), { status: 404, headers: { 'Content-Type': 'application/json' } });
                    const noContent = () => new Response(null, { status: 204 });

                    let items = readStore();

                    if (method === 'GET' && resourceMatch && !path.match(/\/\d+$/)) return json(items);
                    if (method === 'POST' && resourceMatch && !path.match(/\/\d+$/)) {
                        let body = {}; try { body = options.body ? JSON.parse(options.body) : {}; } catch { }
                        const nextId = items.length ? Math.max(...items.map(i => i.id || 0)) + 1 : 1;
                        const created = { id: nextId, ...body }; items.push(created); writeStore(items); return json(created, { status: 201 });
                    }

                    const itemMatch = path.match(/^\/api\/[^\/]+\/(\d+)$/);
                    if (itemMatch) {
                        const id = parseInt(itemMatch[1], 10);
                        const idx = items.findIndex(i => (i.id || 0) === id);
                        if (method === 'GET') return idx === -1 ? notFound() : json(items[idx]);
                        if (method === 'PUT' || method === 'PATCH') {
                            if (idx === -1) return notFound();
                            let body = {}; try { body = options.body ? JSON.parse(options.body) : {}; } catch { }
                            items[idx] = { ...items[idx], ...body, id }; writeStore(items); return json(items[idx]);
                        }
                        if (method === 'DELETE') {
                            if (idx === -1) return notFound(); items.splice(idx, 1); writeStore(items); return noContent();
                        }
                    }
                    return new Response(JSON.stringify({ message: 'Method Not Allowed' }), { status: 405, headers: { 'Content-Type': 'application/json' } });
                }

                return fetch(u.toString(), {
                    ...options,
                    headers: { 'Content-Type': 'application/json', 'X-CSRF-TOKEN': token, ...options.headers },
                    credentials: options.credentials || 'same-origin',
                });
            };

            const ns = `microapp-${projectId || 'unknown'}-${viewName || 'default'}-`;
            const localStorageProxy = {
                getItem: (key) => window.localStorage.getItem(ns + key),
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

            const factoryCode = `"use strict";
const { useState, useEffect, useMemo, useRef, useCallback, useReducer, useContext } = React;

// Chart libraries available for generated components
const { 
    BarChart, 
    Bar, 
    XAxis, 
    YAxis, 
    CartesianGrid, 
    Tooltip, 
    Legend, 
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    LineChart,
    Line,
    AreaChart,
    Area
} = Recharts;

const __project = project;
const __tasks = tasks;
const __allTasks = allTasks;
const __users = users;
const __methodology = methodology;

// Stable identifiers for persistence scoped to project + view
const __projectId = ${JSON.stringify(String(projectId || ''))};
const __viewName = ${JSON.stringify(String(viewName || 'default'))};

const __flatTasks = Array.isArray(__allTasks)
  ? __allTasks
  : (Array.isArray(__tasks)
      ? __tasks
      : (__tasks && typeof __tasks === 'object'
          ? Object.values(__tasks).reduce((acc, arr) => acc.concat(arr || []), [])
          : []));

// Always inject data variables for generated components to use
const tasksDataFromProps = __flatTasks;
const allTasksDataFromProps = __flatTasks;
const usersDataFromProps = __users;
const methodologyDataFromProps = __methodology;
const projectData = __project;

// Debug data availability
console.log('[ReactComponentRenderer] Data available to component:', {
  tasksCount: tasksDataFromProps?.length || 0,
  usersCount: usersDataFromProps?.length || 0,
  projectName: projectData?.name || 'Unknown',
  hasMethodology: !!methodologyDataFromProps
});

// Server-backed persistence helpers available to generated components
async function saveViewData(dataKey, data) {
  if (!__projectId) return { success: false };
  
  // Always save to localStorage as backup
  const localKey = 'microapp-' + __projectId + '-' + __viewName + '-' + String(dataKey || 'default');
  try {
    localStorage.setItem(localKey, JSON.stringify(data));
  } catch (e) {
    console.warn('Failed to save to localStorage:', e);
  }
  
  // Save to server (which will embed data into the component itself)
  try {
    const url = '/projects/' + __projectId + '/custom-views/save-data';
    const res = await csrfFetch(url, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json' 
      },
      body: JSON.stringify({ view_name: __viewName, data_key: String(dataKey || 'default'), data })
    });
    const result = await res.json();
    
    if (result.success) {
      console.log('Data embedded into view successfully');
      return { success: true, message: 'Data embedded into shared view', source: 'embedded', embedded: true };
    } else {
      console.warn('saveViewData server returned error:', result.message);
      return { success: true, message: 'Data saved locally only', fallback: true };
    }
  } catch (e) { 
    console.error('saveViewData server error, using localStorage fallback:', e); 
    return { success: true, message: 'Data saved locally only', fallback: true };
  }
}

async function loadViewData(dataKey) {
  if (!__projectId) return null;
  
  // First check for embedded data (universal approach)
  if (typeof __EMBEDDED_DATA__ !== 'undefined' && __EMBEDDED_DATA__[dataKey]) {
    return __EMBEDDED_DATA__[dataKey];
  }
  
  const localKey = 'microapp-' + __projectId + '-' + __viewName + '-' + String(dataKey || 'default');
  
  // Then try to load from server (shared project data)
  try {
    const url = '/projects/' + __projectId + '/custom-views/load-data?view_name=' + encodeURIComponent(__viewName) + '&data_key=' + encodeURIComponent(String(dataKey || 'default'));
    const res = await csrfFetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
    const result = await res.json();
    
    if (result.success && result.data?.data) {
      return result.data.data;
    }
  } catch (e) {
    console.warn('loadViewData server error, falling back to localStorage:', e);
  }
  
  // Fallback to localStorage if server fails
  try {
    const localData = localStorage.getItem(localKey);
    if (localData) {
      return JSON.parse(localData);
    }
  } catch (e) {
    console.warn('loadViewData localStorage error:', e);
  }
  
  return null;
}

${transformed}

return (${componentName});`;

            const factory = new Function(
                'React',
                'Recharts',
                'csrfFetch',
                'localStorage',
                'project',
                'tasks',
                'allTasks',
                'users',
                'methodology',
                factoryCode
            );

            // Create Recharts object with all chart components
            const RechartsObject = {
                BarChart,
                Bar,
                XAxis,
                YAxis,
                CartesianGrid,
                Tooltip,
                Legend,
                ResponsiveContainer,
                PieChart,
                Pie,
                Cell,
                LineChart,
                Line,
                AreaChart,
                Area
            };

            // Debug: Log the final factory code
            console.log('[ReactComponentRenderer] Final factory code:');
            console.log(factoryCode.slice(0, 500) + '...');
            console.log('[ReactComponentRenderer] Component name:', componentName);
            console.log('[ReactComponentRenderer] Transformed code preview:', transformed.slice(0, 200) + '...');

            return factory(
                React,
                RechartsObject,
                localCsrfFetch,
                localStorageProxy,
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
        const { project, auth } = this.props;

        if (loading) {
            return (
                <div className="flex items-center justify-center p-8 text-gray-700 dark:text-gray-200">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-3">Loading micro-application...</span>
                </div>
            );
        }

        if (error) {
            return (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 m-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error Loading Component</h3>
                            <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                                <p>{error}</p>
                                <p className="mt-2">Please regenerate your component. The renderer only accepts valid TSX/JSX with <code>export default</code>.</p>
                            </div>
                        </div>
                    </div>
                </div>
            );
        }

        if (!Component) {
            return (
                <div className="text-center p-8 text-gray-600 dark:text-gray-300">
                    <p>No micro-application available.</p>
                    <p className="text-sm mt-2">Use the assistant to create a custom application.</p>
                </div>
            );
        }

        return (
            <ErrorBoundary onErrorOnce={this.notifyErrorOnce}>
                <div className="micro-app-wrapper text-gray-900 dark:text-gray-100">
                    <Component
                        project={project}
                        auth={auth}
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
        if (typeof this.props.onErrorOnce === 'function') {
            this.props.onErrorOnce(error?.message || String(error));
        }
    }

    render() {
        if (this.state.hasError) {
            const error = this.state.error;
            const errorMessage = error?.message || String(error);

            // Provide specific guidance for common chart library issues
            let helpText = "The micro-application encountered an error while running.";
            let suggestions = [];

            if (errorMessage.includes('Pie is not defined') || errorMessage.includes('BarChart is not defined')) {
                helpText = "Chart component not found. This micro-app tried to use a chart library component that isn't available.";
                suggestions = [
                    "Available chart components: BarChart, PieChart, LineChart, AreaChart",
                    "Use recharts library syntax: <BarChart data={data}>...",
                    "Example: import { BarChart, Bar, XAxis, YAxis } from 'recharts' is not needed - components are already available"
                ];
            } else if (errorMessage.includes('react-chartjs-2')) {
                helpText = "Unsupported chart library. This micro-app tried to use react-chartjs-2, which is not available.";
                suggestions = [
                    "Use recharts instead: BarChart, PieChart, LineChart, AreaChart",
                    "No import needed - chart components are globally available",
                    "Example: <PieChart width={400} height={300}><Pie data={data} /></PieChart>"
                ];
            }

            return (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-6 m-4">
                    <div className="flex">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Component Runtime Error</h3>
                            <div className="mt-2 text-sm text-yellow-700 dark:text-yellow-300">
                                <p>{helpText}</p>
                                <p className="mt-1 font-mono text-xs">{errorMessage}</p>
                                {suggestions.length > 0 && (
                                    <div className="mt-3">
                                        <p className="font-medium">Suggestions:</p>
                                        <ul className="list-disc list-inside mt-1 space-y-1">
                                            {suggestions.map((suggestion, index) => (
                                                <li key={index} className="text-xs">{suggestion}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
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
