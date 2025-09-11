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
        const { componentCode, project, auth } = this.props;
        
        if (!componentCode) {
            this.setState({ Component: null, loading: false });
            return;
        }

        try {
            this.setState({ loading: true, error: null });

            // Create a safe component from the code string
            const Component = this.createComponentFromCode(componentCode);
            
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

    createComponentFromCode = (code) => {
        // Clean the code string
        let cleanCode = code.trim();
        
        // Remove markdown code blocks if present
        cleanCode = cleanCode.replace(/^```jsx?\n/, '').replace(/\n```$/, '');
        
        // Ensure we have proper imports
        if (!cleanCode.includes('import React')) {
            cleanCode = `import React, { useState, useEffect } from 'react';\nimport { csrfFetch } from '@/utils/csrf';\n\n${cleanCode}`;
        }

        // Add default export if missing
        if (!cleanCode.includes('export default')) {
            cleanCode = cleanCode.replace(/function (\w+)/, 'export default function $1');
        }

        // Create component function with safe evaluation
        try {
            // Extract component name
            const componentMatch = cleanCode.match(/(?:export default )?function (\w+)/);
            const componentName = componentMatch ? componentMatch[1] : 'GeneratedComponent';

            // Create a safe evaluation context
            const componentFunction = new Function(
                'React', 
                'useState', 
                'useEffect', 
                'csrfFetch',
                `
                const { useState, useEffect } = React;
                
                ${cleanCode.replace(/import[^;]+;/g, '')}
                
                return ${componentName};
                `
            );

            // Import dependencies for the component
            const { useState, useEffect } = React;
            const csrfFetch = (url, options = {}) => {
                const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
                return fetch(url, {
                    ...options,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': token,
                        ...options.headers,
                    },
                });
            };

            // Execute the function to get the component
            const GeneratedComponent = componentFunction(React, useState, useEffect, csrfFetch);
            
            return GeneratedComponent;
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
                    <Component project={project} auth={auth} />
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