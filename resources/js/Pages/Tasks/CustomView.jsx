import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Head, usePage } from '@inertiajs/react';
import { useChat } from '@ai-sdk/react';
import { useTranslation } from 'react-i18next';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Box,
    Paper,
    IconButton,
    Tooltip,
    Alert,
    Snackbar,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Button,
    Typography,
    Stack,
    Chip,
    alpha,
    useTheme,
    Fade,
    CircularProgress,
    LinearProgress,
    keyframes,
    TextField
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import DeleteIcon from '@mui/icons-material/Delete';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CodeIcon from '@mui/icons-material/Code';
import BuildIcon from '@mui/icons-material/Build';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AssistantChat from './AssistantChat';
import ReactComponentRenderer from '@/utils/ReactComponentRenderer';
import { csrfFetch } from '@/utils/csrf';

// Professional design tokens inspired by Board.jsx
const designTokens = {
    gradients: {
        primary: 'linear-gradient(140deg, #F7FAFF 0%, #F2F6FE 55%, #EDF2FA 100%)',
        accent: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        success: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
        warning: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    },
    colors: {
        primary: '#4F46E5',
        accent: '#667eea',
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
    },
    shadows: {
        card: '0 4px 16px -8px rgba(0, 0, 0, 0.1)',
        elevated: '0 8px 32px -12px rgba(0, 0, 0, 0.15)',
        floating: '0 16px 48px -16px rgba(0, 0, 0, 0.2)',
    },
    radii: {
        lg: 12,
        xl: 16,
    }
};

// Elegant animations
const pulseGlow = keyframes`
  0%, 100% { 
    box-shadow: 0 0 0 0 rgba(103, 126, 234, 0.7);
  }
  50% { 
    box-shadow: 0 0 0 10px rgba(103, 126, 234, 0);
  }
`;

const fadeSlideUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const shimmer = keyframes`
  0% {
    background-position: -200px 0;
  }
  100% {
    background-position: calc(200px + 100%) 0;
  }
`;

export default function CustomView({ auth, project, tasks, allTasks, users, methodology, viewName }) {
    const { t } = useTranslation();

    // Get current auth user - use prop first, then fall back to Inertia shared data
    const { props } = usePage();
    const currentAuth = auth || props.auth?.user || null;

    console.log('[CustomView] Auth data check:', {
        authProp: auth?.name || 'none',
        sharedAuth: props.auth?.user?.name || 'none',
        usingAuth: currentAuth?.name || 'none'
    });

    // Resolve original view name from slug via server list (shared views)
    const [originalViewName, setOriginalViewName] = useState('');

    // Function to create slug (should match the one in Board.jsx)
    const createSlug = (name) => {
        return name
            .trim()
            .toLowerCase()
            .replace(/\s+/g, '-') // Replace spaces with dashes
            .replace(/[^a-z0-9-]/g, '') // Remove special characters except dashes
            .replace(/-+/g, '-') // Replace multiple dashes with single dash
            .replace(/^-|-$/g, ''); // Remove leading/trailing dashes
    };

    // Resolve original name once project is available
    useEffect(() => {
        if (!project?.id || !viewName) return;
        let cancelled = false;
        const fetchList = async () => {
            try {
                const res = await fetch(`/projects/${project.id}/custom-views/list`, {
                    headers: { Accept: 'application/json' },
                    credentials: 'same-origin',
                });
                if (!res.ok) throw new Error('Failed to load views');
                const data = await res.json();
                const items = Array.isArray(data?.custom_views) ? data.custom_views : [];
                const match = items.find((v) => createSlug(String(v.name || '')) === viewName);
                if (!cancelled) {
                    // If we can't resolve to a pretty name yet, use the slug to ensure consistency with server saves
                    setOriginalViewName(match?.name || viewName);
                }
            } catch (_e) {
                if (!cancelled) setOriginalViewName(viewName);
            }
        };
        fetchList();
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [project?.id, viewName]);

    const theme = useTheme();
    const [assistantOpen, setAssistantOpen] = useState(false);
    const [isLocked, setIsLocked] = useState(true);
    const [componentCode, setComponentCode] = useState('');
    const [customViewId, setCustomViewId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [componentError, setComponentError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
    const [generationProgress, setGenerationProgress] = useState(null);
    const [isPersisted, setIsPersisted] = useState(false); // track if current component exists in DB

    // Local input state for chat
    const [chatInput, setChatInput] = useState('');
    const [isManuallyGenerating, setIsManuallyGenerating] = useState(false);

    // Memoize component code for useChat to prevent unnecessary re-renders
    const memoizedComponentCode = useMemo(() => {
        return componentCode && componentCode.trim() ? componentCode : null;
    }, [componentCode]);

    // AI SDK useChat hook for streaming component generation
    const {
        messages,
        input,
        handleInputChange,
        handleSubmit,
        isLoading: isGenerating,
        error: chatError,
        append,
        setMessages,
        stop,
    } = useChat({
        api: `/api/chat`,
        body: {
            projectId: project?.id,
            viewName,
            currentCode: memoizedComponentCode, // Use memoized component code
            projectContext: {
                tasks,
                users,
                methodology,
            },
        },
        onResponse: (response) => {
            console.log('AI SDK Response:', response);
            console.log('Current component code being sent:', memoizedComponentCode ? 'Component exists (' + memoizedComponentCode.length + ' chars)' : 'No existing component');
        },
        onFinish: (message) => {
            console.log('AI SDK Finished:', message);
            console.log('Message experimental_data:', message?.experimental_data);
            console.log('Message content:', message?.content);

            // Check if this was an update or new component
            const wasUpdate = memoizedComponentCode && memoizedComponentCode.trim();

            // Extract component code from the response
            if (message?.experimental_data?.component_code) {
                console.log('Found component code in experimental_data');
                setComponentCode(message.experimental_data.component_code);
                setComponentError(null); // Clear any previous errors
                setCustomViewId(message.experimental_data.custom_view_id);
                setIsLocked(false);
                setIsPersisted(false); // generated code is a draft until explicitly saved or loaded from server
                showSnackbar(wasUpdate ? 'Component updated successfully!' : 'Component generated successfully!', 'success');
            } else if (message?.content) {
                console.log('Checking message content for component code');
                const codeMatch = message.content.match(/```(?:jsx?|tsx?|html)?\n?([\s\S]*?)```/);
                if (codeMatch) {
                    console.log('Found component code in message content (code block)');
                    setComponentCode(codeMatch[1]);
                    setComponentError(null); // Clear any previous errors
                    setIsLocked(false);
                    setIsPersisted(false);
                    showSnackbar(wasUpdate ? 'Component updated successfully!' : 'Component generated successfully!', 'success');
                } else if (message.content.trim() && !message.content.includes('Failed to generate')) {
                    console.log('Using entire message content as component code');
                    // If no code block found, try to use the entire content as code
                    setComponentCode(message.content);
                    setComponentError(null); // Clear any previous errors
                    setIsLocked(false);
                    setIsPersisted(false);
                    showSnackbar(wasUpdate ? 'Component updated successfully!' : 'Component generated successfully!', 'success');
                } else {
                    console.warn('Message content appears to be an error or empty:', message.content);
                    showSnackbar(wasUpdate ? 'Failed to update component. Please try again.' : 'Failed to generate component. Please try again.', 'error');
                }
            } else {
                console.warn('No component code found in message');
                showSnackbar(wasUpdate ? 'No component updates received. Please try again.' : 'No component code received. Please try again.', 'error');
            }
        },
        onError: (error) => {
            console.error('AI SDK Error:', error);
            showSnackbar('Failed to generate component. Please try again.', 'error');
        },
    });

    // Debug what we're getting from useChat
    // console.log('useChat hook values:', { messages, input, append, isGenerating });

    // Custom input handlers to ensure proper state management
    const handleChatInputChange = (e) => {
        // console.log('Input change:', e.target.value);
        setChatInput(e.target.value);
    };

    // Basic validity check so we don't feed empty/invalid text when we can scaffold
    const looksLikeComponent = (src) => {
        if (!src) return false;
        const hasExport = /export\s+default\s+/.test(src);
        const hasJSX = /<\w[\s\S]*>/.test(src) || /React\.createElement\(/.test(src);
        const hasNamed = /(function\s+\w+\s*\(|const\s+\w+\s*=\s*(?:\([^)]*\)\s*=>|function\s*\()|class\s+\w+\s+extends\s+React\.Component)/.test(src);
        return hasExport || (hasJSX && hasNamed);
    };

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput?.trim() || isGenerating || isManuallyGenerating) return;

        try {
            const userMessage = {
                role: 'user',
                content: chatInput.trim(),
                id: Date.now().toString(),
            };

            // Add user message to chat immediately
            setMessages(prev => [...(prev || []), userMessage]);
            setChatInput(''); // Clear input immediately

            // Try using append if it exists, otherwise use manual API call
            if (typeof append === 'function') {
                await append({
                    role: 'user',
                    content: userMessage.content
                });
            } else {
                // Fallback: Manual streaming API call to respect user's actual request
                console.log('append function not available, using manual streaming API call');
                setIsManuallyGenerating(true);

                try {
                    const response = await csrfFetch('/api/chat', {
                        method: 'POST',
                        body: JSON.stringify({
                            messages: [...(messages || []), userMessage],
                            projectId: project?.id,
                            viewName,
                            currentCode: componentCode,
                            projectContext: {
                                tasks,
                                users,
                                methodology,
                            },
                        }),
                    });

                    if (response.ok) {
                        const reader = response.body?.getReader();
                        const decoder = new TextDecoder();
                        let assistantMessage = '';
                        let streamedComponentCode = '';
                        let streamedCustomViewId = null;

                        if (reader) {
                            while (true) {
                                const { done, value } = await reader.read();
                                if (done) break;

                                const chunk = decoder.decode(value);
                                const lines = chunk.split('\n');

                                for (const line of lines) {
                                    if (!line.startsWith('data: ')) continue;
                                    const data = line.slice(6);
                                    if (data === '[DONE]') continue;
                                    try {
                                        const parsed = JSON.parse(data);
                                        console.log('[CustomView] Streaming chunk:', parsed);

                                        if (parsed.content) assistantMessage += parsed.content;

                                        // Prefer experimental_data.component_code when present
                                        const exp = parsed.experimental_data || parsed.experimentalData || null;
                                        if (exp?.component_code) {
                                            console.log('[CustomView] Found component in experimental_data:', exp.component_code.substring(0, 100) + '...');
                                            // Always take the latest component code (not just the first one)
                                            streamedComponentCode = exp.component_code;
                                        }
                                        if (exp?.custom_view_id) {
                                            streamedCustomViewId = exp.custom_view_id;
                                        }
                                    } catch (parseError) {
                                        console.warn('[CustomView] Parse error for chunk:', data, parseError);
                                    }
                                }
                            }
                        }

                        console.log('[CustomView] Final assistant message:', assistantMessage);
                        console.log('[CustomView] Final streamed component code:', streamedComponentCode);

                        // Add assistant response to messages (textual)
                        setMessages(prev => [...(prev || []), {
                            role: 'assistant',
                            content: assistantMessage,
                            id: Date.now().toString(),
                        }]);

                        // Choose code from experimental_data first, then code block, then raw fallback
                        let nextCode = streamedComponentCode;
                        if (!nextCode) {
                            console.log('[CustomView] No component in experimental_data, checking for code blocks...');
                            const codeMatch = assistantMessage.match(/```(?:jsx?|tsx?|html)?\n?([\s\S]*?)```/);
                            if (codeMatch) {
                                console.log('[CustomView] Found code block:', codeMatch[1].substring(0, 100) + '...');
                                nextCode = codeMatch[1];
                            }
                        }
                        if (!nextCode && assistantMessage.trim() && !assistantMessage.toLowerCase().includes('failed')) {
                            console.log('[CustomView] Using entire assistant message as code...');
                            nextCode = assistantMessage.trim();
                        }

                        if (nextCode) {
                            console.log('[CustomView] Setting component code from streaming response');
                            setComponentCode(nextCode);
                            setComponentError(null); // Clear any previous errors
                            if (streamedCustomViewId) setCustomViewId(streamedCustomViewId);
                            setIsLocked(false);
                            setIsPersisted(false);
                            showSnackbar('Component generated successfully!', 'success');
                        } else {
                            console.warn('[CustomView] No valid component code found in streaming response');
                            showSnackbar('Generation finished, but no component code received. Please try again.', 'warning');
                        }
                    } else {
                        throw new Error('API call failed');
                    }

                    setIsManuallyGenerating(false);
                } catch (error) {
                    console.error('Manual API call error:', error);
                    showSnackbar('Failed to generate component. Please try again.', 'error');
                    setIsManuallyGenerating(false);
                }
            }
        } catch (error) {
            console.error('Chat submit error:', error);
            showSnackbar('Failed to send message. Please try again.', 'error');
            setIsManuallyGenerating(false);
        }
    }

    /*
    // Original API call code (disabled for testing)
    const tryOriginalApiCall = async () => {
        try {
                const response = await csrfFetch('/api/chat', {
                method: 'POST',
                body: JSON.stringify({
                    messages: [...(messages || []), userMessage],
                    projectId: project?.id,
                    viewName,
                    currentCode: componentCode,
                    projectContext: {
                        tasks,
                        users,
                        methodology,
                    },
                }),
            });

            if (response.ok) {
                const reader = response.body?.getReader();
                const decoder = new TextDecoder();
                let assistantMessage = '';
                let streamedComponentCode = '';
                let streamedCustomViewId = null;

                if (reader) {
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value);
                        const lines = chunk.split('\n');

                        for (const line of lines) {
                            if (!line.startsWith('data: ')) continue;
                            const data = line.slice(6);
                            if (data === '[DONE]') continue;
                            try {
                                const parsed = JSON.parse(data);
                                if (parsed.content) assistantMessage += parsed.content;
                                // Prefer experimental_data.component_code when present
                                const exp = parsed.experimental_data || parsed.experimentalData || null;
                                if (exp?.component_code && !streamedComponentCode) {
                                    streamedComponentCode = exp.component_code;
                                }
                                if (exp?.custom_view_id && !streamedCustomViewId) {
                                    streamedCustomViewId = exp.custom_view_id;
                                }
                            } catch (_) {
                                // ignore
                            }
                        }
                    }
                }

                // Add assistant response to messages (textual)
                setMessages(prev => [...(prev || []), {
                    role: 'assistant',
                    content: assistantMessage,
                    id: Date.now().toString(),
                }]);

                // Choose code from experimental_data first, then code block, then raw fallback
                let nextCode = streamedComponentCode;
                if (!nextCode) {
                    const codeMatch = assistantMessage.match(/```(?:jsx?|tsx?|html)?\n?([\s\S]*?)```/);
                    if (codeMatch) nextCode = codeMatch[1];
                }
                if (!nextCode && assistantMessage.trim()) {
                    nextCode = assistantMessage.trim();
                }

                if (nextCode) {
                    setComponentCode(nextCode);
                    if (streamedCustomViewId) setCustomViewId(streamedCustomViewId);
                    setIsLocked(false);
                    showSnackbar('Component generated successfully!', 'success');
                } else {
                    showSnackbar('Generation finished, but no component code received. Please try again.', 'warning');
                }
            } else {
                throw new Error('API call failed');
            }

            setIsManuallyGenerating(false);
        }
    } catch (error) {
        console.error('Chat submit error:', error);
        showSnackbar('Failed to send message. Please try again.', 'error');
        setIsManuallyGenerating(false);
    }
    */

    // Enhanced save mechanism with better feedback
    const handleManualSave = async () => {
        if (!componentCode || isSaving) return;

        setIsSaving(true);
        try {
            const response = await csrfFetch(`/projects/${project.id}/custom-views/save`, {
                method: 'POST',
                body: JSON.stringify({
                    view_name: originalViewName,
                    component_code: componentCode,
                    custom_view_id: customViewId
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setCustomViewId(data.customViewId);
                setIsPersisted(true);
                showSnackbar(t('customViews.saveSuccess'), 'success');
            } else {
                throw new Error('Save failed');
            }
        } catch (error) {
            console.error('Save error:', error);
            showSnackbar(t('customViews.saveFailed'), 'error');
        } finally {
            setIsSaving(false);
        }
    };

    // Enhanced generation progress with detailed stages
    const getProgressIcon = (stage) => {
        switch (stage) {
            case 1: return <CodeIcon sx={{ color: designTokens.colors.primary }} />;
            case 2: return <AutoAwesomeIcon sx={{ color: designTokens.colors.accent }} />;
            case 3: return <BuildIcon sx={{ color: designTokens.colors.warning }} />;
            case 4: return <RocketLaunchIcon sx={{ color: designTokens.colors.success }} />;
            default: return <CircularProgress size={20} />;
        }
    };

    const getProgressMessage = (stage) => {
        switch (stage) {
            case 1: return 'Analyzing your requirements...';
            case 2: return 'Generating intelligent code...';
            case 3: return 'Building your application...';
            case 4: return 'Finalizing and deploying...';
            default: return 'Processing...';
        }
    };

    // Auto-save component code to prevent data loss (optimized)
    useEffect(() => {
        if (!componentCode || isLocked || !autoSaveEnabled) return;

        // Debounce auto-save to prevent excessive saves
        const timeoutId = setTimeout(() => {
            const backupKey = `microapp-backup-${project?.id || 'unknown'}-${originalViewName || 'default'}`;
            const backupData = {
                componentCode,
                timestamp: new Date().toISOString(),
                customViewId,
                projectId: project?.id,
                viewName: viewName || 'default'
            };
            localStorage.setItem(backupKey, JSON.stringify(backupData));
        }, 5000); // Save after 5 seconds of inactivity

        return () => {
            clearTimeout(timeoutId);
        };
    }, [componentCode, isLocked, autoSaveEnabled, project?.id, originalViewName, customViewId]);

    // Load existing custom view on mount (optimized)
    useEffect(() => {
        const loadCustomView = async () => {
            if (!project?.id || !originalViewName) {
                setIsLoading(false);
                return;
            }

            try {
                const response = await csrfFetch(`/projects/${project.id}/custom-views/get?view_name=${encodeURIComponent(originalViewName)}`);
                const data = await response.json();

                console.log('[CustomView] Server response:', data);
                console.log('[CustomView] HTML content:', data.html);
                console.log('[CustomView] HTML length:', data.html ? data.html.length : 0);

                if (data.success && data.html && data.html.trim()) {
                    console.log('[CustomView] Valid component found, setting component code');
                    setComponentCode(data.html);
                    setCustomViewId(data.customViewId || data.custom_view_id || null);
                    setIsPersisted(true);
                    showSnackbar('Micro-application loaded successfully', 'success');
                } else {
                    // Server responded but no view exists: treat server as source of truth.
                    console.log('[CustomView] No valid component found on server, showing empty state');
                    setComponentCode('');
                    setCustomViewId(null);
                    setIsPersisted(false);
                    setIsLocked(true);

                    const backupKey = `microapp-backup-${project.id}-${originalViewName}`;
                    localStorage.removeItem(backupKey); // ensure we don't resurrect deleted views

                    if (!data.success) {
                        const msg = (data.message || '').toLowerCase();
                        const isNotFound = msg.includes('no custom view') || msg.includes('not found');
                        showSnackbar(isNotFound
                            ? 'No saved micro-app exists yet. Click Start Creating to generate one.'
                            : (data.message || 'Could not load micro-application.'), 'info');
                    }
                    // Do NOT load backups or inject defaults when the server says it doesn't exist.
                }
            } catch (error) {
                console.error('[CustomView] Error loading custom view:', error);

                // Fallback to local backup
                const backupKey = `microapp-backup-${project.id}-${originalViewName}`;
                const backup = localStorage.getItem(backupKey);
                if (backup) {
                    try {
                        const backupData = JSON.parse(backup);
                        setComponentCode(backupData.componentCode || '');
                        setCustomViewId(backupData.customViewId);
                        setIsPersisted(false);
                    } catch (e) {
                        setComponentCode('');
                        setIsPersisted(false);
                        console.error('[CustomView] Failed to parse backup after API error:', e);
                    }
                } else {
                    // Network error only: provide a minimal, safe default (no hooks) so the user sees something.
                    const defaultScaffold = `export default function HelloMicroApp() {\n  return (\n    <div style={{padding:20,fontFamily:'Inter, system-ui, Arial'}}>\n      <h2 style={{margin:0, marginBottom:8}}>Welcome to your Micro-App</h2>\n      <p>Project: {projectData?.name || 'Unknown'}</p>\n      <p>Tasks available: {Array.isArray(tasksDataFromProps) ? tasksDataFromProps.length : 0}</p>\n      <button onClick={() => alert('It works!')} style={{padding:'8px 12px', borderRadius:8, border:'1px solid #ddd', background:'#fff'}}>Click me</button>\n    </div>\n  );\n}`;
                    setComponentCode(defaultScaffold);
                    setIsLocked(false);
                    setIsPersisted(false);
                }

                showSnackbar('Failed to load custom view, using local backup if available', 'warning');
            } finally {
                setIsLoading(false);
            }
        };

        loadCustomView();
    }, [project?.id, originalViewName]);

    // Listen for real-time updates to component data
    useEffect(() => {
        if (!project?.id || !originalViewName || !window.Echo) {
            return;
        }

        const baseName = `custom-view.${project.id}.${originalViewName}`;
        const channelName = `private-${baseName}`;
        console.log('[CustomView] Listening for real-time updates on channel:', baseName);

        // Use private channel to match server-side PrivateChannel
        const channel = window.Echo.private(baseName);

        // Event name matches broadcastAs(): 'custom-view-data-updated'
        channel.listen('.custom-view-data-updated', (event) => {
            console.log('[CustomView] Received real-time update:', event);

            // Only update if this is from a different user (avoid echo from own saves)
            if (event.userId !== currentAuth?.id) {
                console.log('[CustomView] Updating component from real-time data change');

                // The component code needs to be updated with the new embedded data
                // Since the backend already embeds the data, we need to reload the component
                const reloadComponent = async () => {
                    try {
                        const response = await csrfFetch(`/projects/${project.id}/custom-views/get?view_name=${encodeURIComponent(originalViewName)}`);
                        const data = await response.json();

                        if (data.success && data.html && data.html.trim()) {
                            setComponentCode(data.html);
                            showSnackbar(`Component updated by ${event.userName || 'another user'}`, 'info');
                        }
                    } catch (error) {
                        console.error('[CustomView] Error reloading component after real-time update:', error);
                    }
                };

                reloadComponent();
            }
        });

        return () => {
            console.log('[CustomView] Leaving real-time channel:', baseName);
            // Ensure we leave the private- prefixed channel
            window.Echo.leave(`private-${baseName}`);
        };
    }, [project?.id, originalViewName, currentAuth?.id]);

    // Enhanced generation handling (optimized with useCallback)
    const handleSpaGenerated = useCallback((payload, meta) => {
        // payload may be HTML string or an object; meta (if provided) contains ids
        if (typeof payload === 'string') {
            setComponentCode(payload);
            setCustomViewId(meta?.custom_view_id || meta?.customViewId || null);
            setIsPersisted(true);
            setGenerationProgress(null);
            showSnackbar('Micro-application generated successfully!', 'success');
            setIsLocked(false);
            return;
        }

        if (payload && payload.component_code) {
            setComponentCode(payload.component_code);
            setCustomViewId(payload.customViewId || payload.custom_view_id || meta?.custom_view_id || null);
            setIsPersisted(true);
            setGenerationProgress(null);
            showSnackbar('Micro-application generated successfully!', 'success');
            setIsLocked(false);
            return;
        }

        if (payload && payload.html) {
            setComponentCode(payload.html);
            setCustomViewId(payload.customViewId || meta?.custom_view_id || null);
            setIsPersisted(true);
            setGenerationProgress(null);
            showSnackbar('Micro-application generated successfully!', 'success');
            setIsLocked(false);
            return;
        }

        console.warn('Unexpected payload format:', payload);
        setGenerationProgress(null);
        showSnackbar('Generation completed but format was unexpected', 'warning');
    }, []);

    // Development logging helper (removed - was causing performance issues)

    const handleToggleLock = () => {
        setIsLocked(!isLocked);
        showSnackbar(isLocked ? 'Micro-application unlocked for editing' : 'Micro-application locked', 'info');
    };

    const handleRefresh = () => {
        window.location.reload();
    };

    const handleClearWorkingArea = async () => {
        // Clear local storage backups and any micro-app data
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes(`microapp-`) || key.includes(`${project?.id}-${originalViewName}`))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // Always attempt to delete from server to ensure DB cleanup if it exists
        try {
            const response = await csrfFetch(`/projects/${project.id}/custom-views/delete`, {
                method: 'DELETE',
                body: JSON.stringify({
                    view_name: originalViewName,
                    custom_view_id: customViewId || null,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    showSnackbar('Micro-application deleted permanently', 'success');
                } else {
                    showSnackbar(data.message || 'No persisted application found. Local state cleared.', 'info');
                }
            } else {
                showSnackbar('Server deletion failed. Local state cleared.', 'warning');
            }
        } catch (error) {
            console.error('[CustomView] Error deleting from server:', error);
            showSnackbar('Server unreachable. Local state cleared.', 'warning');
        }

        // Reset local state
        setComponentCode('');
        setCustomViewId(null);
        setIsPersisted(false);
        setIsLocked(true);
        setDeleteConfirmOpen(false);

        // Defensive: also clear any scoped localStorage data for this view
        try {
            const prefix = `microapp-${project?.id}-${originalViewName}-`;
            const toRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) toRemove.push(key);
            }
            toRemove.forEach((k) => localStorage.removeItem(k));
        } catch (_) { }
    };

    // Emergency recovery function to clear problematic component
    const handleEmergencyReset = useCallback(() => {
        console.warn('[CustomView] Emergency reset triggered');
        setComponentCode('');
        setCustomViewId(null);
        setComponentError(null);
        setIsPersisted(false);
        setIsLocked(true);

        // Clear local storage backups that might be causing issues
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes(`microapp-`) || key.includes(`${project?.id}-${originalViewName}`))) {
                keysToRemove.push(key);
            }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        showSnackbar('Component reset. You can now generate a new micro-application.', 'info');
    }, [project?.id, originalViewName]);

    const handleComponentError = (error) => {
        console.error('[CustomView] Component error:', error);
        setComponentError(error);
        showSnackbar('Component error: ' + error, 'error');

        const e = String(error || '').toLowerCase();
        const isCritical =
            e.includes('already been declared') ||
            e.includes('syntaxerror') ||
            e.includes('freeze') ||
            e.includes('babel') ||
            e.includes('requires a filename');

        if (isCritical) {
            setTimeout(() => {
                setComponentCode('');
                setComponentError(null);
                showSnackbar(
                    'Component cleared due to critical error (e.g., Babel/preset/filename). Please regenerate.',
                    'warning'
                );
            }, 250);
        }
    };;

    const showSnackbar = (message, severity = 'info') => {
        setSnackbar({ open: true, message, severity });
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
        >
            <Head title={`${t('customViews.headTitle', { name: originalViewName, project: project.name })}`} />

            {/* Enhanced Generation Progress Dialog */}
            <Dialog
                open={!!generationProgress}
                disableEscapeKeyDown
                PaperProps={{
                    sx: {
                        borderRadius: designTokens.radii.xl,
                        minWidth: 400,
                        background: (theme) => theme.palette.mode === 'dark' ? theme.palette.background.paper : designTokens.gradients.primary,
                        boxShadow: designTokens.shadows.floating,
                    }
                }}
            >
                <DialogContent sx={{ p: 4, textAlign: 'center' }}>
                    <Stack spacing={3} alignItems="center">
                        <Box sx={{
                            width: 80,
                            height: 80,
                            borderRadius: '50%',
                            background: designTokens.gradients.accent,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            fontSize: 32,
                            position: 'relative',
                            '&::after': {
                                content: '""',
                                position: 'absolute',
                                inset: -4,
                                borderRadius: '50%',
                                background: `linear-gradient(45deg, ${designTokens.colors.primary}, ${designTokens.colors.accent})`,
                                animation: `${shimmer} 2s infinite linear`,
                                zIndex: -1,
                                opacity: 0.5,
                            }
                        }}>
                            {getProgressIcon(generationProgress?.step)}
                        </Box>

                        <Box sx={{ width: '100%' }}>
                            <Typography variant="h6" fontWeight="600" color="text.primary" mb={1}>
                                {getProgressMessage(generationProgress?.step)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" mb={2}>
                                Step {generationProgress?.step || 1} of {generationProgress?.total || 4}
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={((generationProgress?.step || 1) / (generationProgress?.total || 4)) * 100}
                                sx={{
                                    height: 8,
                                    borderRadius: 4,
                                    backgroundColor: alpha(designTokens.colors.primary, 0.1),
                                    '& .MuiLinearProgress-bar': {
                                        borderRadius: 4,
                                        background: designTokens.gradients.accent,
                                    }
                                }}
                            />
                        </Box>
                    </Stack>
                </DialogContent>
            </Dialog>

            {/* Professional Main Container */}
            <Box sx={{
                background: (theme) => theme.palette.mode === 'dark' ? theme.palette.background.default : designTokens.gradients.primary,
                minHeight: '100vh',
                p: 3
            }}>
                {/* Floating Control Panel */}
                <Paper
                    elevation={0}
                    sx={{
                        position: 'fixed',
                        bottom: 24,
                        right: 24,
                        zIndex: 1200,
                        borderRadius: designTokens.radii.xl,
                        background: (theme) => alpha(theme.palette.background.paper, 0.95),
                        backdropFilter: 'blur(12px)',
                        border: `1px solid ${alpha(designTokens.colors.primary, 0.1)}`,
                        boxShadow: designTokens.shadows.floating,
                        overflow: 'hidden',
                        animation: `${fadeSlideUp} 0.6s ease-out`,
                    }}
                >
                    <Stack direction="column" spacing={0}>
                        {/* Generate Button */}
                        <Tooltip title={componentCode ? t('customViews.updateApplication') : t('customViews.generateNewApplication')} placement="left">
                            <IconButton
                                onClick={() => setAssistantOpen(true)}
                                sx={{
                                    p: 2,
                                    borderRadius: 0,
                                    background: designTokens.gradients.accent,
                                    color: 'white',
                                    '&:hover': {
                                        background: designTokens.gradients.accent,
                                        transform: 'scale(1.05)',
                                    },
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <AutoAwesomeIcon />
                            </IconButton>
                        </Tooltip>

                        {/* Save Button */}
                        {componentCode && (
                            <Tooltip title={t('customViews.saveApplication')} placement="left">
                                <IconButton
                                    onClick={handleManualSave}
                                    disabled={isSaving}
                                    sx={{
                                        p: 2,
                                        borderRadius: 0,
                                        color: designTokens.colors.success,
                                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                        '&:hover': {
                                            background: alpha(designTokens.colors.success, 0.1),
                                        },
                                    }}
                                >
                                    {isSaving ? <CircularProgress size={20} /> : <SaveIcon />}
                                </IconButton>
                            </Tooltip>
                        )}

                        {/* Lock/Unlock */}
                        {componentCode && (
                            <Tooltip title={isLocked ? t('customViews.unlockForEditing') : t('customViews.lockApplication')} placement="left">
                                <IconButton
                                    onClick={handleToggleLock}
                                    sx={{
                                        p: 2,
                                        borderRadius: 0,
                                        color: isLocked ? designTokens.colors.warning : designTokens.colors.primary,
                                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                        '&:hover': {
                                            background: alpha(isLocked ? designTokens.colors.warning : designTokens.colors.primary, 0.1),
                                        },
                                    }}
                                >
                                    {isLocked ? <LockIcon /> : <LockOpenIcon />}
                                </IconButton>
                            </Tooltip>
                        )}

                        {/* Refresh */}
                        {componentCode && (
                            <Tooltip title={t('customViews.refreshApplication')} placement="left">
                                <IconButton
                                    onClick={handleRefresh}
                                    sx={{
                                        p: 2,
                                        borderRadius: 0,
                                        color: theme.palette.text.secondary,
                                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                        '&:hover': {
                                            background: alpha(theme.palette.text.secondary, 0.1),
                                        },
                                    }}
                                >
                                    <RefreshIcon />
                                </IconButton>
                            </Tooltip>
                        )}

                        {/* Delete (when component exists) */}
                        {componentCode && (
                            <Tooltip title={isPersisted ? t('customViews.deleteSavedApplication') : t('customViews.clearWorkingArea')} placement="left">
                                <IconButton
                                    onClick={() => setDeleteConfirmOpen(true)}
                                    sx={{
                                        p: 2,
                                        borderRadius: 0,
                                        color: designTokens.colors.error,
                                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                        '&:hover': {
                                            background: alpha(designTokens.colors.error, 0.1),
                                        },
                                    }}
                                >
                                    <DeleteIcon />
                                </IconButton>
                            </Tooltip>
                        )}

                        {/* Emergency Reset - always visible when there's an error */}
                        {componentError && (
                            <Tooltip title={t('customViews.emergencyReset')} placement="left">
                                <IconButton
                                    onClick={handleEmergencyReset}
                                    sx={{
                                        p: 2,
                                        borderRadius: 0,
                                        color: 'white',
                                        background: designTokens.colors.error,
                                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                        '&:hover': {
                                            background: designTokens.colors.error,
                                            transform: 'scale(1.05)',
                                        },
                                        animation: `${pulseGlow} 2s infinite`,
                                    }}
                                >
                                    <RefreshIcon />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                </Paper>

                {/* Enhanced Main Working Area */}
                <Paper
                    elevation={0}
                    sx={{
                        mt: 2,
                        mr: 10, // Space for floating controls
                        p: '5%', // 5% padding for working area
                        borderRadius: 3,
                        overflow: 'hidden',
                        background: (theme) => alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(12px)',
                        border: isLocked
                            ? `2px solid ${designTokens.colors.success}`
                            : `2px dashed ${alpha(designTokens.colors.primary, 0.3)}`,
                        boxShadow: designTokens.shadows.elevated,
                        minHeight: 'calc(100vh - 200px)',
                        position: 'relative',
                        animation: `${fadeSlideUp} 0.8s ease-out`,
                    }}
                >
                    {componentCode && componentCode.trim() && !componentError ? (
                        <Box sx={{ position: 'relative' }}>
                            <ReactComponentRenderer
                                componentCode={componentCode}
                                project={project}
                                auth={currentAuth}
                                viewName={originalViewName}
                                onError={handleComponentError}
                                tasks={tasks}
                                allTasks={allTasks}
                                users={users}
                                methodology={methodology}
                            />
                        </Box>
                    ) : isLoading ? (
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: 'calc(100vh - 200px)',
                            color: 'text.secondary',
                        }}>
                            <Box sx={{
                                width: 60,
                                height: 60,
                                borderRadius: '50%',
                                background: designTokens.gradients.accent,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                mb: 3,
                                animation: `${shimmer} 1.5s infinite linear`,
                            }}>
                                <AutoAwesomeIcon fontSize="large" />
                            </Box>
                            <Typography variant="h6" fontWeight="500" mb={1}>
                                {t('customViews.loadingStudio')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {t('customViews.preparingEnvironment')}
                            </Typography>
                        </Box>
                    ) : (
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: 'calc(100vh - 200px)',
                            p: 4,
                            textAlign: 'center',
                        }}>
                            <Box sx={{
                                width: 120,
                                height: 120,
                                borderRadius: designTokens.radii.xl,
                                background: designTokens.gradients.accent,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                mb: 4,
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                                '&:hover': {
                                    transform: 'scale(1.05)',
                                    boxShadow: designTokens.shadows.floating,
                                }
                            }}
                                onClick={() => setAssistantOpen(true)}
                            >
                                <AutoAwesomeIcon sx={{ fontSize: 48 }} />
                            </Box>

                            <Typography variant="h4" fontWeight="600" color="text.primary" mb={2}>
                                {t('customViews.readyToCreate')}
                            </Typography>
                            <Typography variant="body1" color="text.secondary" mb={4} maxWidth={600}>
                                {t('customViews.welcomeStudio')}
                            </Typography>

                            <Stack direction="row" spacing={2} flexWrap="wrap" justifyContent="center">
                                <Chip
                                    label={t('customViews.examples.dataDashboard')}
                                    variant="outlined"
                                    sx={{ borderRadius: designTokens.radii.lg }}
                                />
                                <Chip
                                    label={t('customViews.examples.taskManager')}
                                    variant="outlined"
                                    sx={{ borderRadius: designTokens.radii.lg }}
                                />
                                <Chip
                                    label={t('customViews.examples.analyticsView')}
                                    variant="outlined"
                                    sx={{ borderRadius: designTokens.radii.lg }}
                                />
                                <Chip
                                    label={t('customViews.examples.customTool')}
                                    variant="outlined"
                                    sx={{ borderRadius: designTokens.radii.lg }}
                                />
                            </Stack>

                            <Button
                                variant="contained"
                                size="large"
                                onClick={() => setAssistantOpen(true)}
                                startIcon={<AutoAwesomeIcon />}
                                sx={{
                                    mt: 4,
                                    borderRadius: designTokens.radii.lg,
                                    background: designTokens.gradients.accent,
                                    px: 4,
                                    py: 1.5,
                                    fontWeight: 600,
                                    boxShadow: designTokens.shadows.card,
                                    '&:hover': {
                                        background: designTokens.gradients.accent,
                                        transform: 'translateY(-2px)',
                                        boxShadow: designTokens.shadows.elevated,
                                    },
                                    transition: 'all 0.3s ease',
                                }}
                            >
                                {t('customViews.startCreating')}
                            </Button>
                        </Box>
                    )}
                </Paper>
            </Box>

            {/* Enhanced Delete Confirmation Dialog */}
            <Dialog
                open={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        background: designTokens.gradients.primary,
                    }
                }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Box sx={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: alpha(designTokens.colors.error, 0.1),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: designTokens.colors.error,
                        }}>
                            <DeleteIcon />
                        </Box>
                        <Typography variant="h6" fontWeight="600">
                            {isPersisted ? t('customViews.deleteApplication') : t('customViews.clearWorkingArea')}
                        </Typography>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Typography color="text.secondary">
                        {isPersisted
                            ? t('customViews.deleteConfirmSaved')
                            : t('customViews.deleteConfirmWorking')
                        }
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button
                        onClick={() => setDeleteConfirmOpen(false)}
                        sx={{ borderRadius: designTokens.radii.lg }}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        onClick={handleClearWorkingArea}
                        variant="contained"
                        color="error"
                        sx={{
                            borderRadius: designTokens.radii.lg,
                            fontWeight: 600,
                        }}
                    >
                        {isPersisted ? t('customViews.deletePermanently') : t('customViews.clearWorkingArea')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Enhanced Assistant Chat Dialog */}
            <Dialog
                open={assistantOpen}
                onClose={() => setAssistantOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 2,
                        background: designTokens.gradients.primary,
                        height: '80vh',
                        display: 'flex',
                        flexDirection: 'column',
                    }
                }}
            >
                <DialogTitle sx={{ pb: 1, borderBottom: 1, borderColor: 'divider' }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <AutoAwesomeIcon color="primary" />
                        <Typography variant="h6" fontWeight="600">
                            {t('customViews.aiComponentGenerator')}
                        </Typography>
                        <Chip
                            label={t('customViews.streamingAI')}
                            size="small"
                            color="primary"
                            variant="outlined"
                        />
                    </Stack>
                </DialogTitle>

                <DialogContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
                    {/* Messages Display */}
                    <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                        {(messages?.length || 0) === 0 ? (
                            <Box textAlign="center" py={4}>
                                <AutoAwesomeIcon sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
                                <Typography variant="h6" gutterBottom>
                                    {t('customViews.generateWithAITitle')}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {t('customViews.generateWithAIDesc')}
                                </Typography>
                            </Box>
                        ) : (
                            <Stack spacing={2}>
                                {messages?.map((message) => (
                                    <Box
                                        key={message?.id || Math.random()}
                                        sx={{
                                            display: 'flex',
                                            justifyContent: message?.role === 'user' ? 'flex-end' : 'flex-start',
                                        }}
                                    >
                                        <Paper
                                            sx={{
                                                p: 2,
                                                maxWidth: '70%',
                                                bgcolor: message?.role === 'user'
                                                    ? 'primary.main'
                                                    : 'background.paper',
                                                color: message?.role === 'user'
                                                    ? 'primary.contrastText'
                                                    : 'text.primary',
                                                borderRadius: 2,
                                            }}
                                        >
                                            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                                                {message?.content || ''}
                                            </Typography>
                                        </Paper>
                                    </Box>
                                )) || []}
                                {(isGenerating || isManuallyGenerating) && (
                                    <Box sx={{ display: 'flex', justifyContent: 'flex-start' }}>
                                        <Paper sx={{ p: 2, borderRadius: 2 }}>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <CircularProgress size={16} />
                                                <Typography variant="body2" color="text.secondary">
                                                    {t('customViews.generatingComponent')}
                                                </Typography>
                                            </Stack>
                                        </Paper>
                                    </Box>
                                )}
                            </Stack>
                        )}
                    </Box>

                    {/* Input Form */}
                    <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                        <form onSubmit={handleChatSubmit}>
                            <Stack direction="row" spacing={1}>
                                <TextField
                                    fullWidth
                                    value={chatInput}
                                    onChange={handleChatInputChange}
                                    placeholder={t('customViews.generatePrompt')}
                                    disabled={isGenerating}
                                    variant="outlined"
                                    size="small"
                                />
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={isGenerating || isManuallyGenerating || !chatInput?.trim()}
                                    startIcon={(isGenerating || isManuallyGenerating) ? <CircularProgress size={16} /> : <SendRoundedIcon />}
                                >
                                    {(isGenerating || isManuallyGenerating) ? t('customViews.generating') : t('customViews.generate')}
                                </Button>
                                {(isGenerating || isManuallyGenerating) && (
                                    <Button
                                        variant="outlined"
                                        color="error"
                                        onClick={() => {
                                            if (typeof stop === 'function') {
                                                stop();
                                            }
                                            setIsManuallyGenerating(false);
                                        }}
                                    >
                                        {t('customViews.stop')}
                                    </Button>
                                )}
                            </Stack>
                        </form>

                        {chatError && (
                            <Alert severity="error" sx={{ mt: 1 }}>
                                {t('customViews.chatError')}
                            </Alert>
                        )}
                    </Box>
                </DialogContent>

                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => {
                        setMessages([]);
                        setChatInput('');
                    }}>
                        {t('customViews.clearChat')}
                    </Button>
                    <Button onClick={() => setAssistantOpen(false)}>
                        {t('common.close')}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Legacy Assistant Chat - keeping for backup */}
            <AssistantChat
                project={project}
                tasks={tasks}
                allTasks={allTasks}
                users={users}
                methodology={methodology}
                viewName={viewName}
                open={false} // Disabled for now, using new streaming chat above
                onClose={() => setAssistantOpen(false)}
                isCustomView={true}
                onSpaGenerated={handleSpaGenerated}
                onProgressUpdate={setGenerationProgress}
                currentComponentCode={memoizedComponentCode}
            />

            {/* Enhanced Snackbar */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{
                        width: '100%',
                        borderRadius: designTokens.radii.lg,
                        fontWeight: 500,
                    }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </AuthenticatedLayout>
    );
}
