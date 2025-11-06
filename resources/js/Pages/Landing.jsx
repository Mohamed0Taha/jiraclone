import React from 'react';
import { Head, useForm, Link as InertiaLink } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    Button,
    CircularProgress,
    Container,
    Fab,
    Link,
    Stack,
    TextField,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Chip,
    Avatar,
    useTheme,
    alpha,
    Divider,
} from '@mui/material';
import {
    Google as GoogleIcon,
    SmartToyRounded as SmartToyRoundedIcon,
    AutoAwesome,
    ViewModule,
    Settings,
    IntegrationInstructions,
    Search,
    Home,
    TrendingUp,
    Timeline,
    GroupWork,
    Security,
    Speed,
    CheckCircle,
    Star,
    Business,
    Group,
    Assignment,
    Dashboard,
    AutoFixHigh,
    Analytics,
    Schedule,
    Task,
    Rocket,
    Lightbulb,
    Shield,
    PlayArrowRounded,
    ReplayRounded,
} from '@mui/icons-material';
import ThemeToggle from '@/Components/ThemeToggle';
import LanguageDropdown from '@/Components/LanguageDropdown';
import { lighten, darken } from '@mui/material/styles';
import {
    STATUS_META_BY_METHOD,
    STATUS_ORDER_BY_METHOD,
    METHODOLOGIES,
} from '@/Pages/Board/meta.jsx';

const KANBAN_META = STATUS_META_BY_METHOD[METHODOLOGIES.KANBAN] || {};
const KANBAN_ORDER = STATUS_ORDER_BY_METHOD[METHODOLOGIES.KANBAN] || [
    'todo',
    'inprogress',
    'review',
    'done',
];

// Normalize raw tasks and attach stable uids so React keys remain consistent
function normalizeTasksWithUids(tasks = []) {
    const baseDate = new Date();
    const formatter = new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' });
    const seed = Date.now();
    return tasks.map((rawTask, index) => {
        const start = new Date(baseDate);
        start.setDate(start.getDate() + index);
        const end = new Date(start);
        end.setDate(end.getDate() + 3);
        const parsedStart = rawTask?.start_date ? new Date(rawTask.start_date) : null;
        const parsedEnd = rawTask?.end_date ? new Date(rawTask.end_date) : null;
        const uid = rawTask?.uid || (rawTask?.id ? `task-${rawTask.id}` : `gen-${seed}-${index}`);

        return {
            id: rawTask?.id ?? index + 1,
            uid,
            title: rawTask?.title || `Task ${index + 1}`,
            description: rawTask?.description || '',
            priority: rawTask?.priority || 'medium',
            category: rawTask?.category || 'General',
            start_date: parsedStart && !Number.isNaN(parsedStart.getTime())
                ? formatter.format(parsedStart)
                : formatter.format(start),
            end_date: parsedEnd && !Number.isNaN(parsedEnd.getTime())
                ? formatter.format(parsedEnd)
                : formatter.format(end),
            status: String(rawTask?.status || '').toLowerCase(),
        };
    });
}

function distributeTasksAcrossColumns(tasks = []) {
    const order = KANBAN_ORDER.length ? KANBAN_ORDER : ['todo', 'inprogress', 'review', 'done'];
    const buckets = order.reduce((acc, key) => {
        acc[key] = [];
        return acc;
    }, {});

    if (!Array.isArray(tasks) || tasks.length === 0) {
        return buckets;
    }

    const minPerColumn = 1;
    const maxPerColumn = 3;

    // First pass: ensure each column gets at least 1 task
    let taskIdx = 0;
    for (let i = 0; i < order.length && taskIdx < tasks.length; i++) {
        const status = order[i];
        buckets[status].push({
            ...tasks[taskIdx],
            status,
        });
        taskIdx++;
    }

    // Second pass: distribute remaining tasks, respecting max 3 per column
    while (taskIdx < tasks.length) {
        let added = false;
        for (let i = 0; i < order.length && taskIdx < tasks.length; i++) {
            const status = order[i];
            if (buckets[status].length < maxPerColumn) {
                buckets[status].push({
                    ...tasks[taskIdx],
                    status,
                });
                taskIdx++;
                added = true;
            }
        }
        // Break if no column can accept more tasks
        if (!added) break;
    }

    return buckets;
}

function LandingMiniCard({ task, meta, isDark, animationDelay = 0, isBeingEdited = false, isDragging = false, onDragStart, onDragEnd }) {
    const accent = meta?.accent || '#4F46E5';
    const gradient = meta?.gradient || `linear-gradient(135deg, ${alpha(accent, 0.08)}, ${alpha(
        accent,
        0.02
    )})`;

    return (
        <Paper
            draggable={true}
            onDragStart={(e) => {
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', task.uid);
                onDragStart?.(task);
            }}
            onDragEnd={(e) => {
                onDragEnd?.();
            }}
            elevation={0}
            sx={{
                p: 2,
                borderRadius: 3,
                cursor: 'grab',
                '&:active': {
                    cursor: 'grabbing',
                },
                border: `2px solid ${isDragging ? accent : (isBeingEdited ? accent : alpha(accent, isDark ? 0.42 : 0.24))}`,
                background: isDragging
                    ? `linear-gradient(135deg, ${alpha(accent, 0.25)}, ${alpha(accent, 0.15)})`
                    : (isBeingEdited 
                        ? (isDark ? alpha(accent, 0.15) : alpha(accent, 0.08))
                        : (isDark
                            ? alpha('#0f172a', 0.68)
                            : 'linear-gradient(140deg, rgba(255,255,255,0.85), rgba(255,255,255,0.55))')),
                backdropFilter: 'blur(18px)',
                boxShadow: isDragging
                    ? `0 20px 40px -12px ${alpha(accent, 0.5)}`
                    : (isDark
                        ? '0 8px 20px -12px rgba(0,0,0,0.5)'
                        : '0 10px 24px -16px rgba(15,23,42,0.22)'),
                transform: isDragging ? 'scale(1.05) rotate(2deg)' : 'scale(1)',
                transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                zIndex: isDragging ? 10 : 1,
                animation: `bounceIn 0.6s cubic-bezier(0.68, -0.55, 0.265, 1.55) ${animationDelay}ms both`,
                '@keyframes bounceIn': {
                    '0%': {
                        opacity: 0,
                        transform: 'translateY(30px) scale(0.3)',
                    },
                    '50%': {
                        opacity: 0.8,
                        transform: 'translateY(-10px) scale(1.05)',
                    },
                    '70%': {
                        transform: 'translateY(5px) scale(0.95)',
                    },
                    '100%': {
                        opacity: 1,
                        transform: 'translateY(0) scale(1)',
                    },
                },
                '&:hover': {
                    transform: 'translateY(-3px) scale(1.015)',
                    boxShadow: isDark
                        ? '0 18px 42px -16px rgba(0,0,0,0.7)'
                        : '0 20px 40px -14px rgba(15,23,42,0.28)',
                    borderColor: alpha(meta.accent, isDark ? 0.68 : 0.45),
                },
            }}
        >
            <Typography
                variant="caption"
                sx={{
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: 1,
                    color: alpha(accent, isDark ? 0.65 : 0.8),
                }}
            >
                #{task.id}
            </Typography>
            <Typography
                variant="subtitle1"
                sx={{ 
                    fontWeight: 700, 
                    lineHeight: 1.2, 
                    color: 'text.primary',
                    '@keyframes blink': {
                        '0%, 49%': { opacity: 1 },
                        '50%, 100%': { opacity: 0 },
                    },
                }}
            >
                {task.title}
                {isBeingEdited && (
                    <Box 
                        component="span" 
                        sx={{ 
                            display: 'inline-block',
                            width: '2px',
                            height: '1em',
                            ml: 0.5,
                            backgroundColor: accent,
                            animation: 'blink 1s infinite',
                        }}
                    />
                )}
            </Typography>
            {task.description && (
                <Typography
                    variant="body2"
                    sx={{
                        color: alpha('#111827', isDark ? 0.55 : 0.7),
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                    }}
                >
                    {task.description}
                </Typography>
            )}
            <Stack direction="row" spacing={1.25} alignItems="center" sx={{ mt: 'auto' }}>
                <Schedule fontSize="small" sx={{ color: alpha(accent, 0.9) }} />
                <Typography variant="caption" sx={{ fontWeight: 600 }}>
                    {task.start_date} → {task.end_date}
                </Typography>
            </Stack>
            <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip
                    size="small"
                    label={task.priority}
                    sx={{
                        textTransform: 'capitalize',
                        fontWeight: 600,
                        background: alpha(accent, 0.12),
                    }}
                />
                <Chip size="small" variant="outlined" label={task.category} />
            </Stack>
        </Paper>
    );
}

/** Robot typing animation component */
function RobotTypingAnimation({ theme, size = 40 }) {
    return (
        <Box
            sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.5,
                '@keyframes robotBounce': {
                    '0%, 20%, 50%, 80%, 100%': {
                        transform: 'translateY(0) rotate(0deg)',
                    },
                    '40%': {
                        transform: 'translateY(-3px) rotate(-3deg)',
                    },
                    '60%': {
                        transform: 'translateY(-2px) rotate(2deg)',
                    },
                },
                '@keyframes typingDot1': {
                    '0%, 80%, 100%': {
                        transform: 'scale(0.6)',
                        opacity: 0.4,
                    },
                    '40%': {
                        transform: 'scale(1.2)',
                        opacity: 1,
                    },
                },
                '@keyframes typingDot2': {
                    '0%, 20%, 60%, 100%': {
                        transform: 'scale(0.6)',
                        opacity: 0.4,
                    },
                    '40%': {
                        transform: 'scale(1.2)',
                        opacity: 1,
                    },
                },
                '@keyframes typingDot3': {
                    '0%, 40%, 80%, 100%': {
                        transform: 'scale(0.6)',
                        opacity: 0.4,
                    },
                    '60%': {
                        transform: 'scale(1.2)',
                        opacity: 1,
                    },
                },
            }}
        >
            <SmartToyRoundedIcon
                sx={{
                    fontSize: size,
                    color: theme.palette.primary.main,
                    animation: 'robotBounce 2s ease-in-out infinite',
                    filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))',
                }}
            />
            <Box
                sx={{
                    display: 'flex',
                    gap: 0.3,
                    alignItems: 'center',
                    ml: 0.5,
                }}
            >
                <Box
                    sx={{
                        width: size * 0.15,
                        height: size * 0.15,
                        borderRadius: '50%',
                        backgroundColor: theme.palette.primary.main,
                        animation: 'typingDot1 1.4s ease-in-out infinite',
                    }}
                />
                <Box
                    sx={{
                        width: size * 0.15,
                        height: size * 0.15,
                        borderRadius: '50%',
                        backgroundColor: theme.palette.primary.main,
                        animation: 'typingDot2 1.4s ease-in-out infinite 0.2s',
                    }}
                />
                <Box
                    sx={{
                        width: size * 0.15,
                        height: size * 0.15,
                        borderRadius: '50%',
                        backgroundColor: theme.palette.primary.main,
                        animation: 'typingDot3 1.4s ease-in-out infinite 0.4s',
                    }}
                />
            </Box>
        </Box>
    );
}

function LandingBoardColumn({ columnKey, tasks, isDark, columnDelay = 0, editingTask = null, draggingTask = null, onDrop, onDragOver, onCardDragStart, onCardDragEnd }) {
    const meta = KANBAN_META[columnKey] || {
        title: columnKey,
        accent: '#64748b',
        gradient: `linear-gradient(135deg, ${alpha('#64748b', 0.08)}, ${alpha('#64748b', 0.02)})`,
    };
    
    const [isDragOver, setIsDragOver] = React.useState(false);

    return (
        <Paper
            onDragOver={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                setIsDragOver(true);
                onDragOver?.(columnKey);
            }}
            onDragLeave={(e) => {
                setIsDragOver(false);
            }}
            onDrop={(e) => {
                e.preventDefault();
                const taskUid = e.dataTransfer.getData('text/plain');
                setIsDragOver(false);
                onDrop?.(taskUid, columnKey);
            }}
            elevation={0}
            sx={{
                p: 2.5,
                borderRadius: 4,
                border: isDragOver 
                    ? `2px solid ${meta.accent}` 
                    : `1px solid ${alpha(meta.accent, isDark ? 0.35 : 0.2)}`,
                background: isDragOver
                    ? (isDark 
                        ? `linear-gradient(160deg, ${alpha(meta.accent, 0.35)}, ${alpha('#0b1220', 0.95)})`
                        : `linear-gradient(135deg, ${alpha(meta.accent, 0.15)}, ${alpha(meta.accent, 0.08)})`)
                    : (isDark
                        ? `linear-gradient(160deg, ${alpha(meta.accent, 0.18)}, ${alpha('#0b1220', 0.88)})`
                        : meta.gradient),
                height: '100%',
                minHeight: 500,
                display: 'flex',
                flexDirection: 'column',
                gap: 1.5,
                userSelect: 'none',
                WebkitUserSelect: 'none',
                MozUserSelect: 'none',
                msUserSelect: 'none',
                animation: `fadeIn 0.5s ease-out ${columnDelay}ms both`,
                transition: 'all 0.2s ease',
                '@keyframes fadeIn': {
                    '0%': {
                        opacity: 0,
                    },
                    '100%': {
                        opacity: 1,
                    },
                },
            }}
        >
            <Stack direction="row" spacing={1.5} alignItems="center">
                <Box
                    sx={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        background: meta.iconBg || alpha(meta.accent, 0.3),
                        color: '#fff',
                    }}
                >
                    {meta.iconEl || <Task fontSize="small" />}
                </Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 800, letterSpacing: 0.6 }}>
                    {meta.title || columnKey}
                </Typography>
                <Chip
                    size="small"
                    label={tasks.length}
                    sx={{
                        ml: 'auto',
                        fontWeight: 700,
                        background: alpha(meta.accent, 0.14),
                    }}
                />
            </Stack>
            <Stack spacing={1.5} sx={{ flexGrow: 1 }}>
                {tasks.length === 0 ? (
                    <Box
                        sx={{
                            flexGrow: 1,
                            borderRadius: 3,
                            border: `1.5px dashed ${alpha(meta.accent, isDark ? 0.5 : 0.35)}`,
                            display: 'grid',
                            placeItems: 'center',
                            color: alpha(meta.accent, 0.7),
                            fontSize: 13,
                            textAlign: 'center',
                            px: 1.5,
                            py: 4,
                        }}
                    >
                        {`No ${meta.title || columnKey} tasks yet.`}
                    </Box>
                ) : (
                    tasks.map((task, index) => (
                        <LandingMiniCard 
                            key={`${task.uid || `${columnKey}-${task.id ?? index}`}-${index}`}
                            task={task} 
                            meta={meta} 
                            isDark={isDark}
                            animationDelay={0}
                            isBeingEdited={editingTask?.column === columnKey && editingTask?.taskIndex === index}
                            isDragging={draggingTask?.taskUid === task.uid}
                            onDragStart={onCardDragStart}
                            onDragEnd={onCardDragEnd}
                        />
                    ))
                )}
            </Stack>
        </Paper>
    );
}

export default function Landing({ errors, plans = [] }) {
    const theme = useTheme();
    const { t } = useTranslation();
    const isDark = theme.palette.mode === 'dark';
    const backgroundDefault = theme.palette.background.default;
    const backgroundPaper = theme.palette.background.paper;
    const textPrimary = theme.palette.text.primary;
    const textSecondary = theme.palette.text.secondary;
    const divider = theme.palette.divider;
    const primaryMain = theme.palette.primary.main;
    const primaryLight = theme.palette.primary.light || lighten(primaryMain, 0.2);
    const primaryDark = theme.palette.primary.dark || darken(primaryMain, 0.2);
    const primaryContrast = theme.palette.getContrastText
        ? theme.palette.getContrastText(primaryMain)
        : '#ffffff';
    const accentPrimary = primaryMain;

    const promptInputRef = React.useRef(null);
    const promptAreaRef = React.useRef(null);
    const requestIdRef = React.useRef(0);
    const [prompt, setPrompt] = React.useState('');
    const [stage, setStage] = React.useState('input');
    const [aiError, setAiError] = React.useState(null);
    const [boardColumns, setBoardColumns] = React.useState(() => distributeTasksAcrossColumns());
    const [generationStep, setGenerationStep] = React.useState(0);
    const [demoPhase, setDemoPhase] = React.useState('idle'); // idle, reorganizing, editing, settled
    const [originalTasks, setOriginalTasks] = React.useState([]);
    const [editingTask, setEditingTask] = React.useState(null); // {column, taskIndex}
    const [draggingTask, setDraggingTask] = React.useState(null); // {taskUid, fromColumn, toColumn}
    const [userDraggingTask, setUserDraggingTask] = React.useState(null); // Track user's drag
    const columnOrder = React.useMemo(() => KANBAN_ORDER, []);

    // User drag and drop handlers
    const handleUserDragStart = React.useCallback((task) => {
        setUserDraggingTask(task);
        // Pause demo animations while user is dragging
        setDemoPhase('settled');
    }, []);

    const handleUserDragEnd = React.useCallback(() => {
        setUserDraggingTask(null);
    }, []);

    const handleUserDrop = React.useCallback((taskUid, targetColumn) => {
        setBoardColumns(prev => {
            // Find which column has the task
            let sourceColumn = null;
            let task = null;
            
            for (const col of Object.keys(prev)) {
                const found = prev[col].find(t => t.uid === taskUid);
                if (found) {
                    sourceColumn = col;
                    task = found;
                    break;
                }
            }
            
            if (!task || !sourceColumn || sourceColumn === targetColumn) {
                return prev;
            }
            
            // Remove from source
            const newColumns = {
                ...prev,
                [sourceColumn]: prev[sourceColumn].filter(t => t.uid !== taskUid),
                [targetColumn]: [...prev[targetColumn], { ...task, status: targetColumn }],
            };
            
            return newColumns;
        });
        setUserDraggingTask(null);
    }, []);

    const generationSteps = [
        { label: 'Analyzing your project requirements', duration: 1560 },
        { label: 'Identifying key deliverables', duration: 1560 },
        { label: 'Breaking down into actionable tasks', duration: 1560 },
        { label: 'Assigning priorities and categories', duration: 1560 },
        { label: 'Organizing into workflow columns', duration: 1560 },
        { label: 'Finalizing your dashboard', duration: 400 },
    ];

    // Randomize tasks across columns for demo effect
    const randomizeTaskDistribution = React.useCallback((tasks) => {
        const shuffled = [...tasks];
        const randomColumns = { todo: [], inprogress: [], review: [], done: [] };
        
        shuffled.forEach(task => {
            const randomColumn = KANBAN_ORDER[Math.floor(Math.random() * KANBAN_ORDER.length)];
            randomColumns[randomColumn].push({ ...task, status: randomColumn });
        });
        
        return randomColumns;
    }, []);

    // Demo editing effect - change text letter by letter
    const startEditingDemo = React.useCallback((finalColumns) => {
        const demoEdits = [
            { column: 'todo', taskIndex: 0, newTitle: 'Setup project repository and initial structure' },
            { column: 'inprogress', taskIndex: 0, newTitle: 'Implement user authentication system' },
            { column: 'review', taskIndex: 0, newTitle: 'Review API endpoints and security measures' },
            { column: 'done', taskIndex: 0, newTitle: 'Deploy application to production environment' },
        ];
        
        let editIndex = 0;
        
        const performNextEdit = () => {
            if (editIndex >= demoEdits.length) {
                setDemoPhase('settled');
                return;
            }
            
            const edit = demoEdits[editIndex];
            const task = finalColumns[edit.column][edit.taskIndex];
            if (!task) {
                editIndex++;
                performNextEdit();
                return;
            }
            
            let charIndex = 0;
            const originalTitle = task.title;
            const targetTitle = edit.newTitle;
            
            const typeChar = () => {
                if (charIndex <= targetTitle.length) {
                    setEditingTask({ column: edit.column, taskIndex: edit.taskIndex });
                    setBoardColumns(prev => {
                        const updated = { ...prev };
                        const taskList = [...updated[edit.column]];
                        taskList[edit.taskIndex] = {
                            ...taskList[edit.taskIndex],
                            title: targetTitle.substring(0, charIndex)
                        };
                        updated[edit.column] = taskList;
                        return updated;
                    });
                    charIndex++;
                    setTimeout(typeChar, 50);
                } else {
                    setEditingTask(null);
                    editIndex++;
                    setTimeout(performNextEdit, 1000);
                }
            };
            
            setTimeout(typeChar, 500);
        };
        
        setTimeout(performNextEdit, 1000);
    }, []);

    // Reorganize tasks from random to correct columns with animation
    const reorganizeTasks = React.useCallback((randomColumns, correctColumns) => {
        setDemoPhase('reorganizing');
        
        // Move tasks one by one to correct columns
        const allTasks = [...randomColumns.todo, ...randomColumns.inprogress, ...randomColumns.review, ...randomColumns.done];
        let taskIndex = 0;
        
        const moveNextTask = () => {
            if (taskIndex >= allTasks.length) {
                setDraggingTask(null);
                setDemoPhase('editing');
                setTimeout(() => startEditingDemo(correctColumns), 800);
                return;
            }
            
            const task = allTasks[taskIndex];
            const correctStatus = Object.keys(correctColumns).find(status => 
                correctColumns[status].some(t => t.uid === task.uid)
            );
            
            if (correctStatus && task.status !== correctStatus) {
                // Highlight task being dragged
                setDraggingTask({ taskUid: task.uid, fromColumn: task.status, toColumn: correctStatus });
                
                // Wait to show drag effect, then move
                setTimeout(() => {
                    setBoardColumns(prev => {
                        const updated = { ...prev };
                        updated[task.status] = updated[task.status].filter(t => t.uid !== task.uid);
                        updated[correctStatus] = [...updated[correctStatus], { ...task, status: correctStatus }];
                        return updated;
                    });
                    
                    // Clear dragging state after move
                    setTimeout(() => {
                        setDraggingTask(null);
                        taskIndex++;
                        setTimeout(moveNextTask, 300);
                    }, 200);
                }, 200);
            } else {
                taskIndex++;
                setTimeout(moveNextTask, 100);
            }
        };
        
        setTimeout(moveNextTask, 500);
    }, [startEditingDemo]);

    const handleGenerate = React.useCallback(async () => {
        // Use default prompt if empty
        const finalPrompt = prompt.trim() || 'Create a comprehensive project management dashboard with tasks covering planning, development, testing, and deployment phases';

        setAiError(null);
        setStage('generating');
        setGenerationStep(0);
        const requestId = ++requestIdRef.current;

        // Cycle through generation steps at appropriate pace
        let currentStep = 0;
        const advanceStep = () => {
            if (currentStep < generationSteps.length - 1) {
                currentStep++;
                setGenerationStep(currentStep);
                setTimeout(advanceStep, generationSteps[currentStep].duration);
            }
        };
        setTimeout(advanceStep, generationSteps[0].duration);

        try {
            const url = typeof route === 'function' ? route('landing.generate') : '/landing/generate';
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN':
                        document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                },
                body: JSON.stringify({ description: finalPrompt, count: 10 }),
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Backend error:', errorData);
                throw new Error(
                    errorData?.message || `Request failed with status ${response.status}`
                );
            }

            const payload = await response.json();
            if (requestId !== requestIdRef.current) {
                return;
            }
            
            // Ensure we always have tasks - use fallback if API returns empty
            let rawTasks = payload?.tasks || [];
            if (!Array.isArray(rawTasks) || rawTasks.length === 0) {
                console.warn('API returned no tasks, using fallback demo tasks');
                rawTasks = [
                    { id: 1, title: 'Setup project repository and initial structure', description: 'Initialize the project with proper folder structure and configuration files', priority: 'high', category: 'Setup' },
                    { id: 2, title: 'Design system architecture and database schema', description: 'Plan the technical architecture and design database tables', priority: 'high', category: 'Architecture' },
                    { id: 3, title: 'Implement user authentication system', description: 'Build secure login, registration, and password recovery', priority: 'critical', category: 'Security' },
                    { id: 4, title: 'Develop core application features', description: 'Build the main functionality and user workflows', priority: 'high', category: 'Development' },
                    { id: 5, title: 'Create responsive UI components', description: 'Design and implement reusable interface components', priority: 'medium', category: 'Design' },
                    { id: 6, title: 'Write comprehensive unit tests', description: 'Ensure code quality with thorough test coverage', priority: 'medium', category: 'Testing' },
                    { id: 7, title: 'Review API endpoints and security', description: 'Audit API for security vulnerabilities and performance', priority: 'high', category: 'Security' },
                    { id: 8, title: 'Optimize application performance', description: 'Profile and improve loading times and responsiveness', priority: 'medium', category: 'Optimization' },
                    { id: 9, title: 'Deploy to production environment', description: 'Configure servers and deploy application live', priority: 'critical', category: 'Deployment' },
                    { id: 10, title: 'Monitor system and gather feedback', description: 'Track metrics and collect user feedback for improvements', priority: 'low', category: 'Monitoring' },
                ];
            }
            
            const baseTasks = normalizeTasksWithUids(rawTasks);
            const correctDistribution = distributeTasksAcrossColumns(baseTasks);
            setOriginalTasks(baseTasks);
            
            // First show tasks in random columns, but add them one by one
            const allTasks = baseTasks;
            const randomDistribution = randomizeTaskDistribution(allTasks);
            
            setStage('board');
            setBoardColumns({ todo: [], inprogress: [], review: [], done: [] });

            setTimeout(() => {
                if (promptAreaRef.current) {
                    promptAreaRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
                
                // Show tasks appearing one by one with bounce
                let taskIdx = 0;
                const showNextTask = () => {
                    if (taskIdx >= allTasks.length) {
                        // All tasks shown, start reorganization
                        setTimeout(() => {
                            reorganizeTasks(randomDistribution, correctDistribution);
                        }, 400);
                        return;
                    }
                    
                    const task = allTasks[taskIdx];
                    const preferred = Object.keys(randomDistribution).find(col => 
                        randomDistribution[col].some(t => t.uid === task.uid)
                    );
                    
                    const chooseColumnWithCapacity = (pref, prev) => {
                        const startIndex = Math.max(0, KANBAN_ORDER.indexOf(pref));
                        for (let off = 0; off < KANBAN_ORDER.length; off++) {
                            const col = KANBAN_ORDER[(startIndex + off) % KANBAN_ORDER.length];
                            if ((prev[col]?.length || 0) < 3) return col;
                        }
                        return pref || KANBAN_ORDER[0];
                    };

                    setBoardColumns(prev => {
                        const column = chooseColumnWithCapacity(preferred, prev);
                        return {
                            ...prev,
                            [column]: [...(prev[column] || []), { ...task, status: column }],
                        };
                    });
                    
                    taskIdx++;
                    setTimeout(showNextTask, 300);
                };
                
                setTimeout(showNextTask, 800);
            }, 120);
        } catch (error) {
            if (requestId === requestIdRef.current) {
                console.error('Landing AI generation failed, using demo tasks', error);
                
                // Don't show error - instead show demo tasks
                const demoTasks = [
                    { id: 1, title: 'Setup project repository and initial structure', description: 'Initialize the project with proper folder structure and configuration files', priority: 'high', category: 'Setup' },
                    { id: 2, title: 'Design system architecture and database schema', description: 'Plan the technical architecture and design database tables', priority: 'high', category: 'Architecture' },
                    { id: 3, title: 'Implement user authentication system', description: 'Build secure login, registration, and password recovery', priority: 'critical', category: 'Security' },
                    { id: 4, title: 'Develop core application features', description: 'Build the main functionality and user workflows', priority: 'high', category: 'Development' },
                    { id: 5, title: 'Create responsive UI components', description: 'Design and implement reusable interface components', priority: 'medium', category: 'Design' },
                    { id: 6, title: 'Write comprehensive unit tests', description: 'Ensure code quality with thorough test coverage', priority: 'medium', category: 'Testing' },
                    { id: 7, title: 'Review API endpoints and security', description: 'Audit API for security vulnerabilities and performance', priority: 'high', category: 'Security' },
                    { id: 8, title: 'Optimize application performance', description: 'Profile and improve loading times and responsiveness', priority: 'medium', category: 'Optimization' },
                    { id: 9, title: 'Deploy to production environment', description: 'Configure servers and deploy application live', priority: 'critical', category: 'Deployment' },
                    { id: 10, title: 'Monitor system and gather feedback', description: 'Track metrics and collect user feedback for improvements', priority: 'low', category: 'Monitoring' },
                ];
                
                const baseTasks = normalizeTasksWithUids(demoTasks);
                const correctDistribution = distributeTasksAcrossColumns(baseTasks);
                setOriginalTasks(baseTasks);
                
                const allTasks = baseTasks;
                const randomDistribution = randomizeTaskDistribution(allTasks);
                
                setStage('board');
                setBoardColumns({ todo: [], inprogress: [], review: [], done: [] });

                setTimeout(() => {
                    if (promptAreaRef.current) {
                        promptAreaRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                    
                    let taskIdx = 0;
                    const showNextTask = () => {
                        if (taskIdx >= allTasks.length) {
                            setTimeout(() => {
                                reorganizeTasks(randomDistribution, correctDistribution);
                            }, 400);
                            return;
                        }
                        
                        const task = allTasks[taskIdx];
                        const preferred = Object.keys(randomDistribution).find(col => 
                            randomDistribution[col].some(t => t.uid === task.uid)
                        );
                        
                        const chooseColumnWithCapacity = (pref, prev) => {
                            const startIndex = Math.max(0, KANBAN_ORDER.indexOf(pref));
                            for (let off = 0; off < KANBAN_ORDER.length; off++) {
                                const col = KANBAN_ORDER[(startIndex + off) % KANBAN_ORDER.length];
                                if ((prev[col]?.length || 0) < 3) return col;
                            }
                            return pref || KANBAN_ORDER[0];
                        };

                        setBoardColumns(prev => {
                            const column = chooseColumnWithCapacity(preferred, prev);
                            return {
                                ...prev,
                                [column]: [...(prev[column] || []), { ...task, status: column }],
                            };
                        });
                        
                        taskIdx++;
                        setTimeout(showNextTask, 300);
                    };
                    
                    setTimeout(showNextTask, 800);
                }, 120);
            }
        }
    }, [prompt, t, generationSteps.length, randomizeTaskDistribution, reorganizeTasks]);

    const resetPrompt = React.useCallback(() => {
        requestIdRef.current += 1;
        setStage('input');
        setAiError(null);
        setTimeout(() => {
            if (promptInputRef.current) {
                promptInputRef.current.focus();
            }
        }, 150);
    }, []);

    // Video autoplay handling – try to start with sound; if blocked, fallback to muted
    const videoRef = React.useRef(null);
    const [muted, setMuted] = React.useState(false); // request sound first
    React.useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        v.muted = false;
        v.volume = 1.0;
        const attempt = v.play();
        if (attempt && attempt.catch) {
            attempt.catch(() => {
                // Browser blocked autoplay with sound – fallback to muted autoplay
                v.muted = true;
                setMuted(true);
                const retry = v.play();
                if (retry && retry.catch) retry.catch(() => { });
            });
        }
    }, []);

    // Add CSS keyframes for animations
    React.useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes gradientShift {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
            @keyframes bounce {
                0%, 20%, 53%, 80%, 100% {
                    transform: translateY(0);
                }
                40%, 43% {
                    transform: translateY(-10px);
                }
                70% {
                    transform: translateY(-5px);
                }
            }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

    /* ----- email/password form ----- */
    const { data, setData, post, processing } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post('/login');
    };

    const features = [
        {
            icon: <AutoAwesome sx={{ fontSize: 48, color: '#E53E3E' }} />,
            title: t('landing.features.aiProductivity.title'),
            description: t('landing.features.aiProductivity.description'),
            color: '#E53E3E',
        },
        {
            icon: <ViewModule sx={{ fontSize: 48, color: '#319795' }} />,
            title: t('landing.features.collaborate.title'),
            description: t('landing.features.collaborate.description'),
            color: '#319795',
        },
        {
            icon: <Settings sx={{ fontSize: 48, color: '#3182CE' }} />,
            title: t('landing.features.customize.title'),
            description: t('landing.features.customize.description'),
            color: '#3182CE',
        },
        {
            icon: <IntegrationInstructions sx={{ fontSize: 48, color: '#38A169' }} />,
            title: t('landing.features.integrate.title'),
            description: t('landing.features.integrate.description'),
            color: '#38A169',
        },
        {
            icon: <AutoFixHigh sx={{ fontSize: 48, color: '#D69E2E' }} />,
            title: t('landing.features.streamline.title'),
            description: t('landing.features.streamline.description'),
            color: '#D69E2E',
        },
        {
            icon: <Search sx={{ fontSize: 48, color: '#805AD5' }} />,
            title: t('landing.features.search.title'),
            description: t('landing.features.search.description'),
            color: '#805AD5',
        },
        {
            icon: <Home sx={{ fontSize: 48, color: '#2F855A' }} />,
            title: t('landing.features.stayAhead.title'),
            description: t('landing.features.stayAhead.description'),
            color: '#2F855A',
        },
    ];

    const methodologies = [
        { name: 'Agile', color: '#E53E3E' },
        { name: 'Scrum', color: '#319795' },
        { name: 'Kanban', color: '#3182CE' },
        { name: 'Waterfall', color: '#38A169' },
        { name: 'Lean', color: '#D69E2E' },
        { name: 'DevOps', color: '#805AD5' },
        { name: 'Hybrid', color: '#2F855A' },
        { name: 'SAFe', color: '#E53E3E' },
    ];

    const pricingPlans = React.useMemo(() => (Array.isArray(plans) ? plans : []), [plans]);
    const planAccentMap = React.useMemo(
        () => ({
            basic: '#2563eb',
            pro: '#7C3AED',
            business: '#F97316',
        }),
        []
    );

    const resolvePlanCta = (plan) => {
        if (plan?.key === 'business') {
            return { label: 'Talk to sales', href: '/contact' };
        }

        if (!plan || (plan.price ?? 0) === 0) {
            return { label: 'Start for free', href: route('register') };
        }

        return { label: `Upgrade to ${plan.name}`, href: route('register') };
    };

    return (
        <>
            <Head title={t('head.landing')}>
                <meta
                    name="description"
                    content="The converged AI workspace, where all your work gets done. A single place for projects, tasks, chat, docs, and more. Where humans, AI, and agents work—together."
                />
                <meta
                    name="keywords"
                    content="project management software, team collaboration tool, task management, productivity app, project tracking, workflow automation, agile project management, scrum tool, kanban board, team productivity, project planning, task organizer, project dashboard, milestone tracking, resource management, time tracking, project analytics, team communication, project reporting, deadline management, project coordination, work management, business productivity, startup tools, remote work, distributed teams, project oversight, task automation, workflow management, team efficiency, project monitoring, task prioritization, project control, team synchronization, project optimization, project management platform, collaboration software, productivity software, management tool, business tool, enterprise solution, project success, team performance, project delivery, task completion, project goals, team objectives, project metrics, productivity metrics, business intelligence, project insights, team insights, collaborative workspace, digital workplace, project ecosystem, productivity platform, management platform, collaboration platform, business platform, work platform, team platform, project technology, productivity technology, management technology, business technology, work technology, team technology"
                />
                <meta
                    property="og:title"
                    content="TaskPilot - The AI workspace where all your work gets done"
                />
                <meta
                    property="og:description"
                    content="A single place for projects, tasks, chat, docs, and more. Where humans, AI, and agents work—together."
                />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://taskpilot.us" />
                <meta property="og:site_name" content="TaskPilot" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta
                    name="twitter:title"
                    content="TaskPilot - The AI workspace where all your work gets done"
                />
                <meta
                    name="twitter:description"
                    content="A single place for projects, tasks, chat, docs, and more. Where humans, AI, and agents work—together."
                />
                <meta name="robots" content="index, follow" />
                <meta name="author" content="TaskPilot" />
                <link rel="canonical" href="https://taskpilot.us" />

                {/* Structured Data for SEO */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        '@context': 'https://schema.org',
                        '@type': 'SoftwareApplication',
                        name: 'TaskPilot',
                        description:
                            'The modern project workspace where productivity meets simplicity. A single place for projects, tasks, chat, docs, and more.',
                        url: 'https://taskpilot.us',
                        applicationCategory: 'BusinessApplication',
                        operatingSystem: 'Web Browser',
                        offers: {
                            '@type': 'Offer',
                            price: '0',
                            priceCurrency: 'USD',
                            priceValidUntil: '2025-12-31',
                        },
                        aggregateRating: {
                            '@type': 'AggregateRating',
                            ratingValue: '4.8',
                            ratingCount: '1247',
                        },
                        publisher: {
                            '@type': 'Organization',
                            name: 'TaskPilot',
                            url: 'https://taskpilot.us',
                        },
                    })}
                </script>
            </Head>

            <Box sx={{ bgcolor: backgroundDefault, minHeight: '100vh' }}>
                {/* Header/Navigation */}
                <Box
                    sx={{
                        py: 2,
                        borderBottom: '1px solid',
                        borderColor: divider,
                        position: 'sticky',
                        top: 0,
                        bgcolor: backgroundPaper,
                        zIndex: 10,
                    }}
                >
                    <Container maxWidth="lg">
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box
                                    component="img"
                                    src="/taskpilot-logo.png"
                                    alt="TaskPilot Logo"
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    }}
                                />
                                <Typography variant="h5" sx={{ fontWeight: 700, color: primaryMain }}>
                                    TaskPilot
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {/* Use the same Theme + Language controls as the app header */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ThemeToggle />
                                    <LanguageDropdown />
                                </Box>

                                <Button
                                    variant="text"
                                    size="small"
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        color: accentPrimary,
                                        '&:hover': { color: isDark ? primaryLight : primaryDark },
                                    }}
                                    onClick={() => {
                                        const section = document.getElementById('pricing');
                                        if (section) {
                                            section.scrollIntoView({ behavior: 'smooth' });
                                        }
                                    }}
                                >
                                    Pricing
                                </Button>

                                <Button
                                    variant="outlined"
                                    size="small"
                                    sx={{
                                        textTransform: 'none',
                                        borderColor: accentPrimary,
                                        color: accentPrimary,
                                        borderWidth: 2,
                                        borderRadius: 2,
                                        px: 3,
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        '&:hover': {
                                            borderColor: primaryDark,
                                            bgcolor: accentPrimary,
                                            color: primaryContrast,
                                            transform: 'translateY(-2px)',
                                            boxShadow: `0 8px 20px ${alpha(primaryMain, 0.25)}`,
                                        },
                                    }}
                                    onClick={() => {
                                        document
                                            .getElementById('login-form')
                                            .scrollIntoView({ behavior: 'smooth' });
                                    }}
                                >
                                    {t('landing.loginButton')}
                                </Button>
                                <Button
                                    variant="contained"
                                    size="small"
                                    href={route('register')}
                                    sx={{
                                        textTransform: 'none',
                                        background: 'linear-gradient(135deg, #FF6B6B, #45B7D1)',
                                        borderRadius: 2,
                                        px: 3,
                                        py: 1,
                                        boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, #45B7D1, #FF6B6B)',
                                            transform: 'translateY(-2px) scale(1.05)',
                                            boxShadow: '0 8px 25px rgba(255, 107, 107, 0.4)',
                                        },
                                    }}
                                >
                                    {t('landing.signUpFree')}
                                </Button>
                            </Box>
                        </Box>
                    </Container>
                </Box>

                {/* Hero Section with Interactive Dashboard Generation */}
                <Box sx={{ pt: { xs: 3, md: 4 }, pb: { xs: 6, md: 8 }, bgcolor: backgroundPaper }}>
                    <Container maxWidth="lg">
                        <Box ref={promptAreaRef} sx={{ position: 'relative' }}>
                            {/* Input Stage - Top */}
                            {stage === 'input' && (
                                <Box
                                    sx={{
                                        width: '100%',
                                        maxWidth: 800,
                                        mx: 'auto',
                                        transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
                                    }}
                                >
                                    <Box sx={{ textAlign: 'center', mb: 1.5 }}>
                                        <Typography
                                            variant="h5"
                                            sx={{
                                                fontSize: { xs: '1.1rem', md: '1.3rem' },
                                                fontWeight: 500,
                                                color: textSecondary,
                                            }}
                                        >
                                            Describe your project and watch it transform into a dashboard
                                        </Typography>
                                    </Box>

                                    <Paper
                                        elevation={0}
                                        sx={{
                                            p: 3,
                                            borderRadius: 4,
                                            border: `1px solid ${alpha(primaryMain, 0.18)}`,
                                            background: isDark
                                                ? alpha('#0f172a', 0.88)
                                                : 'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))',
                                            boxShadow: isDark
                                                ? '0 24px 48px -32px rgba(15,23,42,0.75)'
                                                : '0 28px 64px -36px rgba(15,23,42,0.28)',
                                            backdropFilter: 'blur(14px)',
                                        }}
                                    >
                                        <Stack spacing={3}>
                                            <TextField
                                                inputRef={promptInputRef}
                                                value={prompt}
                                                onChange={(e) => setPrompt(e.target.value)}
                                                placeholder="e.g. Launch a mobile app with marketing campaign, build customer onboarding flow, design new product features..."
                                                multiline
                                                minRows={16}
                                                maxRows={20}
                                                fullWidth
                                                autoFocus
                                                onKeyDown={(event) => {
                                                    if (
                                                        (event.metaKey || event.ctrlKey) &&
                                                        event.key === 'Enter'
                                                    ) {
                                                        event.preventDefault();
                                                        handleGenerate();
                                                    }
                                                }}
                                                sx={{
                                                    '& .MuiOutlinedInput-root': {
                                                        fontSize: '1.1rem',
                                                        borderRadius: 3,
                                                    },
                                                }}
                                            />
                                            {aiError && (
                                                <Typography variant="body2" color="error">
                                                    {aiError}
                                                </Typography>
                                            )}
                                            <Button
                                                variant="contained"
                                                size="large"
                                                startIcon={<PlayArrowRounded />}
                                                onClick={handleGenerate}
                                                disabled={!prompt.trim()}
                                                sx={{
                                                    textTransform: 'none',
                                                    py: 2,
                                                    fontSize: '1.1rem',
                                                    fontWeight: 600,
                                                    borderRadius: 3,
                                                    background:
                                                        'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)',
                                                    backgroundSize: '200% 200%',
                                                    animation: 'gradientShift 3s ease infinite',
                                                    boxShadow: '0 8px 25px rgba(255, 107, 107, 0.3)',
                                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                    '&:hover': {
                                                        transform: 'translateY(-2px)',
                                                        boxShadow: '0 12px 30px rgba(255, 107, 107, 0.4)',
                                                    },
                                                }}
                                            >
                                                Generate Dashboard
                                            </Button>
                                            <Stack
                                                direction="row"
                                                spacing={1}
                                                flexWrap="wrap"
                                                justifyContent="center"
                                            >
                                                {[
                                                    'Product launch',
                                                    'Marketing campaign',
                                                    'Software development',
                                                ].map((sample) => (
                                                    <Chip
                                                        key={sample}
                                                        size="small"
                                                        label={sample}
                                                        onClick={() => setPrompt(`${sample} project with tasks`)}
                                                        clickable
                                                        sx={{ opacity: 0.8 }}
                                                    />
                                                ))}
                                            </Stack>
                                        </Stack>
                                    </Paper>
                                </Box>
                            )}

                            {/* Generating Stage - Maintains layout height */}
                            {stage === 'generating' && (
                                <Box
                                    sx={{
                                        width: '100%',
                                        maxWidth: 800,
                                        mx: 'auto',
                                        minHeight: '70vh',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}
                                >
                                    <Stack spacing={5} alignItems="center" sx={{ textAlign: 'center', maxWidth: 600 }}>
                                        <RobotTypingAnimation theme={theme} size={80} />
                                        <Typography
                                            variant="h3"
                                            sx={{ 
                                                fontWeight: 700, 
                                                color: textPrimary,
                                                background: `linear-gradient(135deg, ${primaryMain}, ${primaryLight})`,
                                                WebkitBackgroundClip: 'text',
                                                WebkitTextFillColor: 'transparent',
                                            }}
                                        >
                                            Generating Your Dashboard
                                        </Typography>
                                        
                                        <Box sx={{ width: '100%', minHeight: 60, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 2,
                                                    py: 2,
                                                    px: 4,
                                                    borderRadius: 2,
                                                    background: alpha(primaryMain, isDark ? 0.15 : 0.08),
                                                    border: `2px solid ${alpha(primaryMain, 0.3)}`,
                                                }}
                                            >
                                                <CircularProgress size={24} thickness={4} />
                                                <Typography
                                                    variant="h6"
                                                    sx={{
                                                        fontWeight: 600,
                                                        color: textPrimary,
                                                    }}
                                                >
                                                    {generationSteps[generationStep]?.label}
                                                </Typography>
                                            </Box>
                                        </Box>
                                        
                                        <Typography 
                                            variant="caption" 
                                            sx={{ 
                                                color: textSecondary,
                                                fontStyle: 'italic',
                                                mt: 2,
                                            }}
                                        >
                                            This usually takes 8-10 seconds
                                        </Typography>
                                    </Stack>
                                </Box>
                            )}

                            {/* Board Stage - Display generated board */}
                            {stage === 'board' && (
                                <Box
                                    onContextMenu={(e) => e.preventDefault()}
                                    onCopy={(e) => e.preventDefault()}
                                    onCut={(e) => e.preventDefault()}
                                    onPaste={(e) => e.preventDefault()}
                                    onKeyDown={(e) => {
                                        // Block Ctrl+C, Ctrl+X, Ctrl+V, Ctrl+P, Print Screen
                                        if (
                                            (e.ctrlKey || e.metaKey) &&
                                            ['c', 'x', 'v', 'p', 's', 'a'].includes(e.key.toLowerCase())
                                        ) {
                                            e.preventDefault();
                                        }
                                        // Block Print Screen
                                        if (e.key === 'PrintScreen') {
                                            e.preventDefault();
                                        }
                                    }}
                                    sx={{
                                        animation: 'fadeIn 0.5s ease-in',
                                        '@keyframes fadeIn': {
                                            from: { opacity: 0, transform: 'translateY(20px)' },
                                            to: { opacity: 1, transform: 'translateY(0)' },
                                        },
                                        position: 'relative',
                                        userSelect: 'none',
                                        WebkitUserSelect: 'none',
                                        MozUserSelect: 'none',
                                        msUserSelect: 'none',
                                        '&::before': {
                                            content: '"TaskPilot Preview"',
                                            position: 'absolute',
                                            top: '50%',
                                            left: '50%',
                                            transform: 'translate(-50%, -50%) rotate(-45deg)',
                                            fontSize: '4rem',
                                            fontWeight: 'bold',
                                            color: isDark ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.03)',
                                            pointerEvents: 'none',
                                            zIndex: 1,
                                            whiteSpace: 'nowrap',
                                        },
                                    }}
                                >
                                    <Stack spacing={4}>
                                        <Box sx={{ textAlign: 'center', mb: 6 }}>
                                            <Typography
                                                variant="h3"
                                                sx={{
                                                    fontWeight: 800,
                                                    mb: 2,
                                                    background:
                                                        'linear-gradient(135deg, #FF6B6B, #4ECDC4)',
                                                    WebkitBackgroundClip: 'text',
                                                    WebkitTextFillColor: 'transparent',
                                                }}
                                            >
                                                Your Dashboard is Ready
                                            </Typography>
                                            
                                            {demoPhase === 'reorganizing' && (
                                                <Chip 
                                                    icon={<AutoAwesome />}
                                                    label="✨ Watch as AI organizes your tasks..." 
                                                    color="primary"
                                                    sx={{ mb: 2, fontWeight: 600 }}
                                                />
                                            )}
                                            
                                            {demoPhase === 'editing' && (
                                                <Chip 
                                                    icon={<AutoAwesome />}
                                                    label="✏️ AI is refining task details..." 
                                                    color="secondary"
                                                    sx={{ mb: 2, fontWeight: 600 }}
                                                />
                                            )}
                                            
                                            {demoPhase === 'settled' && (
                                                <Chip 
                                                    icon={<GroupWork />}
                                                    label="✨ Try dragging cards between columns!" 
                                                    color="success"
                                                    sx={{ mb: 2, fontWeight: 600 }}
                                                />
                                            )}
                                            
                                            <Typography variant="body1" sx={{ color: textSecondary, mb: 4 }}>
                                                This is a preview of TaskPilot's powerful project board.{' '}
                                                <Link href={route('register')} sx={{ fontWeight: 600 }}>
                                                    Sign up
                                                </Link>{' '}
                                                to unlock full collaboration features.
                                            </Typography>
                                        </Box>

                                        <Grid container spacing={2} sx={{ alignItems: 'stretch' }}>
                                            {columnOrder.map((columnKey, index) => (
                                                <Grid 
                                                    size={{ xs: 12, sm: 6, md: 3 }} 
                                                    key={columnKey}
                                                    sx={{ display: 'flex' }}
                                                >
                                                    <LandingBoardColumn
                                                        columnKey={columnKey}
                                                        tasks={boardColumns[columnKey] || []}
                                                        isDark={isDark}
                                                        columnDelay={0}
                                                        editingTask={editingTask}
                                                        draggingTask={draggingTask}
                                                        onDrop={handleUserDrop}
                                                        onDragOver={() => {}}
                                                        onCardDragStart={handleUserDragStart}
                                                        onCardDragEnd={handleUserDragEnd}
                                                    />
                                                </Grid>
                                            ))}
                                        </Grid>

                                        <Box sx={{ textAlign: 'center', pt: 4 }}>
                                            <Button
                                                variant="contained"
                                                size="large"
                                                href={route('register')}
                                                sx={{
                                                    textTransform: 'none',
                                                    py: 2,
                                                    px: 5,
                                                    fontSize: '1.1rem',
                                                    fontWeight: 600,
                                                    borderRadius: 3,
                                                    background:
                                                        'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)',
                                                    backgroundSize: '200% 200%',
                                                    animation: 'gradientShift 3s ease infinite',
                                                    boxShadow: '0 8px 25px rgba(255, 107, 107, 0.3)',
                                                    '&:hover': {
                                                        transform: 'translateY(-3px) scale(1.05)',
                                                        boxShadow: '0 15px 35px rgba(255, 107, 107, 0.4)',
                                                    },
                                                }}
                                            >
                                                Get Started Free
                                            </Button>
                                        </Box>
                                    </Stack>
                                </Box>
                            )}
                        </Box>
                    </Container>
                </Box>

                {/* Pricing Section */}
                <Box
                    id="pricing"
                    sx={{
                        py: { xs: 8, md: 12 },
                        bgcolor: backgroundPaper,
                        borderTop: '1px solid',
                        borderBottom: '1px solid',
                        borderColor: divider,
                    }}
                >
                    <Container maxWidth="lg">
                        <Box sx={{ textAlign: 'center', mb: 8 }}>
                            <Chip
                                label="Pricing"
                                sx={{
                                    mb: 2.5,
                                    px: 2,
                                    fontWeight: 700,
                                    backgroundColor: alpha(primaryMain, 0.12),
                                    color: primaryMain,
                                    textTransform: 'uppercase',
                                    letterSpacing: 1.4,
                                }}
                            />
                            <Typography
                                variant="h2"
                                sx={{
                                    fontSize: { xs: '2rem', md: '3rem' },
                                    fontWeight: 700,
                                    color: textPrimary,
                                    mb: 2,
                                }}
                            >
                                Simple pricing designed for teams of every size
                            </Typography>
                            <Typography
                                variant="h6"
                                sx={{
                                    color: textSecondary,
                                    maxWidth: 640,
                                    mx: 'auto',
                                    fontWeight: 400,
                                }}
                            >
                                Every plan includes the Project Assistant, real-time dashboards, and secure cloud
                                storage. Pick the AI credit pack that matches the pace of your projects.
                            </Typography>
                        </Box>

                        <Grid container spacing={3} justifyContent="center">
                            {pricingPlans.map((plan) => {
                                const accentColor = planAccentMap[plan.key] ?? '#2563eb';
                                const isHighlight = Boolean(plan.highlight);
                                const priceValue = plan.price ?? 0;
                                const intervalLabel = priceValue > 0 && plan.interval
                                    ? `/${String(plan.interval).toLowerCase()}`
                                    : '';
                                const currencyLabel = priceValue > 0 && plan.currency
                                    ? String(plan.currency).toUpperCase()
                                    : 'USD';
                                const cta = resolvePlanCta(plan);
                                const cardBackground = isHighlight
                                    ? `linear-gradient(140deg, ${alpha(accentColor, isDark ? 0.35 : 0.18)}, ${alpha(accentColor, isDark ? 0.18 : 0.05)})`
                                    : isDark
                                        ? alpha(textPrimary, 0.08)
                                        : 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)';
                                const cardHoverBackground = isHighlight
                                    ? `linear-gradient(135deg, ${alpha(accentColor, isDark ? 0.45 : 0.2)}, ${alpha(accentColor, isDark ? 0.22 : 0.08)})`
                                    : isDark
                                        ? alpha(textPrimary, 0.12)
                                        : 'linear-gradient(180deg, #ffffff 0%, #eef2ff 100%)';
                                const cardBorderColor = alpha(accentColor, isHighlight ? (isDark ? 0.6 : 0.45) : (isDark ? 0.28 : 0.18));
                                const cardShadow = isHighlight
                                    ? (isDark ? '0 22px 48px -16px rgba(78,205,196,0.35)' : '0 22px 48px -16px rgba(124,58,237,0.32)')
                                    : (isDark ? '0 18px 42px -18px rgba(0,0,0,0.6)' : '0 14px 36px -20px rgba(15,23,42,0.25)');
                                const cardHoverShadow = isHighlight
                                    ? (isDark ? '0 32px 60px -16px rgba(78,205,196,0.4)' : '0 30px 56px -16px rgba(124,58,237,0.38)')
                                    : (isDark ? '0 20px 48px -18px rgba(0,0,0,0.65)' : '0 20px 44px -18px rgba(15,23,42,0.28)');

                                return (
                                    <Grid size={{ xs: 12, md: 4 }} key={plan.key}>
                                        <Box
                                            sx={{
                                                position: 'relative',
                                                height: '100%',
                                                p: 4,
                                                borderRadius: 4,
                                                background: cardBackground,
                                                border: `1px solid ${cardBorderColor}`,
                                                boxShadow: cardShadow,
                                                transition: 'transform .25s ease, box-shadow .25s ease',
                                                '&:hover': {
                                                    transform: 'translateY(-6px)',
                                                    boxShadow: cardHoverShadow,
                                                    background: cardHoverBackground,
                                                },
                                            }}
                                        >
                                            {isHighlight && (
                                                <Chip
                                                    label="Most popular"
                                                    color="secondary"
                                                    size="small"
                                                    sx={{
                                                        position: 'absolute',
                                                        top: 24,
                                                        right: 24,
                                                        fontWeight: 700,
                                                        backgroundColor: primaryMain,
                                                        color: 'white',
                                                    }}
                                                />
                                            )}

                                            <Stack spacing={2.5}>
                                                <Box>
                                                <Typography
                                                    variant="h5"
                                                    sx={{
                                                        fontWeight: 700,
                                                        color: textPrimary,
                                                        letterSpacing: '-0.3px',
                                                    }}
                                                >
                                                    {plan.name}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: textSecondary, mt: 0.5 }}>
                                                    {plan.description}
                                                </Typography>
                                                </Box>

                                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                                    {priceValue === 0 ? (
                                                        <Typography
                                                            variant="h3"
                                                            sx={{ fontWeight: 800, color: accentColor }}
                                                        >
                                                            Free
                                                        </Typography>
                                                    ) : (
                                                        <>
                                                            <Typography
                                                                variant="h3"
                                                                sx={{ fontWeight: 800, color: accentColor }}
                                                            >
                                                                ${priceValue}
                                                            </Typography>
                                                            <Typography variant="body1" sx={{ color: textSecondary }}>
                                                                {intervalLabel}
                                                            </Typography>
                                                        </>
                                                    )}
                                                </Box>

                                                {priceValue > 0 && (
                                                    <Typography variant="caption" sx={{ color: textSecondary, fontWeight: 600 }}>
                                                        Billed in {currencyLabel}
                                                    </Typography>
                                                )}

                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: 600,
                                                        color: alpha(accentColor, 0.85),
                                                        backgroundColor: alpha(accentColor, 0.12),
                                                        borderRadius: 2,
                                                        px: 1.5,
                                                        py: 0.75,
                                                    }}
                                                >
                                                    {plan.ai_credits ?? 'Includes AI assistant automation'}
                                                </Typography>

                                                <Stack spacing={1.5} sx={{ mt: 1 }}>
                                                    {(plan.features ?? []).map((feature) => (
                                                        <Stack
                                                            key={feature}
                                                            direction="row"
                                                            spacing={1}
                                                            alignItems="flex-start"
                                                        >
                                                            <CheckCircle
                                                                sx={{
                                                                    fontSize: 20,
                                                                    color: accentColor,
                                                                    mt: 0.2,
                                                                }}
                                                            />
                                                            <Typography variant="body2" sx={{ color: textSecondary }}>
                                                                {feature}
                                                            </Typography>
                                                        </Stack>
                                                    ))}
                                                </Stack>

                                                <Button
                                                    href={cta.href}
                                                    variant={isHighlight ? 'contained' : 'outlined'}
                                                    size="large"
                                                    sx={{
                                                        mt: 2,
                                                        textTransform: 'none',
                                                        fontWeight: 700,
                                                        borderRadius: 2,
                                                        px: 3,
                                                        background: isHighlight
                                                            ? `linear-gradient(135deg, ${accentColor}, ${alpha(accentColor, 0.75)})`
                                                            : 'transparent',
                                                        color: isHighlight ? 'white' : accentColor,
                                                        borderColor: alpha(accentColor, isHighlight ? 0 : 0.5),
                                                        '&:hover': {
                                                            background: isHighlight
                                                                ? `linear-gradient(135deg, ${alpha(accentColor, 0.9)}, ${accentColor})`
                                                                : alpha(accentColor, 0.1),
                                                            borderColor: alpha(accentColor, 0.6),
                                                            color: isHighlight ? 'white' : accentColor,
                                                        },
                                                    }}
                                                >
                                                    {cta.label}
                                                </Button>
                                            </Stack>
                                        </Box>
                                    </Grid>
                                );
                            })}
                        </Grid>

                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={2}
                            justifyContent="center"
                            alignItems="center"
                            sx={{ mt: 6, color: textSecondary }}
                        >
                            <Typography variant="body2" sx={{ fontWeight: 500, color: textSecondary }}>
                                Prices listed in USD. Cancel or switch plans anytime.
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: textSecondary }}>
                                Need enterprise licensing? <Link href="/contact">Contact our team</Link> for a custom quote.
                            </Typography>
                        </Stack>
                    </Container>
                </Box>

                <Box
                    id="login-form"
                    sx={{
                        py: { xs: 8, md: 12 },
                        bgcolor: isDark ? alpha(textPrimary, 0.06) : '#FAFBFC',
                    }}
                >
                    <Container maxWidth="sm">
                        <Paper
                            elevation={0}
                            sx={{
                                p: { xs: 4, sm: 6 },
                                borderRadius: 3,
                                border: '1px solid',
                                borderColor: divider,
                                bgcolor: backgroundPaper,
                            }}
                        >
                            <Box sx={{ textAlign: 'center', mb: 4 }}>
                                <Typography
                                    variant="h4"
                                    sx={{ fontWeight: 700, mb: 1, color: textPrimary }}
                                >
                                    Welcome back
                                </Typography>
                                <Typography variant="body1" sx={{ color: textSecondary }}>
                                    {t('landing.signInDescription')}
                                </Typography>
                            </Box>

                            <Stack spacing={3} sx={{ mb: 4 }}>
                                <Button
                                    variant="outlined"
                                    size="large"
                                    href="/auth/google"
                                    startIcon={<GoogleIcon />}
                                    fullWidth
                                    sx={{
                                        py: 1.5,
                                        fontSize: '1rem',
                                        fontWeight: 500,
                                        textTransform: 'none',
                                        borderColor: isDark ? alpha(textPrimary, 0.25) : 'grey.300',
                                        color: textPrimary,
                                        '&:hover': {
                                            borderColor: isDark ? alpha(textPrimary, 0.35) : 'grey.400',
                                            bgcolor: isDark ? alpha(textPrimary, 0.12) : 'grey.50',
                                        },
                                    }}
                                >
                                    {t('landing.continueWithGoogle')}
                                </Button>

                                <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
                                    <Divider sx={{ flex: 1 }} />
                                    <Typography variant="body2" sx={{ px: 2, color: textSecondary }}>
                                        {t('common.or')}
                                    </Typography>
                                    <Divider sx={{ flex: 1 }} />
                                </Box>
                            </Stack>

                            <form onSubmit={submit}>
                                <Stack spacing={3}>
                                    <TextField
                                        label={t('auth.email')}
                                        type="email"
                                        name="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        error={Boolean(errors.email)}
                                        helperText={errors.email}
                                        required
                                        fullWidth
                                        variant="outlined"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                                '& fieldset': {
                                                    borderColor: 'grey.300',
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: primaryMain,
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: primaryMain,
                                                },
                                            },
                                        }}
                                    />

                                    <TextField
                                        label={t('auth.password')}
                                        type="password"
                                        name="password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        error={Boolean(errors.password)}
                                        helperText={errors.password}
                                        required
                                        fullWidth
                                        variant="outlined"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                                '& fieldset': {
                                                    borderColor: 'grey.300',
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: primaryMain,
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: primaryMain,
                                                },
                                            },
                                        }}
                                    />

                                    <Button
                                        type="submit"
                                        variant="contained"
                                        size="large"
                                        disabled={processing}
                                        fullWidth
                                        sx={{
                                            py: 1.5,
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            borderRadius: 2,
                                            textTransform: 'none',
                                            background:
                                                'linear-gradient(135deg, #4ECDC4 0%, #45B7D1 100%)',
                                            boxShadow: '0 4px 15px rgba(78, 205, 196, 0.3)',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            '&:hover': {
                                                background:
                                                    'linear-gradient(135deg, #45B7D1 0%, #4ECDC4 100%)',
                                                transform: 'translateY(-2px)',
                                                boxShadow: '0 8px 25px rgba(78, 205, 196, 0.4)',
                                            },
                                            '&:disabled': {
                                                background:
                                                    'linear-gradient(135deg, #ccc 0%, #999 100%)',
                                                color: 'white',
                                            },
                                        }}
                                    >
                                        {processing ? t('auth.signingIn') : t('auth.logIn')}
                                    </Button>

                                    <Box sx={{ textAlign: 'center' }}>
                                        <Link
                                            href={route('password.request')}
                                            underline="hover"
                                            sx={{
                                                fontSize: 14,
                                                color: primaryMain,
                                                '&:hover': { color: primaryDark },
                                            }}
                                        >
                                            Forgot your password?
                                        </Link>
                                    </Box>

                                    <Typography
                                        variant="body2"
                                        sx={{ textAlign: 'center', color: textSecondary }}
                                    >
                                        Don't have an account?{' '}
                                        <Link
                                            href={route('register')}
                                            underline="hover"
                                            sx={{
                                                fontWeight: 600,
                                                color: primaryMain,
                                                '&:hover': { color: primaryDark },
                                            }}
                                        >
                                            {t('auth.signUpNow')}
                                        </Link>
                                    </Typography>
                                </Stack>
                            </form>
                        </Paper>
                    </Container>
                </Box>

                {/* Footer */}
                <Box
                    sx={{
                        py: 6,
                        bgcolor: backgroundPaper,
                        borderTop: '1px solid',
                        borderColor: divider,
                    }}
                >
                    <Container maxWidth="lg">
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: 2,
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 700, color: primaryMain, mr: 2 }}
                                >
                                    TaskPilot
                                </Typography>
                                <Typography variant="body2" sx={{ color: textSecondary }}>
                                    The everything app, for work.
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                <Link
                                    href="/blog"
                                    sx={{
                                        color: textSecondary,
                                        textDecoration: 'none',
                                        '&:hover': { color: primaryMain },
                                    }}
                                >
                                    Blog
                                </Link>
                                <InertiaLink
                                    href="/privacy_policy"
                                    style={{
                                        color: textSecondary,
                                        textDecoration: 'none',
                                    }}
                                    onMouseEnter={(e) => (e.target.style.color = primaryMain)}
                                    onMouseLeave={(e) => (e.target.style.color = textSecondary)}
                                >
                                    Privacy
                                </InertiaLink>
                                <InertiaLink
                                    href="/terms_of_service"
                                    style={{
                                        color: textSecondary,
                                        textDecoration: 'none',
                                    }}
                                    onMouseEnter={(e) => (e.target.style.color = primaryMain)}
                                    onMouseLeave={(e) => (e.target.style.color = textSecondary)}
                                >
                                    Terms
                                </InertiaLink>
                            </Box>
                        </Box>

                        <Typography
                            variant="body2"
                            color="grey.500"
                            sx={{ textAlign: 'center', mt: 4 }}
                        >
                            © 2025 TaskPilot
                        </Typography>
                    </Container>
                </Box>
            </Box>

            {stage !== 'input' && (
                <Fab
                    color="primary"
                    variant="extended"
                    onClick={resetPrompt}
                    sx={{
                        position: 'fixed',
                        left: 28,
                        bottom: 36,
                        zIndex: 1200,
                        boxShadow: '0 18px 36px -18px rgba(15,23,42,0.65)',
                        textTransform: 'none',
                    }}
                >
                    <ReplayRounded sx={{ mr: 1 }} />
                    New prompt
                </Fab>
            )}

            {/* Floating Action Button */}
            <Box
                sx={{
                    position: 'fixed',
                    bottom: 30,
                    right: 30,
                    zIndex: 1000,
                }}
            >
                <Button
                    variant="contained"
                    href={route('register')}
                    sx={{
                        background:
                            'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)',
                        backgroundSize: '200% 200%',
                        animation: 'gradientShift 3s ease infinite',
                        borderRadius: '50px',
                        px: 4,
                        py: 2,
                        fontSize: '1rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        boxShadow: '0 8px 25px rgba(255, 107, 107, 0.4)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                            transform: 'translateY(-3px) scale(1.05)',
                            boxShadow: '0 15px 35px rgba(255, 107, 107, 0.5)',
                            animation: 'bounce 1s ease infinite',
                        },
                    }}
                >
                    🚀 {t('landing.getStarted')}
                </Button>
            </Box>
        </>
    );
}
