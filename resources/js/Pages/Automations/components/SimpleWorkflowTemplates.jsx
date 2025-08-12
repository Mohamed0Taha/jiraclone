// resources/js/Pages/Automations/components/WorkflowTemplates.jsx
import React, { useMemo, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  IconButton,
  Card,
  CardContent,
  Chip,
  TextField,
  InputAdornment,
  ToggleButtonGroup,
  ToggleButton,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationsIcon,
  CalendarMonth as CalendarIcon,
  AutoAwesome as AutoAwesomeIcon,
  Speed as SpeedIcon,
  TrendingUp as TrendingIcon,
  Forum as ForumIcon,
  GitHub as GitHubIcon,
  Sms as SmsIcon,
} from '@mui/icons-material';

/**
 * Each template returns a STARTING payload for the builder:
 * { name, description, trigger, triggerConfig, actions }
 * These already satisfy: trigger present + at least one action.
 */
const TEMPLATES = [
  {
    id: 'due-date-slack',
    name: 'Due Date → Slack',
    desc: 'Warn the team 24h before a task is due.',
    cat: 'notifications',
    icon: <NotificationsIcon />,
    color: 'success',
    payload: {
      trigger: 'due_date',
      triggerConfig: { hours_before: 24, priority: 'Any' },
      actions: [
        {
          type: 'slack_message',
          config: {
            webhook_url: '',
            channel: '#general',
            message: '⏰ {{task.title}} is due in 24h ({{task.due_date}})',
          },
        },
      ],
    },
  },
  {
    id: 'task-created-email',
    name: 'Task Created → Email',
    desc: 'Email someone when a new task is created in To Do.',
    cat: 'notifications',
    icon: <EmailIcon />,
    color: 'primary',
    payload: {
      trigger: 'task_created',
      triggerConfig: { columns: ['To Do'], priority: 'Any' },
      actions: [
        {
          type: 'send_email',
          config: { to: '', subject: 'New Task: {{task.title}}', body: 'A new task was created.', provider: 'SMTP' },
        },
      ],
    },
  },
  {
    id: 'daily-standup',
    name: 'Daily Standup → Email',
    desc: 'Send a 09:00 summary every day.',
    cat: 'reports',
    icon: <ScheduleIcon />,
    color: 'info',
    payload: {
      trigger: 'schedule',
      triggerConfig: { frequency: 'Daily', time: '09:00', timezone: 'Europe/Madrid' },
      actions: [
        {
          type: 'send_email',
          config: { to: '', subject: 'Daily Standup', body: 'Summary for {{project.name}}', provider: 'SMTP' },
        },
      ],
    },
  },
  {
    id: 'calendar-high-priority',
    name: 'Create Calendar Events',
    desc: 'For high-priority tasks, add 1h events.',
    cat: 'productivity',
    icon: <CalendarIcon />,
    color: 'secondary',
    payload: {
      trigger: 'task_created',
      triggerConfig: { columns: [], priority: 'High' },
      actions: [
        { type: 'create_calendar_event', config: { calendar_id: 'primary', title: 'Task: {{task.title}}', duration_hours: 1 } },
      ],
    },
  },
  {
    id: 'discord-overdue',
    name: 'Overdue → Discord',
    desc: 'Post messages to Discord when tasks go overdue.',
    cat: 'notifications',
    icon: <ForumIcon />,
    color: 'secondary',
    payload: {
      trigger: 'due_date',
      triggerConfig: { hours_before: 0, priority: 'Any' },
      actions: [
        {
          type: 'discord_message',
          config: { webhook_url: '', content: '⚠️ {{task.title}} is overdue (was due {{task.due_date}}).' },
        },
      ],
    },
  },
  {
    id: 'github-from-bug',
    name: 'Bugs → GitHub Issues',
    desc: 'Create GitHub issues for BUG-labeled tasks.',
    cat: 'analytics',
    icon: <GitHubIcon />,
    color: 'warning',
    payload: {
      trigger: 'task_updated',
      triggerConfig: { field: 'Priority', from_status: 'Any', to_status: 'Any' },
      actions: [
        {
          type: 'github_issue',
          config: {
            repo: '',
            title: 'Bug: {{task.title}}',
            body: 'Imported from project {{project.name}}',
            labels: 'bug',
            token: '',
          },
        },
      ],
    },
  },
  {
    id: 'sms-due',
    name: 'Due Date → SMS',
    desc: 'Text reminders via Twilio.',
    cat: 'notifications',
    icon: <SmsIcon />,
    color: 'primary',
    payload: {
      trigger: 'due_date',
      triggerConfig: { hours_before: 2, priority: 'Any' },
      actions: [
        { type: 'twilio_sms', config: { account_sid: '', auth_token: '', from: '', to: '', body: 'Due soon: {{task.title}}' } },
      ],
    },
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All', icon: <AutoAwesomeIcon /> },
  { id: 'notifications', label: 'Notifications', icon: <NotificationsIcon /> },
  { id: 'reports', label: 'Reports', icon: <ScheduleIcon /> },
  { id: 'productivity', label: 'Productivity', icon: <SpeedIcon /> },
  { id: 'analytics', label: 'Analytics', icon: <TrendingIcon /> },
];

const DENSITY = {
  compact: { cardHeight: 138, titleFont: '0.88rem', descFont: '0.72rem' },
  comfortable: { cardHeight: 156, titleFont: '0.95rem', descFont: '0.8rem' },
};

export default function WorkflowTemplates({ project, onBack, onSelectTemplate }) {
  const theme = useTheme();
  const [category, setCategory] = useState('all');
  const [q, setQ] = useState('');
  const [density, setDensity] = useState('comfortable');

  const filtered = useMemo(() => {
    return TEMPLATES.filter(
      (t) =>
        (category === 'all' || t.cat === category) &&
        (!q || (t.name + ' ' + t.desc).toLowerCase().includes(q.toLowerCase()))
    );
  }, [category, q]);

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 2.5,
          p: 2.5,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.5)}`,
          background: theme.palette.background.paper,
        }}
      >
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2, flexWrap: 'wrap', rowGap: 1 }}>
          <IconButton
            onClick={onBack}
            sx={{ bgcolor: alpha(theme.palette.primary.main, 0.08), '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.15) } }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Typography variant="h5" fontWeight={800} noWrap>
              <AutoAwesomeIcon sx={{ mr: 1, fontSize: 20 }} />
              Workflow Templates
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              Pick a starting point & customize.
            </Typography>
          </Box>
          <Chip label={project?.name || 'Project'} variant="outlined" sx={{ fontWeight: 700 }} />
          <ToggleButtonGroup
            exclusive
            size="small"
            value={density}
            onChange={(e, val) => val && setDensity(val)}
            aria-label="density"
            sx={{ ml: { xs: 0, md: 1 } }}
          >
            <ToggleButton value="compact">XS</ToggleButton>
            <ToggleButton value="comfortable">LG</ToggleButton>
          </ToggleButtonGroup>
        </Stack>

        <TextField
          fullWidth
          size="small"
          placeholder="Search templates..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />
      </Paper>

      {/* Cards Grid */}
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: 16,
        }}
      >
        {filtered.map((t) => (
          <Card
            key={t.id}
            sx={{
              height: DENSITY[density].cardHeight,
              display: 'flex',
              flexDirection: 'column',
              borderRadius: 2,
              border: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
              transition: 'border-color .15s, transform .15s, box-shadow .15s',
              '&:hover': {
                borderColor: theme.palette[t.color].main,
                transform: 'translateY(-3px)',
                boxShadow: 1,
              },
            }}
          >
            <CardContent sx={{ p: 1.25, display: 'flex', flexDirection: 'column', gap: 0.6 }}>
              <Stack direction="row" spacing={0.75} alignItems="center">
                <Box
                  sx={{
                    width: 24,
                    height: 24,
                    borderRadius: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    bgcolor: theme.palette[t.color].main,
                    color: '#fff',
                    '& svg': { fontSize: 16 },
                  }}
                >
                  {t.icon}
                </Box>
                <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', color: 'text.secondary' }}>
                  {t.cat}
                </Typography>
              </Stack>
              <Typography variant="subtitle2" title={t.name} sx={{ fontWeight: 800, fontSize: DENSITY[density].titleFont, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {t.name}
              </Typography>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: DENSITY[density].descFont, lineHeight: 1.2, display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2, overflow: 'hidden' }}>
                {t.desc}
              </Typography>
              <Stack direction="row" spacing={0.5} alignItems="center" mt="auto">
                <Chip
                  label={t.payload.trigger}
                  size="small"
                  sx={{
                    height: 20,
                    bgcolor: alpha(theme.palette[t.color].main, 0.12),
                    color: theme.palette[t.color].main,
                    '& .MuiChip-label': { px: 0.8, fontWeight: 700 },
                  }}
                />
                <Typography variant="caption" sx={{ color: 'text.secondary', ml: 'auto' }}>
                  1+ action
                </Typography>
              </Stack>
              <Button
                size="small"
                onClick={() =>
                  onSelectTemplate({
                    name: t.name,
                    description: t.desc,
                    status: 'active',
                    trigger: t.payload.trigger,
                    triggerConfig: t.payload.triggerConfig,
                    actions: t.payload.actions,
                  })
                }
                variant="contained"
                sx={{ mt: 0.5, borderRadius: 1.5, textTransform: 'none', fontWeight: 800 }}
              >
                Use Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>
    </Box>
  );
}
