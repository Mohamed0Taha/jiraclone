// resources/js/Pages/Automations/components/WorkflowBuilder.jsx
import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  IconButton,
  TextField,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Chip,
  Card,
  CardContent,
  CardActions,
  Divider,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Switch,
  FormControlLabel,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandMore as ExpandMoreIcon,
  PlayArrow as PlayIcon,
  Schedule as ScheduleIcon,
  Email as EmailIcon,
  Notifications as NotificationIcon,
  Webhook as WebhookIcon,
  CalendarMonth as CalendarIcon,
  TaskAlt as TaskIcon,
  AccessTime as TimeIcon,
  Build as BuildIcon,
  ConnectWithoutContact as ConnectIcon,
} from '@mui/icons-material';

const TRIGGERS = [
  {
    id: 'task_created',
    name: 'Task Created',
    description: 'When a new task is created',
    icon: <TaskIcon />,
    color: 'primary',
    fields: [
      { name: 'columns', label: 'In columns', type: 'multiselect', options: ['To Do', 'In Progress', 'Review', 'Done'] },
      { name: 'priority', label: 'With priority', type: 'select', options: ['Any', 'Low', 'Medium', 'High', 'Critical'] },
    ]
  },
  {
    id: 'task_updated',
    name: 'Task Updated',
    description: 'When a task is modified',
    icon: <TaskIcon />,
    color: 'info',
    fields: [
      { name: 'field', label: 'Field changed', type: 'select', options: ['Any', 'Status', 'Priority', 'Assignee', 'Due Date'] },
      { name: 'from_status', label: 'From status', type: 'select', options: ['Any', 'To Do', 'In Progress', 'Review', 'Done'] },
      { name: 'to_status', label: 'To status', type: 'select', options: ['Any', 'To Do', 'In Progress', 'Review', 'Done'] },
    ]
  },
  {
    id: 'schedule',
    name: 'Schedule',
    description: 'Run on a schedule',
    icon: <ScheduleIcon />,
    color: 'secondary',
    fields: [
      { name: 'frequency', label: 'Frequency', type: 'select', options: ['Daily', 'Weekly', 'Monthly'] },
      { name: 'time', label: 'Time', type: 'time' },
      { name: 'timezone', label: 'Timezone', type: 'select', options: ['UTC', 'America/New_York', 'Europe/London', 'Asia/Tokyo'] },
    ]
  },
  {
    id: 'due_date',
    name: 'Due Date Approaching',
    description: 'When task due date is near',
    icon: <TimeIcon />,
    color: 'warning',
    fields: [
      { name: 'hours_before', label: 'Hours before', type: 'number', default: 24 },
      { name: 'priority', label: 'Task priority', type: 'select', options: ['Any', 'High', 'Critical'] },
    ]
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
      { name: 'template', label: 'Template', type: 'select', options: ['Basic', 'Detailed', 'Summary'] },
    ]
  },
  {
    id: 'slack_message',
    name: 'Slack Message',
    description: 'Send message to Slack',
    icon: <NotificationIcon />,
    color: 'success',
    fields: [
      { name: 'webhook_url', label: 'Webhook URL', type: 'text', placeholder: 'https://hooks.slack.com/...' },
      { name: 'channel', label: 'Channel', type: 'text', placeholder: '#general' },
      { name: 'message', label: 'Message', type: 'textarea', placeholder: 'Task {{task.title}} has been updated' },
    ]
  },
  {
    id: 'create_calendar_event',
    name: 'Create Calendar Event',
    description: 'Add event to Google Calendar',
    icon: <CalendarIcon />,
    color: 'info',
    fields: [
      { name: 'calendar_id', label: 'Calendar', type: 'select', options: ['Primary', 'Work', 'Personal'] },
      { name: 'title', label: 'Event title', type: 'text', placeholder: 'Task: {{task.title}}' },
      { name: 'duration', label: 'Duration (hours)', type: 'number', default: 1 },
    ]
  },
  {
    id: 'webhook',
    name: 'Webhook',
    description: 'Send HTTP request',
    icon: <ConnectIcon />,
    color: 'secondary',
    fields: [
      { name: 'url', label: 'URL', type: 'text', placeholder: 'https://api.example.com/webhook' },
      { name: 'method', label: 'Method', type: 'select', options: ['POST', 'PUT', 'PATCH'] },
      { name: 'headers', label: 'Headers', type: 'textarea', placeholder: 'Content-Type: application/json' },
      { name: 'body', label: 'Body', type: 'textarea', placeholder: '{"task": "{{task.title}}"}' },
    ]
  },
];

export default function WorkflowBuilder({ project, workflow, onBack, onSave }) {
  const theme = useTheme();
  
  // Add safe defaults and null checks
  const [name, setName] = useState(workflow?.name || '');
  const [description, setDescription] = useState(workflow?.description || '');
  const [isActive, setIsActive] = useState(workflow?.status === 'active' || true);
  const [selectedTrigger, setSelectedTrigger] = useState(null);
  const [triggerConfig, setTriggerConfig] = useState({});
  const [actions, setActions] = useState([]);

  // Safe initialization
  React.useEffect(() => {
    if (workflow) {
      setSelectedTrigger(workflow.trigger || null);
      setTriggerConfig(workflow.triggerConfig || {});
      setActions(workflow.actions || []);
    }
  }, [workflow]);

  const handleTriggerSelect = (trigger) => {
    try {
      setSelectedTrigger(trigger);
      setTriggerConfig({});
    } catch (error) {
      console.error('Error selecting trigger:', error);
    }
  };

  const handleAddAction = (action) => {
    try {
      setActions(prev => [...prev, { 
        id: Date.now(),
        type: action?.id || 'unknown',
        config: {}
      }]);
    } catch (error) {
      console.error('Error adding action:', error);
    }
  };

  const handleRemoveAction = (actionId) => {
    try {
      setActions(prev => prev.filter(a => a.id !== actionId));
    } catch (error) {
      console.error('Error removing action:', error);
    }
  };

  const handleActionConfigChange = (actionId, field, value) => {
    try {
      setActions(prev => prev.map(a => 
        a.id === actionId 
          ? { ...a, config: { ...a.config, [field]: value } }
          : a
      ));
    } catch (error) {
      console.error('Error updating action config:', error);
    }
  };

  const handleSave = () => {
    try {
      const workflowData = {
        name: name || 'Untitled Workflow',
        description: description || '',
        status: isActive ? 'active' : 'paused',
        trigger: selectedTrigger?.id || null,
        triggerConfig: triggerConfig || {},
        actions: (actions || []).map(a => ({ type: a.type, config: a.config || {} })),
        lastRun: new Date().toISOString(),
        runsCount: workflow?.runsCount || 0,
      };
      onSave(workflowData);
    } catch (error) {
      console.error('Error saving workflow:', error);
    }
  };

  // Helper function to safely get theme color
  const getThemeColor = (colorName, fallback = 'primary') => {
    try {
      if (theme.palette[colorName]) {
        return theme.palette[colorName];
      }
      return theme.palette[fallback];
    } catch (error) {
      console.warn('Error accessing theme color:', colorName, error);
      return theme.palette.primary;
    }
  };

  const renderField = (field, value, onChange) => {
    try {
      if (!field || typeof field !== 'object') {
        return null;
      }

      switch (field.type) {
        case 'text':
          return (
            <TextField
              fullWidth
              size="small"
              label={field.label || 'Input'}
              value={value || ''}
              onChange={(e) => onChange && onChange(e.target.value)}
              placeholder={field.placeholder || ''}
            />
          );
        case 'textarea':
          return (
            <TextField
              fullWidth
              multiline
              rows={3}
              size="small"
              label={field.label || 'Input'}
              value={value || ''}
              onChange={(e) => onChange && onChange(e.target.value)}
              placeholder={field.placeholder || ''}
            />
          );
        case 'number':
          return (
            <TextField
              fullWidth
              type="number"
              size="small"
              label={field.label || 'Number'}
              value={value || field.default || ''}
              onChange={(e) => onChange && onChange(Number(e.target.value))}
            />
          );
        case 'select':
          return (
            <FormControl fullWidth size="small">
              <InputLabel>{field.label || 'Select'}</InputLabel>
              <Select
                value={value || ''}
                onChange={(e) => onChange && onChange(e.target.value)}
                label={field.label || 'Select'}
              >
                {(field.options || []).map(option => (
                  <MenuItem key={option} value={option}>{option}</MenuItem>
                ))}
              </Select>
            </FormControl>
          );
        case 'time':
          return (
            <TextField
              fullWidth
              type="time"
              size="small"
              label={field.label || 'Time'}
              value={value || '09:00'}
              onChange={(e) => onChange && onChange(e.target.value)}
            />
          );
        default:
          return null;
      }
    } catch (error) {
      console.error('Error rendering field:', error, field);
      return (
        <TextField
          fullWidth
          size="small"
          label="Error"
          value=""
          disabled
          error
          helperText="Field rendering error"
        />
      );
    }
  };

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
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
            <Typography variant="h4" fontWeight={800} sx={{ mb: 0.5 }}>
              <BuildIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              {workflow ? 'Edit Workflow' : 'Create Workflow'}
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Build powerful automations with triggers and actions
            </Typography>
          </Box>

          <Button
            variant="contained"
            startIcon={<PlayIcon />}
            onClick={handleSave}
            disabled={!name || !selectedTrigger || actions.length === 0}
            sx={{
              borderRadius: 2,
              textTransform: 'none',
              fontWeight: 700,
              px: 3,
            }}
          >
            Save & Activate
          </Button>
        </Stack>
      </Paper>

      <Stack spacing={3}>
        {/* Basic Info */}
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
              placeholder="e.g., Task Due Date Reminders"
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
              control={
                <Switch
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
              }
              label="Activate workflow immediately"
            />
          </Stack>
        </Paper>

        {/* Trigger Selection */}
        <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
          <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
            Choose a Trigger
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Select what event will start this workflow
          </Typography>

          <Stack spacing={2}>
            {TRIGGERS.map((trigger) => {
              const triggerColor = getThemeColor(trigger.color, 'primary');
              return (
                <Card
                  key={trigger.id}
                  sx={{
                    cursor: 'pointer',
                    border: selectedTrigger?.id === trigger.id 
                      ? `3px solid ${theme.palette.primary.main}`
                      : `2px solid transparent`,
                    borderRadius: 3,
                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                    transform: selectedTrigger?.id === trigger.id ? 'scale(1.02)' : 'scale(1)',
                    background: selectedTrigger?.id === trigger.id 
                      ? `linear-gradient(135deg, ${alpha(triggerColor.main, 0.1)} 0%, ${alpha(triggerColor.main, 0.05)} 100%)`
                      : 'white',
                    '&:hover': {
                      transform: 'scale(1.02)',
                      boxShadow: `0 8px 25px ${alpha(triggerColor.main, 0.15)}`,
                      border: `3px solid ${alpha(triggerColor.main, 0.5)}`,
                    },
                  }}
                  onClick={() => handleTriggerSelect(trigger)}
                >
                <CardContent sx={{ p: 3 }}>
                  <Stack direction="row" alignItems="center" spacing={3}>
                    <Box
                      sx={{
                        width: 60,
                        height: 60,
                        borderRadius: 3,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: `linear-gradient(135deg, ${theme.palette[trigger.color].main} 0%, ${theme.palette[trigger.color].dark} 100%)`,
                        color: 'white',
                        boxShadow: `0 4px 12px ${alpha(theme.palette[trigger.color].main, 0.3)}`,
                        '& svg': { fontSize: 28 }
                      }}
                    >
                      {trigger.icon}
                    </Box>
                    
                    <Box sx={{ flex: 1 }}>
                      <Typography variant="h6" fontWeight={700} sx={{ mb: 0.5 }}>
                        {trigger.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                        {trigger.description}
                      </Typography>
                    </Box>

                    {selectedTrigger?.id === trigger.id ? (
                      <Chip 
                        label="✓ Selected" 
                        color="primary" 
                        sx={{ 
                          fontWeight: 700,
                          '& .MuiChip-label': { px: 2 }
                        }} 
                      />
                    ) : (
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{
                          borderColor: theme.palette[trigger.color].main,
                          color: theme.palette[trigger.color].main,
                          fontWeight: 600,
                          '&:hover': {
                            borderColor: theme.palette[trigger.color].dark,
                            backgroundColor: alpha(theme.palette[trigger.color].main, 0.1),
                          }
                        }}
                      >
                        Select
                      </Button>
                    )}
                  </Stack>
                </CardContent>
              </Card>
              );
            })}
          </Stack>

          {/* Trigger Configuration */}
          {selectedTrigger && (
            <Box sx={{ mt: 3 }}>
              <Typography variant="subtitle1" fontWeight={600} sx={{ mb: 2 }}>
                Configure Trigger
              </Typography>
              <Stack spacing={2}>
                {selectedTrigger.fields.map((field) => (
                  <Box key={field.name}>
                    {renderField(
                      field,
                      triggerConfig[field.name],
                      (value) => setTriggerConfig(prev => ({ ...prev, [field.name]: value }))
                    )}
                  </Box>
                ))}
              </Stack>
            </Box>
          )}
        </Paper>

        {/* Actions */}
        <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Box>
              <Typography variant="h6" fontWeight={700}>
                Actions
              </Typography>
              <Typography variant="body2" color="text.secondary">
                What should happen when the trigger fires?
              </Typography>
            </Box>
          </Stack>

          <Stack spacing={2}>
            {/* Available Actions */}
            <Box>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                🎯 Add Action:
              </Typography>
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                {ACTIONS.map((action) => (
                  <Button
                    key={action.id}
                    variant="outlined"
                    size="medium"
                    onClick={() => handleAddAction(action)}
                    sx={{
                      textTransform: 'none',
                      borderRadius: 3,
                      borderWidth: 2,
                      fontWeight: 600,
                      px: 3,
                      py: 1.5,
                      borderColor: theme.palette[action.color].main,
                      color: theme.palette[action.color].main,
                      background: `linear-gradient(135deg, ${alpha(theme.palette[action.color].main, 0.05)} 0%, ${alpha(theme.palette[action.color].main, 0.02)} 100%)`,
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&:hover': {
                        borderColor: theme.palette[action.color].dark,
                        backgroundColor: alpha(theme.palette[action.color].main, 0.1),
                        transform: 'translateY(-2px)',
                        boxShadow: `0 6px 20px ${alpha(theme.palette[action.color].main, 0.25)}`,
                      },
                    }}
                  >
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: 1.5,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          backgroundColor: theme.palette[action.color].main,
                          color: 'white',
                          '& svg': { fontSize: 14 }
                        }}
                      >
                        {action.icon}
                      </Box>
                      <Typography fontWeight={600}>
                        {action.name}
                      </Typography>
                    </Stack>
                  </Button>
                ))}
              </Stack>
            </Box>

            <Divider />

            {/* Configured Actions */}
            {actions.length === 0 ? (
              <Alert 
                severity="info" 
                sx={{ 
                  borderRadius: 3,
                  border: `2px dashed ${alpha(theme.palette.info.main, 0.3)}`,
                  backgroundColor: alpha(theme.palette.info.main, 0.05),
                  '& .MuiAlert-icon': {
                    color: theme.palette.info.main,
                  }
                }}
              >
                <Typography fontWeight={600}>
                  🎬 Add your first action to bring this workflow to life!
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5 }}>
                  Choose from the buttons above to define what happens when your trigger fires.
                </Typography>
              </Alert>
            ) : (
              <Stack spacing={3}>
                <Typography variant="subtitle1" fontWeight={700} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  ⚡ Workflow Actions ({actions.length})
                </Typography>
                {actions.map((action, index) => {
                  const actionType = ACTIONS.find(a => a.id === action.type);
                  return (
                    <Card 
                      key={action.id} 
                      sx={{
                        border: `2px solid ${alpha(theme.palette[actionType.color].main, 0.2)}`,
                        borderRadius: 3,
                        background: `linear-gradient(135deg, ${alpha(theme.palette[actionType.color].main, 0.05)} 0%, white 50%)`,
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          transform: 'translateY(-2px)',
                          boxShadow: `0 8px 25px ${alpha(theme.palette[actionType.color].main, 0.15)}`,
                          border: `2px solid ${alpha(theme.palette[actionType.color].main, 0.4)}`,
                        }
                      }}
                    >
                      <CardContent sx={{ p: 3 }}>
                        <Stack direction="row" alignItems="center" spacing={3} sx={{ mb: 3 }}>
                          <Box
                            sx={{
                              width: 50,
                              height: 50,
                              borderRadius: 2.5,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: `linear-gradient(135deg, ${theme.palette[actionType.color].main} 0%, ${theme.palette[actionType.color].dark} 100%)`,
                              color: 'white',
                              boxShadow: `0 4px 12px ${alpha(theme.palette[actionType.color].main, 0.3)}`,
                              '& svg': { fontSize: 24 }
                            }}
                          >
                            {actionType.icon}
                          </Box>
                          
                          <Box sx={{ flex: 1 }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                              <Chip 
                                label={`Step ${index + 1}`} 
                                size="small" 
                                sx={{ 
                                  bgcolor: alpha(theme.palette[actionType.color].main, 0.1),
                                  color: theme.palette[actionType.color].main,
                                  fontWeight: 700,
                                  fontSize: '0.75rem'
                                }} 
                              />
                              <Typography variant="h6" fontWeight={700}>
                                {actionType.name}
                              </Typography>
                            </Stack>
                            <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.5 }}>
                              {actionType.description}
                            </Typography>
                          </Box>

                          <IconButton
                            color="error"
                            onClick={() => handleRemoveAction(action.id)}
                            sx={{
                              bgcolor: alpha(theme.palette.error.main, 0.1),
                              '&:hover': {
                                bgcolor: alpha(theme.palette.error.main, 0.2),
                                transform: 'scale(1.1)',
                              },
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Stack>

                        <Stack spacing={2}>
                          {actionType.fields.map((field) => (
                            <Box key={field.name}>
                              {renderField(
                                field,
                                action.config[field.name],
                                (value) => handleActionConfigChange(action.id, field.name, value)
                              )}
                            </Box>
                          ))}
                        </Stack>
                      </CardContent>
                    </Card>
                  );
                })}
              </Stack>
            )}
          </Stack>
        </Paper>

        {/* Variable Reference */}
        <Alert severity="info" sx={{ borderRadius: 2 }}>
          <Typography fontWeight={600} sx={{ mb: 1 }}>
            💡 Pro Tip: Use Variables
          </Typography>
          <Typography variant="body2">
            Use variables like <code>{'{{task.title}}'}</code>, <code>{'{{task.priority}}'}</code>, <code>{'{{project.name}}'}</code> in your messages and webhooks.
          </Typography>
        </Alert>
      </Stack>
    </Box>
  );
}
