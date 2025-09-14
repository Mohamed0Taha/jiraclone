// resources/js/Pages/Automations/components/WorkflowBuilder.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
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
import VariableChips from './VariableChips';

// Static data for triggers and actions
const TRIGGERS_RAW = [
    {
        id: 'task_created',
        name: 'Task Created',
        description: 'When a new task is created',
        icon: <TaskIcon />,
        color: 'primary',
        fields: [
            {
                name: 'columns',
                label: 'Columns (optional)',
                type: 'multiselect',
                options: ['To Do', 'In Progress', 'Review', 'Done'],
            },
            {
                name: 'priority',
                label: 'Priority',
                type: 'select',
                options: ['Any', 'Low', 'Medium', 'High', 'Critical'],
                default: 'Any',
            },
        ],
    },
    {
        id: 'task_updated',
        name: 'Task Updated',
        description: 'When a task is modified',
        icon: <TaskIcon />,
        color: 'info',
        fields: [
            {
                name: 'field',
                label: 'Field Changed',
                type: 'select',
                options: ['Any', 'Status', 'Priority', 'Assignee', 'Due Date'],
                default: 'Any',
            },
            {
                name: 'from_status',
                label: 'From Status',
                type: 'select',
                options: ['Any', 'To Do', 'In Progress', 'Review', 'Done'],
                default: 'Any',
            },
            {
                name: 'to_status',
                label: 'To Status',
                type: 'select',
                options: ['Any', 'To Do', 'In Progress', 'Review', 'Done'],
                default: 'Any',
            },
        ],
    },
    {
        id: 'schedule',
        name: 'Schedule',
        description: 'Run on a fixed schedule',
        icon: <ScheduleIcon />,
        color: 'secondary',
        fields: [
            {
                name: 'frequency',
                label: 'Frequency',
                type: 'select',
                options: ['Daily', 'Weekly', 'Monthly'],
                default: 'Daily',
            },
            { name: 'time', label: 'Time', type: 'time', default: '09:00' },
            {
                name: 'timezone',
                label: 'Timezone',
                type: 'select',
                options: [
                    'UTC',
                    'Europe/Madrid',
                    'America/New_York',
                    'Europe/London',
                    'Asia/Tokyo',
                ],
                default: 'Europe/Madrid',
            },
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
            {
                name: 'priority',
                label: 'Limit to Priority',
                type: 'select',
                options: ['Any', 'High', 'Critical'],
                default: 'Any',
            },
        ],
    },
];

const ACTIONS_RAW = [
    {
        id: 'send_email',
        name: 'Send Email',
        description: 'Send an email notification',
        icon: <EmailIcon />,
        color: 'primary',
        fields: [
            { name: 'to', label: 'To', type: 'text', placeholder: 'email@example.com' },
            {
                name: 'subject',
                label: 'Subject',
                type: 'text',
                placeholder: 'Task Update: {{task.title}}',
            },
            {
                name: 'body',
                label: 'Body',
                type: 'textarea',
                placeholder:
                    'Hello {{user.name}},\n\nTask "{{task.title}}" in project {{project.name}} has been updated.\n\nStatus: {{task.status}}\nPriority: {{task.priority}}\n\nBest regards,\nTaskPilot',
            },
            {
                name: 'provider',
                label: 'Provider',
                type: 'select',
                options: ['SMTP', 'SendGrid', 'SES'],
                default: 'SMTP',
            },
        ],
    },
    {
        id: 'slack_message',
        name: 'Slack Message',
        description: 'Send a message to Slack via webhook',
        icon: <NotificationsIcon />,
        color: 'success',
        fields: [
            {
                name: 'webhook_url',
                label: 'Webhook URL',
                type: 'text',
                placeholder: 'https://hooks.slack.com/services/...',
            },
            { name: 'channel', label: 'Channel', type: 'text', placeholder: '#general' },
            {
                name: 'message',
                label: 'Message',
                type: 'textarea',
                placeholder:
                    '🎯 Task Update!\n\n📋 **{{task.title}}** in *{{project.name}}*\n📊 Status: {{task.status}}\n⚡ Priority: {{task.priority}}\n👤 Assigned to: {{task.assignee.name}}',
            },
        ],
    },
    {
        id: 'discord_message',
        name: 'Discord Message',
        description: 'Post to Discord via webhook',
        icon: <ForumIcon />,
        color: 'secondary',
        fields: [
            {
                name: 'webhook_url',
                label: 'Webhook URL',
                type: 'text',
                placeholder: 'https://discord.com/api/webhooks/...',
            },
            {
                name: 'content',
                label: 'Content',
                type: 'textarea',
                placeholder:
                    '🚀 **Task Update** 🚀\n\n📝 **{{task.title}}**\n🏗️ Project: {{project.name}}\n📈 Status: {{task.status}} → Priority: {{task.priority}}\n👤 Assigned: {{task.assignee.name}}',
            },
        ],
    },
    {
        id: 'create_calendar_event',
        name: 'Google Calendar Event',
        description: 'Add an event to Google Calendar',
        icon: <CalendarIcon />,
        color: 'info',
        fields: [
            {
                name: 'calendar_id',
                label: 'Calendar',
                type: 'select',
                options: ['primary', 'work', 'personal'],
                default: 'primary',
            },
            {
                name: 'title',
                label: 'Event Title',
                type: 'text',
                placeholder: 'Task: {{task.title}}',
            },
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
            {
                name: 'repo',
                label: 'Repository (owner/name)',
                type: 'text',
                placeholder: 'myorg/myrepo',
            },
            {
                name: 'title',
                label: 'Issue Title',
                type: 'text',
                placeholder: 'Bug: {{task.title}}',
            },
            {
                name: 'body',
                label: 'Issue Body',
                type: 'textarea',
                placeholder: 'Steps to reproduce...',
            },
            {
                name: 'labels',
                label: 'Labels (comma-separated)',
                type: 'text',
                placeholder: 'bug, backlog',
            },
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
            {
                name: 'api_key',
                label: 'API Key',
                type: 'password',
                placeholder: 'Your Trello API Key',
            },
            { name: 'token', label: 'Token', type: 'password', placeholder: 'Your Trello Token' },
            {
                name: 'list_id',
                label: 'List ID',
                type: 'text',
                placeholder: 'xxxxxxxxxxxxxxxxxxxxxx',
            },
            { name: 'title', label: 'Card Title', type: 'text', placeholder: '{{task.title}}' },
            {
                name: 'description',
                label: 'Description',
                type: 'textarea',
                placeholder: 'Card description...',
            },
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
            {
                name: 'database_id',
                label: 'Database ID',
                type: 'text',
                placeholder: 'xxxxxxxxxxxxxxxxxxxxxx',
            },
            { name: 'title', label: 'Title', type: 'text', placeholder: '{{task.title}}' },
            {
                name: 'properties_json',
                label: 'Properties (JSON)',
                type: 'textarea',
                placeholder: '{"Status":{"select":{"name":"In Progress"}}}',
            },
        ],
    },
    {
        id: 'sms',
        name: 'SMS',
        description: 'Send an SMS message',
        icon: <SmsIcon />,
        color: 'primary',
        fields: [
            {
                name: 'phone_number',
                label: 'Phone Number',
                type: 'text',
                placeholder: '+1234567890',
            },
            {
                name: 'message',
                label: 'Message',
                type: 'textarea',
                placeholder: 'Hello {{user.name}}! Task "{{task.title}}" has been {{task.status}}.',
            },
        ],
    },
    {
        id: 'webhook',
        name: 'Webhook',
        description: 'Send a generic HTTP request',
        icon: <ConnectIcon />,
        color: 'secondary',
        fields: [
            {
                name: 'url',
                label: 'URL',
                type: 'text',
                placeholder: 'https://api.example.com/webhook',
            },
            {
                name: 'method',
                label: 'Method',
                type: 'select',
                options: ['POST', 'PUT', 'PATCH'],
                default: 'POST',
            },
            {
                name: 'headers',
                label: 'Headers (JSON)',
                type: 'textarea',
                placeholder: '{"Content-Type":"application/json"}',
            },
            {
                name: 'body',
                label: 'Body (JSON)',
                type: 'textarea',
                placeholder: '{"task":"{{task.title}}"}',
            },
        ],
    },
];

export default function WorkflowBuilder({ onBack = () => { } }) {
    const { t } = useTranslation();
    const theme = useTheme();

    // State for builder
    const [selectedTrigger, setSelectedTrigger] = useState(null);
    const [triggerConfig, setTriggerConfig] = useState({});
    const [selectedActions, setSelectedActions] = useState([]); // {id, type, config}
    const [isActive, setIsActive] = useState(true);
    const [snack, setSnack] = useState('');
    const [error, setError] = useState('');

    // Translate triggers and actions definitions
    const triggers = useMemo(() => TRIGGERS_RAW.map(tr => ({
        ...tr,
        name: t(`automations.${tr.id}`, tr.name),
        description: t(`automations.${tr.id}Desc`, tr.description),
        fields: (tr.fields || []).map(f => ({
            ...f,
            label: t(`automations.${tr.id}.${f.name}`, f.label),
            options: f.options ? f.options.map(opt => t(`automations.${tr.id}.${f.name}.${opt}`, opt)) : undefined
        }))
    })), [t]);

    const actionDefs = useMemo(() => ACTIONS_RAW.map(act => ({
        ...act,
        name: t(`automations.${act.id}`, act.name),
        description: t(`automations.${act.id}Desc`, act.description),
        fields: (act.fields || []).map(f => ({
            ...f,
            label: t(`automations.${act.id}.${f.name}`, f.label),
            options: f.options ? f.options.map(opt => t(`automations.${act.id}.${f.name}.${opt}`, opt)) : undefined,
            placeholder: f.placeholder ? t(`automations.${act.id}.${f.name}.placeholder`, f.placeholder) : undefined
        }))
    })), [t]);

    const canSave = Boolean(selectedTrigger) && selectedActions.length > 0;

    // Helpers
    function addAction(def) {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        const cfg = {};
        for (const f of def.fields || []) {
            if (typeof f.default !== 'undefined') cfg[f.name] = f.default;
            else cfg[f.name] = '';
        }
        setSelectedActions((prev) => [...prev, { id, type: def.id, config: cfg }]);
    }

    function removeAction(id) {
        setSelectedActions((prev) => prev.filter((a) => a.id !== id));
    }

    function setActionConfig(actionId, name, value) {
        setSelectedActions((prev) => prev.map((a) => (a.id === actionId ? { ...a, config: { ...a.config, [name]: value } } : a)));
    }

    function handleSave() {
        if (!canSave) {
            setError(t('automations.addTriggerAndAction', 'Add a trigger and at least one action'));
            return;
        }
        setError('');
        setSnack(t('automations.saved', 'Saved'));
    }

    function renderField(field, value, onChange) {
        const common = {
            fullWidth: true,
            label: field.label,
            value: value ?? '',
            onChange: (e) => onChange(e.target.value),
            size: 'small',
        };
        switch (field.type) {
            case 'textarea':
                return (
                    <TextField {...common} multiline minRows={3} placeholder={field.placeholder || ''} />
                );
            case 'select':
                return (
                    <FormControl fullWidth size="small">
                        <InputLabel>{field.label}</InputLabel>
                        <Select
                            value={value ?? ''}
                            label={field.label}
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
                            value={Array.isArray(value) ? value : []}
                            label={field.label}
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
            case 'number':
                return <TextField {...common} type="number" placeholder={field.placeholder || ''} />;
            case 'password':
                return <TextField {...common} type="password" placeholder={field.placeholder || ''} />;
            case 'time':
                return <TextField {...common} type="time" placeholder={field.placeholder || ''} />;
            default:
                return <TextField {...common} placeholder={field.placeholder || ''} />;
        }
    }

    return (
        <Box>
            <Stack spacing={3}>
                {/* Trigger */}
                <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
                    <Typography variant="h6" fontWeight={700} sx={{ mb: 2 }}>
                        {t('automations.chooseTrigger', 'Choose a Trigger')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                        {t('automations.selectEvent', 'Select what event will start this workflow.')}
                    </Typography>

                    <Stack spacing={2}>
                        {triggers.map((trigger) => {
                            const isSelected = selectedTrigger?.id === trigger.id;
                            return (
                                <Card
                                    key={trigger.id}
                                    onClick={() => {
                                        setSelectedTrigger(trigger);
                                        const defaults = {};
                                        for (const f of trigger.fields || []) {
                                            if (typeof f.default !== 'undefined')
                                                defaults[f.name] = f.default;
                                        }
                                        setTriggerConfig(defaults);
                                    }}
                                    sx={{
                                        cursor: 'pointer',
                                        border: isSelected
                                            ? `3px solid ${theme.palette[trigger.color || 'primary'].main}`
                                            : `2px solid transparent`,
                                        borderRadius: 3,
                                        transition: 'all .2s',
                                        transform: isSelected ? 'scale(1.01)' : 'scale(1)',
                                        background: isSelected
                                            ? `linear-gradient(135deg, ${alpha(theme.palette[trigger.color || 'primary'].main, 0.12)} 0%, ${alpha(
                                                theme.palette.mode === 'dark' ? '#0f172a' : '#ffffff',
                                                0.8
                                            )} 100%)`
                                            : theme.palette.mode === 'dark'
                                                ? alpha('#0f172a', 0.9)
                                                : '#ffffff',
                                        '&:hover': {
                                            transform: 'scale(1.01)',
                                            boxShadow: `0 10px 25px ${alpha(theme.palette[trigger.color || 'primary'].main, 0.18)}`,
                                            border: `3px solid ${alpha(theme.palette[trigger.color || 'primary'].main, 0.5)}`,
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
                                                    background: `linear-gradient(135deg, ${theme.palette[trigger.color || 'primary'].main} 0%, ${theme.palette[trigger.color || 'primary'].dark} 100%)`,
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
                                                <Chip
                                                    label={t('automations.selected', 'Selected')}
                                                    color="primary"
                                                    sx={{ fontWeight: 700 }}
                                                />
                                            ) : (
                                                <Button variant="outlined" size="small">
                                                    {t('automations.select', 'Select')}
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
                                {t('automations.configureTrigger', 'Configure Trigger')}
                            </Typography>
                            <Stack spacing={2}>
                                {(selectedTrigger.fields || []).map((field) => (
                                    <Box key={field.name}>
                                        {renderField(field, triggerConfig[field.name], (v) =>
                                            setTriggerConfig((prev) => ({
                                                ...prev,
                                                [field.name]: v,
                                            }))
                                        )}
                                    </Box>
                                ))}
                            </Stack>
                        </Box>
                    )}
                </Paper>

                {/* Actions */}
                <Paper elevation={1} sx={{ p: 3, borderRadius: 3 }}>
                    <Stack
                        direction="row"
                        alignItems="center"
                        justifyContent="space-between"
                        sx={{ mb: 2 }}
                    >
                        <Box>
                            <Typography variant="h6" fontWeight={700}>
                                {t('automations.actions', 'Actions')}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {t('automations.addActionsDesc', 'Add one or more actions that will run when the trigger fires.')}
                            </Typography>
                        </Box>
                    </Stack>

                    {/* Action picker */}
                    <Box sx={{ mb: 2 }}>
                        <Typography variant="subtitle2" fontWeight={800} sx={{ mb: 1 }}>
                            {t('automations.addAction', 'Add Action')}
                        </Typography>
                        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                            {actionDefs.map((a) => (
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
                                        borderColor: theme.palette[a.color || 'primary'].main,
                                        color: theme.palette[a.color || 'primary'].main,
                                        background: alpha(
                                            theme.palette[a.color || 'primary'].main,
                                            0.04
                                        ),
                                        '&:hover': {
                                            borderColor: theme.palette[a.color || 'primary'].dark,
                                            background: alpha(
                                                theme.palette[a.color || 'primary'].main,
                                                0.1
                                            ),
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
                                                backgroundColor:
                                                    theme.palette[a.color || 'primary'].main,
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

                    {selectedActions.length === 0 ? (
                        <Alert severity="info" sx={{ borderRadius: 2 }}>
                            {t('automations.addFirstAction', '🎬 Add your first action to bring this workflow to life!')}
                        </Alert>
                    ) : (
                        <Stack spacing={2}>
                            {selectedActions.map((action, idx) => {
                                const def = actionDefs.find((x) => x.id === action.type);
                                if (!def) {
                                    return (
                                        <Card
                                            key={action.id}
                                            sx={{ border: '2px solid #ff9800', borderRadius: 3 }}
                                        >
                                            <CardContent sx={{ p: 2.5 }}>
                                                <Typography
                                                    variant="subtitle1"
                                                    fontWeight={800}
                                                    color="warning.main"
                                                >
                                                    {t('automations.unknownAction', 'Unknown Action')}: {action.type}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {t('automations.unknownActionDesc', 'This action type is not recognized. Please remove it or choose a different action.')}
                                                </Typography>
                                                <Box sx={{ mt: 2 }}>
                                                    <Tooltip title={t('automations.remove', 'Remove')}>
                                                        <IconButton
                                                            color="error"
                                                            onClick={() => removeAction(action.id)}
                                                        >
                                                            <DeleteIcon />
                                                        </IconButton>
                                                    </Tooltip>
                                                </Box>
                                            </CardContent>
                                        </Card>
                                    );
                                }
                                return (
                                    <Card
                                        key={action.id}
                                        sx={{
                                            border: `2px solid ${alpha(theme.palette[def?.color || 'primary'].main, 0.2)}`,
                                            borderRadius: 3,
                                            background:
                                                theme.palette.mode === 'dark'
                                                    ? `linear-gradient(135deg, ${alpha(theme.palette[def?.color || 'primary'].main, 0.08)} 0%, ${alpha('#0f172a', 0.9)} 60%)`
                                                    : `linear-gradient(135deg, ${alpha(theme.palette[def?.color || 'primary'].main, 0.05)} 0%, white 60%)`,
                                        }}
                                    >
                                        <CardContent sx={{ p: 2.5 }}>
                                            <Stack
                                                direction="row"
                                                spacing={2}
                                                alignItems="center"
                                                sx={{ mb: 1.5 }}
                                            >
                                                <Box
                                                    sx={{
                                                        width: 44,
                                                        height: 44,
                                                        borderRadius: 2,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        color: 'white',
                                                        background: `linear-gradient(135deg, ${theme.palette[def?.color || 'primary'].main} 0%, ${theme.palette[def?.color || 'primary'].dark} 100%)`,
                                                    }}
                                                >
                                                    {def?.icon}
                                                </Box>
                                                <Typography variant="subtitle1" fontWeight={800}>
                                                    Step {idx + 1}: {def?.name || 'Unknown Action'}
                                                </Typography>
                                                <Box sx={{ flex: 1 }} />
                                                <Tooltip title={t('automations.remove', 'Remove')}>
                                                    <IconButton
                                                        color="error"
                                                        onClick={() => removeAction(action.id)}
                                                    >
                                                        <DeleteIcon />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>

                                            <Typography
                                                variant="body2"
                                                color="text.secondary"
                                                sx={{ mb: 1.5 }}
                                            >
                                                {def?.description || t('automations.noDescription', 'No description available')}
                                            </Typography>

                                            <Stack spacing={2}>
                                                {(def?.fields || []).map((f) => (
                                                    <Box key={f.name}>
                                                        {renderField(
                                                            f,
                                                            action.config[f.name],
                                                            (v) =>
                                                                setActionConfig(
                                                                    action.id,
                                                                    f.name,
                                                                    v
                                                                )
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
                </Paper>

                {/* Tip */}
                <Alert severity="info" sx={{ borderRadius: 2 }}>
                    {t('automations.proTip', '💡 Pro tip: Use variables like')} <code>{'{{task.title}}'}</code>,{' '}
                    <code>{'{{task.priority}}'}</code>, <code>{'{{project.name}}'}</code> {t('automations.inMessages', 'in messages and webhooks.')}
                </Alert>

                {error && (
                    <Alert severity="error" sx={{ borderRadius: 2 }}>
                        {error}
                    </Alert>
                )}
            </Stack>

            {/* Sticky bottom action bar */}
            <Paper
                elevation={8}
                sx={{
                    position: 'sticky',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    borderTopLeftRadius: 16,
                    borderTopRightRadius: 16,
                    p: 2,
                    mt: 3,
                    backdropFilter: 'blur(8px)',
                    background: (theme) =>
                        `linear-gradient(180deg, ${alpha(theme.palette.background.paper, 0.7)}, ${theme.palette.background.paper})`,
                    borderTop: (theme) => `1px solid ${alpha(theme.palette.divider, 0.4)}`,
                }}
            >
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={1.5}
                    alignItems={{ xs: 'stretch', sm: 'center' }}
                    justifyContent="space-between"
                >
                    <Stack direction="row" spacing={1.5} alignItems="center">
                        <Chip
                            label={isActive ? t('automations.willActivate', 'Will activate on save') : t('automations.willPause', 'Will be paused on save')}
                            color={isActive ? 'success' : 'warning'}
                            sx={{ fontWeight: 700 }}
                        />
                        <FormControlLabel
                            control={
                                <Switch
                                    checked={isActive}
                                    onChange={(e) => setIsActive(e.target.checked)}
                                />
                            }
                            label={isActive ? t('automations.active', 'Active') : t('automations.paused', 'Paused')}
                        />
                    </Stack>
                    <Stack direction="row" spacing={1.5} justifyContent="flex-end">
                        <Button
                            variant="text"
                            onClick={onBack}
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                            {t('automations.cancel', 'Cancel')}
                        </Button>
                        <Tooltip
                            title={
                                !canSave ? t('automations.addTriggerAndAction', 'Add a trigger and at least one action') : t('automations.saveWorkflow', 'Save workflow')
                            }
                        >
                            <span>
                                <Button
                                    variant="contained"
                                    startIcon={<PlayIcon />}
                                    onClick={handleSave}
                                    disabled={!canSave}
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 800,
                                        px: 3,
                                        borderRadius: 3,
                                        background: (theme) =>
                                            `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                        boxShadow: (theme) =>
                                            `0 10px 24px ${alpha(theme.palette.primary.main, 0.3)}`,
                                    }}
                                >
                                    {t('automations.saveWorkflow', 'Save Workflow')}
                                </Button>
                            </span>
                        </Tooltip>
                    </Stack>
                </Stack>
            </Paper>

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
