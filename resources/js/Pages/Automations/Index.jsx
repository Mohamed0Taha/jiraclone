// resources/js/Pages/Automations/Index.jsx
import React, { useState } from 'react';
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
  Badge,
  LinearProgress,
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
} from '@mui/icons-material';
import { router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

// Use the NEW components
import WorkflowBuilder from './components/WorkflowBuilder';
import WorkflowTemplates from './components/WorkflowTemplates';

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

export default function AutomationsIndex({ auth, project, automations = [] }) {
  const theme = useTheme();
  const [view, setView] = useState('list'); // 'list' | 'builder' | 'templates'
  const [selectedWorkflow, setSelectedWorkflow] = useState(null);

  // Map backend automations into UI-friendly workflow objects.
  const mapAutomations = (list) =>
    list.map((a) => ({
      ...a,
      _persisted: true,
      status: a.is_active ? 'active' : 'paused',
      trigger: a.trigger || 'manual',
      triggerIcon: <ScheduleIcon />,
      triggerColor: '#6B7280',
      actions:
        a.actions && a.actions.length
          ? a.actions
          : [{ name: 'Placeholder Action', icon: <EmailIcon />, color: '#4285F4' }],
      lastRun: a.updated_at || a.created_at || new Date().toISOString(),
      runsCount: a.runs_count || 0,
      successRate: a.success_rate || 100,
      category: 'automation',
    }));

  const [workflows, setWorkflows] = useState(() => mapAutomations(automations));

  React.useEffect(() => {
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
    // You can also call your delete route here if required.
    // router.delete(`/projects/${project.id}/automations/${id}`)
  };

  const formatLastRun = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${Math.floor(diffHours / 24)}d ago`;
  };

  // --- Views ---
  if (view === 'builder') {
    return (
      <ErrorBoundary user={auth.user} onReset={() => setView('list')}>
        <AuthenticatedLayout user={auth.user}>
          <WorkflowBuilder
            project={project}
            workflow={selectedWorkflow}
            onBack={() => setView('list')}
            onSave={(wf) => {
              // Normalize payload for backend (snake_case trigger_config)
              const automationData = {
                name: wf.name,
                description: wf.description,
                trigger: wf.trigger,
                trigger_config: wf.triggerConfig || {},
                actions: wf.actions || [],
                is_active: wf.status === 'active',
              };

              if (selectedWorkflow && selectedWorkflow._persisted && selectedWorkflow.id) {
                router.patch(`/projects/${project.id}/automations/${selectedWorkflow.id}`, automationData, {
                  onSuccess: () => {
                    setSelectedWorkflow(null);
                    setView('list');
                  },
                  onError: (errors) => console.error('Update validation errors:', errors),
                });
              } else {
                router.post(`/projects/${project.id}/automations`, automationData, {
                  onSuccess: () => {
                    setSelectedWorkflow(null);
                    setView('list');
                  },
                  onError: (errors) => console.error('Create validation errors:', errors),
                });
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

  // List view
  return (
    <AuthenticatedLayout user={auth.user}>
      <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
        {/* Header */}
        <Paper
          elevation={0}
          sx={{
            mb: 4,
            p: 4,
            borderRadius: 4,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
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

            <Box sx={{ flex: 1 }}>
              <Stack direction="row" spacing={2} alignItems="center">
                <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', width: 56, height: 56 }}>
                  <RocketIcon sx={{ fontSize: 32 }} />
                </Avatar>
                <Box>
                  <Typography variant="h3" fontWeight={900} sx={{ mb: 0.5 }}>
                    Automations
                  </Typography>
                  <Typography variant="h6" sx={{ opacity: 0.9 }}>
                    Supercharge your workflow with intelligent automation
                  </Typography>
                </Box>
              </Stack>
            </Box>

            <Chip label={project.name} sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 700 }} />
          </Stack>

          <Stack direction="row" spacing={2}>
            <Button
              variant="contained"
              size="large"
              startIcon={<AddIcon />}
              onClick={handleCreateWorkflow}
              sx={{
                borderRadius: 3,
                textTransform: 'none',
                fontWeight: 800,
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
                fontWeight: 700,
                px: 4,
                py: 1.5,
                borderColor: 'rgba(255,255,255,0.6)',
                color: 'white',
                '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.08)' },
              }}
            >
              Browse Templates
            </Button>
          </Stack>
        </Paper>

        {/* Workflows List */}
        <Paper elevation={0} sx={{ borderRadius: 4, overflow: 'hidden', bgcolor: 'transparent' }}>
          <Box
            sx={{
              p: 4,
              background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.05) 0%, rgba(168, 85, 247, 0.05) 100%)',
              borderBottom: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            }}
          >
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Box>
                <Typography variant="h5" fontWeight={800} sx={{ mb: 0.5 }}>
                  Your Workflows
                </Typography>
                <Typography color="text.secondary">Manage and monitor your automation workflows</Typography>
              </Box>
              <Chip icon={<SettingsIcon />} label="Manage All" variant="outlined" sx={{ fontWeight: 700 }} />
            </Stack>
          </Box>

          {workflows.length === 0 ? (
            <Box sx={{ p: 8, textAlign: 'center' }}>
              <Avatar
                sx={{
                  width: 120,
                  height: 120,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <RocketIcon sx={{ fontSize: 60 }} />
              </Avatar>
              <Typography variant="h5" fontWeight={800} sx={{ mb: 1 }}>
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
                sx={{ textTransform: 'none', fontWeight: 800, borderRadius: 3, px: 4, py: 1.5 }}
              >
                Create Your First Workflow
              </Button>
            </Box>
          ) : (
            <Box sx={{ p: 3 }}>
              <Stack spacing={3}>
                {workflows.map((w) => (
                  <Card
                    key={w.id}
                    sx={{
                      borderRadius: 3,
                      border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                      transition: 'all .2s',
                      position: 'relative',
                      overflow: 'hidden',
                      '&:hover': { transform: 'translateY(-3px)', boxShadow: '0 20px 40px rgba(0,0,0,0.08)' },
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: 4,
                        background:
                          w.status === 'active'
                            ? 'linear-gradient(90deg, #10B981, #34D399)'
                            : 'linear-gradient(90deg, #F59E0B, #FBBF24)',
                      },
                    }}
                  >
                    <CardContent sx={{ p: 3 }}>
                      <Stack direction="row" spacing={3} alignItems="center">
                        <Avatar
                          sx={{
                            width: 56,
                            height: 56,
                            background: `linear-gradient(135deg, ${w.triggerColor}15 0%, ${w.triggerColor}25 100%)`,
                            color: w.triggerColor,
                            border: `2px solid ${w.triggerColor}30`,
                          }}
                        >
                          {w.triggerIcon}
                        </Avatar>

                        <Box sx={{ flex: 1, minWidth: 0 }}>
                          <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 0.5 }}>
                            <Typography variant="h6" fontWeight={800}>
                              {w.name}
                            </Typography>
                            <Badge
                              badgeContent={w.status === 'active' ? 'LIVE' : 'PAUSED'}
                              sx={{
                                '& .MuiBadge-badge': {
                                  bgcolor: w.status === 'active' ? '#10B981' : '#F59E0B',
                                  color: 'white',
                                  fontWeight: 800,
                                  fontSize: '0.7rem',
                                  px: 1,
                                },
                              }}
                            />
                            <Chip size="small" label={w.trigger} sx={{ fontWeight: 700 }} />
                          </Stack>

                          <Typography color="text.secondary" sx={{ mb: 1.5 }}>
                            {w.description}
                          </Typography>

                          <Stack direction="row" spacing={2} sx={{ mb: 1.5 }}>
                            <Typography variant="body2" color="text.secondary" fontWeight={700}>
                              Actions:
                            </Typography>
                            <Stack direction="row" spacing={1}>
                              {(w.actions || []).map((a, i) => (
                                <Tooltip key={i} title={a.name || a.type}>
                                  <Avatar
                                    sx={{
                                      width: 28,
                                      height: 28,
                                      bgcolor: alpha(theme.palette.primary.main, 0.1),
                                      color: theme.palette.primary.main,
                                    }}
                                  >
                                    {(a.type || '').slice(0, 2).toUpperCase()}
                                  </Avatar>
                                </Tooltip>
                              ))}
                            </Stack>
                          </Stack>

                          <Stack direction="row" spacing={4}>
                            <Box>
                              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                LAST RUN
                              </Typography>
                              <Typography variant="body2" fontWeight={700}>
                                {formatLastRun(w.lastRun)}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                TOTAL RUNS
                              </Typography>
                              <Typography variant="body2" fontWeight={700}>
                                {w.runsCount.toLocaleString()}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="caption" color="text.secondary" fontWeight={700}>
                                SUCCESS RATE
                              </Typography>
                              <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="body2" fontWeight={700}>
                                  {(w.successRate || 100)}%
                                </Typography>
                                <Box sx={{ width: 40 }}>
                                  <LinearProgress
                                    variant="determinate"
                                    value={w.successRate || 100}
                                    sx={{ height: 4, borderRadius: 2 }}
                                  />
                                </Box>
                              </Stack>
                            </Box>
                          </Stack>
                        </Box>

                        <Stack direction="row" spacing={1}>
                          <Tooltip title={w.status === 'active' ? 'Pause' : 'Activate'}>
                            <IconButton onClick={() => handleToggleWorkflow(w.id)}>
                              {w.status === 'active' ? <PauseIcon /> : <PlayIcon />}
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Edit">
                            <IconButton onClick={() => handleEditWorkflow(w)}>
                              <EditIcon />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton onClick={() => handleDeleteWorkflow(w.id)}>
                              <DeleteIcon />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          )}
        </Paper>
      </Box>
    </AuthenticatedLayout>
  );
}
