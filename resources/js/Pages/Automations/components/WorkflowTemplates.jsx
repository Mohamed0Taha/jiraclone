import React, { useState } from 'react';
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
import { alpha, useTheme, styled } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';
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
        icon: <EmailIcon />,
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
                    body: 'Hi {{task.assignee.name}},\n\nYour task "{{task.title}}" is due tomorrow ({{task.due_date}}).\n\nPlease make sure to complete it on time.\n\nBest regards,\nProject Management System',
                },
            },
        ],
    },
    {
        id: 'new-task-notifications',
        name: 'New Task Notifications',
        desc: 'Slack on new task.',
        cat: 'notifications',
        icon: <NotificationIcon />,
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
                    message:
                        '🆕 New task created: *{{task.title}}*\nAssigned to: {{task.assignee.name}}\nPriority: {{task.priority}}',
                },
            },
        ],
    },
    {
        id: 'daily-standup-report',
        name: 'Daily Standup Report',
        desc: 'Daily 09:00 summary.',
        cat: 'reports',
        icon: <ScheduleIcon />,
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
                    body: 'Daily project summary:\n\n- Tasks completed yesterday: {{completed_tasks}}\n- Tasks in progress: {{in_progress_tasks}}\n- Blockers: {{blocked_tasks}}\n\nHave a great day!',
                },
            },
        ],
    },
    {
        id: 'status-change-tracking',
        name: 'Status Change Tracking',
        desc: 'Notify on Done.',
        cat: 'analytics',
        icon: <TrendingIcon />,
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
                    body: 'Great news! The task "{{task.title}}" has been marked as completed by {{task.assignee.name}}.\n\nTask details:\n- Priority: {{task.priority}}\n- Completed on: {{current_date}}\n\nWell done!',
                },
            },
        ],
    },
    {
        id: 'bug-assignment',
        name: 'Bug Auto-Assignment',
        desc: 'Assign & notify bugs.',
        cat: 'productivity',
        icon: <BugIcon />,
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
                    body: 'A high priority bug has been reported:\n\nTitle: {{task.title}}\nDescription: {{task.description}}\nReporter: {{task.creator.name}}\nPriority: {{task.priority}}\n\nPlease investigate and assign to the appropriate developer.',
                },
            },
        ],
    },
    {
        id: 'overdue-alerts',
        name: 'Overdue Task Alerts',
        desc: 'Alert overdue tasks.',
        cat: 'notifications',
        icon: <AlertIcon />,
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
                    body: 'URGENT: The task "{{task.title}}" is now overdue.\n\nDue date: {{task.due_date}}\nAssigned to: {{task.assignee.name}}\n\nPlease prioritize this task immediately or update the due date.',
                },
            },
        ],
    },
    {
        id: 'project-backup',
        name: 'Project Data Backup',
        desc: 'Weekly backup.',
        cat: 'reports',
        icon: <BackupIcon />,
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
                    body: '{"project_id": "{{project.id}}", "backup_type": "weekly"}',
                },
            },
        ],
    },
    {
        id: 'code-review-reminder',
        name: 'Code Review Reminders',
        desc: 'Remind reviewers.',
        cat: 'notifications',
        icon: <ReviewIcon />,
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
                    message:
                        '👨‍💻 Code review needed: *{{task.title}}*\n\nPlease review and provide feedback.\nAssigned to: {{task.assignee.name}}\nCreated by: {{task.creator.name}}',
                },
            },
        ],
    },
    {
        id: 'calendar-sync',
        name: 'Calendar Integration',
        desc: 'Events for high priority.',
        cat: 'productivity',
        icon: <CalendarIcon />,
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
                    body: '{"title": "{{task.title}}", "start": "{{task.due_date}}", "attendees": ["{{task.assignee.email}}"]}',
                },
            },
        ],
    },
    {
        id: 'time-tracking-sync',
        name: 'Time Tracking Sync',
        desc: 'Sync estimates.',
        cat: 'productivity',
        icon: <SyncIcon />,
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
                    body: '{"task_id": "{{task.id}}", "estimated_hours": "{{task.estimated_hours}}", "actual_hours": "{{task.actual_hours}}"}',
                },
            },
        ],
    },
    {
        id: 'sprint-completion',
        name: 'Sprint Completion Reports',
        desc: 'Sprint summary.',
        cat: 'reports',
        icon: <AssignmentIcon />,
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
                    body: 'Sprint completed!\n\n📊 Sprint Statistics:\n- Tasks completed: {{sprint.completed_tasks}}\n- Tasks carried over: {{sprint.incomplete_tasks}}\n- Team velocity: {{sprint.velocity}}\n\nGreat work everyone!',
                },
            },
        ],
    },
    {
        id: 'task-time-limit',
        name: 'Task Time Limit Alerts',
        desc: 'Alert overruns.',
        cat: 'analytics',
        icon: <TimerIcon />,
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
                    body: 'Your task "{{task.title}}" has exceeded the estimated time limit.\n\nEstimated: {{task.estimated_hours}} hours\nActual: {{task.actual_hours}} hours\n\nPlease review and update the estimate if needed.',
                },
            },
        ],
    },
    {
        id: 'team-workload-balance',
        name: 'Team Workload Balance',
        desc: 'Watch workload.',
        cat: 'analytics',
        icon: <TeamIcon />,
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
                    body: '{"assignee": "{{task.assignee.id}}", "project": "{{project.id}}", "workload_check": true}',
                },
            },
        ],
    },
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

// Styled components for enhanced UI
const GradientPaper = styled(Paper)(({ theme }) => ({
    background: `linear-gradient(145deg, ${alpha(theme.palette.primary.light, 0.1)}, ${alpha(theme.palette.background.paper, 0.9)})`,
    backdropFilter: 'blur(12px)',
    border: 'none',
    boxShadow: `0 8px 32px 0 ${alpha(theme.palette.primary.dark, 0.1)}`,
}));

const GlowCard = styled(Card)(({ theme, color }) => ({
    position: 'relative',
    overflow: 'visible',
    '&::before': {
        content: '""',
        position: 'absolute',
        top: -2,
        left: -2,
        right: -2,
        bottom: -2,
        background: `linear-gradient(45deg, ${alpha(theme.palette[color].main, 0.3)}, transparent)`,
        borderRadius: 'inherit',
        zIndex: -1,
        opacity: 0,
        transition: 'opacity 0.3s ease-in-out',
    },
    '&:hover::before': {
        opacity: 1,
    },
}));

const FloatingButton = styled(Button)(({ theme, color }) => ({
    boxShadow: `0 4px 20px ${alpha(theme.palette[color].main, 0.3)}`,
    transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
    '&:hover': {
        transform: 'translateY(-3px)',
        boxShadow: `0 6px 24px ${alpha(theme.palette[color].main, 0.4)}`,
    },
}));

const AnimatedIcon = styled(Box)(({ theme, color }) => ({
    transition: 'all 0.3s ease',
    '&:hover': {
        transform: 'scale(1.1) rotate(5deg)',
    },
}));

export default function WorkflowTemplates({ project, onBack, onSelectTemplate }) {

    const theme = useTheme();
    const { t } = useTranslation();
    const [category, setCategory] = useState('all');
    const [q, setQ] = useState('');
    const [density, setDensity] = useState('comfortable');
    const [hoveredCard, setHoveredCard] = useState(null);

    const d = DENSITY[density];

    const filtered = TEMPLATES.filter(
        (t) =>
            (category === 'all' || t.cat === category) &&
            (!q || (t.name + ' ' + t.desc).toLowerCase().includes(q.toLowerCase()))
    );

    return (
        <Box
            sx={{
                p: { xs: 2, md: 4 },
                maxWidth: 1400,
                mx: 'auto',
                background: `radial-gradient(circle at top right, ${alpha(theme.palette.primary.light, 0.05)}, transparent 400px),
                  radial-gradient(circle at bottom left, ${alpha(theme.palette.secondary.light, 0.05)}, transparent 400px)`,
            }}
        >
            <GradientPaper
                elevation={0}
                sx={{
                    mb: 4,
                    p: { xs: 2, md: 3 },
                    borderRadius: 4,
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                }}
            >
                <Stack
                    direction={{ xs: 'column', sm: 'row' }}
                    spacing={{ xs: 1.5, sm: 2 }}
                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                    sx={{ mb: 2 }}
                >
                    <AnimatedIcon>
                        <IconButton
                            onClick={onBack}
                            sx={{
                                bgcolor: alpha(theme.palette.primary.main, 0.1),
                                color: theme.palette.primary.main,
                                '&:hover': {
                                    bgcolor: alpha(theme.palette.primary.main, 0.2),
                                },
                                borderRadius: '50%',
                                p: 1.5,
                            }}
                        >
                            <ArrowBackIcon fontSize="medium" />
                        </IconButton>
                    </AnimatedIcon>

                    <Box sx={{ flex: 1 }}>
                        <Typography
                            variant="h4"
                            fontWeight={800}
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                mb: 0.5,
                            }}
                        >
                            <AutoAwesomeIcon sx={{ mr: 1.5, fontSize: 32 }} />
                            {t('workflows.templates.title', 'Workflow Templates')}
                        </Typography>
                        <Typography
                            variant="body1"
                            color="text.secondary"
                            sx={{ ml: 5.5, maxWidth: 600 }}
                        >
                            {t('workflows.templates.description', 'Pick a vibrant starting point and customize your workflow with our professionally designed templates')}
                        </Typography>
                    </Box>

                    <Chip
                        label={project.name}
                        variant="filled"
                        sx={{
                            fontWeight: 700,
                            px: 1.5,
                            py: 1,
                            bgcolor: alpha(theme.palette.primary.main, 0.15),
                            color: theme.palette.primary.dark,
                            boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.1)}`,
                        }}
                    />

                    <ToggleButtonGroup
                        exclusive
                        size="small"
                        value={density}
                        onChange={(e, val) => val && setDensity(val)}
                        color="primary"
                        sx={{
                            bgcolor: alpha(theme.palette.background.default, 0.6),
                            borderRadius: 3,
                            p: 0.5,
                        }}
                    >
                        <ToggleButton value="compact" sx={{ borderRadius: 2, px: 1.5 }}>
                            {t('workflows.templates.compact', 'Compact')}
                        </ToggleButton>
                        <ToggleButton value="comfortable" sx={{ borderRadius: 2, px: 1.5 }}>
                            {t('workflows.templates.comfort', 'Comfort')}
                        </ToggleButton>
                    </ToggleButtonGroup>
                </Stack>

                <TextField
                    fullWidth
                    size="medium"
                    placeholder={t('workflows.templates.searchPlaceholder', 'Search templates by name or description...')}
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon sx={{ color: alpha(theme.palette.text.secondary, 0.8) }} />
                            </InputAdornment>
                        ),
                    }}
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            borderRadius: 3,
                            bgcolor: alpha(theme.palette.background.default, 0.4),
                            '& fieldset': {
                                borderColor: alpha(theme.palette.divider, 0.3),
                            },
                            '&:hover fieldset': {
                                borderColor: alpha(theme.palette.primary.main, 0.4),
                            },
                            '&.Mui-focused fieldset': {
                                borderColor: alpha(theme.palette.primary.main, 0.7),
                                boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.2)}`,
                            },
                        },
                    }}
                />
            </GradientPaper>

            <Paper
                elevation={0}
                sx={{
                    mb: 4,
                    p: 2,
                    borderRadius: 3,
                    bgcolor: alpha(theme.palette.background.default, 0.6),
                    backdropFilter: 'blur(6px)',
                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                    boxShadow: `0 4px 20px ${alpha(theme.palette.primary.light, 0.05)}`,
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
                                px: 2.5,
                                py: 1,
                                color: category === c.id ? 'white' : theme.palette.primary.main,
                                bgcolor:
                                    category === c.id
                                        ? alpha(theme.palette.primary.main, 0.9)
                                        : alpha(theme.palette.background.paper, 0.6),
                                border:
                                    category === c.id
                                        ? 'none'
                                        : `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                boxShadow:
                                    category === c.id
                                        ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`
                                        : 'none',
                                '&:hover': {
                                    bgcolor:
                                        category === c.id
                                            ? theme.palette.primary.dark
                                            : alpha(theme.palette.primary.main, 0.1),
                                },
                            }}
                        >
                            {c.label}
                        </Button>
                    ))}
                </Stack>
            </Paper>

            {filtered.length > 0 ? (
                <Box
                    sx={{
                        display: 'grid',
                        gridTemplateColumns: {
                            xs: 'repeat(auto-fill, minmax(280px, 1fr))',
                            md: 'repeat(auto-fill, minmax(320px, 1fr))',
                        },
                        gap: 3,
                    }}
                >
                    {filtered.map((t) => (
                        <GlowCard
                            key={t.id}
                            color={t.color}
                            onMouseEnter={() => setHoveredCard(t.id)}
                            onMouseLeave={() => setHoveredCard(null)}
                            sx={{
                                borderRadius: 4,
                                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                                transform: hoveredCard === t.id ? 'translateY(-8px)' : 'none',
                                boxShadow:
                                    hoveredCard === t.id
                                        ? `0 16px 40px ${alpha(theme.palette[t.color].main, 0.2)}`
                                        : theme.shadows[4],
                                border: `1px solid ${alpha(theme.palette[t.color].main, 0.2)}`,
                                background: `linear-gradient(to bottom, ${theme.palette.background.paper}, ${alpha(theme.palette[t.color].light, 0.05)})`,
                            }}
                        >
                            <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={1.5}
                                    sx={{ mb: 1.5 }}
                                >
                                    <Box
                                        sx={{
                                            p: 1,
                                            bgcolor: alpha(theme.palette[t.color].main, 0.1),
                                            borderRadius: '50%',
                                            color: theme.palette[t.color].main,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            width: 40,
                                            height: 40,
                                        }}
                                    >
                                        {t.icon}
                                    </Box>
                                    <Typography
                                        variant="caption"
                                        fontWeight={700}
                                        color={theme.palette[t.color].main}
                                        textTransform="uppercase"
                                        letterSpacing={0.5}
                                        sx={{
                                            bgcolor: alpha(theme.palette[t.color].main, 0.1),
                                            px: 1.5,
                                            py: 0.5,
                                            borderRadius: 3,
                                        }}
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
                                                transition: 'width 0.5s ease',
                                            }}
                                        />
                                    </Box>
                                </Stack>

                                <Typography
                                    variant="h6"
                                    fontWeight={700}
                                    sx={{
                                        mb: 1,
                                        background: `linear-gradient(90deg, ${theme.palette.text.primary}, ${alpha(theme.palette[t.color].main, 0.9)})`,
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}
                                >
                                    {t.name}
                                </Typography>

                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                        mb: 2,
                                        height: 42,
                                        overflow: 'hidden',
                                        lineHeight: 1.5,
                                    }}
                                >
                                    {t.desc}
                                </Typography>

                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={1}
                                    sx={{ mb: 2 }}
                                >
                                    <Chip
                                        label={t.trig}
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                            borderColor: alpha(theme.palette[t.color].main, 0.5),
                                            color: theme.palette[t.color].main,
                                            fontWeight: 600,
                                            fontSize: '0.7rem',
                                        }}
                                    />
                                    <Typography
                                        variant="caption"
                                        color="text.secondary"
                                        sx={{ ml: 'auto', fontSize: '0.75rem' }}
                                    >
                                        {t.actions.length} action{t.actions.length > 1 ? 's' : ''}
                                    </Typography>
                                </Stack>

                                <FloatingButton
                                    fullWidth
                                    variant="contained"
                                    color={t.color}
                                    onClick={() =>
                                        onSelectTemplate({
                                            name: t.name,
                                            description: t.desc,
                                            trigger: t.trigger,
                                            triggerConfig: t.triggerConfig || {},
                                            actions: t.actions || [],
                                            status: 'active',
                                        })
                                    }
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        borderRadius: 3,
                                        py: 1,
                                        letterSpacing: 0.5,
                                        background: `linear-gradient(90deg, ${theme.palette[t.color].main}, ${theme.palette[t.color].dark})`,
                                        '&:hover': {
                                            background: `linear-gradient(90deg, ${theme.palette[t.color].dark}, ${theme.palette[t.color].dark})`,
                                        },
                                    }}
                                >
                                    {t('workflows.templates.useTemplate', 'Use Template')}
                                </FloatingButton>
                            </CardContent>
                        </GlowCard>
                    ))}
                </Box>
            ) : (
                <Paper
                    elevation={0}
                    sx={{
                        mt: 3,
                        p: 6,
                        textAlign: 'center',
                        borderRadius: 4,
                        bgcolor: alpha(theme.palette.warning.light, 0.1),
                        border: `1px solid ${alpha(theme.palette.warning.main, 0.2)}`,
                        backdropFilter: 'blur(4px)',
                    }}
                >
                    <AutoAwesomeIcon
                        sx={{
                            fontSize: 60,
                            color: theme.palette.warning.main,
                            mb: 2,
                            opacity: 0.8,
                        }}
                    />
                    <Typography variant="h5" fontWeight={700} color="text.primary">
                        {t('workflows.templates.noTemplatesFound', 'No Templates Found')}
                    </Typography>
                    <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
                        {t('workflows.templates.noTemplatesMessage', 'Try adjusting your search or category to find what you need')}
                    </Typography>
                    <Button
                        variant="outlined"
                        color="warning"
                        onClick={() => {
                            setQ('');
                            setCategory('all');
                        }}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: 3,
                            px: 3,
                            py: 1,
                        }}
                    >
                        {t('workflows.templates.resetFilters', 'Reset Filters')}
                    </Button>
                </Paper>
            )}

            <Paper
                elevation={0}
                sx={{
                    mt: 6,
                    p: 4,
                    borderRadius: 4,
                    bgcolor: alpha(theme.palette.success.light, 0.1),
                    border: `1px solid ${alpha(theme.palette.success.main, 0.2)}`,
                    backdropFilter: 'blur(4px)',
                    position: 'relative',
                    overflow: 'hidden',
                    '&::before': {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        width: 120,
                        height: 120,
                        background: `radial-gradient(${alpha(theme.palette.success.main, 0.2)} 0%, transparent 70%)`,
                        transform: 'translate(40%, -40%)',
                        borderRadius: '50%',
                        zIndex: 0,
                    },
                }}
            >
                <Box position="relative" zIndex={1}>
                    <Typography variant="h5" fontWeight={800} color="success.dark" sx={{ mb: 1.5 }}>
                        {t('workflows.templates.customWorkflow', 'Need a Custom Workflow?')}
                    </Typography>
                    <Typography
                        variant="body1"
                        color="text.secondary"
                        sx={{ mb: 3, maxWidth: 600 }}
                    >
                        {t('workflows.templates.customWorkflowDescription', 'Templates are great starters—customize triggers, actions, and more to create a workflow that fits your team perfectly.')}
                    </Typography>
                    <Button
                        variant="contained"
                        color="success"
                        onClick={onBack}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            borderRadius: 3,
                            px: 4,
                            py: 1.5,
                            background: `linear-gradient(90deg, ${theme.palette.success.main}, ${theme.palette.success.dark})`,
                            boxShadow: `0 4px 20px ${alpha(theme.palette.success.main, 0.3)}`,
                            '&:hover': {
                                boxShadow: `0 6px 24px ${alpha(theme.palette.success.main, 0.4)}`,
                            },
                        }}
                    >
                        {t('workflows.templates.createCustomWorkflow', 'Create Custom Workflow')}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
}
