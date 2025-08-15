import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Stack, IconButton, Card, CardContent, Chip, TextField, InputAdornment, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationIcon,
  CalendarMonth as CalendarIcon,
  TrendingUp as TrendingIcon,
  AutoAwesome as AutoAwesomeIcon,
  Speed as SpeedIcon,
  BugReport as BugIcon,
  Group as TeamIcon,
  Storage as BackupIcon,
  Refresh as SyncIcon,
  Warning as AlertIcon,
  Star as ReviewIcon,
  Assignment as AssignmentIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';

// Detailed template configurations for pre-populating workflows
const TEMPLATES = [
  {
    id: 'due-date-reminders',
    name: 'Due Date Reminders',
    desc: 'Email 24h before due.',
    cat: 'notifications',
    icon: <EmailIcon/>,
    color: 'primary',
    pop: 95,
    trig: 'Due Date',
    trigger: 'due_date',
    triggerConfig: { hours_before: 24, priority: 'Any' },
    actions: [
      {
        type: 'email',
        config: {
          to: '{{task.assignee.email}}',
          subject: 'Task Due Tomorrow: {{task.title}}',
          body: 'Hi {{task.assignee.name}},\n\nYour task "{{task.title}}" is due tomorrow ({{task.due_date}}).\n\nPlease make sure to complete it on time.\n\nBest regards,\nProject Management System'
        }
      }
    ]
  },
  {
    id: 'new-task-notifications',
    name: 'New Task Notifications',
    desc: 'Slack on new task.',
    cat: 'notifications',
    icon: <NotificationIcon/>,
    color: 'success',
    pop: 88,
    trig: 'Task Created',
    trigger: 'task_created',
    triggerConfig: { priority: 'Any' },
    actions: [
      {
        type: 'slack_message',
        config: {
          channel: '#general',
          message: '🆕 New task created: *{{task.title}}*\nAssigned to: {{task.assignee.name}}\nPriority: {{task.priority}}'
        }
      }
    ]
  },
  {
    id: 'daily-standup-report',
    name: 'Daily Standup Report',
    desc: 'Daily 09:00 summary.',
    cat: 'reports',
    icon: <ScheduleIcon/>,
    color: 'info',
    pop: 76,
    trig: 'Schedule',
    trigger: 'schedule',
    triggerConfig: { frequency: 'Daily', time: '09:00', timezone: 'Europe/Madrid' },
    actions: [
      {
        type: 'email',
        config: {
          to: 'team@company.com',
          subject: 'Daily Standup Report - {{date}}',
          body: 'Daily project summary:\n\n- Tasks completed yesterday: {{completed_tasks}}\n- Tasks in progress: {{in_progress_tasks}}\n- Blockers: {{blocked_tasks}}\n\nHave a great day!'
        }
      }
    ]
  },
  {
    id: 'status-change-tracking',
    name: 'Status Change Tracking',
    desc: 'Notify on Done.',
    cat: 'analytics',
    icon: <TrendingIcon/>,
    color: 'warning',
    pop: 71,
    trig: 'Task Updated',
    trigger: 'task_updated',
    triggerConfig: { field: 'Status', to_status: 'Done' },
    actions: [
      {
        type: 'email',
        config: {
          to: '{{project.manager.email}}',
          subject: 'Task Completed: {{task.title}}',
          body: 'Great news! The task "{{task.title}}" has been marked as completed by {{task.assignee.name}}.\n\nTask details:\n- Priority: {{task.priority}}\n- Completed on: {{current_date}}\n\nWell done!'
        }
      }
    ]
  },
  {
    id: 'bug-assignment',
    name: 'Bug Auto-Assignment',
    desc: 'Assign & notify bugs.',
    cat: 'productivity',
    icon: <BugIcon/>,
    color: 'error',
    pop: 73,
    trig: 'Task Created',
    trigger: 'task_created',
    triggerConfig: { priority: 'High' },
    actions: [
      {
        type: 'email',
        config: {
          to: 'bugs@company.com',
          subject: '🐛 High Priority Bug Reported: {{task.title}}',
          body: 'A high priority bug has been reported:\n\nTitle: {{task.title}}\nDescription: {{task.description}}\nReporter: {{task.creator.name}}\nPriority: {{task.priority}}\n\nPlease investigate and assign to the appropriate developer.'
        }
      }
    ]
  },
  {
    id: 'overdue-alerts',
    name: 'Overdue Task Alerts',
    desc: 'Alert overdue tasks.',
    cat: 'notifications',
    icon: <AlertIcon/>,
    color: 'warning',
    pop: 89,
    trig: 'Due Date',
    trigger: 'due_date',
    triggerConfig: { hours_before: -24, priority: 'Any' },
    actions: [
      {
        type: 'email',
        config: {
          to: '{{task.assignee.email}},{{project.manager.email}}',
          subject: '⚠️ OVERDUE: {{task.title}}',
          body: 'URGENT: The task "{{task.title}}" is now overdue.\n\nDue date: {{task.due_date}}\nAssigned to: {{task.assignee.name}}\n\nPlease prioritize this task immediately or update the due date.'
        }
      }
    ]
  },
  {
    id: 'project-backup',
    name: 'Project Data Backup',
    desc: 'Weekly backup.',
    cat: 'reports',
    icon: <BackupIcon/>,
    color: 'secondary',
    pop: 58,
    trig: 'Schedule',
    trigger: 'schedule',
    triggerConfig: { frequency: 'Weekly', time: '02:00', timezone: 'UTC' },
    actions: [
      {
        type: 'webhook',
        config: {
          url: 'https://api.backup-service.com/trigger',
          method: 'POST',
          headers: '{"Authorization": "Bearer YOUR_TOKEN"}',
          body: '{"project_id": "{{project.id}}", "backup_type": "weekly"}'
        }
      }
    ]
  },
  {
    id: 'code-review-reminder',
    name: 'Code Review Reminders',
    desc: 'Remind reviewers.',
    cat: 'notifications',
    icon: <ReviewIcon/>,
    color: 'primary',
    pop: 85,
    trig: 'Task Created',
    trigger: 'task_created',
    triggerConfig: { columns: ['Review'] },
    actions: [
      {
        type: 'slack_message',
        config: {
          channel: '#code-review',
          message: '👨‍💻 Code review needed: *{{task.title}}*\n\nPlease review and provide feedback.\nAssigned to: {{task.assignee.name}}\nCreated by: {{task.creator.name}}'
        }
      }
    ]
  },
  {
    id: 'calendar-sync',
    name: 'Calendar Integration',
    desc: 'Events for high priority.',
    cat: 'productivity',
    icon: <CalendarIcon/>,
    color: 'secondary',
    pop: 82,
    trig: 'Task Created',
    trigger: 'task_created',
    triggerConfig: { priority: 'High' },
    actions: [
      {
        type: 'webhook',
        config: {
          url: 'https://api.calendar-service.com/events',
          method: 'POST',
          headers: '{"Authorization": "Bearer YOUR_CALENDAR_TOKEN"}',
          body: '{"title": "{{task.title}}", "start": "{{task.due_date}}", "attendees": ["{{task.assignee.email}}"]}'
        }
      }
    ]
  },
  {
    id: 'time-tracking-sync',
    name: 'Time Tracking Sync',
    desc: 'Sync estimates.',
    cat: 'productivity',
    icon: <SyncIcon/>,
    color: 'success',
    pop: 79,
    trig: 'Task Updated',
    trigger: 'task_updated',
    triggerConfig: { field: 'Any' },
    actions: [
      {
        type: 'webhook',
        config: {
          url: 'https://api.timetracking.com/sync',
          method: 'PUT',
          headers: '{"Authorization": "Bearer YOUR_TIME_TOKEN"}',
          body: '{"task_id": "{{task.id}}", "estimated_hours": "{{task.estimated_hours}}", "actual_hours": "{{task.actual_hours}}"}'
        }
      }
    ]
  },
  {
    id: 'sprint-completion',
    name: 'Sprint Completion Reports',
    desc: 'Sprint summary.',
    cat: 'reports',
    icon: <AssignmentIcon/>,
    color: 'info',
    pop: 72,
    trig: 'Schedule',
    trigger: 'schedule',
    triggerConfig: { frequency: 'Weekly', time: '17:00', timezone: 'Europe/Madrid' },
    actions: [
      {
        type: 'email',
        config: {
          to: 'team@company.com',
          subject: 'Sprint Summary Report',
          body: 'Sprint completed!\n\n📊 Sprint Statistics:\n- Tasks completed: {{sprint.completed_tasks}}\n- Tasks carried over: {{sprint.incomplete_tasks}}\n- Team velocity: {{sprint.velocity}}\n\nGreat work everyone!'
        }
      }
    ]
  },
  {
    id: 'task-time-limit',
    name: 'Task Time Limit Alerts',
    desc: 'Alert overruns.',
    cat: 'analytics',
    icon: <TimerIcon/>,
    color: 'warning',
    pop: 66,
    trig: 'Schedule',
    trigger: 'schedule',
    triggerConfig: { frequency: 'Daily', time: '18:00', timezone: 'Europe/Madrid' },
    actions: [
      {
        type: 'email',
        config: {
          to: '{{task.assignee.email}}',
          subject: '⏰ Task Time Limit Alert: {{task.title}}',
          body: 'Your task "{{task.title}}" has exceeded the estimated time limit.\n\nEstimated: {{task.estimated_hours}} hours\nActual: {{task.actual_hours}} hours\n\nPlease review and update the estimate if needed.'
        }
      }
    ]
  },
  {
    id: 'team-workload-balance',
    name: 'Team Workload Balance',
    desc: 'Watch workload.',
    cat: 'analytics',
    icon: <TeamIcon/>,
    color: 'info',
    pop: 67,
    trig: 'Task Created',
    trigger: 'task_created',
    triggerConfig: { priority: 'Any' },
    actions: [
      {
        type: 'webhook',
        config: {
          url: 'https://api.analytics.com/workload',
          method: 'POST',
          headers: '{"Authorization": "Bearer YOUR_ANALYTICS_TOKEN"}',
          body: '{"assignee": "{{task.assignee.id}}", "project": "{{project.id}}", "workload_check": true}'
        }
      }
    ]
  }
];

const CATEGORIES = [
  { id: 'all', label: 'All', icon: <AutoAwesomeIcon /> },
  { id: 'notifications', label: 'Notifications', icon: <NotificationIcon /> },
  { id: 'reports', label: 'Reports', icon: <ScheduleIcon /> },
  { id: 'productivity', label: 'Productivity', icon: <SpeedIcon /> },
  { id: 'analytics', label: 'Analytics', icon: <TrendingIcon /> },
];

const DENSITY = {
  compact: {
    cardHeight: 130,
    categoryFont: '0.65rem',
    titleFont: '0.85rem',
    descFont: '0.7rem',
    chipFont: '0.6rem',
    metaFont: '0.6rem',
    buttonFont: '0.65rem',
    lineClamp: 2,
  },
  comfortable: {
    cardHeight: 150,
    categoryFont: '0.7rem',
    titleFont: '0.9rem',
    descFont: '0.75rem',
    chipFont: '0.65rem',
    metaFont: '0.65rem',
    buttonFont: '0.7rem',
    lineClamp: 3,
  },
};

export default function WorkflowTemplates({ project, onBack, onSelectTemplate }) {
  const theme = useTheme();
  const [category, setCategory] = useState('all');
  const [q, setQ] = useState('');
  const [density, setDensity] = useState('comfortable');

  const d = DENSITY[density];

  const filtered = TEMPLATES.filter(
    (t) =>
      (category === 'all' || t.cat === category) &&
      (!q || (t.name + ' ' + t.desc).toLowerCase().includes(q.toLowerCase()))
  );

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 1400, mx: 'auto' }}>
      <Paper
        elevation={3}
        sx={{
          mb: 3,
          p: { xs: 2, md: 3 },
          borderRadius: 4,
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
          background: `linear-gradient(to bottom, ${theme.palette.background.paper}, ${alpha(theme.palette.primary.light, 0.05)})`,
          boxShadow: theme.shadows[2],
        }}
      >
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={{ xs: 1, sm: 2 }}
          alignItems={{ xs: 'flex-start', sm: 'center' }}
          sx={{ mb: 2 }}
        >
          <IconButton
            onClick={onBack}
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              color: theme.palette.primary.main,
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
              borderRadius: 2,
            }}
          >
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flex: 1 }}>
            <Typography
              variant="h5"
              fontWeight={700}
              sx={{ display: 'flex', alignItems: 'center', color: theme.palette.primary.dark }}
            >
              <AutoAwesomeIcon sx={{ mr: 1, fontSize: 28, color: theme.palette.primary.main }} />
              Workflow Templates
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Pick a vibrant starting point and customize your workflow.
            </Typography>
          </Box>
          <Chip
            label={project.name}
            variant="filled"
            sx={{
              fontWeight: 600,
              bgcolor: theme.palette.primary.light,
              color: theme.palette.primary.contrastText,
            }}
          />
          <ToggleButtonGroup
            exclusive
            size="small"
            value={density}
            onChange={(e, val) => val && setDensity(val)}
            color="primary"
          >
            <ToggleButton value="compact">Compact</ToggleButton>
            <ToggleButton value="comfortable">Comfort</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <TextField
          fullWidth
          size="small"
          placeholder="Search templates..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon color="primary" />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              borderRadius: 3,
              '& fieldset': { borderColor: theme.palette.primary.light },
              '&:hover fieldset': { borderColor: theme.palette.primary.main },
              '&.Mui-focused fieldset': { borderColor: theme.palette.primary.dark },
            },
          }}
        />
      </Paper>

      <Paper
        elevation={1}
        sx={{
          mb: 3,
          p: 1.5,
          borderRadius: 3,
          border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
        }}
      >
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          {CATEGORIES.map((c) => (
            <Button
              key={c.id}
              variant={category === c.id ? 'contained' : 'outlined'}
              startIcon={c.icon}
              onClick={() => setCategory(c.id)}
              sx={{
                textTransform: 'none',
                fontWeight: 600,
                borderRadius: 3,
                color: category === c.id ? 'white' : theme.palette.primary.main,
                borderColor: theme.palette.primary.main,
                '&:hover': {
                  borderColor: theme.palette.primary.dark,
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                },
              }}
            >
              {c.label}
            </Button>
          ))}
        </Stack>
      </Paper>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(auto-fill, minmax(200px, 1fr))',
            md: 'repeat(auto-fill, minmax(240px, 1fr))',
          },
          gap: 2.5,
        }}
      >
        {filtered.map((t) => (
          <Card
            key={t.id}
            sx={{
              borderRadius: 4,
              boxShadow: theme.shadows[3],
              transition: 'transform 0.2s, box-shadow 0.2s',
              '&:hover': {
                transform: 'translateY(-5px)',
                boxShadow: theme.shadows[6],
              },
              border: `1px solid ${alpha(theme.palette[t.color].main, 0.3)}`,
            }}
          >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Box
                  sx={{
                    p: 0.75,
                    bgcolor: alpha(theme.palette[t.color].main, 0.1),
                    borderRadius: 2,
                    color: theme.palette[t.color].main,
                  }}
                >
                  {t.icon}
                </Box>
                <Typography
                  variant="caption"
                  fontWeight={600}
                  color={theme.palette[t.color].main}
                  textTransform="uppercase"
                >
                  {t.cat}
                </Typography>
                <Box sx={{ flex: 1 }} />
                <Box
                  sx={{
                    width: 60,
                    height: 4,
                    bgcolor: alpha(theme.palette[t.color].main, 0.2),
                    borderRadius: 2,
                    overflow: 'hidden',
                  }}
                >
                  <Box
                    sx={{
                      width: `${t.pop}%`,
                      height: '100%',
                      bgcolor: theme.palette[t.color].main,
                    }}
                  />
                </Box>
              </Stack>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 0.5 }}>
                {t.name}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, height: 40, overflow: 'hidden' }}>
                {t.desc}
              </Typography>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                <Chip
                  label={t.trig}
                  size="small"
                  variant="outlined"
                  sx={{
                    borderColor: theme.palette[t.color].main,
                    color: theme.palette[t.color].main,
                  }}
                />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                  {t.actions.length} actions
                </Typography>
              </Stack>
              <Button
                fullWidth
                variant="contained"
                color={t.color}
                onClick={() => onSelectTemplate({
                  name: t.name,
                  description: t.desc,
                  trigger: t.trigger,
                  triggerConfig: t.triggerConfig || {},
                  actions: t.actions || [],
                  status: 'active'
                })}
                sx={{
                  textTransform: 'none',
                  fontWeight: 600,
                  borderRadius: 3,
                  '&:hover': {
                    bgcolor: theme.palette[t.color].dark,
                  },
                }}
              >
                Use Template
              </Button>
            </CardContent>
          </Card>
        ))}
      </Box>

      {filtered.length === 0 && (
        <Paper
          elevation={2}
          sx={{
            mt: 3,
            p: 4,
            textAlign: 'center',
            borderRadius: 4,
            bgcolor: alpha(theme.palette.warning.light, 0.1),
          }}
        >
          <AutoAwesomeIcon sx={{ fontSize: 60, color: theme.palette.warning.main, mb: 2 }} />
          <Typography variant="h6" color="text.primary">
            No Templates Found
          </Typography>
          <Typography color="text.secondary">
            Try adjusting your search or category to find what you need.
          </Typography>
        </Paper>
      )}

      <Paper
        elevation={2}
        sx={{
          mt: 4,
          p: 3,
          borderRadius: 4,
          bgcolor: alpha(theme.palette.success.light, 0.1),
          border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
        }}
      >
        <Typography variant="h6" fontWeight={700} color="success.dark" sx={{ mb: 1 }}>
          Need a Custom Workflow?
        </Typography>
        <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
          Templates are great starters—customize triggers, actions, and more to fit perfectly.
        </Typography>
        <Button
          variant="outlined"
          color="success"
          onClick={onBack}
          sx={{
            textTransform: 'none',
            fontWeight: 600,
            borderRadius: 3,
          }}
        >
          Create Custom Workflow
        </Button>
      </Paper>
    </Box>
  );
}