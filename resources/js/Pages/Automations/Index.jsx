import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  IconButton,
  Chip,
  Alert,
  Tooltip,
  Card,
  CardContent,
  alpha,
  useTheme,
  Avatar,
  LinearProgress,
  Divider,
  useMediaQuery,
} from '@mui/material';
import {
  Add as AddIcon,
  PlayArrow as PlayIcon,
  Pause as PauseIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  ArrowBack as ArrowBackIcon,
  AutoAwesome as AutoAwesomeIcon,
  Schedule as ScheduleIcon,
  Email as EmailIcon,
  Rocket as RocketIcon,
  Settings as SettingsIcon,
  FlashOn as FlashOnIcon,
} from '@mui/icons-material';
import { router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import WorkflowBuilder from './components/WorkflowBuilder';
import WorkflowTemplates from './components/WorkflowTemplates';

/* ------------------------------ CSRF Helper ------------------------------ */
function getCsrfToken() {
  const el = document.head.querySelector('meta[name="csrf-token"]');
  return el ? el.getAttribute('content') || '' : '';
}

/* ------------------------------ Error Boundary ----------------------------- */
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

/* --------------------------------- Helpers -------------------------------- */
const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, Number(n)));

const colorFromString = (str, s = 75, l = 55) => {
  const base = Array.from(String(str || 'x')).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const hue = base % 360;
  return `hsl(${hue}, ${s}%, ${l}%)`;
};

function Metric({ label, children, value }) {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" fontWeight={800} sx={{ letterSpacing: 0.4 }}>
        {label}
      </Typography>
      {children ?? (
        <Typography variant="body2" fontWeight={900} sx={{ lineHeight: 1.2 }}>
          {value}
        </Typography>
      )}
    </Box>
  );
}

/* ------------------------------ Workflow Card ------------------------------ */
function WorkflowCard({
  theme,
  workflow,
  isMdUp,
  onToggle,
  onEdit,
  onDelete,
  formatLastRun,
}) {
  const status = workflow.status === 'active' ? 'LIVE' : 'PAUSED';
  const statusGradient =
    workflow.status === 'active'
      ? 'linear-gradient(90deg, #34D399 0%, #10B981 100%)'
      : 'linear-gradient(90deg, #FBBF24 0%, #F59E0B 100%)';

  const triggerColor = workflow.triggerColor || colorFromString(workflow.trigger || workflow.name || 'trigger');
  const controlButtonSize = 42;

  return (
    <Card
      elevation={0}
      sx={{
        position: 'relative',
        borderRadius: 4,
        overflow: 'hidden',
        background: 'linear-gradient(180deg, rgba(255,255,255,0.9) 0%, rgba(255,255,255,0.85) 100%)',
        backdropFilter: 'blur(8px)',
        border: `1px solid ${alpha(theme.palette.divider, 0.18)}`,
        boxShadow: '0 8px 28px rgba(0,0,0,0.06)',
        transition: 'transform .18s ease, box-shadow .18s ease',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: '0 18px 48px rgba(0,0,0,0.10)',
        },
        '&::before': {
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 4,
          background: statusGradient,
        },
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              md: '1fr 340px',
            },
            gridTemplateRows: {
              xs: 'auto auto auto auto',
              md: 'auto auto',
            },
            gridTemplateAreas: {
              xs: `
                "headerLeft"
                "headerRight"
                "bodyLeft"
                "bodyRight"
              `,
              md: `
                "headerLeft headerRight"
                "bodyLeft   bodyRight"
              `,
            },
            columnGap: { xs: 2, sm: 3 },
            rowGap: { xs: 2, sm: 2.5 },
            alignItems: 'center',
            minWidth: 0,
          }}
        >
          <Box gridArea="headerLeft" sx={{ minWidth: 0 }}>
            <Stack direction="row" spacing={2} alignItems="center" sx={{ minWidth: 0 }}>
              <Avatar
                sx={{
                  width: 56,
                  height: 56,
                  bgcolor: alpha(triggerColor, 0.14),
                  color: triggerColor,
                  border: `2px solid ${alpha(triggerColor, 0.35)}`,
                  boxShadow: `0 8px 18px ${alpha(triggerColor, 0.25)}`,
                  flexShrink: 0,
                }}
              >
                {workflow.triggerIcon ?? <ScheduleIcon />}
              </Avatar>

              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0, flexWrap: 'wrap', rowGap: 1 }}>
                  <Typography
                    variant="h6"
                    fontWeight={900}
                    sx={{ minWidth: 0, lineHeight: 1.2 }}
                    title={workflow.name}
                  >
                    <Box
                      component="span"
                      sx={{
                        display: 'inline-block',
                        maxWidth: { xs: '100%', md: 440 },
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        verticalAlign: 'bottom',
                      }}
                    >
                      {workflow.name}
                    </Box>
                  </Typography>

                  <Chip
                    size="small"
                    label={status}
                    icon={<FlashOnIcon sx={{ fontSize: 16 }} />}
                    sx={{
                      color: '#fff',
                      bgcolor: workflow.status === 'active' ? '#059669' : '#b45309',
                      '& .MuiChip-icon': { color: '#fff' },
                      fontWeight: 900,
                      height: 24,
                    }}
                  />

                  <Chip
                    size="small"
                    label={workflow.trigger || 'manual'}
                    variant="outlined"
                    sx={{
                      fontWeight: 800,
                      height: 24,
                      borderColor: alpha(triggerColor, 0.45),
                      color: colorFromString(workflow.trigger || 'manual', 75, 35),
                      backgroundColor: alpha(triggerColor, 0.06),
                    }}
                  />
                </Stack>
              </Box>
            </Stack>
          </Box>

          <Box
            gridArea="headerRight"
            sx={{
              display: 'flex',
              justifyContent: { xs: 'flex-start', md: 'flex-end' },
              alignItems: 'center',
              gap: 1,
            }}
          >
            <Tooltip title={workflow.status === 'active' ? 'Pause' : 'Activate'}>
              <IconButton
                onClick={() => onToggle(workflow.id)}
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                  bgcolor: alpha(
                    workflow.status === 'active' ? theme.palette.warning.main : theme.palette.success.main,
                    0.10
                  ),
                  color: workflow.status === 'active' ? theme.palette.warning.main : theme.palette.success.main,
                  '&:hover': {
                    bgcolor: alpha(
                      workflow.status === 'active' ? theme.palette.warning.main : theme.palette.success.main,
                      0.20
                    ),
                  },
                }}
              >
                {workflow.status === 'active' ? <PauseIcon /> : <PlayIcon />}
              </IconButton>
            </Tooltip>

            <Tooltip title="Edit">
              <IconButton
                onClick={() => onEdit(workflow)}
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                  bgcolor: alpha(theme.palette.info.main, 0.10),
                  color: theme.palette.info.main,
                  '&:hover': { bgcolor: alpha(theme.palette.info.main, 0.20) },
                }}
              >
                <EditIcon />
              </IconButton>
            </Tooltip>

            <Tooltip title="Delete">
              <IconButton
                onClick={() => onDelete(workflow.id)}
                sx={{
                  width: 42,
                  height: 42,
                  borderRadius: 2,
                  border: `1px solid ${alpha(theme.palette.divider, 0.3)}`,
                  bgcolor: alpha(theme.palette.error.main, 0.10),
                  color: theme.palette.error.main,
                  '&:hover': { bgcolor: alpha(theme.palette.error.main, 0.20) },
                }}
              >
                <DeleteIcon />
              </IconButton>
            </Tooltip>
          </Box>

          <Box gridArea="bodyLeft" sx={{ minWidth: 0 }}>
            <Typography
              color="text.secondary"
              sx={{
                mb: 1.25,
                overflowWrap: 'anywhere',
                display: '-webkit-box',
                WebkitLineClamp: 2,
                WebkitBoxOrient: 'vertical',
                overflow: 'hidden',
              }}
            >
              {workflow.description || '—'}
            </Typography>

            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
              <Typography variant="body2" color="text.secondary" fontWeight={900}>
                Actions:
              </Typography>
              <Stack direction="row" spacing={0.75} sx={{ flexWrap: 'wrap', rowGap: 0.75 }}>
                {(workflow.actions || []).map((a, i) => {
                  const label = (a.type || a.name || '').toString();
                  const c = colorFromString(label, 70, 45);
                  return (
                    <Tooltip key={`${workflow.id}-action-${i}`} title={a.name || a.type}>
                      <Chip
                        size="small"
                        label={label.slice(0, 16)}
                        sx={{
                          fontWeight: 800,
                          height: 24,
                          color: '#fff',
                          bgcolor: c,
                          boxShadow: `0 4px 16px ${alpha(c, 0.35)}`,
                        }}
                      />
                    </Tooltip>
                  );
                })}
                {(!workflow.actions || workflow.actions.length === 0) && (
                  <Chip
                    size="small"
                    icon={<EmailIcon sx={{ fontSize: 16 }} />}
                    label="Email"
                    sx={{
                      fontWeight: 800,
                      height: 24,
                      color: '#fff',
                      bgcolor: colorFromString('Email', 70, 45),
                      boxShadow: `0 4px 16px ${alpha(colorFromString('Email', 70, 45), 0.35)}`,
                    }}
                  />
                )}
              </Stack>
            </Stack>
          </Box>

          <Box gridArea="bodyRight" sx={{ minWidth: 0 }}>
            <Stack
              direction={{ xs: 'row', md: 'column' }}
              spacing={{ xs: 3, md: 1.75 }}
              sx={{ minWidth: 0, alignItems: { xs: 'flex-start', md: 'stretch' } }}
            >
              <Metric label="LAST RUN" value={formatLastRun(workflow.lastRun)} />
              <Metric label="TOTAL RUNS" value={Number(workflow.runsCount || 0).toLocaleString()} />
              <Metric label="SUCCESS RATE">
                <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                  <Typography variant="body2" fontWeight={900} sx={{ width: 52 }}>
                    {clamp(workflow.successRate ?? 100)}%
                  </Typography>
                  <Box sx={{ flex: 1 }}>
                    <LinearProgress
                      variant="determinate"
                      value={clamp(workflow.successRate ?? 100)}
                      sx={{
                        height: 8,
                        borderRadius: 999,
                        backgroundColor: alpha(theme.palette.success.main, 0.16),
                        '& .MuiLinearProgress-bar': {
                          background: 'linear-gradient(90deg, #22c55e, #16a34a, #15803d)',
                        },
                      }}
                    />
                  </Box>
                </Stack>
              </Metric>
            </Stack>
          </Box>
        </Box>

        {!isMdUp && <Divider sx={{ mt: 2 }} />}
      </CardContent>
    </Card>
  );
}

/* ------------------------------- Page Export ------------------------------- */
export default function AutomationsIndex({ auth, project, automations = [] }) {
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const [view, setView] = useState('list');
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);

  const mapAutomations = (list) =>
    list.map((a) => ({
      ...a,
      _persisted: true,
      status: a.is_active ? 'active' : 'paused',
      trigger: a.trigger || 'manual',
      triggerIcon: <ScheduleIcon />,
      triggerColor: colorFromString(a.trigger || 'manual', 70, 45),
      actions:
        a.actions && a.actions.length
          ? a.actions
          : [{ name: 'Email', type: 'Email', icon: <EmailIcon />, color: '#4285F4' }],
      lastRun: a.updated_at || a.created_at || new Date().toISOString(),
      runsCount: a.runs_count || 0,
      successRate: a.success_rate ?? 100,
      category: 'automation',
    }));

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
      prev.map((w) => (w.id === id ? { ...w, status: w.status === 'active' ? 'paused' : 'active' } : w))
    );
  };

  const handleDeleteWorkflow = (id) => {
    setWorkflows((prev) => prev.filter((w) => w.id !== id));
    // If you wire deletion, remember CSRF header the same way.
    // const token = getCsrfToken();
    // router.delete(`/projects/${project.id}/automations/${id}`, {
    //   headers: { 'X-CSRF-TOKEN': token, 'X-Requested-With': 'XMLHttpRequest' },
    // });
  };

  const formatLastRun = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    const days = Math.floor(diffHours / 24);
    return `${days}d ago`;
  };

  if (view === 'builder') {
    return (
      <ErrorBoundary user={auth.user} onReset={() => setView('list')}>
        <AuthenticatedLayout user={auth.user}>
          <WorkflowBuilder
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

              const token = getCsrfToken();
              const headers = {
                'X-CSRF-TOKEN': token,
                'X-Requested-With': 'XMLHttpRequest',
              };

              if (selectedWorkflow && selectedWorkflow._persisted && selectedWorkflow.id) {
                router.patch(
                  `/projects/${project.id}/automations/${selectedWorkflow.id}`,
                  { ...automationData, _token: token },
                  {
                    headers,
                    onSuccess: () => {
                      setSelectedWorkflow(null);
                      setView('list');
                    },
                    onError: (errors) => console.error('Update validation errors:', errors),
                  }
                );
              } else {
                router.post(
                  `/projects/${project.id}/automations`,
                  { ...automationData, _token: token },
                  {
                    headers,
                    onSuccess: () => {
                      setSelectedWorkflow(null);
                      setView('list');
                    },
                    onError: (errors) => console.error('Create validation errors:', errors),
                  }
                );
              }
            }}
          />
        </AuthenticatedLayout>
      </ErrorBoundary>
    );
  }

  if (view === 'templates') {
    return (
      <ErrorBoundary user={auth.user} onReset={() => setView('list')}>
        <AuthenticatedLayout user={auth.user}>
          <WorkflowTemplates
            project={project}
            onBack={() => setView('list')}
            onSelectTemplate={(templatePayload) => {
              setSelectedWorkflow(templatePayload);
              setView('builder');
            }}
          />
        </AuthenticatedLayout>
      </ErrorBoundary>
    );
  }

  return (
    <AuthenticatedLayout user={auth.user}>
      <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 1200, mx: 'auto' }}>
        <Paper
          elevation={0}
          sx={{
            mb: 4,
            p: { xs: 2.5, sm: 4 },
            borderRadius: 4,
            background:
              'linear-gradient(135deg, rgba(99,102,241,1) 0%, rgba(124,58,237,1) 40%, rgba(236,72,153,1) 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              background:
                'radial-gradient(650px circle at 20% 0%, rgba(255,255,255,0.20), transparent 60%), radial-gradient(700px circle at 80% 120%, rgba(255,255,255,0.15), transparent 60%)',
              pointerEvents: 'none',
            }}
          />
          <Stack direction="row" alignItems="center" spacing={3} sx={{ mb: 3 }}>
            <IconButton
              onClick={() => router.visit(route('tasks.index', project.id))}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white',
                backdropFilter: 'blur(10px)',
                '&:hover': { bgcolor: 'rgba(255,255,255,0.3)', transform: 'scale(1.05)' },
                transition: 'all 0.2s ease',
              }}
            >
              <ArrowBackIcon />
            </IconButton>

            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', width: 56, height: 56 }}>
                  <RocketIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h3" fontWeight={900} sx={{ mb: 0.5, lineHeight: 1.1 }}>
                    Automations
                  </Typography>
                  <Typography variant="h6" sx={{ opacity: 0.9 }}>
                    Supercharge your workflow with intelligent automation
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Chip
              label={project.name}
              sx={{
                bgcolor: 'rgba(255,255,255,0.2)',
                color: 'white',
                fontWeight: 800,
                border: '1px solid rgba(255,255,255,0.35)',
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
                fontWeight: 900,
                px: 4,
                py: 1.5,
                bgcolor: 'white',
                color: 'primary.main',
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
                fontWeight: 800,
                px: 4,
                py: 1.5,
                borderColor: 'rgba(255,255,255,0.7)',
                color: 'white',
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.12)' },
              }}
            >
              Browse Templates
            </Button>
          </Stack>
        </Paper>

        <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', bgcolor: 'transparent' }}>
          <Box
            sx={{
              p: { xs: 2.5, sm: 4 },
              background:
                'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 50%, rgba(236, 72, 153, 0.05) 100%)',
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h5" fontWeight={900} sx={{ mb: 0.5 }}>
                  Your Workflows
                </Typography>
                <Typography color="text.secondary">Manage and monitor your automation workflows</Typography>
              </Box>
              <Chip icon={<SettingsIcon />} label="Manage All" variant="outlined" sx={{ fontWeight: 800 }} />
            </Stack>
          </Box>

          {workflows.length === 0 ? (
            <Box sx={{ p: 8, textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: theme.palette.primary.main,
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <RocketIcon sx={{ fontSize: 60 }} />
              </Avatar>
              <Typography variant="h5" fontWeight={900} sx={{ mb: 1 }}>
                No workflows yet
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 4, maxWidth: 420, mx: 'auto' }}>
                Create your first automation to streamline your project work.
              </Typography>
              <Button
                variant="contained"
                size="large"
                startIcon={<AddIcon />}
                onClick={handleCreateWorkflow}
                sx={{ textTransform: 'none', fontWeight: 900, borderRadius: 3, px: 4, py: 1.5 }}
              >
                Create Your First Workflow
              </Button>
            </Box>
          ) : (
            <Box sx={{ p: { xs: 1.5, sm: 3 } }}>
              <Stack spacing={3}>
                {workflows.map((w) => (
                  <WorkflowCard
                    key={w.id}
                    theme={theme}
                    workflow={w}
                    isMdUp={isMdUp}
                    onToggle={handleToggleWorkflow}
                    onEdit={handleEditWorkflow}
                    onDelete={handleDeleteWorkflow}
                    formatLastRun={formatLastRun}
                  />
                ))}
              </Stack>
            </Box>
          )}
        </Paper>
      </Box>
    </AuthenticatedLayout>
  );
}
