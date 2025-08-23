import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Head, useForm, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    alpha,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    IconButton,
    MenuItem,
    Stack,
    TextField,
    Tooltip,
    Typography,
    InputAdornment,
    FormControl,
    InputLabel,
    Select,
} from '@mui/material';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CloseRoundedIcon from '@mui/icons-material/CloseRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import EventAvailableRoundedIcon from '@mui/icons-material/EventAvailableRounded';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import ApartmentRoundedIcon from '@mui/icons-material/ApartmentRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import GroupRoundedIcon from '@mui/icons-material/GroupRounded';
import RequestQuoteRoundedIcon from '@mui/icons-material/RequestQuoteRounded';
import AccountBalanceRoundedIcon from '@mui/icons-material/AccountBalanceRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import ReportProblemRoundedIcon from '@mui/icons-material/ReportProblemRounded';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import { DragDropContext } from 'react-beautiful-dnd';

import HeaderBanner from '../Board/HeaderBanner';
import Column from '../Board/Column';
import UpgradeDialog from '../Board/UpgradeDialog';
import FloatingActionGroup from '@/Components/FloatingActionGroup';

import { METHODOLOGIES, DEFAULT_METHOD, getStatusMeta, getStatusOrder } from '../Board/meta.jsx';

import TaskCard from './TaskCard';
import MembersManagerDialog from './MembersManagerDialog';
import AIPdfReportDialog from './ProjectReportDialog';
import ProjectDetailsDialog from './ProjectDetailsDialog';
import AssistantChat from './AssistantChat';
import { useSubscription } from '@/Hooks/useSubscription';

/** Visual tokens per methodology */
const METHOD_STYLES = {
    [METHODOLOGIES.KANBAN]: {
        accent: '#4F46E5',
        gradient: 'linear-gradient(140deg,#F7FAFF 0%,#F2F6FE 55%,#EDF2FA 100%)',
        chipBg: (t) => alpha('#4F46E5', 0.08),
        chipBorder: (t) => alpha('#4F46E5', 0.18),
    },
    [METHODOLOGIES.SCRUM]: {
        accent: '#06B6D4',
        gradient: 'linear-gradient(140deg,#F0FDFF 0%,#ECFEFF 55%,#E0F2FE 100%)',
        chipBg: (t) => alpha('#06B6D4', 0.1),
        chipBorder: (t) => alpha('#06B6D4', 0.2),
    },
    [METHODOLOGIES.AGILE]: {
        accent: '#10B981',
        gradient: 'linear-gradient(140deg,#F0FDF4 0%,#ECFDF5 55%,#E7F5EE 100%)',
        chipBg: (t) => alpha('#10B981', 0.1),
        chipBorder: (t) => alpha('#10B981', 0.2),
    },
    [METHODOLOGIES.WATERFALL]: {
        accent: '#0EA5E9',
        gradient: 'linear-gradient(140deg,#F0F9FF 0%,#E0F2FE 55%,#DBEAFE 100%)',
        chipBg: (t) => alpha('#0EA5E9', 0.1),
        chipBorder: (t) => alpha('#0EA5E9', 0.2),
    },
    [METHODOLOGIES.LEAN]: {
        accent: '#22C55E',
        gradient: 'linear-gradient(140deg,#F0FDF4 0%,#ECFDF5 55%,#E8F5E9 100%)',
        chipBg: (t) => alpha('#22C55E', 0.1),
        chipBorder: (t) => alpha('#22C55E', 0.2),
    },
};

// Canonical server statuses (data source only)
const SERVER_STATUSES = ['todo', 'inprogress', 'review', 'done'];

// Map methodology → server status
const METHOD_TO_SERVER = {
    [METHODOLOGIES.KANBAN]: {
        todo: 'todo',
        inprogress: 'inprogress',
        review: 'review',
        done: 'done',
    },
    [METHODOLOGIES.SCRUM]: {
        backlog: 'todo',
        todo: 'todo',
        inprogress: 'inprogress',
        testing: 'review',
        review: 'review',
        done: 'done',
    },
    [METHODOLOGIES.AGILE]: {
        backlog: 'todo',
        todo: 'todo',
        inprogress: 'inprogress',
        testing: 'review',
        review: 'review',
        done: 'done',
    },
    [METHODOLOGIES.WATERFALL]: {
        requirements: 'todo',
        design: 'inprogress',
        implementation: 'inprogress',
        verification: 'review',
        maintenance: 'done',
    },
    [METHODOLOGIES.LEAN]: {
        backlog: 'todo',
        todo: 'inprogress',
        testing: 'review',
        review: 'review',
        done: 'done',
    },
};

const SERVER_DEFAULT_TO_METHOD = {
    [METHODOLOGIES.KANBAN]: {
        todo: 'todo',
        inprogress: 'inprogress',
        review: 'review',
        done: 'done',
    },
    [METHODOLOGIES.SCRUM]: {
        todo: 'todo',
        inprogress: 'inprogress',
        review: 'review',
        done: 'done',
    },
    [METHODOLOGIES.AGILE]: {
        todo: 'todo',
        inprogress: 'inprogress',
        review: 'review',
        done: 'done',
    },
    [METHODOLOGIES.WATERFALL]: {
        todo: 'requirements',
        inprogress: 'design',
        review: 'verification',
        done: 'maintenance',
    },
    [METHODOLOGIES.LEAN]: { todo: 'backlog', inprogress: 'todo', review: 'testing', done: 'done' },
};

const phaseStorageKey = (projectId, methodology) => `phaseMap:${projectId}:${methodology}`;

export default function Board({ auth, project = {}, tasks = {}, users = [], isPro: isProProp }) {
    const page = usePage();
    const isPro = typeof isProProp === 'boolean' ? isProProp : !!(page?.props && page.props.isPro);
    const { shouldShowOverlay, userPlan } = useSubscription();
    const automationLocked = shouldShowOverlay('automation');

    const initialMethod = (() => {
        const allowed = Object.values(METHODOLOGIES);
        const fromMeta = project?.meta?.methodology;
        if (allowed.includes(fromMeta)) return fromMeta;
        let fromLocal = null;
        try {
            if (project?.id) {
                fromLocal = localStorage.getItem(`project:${project.id}:methodology`);
            }
        } catch {
            fromLocal = null;
        }
        if (allowed.includes(fromLocal)) return fromLocal;
        return DEFAULT_METHOD;
    })();
    const [methodology, setMethodology] = useState(initialMethod);

    const STATUS_META = useMemo(() => getStatusMeta(methodology), [methodology]);
    const STATUS_ORDER = useMemo(() => getStatusOrder(methodology), [methodology]);
    const methodStyles = METHOD_STYLES[methodology] || METHOD_STYLES[METHODOLOGIES.KANBAN];

    const COLUMN_WIDTH = 320;
    const COLUMN_GAP = 12;

    const [phaseMap, setPhaseMap] = useState({});
    useEffect(() => {
        try {
            const raw = localStorage.getItem(phaseStorageKey(project?.id || 'p', methodology));
            setPhaseMap(raw ? JSON.parse(raw) : {});
        } catch {
            setPhaseMap({});
        }
    }, [project?.id, methodology]);

    useEffect(() => {
        try {
            localStorage.setItem(
                phaseStorageKey(project?.id || 'p', methodology),
                JSON.stringify(phaseMap)
            );
        } catch {}
    }, [phaseMap, project?.id, methodology]);

    /**
     * Reconcile phaseMap with server statuses
     */
    useEffect(() => {
        try {
            const next = { ...phaseMap };
            let changed = false;
            const seenIds = new Set();

            SERVER_STATUSES.forEach((serverKey) => {
                const arr = Array.isArray(tasks?.[serverKey]) ? tasks[serverKey] : [];
                const serverDefaultPhase =
                    SERVER_DEFAULT_TO_METHOD[methodology][serverKey] || STATUS_ORDER[0] || 'todo';

                arr.forEach((task) => {
                    seenIds.add(task.id);
                    const localPhase = phaseMap?.[task.id];
                    const localMapsToServer =
                        !!localPhase &&
                        STATUS_ORDER.includes(localPhase) &&
                        (METHOD_TO_SERVER[methodology][localPhase] || 'todo') === serverKey;

                    if (!localMapsToServer) {
                        if (next[task.id] !== serverDefaultPhase) {
                            next[task.id] = serverDefaultPhase;
                            changed = true;
                        }
                    }
                });
            });

            Object.keys(next).forEach((idStr) => {
                const idNum = Number(idStr);
                if (!seenIds.has(idNum)) {
                    delete next[idStr];
                    changed = true;
                }
            });

            if (changed) {
                setPhaseMap(next);
            }
        } catch {}
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tasks, methodology]);

    const [openForm, setOpenForm] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [pendingDeleteId, setPendingDeleteId] = useState(null);

    const [searchQuery, setSearchQuery] = useState('');
    const [priorityFilter, setPriorityFilter] = useState('');

    const [membersOpen, setMembersOpen] = useState(false);
    const [reportOpen, setReportOpen] = useState(false);
    const [upgradeOpen, setUpgradeOpen] = useState(false);
    const [detailsOpen, setDetailsOpen] = useState(false);
    const [assistantOpen, setAssistantOpen] = useState(false);

    const buildColumnsFromServer = (incomingTasksObj) => {
        const cols = {};
        STATUS_ORDER.forEach((k) => (cols[k] = []));
        SERVER_STATUSES.forEach((serverKey) => {
            const arr = Array.isArray(incomingTasksObj?.[serverKey])
                ? incomingTasksObj[serverKey]
                : [];
            arr.forEach((task) => {
                const serverPhase =
                    SERVER_DEFAULT_TO_METHOD[methodology][serverKey] || STATUS_ORDER[0] || 'todo';
                const localPhase = phaseMap?.[task.id];
                const localMapsToServer =
                    !!localPhase &&
                    STATUS_ORDER.includes(localPhase) &&
                    (METHOD_TO_SERVER[methodology][localPhase] || 'todo') === serverKey;

                const chosenPhase = localMapsToServer ? localPhase : serverPhase;
                cols[chosenPhase].push({ ...task, status: chosenPhase });
            });
        });
        return cols;
    };

    const filterTasks = (tasksArr) => {
        if (!Array.isArray(tasksArr)) return [];
        if (!searchQuery && !priorityFilter) return tasksArr;

        return tasksArr.filter((task) => {
            if (!task) return false;
            const matchesSearch =
                !searchQuery ||
                (task.title && task.title.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (task.description &&
                    task.description.toLowerCase().includes(searchQuery.toLowerCase()));
            const matchesPriority = !priorityFilter || task.priority === priorityFilter;
            return matchesSearch && matchesPriority;
        });
    };

    const [taskState, setTaskState] = useState(buildColumnsFromServer(tasks));

    const filteredTaskState = useMemo(() => {
        const filtered = {};
        Object.keys(taskState).forEach((statusKey) => {
            filtered[statusKey] = filterTasks(taskState[statusKey] || []);
        });
        return filtered;
    }, [taskState, searchQuery, priorityFilter]);

    useEffect(() => {
        setTaskState(buildColumnsFromServer(tasks));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tasks, methodology, JSON.stringify(phaseMap)]);

    const pendingTask = useMemo(() => {
        if (!pendingDeleteId) return null;
        for (const k of STATUS_ORDER) {
            const found = (taskState[k] || []).find((t) => t.id === pendingDeleteId);
            if (found) return found;
        }
        return null;
    }, [pendingDeleteId, taskState, STATUS_ORDER]);

    const { data, setData, post, patch, reset, processing, errors } = useForm({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        assignee_id: '',
        status: STATUS_ORDER[0] || 'todo',
        priority: 'medium',
        milestone: false,
    });

    const totalTasks = useMemo(
        () =>
            STATUS_ORDER.reduce(
                (sum, k) =>
                    sum + (Array.isArray(filteredTaskState[k]) ? filteredTaskState[k].length : 0),
                0
            ),
        [filteredTaskState, STATUS_ORDER]
    );
    const doneKey = STATUS_ORDER[STATUS_ORDER.length - 1];
    const doneCount = Array.isArray(filteredTaskState[doneKey])
        ? filteredTaskState[doneKey].length
        : 0;
    const percentDone = totalTasks === 0 ? 0 : Math.round((doneCount / totalTasks) * 100);

    const refreshTasks = (pageObj) => {
        const incoming = pageObj?.props?.tasks || tasks || {};
        setTaskState(buildColumnsFromServer(incoming));
    };

    const showCreate = (status = STATUS_ORDER[0]) => {
        reset();
        setEditMode(false);
        setEditingId(null);
        const safe = STATUS_ORDER.includes(status) ? status : STATUS_ORDER[0];
        setData('status', safe);
        setData('start_date', project?.start_date ?? '');
        setOpenForm(true);
    };

    const showEdit = (t) => {
        setEditMode(true);
        setEditingId(t.id);
        setData({
            title: t.title,
            description: t.description ?? '',
            start_date: t.start_date ?? '',
            end_date: t.end_date ?? '',
            assignee_id: t.assignee?.id ?? '',
            status: STATUS_ORDER.includes(t.status) ? t.status : STATUS_ORDER[0],
            priority: t.priority ?? 'medium',
            milestone: t.milestone ?? false,
        });
        setOpenForm(true);
    };

    const persistMethodology = (next) => {
        try {
            const meta = { ...(project?.meta || {}), methodology: next };
            router.patch(
                route('projects.update', project.id),
                { meta },
                {
                    preserveScroll: true,
                    preserveState: true,
                    only: ['project'],
                    onSuccess: () => {
                        try {
                            if (project.meta) project.meta.methodology = next;
                        } catch {}
                    },
                }
            );
            try {
                if (project?.id && next) {
                    localStorage.setItem(`project:${project.id}:methodology`, next);
                }
            } catch {}
        } catch (err) {
            console.error('Failed to persist methodology', err);
        }
    };

    const submit = (e) => {
        e.preventDefault();

        setOpenForm(false);

        const routeName = editMode
            ? route('tasks.update', [project.id, editingId])
            : route('tasks.store', project.id);
        const serverStatus = METHOD_TO_SERVER[methodology][data.status] || 'todo';
        const payload = { ...data, status: serverStatus };

        const action = editMode ? patch : post;
        action(routeName, payload, {
            preserveScroll: true,
            onSuccess: (p) => {
                try {
                    const tid = editMode ? editingId : p?.props?.task?.id;
                    if (tid) setPhaseMap((prev) => ({ ...prev, [tid]: data.status }));
                } catch {}
                refreshTasks(p);
                reset();
            },
            onError: () => {},
        });
    };

    const askDelete = (id) => {
        setPendingDeleteId(id);
        setConfirmOpen(true);
    };

    const confirmDelete = () => {
        router.delete(route('tasks.destroy', [project.id, pendingDeleteId]), {
            preserveScroll: true,
            onSuccess: refreshTasks,
        });
        setConfirmOpen(false);
        setPendingDeleteId(null);
    };

    const onDragEnd = ({ destination, source, draggableId }) => {
        if (!destination || destination.droppableId === source.droppableId || !draggableId) return;

        const id = Number(draggableId);
        const from = source.droppableId;
        const to = destination.droppableId;

        const moving = (taskState[from] || []).find((t) => t.id === id);
        if (!moving) return;

        const newFrom = (taskState[from] || []).filter((t) => t.id !== id);
        const newTo = [...(taskState[to] || [])];
        const movedTask = { ...moving, status: to };
        newTo.splice(destination.index, 0, movedTask);
        setTaskState({ ...taskState, [from]: newFrom, [to]: newTo });

        setPhaseMap((prev) => ({ ...prev, [id]: to }));

        const serverStatus = METHOD_TO_SERVER[methodology][to] || 'todo';
        router.patch(
            route('tasks.update', [project.id, id]),
            { status: serverStatus },
            {
                preserveScroll: true,
                onSuccess: refreshTasks,
            }
        );
    };

    const titleRef = useRef(null);

    useEffect(() => {
        const handler = (e) => {
            const target = e.target;
            const tag = target?.tagName?.toLowerCase?.() || '';
            const isTypingInInput =
                tag === 'input' ||
                tag === 'textarea' ||
                target?.isContentEditable === true ||
                !!target?.closest?.('.MuiTextField-root') ||
                !!target?.closest?.('[role="textbox"]') ||
                !!target?.closest?.('input, textarea, [contenteditable="true"]') ||
                !!target?.closest?.('form');

            if (
                e.shiftKey &&
                String(e.key || '').toLowerCase() === 'c' &&
                !openForm &&
                !processing &&
                !assistantOpen &&
                !isTypingInInput
            ) {
                showCreate(STATUS_ORDER[0]);
            }
        };

        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [openForm, processing, STATUS_ORDER, assistantOpen]);

    const requirePro = (openFn) => (isPro ? openFn(true) : setUpgradeOpen(true));

    const fmtDate = (d) => {
        if (!d) return null;
        try {
            const dt = new Date(d);
            if (Number.isNaN(dt.getTime())) return d;
            return dt.toLocaleDateString();
        } catch {
            return d;
        }
    };
    const stripContextSummary = (text) =>
        (text || '').replace(/\n?\n?Context Summary:\n(?:- .*\n?)+/gi, '').trim();

    const meta = project?.meta || {};
    const headerChips = [
        { icon: <KeyRoundedIcon fontSize="small" />, label: project?.key, show: !!project?.key },
        {
            icon: <ApartmentRoundedIcon fontSize="small" />,
            label: meta.project_type,
            show: !!meta.project_type,
        },
        { icon: <PublicRoundedIcon fontSize="small" />, label: meta.domain, show: !!meta.domain },
        {
            icon: <PlaceRoundedIcon fontSize="small" />,
            label: meta.location,
            show: !!meta.location,
        },
        {
            icon: <GroupRoundedIcon fontSize="small" />,
            label: meta.team_size ? `${meta.team_size} members` : '',
            show: !!meta.team_size,
        },
        {
            icon: <RequestQuoteRoundedIcon fontSize="small" />,
            label: meta.budget,
            show: !!meta.budget,
        },
        {
            icon: <AccountBalanceRoundedIcon fontSize="small" />,
            label: meta.primary_stakeholder,
            show: !!meta.primary_stakeholder,
        },
    ].filter((c) => c.show);

    const methodLabel = {
        [METHODOLOGIES.KANBAN]: 'Kanban',
        [METHODOLOGIES.SCRUM]: 'Scrum',
        [METHODOLOGIES.AGILE]: 'Agile',
        [METHODOLOGIES.WATERFALL]: 'Waterfall',
        [METHODOLOGIES.LEAN]: 'Lean',
    }[methodology];

    useEffect(() => {
        try {
            if (project?.id && methodology) {
                localStorage.setItem(`project:${project.id}:methodology`, methodology);
            }
        } catch {}
    }, [project?.id, methodology]);

    const ProjectSummaryBar = () => {
        if (!project) return null;
        return (
            <Box
                sx={{
                    mb: 1.25,
                    borderRadius: 2.5,
                    p: 1,
                    background:
                        'linear-gradient(135deg, rgba(255,255,255,0.95), rgba(255,255,255,0.75))',
                    border: (t) => `1px solid ${methodStyles.chipBorder(t)}`,
                    boxShadow: `0 8px 22px -14px rgba(0,0,0,.25)`,
                }}
            >
                <Stack spacing={0.75}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Chip
                            label={`${methodLabel} Mode`}
                            size="small"
                            sx={{
                                height: 22,
                                fontWeight: 700,
                                background: (t) => methodStyles.chipBg(t),
                                border: (t) => `1px solid ${methodStyles.chipBorder(t)}`,
                                color: '#000000',
                                '& .MuiChip-label': {
                                    color: '#000000',
                                    fontWeight: 700,
                                },
                            }}
                            color="primary"
                        />
                        <Typography
                            variant="subtitle1"
                            sx={{ fontWeight: 800, letterSpacing: 0.1 }}
                        >
                            {project?.name || 'Project'}
                        </Typography>

                        <Button
                            size="small"
                            startIcon={<EventAvailableRoundedIcon />}
                            onClick={() => {
                                router.visit(`/projects/${project.id}/timeline`);
                            }}
                            sx={{
                                ml: 1,
                                textTransform: 'none',
                                fontWeight: 700,
                                borderRadius: 2,
                                px: 1.25,
                                py: 0.25,
                                background: (t) => alpha(t.palette.primary.main, 0.08),
                                border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.22)}`,
                                '&:hover': {
                                    background: (t) => alpha(t.palette.primary.main, 0.14),
                                },
                            }}
                        >
                            Timeline
                        </Button>
                    </Stack>

                    {headerChips.length > 0 && (
                        <Stack direction="row" spacing={0.75} flexWrap="wrap" rowGap={0.75}>
                            {headerChips.map((c, i) => (
                                <Chip
                                    key={i}
                                    icon={c.icon}
                                    label={c.label}
                                    size="small"
                                    sx={{
                                        bgcolor: (t) => methodStyles.chipBg(t),
                                        border: (t) => `1px solid ${methodStyles.chipBorder(t)}`,
                                        '& .MuiChip-label': { fontWeight: 600 },
                                        height: 24,
                                    }}
                                />
                            ))}
                            {(project?.start_date || project?.end_date) && (
                                <Chip
                                    icon={<CalendarMonthRoundedIcon fontSize="small" />}
                                    label={`${fmtDate(project?.start_date) ?? '—'} → ${fmtDate(project?.end_date) ?? '—'}`}
                                    size="small"
                                    sx={{
                                        bgcolor: (t) => methodStyles.chipBg(t),
                                        border: (t) => `1px solid ${methodStyles.chipBorder(t)}`,
                                        '& .MuiChip-label': { fontWeight: 600 },
                                        height: 24,
                                    }}
                                />
                            )}
                        </Stack>
                    )}

                    {(meta.objectives || meta.constraints) && (
                        <Stack spacing={0.5}>
                            {meta.objectives && (
                                <Stack direction="row" spacing={0.5} alignItems="flex-start">
                                    <FlagRoundedIcon
                                        fontSize="small"
                                        sx={{ mt: '2px', color: alpha('#16A34A', 0.95) }}
                                    />
                                    <Tooltip title={meta.objectives} arrow placement="top">
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                overflow: 'hidden',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                            }}
                                        >
                                            {meta.objectives}
                                        </Typography>
                                    </Tooltip>
                                </Stack>
                            )}
                            {meta.constraints && (
                                <Stack direction="row" spacing={0.5} alignItems="flex-start">
                                    <ReportProblemRoundedIcon
                                        fontSize="small"
                                        sx={{ mt: '2px', color: alpha('#F59E0B', 0.95) }}
                                    />
                                    <Tooltip title={meta.constraints} arrow placement="top">
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                overflow: 'hidden',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                            }}
                                        >
                                            {meta.constraints}
                                        </Typography>
                                    </Tooltip>
                                </Stack>
                            )}
                        </Stack>
                    )}
                </Stack>
            </Box>
        );
    };

    return (
        <>
            <Head title={`${project?.name ?? 'Project'} – Task Board`} />
            <AuthenticatedLayout user={auth?.user}>
                <Box
                    sx={{
                        minHeight: '100vh',
                        display: 'flex',
                        flexDirection: 'column',
                        background: methodStyles.gradient,
                        p: { xs: 1.5, md: 2 },
                    }}
                    style={{ ['--col-w']: `${COLUMN_WIDTH}px`, ['--col-gap']: `${COLUMN_GAP}px` }}
                >
                    <HeaderBanner
                        projectName={project?.name ?? 'Project'}
                        totalTasks={totalTasks}
                        percentDone={percentDone}
                        usersCount={Array.isArray(users) ? users.length : 0}
                        onAiTasks={() => {
                            router.visit(`/projects/${project.id}/tasks/ai`);
                        }}
                        isPro={isPro}
                        onOpenMembers={() => requirePro(setMembersOpen)}
                        onOpenAutomations={() => {
                            if (automationLocked) {
                                router.visit(userPlan?.billing_url || '/billing');
                                return;
                            }
                            router.visit(`/projects/${project.id}/automations`);
                        }}
                        onOpenReport={() => requirePro(setReportOpen)}
                        onOpenDetails={() => setDetailsOpen(true)}
                        onOpenAssistant={() => setAssistantOpen(true)}
                    />

                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        <TextField
                            select
                            size="small"
                            label="Methodology"
                            value={methodology}
                            onChange={(e) => {
                                const next = e.target.value;
                                setMethodology(next);
                                setData('status', getStatusOrder(next)[0] || 'todo');
                                persistMethodology(next);
                            }}
                            sx={{
                                minWidth: 180,
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: (t) => methodStyles.chipBorder(t),
                                },
                            }}
                        >
                            <MenuItem value={METHODOLOGIES.KANBAN}>Kanban</MenuItem>
                            <MenuItem value={METHODOLOGIES.SCRUM}>Scrum</MenuItem>
                            <MenuItem value={METHODOLOGIES.AGILE}>Agile</MenuItem>
                            <MenuItem value={METHODOLOGIES.WATERFALL}>Waterfall</MenuItem>
                            <MenuItem value={METHODOLOGIES.LEAN}>Lean</MenuItem>
                        </TextField>
                        <Chip
                            size="small"
                            label={methodLabel}
                            sx={{
                                fontWeight: 700,
                                height: 22,
                                background: (t) => methodStyles.chipBg(t),
                                border: (t) => `1px solid ${methodStyles.chipBorder(t)}`,
                            }}
                        />
                    </Stack>

                    {/* Search / Filters */}
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 2 }}>
                        <TextField
                            size="small"
                            placeholder="Search tasks by name or description..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            sx={{
                                flexGrow: 1,
                                maxWidth: 400,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' },
                                    '&.Mui-focused': { backgroundColor: 'rgba(255, 255, 255, 1)' },
                                },
                                '& .MuiOutlinedInput-notchedOutline': {
                                    borderColor: (t) => methodStyles.chipBorder(t),
                                },
                            }}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon sx={{ color: 'text.secondary' }} />
                                    </InputAdornment>
                                ),
                                endAdornment: searchQuery && (
                                    <InputAdornment position="end">
                                        <IconButton
                                            size="small"
                                            onClick={() => setSearchQuery('')}
                                            sx={{ color: 'text.secondary' }}
                                        >
                                            <ClearIcon fontSize="small" />
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                        />

                        <FormControl size="small" sx={{ minWidth: 140 }}>
                            <InputLabel>Priority Filter</InputLabel>
                            <Select
                                value={priorityFilter}
                                onChange={(e) => setPriorityFilter(e.target.value)}
                                label="Priority Filter"
                                sx={{
                                    borderRadius: 2,
                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' },
                                    '&.Mui-focused': { backgroundColor: 'rgba(255, 255, 255, 1)' },
                                    '& .MuiOutlinedInput-notchedOutline': {
                                        borderColor: (t) => methodStyles.chipBorder(t),
                                    },
                                }}
                                startAdornment={
                                    <FilterListIcon sx={{ color: 'text.secondary', mr: 1 }} />
                                }
                            >
                                <MenuItem value="">All Priorities</MenuItem>
                                <MenuItem value="low">Low</MenuItem>
                                <MenuItem value="medium">Medium</MenuItem>
                                <MenuItem value="high">High</MenuItem>
                                <MenuItem value="urgent">Urgent</MenuItem>
                            </Select>
                        </FormControl>

                        {(searchQuery || priorityFilter) && (
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                    setSearchQuery('');
                                    setPriorityFilter('');
                                }}
                                sx={{
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                    '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.9)' },
                                    borderColor: (t) => methodStyles.chipBorder(t),
                                }}
                            >
                                Clear Filters
                            </Button>
                        )}
                    </Stack>

                    <ProjectSummaryBar />

                    <DragDropContext key={methodology} onDragEnd={onDragEnd}>
                        <Box
                            sx={{
                                display: 'flex',
                                flexDirection: 'row',
                                alignItems: 'stretch',
                                gap: 'var(--col-gap)',
                                pb: 3,
                                overflowX: 'auto',
                                overflowY: 'hidden',
                                scrollSnapType: 'x proximity',
                                '&::-webkit-scrollbar': { height: 8 },
                                '&::-webkit-scrollbar-thumb': {
                                    background: alpha('#000', 0.2),
                                    borderRadius: 8,
                                },
                            }}
                        >
                            {STATUS_ORDER.map((statusKey) => (
                                <Column
                                    key={statusKey}
                                    statusKey={statusKey}
                                    tasks={filteredTaskState[statusKey] || []}
                                    onAddTask={showCreate}
                                    statusMeta={STATUS_META}
                                    project={project}
                                    showProjectSummary={false}
                                    renderTaskCard={(task, dragSnapshot) => (
                                        <Box
                                            sx={{
                                                transition: 'transform .18s, box-shadow .22s',
                                                transform: dragSnapshot.isDragging
                                                    ? 'rotate(1.5deg) scale(1.02)'
                                                    : 'none',
                                                boxShadow: dragSnapshot.isDragging
                                                    ? `0 8px 20px -6px ${alpha(STATUS_META[statusKey]?.accent || methodStyles.accent, 0.45)}`
                                                    : '0 1px 3px rgba(0,0,0,.12)',
                                                borderRadius: 2,
                                            }}
                                        >
                                            <TaskCard
                                                task={task}
                                                onEdit={() => showEdit(task)}
                                                onDelete={() => askDelete(task.id)}
                                                onClick={() => {
                                                    router.visit(
                                                        `/projects/${project.id}/tasks/${task.id}`
                                                    );
                                                }}
                                                accent={
                                                    STATUS_META[statusKey]?.accent ||
                                                    methodStyles.accent
                                                }
                                            />
                                        </Box>
                                    )}
                                />
                            ))}
                        </Box>
                    </DragDropContext>

                    <FloatingActionGroup
                        onAddTask={() => {
                            showCreate(STATUS_ORDER[0]);
                            setTimeout(() => titleRef.current?.focus(), 60);
                        }}
                        onOpenAssistant={() => setAssistantOpen(true)}
                        methodStyles={methodStyles}
                        assistantOpen={assistantOpen}
                    />

                    {/* Create/Edit */}
                    <Dialog
                        open={openForm}
                        onClose={() => setOpenForm(false)}
                        maxWidth="sm"
                        fullWidth
                        PaperProps={{
                            sx: {
                                borderRadius: 3,
                                overflow: 'hidden',
                                background:
                                    'linear-gradient(140deg,rgba(255,255,255,0.95),rgba(255,255,255,0.8))',
                                backdropFilter: 'blur(12px)',
                                border: (t) => `1px solid ${methodStyles.chipBorder(t)}`,
                            },
                        }}
                    >
                        <form onSubmit={submit}>
                            <DialogTitle
                                sx={{
                                    fontWeight: 700,
                                    pr: 6,
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 1,
                                }}
                            >
                                {editMode ? 'Edit Task' : 'Create Task'}
                                <Chip
                                    size="small"
                                    label={editMode ? 'Editing' : 'New'}
                                    sx={{
                                        fontWeight: 700,
                                        height: 22,
                                        bgcolor: editMode ? '#ffc107' : '#17a2b8',
                                        color: editMode ? '#212529' : '#ffffff',
                                        border: 'none',
                                        fontSize: '0.75rem',
                                        '& .MuiChip-label': {
                                            fontWeight: 700,
                                            color: editMode ? '#212529' : '#ffffff',
                                            px: 1,
                                        },
                                    }}
                                />
                                <IconButton
                                    size="small"
                                    aria-label="Close"
                                    onClick={() => setOpenForm(false)}
                                    sx={{ ml: 'auto' }}
                                >
                                    <CloseRoundedIcon fontSize="small" />
                                </IconButton>
                            </DialogTitle>

                            <DialogContent
                                dividers
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 1.5,
                                    pt: 2,
                                    maxHeight: '60vh',
                                    overflowY: 'auto',
                                }}
                            >
                                <TextField
                                    label="Title"
                                    required
                                    fullWidth
                                    inputRef={titleRef}
                                    value={data.title}
                                    onChange={(e) => setData('title', e.target.value)}
                                    error={!!errors.title}
                                    helperText={errors.title}
                                    placeholder="Concise task name"
                                    variant="outlined"
                                    size="small"
                                />
                                <TextField
                                    label="Description"
                                    multiline
                                    minRows={3}
                                    fullWidth
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    error={!!errors.description}
                                    helperText={
                                        errors.description ||
                                        'Add optional context, acceptance criteria, etc.'
                                    }
                                    placeholder="Add more context..."
                                    size="small"
                                />

                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                    <TextField
                                        label="Start Date"
                                        type="date"
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                        value={data.start_date}
                                        onChange={(e) => setData('start_date', e.target.value)}
                                        error={!!errors.start_date}
                                        helperText={errors.start_date || 'Optional'}
                                        size="small"
                                        InputProps={{
                                            startAdornment: (
                                                <CalendarMonthRoundedIcon
                                                    fontSize="small"
                                                    sx={{ mr: 1, color: 'text.disabled' }}
                                                />
                                            ),
                                        }}
                                    />
                                    <TextField
                                        label="Due / Execution Date"
                                        type="date"
                                        fullWidth
                                        InputLabelProps={{ shrink: true }}
                                        value={data.end_date}
                                        onChange={(e) => setData('end_date', e.target.value)}
                                        error={!!errors.end_date}
                                        helperText={errors.end_date || 'Optional'}
                                        size="small"
                                        InputProps={{
                                            startAdornment: (
                                                <CalendarMonthRoundedIcon
                                                    fontSize="small"
                                                    sx={{ mr: 1, color: 'text.disabled' }}
                                                />
                                            ),
                                        }}
                                    />
                                    <TextField
                                        select
                                        label="Assign To"
                                        fullWidth
                                        value={data.assignee_id}
                                        onChange={(e) => setData('assignee_id', e.target.value)}
                                        error={!!errors.assignee_id}
                                        helperText={errors.assignee_id || 'Optional'}
                                        size="small"
                                        InputProps={{
                                            startAdornment: (
                                                <PersonRoundedIcon
                                                    fontSize="small"
                                                    sx={{ mr: 1, color: 'text.disabled' }}
                                                />
                                            ),
                                        }}
                                    >
                                        <MenuItem value="">— Unassigned —</MenuItem>
                                        {Array.isArray(users) &&
                                            users.map((u) => (
                                                <MenuItem key={u.id} value={u.id}>
                                                    {u.name}
                                                </MenuItem>
                                            ))}
                                    </TextField>
                                </Stack>

                                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                                    <TextField
                                        select
                                        label="Priority"
                                        fullWidth
                                        value={data.priority}
                                        onChange={(e) => setData('priority', e.target.value)}
                                        error={!!errors.priority}
                                        helperText={errors.priority || 'Task priority level'}
                                        size="small"
                                    >
                                        <MenuItem value="low">Low</MenuItem>
                                        <MenuItem value="medium">Medium</MenuItem>
                                        <MenuItem value="high">High</MenuItem>
                                        <MenuItem value="urgent">Urgent</MenuItem>
                                    </TextField>

                                    <TextField
                                        select
                                        label="Milestone"
                                        fullWidth
                                        value={String(data.milestone)}
                                        onChange={(e) =>
                                            setData('milestone', e.target.value === 'true')
                                        }
                                        error={!!errors.milestone}
                                        helperText={errors.milestone || 'Mark as project milestone'}
                                        size="small"
                                        InputProps={{
                                            startAdornment: (
                                                <FlagRoundedIcon
                                                    fontSize="small"
                                                    sx={{ mr: 1, color: 'text.disabled' }}
                                                />
                                            ),
                                        }}
                                    >
                                        <MenuItem value={'false'}>Regular Task</MenuItem>
                                        <MenuItem value={'true'}>Milestone</MenuItem>
                                    </TextField>
                                </Stack>

                                <TextField
                                    select
                                    label="Status"
                                    fullWidth
                                    value={data.status}
                                    onChange={(e) => setData('status', e.target.value)}
                                    helperText="Choose where it should appear on the board."
                                    size="small"
                                >
                                    {STATUS_ORDER.map((s) => (
                                        <MenuItem key={s} value={s}>
                                            {STATUS_META[s]?.title || s}
                                        </MenuItem>
                                    ))}
                                </TextField>
                            </DialogContent>

                            <DialogActions sx={{ px: 2, py: 1.5 }}>
                                <Button onClick={() => setOpenForm(false)} disabled={processing}>
                                    Cancel
                                </Button>
                                {editMode && (
                                    <Tooltip title="Delete task">
                                        <IconButton
                                            color="error"
                                            onClick={() => {
                                                setOpenForm(false);
                                                askDelete(editingId);
                                            }}
                                            size="small"
                                            sx={{ mr: 'auto' }}
                                        >
                                            <DeleteOutlineIcon />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                <Button
                                    type="submit"
                                    variant="contained"
                                    disabled={processing}
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 700,
                                        px: 2.2,
                                        py: 0.6,
                                        background: methodStyles.accent,
                                        boxShadow: '0 6px 16px -8px rgba(0,0,0,.28)',
                                        '&:hover': { opacity: 0.95 },
                                    }}
                                >
                                    {processing
                                        ? editMode
                                            ? 'Updating…'
                                            : 'Creating…'
                                        : editMode
                                          ? 'Update Task'
                                          : 'Create Task'}
                                </Button>
                            </DialogActions>
                        </form>
                    </Dialog>

                    {/* Confirm single delete */}
                    <Dialog
                        open={confirmOpen}
                        onClose={() => {
                            setConfirmOpen(false);
                            setPendingDeleteId(null);
                        }}
                        maxWidth="xs"
                        fullWidth
                        PaperProps={{
                            sx: {
                                borderRadius: 3,
                                background: (t) =>
                                    `linear-gradient(140deg, ${alpha(t.palette.error.light, 0.15)}, #fff)`,
                                border: (t) => `1px solid ${alpha(t.palette.error.main, 0.35)}`,
                                backdropFilter: 'blur(10px)',
                            },
                        }}
                    >
                        <DialogTitle sx={{ fontWeight: 800, pr: 6 }}>Delete Task</DialogTitle>
                        <DialogContent
                            dividers
                            sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}
                        >
                            <Typography variant="body2">
                                Are you sure you want to permanently delete
                                {pendingTask ? ' "' + pendingTask.title + '"' : ' this task'}? This
                                action cannot be undone.
                            </Typography>
                        </DialogContent>
                        <DialogActions sx={{ px: 2, py: 1.25 }}>
                            <Button
                                onClick={() => {
                                    setConfirmOpen(false);
                                    setPendingDeleteId(null);
                                }}
                            >
                                Cancel
                            </Button>
                            <Button
                                onClick={confirmDelete}
                                color="error"
                                variant="contained"
                                sx={{ fontWeight: 700, textTransform: 'none' }}
                            >
                                Delete
                            </Button>
                        </DialogActions>
                    </Dialog>

                    <MembersManagerDialog
                        open={membersOpen}
                        onClose={() => setMembersOpen(false)}
                        project={project}
                        members={Array.isArray(users) ? users : []}
                    />
                    <AIPdfReportDialog
                        key={reportOpen ? 'open' : 'closed'}
                        open={reportOpen}
                        onClose={() => setReportOpen(false)}
                        project={project}
                        tasks={taskState}
                        users={users}
                    />
                    <UpgradeDialog open={upgradeOpen} onClose={() => setUpgradeOpen(false)} />
                    <ProjectDetailsDialog
                        open={detailsOpen}
                        onClose={() => setDetailsOpen(false)}
                        project={project}
                    />
                    <AssistantChat
                        project={project}
                        open={assistantOpen}
                        onClose={() => setAssistantOpen(false)}
                    />
                </Box>
            </AuthenticatedLayout>
        </>
    );
}
