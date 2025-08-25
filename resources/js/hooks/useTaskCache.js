import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Advanced Task Cache Hook
 * Provides optimistic updates, lazy loading, and efficient caching for tasks
 */

// Global cache to persist across component unmounts
const GLOBAL_CACHE = new Map();
const CACHE_EXPIRY = 5 * 60 * 1000; // 5 minutes
const PENDING_UPDATES = new Map(); // Track pending status updates

// Helper to safely use route function
const safeRoute = (name, params) => {
    if (typeof window !== 'undefined' && window.route) {
        try {
            return window.route(name, params);
        } catch (error) {
            console.warn('Route function failed:', error);
        }
    }
    // Fallback for build time or when route function fails
    const baseUrl = '/projects';
    if (name === 'tasks.index') {
        return `${baseUrl}/${params}/tasks`;
    }
    if (name === 'tasks.update') {
        return `${baseUrl}/${params[0]}/tasks/${params[1]}`;
    }
    return '/';
};

export const useTaskCache = (projectId, initialTasks = {}) => {
    const [tasks, setTasks] = useState(initialTasks);
    const [loading, setLoading] = useState(Object.keys(initialTasks).length === 0);
    const [error, setError] = useState(null);
    const abortControllerRef = useRef(null);
    const cacheKey = `tasks_${projectId}`;

    // Get cached data
    const getCachedData = useCallback(() => {
        const cached = GLOBAL_CACHE.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < CACHE_EXPIRY) {
            return cached.data;
        }
        return null;
    }, [cacheKey]);

    // Set cached data
    const setCachedData = useCallback(
        (data) => {
            GLOBAL_CACHE.set(cacheKey, {
                data,
                timestamp: Date.now(),
            });
        },
        [cacheKey]
    );

    // Load tasks from server
    const loadTasks = useCallback(
        async (force = false) => {
            // Check cache first
            if (!force) {
                const cached = getCachedData();
                if (cached) {
                    setTasks(cached);
                    setLoading(false);
                    return cached;
                }
            }

            setLoading(true);
            setError(null);

            // Cancel previous request
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }

            abortControllerRef.current = new AbortController();

            try {
                const response = await fetch(safeRoute('tasks.index', projectId), {
                    signal: abortControllerRef.current.signal,
                    headers: {
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                    },
                });

                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                const tasksData = data.props?.tasks || {};

                setTasks(tasksData);
                setCachedData(tasksData);
                return tasksData;
            } catch (err) {
                if (err.name !== 'AbortError') {
                    console.error('Failed to load tasks:', err);
                    setError(err.message);
                }
            } finally {
                setLoading(false);
            }
        },
        [projectId, getCachedData, setCachedData]
    );

    // Optimistic update for drag and drop
    const updateTaskStatus = useCallback(
        (taskId, fromStatus, toStatus, newIndex = 0, serverStatus = null) => {
            // Use serverStatus if provided, otherwise use toStatus
            const statusForServer = serverStatus || toStatus;
            const updateKey = `${taskId}_${toStatus}`;

            console.log(
                `🎯 updateTaskStatus called: taskId=${taskId}, fromStatus=${fromStatus}, toStatus=${toStatus}, serverStatus=${statusForServer}`
            );

            // Store pending update
            PENDING_UPDATES.set(updateKey, {
                taskId,
                fromStatus,
                toStatus,
                timestamp: Date.now(),
            });

            setTasks((prevTasks) => {
                const newTasks = { ...prevTasks };

                // Find and remove task from source column
                const sourceColumn = [...(newTasks[fromStatus] || [])];
                const taskIndex = sourceColumn.findIndex((task) => task.id === taskId);

                if (taskIndex === -1) return prevTasks; // Task not found

                const [movedTask] = sourceColumn.splice(taskIndex, 1);
                newTasks[fromStatus] = sourceColumn;

                // Add task to destination column
                const destColumn = [...(newTasks[toStatus] || [])];
                const updatedTask = { ...movedTask, status: toStatus };
                destColumn.splice(newIndex, 0, updatedTask);
                newTasks[toStatus] = destColumn;

                // Update cache
                setCachedData(newTasks);

                return newTasks;
            });

            // Update server in background with correct status
            updateTaskStatusOnServer(taskId, statusForServer, updateKey);
        },
        [setCachedData]
    );

    // Background server update
    const updateTaskStatusOnServer = useCallback(
        async (taskId, status, updateKey) => {
            try {
                const url = safeRoute('tasks.update', [projectId, taskId]);
                console.log(`🔄 Updating task ${taskId} to status "${status}" via ${url}`);

                const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
                console.log('🔐 CSRF Token:', csrfToken ? 'Found' : 'Missing');

                const response = await fetch(url, {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        Accept: 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': csrfToken,
                    },
                    body: JSON.stringify({ status }),
                });

                console.log(`📊 Response: ${response.status} ${response.statusText}`);

                if (response.ok) {
                    // Remove from pending updates on success
                    PENDING_UPDATES.delete(updateKey);
                    console.log(`✅ Task ${taskId} status updated successfully`);
                } else {
                    const errorText = await response.text();
                    console.error(`❌ Server responded with ${response.status}:`, errorText);
                    throw new Error(`Server update failed: ${response.status} - ${errorText}`);
                }
            } catch (error) {
                console.error(`❌ Failed to update task ${taskId} status:`, error);

                // Revert optimistic update on failure
                console.log(`🔄 Reverting task ${taskId} back to original position`);
                const pendingUpdate = PENDING_UPDATES.get(updateKey);
                if (pendingUpdate) {
                    const { fromStatus, toStatus } = pendingUpdate;

                    setTasks((prevTasks) => {
                        const newTasks = { ...prevTasks };

                        // Find and remove from destination
                        const destColumn = [...(newTasks[toStatus] || [])];
                        const taskIndex = destColumn.findIndex((task) => task.id === taskId);

                        if (taskIndex !== -1) {
                            const [revertedTask] = destColumn.splice(taskIndex, 1);
                            newTasks[toStatus] = destColumn;

                            // Add back to source
                            const sourceColumn = [...(newTasks[fromStatus] || [])];
                            const originalTask = { ...revertedTask, status: fromStatus };
                            sourceColumn.push(originalTask);
                            newTasks[fromStatus] = sourceColumn;

                            setCachedData(newTasks);
                        }

                        return newTasks;
                    });

                    PENDING_UPDATES.delete(updateKey);
                }
            }
        },
        [projectId, setCachedData]
    );

    // Add new task optimistically
    const addTask = useCallback(
        (newTask) => {
            setTasks((prevTasks) => {
                const status = newTask.status || 'todo';
                const newTasks = { ...prevTasks };
                const column = [...(newTasks[status] || [])];
                column.unshift(newTask);
                newTasks[status] = column;
                setCachedData(newTasks);
                return newTasks;
            });
        },
        [setCachedData]
    );

    // Remove task optimistically
    const removeTask = useCallback(
        (taskId, status) => {
            setTasks((prevTasks) => {
                const newTasks = { ...prevTasks };
                const column = [...(newTasks[status] || [])];
                const filteredColumn = column.filter((task) => task.id !== taskId);
                newTasks[status] = filteredColumn;
                setCachedData(newTasks);
                return newTasks;
            });
        },
        [setCachedData]
    );

    // Update task details optimistically
    const updateTask = useCallback(
        (taskId, updates) => {
            setTasks((prevTasks) => {
                const newTasks = { ...prevTasks };
                let updated = false;

                Object.keys(newTasks).forEach((status) => {
                    const column = newTasks[status];
                    const taskIndex = column.findIndex((task) => task.id === taskId);

                    if (taskIndex !== -1) {
                        const updatedColumn = [...column];
                        updatedColumn[taskIndex] = { ...updatedColumn[taskIndex], ...updates };
                        newTasks[status] = updatedColumn;
                        updated = true;
                    }
                });

                if (updated) {
                    setCachedData(newTasks);
                }

                return newTasks;
            });
        },
        [setCachedData]
    );

    // Invalidate cache
    const invalidateCache = useCallback(() => {
        GLOBAL_CACHE.delete(cacheKey);
        loadTasks(true);
    }, [cacheKey, loadTasks]);

    // Get pending updates count
    const getPendingUpdatesCount = useCallback(() => {
        return Array.from(PENDING_UPDATES.values()).filter(
            (update) => Date.now() - update.timestamp < 30000
        ).length; // 30 seconds
    }, []);

    // Load initial data
    useEffect(() => {
        // If we have initial tasks, cache them and don't fetch
        if (Object.keys(initialTasks).length > 0) {
            setCachedData(initialTasks);
            setLoading(false);
            return;
        }

        // Otherwise load from cache or server
        loadTasks();

        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, [loadTasks, initialTasks]);

    return {
        tasks,
        loading,
        error,
        updateTaskStatus,
        addTask,
        removeTask,
        updateTask,
        invalidateCache,
        refreshTasks: () => loadTasks(true),
        getPendingUpdatesCount,
        isTaskPending: (taskId, status) => PENDING_UPDATES.has(`${taskId}_${status}`),
    };
};

// Export cache management utilities
export const clearTaskCache = () => {
    GLOBAL_CACHE.clear();
    PENDING_UPDATES.clear();
};

export const getTaskCacheSize = () => GLOBAL_CACHE.size;

export const getCacheStats = () => ({
    cacheSize: GLOBAL_CACHE.size,
    pendingUpdates: PENDING_UPDATES.size,
    cacheKeys: Array.from(GLOBAL_CACHE.keys()),
});
