import React, { useEffect, useState } from 'react';
import {
    Box,
    Button,
    Typography,
    Paper,
    Stack,
    Grid,
    IconButton,
    Chip,
    Alert,
    Tooltip,
    Card,
    CardContent,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Slide,
    Snackbar,
    alpha,
    useTheme,
    Avatar,
    LinearProgress,
} from '@mui/material';
import { keyframes } from '@mui/system';
import {
    Add as AddIcon,
    PlayArrow as PlayIcon,
    Pause as PauseIcon,
    Delete as DeleteIcon,
    Edit as EditIcon,
    ArrowBack as ArrowBackIcon,
    AutoAwesome as AutoAwesomeIcon,
    Rocket as RocketIcon,
    Settings as SettingsIcon,
    DeleteForever as DeleteForeverIcon,
    WarningAmber as WarningAmberIcon,
} from '@mui/icons-material';
import { router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import WorkflowBuilder from './components/WorkflowBuilder';
import WorkflowTemplates from './components/WorkflowTemplates';
import { useSubscription } from '@/Hooks/useSubscription';
import FeatureOverlay from '@/Components/FeatureOverlay';

// --- SVG Icons with Vibrant Colors ---
const KawaiiMail = ({ size = 44 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <defs>
            <linearGradient
                id="mail_g"
                x1="0"
                y1="0"
                x2="64"
                y2="64"
                gradientUnits="userSpaceOnUse"
            >
                <stop stopColor="#25D3B3" />
                <stop offset="1" stopColor="#15C6A9" />
            </linearGradient>
        </defs>
        <rect x="6" y="10" width="52" height="40" rx="14" fill="url(#mail_g)" />
        <path
            d="M12 18l20 14c.6.4 1.4.4 2 0l20-14"
            stroke="#0B8A72"
            strokeWidth="3"
            strokeLinecap="round"
        />
        <path
            d="M23 36c1.6 2.2 6.4 2.2 8 0"
            stroke="#0B8A72"
            strokeWidth="3"
            strokeLinecap="round"
        />
        <circle cx="25" cy="30" r="2.5" fill="#0B8A72" />
        <circle cx="39" cy="30" r="2.5" fill="#0B8A72" />
    </svg>
);
const KawaiiCalendar = ({ size = 44 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <defs>
            <linearGradient id="cal_g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                <stop stopColor="#4D9FFF" />
                <stop offset="1" stopColor="#2A8CFF" />
            </linearGradient>
        </defs>
        <rect x="7" y="12" width="50" height="38" rx="12" fill="url(#cal_g)" />
        <rect x="10" y="20" width="44" height="2.8" rx="1.4" fill="#0A5ACB" />
        <circle cx="24" cy="31" r="2.6" fill="#0A5ACB" />
        <circle cx="40" cy="31" r="2.6" fill="#0A5ACB" />
        <path d="M26 38c2 2.2 10 2.2 12 0" stroke="#0A5ACB" strokeWidth="3" strokeLinecap="round" />
        <rect x="18" y="8" width="6" height="8" rx="3" fill="#0A5ACB" />
        <rect x="41" y="8" width="6" height="8" rx="3" fill="#0A5ACB" />
    </svg>
);
const KawaiiBell = ({ size = 44 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <defs>
            <linearGradient
                id="bell_g"
                x1="0"
                y1="0"
                x2="64"
                y2="64"
                gradientUnits="userSpaceOnUse"
            >
                <stop stopColor="#FFB961" />
                <stop offset="1" stopColor="#FFA84D" />
            </linearGradient>
        </defs>
        <path
            d="M32 10c-8.8 0-16 7.2-16 16v6c0 2.4-1.2 4.6-3.2 6l-2.3 1.7c-1 .8-.4 2.3.8 2.3h43.4c1.2 0 1.8-1.5.8-2.3L53.2 38a7.5 7.5 0 01-3.2-6v-6C50 17.2 40.8 10 32 10z"
            fill="url(#bell_g)"
        />
        <circle cx="26" cy="26.5" r="2.3" fill="#B06A1A" />
        <circle cx="38" cy="26.5" r="2.3" fill="#B06A1A" />
        <path
            d="M28 32c2.1 1.7 6 1.7 8.1 0"
            stroke="#B06A1A"
            strokeWidth="3"
            strokeLinecap="round"
        />
        <circle cx="32" cy="50" r="4.2" fill="#E8922A" />
    </svg>
);
const KawaiiWebhook = ({ size = 44 }) => (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none">
        <defs>
            <linearGradient id="wh_g" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
                <stop stopColor="#A97CFF" />
                <stop offset="1" stopColor="#965CFF" />
            </linearGradient>
        </defs>
        <circle cx="32" cy="32" r="20" fill="url(#wh_g)" />
        <path
            d="M22 38c2 3.5 6 6 10 6s8-2.5 10-6"
            stroke="#5E28C8"
            strokeWidth="3"
            strokeLinecap="round"
        />
        <circle cx="24" cy="28" r="2.4" fill="#5E28C8" />
        <circle cx="40" cy="28" r="2.4" fill="#5E28C8" />
        <path d="M20 22l-6-4m36 4l6-4" stroke="#5E28C8" strokeWidth="3" strokeLinecap="round" />
    </svg>
);

// --- Error Boundary ---
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }
    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }
    componentDidCatch(error, errorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
    render() {
        if (this.state.hasError) {
            return (
                <AuthenticatedLayout user={this.props.user}>
                    <Box sx={{ p: 3 }}>
                        <Alert severity="error" sx={{ mb: 2 }}>
                            <Typography variant="h6">Something went wrong</Typography>
                            <Typography variant="body2">{this.state.error?.message}</Typography>
                        </Alert>
                        <Button onClick={() => this.props.onReset()} variant="contained">
                            Back to List
                        </Button>
                    </Box>
                </AuthenticatedLayout>
            );
        }
        return this.props.children;
    }
}

// --- Keyframe Animations ---
const float = keyframes`
  0% { transform: translateY(0); }
  50% { transform: translateY(-5px); }
  100% { transform: translateY(0); }
`;
const fadeInUp = keyframes`
  0% { opacity: 0; transform: translateY(15px); }
  100% { opacity: 1; transform: translateY(0); }
`;
const shine = keyframes`
  0% { transform: translateX(-100%) skewX(-25deg); }
  100% { transform: translateX(200%) skewX(-25deg); }
`;

/**
 * --- Workflow Card Component ---
 * Encapsulates the card's appearance and logic.
 * Features uniform dimensions, vibrant colors, and dynamic animations.
 */
const WorkflowCard = ({ workflow, onEdit, onToggle, onDelete }) => {
    const theme = useTheme();
    const {
        name,
        description,
        cuteIcon: Cute,
        cuteColor,
        cuteBadge,
        status,
        formattedLastRun,
        actions,
        successRate,
    } = workflow;
    const actionsCount = (actions || []).length;
    const isActive = status === 'active';

    return (
        <Card
            sx={{
                width: { xs: '100%', md: 540 }, // Fixed width for md and up, full width for xs
                height: '225px',
                position: 'relative',
                overflow: 'hidden',
                borderRadius: 4,
                border: `1px solid ${alpha(cuteColor, 0.5)}`,
                background: `linear-gradient(135deg, ${alpha(cuteColor, 0.25)}, ${alpha(cuteColor, 0.1)})`,
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                animation: `${fadeInUp} 0.5s ease-out both`,
                display: 'flex',
                flexDirection: 'column',
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '50%',
                    height: '100%',
                    background:
                        'linear-gradient(90deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 100%)',
                    transform: 'translateX(-100%) skewX(-25deg)',
                    pointerEvents: 'none',
                },
                '&:hover': {
                    transform: 'translateY(-6px) scale(1.02)',
                    boxShadow: `0 22px 45px -10px ${alpha(cuteColor, 0.45)}`,
                    '&::after': {
                        animation: `${shine} 1s ease-out`,
                    },
                },
            }}
        >
            <CardContent sx={{ p: 2.5, display: 'flex', flexDirection: 'column', flexGrow: 1 }}>
                <Stack direction="row" spacing={2.5} alignItems="center">
                    <Box
                        sx={{
                            width: 64,
                            height: 64,
                            borderRadius: '50%',
                            bgcolor: alpha(cuteColor, 0.3),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            boxShadow: `inset 0 0 0 3px ${alpha(cuteColor, 0.4)}`,
                            animation: `${float} 5s ease-in-out infinite`,
                        }}
                    >
                        <Cute size={52} />
                    </Box>
                    <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                        <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="flex-start"
                            spacing={1}
                        >
                            <Typography
                                variant="h6"
                                fontWeight={800}
                                noWrap
                                title={name}
                                sx={{ mb: 0.5 }}
                            >
                                {name}
                            </Typography>
                            <Chip
                                label={cuteBadge}
                                size="small"
                                sx={{
                                    fontWeight: 700,
                                    bgcolor: alpha(cuteColor, 0.2),
                                    color: alpha(theme.palette.getContrastText(cuteColor), 0.9),
                                    border: `1px solid ${alpha(cuteColor, 0.6)}`,
                                }}
                            />
                        </Stack>
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            noWrap
                            title={description}
                        >
                            {description || 'No description provided.'}
                        </Typography>
                    </Stack>
                </Stack>

                <Box sx={{ flexGrow: 1 }} />

                <Stack spacing={2} sx={{ mt: 2 }}>
                    <Box>
                        <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{ mb: 0.5 }}
                        >
                            <Typography variant="caption" color="text.secondary">
                                Last run:{' '}
                                <Typography component="span" fontWeight="bold">
                                    {formattedLastRun}
                                </Typography>
                                {' • '}
                                {actionsCount} action{actionsCount === 1 ? '' : 's'}
                            </Typography>
                            <Typography variant="caption" color="text.primary" fontWeight="bold">
                                {successRate}% Success
                            </Typography>
                        </Stack>
                        <LinearProgress
                            variant="determinate"
                            value={successRate}
                            sx={{ height: 6, borderRadius: 3, bgcolor: alpha(cuteColor, 0.25) }}
                        />
                    </Box>
                    <Stack
                        direction="row"
                        spacing={1}
                        justifyContent="space-between"
                        alignItems="center"
                    >
                        <Chip
                            label={isActive ? 'Active' : 'Paused'}
                            size="small"
                            sx={{
                                fontWeight: 700,
                                bgcolor: isActive
                                    ? alpha(theme.palette.success.main, 0.15)
                                    : alpha(theme.palette.warning.main, 0.15),
                                color: isActive
                                    ? theme.palette.success.dark
                                    : theme.palette.warning.dark,
                            }}
                        />
                        <Stack direction="row" spacing={1}>
                            <Tooltip title={isActive ? 'Pause' : 'Activate'}>
                                <IconButton size="small" onClick={() => onToggle(workflow.id)}>
                                    {isActive ? <PauseIcon /> : <PlayIcon />}
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Edit">
                                <IconButton size="small" onClick={() => onEdit(workflow)}>
                                    <EditIcon />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Delete">
                                <IconButton size="small" onClick={() => onDelete(workflow.id)}>
                                    <DeleteIcon color="error" />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    </Stack>
                </Stack>
            </CardContent>
        </Card>
    );
};

export default function AutomationsIndex({ auth, project, automations = [] }) {
    const theme = useTheme();
    const { shouldShowOverlay, userPlan } = useSubscription();
    const showOverlay = shouldShowOverlay('automation');

    const [view, setView] = useState('list');
    const [selectedWorkflow, setSelectedWorkflow] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [toDelete, setToDelete] = useState(null);
    const [snack, setSnack] = useState('');

    const handleUpgrade = () => {
        router.visit(userPlan?.billing_url || '/billing');
    };

    // --- Vibrant Color Palette ---
    const vibrant = {
        teal: { main: '#15C6A9' },
        blue: { main: '#2A8CFF' },
        orange: { main: '#FFA84D' },
        purple: { main: '#965CFF' },
        pink: { main: '#FF668A' },
    };

    const getCuteMeta = (wf) => {
        const t = String(wf?.trigger || 'manual').toLowerCase();
        const firstType = String(wf?.actions?.[0]?.type || '').toLowerCase();
        if (firstType.includes('email'))
            return { color: vibrant.teal, Icon: KawaiiMail, badge: 'EMAIL' };
        if (firstType.includes('calendar'))
            return { color: vibrant.blue, Icon: KawaiiCalendar, badge: 'CALENDAR' };
        if (firstType.includes('slack') || firstType.includes('notify'))
            return { color: vibrant.orange, Icon: KawaiiBell, badge: 'ALERT' };
        if (firstType.includes('webhook') || firstType.includes('http'))
            return { color: vibrant.purple, Icon: KawaiiWebhook, badge: 'WEBHOOK' };
        if (t.includes('schedule') || t.includes('cron'))
            return { color: vibrant.blue, Icon: KawaiiCalendar, badge: 'SCHEDULE' };
        if (t.includes('due')) return { color: vibrant.orange, Icon: KawaiiBell, badge: 'DUE' };
        if (t.includes('task_created') || t.includes('task updated'))
            return { color: vibrant.pink, Icon: KawaiiBell, badge: 'TASK' };
        return { color: vibrant.teal, Icon: KawaiiWebhook, badge: 'FLOW' };
    };

    const formatLastRun = (dateString) => {
        if (!dateString) return 'Never';
        const date = new Date(dateString);
        const now = new Date();
        const diffSeconds = Math.floor((now - date) / 1000);
        if (diffSeconds < 60) return 'Just now';
        const diffMinutes = Math.floor(diffSeconds / 60);
        if (diffMinutes < 60) return `${diffMinutes}m ago`;
        const diffHours = Math.floor(diffMinutes / 60);
        if (diffHours < 24) return `${diffHours}h ago`;
        return `${Math.floor(diffHours / 24)}d ago`;
    };

    const mapAutomations = (wfs) =>
        (wfs || []).map((a) => {
            const meta = getCuteMeta(a);
            return {
                ...a,
                _persisted: true,
                status: a.is_active ? 'active' : 'paused',
                cuteIcon: meta.Icon,
                cuteBadge: meta.badge,
                cuteColor: meta.color.main,
                lastRun: a.updated_at || a.created_at,
                formattedLastRun: formatLastRun(a.updated_at || a.created_at),
                successRate: typeof a.success_rate === 'number' ? a.success_rate : 100,
                actions: Array.isArray(a.actions) ? a.actions : [],
            };
        });

    const [workflows, setWorkflows] = useState(() => mapAutomations(automations));
    useEffect(() => {
        setWorkflows(mapAutomations(automations));
    }, [automations]);

    const handleCreateWorkflow = () => {
        setSelectedWorkflow({
            name: '',
            description: '',
            status: 'active',
            trigger: null,
            triggerConfig: {},
            actions: [],
        });
        setView('builder');
    };
    const handleEditWorkflow = (w) => {
        setSelectedWorkflow({
            ...w,
            triggerConfig: w.trigger_config || w.triggerConfig || {},
            actions: w.actions || [],
        });
        setView('builder');
    };
    const handleToggleWorkflow = (id) => {
        setWorkflows((prev) =>
            prev.map((w) =>
                w.id === id ? { ...w, status: w.status === 'active' ? 'paused' : 'active' } : w
            )
        );
        setSnack('Workflow status updated!');
    };
    const handleDeleteWorkflow = (id) => {
        const wf = workflows.find((w) => w.id === id);
        setToDelete(wf || { id });
        setConfirmOpen(true);
    };

    if (view === 'builder' || view === 'templates') {
        const ViewComponent = view === 'builder' ? WorkflowBuilder : WorkflowTemplates;
        const onSelect = (payload) => {
            setSelectedWorkflow(payload);
            setView('builder');
        };
        return (
            <ErrorBoundary user={auth.user} onReset={() => setView('list')}>
                <AuthenticatedLayout user={auth.user}>
                    <ViewComponent
                        project={project}
                        workflow={selectedWorkflow}
                        onBack={() => setView('list')}
                        onSave={(wf) => {
                            const automationData = {
                                name: wf.name,
                                description: wf.description,
                                trigger: wf.trigger,
                                trigger_config: wf.triggerConfig || {},
                                actions: wf.actions || [],
                                is_active: wf.status === 'active',
                            };
                            const url = selectedWorkflow?._persisted
                                ? `/projects/${project.id}/automations/${selectedWorkflow.id}`
                                : `/projects/${project.id}/automations`;
                            const method = selectedWorkflow?._persisted ? 'patch' : 'post';
                            router[method](url, automationData, {
                                onSuccess: () => {
                                    setView('list');
                                    setSnack(
                                        `Workflow ${selectedWorkflow?._persisted ? 'updated' : 'created'}!`
                                    );
                                },
                            });
                        }}
                        onSelectTemplate={onSelect}
                    />
                </AuthenticatedLayout>
            </ErrorBoundary>
        );
    }

    return (
        <AuthenticatedLayout user={auth.user}>
            <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto', position: 'relative' }}>
                {/* Overlay for free users */}
                {showOverlay && <FeatureOverlay feature="automation" onUpgrade={handleUpgrade} />}
                <Paper
                    elevation={0}
                    sx={{
                        mb: 4,
                        p: { xs: 2, md: 4 },
                        borderRadius: 4,
                        background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                        color: 'white',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={3} sx={{ mb: 3 }}>
                        <IconButton
                            onClick={() => router.visit(route('tasks.index', project.id))}
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
                            }}
                        >
                            <ArrowBackIcon />
                        </IconButton>
                        <Box sx={{ flex: 1 }}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Avatar
                                    sx={{
                                        bgcolor: 'rgba(255,255,255,0.2)',
                                        color: 'white',
                                        width: 56,
                                        height: 56,
                                    }}
                                >
                                    <RocketIcon sx={{ fontSize: 32 }} />
                                </Avatar>
                                <Box>
                                    <Typography variant="h4" fontWeight={900}>
                                        Automations
                                    </Typography>
                                    <Typography sx={{ opacity: 0.9 }}>
                                        Supercharge your workflow
                                    </Typography>
                                </Box>
                            </Stack>
                        </Box>
                        <Chip
                            label={project.name}
                            sx={{
                                bgcolor: 'rgba(255,255,255,0.2)',
                                color: 'white',
                                fontWeight: 700,
                            }}
                        />
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                        <Button
                            variant="contained"
                            size="large"
                            startIcon={<AddIcon />}
                            onClick={handleCreateWorkflow}
                            sx={{
                                borderRadius: 3,
                                textTransform: 'none',
                                fontWeight: 800,
                                bgcolor: 'white',
                                color: 'primary.main',
                                '&:hover': { bgcolor: '#f0f0f0' },
                            }}
                        >
                            Create Workflow
                        </Button>
                        <Button
                            variant="outlined"
                            size="large"
                            startIcon={<AutoAwesomeIcon />}
                            onClick={() => setView('templates')}
                            sx={{
                                borderRadius: 3,
                                textTransform: 'none',
                                fontWeight: 700,
                                borderColor: 'rgba(255,255,255,0.6)',
                                color: 'white',
                                '&:hover': {
                                    borderColor: 'white',
                                    bgcolor: 'rgba(255,255,255,0.08)',
                                },
                            }}
                        >
                            Browse Templates
                        </Button>
                    </Stack>
                </Paper>

                <Stack
                    direction="row"
                    alignItems="center"
                    justifyContent="space-between"
                    sx={{ px: 1, mb: 2.5 }}
                >
                    <Box>
                        <Typography variant="h5" fontWeight={900}>
                            Your Workflows
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Manage your automated tasks at a glance.
                        </Typography>
                    </Box>
                    <Chip
                        icon={<SettingsIcon />}
                        label={`${workflows.length} Total`}
                        variant="outlined"
                        sx={{ fontWeight: 700 }}
                    />
                </Stack>

                <Grid container spacing={3}>
                    {workflows.map((w) => (
                        <Grid item xs={12} md={6} key={w.id}>
                            <WorkflowCard
                                workflow={w}
                                onEdit={handleEditWorkflow}
                                onToggle={handleToggleWorkflow}
                                onDelete={handleDeleteWorkflow}
                            />
                        </Grid>
                    ))}
                </Grid>
            </Box>

            <Dialog
                open={confirmOpen}
                TransitionComponent={Slide}
                keepMounted
                onClose={() => setConfirmOpen(false)}
                PaperProps={{ sx: { borderRadius: 4 } }}
            >
                <DialogTitle
                    sx={{ fontWeight: 900, display: 'flex', alignItems: 'center', gap: 1.5 }}
                >
                    <Avatar
                        sx={{
                            bgcolor: alpha(theme.palette.error.main, 0.15),
                            color: theme.palette.error.main,
                        }}
                    >
                        <WarningAmberIcon />
                    </Avatar>
                    Delete Workflow?
                </DialogTitle>
                <DialogContent>
                    <Typography>
                        You’re about to delete “<b>{toDelete?.name || 'Untitled'}</b>”. This cannot
                        be undone.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button
                        onClick={() => setConfirmOpen(false)}
                        sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={() => {
                            if (!toDelete?.id) return;
                            router.delete(`/projects/${project.id}/automations/${toDelete.id}`, {
                                preserveScroll: true,
                                onSuccess: () => setSnack('Workflow deleted!'),
                                onError: () => setSnack('Failed to delete workflow.'),
                            });
                            setConfirmOpen(false);
                        }}
                        sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 2 }}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>
            <Snackbar
                open={Boolean(snack)}
                autoHideDuration={3000}
                onClose={() => setSnack('')}
                message={snack}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            />
        </AuthenticatedLayout>
    );
}
