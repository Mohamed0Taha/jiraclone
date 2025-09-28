import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
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
    DialogActions,
    Button,
    Typography,
    Stack,
    Chip,
    alpha,
    useTheme,
    CircularProgress,
    LinearProgress,
    keyframes,
    TextField
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import RefreshIcon from '@mui/icons-material/Refresh';
import SaveIcon from '@mui/icons-material/Save';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import CodeIcon from '@mui/icons-material/Code';
import BuildIcon from '@mui/icons-material/Build';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import CollectionsBookmarkIcon from '@mui/icons-material/CollectionsBookmark';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import TableChartIcon from '@mui/icons-material/TableChart';
import ViewKanbanIcon from '@mui/icons-material/ViewKanban';
import ChecklistRtlIcon from '@mui/icons-material/ChecklistRtl';
import MenuBookIcon from '@mui/icons-material/MenuBook';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import PeopleAltIcon from '@mui/icons-material/PeopleAlt';
import SlideshowIcon from '@mui/icons-material/Slideshow';
import CalculateIcon from '@mui/icons-material/Calculate';
import CloudIcon from '@mui/icons-material/Cloud';
import ComputerIcon from '@mui/icons-material/Computer';
import { Fab, Tooltip as MuiTooltip } from '@mui/material';
import AssistantChat from './AssistantChat';
import ReactComponentRenderer from '@/utils/ReactComponentRenderer';
import { csrfFetch } from '@/utils/csrf';
import MicroApps from '@/microapps';
import PusherService from '@/services/PusherService';

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
        tileText: '#FFFFFF',
    },
    shadows: {
        card: '0 4px 16px -8px rgba(0, 0, 0, 0.1)',
        elevated: '0 8px 32px -12px rgba(0, 0, 0, 0.15)',
        floating: '0 16px 48px -16px rgba(0, 0, 0, 0.2)',
        tile: '0 8px 20px rgba(0,0,0,0.25)',
    },
    radii: {
        lg: 12,
        xl: 16,
        tile: 10
    }
};

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(103, 126, 234, 0.7); }
  50% { box-shadow: 0 0 0 10px rgba(103, 126, 234, 0); }
`;
const fadeSlideUp = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;
const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

const WORKFLOW_BASE_SEQUENCE = ['analysis', 'design_research', 'generation', 'post_processing'];
const WORKFLOW_OPTIONAL_STEPS = ['fallback_generation', 'fallback_component'];
const DEFAULT_WORKFLOW_TOTAL = WORKFLOW_BASE_SEQUENCE.length;

export default function CustomView({ auth, project, tasks, allTasks, users, methodology, viewName }) {
    const { t } = useTranslation();
    const { props } = usePage();
    const currentAuth = auth || props.auth?.user || null;

    const [originalViewName, setOriginalViewName] = useState('');
    const createSlug = (name) => {
        return name.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '').replace(/-+/g, '-').replace(/^-|-$/g, '');
    };

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
                if (!cancelled) setOriginalViewName(match?.name || viewName);
            } catch (_e) {
                if (!cancelled) setOriginalViewName(viewName);
            }
        };
        fetchList();
        return () => { cancelled = true; };
    }, [project?.id, viewName]);

    const theme = useTheme();
    const [assistantOpen, setAssistantOpen] = useState(false);
    const [isLocked, setIsLocked] = useState(true);
    const [componentCode, setComponentCode] = useState('');
    const [selectedAppKey, setSelectedAppKey] = useState(null);
    const [customViewId, setCustomViewId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [tileGridEnabled, setTileGridEnabled] = useState(false);
    const [pinnedMicroApps, setPinnedMicroApps] = useState(() => project?.meta?.custom_view_pins ?? {});
    const [pinnedSuppressed, setPinnedSuppressed] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [componentError, setComponentError] = useState(null);
    const [isSaving, setIsSaving] = useState(false);
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
    const [generationProgress, setGenerationProgress] = useState(null);
    const viewKeyRef = useRef(null);
    const userSelectedMicroAppRef = useRef(false);
    const isScaffoldHTML = useCallback((html) => {
        const s = String(html || '');
        if (!s.trim()) return false;
        if (/New\s+Custom\s+View/i.test(s)) return true;
        if (/Generated\s*view\s*:/i.test(s)) return true;
        if (/function\s+GeneratedMicroApp/i.test(s)) return true;
        return false;
    }, []);

    const decodeSelectedMarker = useCallback((html) => {
        const s = String(html || '');
        const m = /\/\*\s*MICROAPP_SELECTED_START\s*\*\/([\s\S]*?)\/\*\s*MICROAPP_SELECTED_END\s*\*\//.exec(s);
        if (!m) return null;
        try {
            const obj = JSON.parse(m[1]);
            if (obj && obj.type === 'builtin_microapp' && obj.appKey) return { appKey: String(obj.appKey), state: obj.state ?? null };
        } catch (_) {}
        return null;
    }, []);

    const readLocalAppState = useCallback((appKey) => {
        try {
            const key = `microapp-${project?.id}-${originalViewName}-${appKey}`;
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (_) { return null; }
    }, [project?.id, originalViewName]);
    const writeLocalAppState = useCallback((appKey, data) => {
        try {
            const key = `microapp-${project?.id}-${originalViewName}-${appKey}`;
            if (data == null) localStorage.removeItem(key);
            else localStorage.setItem(key, JSON.stringify(data));
        } catch (_) {}
    }, [project?.id, originalViewName]);
    const readLatestAppState = useCallback((appKey) => {
        try {
            const key = `microapp-${project?.id}-${originalViewName}-${appKey}`;
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : null;
        } catch (_) { return null; }
    }, [project?.id, originalViewName]);

    const [isPersisted, setIsPersisted] = useState(false);

    const [chatInput, setChatInput] = useState('');
    const [isManuallyGenerating, setIsManuallyGenerating] = useState(false);

    const memoizedComponentCode = useMemo(() => {
        return componentCode && componentCode.trim() ? componentCode : null;
    }, [componentCode]);

    useEffect(() => {
        if (selectedAppKey || memoizedComponentCode) {
            setTileGridEnabled(false);
        }
    }, [selectedAppKey, memoizedComponentCode]);

    useEffect(() => {
        if (!isLoading && !selectedAppKey && !memoizedComponentCode && !componentError && !isPersisted) {
            setTileGridEnabled(true);
        }
    }, [isLoading, selectedAppKey, memoizedComponentCode, componentError, isPersisted]);

    useEffect(() => {
        const pinnedEntry = pinnedMicroApps?.[viewName] ?? pinnedMicroApps?.[originalViewName];
        if (pinnedEntry?.app_key && !pinnedSuppressed) {
            const appKey = pinnedEntry.app_key;
            if (!memoizedComponentCode) {
                if (pinnedEntry.state !== undefined && pinnedEntry.state !== null) {
                    try {
                        writeLocalAppState(appKey, pinnedEntry.state);
                    } catch (_) {}
                }
                if (selectedAppKey !== appKey) {
                    setSelectedAppKey(appKey);
                }
                setIsPersisted(true);
                setTileGridEnabled(false);
                setIsLoading(false);
                userSelectedMicroAppRef.current = true;
                setPinnedSuppressed(false);
            }
        } else if (!memoizedComponentCode && selectedAppKey && !isLoading && (!userSelectedMicroAppRef.current || pinnedSuppressed)) {
            setSelectedAppKey(null);
            setIsPersisted(false);
            setTileGridEnabled(true);
            userSelectedMicroAppRef.current = false;
        }
    }, [pinnedMicroApps, viewName, originalViewName, selectedAppKey, memoizedComponentCode, isLoading, writeLocalAppState, pinnedSuppressed]);

    useEffect(() => {
        const viewKey = `${project?.id || 'unknown'}-${viewName || 'default'}`;
        if (viewKeyRef.current !== viewKey) {
            viewKeyRef.current = viewKey;
            setTileGridEnabled(false);
            setIsLoading(true);
            setSelectedAppKey(null);
            setComponentCode('');
            setComponentError(null);
            setIsPersisted(false);
            setIsLocked(true);
            userSelectedMicroAppRef.current = false;
            setPinnedSuppressed(false);
        }
    }, [project?.id, viewName, originalViewName]);

    useEffect(() => {
        setPinnedMicroApps(project?.meta?.custom_view_pins ?? {});
        setPinnedSuppressed(false);
    }, [project?.meta?.custom_view_pins]);

    const {
        messages,
        isLoading: isGenerating,
        error: chatError,
        append,
        setMessages,
    } = useChat({
        api: `/api/chat`,
        body: {
            projectId: project?.id,
            viewName,
            currentCode: memoizedComponentCode,
            projectContext: {
                project,
                tasks,
                allTasks,
                users,
                methodology,
            },
        },
        onResponse: () => {},
        onFinish: (message) => {
            const wasUpdate = memoizedComponentCode && memoizedComponentCode.trim();
            if (message?.experimental_data?.component_code) {
                setComponentCode(message.experimental_data.component_code);
                setComponentError(null);
                setCustomViewId(message.experimental_data.custom_view_id);
                setIsLocked(false);
                setIsPersisted(false);
                showSnackbar(wasUpdate ? 'Component updated successfully!' : 'Component generated successfully!', 'success');
            } else if (message?.content) {
                const codeMatch = message.content.match(/```(?:jsx?|tsx?|html)?\n?([\s\S]*?)```/);
                if (codeMatch) {
                    setComponentCode(codeMatch[1]);
                    setComponentError(null);
                    setIsLocked(false);
                    setIsPersisted(false);
                    showSnackbar(wasUpdate ? 'Component updated successfully!' : 'Component generated successfully!', 'success');
                } else if (message.content.trim() && !message.content.includes('Failed to generate')) {
                    setComponentCode(message.content);
                    setComponentError(null);
                    setIsLocked(false);
                    setIsPersisted(false);
                    showSnackbar(wasUpdate ? 'Component updated successfully!' : 'Component generated successfully!', 'success');
                } else {
                    showSnackbar(wasUpdate ? 'Failed to update component. Please try again.' : 'Failed to generate component. Please try again.', 'error');
                }
            } else {
                showSnackbar(wasUpdate ? 'No component updates received. Please try again.' : 'No component code received. Please try again.', 'error');
            }
        },
        onError: () => {
            showSnackbar('Failed to generate component. Please try again.', 'error');
            setGenerationProgress(null);
        },
    });

    const handleChatInputChange = (e) => setChatInput(e.target.value);

    const handleChatSubmit = async (e) => {
        e.preventDefault();
        if (!chatInput?.trim() || isGenerating || isManuallyGenerating) return;
        try {
            const hasExistingComponent = Boolean(memoizedComponentCode && memoizedComponentCode.trim());
            setGenerationProgress({
                step: 1,
                stage: hasExistingComponent ? 'prompt_preparation' : 'analysis',
                status: 'in_progress',
                total: hasExistingComponent ? 4 : 5,
                details: hasExistingComponent ? 'Preparing update prompt...' : 'Analyzing your request...'
            });

            const userMessage = { role: 'user', content: chatInput.trim(), id: Date.now().toString() };
            setMessages(prev => [...(prev || []), userMessage]);
            setChatInput('');

            if (typeof append === 'function') {
                await append({ role: 'user', content: userMessage.content });
            } else {
                setIsManuallyGenerating(true);
                try {
                    const response = await csrfFetch('/api/chat', {
                        method: 'POST',
                        body: JSON.stringify({
                            messages: [...(messages || []), userMessage],
                            projectId: project?.id,
                            viewName,
                            currentCode: componentCode,
                            projectContext: { tasks, users, methodology },
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
                                        const exp = parsed.experimental_data || parsed.experimentalData || null;
                                        if (exp?.component_code) streamedComponentCode = exp.component_code;
                                        if (exp?.custom_view_id) streamedCustomViewId = exp.custom_view_id;
                                    } catch (_e) {}
                                }
                            }
                        }

                        setMessages(prev => [...(prev || []), { role: 'assistant', content: assistantMessage, id: Date.now().toString() }]);
                        let nextCode = streamedComponentCode;
                        if (!nextCode) {
                            const codeMatch = assistantMessage.match(/```(?:jsx?|tsx?|html)?\n?([\s\S]*?)```/);
                            if (codeMatch) nextCode = codeMatch[1];
                        }
                        if (!nextCode && assistantMessage.trim() && !assistantMessage.toLowerCase().includes('failed')) {
                            nextCode = assistantMessage.trim();
                        }
                        if (nextCode) {
                            setComponentCode(nextCode);
                            setComponentError(null);
                            if (streamedCustomViewId) setCustomViewId(streamedCustomViewId);
                            setIsLocked(false);
                            setIsPersisted(false);
                            showSnackbar('Component generated successfully!', 'success');
                        } else {
                            showSnackbar('Generation finished, but no component code received. Please try again.', 'warning');
                        }
                    } else {
                        throw new Error('API call failed');
                    }
                } catch (_err) {
                    showSnackbar('Failed to generate component. Please try again.', 'error');
                    setGenerationProgress(null);
                } finally {
                    setIsManuallyGenerating(false);
                }
            }
        } catch (_e) {
            showSnackbar('Failed to send message. Please try again.', 'error');
            setIsManuallyGenerating(false);
            setGenerationProgress(null);
        }
    };

    const handleManualSave = async () => {
        if (isSaving) return;
        const hasCode = Boolean(componentCode && componentCode.trim());
        const hasSelection = Boolean(!hasCode && selectedAppKey);
        if (!hasCode && !hasSelection) return;
        setIsSaving(true);
        try {
            if (hasCode) {
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
                    userSelectedMicroAppRef.current = false;
                } else {
                    throw new Error('Save failed');
                }
            } else if (hasSelection) {
                const latestState = readLatestAppState(selectedAppKey);
                const response = await csrfFetch(`/projects/${project.id}/custom-views/pin`, {
                    method: 'POST',
                    body: JSON.stringify({
                        view_name: viewName,
                        original_name: originalViewName,
                        app_key: selectedAppKey,
                        state: latestState ?? null,
                    }),
                });
                const data = await response.json();
                setPinnedMicroApps(data.pins || {});
                setCustomViewId(null);
                setComponentCode('');
                setIsPersisted(true);
                setIsLocked(true);
                setTileGridEnabled(false);
                userSelectedMicroAppRef.current = true;
                showSnackbar('Micro app pinned to this view', 'success');
            }
        } catch (_e) {
            showSnackbar('Failed to save. Please try again.', 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const progressStageConfig = {
        analysis: { label: 'Analyzing your requirements...', icon: ManageSearchIcon, color: designTokens.colors.primary },
        design_research: { label: 'Reviewing reference designs...', icon: CollectionsBookmarkIcon, color: designTokens.colors.accent },
        generation: { label: 'Generating the React experience...', icon: CodeIcon, color: designTokens.colors.warning },
        fallback_generation: { label: 'Running guarded fallback generation...', icon: ReportProblemIcon, color: designTokens.colors.warning },
        post_processing: { label: 'Polishing with enterprise styling...', icon: BuildIcon, color: designTokens.colors.success },
        prompt_preparation: { label: 'Preparing update prompt...', icon: ManageSearchIcon, color: designTokens.colors.primary },
        default: { label: 'Processing request...', icon: RocketLaunchIcon, color: designTokens.colors.primary },
    };
    const resolveProgressMeta = (progress) => {
        if (!progress) return progressStageConfig.default;
        const stageKey = (progress.stage || progress.step || progress.step_key || progress.status || 'default').toString().toLowerCase();
        return progressStageConfig[stageKey] || progressStageConfig.default;
    };
    const getProgressIcon = (progress) => {
        const meta = resolveProgressMeta(progress);
        const IconComponent = meta.icon || RocketLaunchIcon;
        let color = meta.color || designTokens.colors.primary;
        if (progress?.status === 'failed') color = designTokens.colors.error;
        else if (progress?.status === 'warning') color = designTokens.colors.warning;
        else if (progress?.status === 'completed') color = designTokens.colors.success;
        return <IconComponent sx={{ color }} />;
    };
    const getProgressMessage = (progress) => {
        if (progress?.details) return progress.details;
        return resolveProgressMeta(progress).label;
    };
    const getProgressStatusLine = (progress) => {
        const stageKey = (progress?.stage || progress?.step || 'processing').toString().replace(/_/g, ' ').toLowerCase();
        const statusLabel = (progress?.status || 'in progress').toString().replace(/_/g, ' ').toLowerCase();
        return `${stageKey} • ${statusLabel}`;
    };

    useEffect(() => {
        if (!componentCode || isLocked || !autoSaveEnabled) return;
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
        }, 5000);
        return () => clearTimeout(timeoutId);
    }, [componentCode, isLocked, autoSaveEnabled, project?.id, originalViewName, customViewId, viewName]);

    useEffect(() => {
        const loadCustomView = async () => {
            if (!project?.id || !originalViewName) {
                setIsLoading(false);
                return;
            }
            try {
                const response = await csrfFetch(`/projects/${project.id}/custom-views/get?view_name=${encodeURIComponent(originalViewName)}`);
                const data = await response.json();
                if (data.success && data.html && data.html.trim() && !isScaffoldHTML(data.html)) {
                    const decoded = decodeSelectedMarker(data.html);
                    if (decoded && MicroApps && Object.prototype.hasOwnProperty.call(MicroApps, decoded.appKey)) {
                        if (decoded.state !== undefined) writeLocalAppState(decoded.appKey, decoded.state);
                        setComponentCode('');
                        setSelectedAppKey(decoded.appKey);
                        setCustomViewId(data.customViewId || data.custom_view_id || null);
                        setIsPersisted(true);
                        setTileGridEnabled(false);
                        const existingPinned = pinnedMicroApps?.[viewName] ?? pinnedMicroApps?.[originalViewName];
                        if (!existingPinned || existingPinned.app_key !== decoded.appKey) {
                            try {
                                const migrateResponse = await csrfFetch(`/projects/${project.id}/custom-views/pin`, {
                                    method: 'POST',
                                    body: JSON.stringify({
                                        view_name: viewName,
                                        original_name: originalViewName,
                                        app_key: decoded.appKey,
                                        state: decoded.state ?? null,
                                    }),
                                });
                                const migrateData = await migrateResponse.json();
                                setPinnedMicroApps(migrateData.pins || {});
                            } catch (_) {}
                        }
                        console.log('[CustomView] Micro app preloaded from saved view', decoded.appKey);
                        userSelectedMicroAppRef.current = true;
                    } else {
                        setComponentCode(data.html);
                        setSelectedAppKey(null);
                        setCustomViewId(data.customViewId || data.custom_view_id || null);
                        setIsPersisted(true);
                        setTileGridEnabled(false);
                        userSelectedMicroAppRef.current = false;
                        console.log('[CustomView] Component code loaded from saved view');
                    }
                } else {
                    setComponentCode('');
                    if (!userSelectedMicroAppRef.current) {
                        setSelectedAppKey(null);
                    }
                    setCustomViewId(null);
                    setIsPersisted(false);
                    setIsLocked(true);
                    const backupKey = `microapp-backup-${project.id}-${originalViewName}`;
                    localStorage.removeItem(backupKey);
                    const pinnedEntry = pinnedMicroApps?.[viewName] ?? pinnedMicroApps?.[originalViewName];
                    setTileGridEnabled(!pinnedEntry);
                    const msg = (data.message || '').toLowerCase();
                    const isNotFound = msg.includes('no custom view') || msg.includes('not found');
                    showSnackbar(isNotFound ? 'No saved micro-app exists yet. Click Create with AI to generate one.' : (data.message || 'Could not load micro-application.'), 'info');
                }
            } catch (_e) {
                const backupKey = `microapp-backup-${project.id}-${originalViewName}`;
                const backup = localStorage.getItem(backupKey);
                if (backup) {
                    try {
                        const backupData = JSON.parse(backup);
                        setComponentCode(backupData.componentCode || '');
                        setCustomViewId(backupData.customViewId);
                        setIsPersisted(false);
                        const hasBackupCode = Boolean(backupData.componentCode && String(backupData.componentCode).trim());
                        setTileGridEnabled(!hasBackupCode);
                        userSelectedMicroAppRef.current = false;
                    } catch (_err) {
                        setComponentCode('');
                        setIsPersisted(false);
                        setTileGridEnabled(true);
                        userSelectedMicroAppRef.current = false;
                    }
                } else {
                    const pinnedEntry = pinnedMicroApps?.[viewName] ?? pinnedMicroApps?.[originalViewName];
                    if (pinnedEntry?.app_key) {
                        setComponentCode('');
                        setSelectedAppKey(pinnedEntry.app_key);
                        setIsPersisted(true);
                        setIsLocked(true);
                        setTileGridEnabled(false);
                        setIsLoading(false);
                        userSelectedMicroAppRef.current = true;
                        if (pinnedEntry.state !== undefined && pinnedEntry.state !== null) {
                            try {
                                writeLocalAppState(pinnedEntry.app_key, pinnedEntry.state);
                            } catch (_) {}
                        }
                        return;
                    }

                    const defaultScaffold = `export default function HelloMicroApp() {
  const [message, setMessage] = React.useState('');
  return (
    <div style={{padding:20,fontFamily:'Inter, system-ui, Arial'}}>
      <h2 style={{margin:0, marginBottom:8}}>Welcome to your Micro-App</h2>
      <p>Project: {projectData?.name || 'Unknown'}</p>
      <p>Tasks available: {Array.isArray(tasksDataFromProps) ? tasksDataFromProps.length : 0}</p>
      <button onClick={() => setMessage('It works!')} style={{padding:'8px 12px', borderRadius:8, border:'1px solid #ddd', background:'#fff'}}>Click me</button>
      {message && <p style={{marginTop:10, color:'#059669', fontWeight:500}}>{message}</p>}
    </div>
  );
}`;
                    setComponentCode(defaultScaffold);
                    setIsLocked(false);
                    setIsPersisted(false);
                    setTileGridEnabled(false);
                    userSelectedMicroAppRef.current = false;
                }
            } finally {
                setIsLoading(false);
            }
        };
        loadCustomView();
    }, [project?.id, originalViewName, viewName, decodeSelectedMarker, isScaffoldHTML, writeLocalAppState, pinnedMicroApps]);

    useEffect(() => {
        if (!project?.id || !originalViewName) return;
        const privateChannelName = `private-custom-view.${project.id}.${originalViewName}`;
        const eventName = 'custom-view-data-updated';

        const channel = PusherService.subscribe(privateChannelName);
        if (!channel) {
            console.warn('[CustomView] Realtime unavailable - subscription failed:', privateChannelName);
            return;
        }

        const handler = (evt) => {
            if (evt?.data_key === 'workflow_step') {
                if (evt.user?.id && evt.user.id !== currentAuth?.id) return;
                const payload = evt.data || {};
                const total = Number(payload.total) || 5;
                const sequence = Number(payload.sequence) || 1;
                const stageKey = payload.step || payload.stage || payload.step_key || 'analysis';
                const status = payload.status || 'in_progress';

                setGenerationProgress((prev) => {
                    const base = prev || {};
                    const nextStage = stageKey || base.stage || 'analysis';
                    const nextStatus = status || base.status || 'in_progress';
                    const nextDetails = payload.details || base.details || resolveProgressMeta({ stage: nextStage }).label;
                    return { ...base, step: sequence, stage: nextStage, status: nextStatus, total, details: nextDetails, timestamp: evt.timestamp, step_key: nextStage };
                });

                if (status === 'failed') showSnackbar(payload.details || 'Generation encountered an error.', 'error');
                else if (status === 'warning' && payload.details) showSnackbar(payload.details, 'warning');

                const completedFinalStage =
                    (stageKey === 'post_processing' && status === 'completed') ||
                    (status === 'failed') ||
                    (sequence >= total && status === 'completed');

                if (completedFinalStage) setTimeout(() => setGenerationProgress(null), 1500);
                return;
            }

            if (evt?.user?.id !== currentAuth?.id) {
                const reloadComponent = async () => {
                    try {
                        const response = await csrfFetch(`/projects/${project.id}/custom-views/get?view_name=${encodeURIComponent(originalViewName)}`);
                        const data = await response.json();
                        if (data.success && data.html && data.html.trim() && !isScaffoldHTML(data.html)) {
                            setComponentCode(data.html);
                            setSelectedAppKey(null);
                            setTileGridEnabled(false);
                            showSnackbar(`Component updated by ${evt.user?.name || 'another user'}`, 'info');
                        } else {
                            setComponentCode('');
                            setIsPersisted(false);
                            setSelectedAppKey(null);
                            setTileGridEnabled(true);
                            showSnackbar(`Component removed or unavailable${evt.user?.name ? ' (by ' + evt.user.name + ')' : ''}`, 'info');
                        }
                    } catch (_e) {}
                };
                reloadComponent();
            }
        };

        channel.bind(eventName, handler);

        return () => {
            if (channel && channel.unbind) {
                channel.unbind(eventName, handler);
            }
            PusherService.unsubscribe(privateChannelName);
        };
    }, [project?.id, originalViewName, currentAuth?.id, isScaffoldHTML]);

    const handleSpaGenerated = useCallback((payload, meta) => {
        if (typeof payload === 'string') {
            setComponentCode(payload);
            setCustomViewId(meta?.custom_view_id || meta?.customViewId || null);
            setIsPersisted(true);
            setGenerationProgress(null);
            showSnackbar('Micro-application generated successfully!', 'success');
            setIsLocked(false);
            setTileGridEnabled(false);
            return;
        }
        if (payload && payload.component_code) {
            setComponentCode(payload.component_code);
            setCustomViewId(payload.customViewId || payload.custom_view_id || meta?.custom_view_id || null);
            setIsPersisted(true);
            setGenerationProgress(null);
            showSnackbar('Micro-application generated successfully!', 'success');
            setIsLocked(false);
            setTileGridEnabled(false);
            return;
        }
        if (payload && payload.html) {
            setComponentCode(payload.html);
            setCustomViewId(payload.customViewId || meta?.custom_view_id || null);
            setIsPersisted(true);
            setGenerationProgress(null);
            showSnackbar('Micro-application generated successfully!', 'success');
            setIsLocked(false);
            setTileGridEnabled(false);
            return;
        }
        setGenerationProgress(null);
        showSnackbar('Generation completed but format was unexpected', 'warning');
    }, []);

    const handleToggleLock = () => {
        setIsLocked(!isLocked);
        showSnackbar(isLocked ? 'Micro-application unlocked for editing' : 'Micro-application locked', 'info');
    };
    const handleRefresh = () => window.location.reload();

    const handleClearWorkingArea = async () => {
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes(`microapp-`) || key.includes(`${project?.id}-${originalViewName}`))) keysToRemove.push(key);
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        if (selectedAppKey && isPersisted && !memoizedComponentCode) {
            try {
                const response = await csrfFetch(`/projects/${project.id}/custom-views/pin`, {
                    method: 'DELETE',
                    body: JSON.stringify({ view_name: viewName, original_name: originalViewName }),
                });
                const data = await response.json();
                setPinnedMicroApps(data.pins || {});
                showSnackbar('Micro app unpinned from this view', 'success');
            } catch (error) {
                console.error('Failed to unpin micro app', error);
                showSnackbar('Failed to unpin micro app. Local state cleared.', 'warning');
            }
        }

        try {
            const response = await csrfFetch(`/projects/${project.id}/custom-views/delete`, {
                method: 'DELETE',
                body: JSON.stringify({ view_name: originalViewName, custom_view_id: customViewId || null }),
            });
            if (response.ok) {
                const data = await response.json();
                if (data.success) showSnackbar('Micro-application deleted permanently', 'success');
                else showSnackbar(data.message || 'No persisted application found. Local state cleared.', 'info');
            } else {
                showSnackbar('Server deletion failed. Local state cleared.', 'warning');
            }
        } catch (_e) {
            showSnackbar('Server unreachable. Local state cleared.', 'warning');
        }
        setComponentCode('');
        setCustomViewId(null);
        setIsPersisted(false);
        setIsLocked(true);
        setDeleteConfirmOpen(false);
        setSelectedAppKey(null);
        setTileGridEnabled(true);
        userSelectedMicroAppRef.current = false;
        setPinnedSuppressed(false);
        try {
            const prefix = `microapp-${project?.id}-${originalViewName}-`;
            const toRemove = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith(prefix)) toRemove.push(key);
            }
            toRemove.forEach((k) => localStorage.removeItem(k));
        } catch (_) {}
    };

    const buildTemplateCode = useCallback((templateKey) => {
        const tpl = String(templateKey || '').trim();
        if (!tpl) return null;
        return `export default function ReadyMade(){
  return (
    <div style={{padding:16}}>{React.createElement(Templates.${tpl}, null)}</div>
  );
}`;
    }, []);

    const handleCreateReadyMade = useCallback((key) => {
        if (MicroApps && Object.prototype.hasOwnProperty.call(MicroApps, key)) {
            setSelectedAppKey(key);
            setComponentCode('');
            setIsLocked(true);
            setIsPersisted(false);
            setTileGridEnabled(false);
            setIsLoading(false);
            userSelectedMicroAppRef.current = true;
            showSnackbar(`${key} loaded.`, 'success');
            return;
        }
        const code = buildTemplateCode(key);
        if (!code) return;
        setSelectedAppKey(null);
        setComponentCode(code);
        setIsLocked(false);
        setIsPersisted(false);
        setTileGridEnabled(false);
        setIsLoading(false);
        userSelectedMicroAppRef.current = false;
        showSnackbar(`${key} created. You can customize and save.`, 'success');
    }, [buildTemplateCode]);

    const handleEmergencyReset = useCallback(async () => {
        setComponentCode('');
        setCustomViewId(null);
        setComponentError(null);
        setIsPersisted(false);
        setIsLocked(true);
        setTileGridEnabled(true);
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (key.includes(`microapp-`) || key.includes(`${project?.id}-${originalViewName}`))) keysToRemove.push(key);
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        showSnackbar('Component reset. You can now generate a new micro-application.', 'info');
        if (selectedAppKey && !memoizedComponentCode) {
            try {
                if (!project?.meta || Object.keys(project.meta).length === 0) {
                    const response = await csrfFetch(`/projects/${project.id}/custom-views/pin`, {
                        method: 'DELETE',
                        body: JSON.stringify({ view_name: viewName, original_name: originalViewName }),
                    });
                    const data = await response.json();
                    setPinnedMicroApps(data.pins || {});
                }
            } catch (error) {
                console.error('Failed to unpin during emergency reset', error);
            }
            setSelectedAppKey(null);
            userSelectedMicroAppRef.current = false;
        }
    }, [project?.id, originalViewName, selectedAppKey, memoizedComponentCode, viewName]);

    const handleBackClick = useCallback(() => {
        if (typeof window !== 'undefined' && window.history.length > 1) {
            window.history.back();
            return;
        }

        setSelectedAppKey(null);
        setTileGridEnabled(true);
        setComponentCode('');
        setIsLocked(true);
        setIsPersisted(false);
        setCustomViewId(null);
        setIsLoading(false);
        userSelectedMicroAppRef.current = false;
        setPinnedSuppressed(true);
    }, [setSelectedAppKey, setTileGridEnabled, setComponentCode, setIsLocked, setIsPersisted, setCustomViewId, setPinnedSuppressed]);

    const handleComponentError = (error) => {
        setComponentError(error);
        showSnackbar('Component error: ' + error, 'error');
        const e = String(error || '').toLowerCase();
        const isCritical = e.includes('already been declared') || e.includes('syntaxerror') || e.includes('freeze') || e.includes('babel') || e.includes('requires a filename');
        if (isCritical) {
            setTimeout(() => {
                setComponentCode('');
                setComponentError(null);
                setTileGridEnabled(true);
                showSnackbar('Component cleared due to critical error (e.g., Babel/preset/filename). Please regenerate.', 'warning');
            }, 250);
        }
    };

    const showSnackbar = (message, severity = 'info') => setSnackbar({ open: true, message, severity });
    const handleCloseSnackbar = () => setSnackbar({ ...snackbar, open: false });

    /**
     * WINDOWS 10-STYLE LIVE TILES
     * Sizes:
     *  - small: 1x1
     *  - wide:  2x1
     *  - tall:  1x2
     *  - large: 2x2
     * Grid: 4 columns, auto-rows. Each unit cell is 84px tall (responsive on small screens).
     * Only real, supported tiles are listed below (no fictional tiles).
     */
    const tiles = [
        { key: 'Calendar', title: 'Calendar', size: 'wide', bg: 'linear-gradient(135deg,#4F46E5,#06B6D4)', Icon: CalendarMonthIcon },
        { key: 'Spreadsheet', title: 'Sheets', size: 'small', bg: 'linear-gradient(135deg,#059669,#34D399)', Icon: TableChartIcon },
        { key: 'CRMBoard', title: 'CRM', size: 'small', bg: 'linear-gradient(135deg,#F59E0B,#F97316)', Icon: ViewKanbanIcon },
        { key: 'OKRTracker', title: 'OKRs', size: 'large', bg: 'linear-gradient(135deg,#EC4899,#A855F7)', Icon: ChecklistRtlIcon },
        { key: 'WikiPage', title: 'Wiki', size: 'wide', bg: 'linear-gradient(135deg,#14B8A6,#22D3EE)', Icon: MenuBookIcon },
        { key: 'HRLeave', title: 'Leave', size: 'small', bg: 'linear-gradient(135deg,#0EA5E9,#38BDF8)', Icon: PeopleAltIcon },
        { key: 'Slides', title: 'Slides', size: 'wide', bg: 'linear-gradient(135deg,#0EA5E9,#6366F1)', Icon: SlideshowIcon },
        { key: 'Calculator', title: 'Calculator', size: 'small', bg: 'linear-gradient(135deg,#22C55E,#16A34A)', Icon: CalculateIcon },
        { key: 'Messaging', title: 'Messaging', size: 'wide', bg: 'linear-gradient(135deg,#6366F1,#8B5CF6)', Icon: ChatBubbleOutlineIcon },
    ];

    const sizeToSpan = (size) => {
        switch (size) {
            case 'wide': return { col: 2, row: 1 };
            case 'tall': return { col: 1, row: 2 };
            case 'large': return { col: 2, row: 2 };
            default: return { col: 1, row: 1 };
        }
    };

    const Tile = ({ item }) => {
        const { key, title, size, bg, Icon } = item;
        const span = sizeToSpan(size);
        return (
            <Box
                key={key}
                onClick={() => handleCreateReadyMade(key)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCreateReadyMade(key); }}
                role="button"
                tabIndex={0}
                sx={{
                    gridColumn: `span ${span.col}`,
                    gridRow: `span ${span.row}`,
                    position: 'relative',
                    cursor: 'pointer',
                    borderRadius: 0,
                    background: bg,
                    boxShadow: designTokens.shadows.tile,
                    padding: span.col === 2 || span.row === 2 ? 2.25 : 1.5,
                    overflow: 'hidden',
                    color: designTokens.colors.tileText,
                    display: 'flex',
                    alignItems: 'flex-end',
                    minHeight: 0,
                    transition: 'transform 160ms ease, box-shadow 160ms ease, filter 160ms ease',
                    '&:hover': {
                        transform: 'translateY(-3px)',
                        boxShadow: '0 14px 28px rgba(0,0,0,0.35)',
                        filter: 'saturate(1.1)',
                    },
                    '&:active': {
                        transform: 'translateY(-1px)',
                    },
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        background: 'linear-gradient(180deg, rgba(255,255,255,0.15), rgba(255,255,255,0) 60%)',
                        pointerEvents: 'none',
                    }
                }}
            >
                <Box sx={{ position: 'absolute', top: 10, left: 10, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Box sx={{
                        width: span.col === 2 || span.row === 2 ? 44 : 34,
                        height: span.col === 2 || span.row === 2 ? 44 : 34,
                        borderRadius: 2,
                        backgroundColor: 'rgba(255,255,255,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backdropFilter: 'blur(2px)'
                    }}>
                        <Icon sx={{ fontSize: span.col === 2 || span.row === 2 ? 28 : 22, color: '#fff' }} />
                    </Box>
                </Box>

                <Typography
                    variant={span.col === 2 || span.row === 2 ? 'h6' : 'subtitle2'}
                    sx={{
                        fontWeight: 700,
                        letterSpacing: 0.2,
                        textShadow: '0 1px 2px rgba(0,0,0,0.35)',
                        userSelect: 'none'
                    }}
                >
                    {title}
                </Typography>
            </Box>
        );
    };

    const WindowsTileGrid = () => {
        return (
            <Box sx={{ width: '100%', maxWidth: 1100, mx: 'auto', mb: 2, px: { xs: 1, md: 2 } }}>
                <Box
                    sx={{
                        '--rowH': { xs: '70px', sm: '84px', md: '96px' },
                        '--gap': { xs: '10px', sm: '12px', md: '14px' },
                        display: 'grid',
                        gridTemplateColumns: 'repeat(4, minmax(0, 1fr))',
                        gridAutoRows: 'var(--rowH)',
                        gap: 'var(--gap)',
                        alignItems: 'stretch',
                        justifyItems: 'stretch',
                        maxHeight: 'calc((4 * var(--rowH)) + (3 * var(--gap)))',
                        overflowY: 'auto',
                        gridAutoFlow: 'dense',
                    }}
                >
                    {tiles.map((item) => (
                        <Tile key={item.key} item={item} />
                    ))}
                </Box>
            </Box>
        );
    };

    return (
        <AuthenticatedLayout user={auth}>
            <Head title={`${t('customViews.headTitle', { name: originalViewName, project: project.name })}`} />

            <Dialog
                open={Boolean(generationProgress && (isGenerating || isManuallyGenerating))}
                disableEscapeKeyDown
                PaperProps={{
                    sx: {
                        borderRadius: designTokens.radii.xl,
                        minWidth: 400,
                        background: (theme) => theme.palette.mode === 'dark' ? theme.palette.background.paper : designTokens.gradients.primary,
                        boxShadow: designTokens.shadows.floating,
                    }
                }}
                hideBackdrop
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
                            {getProgressIcon(generationProgress)}
                        </Box>

                        <Box sx={{ width: '100%' }}>
                            <Typography variant="h6" fontWeight="600" color="text.primary" mb={1}>
                                {getProgressMessage(generationProgress)}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {getProgressStatusLine(generationProgress)}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" mb={2} display="block">
                                Step {generationProgress?.step || 1} of {generationProgress?.total || 5}
                            </Typography>
                            <LinearProgress
                                variant="determinate"
                                value={((generationProgress?.step || 1) / (generationProgress?.total || 5)) * 100}
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

            <Box sx={{
                background: (theme) => theme.palette.mode === 'dark' ? theme.palette.background.default : designTokens.gradients.primary,
                minHeight: '100vh',
                p: 3
            }}>
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
                        <Tooltip title={componentCode ? t('customViews.updateApplication') : t('customViews.generateNewApplication')} placement="left">
                            <IconButton
                                onClick={() => setAssistantOpen(true)}
                                sx={{
                                    p: 2,
                                    borderRadius: 0,
                                    background: designTokens.gradients.accent,
                                    color: 'white',
                                    '&:hover': { background: designTokens.gradients.accent, transform: 'scale(1.05)' },
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <AutoAwesomeIcon />
                            </IconButton>
                        </Tooltip>

                        {componentCode && (
                            <Tooltip title={isLocked ? t('customViews.unlockForEditing') : t('customViews.lockApplication')} placement="left">
                                <IconButton
                                    onClick={handleToggleLock}
                                    sx={{
                                        p: 2,
                                        borderRadius: 0,
                                        color: isLocked ? designTokens.colors.warning : designTokens.colors.primary,
                                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                        '&:hover': { background: alpha(isLocked ? designTokens.colors.warning : designTokens.colors.primary, 0.1) },
                                    }}
                                >
                                    {isLocked ? <LockIcon /> : <LockOpenIcon />}
                                </IconButton>
                            </Tooltip>
                        )}

                        {componentCode && (
                            <Tooltip title={t('customViews.refreshApplication')} placement="left">
                                <IconButton
                                    onClick={handleRefresh}
                                    sx={{
                                        p: 2,
                                        borderRadius: 0,
                                        color: theme.palette.text.secondary,
                                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                        '&:hover': { background: alpha(theme.palette.text.secondary, 0.1) },
                                    }}
                                >
                                    <RefreshIcon />
                                </IconButton>
                            </Tooltip>
                        )}

                        {(componentCode || selectedAppKey) && (
                            <Tooltip title={isPersisted ? (componentCode ? t('customViews.deleteSavedApplication') : 'Unpin micro app') : (componentCode ? t('customViews.saveApplication') : 'Pin micro app to this view')} placement="left">
                                <IconButton
                                    onClick={isPersisted ? () => setDeleteConfirmOpen(true) : handleManualSave}
                                    disabled={isSaving}
                                    sx={{
                                        p: 2,
                                        borderRadius: 0,
                                        color: isPersisted ? designTokens.colors.error : theme.palette.text.secondary,
                                        borderTop: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                        '&:hover': { background: alpha(isPersisted ? designTokens.colors.error : theme.palette.text.secondary, 0.1) },
                                    }}
                                >
                                    {isSaving ? <CircularProgress size={20} /> : (isPersisted ? <DeleteIcon /> : <SaveIcon />)}
                                </IconButton>
                            </Tooltip>
                        )}

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
                                        '&:hover': { background: designTokens.colors.error, transform: 'scale(1.05)' },
                                        animation: `${pulseGlow} 2s infinite`,
                                    }}
                                >
                                    <RefreshIcon />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                </Paper>

                {selectedAppKey && (
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, mr: 10 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <IconButton
                                onClick={handleBackClick}
                                sx={{
                                    backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.9),
                                    color: theme.palette.text.primary,
                                    border: `1px solid ${alpha(designTokens.colors.primary, 0.2)}`,
                                    '&:hover': { backgroundColor: (theme) => theme.palette.background.paper, transform: 'translateX(-2px)' },
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                <ArrowBackIcon />
                            </IconButton>
                            <Typography variant="h6" sx={{ ml: 2, fontWeight: 600 }}>
                                {selectedAppKey}
                            </Typography>
                        </Box>
                        {/* Cloud/Local toggle button for micro apps */}
                        <Box id="cloud-local-toggle-container" />
                    </Box>
                )}

                <Paper
                    elevation={0}
                    sx={{
                        mt: selectedAppKey ? 0 : 2,
                        mr: 10,
                        p: 0,
                        borderRadius: 3,
                        overflow: 'hidden',
                        background: (theme) => alpha(theme.palette.background.paper, 0.8),
                        backdropFilter: 'blur(12px)',
                        border: isLocked ? `2px solid ${designTokens.colors.success}` : `2px dashed ${alpha(designTokens.colors.primary, 0.3)}`,
                        boxShadow: designTokens.shadows.elevated,
                        minHeight: 'calc(100vh - 200px)',
                        position: 'relative',
                        animation: `${fadeSlideUp} 0.8s ease-out`,
                    }}
                >
                    {selectedAppKey ? (
                        <Box sx={{ position: 'relative', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 200px)' }}>
                            {(() => {
                                const App = MicroApps?.[selectedAppKey] || null;
                                return App ? (
                                    <App projectId={project?.id} viewName={originalViewName} />
                                ) : (
                                    <Typography variant="body2" color="text.secondary" sx={{ p: 3 }}>
                                        Unknown app: {String(selectedAppKey)}
                                    </Typography>
                                );
                            })()}
                        </Box>
                    ) : memoizedComponentCode && !componentError ? (
                        <Box sx={{ position: 'relative' }}>
                            <ReactComponentRenderer
                                componentCode={memoizedComponentCode}
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
                    ) : (tileGridEnabled && !isLoading && !selectedAppKey && !memoizedComponentCode && !componentError) ? (
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            height: 'auto',
                            p: { xs: 2, md: 3 },
                            pt: { xs: 3, md: 4 },
                            textAlign: 'center',
                            overflow: 'visible',
                        }}>
                            <WindowsTileGrid />

                            <Button
                                variant="contained"
                                size="large"
                                onClick={() => setAssistantOpen(true)}
                                startIcon={<AutoAwesomeIcon />}
                                sx={{
                                    mt: 3,
                                    borderRadius: designTokens.radii.lg,
                                    background: designTokens.gradients.accent,
                                    px: 3,
                                    py: 1.25,
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
                                Create with AI
                            </Button>
                        </Box>
                    ) : (
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
                                {isLoading ? t('customViews.loadingStudio') : 'Preparing your workspace...'}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {isLoading ? t('customViews.preparingEnvironment') : 'Please hold on while we finalize this view.'}
                            </Typography>
                        </Box>
                    )}
                </Paper>
            </Box>

            <Dialog
                open={deleteConfirmOpen}
                onClose={() => setDeleteConfirmOpen(false)}
                PaperProps={{ sx: { borderRadius: 2, background: designTokens.gradients.primary } }}
            >
                <DialogTitle sx={{ pb: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <Box sx={{
                            width: 40, height: 40, borderRadius: '50%',
                            background: alpha(designTokens.colors.error, 0.1),
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                        {isPersisted ? t('customViews.deleteConfirmSaved') : t('customViews.deleteConfirmWorking')}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 3, pt: 1 }}>
                    <Button onClick={() => setDeleteConfirmOpen(false)} sx={{ borderRadius: designTokens.radii.lg }}>
                        {t('common.cancel')}
                    </Button>
                    <Button
                        onClick={handleClearWorkingArea}
                        variant="contained"
                        color="error"
                        sx={{ borderRadius: designTokens.radii.lg, fontWeight: 600 }}
                    >
                        {isPersisted ? t('customViews.deletePermanently') : t('customViews.clearWorkingArea')}
                    </Button>
                </DialogActions>
            </Dialog>

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
                <DialogTitle sx={{ pb: 1, borderBottom: 1, borderColor: 'divider', position: 'relative' }}>
                    <Stack direction="row" alignItems="center" spacing={2}>
                        <AutoAwesomeIcon color="primary" />
                        <Typography variant="h6" fontWeight="600">
                            {t('customViews.aiComponentGenerator')}
                        </Typography>
                        <Chip label={t('customViews.streamingAI')} size="small" color="primary" variant="outlined" />
                    </Stack>
                    <IconButton
                        aria-label={t('common.close')}
                        onClick={() => setAssistantOpen(false)}
                        sx={{ position: 'absolute', right: 8, top: 6, width: 32, height: 32, borderRadius: '50%' }}
                    >
                        <CloseRoundedIcon />
                    </IconButton>
                </DialogTitle>

                <DialogContent sx={{ flex: 1, display: 'flex', flexDirection: 'column', p: 0 }}>
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
                                        sx={{ display: 'flex', justifyContent: message?.role === 'user' ? 'flex-end' : 'flex-start' }}
                                    >
                                        <Paper
                                            sx={{
                                                p: 2,
                                                maxWidth: '70%',
                                                bgcolor: message?.role === 'user' ? 'primary.main' : 'background.paper',
                                                color: message?.role === 'user' ? 'primary.contrastText' : 'text.primary',
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
                                                    {getProgressMessage(generationProgress)}
                                                </Typography>
                                            </Stack>
                                        </Paper>
                                    </Box>
                                )}
                            </Stack>
                        )}
                    </Box>

                    <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                        <form onSubmit={handleChatSubmit}>
                            <Stack direction="row" spacing={1.25} alignItems="center">
                                <TextField
                                    fullWidth
                                    multiline
                                    minRows={2}
                                    maxRows={6}
                                    value={chatInput}
                                    onChange={handleChatInputChange}
                                    placeholder={t('customViews.generatePrompt')}
                                    disabled={isGenerating}
                                    variant="outlined"
                                    size="medium"
                                    sx={{ flex: '1 1 auto', '& .MuiInputBase-root': { alignItems: 'flex-start', py: 1.25 } }}
                                />
                                <IconButton
                                    type="submit"
                                    color="primary"
                                    disabled={isGenerating || isManuallyGenerating || !chatInput?.trim()}
                                    sx={{ width: 44, height: 44, borderRadius: '50%' }}
                                >
                                    {(isGenerating || isManuallyGenerating) ? <CircularProgress size={20} /> : <SendRoundedIcon />}
                                </IconButton>
                            </Stack>
                        </form>

                        {chatError && (
                            <Alert severity="error" sx={{ mt: 1 }}>
                                {t('customViews.chatError')}
                            </Alert>
                        )}
                    </Box>
                </DialogContent>
            </Dialog>

            <AssistantChat
                project={project}
                tasks={tasks}
                allTasks={allTasks}
                users={users}
                methodology={methodology}
                viewName={viewName}
                open={false}
                onClose={() => setAssistantOpen(false)}
                isCustomView={true}
                onSpaGenerated={handleSpaGenerated}
                onProgressUpdate={setGenerationProgress}
                currentComponentCode={memoizedComponentCode}
            />

            <Snackbar
                open={snackbar.open}
                autoHideDuration={4000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbar.severity}
                    sx={{ width: '100%', borderRadius: designTokens.radii.lg, fontWeight: 500 }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </AuthenticatedLayout>
    );
}
