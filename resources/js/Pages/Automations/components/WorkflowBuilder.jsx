// resources/js/Pages/Automations/components/WorkflowBuilder.jsx
import React, { useMemo, useState, useEffect } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  IconButton,
  TextField,
  Chip,
  Card,
  CardContent,
  Divider,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Tooltip,
  Snackbar,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Schedule as ScheduleIcon,
  Email as EmailIcon,
  Notifications as NotificationsIcon,
  CalendarMonth as CalendarIcon,
  TaskAlt as TaskIcon,
  AccessTime as TimeIcon,
  Build as BuildIcon,
  ConnectWithoutContact as ConnectIcon,
  GitHub as GitHubIcon,
  Message as MessageIcon,
  Forum as ForumIcon,
  Sms as SmsIcon,
  Storage as StorageIcon,
  Link as LinkIcon,
} from '@mui/icons-material';

/**
 * Trigger & Action catalogs
 * - trigger.id and action.id are "slugs" that will be sent to the backend.
 * - triggerConfig / action.config are plain JSON objects created from the field definitions below.
 */

const TRIGGERS = [
  {
    id: 'task_created',
    name: 'Task Created',
    description: 'When a new task is created',
    icon: <TaskIcon />,
    color: 'primary',
    fields: [
      { name: 'columns', label: 'Columns (optional)', type: 'multiselect', options: ['To Do', 'In Progress', 'Review', 'Done'] },
      { name: 'priority', label: 'Priority', type: 'select', options: ['Any', 'Low', 'Medium', 'High', 'Critical'], default: 'Any' },
    ],
  },
  {
    id: 'task_updated',
    name: 'Task Updated',
    description: 'When a task is modified',
    icon: <TaskIcon />,
    color: 'info',
    fields: [
      { name: 'field', label: 'Field Changed', type: 'select', options: ['Any', 'Status', 'Priority', 'Assignee', 'Due Date'], default: 'Any' },
      { name: 'from_status', label: 'From Status', type: 'select', options: ['Any', 'To Do', 'In Progress', 'Review', 'Done'], default: 'Any' },
      { name: 'to_status', label: 'To Status', type: 'select', options: ['Any', 'To Do', 'In Progress', 'Review', 'Done'], default: 'Any' },
    ],
  },
  {
    id: 'schedule',
    name: 'Schedule',
    description: 'Run on a fixed schedule',
    icon: <ScheduleIcon />,
    color: 'secondary',
    fields: [
      { name: 'frequency', label: 'Frequency', type: 'select', options: ['Daily', 'Weekly', 'Monthly'], default: 'Daily' },
      { name: 'time', label: 'Time', type: 'time', default: '09:00' },
      { name: 'timezone', label: 'Timezone', type: 'select', options: ['UTC', 'Europe/Madrid', 'America/New_York', 'Europe/London', 'Asia/Tokyo'], default: 'Europe/Madrid' },
    ],
  },
  {
    id: 'due_date',
    name: 'Due Date Approaching',
    description: 'When a task due date is near',
    icon: <TimeIcon />,
    color: 'warning',
    fields: [
      { name: 'hours_before', label: 'Hours Before Due', type: 'number', default: 24 },
      { name: 'priority', label: 'Limit to Priority', type: 'select', options: ['Any', 'High', 'Critical'], default: 'Any' },
    ],
  },
];

const ACTIONS = [
  {
    id: 'send_email',
    name: 'Send Email',
    description: 'Send an email notification',
    icon: <EmailIcon />,
    color: 'primary',
    fields: [
      { name: 'to', label: 'To', type: 'text', placeholder: 'email@example.com' },
      { name: 'subject', label: 'Subject', type: 'text', placeholder: 'Task notification' },
      { name: 'body', label: 'Body', type: 'textarea', placeholder: 'Task {{task.title}} has been updated' },
      { name: 'provider', label: 'Provider', type: 'select', options: ['SMTP', 'SendGrid', 'SES'], default: 'SMTP' },
    ],
  },
  {
    id: 'slack_message',
    name: 'Slack Message',
    description: 'Send a message to Slack via webhook',
    icon: <NotificationsIcon />,
    color: 'success',
    fields: [
      { name: 'webhook_url', label: 'Webhook URL', type: 'text', placeholder: 'https://hooks.slack.com/services/...' },
      { name: 'channel', label: 'Channel', type: 'text', placeholder: '#general' },
      { name: 'message', label: 'Message', type: 'textarea', placeholder: 'Task {{task.title}} was created' },
    ],
  },
  {
    id: 'discord_message',
    name: 'Discord Message',
    description: 'Post to Discord via webhook',
    icon: <ForumIcon />,
    color: 'secondary',
    fields: [
      { name: 'webhook_url', label: 'Webhook URL', type: 'text', placeholder: 'https://discord.com/api/webhooks/...' },
      { name: 'content', label: 'Content', type: 'textarea', placeholder: 'Heads up: {{task.title}} moved to {{task.status}}' },
    ],
  },
  {
    id: 'create_calendar_event',
    name: 'Google Calendar Event',
    description: 'Add an event to Google Calendar',
    icon: <CalendarIcon />,
    color: 'info',
    fields: [
      { name: 'calendar_id', label: 'Calendar', type: 'select', options: ['primary', 'work', 'personal'], default: 'primary' },
      { name: 'title', label: 'Event Title', type: 'text', placeholder: 'Task: {{task.title}}' },
      { name: 'duration_hours', label: 'Duration (hours)', type: 'number', default: 1 },
    ],
  },
  {
    id: 'github_issue',
    name: 'GitHub Issue',
    description: 'Create a GitHub issue',
    icon: <GitHubIcon />,
    color: 'warning',
    fields: [
      { name: 'repo', label: 'Repository (owner/name)', type: 'text', placeholder: 'myorg/myrepo' },
      { name: 'title', label: 'Issue Title', type: 'text', placeholder: 'Bug: {{task.title}}' },
      { name: 'body', label: 'Issue Body', type: 'textarea', placeholder: 'Steps to reproduce...' },
      { name: 'labels', label: 'Labels (comma-separated)', type: 'text', placeholder: 'bug, backlog' },
      { name: 'token', label: 'Access Token', type: 'password', placeholder: 'ghp_...' },
    ],
  },
  {
    id: 'trello_card',
    name: 'Trello Card',
    description: 'Create a card in Trello',
    icon: <MessageIcon />,
    color: 'error',
    fields: [
      { name: 'api_key', label: 'API Key', type: 'password', placeholder: 'Your Trello API Key' },
      { name: 'token', label: 'Token', type: 'password', placeholder: 'Your Trello Token' },
      { name: 'list_id', label: 'List ID', type: 'text', placeholder: 'xxxxxxxxxxxxxxxxxxxxxx' },
      { name: 'title', label: 'Card Title', type: 'text', placeholder: '{{task.title}}' },
      { name: 'description', label: 'Description', type: 'textarea', placeholder: 'Card description...' },
    ],
  },
  {
    id: 'notion_page',
    name: 'Notion Page',
    description: 'Append a page to a Notion database',
    icon: <StorageIcon />,
    color: 'secondary',
    fields: [
      { name: 'api_key', label: 'API Key', type: 'password', placeholder: 'secret_...' },
      { name: 'database_id', label: 'Database ID', type: 'text', placeholder: 'xxxxxxxxxxxxxxxxxxxxxx' },
      { name: 'title', label: 'Title', type: 'text', placeholder: '{{task.title}}' },
      { name: 'properties_json', label: 'Properties (JSON)', type: 'textarea', placeholder: '{"Status":{"select":{"name":"In Progress"}}}' },
    ],
  },
  {
    id: 'twilio_sms',
    name: 'Twilio SMS',
    description: 'Send an SMS using Twilio',
    icon: <SmsIcon />,
    color: 'primary',
    fields: [
      { name: 'account_sid', label: 'Account SID', type: 'password', placeholder: 'ACxxxxxxxx' },
      { name: 'auth_token', label: 'Auth Token', type: 'password', placeholder: '••••••••' },
      { name: 'from', label: 'From', type: 'text', placeholder: '+12025550123' },
      { name: 'to', label: 'To', type: 'text', placeholder: '+34600123456' },
      { name: 'body', label: 'Message', type: 'textarea', placeholder: 'Reminder: {{task.title}} is due soon' },
    ],
  },
  {
    id: 'webhook',
    name: 'Webhook',
    description: 'Send a generic HTTP request',
    icon: <ConnectIcon />,
    color: 'secondary',
    fields: [
      { name: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com/webhook' },
      { name: 'method', label: 'Method', type: 'select', options: ['POST', 'PUT', 'PATCH'], default: 'POST' },
      { name: 'headers', label: 'Headers (JSON)', type: 'textarea', placeholder: '{"Content-Type":"application/json"}' },
      { name: 'body', label: 'Body (JSON)', type: 'textarea', placeholder: '{"task":"{{task.title}}"}' },
    ],
  },
];

function uid() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export default function WorkflowBuilder({ project, workflow, onBack, onSave }) {
  const theme = useTheme();

  // Core state
  const [name, setName] = useState(workflow?.name || '');
  const [description, setDescription] = useState(workflow?.description || '');
  const [isActive, setIsActive] = useState(workflow?.status === 'active');
  const [selectedTrigger, setSelectedTrigger] = useState(null);
  const [triggerConfig, setTriggerConfig] = useState({});
  const [actions, setActions] = useState([]);
  const [error, setError] = useState('');
  const [snack, setSnack] = useState('');

  // Preload from incoming workflow (template or existing)
  useEffect(() => {
    if (workflow) {
      setName(workflow.name || '');
      setDescription(workflow.description || '');
      setIsActive((workflow.status || 'active') === 'active');

      const t = TRIGGERS.find(tr => tr.id === workflow.trigger) || null;
      setSelectedTrigger(t);
      setTriggerConfig(workflow.triggerConfig || workflow.trigger_config || {});

      const mapped = Array.isArray(workflow.actions)
        ? workflow.actions.map(a => ({
            id: uid(),
            type: a.type,
            config: a.config || {},
          }))
        : [];
      setActions(mapped);
    }
  }, [workflow]);

  const canSave = useMemo(() => {
    return Boolean(name.trim()) && Boolean(selectedTrigger?.id) && actions.length > 0;
  }, [name, selectedTrigger, actions.length]);

  // ---- Helpers ----
  const renderField = (field, value, onChange) => {
    switch (field.type) {
      case 'text':
      case 'password':
        return (
          <TextField
            fullWidth
            size="small"
            type={field.type === 'password' ? 'password' : 'text'}
            label={field.label}
            placeholder={field.placeholder || ''}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case 'textarea':
        return (
          <TextField
            fullWidth
            size="small"
            multiline
            rows={3}
            label={field.label}
            placeholder={field.placeholder || ''}
            value={value ?? ''}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      case 'number':
        return (
          <TextField
            fullWidth
            size="small"
            type="number"
            label={field.label}
            value={value ?? field.default ?? ''}
            onChange={(e) => onChange(Number(e.target.value))}
          />
        );
      case 'select':
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{field.label}</InputLabel>
            <Select
              label={field.label}
              value={value ?? field.default ?? (field.options?.[0] ?? '')}
              onChange={(e) => onChange(e.target.value)}
            >
              {(field.options || []).map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      case 'multiselect':
        return (
          <FormControl fullWidth size="small">
            <InputLabel>{field.label}</InputLabel>
            <Select
              multiple
              label={field.label}
              value={Array.isArray(value) ? value : []}
              onChange={(e) => onChange(e.target.value)}
            >
              {(field.options || []).map((opt) => (
                <MenuItem key={opt} value={opt}>
                  {opt}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        );
      case 'time':
        return (
          <TextField
            fullWidth
            size="small"
            type="time"
            label={field.label}
            value={value ?? field.default ?? '09:00'}
            onChange={(e) => onChange(e.target.value)}
          />
        );
      default:
        return (
          <TextField
            fullWidth
            size="small"
            label={field.label || 'Unknown Field'}
            disabled
            value=""
            helperText="Unsupported field type"
          />
        );
    }
  };

  const addAction = (actionDef) => {
    setActions((prev) => [
      ...prev,
      {
        id: uid(),
        type: actionDef.id,
        config: {},
      },
    ]);
  };

  const removeAction = (id) => {
    setActions((prev) => prev.filter((a) => a.id !== id));
  };

  const setActionConfig = (id, field, value) => {
    setActions((prev) =>
      prev.map((a) => (a.id === id ? { ...a, config: { ...a.config, [field]: value } } : a))
    );
  };

  const handleSave = () => {
    setError('');
    if (!canSave) {
      setError('Please provide a name, choose a trigger, and add at least one action.');
      return;
    }

    const payload = {
      name: name.trim(),
      description: description || '',
      status: isActive ? 'active' : 'paused',
      trigger: selectedTrigger.id,
      triggerConfig,
      actions: actions.map((a) => ({ type: a.type, config: a.config })),
      lastRun: new Date().toISOString(),
      runsCount: workflow?.runsCount || 0,
    };

    onSave?.(payload);
    setSnack('Workflow saved');
  };

  // ---- UI ----
  return (
    <Box sx={{ p: 3, maxWidth: 1100, mx: 'auto' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 3,
          p: 3,
          borderRadius: 3,
          background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.1), rgba(168, 85, 247, 0.05))',
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        }}
      >
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconButton
            onClick={onBack}
            sx={{
              bgcolor: alpha(theme.palette.primary.main, 0.1),
              '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.2) },
            }}
          >
            <ArrowBackIcon />
          </IconButton>

          <Box sx={{ flex: 1 }}>
            <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5, display: 'flex', alignItems: 'center' }}>
              <BuildIcon sx={{ mr: 1 }} />
              {workflow?._persisted ? 'Edit Workflow' : 'Create Workflow'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Build powerful automations with triggers and actions
            </Typography>
          </Box>

          <Tooltip title={!canSave ? 'Add a trigger and at least one action' : 'Save & Activate'}>
            <span>
              <Button
                variant="contained"
                startIcon={<PlayIcon />}
                onClick={handleSave}
                disabled={!canSave}
                sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 700, px: 3 }}
              >
                Save & Activate
              </Button>
            </span>
          </Tooltip>
        </Stack>
      </Paper>

      <Stack spacing={3}>
        {/* Details */}
        <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Workflow Details
          </Typography>
          <Stack spacing={2}>
            <TextField
              fullWidth
              label="Workflow Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Due Date Reminders"
            />
            <TextField
              fullWidth
              multiline
              rows={2}
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe what this workflow does..."
            />
            <FormControlLabel
              control={<Switch checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />}
              label="Activate workflow immediately"
            />
          </Stack>
        </Paper>

        {/* Trigger */}
        <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Choose a Trigger
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select what event will start this workflow.
          </Typography>

          <Stack spacing={2}>
            {TRIGGERS.map((trigger) => {
              const isSelected = selectedTrigger?.id === trigger.id;
              return (
                <Card
                  key={trigger.id}
                  onClick={() => {
                    setSelectedTrigger(trigger);
                    const defaults = {};
                    for (const f of trigger.fields || []) {
                      if (typeof f.default !== 'undefined') defaults[f.name] = f.default;
                    }
                    setTriggerConfig(defaults);
                  }}
                  sx={{
                    cursor: 'pointer',
                    border: isSelected ? `3px solid ${theme.palette[trigger.color].main}` : `2px solid transparent`,
                    borderRadius: 3,
                    transition: 'all .2s',
                    transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                    background: isSelected
                      ? `linear-gradient(135deg, ${alpha(theme.palette[trigger.color].main, 0.08)} 0%, ${alpha(
                          theme.palette[trigger.color].main,
                          0.02
                        )} 100%)`
                      : 'white',
                    '&:hover': {
                      transform: 'scale(1.01)',
                      boxShadow: `0 10px 25px ${alpha(theme.palette[trigger.color].main, 0.18)}`,
                      border: `3px solid ${alpha(theme.palette[trigger.color].main, 0.5)}`,
                    },
                  }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Box
                        sx={{
                          width: 52,
                          height: 52,
                          borderRadius: 2,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: 'white',
                          background: `linear-gradient(135deg, ${theme.palette[trigger.color].main} 0%, ${theme.palette[trigger.color].dark} 100%)`,
                        }}
                      >
                        {trigger.icon}
                      </Box>
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle1" fontWeight={800}>
                          {trigger.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {trigger.description}
                        </Typography>
                      </Box>
                      {isSelected ? (
                        <Chip label="Selected" color="primary" sx={{ fontWeight: 700 }} />
                      ) : (
                        <Button variant="outlined" size="small">
                          Select
                        </Button>
                      )}
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Stack>

          {selectedTrigger && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 2 }}>
                Configure Trigger
              </Typography>
              <Stack spacing={2}>
                {(selectedTrigger.fields || []).map((field) => (
                  <Box key={field.name}>
                    {renderField(field, triggerConfig[field.name], (v) =>
                      setTriggerConfig((prev) => ({ ...prev, [field.name]: v }))
                    )}
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </Paper>

        {/* Actions */}
        <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Actions
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add one or more actions that will run when the trigger fires.
              </Typography>
            </Box>
          </Stack>

          {/* Action picker */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
              Add Action
            </Typography>
            <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
              {ACTIONS.map((a) => (
                <Button
                  key={a.id}
                  variant="outlined"
                  size="small"
                  onClick={() => addAction(a)}
                  sx={{
                    textTransform: 'none',
                    borderRadius: 2,
                    borderWidth: 2,
                    fontWeight: 700,
                    px: 1.5,
                    py: 1,
                    borderColor: theme.palette[a.color].main,
                    color: theme.palette[a.color].main,
                    background: alpha(theme.palette[a.color].main, 0.04),
                    '&:hover': {
                      borderColor: theme.palette[a.color].dark,
                      background: alpha(theme.palette[a.color].main, 0.1),
                      transform: 'translateY(-1px)',
                    },
                  }}
                  startIcon={
                    <Box
                      sx={{
                        width: 20,
                        height: 20,
                        borderRadius: 1,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        backgroundColor: theme.palette[a.color].main,
                        color: 'white',
                        '& svg': { fontSize: 14 },
                      }}
                    >
                      {a.icon}
                    </Box>
                  }
                >
                  {a.name}
                </Button>
              ))}
            </Stack>
          </Box>

          <Divider sx={{ my: 2 }} />

          {actions.length === 0 ? (
            <Alert severity="info" sx={{ borderRadius: 2 }}>
              🎬 Add your first action to bring this workflow to life!
            </Alert>
          ) : (
            <Stack spacing={2}>
              {actions.map((action, idx) => {
                const def = ACTIONS.find((x) => x.id === action.type);
                return (
                  <Card
                    key={action.id}
                    sx={{
                      border: `2px solid ${alpha(theme.palette[def.color].main, 0.2)}`,
                      borderRadius: 3,
                      background: `linear-gradient(135deg, ${alpha(theme.palette[def.color].main, 0.05)} 0%, white 60%)`,
                    }}
                  >
                    <CardContent sx={{ p: 2.5 }}>
                      <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
                        <Box
                          sx={{
                            width: 44,
                            height: 44,
                            borderRadius: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'white',
                            background: `linear-gradient(135deg, ${theme.palette[def.color].main} 0%, ${theme.palette[def.color].dark} 100%)`,
                          }}
                        >
                          {def.icon}
                        </Box>
                        <Typography variant="subtitle1" fontWeight={800}>
                          Step {idx + 1}: {def.name}
                        </Typography>
                        <Box sx={{ flex: 1 }} />
                        <Tooltip title="Remove">
                          <IconButton color="error" onClick={() => removeAction(action.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                        {def.description}
                      </Typography>

                      <Stack spacing={2}>
                        {(def.fields || []).map((f) => (
                          <Box key={f.name}>
                            {renderField(f, action.config[f.name], (v) => setActionConfig(action.id, f.name, v))}
                          </Box>
                        ))}
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Paper>

        {/* Tip */}
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          💡 Pro tip: Use variables like <code>{'{{task.title}}'}</code>, <code>{'{{task.priority}}'}</code>,{' '}
          <code>{'{{project.name}}'}</code> in messages and webhooks.
        </Alert>

        {error && (
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            {error}
          </Alert>
        )}
      </Stack>

      <Snackbar
        open={Boolean(snack)}
        autoHideDuration={2000}
        onClose={() => setSnack('')}
        message={snack}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      />
    </Box>
  );
}
