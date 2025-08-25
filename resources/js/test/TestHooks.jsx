// Test file to validate hook syntax
import React from 'react';
import { useTaskCache } from '@/hooks/useTaskCache.js';
import { useLazyAssets } from '@/hooks/useLazyAssets.jsx';

// Simple test component to validate our hooks
const TestComponent = () => {
    const { tasks, loading } = useTaskCache(1);
    const { observeElement } = useLazyAssets();

    return (
        <div>
            Test Component - {loading ? 'Loading...' : `${Object.keys(tasks).length} columns`}
        </div>
    );
};

export default TestComponent;
