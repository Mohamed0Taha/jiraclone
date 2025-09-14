// resources/js/Pages/Timeline/Timeline.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import {
    alpha,
    Box,
    Chip,
    IconButton,
    Paper,
    Stack,
    Tooltip,
    Typography,
    Divider,
    Button,
    useTheme,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ZoomInRoundedIcon from '@mui/icons-material/ZoomInRounded';
import ZoomOutRoundedIcon from '@mui/icons-material/ZoomOutRounded';
import TodayRoundedIcon from '@mui/icons-material/TodayRounded';

/* ----------------------------- Date Utilities ----------------------------- */
const parseDate = (input) => {
    if (!input) return null;
    try {
        if (input instanceof Date) return new Date(input);
        if (typeof input === 'string') {
            let dateStr = input.trim();
            if (dateStr.includes(' ')) dateStr = dateStr.split(' ')[0];
            if (dateStr.includes('T')) dateStr = dateStr.split('T')[0];
            if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
                const [year, month, day] = dateStr.split('-').map(Number);
                return new Date(year, month - 1, day);
            }
        }
        const date = new Date(input);
        return isNaN(date.getTime()) ? null : date;
    } catch {
        return null;
    }
};

const daysBetween = (start, end) => {
    if (!start || !end) return 0;
    const startMs = new Date(start.getFullYear(), start.getMonth(), start.getDate()).getTime();
    const endMs = new Date(end.getFullYear(), end.getMonth(), end.getDate()).getTime();
    return Math.floor((endMs - startMs) / (24 * 60 * 60 * 1000));
};

const addDays = (date, days) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
};

const startOfMonth = (date) => new Date(date.getFullYear(), date.getMonth(), 1);
const endOfMonth = (date) => new Date(date.getFullYear(), date.getMonth() + 1, 0);

const formatMonth = (date) =>
    date.toLocaleDateString(undefined, { month: 'short', year: 'numeric' });
const formatDay = (date) => date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

/* ----------------------------- Constants ----------------------------- */
const LEFT_PANEL_WIDTH = 260;
const ROW_HEIGHT = 44;
const HEADER_HEIGHT = 56;
const BAR_HEIGHT = 18;
const MIN_BAR_WIDTH = 36;
const MIN_PX_PER_DAY = 8;
const MAX_PX_PER_DAY = 42;

const statusColors = {
    todo: '#64748B',
    inprogress: '#0EA5E9',
    review: '#8B5CF6',
    done: '#10B981',
};

export default function Timeline({ project = {}, tasks = {}, users = [] }) {
    const { t } = useTranslation();
    const theme = useTheme();

    /* ----------------------------- Flatten server groups ----------------------------- */
    const allTasks = useMemo(() => {
        const flat = [];
        if (!tasks || typeof tasks !== 'object') return flat;
        ['todo', 'inprogress', 'review', 'done'].forEach((status) => {
            const arr = Array.isArray(tasks[status]) ? tasks[status] : [];
            arr.forEach((t) => flat.push({ ...t, status }));
        });
        return flat;
    }, [tasks]);

    /* ----------------------------- Normalize dates ----------------------------- */
    const processedTasks = useMemo(() => {
        return allTasks.map((task) => {
            const startDate = parseDate(task.start_date);
            const endDate = parseDate(task.end_date);

            let finalStart = startDate || endDate || new Date();
            let finalEnd = endDate || startDate || finalStart;

            if (finalEnd < finalStart) finalEnd = new Date(finalStart);

            const totalDays = Math.max(1, daysBetween(finalStart, finalEnd) + 1);
            const hasEndDate = !!endDate;

            return {
                ...task,
                _start: finalStart,
                _end: finalEnd,
                _days: totalDays,
                _isMilestone: !!task.milestone,
                _hasEndDate: hasEndDate,
            };
        });
    }, [allTasks]);

    /* ----------------------------- Date range (snap to months) ----------------------------- */
    const dateRange = useMemo(() => {
        const points = [];
        processedTasks.forEach((t) => {
            if (t._start) points.push(t._start);
            if (t._end) points.push(t._end);
        });
        const pStart = parseDate(project?.start_date);
        const pEnd = parseDate(project?.end_date);
        if (pStart) points.push(pStart);
        if (pEnd) points.push(pEnd);

        if (points.length === 0) {
            const today = new Date();
            return { start: startOfMonth(today), end: endOfMonth(addDays(today, 30)) };
        }

        const earliest = new Date(Math.min(...points.map((d) => d.getTime())));
        const latest = new Date(Math.max(...points.map((d) => d.getTime())));
        const start = startOfMonth(addDays(earliest, -5));
        const end = endOfMonth(addDays(latest, 5));
        return { start, end };
    }, [processedTasks, project]);

    const totalTimelineDays = daysBetween(dateRange.start, dateRange.end) + 1;

    /* ----------------------------- Scale / Zoom ----------------------------- */
    const timelineRef = useRef(null);
    const scrollRef = useRef(null);
    const [pixelsPerDay, setPixelsPerDay] = useState(14);

    const recalcScaleToFit = useCallback(() => {
        if (!timelineRef.current) return;
        const containerWidth = timelineRef.current.clientWidth;
        const availableWidth = Math.max(800, containerWidth - LEFT_PANEL_WIDTH - 48);
        const calculated = Math.max(
            MIN_PX_PER_DAY,
            Math.min(MAX_PX_PER_DAY, Math.floor(availableWidth / totalTimelineDays))
        );
        setPixelsPerDay(calculated);
    }, [totalTimelineDays]);

    useEffect(() => {
        const r = new ResizeObserver(recalcScaleToFit);
        if (timelineRef.current) r.observe(timelineRef.current);
        recalcScaleToFit();
        return () => r.disconnect();
    }, [recalcScaleToFit]);

    const zoomIn = () => setPixelsPerDay((v) => Math.min(MAX_PX_PER_DAY, v + 2));
    const zoomOut = () => setPixelsPerDay((v) => Math.max(MIN_PX_PER_DAY, v - 2));

    const getXPosition = (date) => {
        if (!date) return 0;
        const daysFromStart = daysBetween(dateRange.start, date);
        return daysFromStart * pixelsPerDay;
    };

    /* ----------------------------- Month columns & weekly grid ----------------------------- */
    const monthColumns = useMemo(() => {
        const months = [];
        let current = startOfMonth(dateRange.start);
        while (current <= dateRange.end) {
            const monthStart = current < dateRange.start ? dateRange.start : current;
            const monthEnd =
                endOfMonth(current) > dateRange.end ? dateRange.end : endOfMonth(current);
            months.push({
                start: new Date(monthStart),
                end: new Date(monthEnd),
                label: formatMonth(current),
            });
            current = new Date(current.getFullYear(), current.getMonth() + 1, 1);
        }
        return months;
    }, [dateRange]);

    const weekLines = useMemo(() => {
        const lines = [];
        const total = totalTimelineDays;
        for (let i = 0; i <= total; i++) {
            const d = addDays(dateRange.start, i);
            if (d.getDay() === 1 || i === 0) {
                // Monday or start
                lines.push({ dayOffset: i, date: d });
            }
        }
        return lines;
    }, [dateRange, totalTimelineDays]);

    /* ----------------------------- Sort tasks ----------------------------- */
    const sortedTasks = useMemo(() => {
        const s = [...processedTasks].sort((a, b) => {
            const cmp = a._start.getTime() - b._start.getTime();
            return cmp || a.title.localeCompare(b.title);
        });
        return s;
    }, [processedTasks]);

    const dateRangeLabel = `${formatDay(dateRange.start)} — ${formatDay(dateRange.end)}`;

    const tasksWithEnd = useMemo(
        () => sortedTasks.filter((t) => t._hasEndDate).length,
        [sortedTasks]
    );
    const tasksMissingEnd = useMemo(
        () => sortedTasks.filter((t) => !t._hasEndDate).length,
        [sortedTasks]
    );

    /* ----------------------------- Today marker & actions ----------------------------- */
    const today = new Date();
    const isTodayInRange =
        today >=
        new Date(
            dateRange.start.getFullYear(),
            dateRange.start.getMonth(),
            dateRange.start.getDate()
        ) &&
        today <=
        new Date(
            dateRange.end.getFullYear(),
            dateRange.end.getMonth(),
            dateRange.end.getDate()
        );

    const scrollToToday = () => {
        if (!scrollRef.current) return;
        const x = getXPosition(today);
        scrollRef.current.scrollTo({ left: Math.max(0, x - 240), behavior: 'smooth' });
    };

    /* ----------------------------- Empty state ----------------------------- */
    const isEmpty = sortedTasks.length === 0;

    return (
        <>
            <Head title={`${project?.name ?? 'Project'} — Timeline`} />
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    background:
                        theme.palette.mode === 'light'
                            ? 'linear-gradient(135deg,#F6FAFF,#EEF2F7)'
                            : 'linear-gradient(135deg,#0B1220,#0E1726)',
                }}
            >
                {/* Header */}
                <Paper
                    elevation={0}
                    sx={{
                        px: { xs: 1.5, md: 3 },
                        py: 1.25,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.25,
                        borderBottom: (t) => `1px solid ${alpha(t.palette.divider, 0.8)}`,
                        borderRadius: 0,
                        background:
                            theme.palette.mode === 'light'
                                ? 'linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.86))'
                                : alpha('#0F172A', 0.7),
                        backdropFilter: 'blur(8px)',
                        position: 'sticky',
                        top: 0,
                        zIndex: 20,
                    }}
                >
                    <Tooltip title={t('timeline.backToBoard', 'Back to Board')}>
                        <IconButton
                            onClick={() => router.visit(route('tasks.index', project.id))}
                            sx={{
                                color: (t) => alpha(t.palette.text.primary, 0.7),
                                border: (t) => `1px solid ${alpha(t.palette.text.primary, 0.15)}`,
                            }}
                            size="small"
                        >
                            <ArrowBackIcon />
                        </IconButton>
                    </Tooltip>

                    <Typography
                        variant="h6"
                        sx={{
                            fontWeight: 800,
                            letterSpacing: 0.2,
                            mr: 0.5,
                            background:
                                theme.palette.mode === 'light'
                                    ? 'linear-gradient(90deg,#0F1F47,#2E4B7F)'
                                    : 'linear-gradient(90deg,#C8D7FF,#9EC2FF)',
                            WebkitBackgroundClip: 'text',
                            color: 'transparent',
                        }}
                    >
                        {project?.name || t('timeline.defaultTitle')}
                    </Typography>

                    <Chip
                        icon={<CalendarMonthRoundedIcon />}
                        label={dateRangeLabel}
                        size="small"
                        sx={{
                            height: 24,
                            '& .MuiChip-icon': { fontSize: 18 },
                            fontWeight: 700,
                            background: (t) => alpha(t.palette.primary.main, 0.08),
                            border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.22)}`,
                        }}
                    />

                    <Divider flexItem orientation="vertical" sx={{ mx: 1 }} />

                    <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap">
                        <Chip
                            size="small"
                            label={`Total ${sortedTasks.length}`}
                            sx={{
                                height: 24,
                                fontWeight: 700,
                                background: (t) => alpha(t.palette.text.primary, 0.06),
                                border: (t) => `1px solid ${alpha(t.palette.text.primary, 0.12)}`,
                            }}
                        />
                        <Chip
                            size="small"
                            label={`${tasksWithEnd} scheduled`}
                            sx={{
                                height: 24,
                                fontWeight: 700,
                                background: alpha(statusColors.done, 0.12),
                                border: `1px solid ${alpha(statusColors.done, 0.28)}`,
                            }}
                        />
                        {tasksMissingEnd > 0 && (
                            <Chip
                                size="small"
                                label={`${tasksMissingEnd} missing due date`}
                                sx={{
                                    height: 24,
                                    fontWeight: 700,
                                    background: alpha('#DC2626', 0.12),
                                    border: `1px solid ${alpha('#DC2626', 0.28)}`,
                                }}
                            />
                        )}
                    </Stack>

                    <Box sx={{ flexGrow: 1 }} />

                    <Stack direction="row" alignItems="center" spacing={0.5}>
                        <Tooltip title={t('timeline.zoomOut', 'Zoom out')}>
                            <span>
                                <IconButton
                                    onClick={zoomOut}
                                    disabled={pixelsPerDay <= MIN_PX_PER_DAY}
                                    size="small"
                                    sx={{ color: (t) => alpha(t.palette.text.primary, 0.7) }}
                                >
                                    <ZoomOutRoundedIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                        <Typography
                            variant="caption"
                            sx={{ minWidth: 64, textAlign: 'center', opacity: 0.7 }}
                        >
                            {pixelsPerDay}px/day
                        </Typography>
                        <Tooltip title={t('timeline.zoomIn', 'Zoom in')}>
                            <span>
                                <IconButton
                                    onClick={zoomIn}
                                    disabled={pixelsPerDay >= MAX_PX_PER_DAY}
                                    size="small"
                                    sx={{ color: (t) => alpha(t.palette.text.primary, 0.7) }}
                                >
                                    <ZoomInRoundedIcon />
                                </IconButton>
                            </span>
                        </Tooltip>
                        {isTodayInRange && (
                            <Tooltip title={t('timeline.scrollToToday', 'Scroll to today')}>
                                <IconButton
                                    onClick={scrollToToday}
                                    size="small"
                                    sx={{
                                        color: '#DC2626',
                                        border: (t) => `1px solid ${alpha('#DC2626', 0.35)}`,
                                        ml: 0.5,
                                    }}
                                >
                                    <TodayRoundedIcon />
                                </IconButton>
                            </Tooltip>
                        )}
                    </Stack>
                </Paper>

                {/* Legend */}
                <Box
                    sx={{
                        px: { xs: 1.5, md: 3 },
                        pt: 1,
                        pb: 0.5,
                    }}
                >
                    <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                        {[
                            [t('timeline.status.todo'), statusColors.todo],
                            [t('timeline.status.inProgress'), statusColors.inprogress],
                            ['Review', statusColors.review],
                            ['Done', statusColors.done],
                        ].map(([label, color]) => (
                            <Chip
                                key={label}
                                size="small"
                                label={label}
                                sx={{
                                    height: 22,
                                    fontWeight: 700,
                                    background: alpha(color, 0.12),
                                    border: `1px solid ${alpha(color, 0.32)}`,
                                    '& .MuiChip-label': { px: 1 },
                                }}
                            />
                        ))}
                    </Stack>
                </Box>

                {/* Main */}
                <Box
                    ref={timelineRef}
                    sx={{
                        flex: 1,
                        display: 'flex',
                        overflow: 'hidden',
                        p: { xs: 1.25, md: 2 },
                    }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            flex: 1,
                            display: 'flex',
                            overflow: 'hidden',
                            borderRadius: 3,
                            border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.15)}`,
                            background:
                                theme.palette.mode === 'light'
                                    ? 'linear-gradient(145deg,rgba(255,255,255,.96),rgba(255,255,255,.86))'
                                    : alpha('#0B1220', 0.6),
                            backdropFilter: 'blur(10px)',
                        }}
                    >
                        {/* Names column */}
                        <Box
                            sx={{
                                width: LEFT_PANEL_WIDTH,
                                minWidth: LEFT_PANEL_WIDTH,
                                borderRight: (t) => `1px solid ${alpha(t.palette.divider, 0.8)}`,
                                display: 'flex',
                                flexDirection: 'column',
                            }}
                        >
                            <Box
                                sx={{
                                    height: HEADER_HEIGHT,
                                    display: 'flex',
                                    alignItems: 'center',
                                    px: 2,
                                    fontWeight: 800,
                                    letterSpacing: 0.4,
                                    color: (t) => alpha(t.palette.text.primary, 0.9),
                                    background: (t) =>
                                        theme.palette.mode === 'light'
                                            ? alpha(t.palette.primary.main, 0.05)
                                            : alpha(t.palette.primary.main, 0.12),
                                    borderBottom: (t) =>
                                        `1px solid ${alpha(t.palette.divider, 0.8)}`,
                                }}
                            >
                                TASKS
                            </Box>

                            {isEmpty ? (
                                <Box
                                    sx={{
                                        p: 3,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1,
                                    }}
                                >
                                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                                        No tasks to display on the timeline.
                                    </Typography>
                                    <Button
                                        variant="outlined"
                                        size="small"
                                        onClick={() =>
                                            router.visit(route('tasks.index', project.id))
                                        }
                                        sx={{ textTransform: 'none', alignSelf: 'start' }}
                                    >
                                        Go to Board
                                    </Button>
                                </Box>
                            ) : (
                                <Box sx={{ position: 'relative', flex: 1, overflow: 'hidden' }}>
                                    {sortedTasks.map((task, index) => (
                                        <Box
                                            key={task.id}
                                            sx={{
                                                height: ROW_HEIGHT,
                                                px: 2,
                                                display: 'flex',
                                                alignItems: 'center',
                                                borderBottom: (t) =>
                                                    `1px solid ${alpha(t.palette.divider, 0.5)}`,
                                                background:
                                                    index % 2 === 0
                                                        ? alpha(
                                                            theme.palette.background.paper,
                                                            0.45
                                                        )
                                                        : 'transparent',
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 10,
                                                    height: 10,
                                                    borderRadius: '50%',
                                                    backgroundColor:
                                                        statusColors[task.status] ||
                                                        statusColors.todo,
                                                    mr: 1,
                                                    flexShrink: 0,
                                                }}
                                            />
                                            <Tooltip
                                                title={
                                                    task._hasEndDate
                                                        ? `${task.title} • ${formatDay(task._start)} → ${formatDay(task._end)} • ${task._days} day${task._days > 1 ? 's' : ''}`
                                                        : `${task.title} • Missing due date`
                                                }
                                                arrow
                                            >
                                                <Typography
                                                    variant="body2"
                                                    noWrap
                                                    sx={{
                                                        fontWeight: 600,
                                                        color: task._hasEndDate
                                                            ? undefined
                                                            : '#DC2626',
                                                    }}
                                                >
                                                    {task.title}
                                                    {!task._hasEndDate && (
                                                        <span style={{ marginLeft: 6 }}>⚠️</span>
                                                    )}
                                                </Typography>
                                            </Tooltip>
                                        </Box>
                                    ))}
                                </Box>
                            )}
                        </Box>

                        {/* Timeline scroller */}
                        <Box
                            ref={scrollRef}
                            sx={{
                                position: 'relative',
                                flex: 1,
                                overflow: 'auto',
                            }}
                        >
                            {/* Sticky header with months */}
                            <Box
                                sx={{
                                    position: 'sticky',
                                    top: 0,
                                    zIndex: 5,
                                    height: HEADER_HEIGHT,
                                    background:
                                        theme.palette.mode === 'light'
                                            ? alpha('#FFFFFF', 0.9)
                                            : alpha('#0B1220', 0.8),
                                    backdropFilter: 'blur(6px)',
                                    borderBottom: (t) =>
                                        `1px solid ${alpha(t.palette.divider, 0.8)}`,
                                }}
                            >
                                {/* Month blocks */}
                                <Box sx={{ position: 'relative', height: '100%' }}>
                                    {monthColumns.map((m, i) => {
                                        const x = getXPosition(m.start);
                                        const width =
                                            (daysBetween(m.start, m.end) + 1) * pixelsPerDay;
                                        return (
                                            <Box
                                                key={`${m.label}-${i}`}
                                                sx={{
                                                    position: 'absolute',
                                                    left: x,
                                                    width,
                                                    height: '100%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    pl: 1,
                                                    borderRight: (t) =>
                                                        `1px solid ${alpha(t.palette.divider, 0.6)}`,
                                                    background:
                                                        i % 2 === 0
                                                            ? alpha(
                                                                theme.palette.primary.main,
                                                                0.02
                                                            )
                                                            : 'transparent',
                                                }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: 800,
                                                        letterSpacing: 0.3,
                                                        color: (t) =>
                                                            alpha(t.palette.text.primary, 0.9),
                                                        textTransform: 'uppercase',
                                                        fontSize: 12,
                                                    }}
                                                >
                                                    {m.label}
                                                </Typography>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            </Box>

                            {/* Grid & content */}
                            <Box
                                sx={{
                                    position: 'relative',
                                    minWidth: totalTimelineDays * pixelsPerDay,
                                }}
                            >
                                {/* Weekly vertical grid lines */}
                                {weekLines.map((line, idx) => {
                                    const left = line.dayOffset * pixelsPerDay;
                                    const isStart = line.dayOffset === 0;
                                    return (
                                        <Box
                                            key={`week-${idx}`}
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                bottom: 0,
                                                left,
                                                width: 0,
                                                borderLeft: (t) =>
                                                    `${isStart ? 2 : 1}px dashed ${isStart
                                                        ? alpha(t.palette.primary.main, 0.5)
                                                        : alpha(t.palette.divider, 0.5)
                                                    }`,
                                                pointerEvents: 'none',
                                            }}
                                        />
                                    );
                                })}

                                {/* Today marker */}
                                {isTodayInRange && (
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            top: 0,
                                            bottom: 0,
                                            left: getXPosition(today),
                                            width: 0,
                                            borderLeft: `2px solid ${alpha('#DC2626', 0.9)}`,
                                            zIndex: 4,
                                            pointerEvents: 'none',
                                        }}
                                    />
                                )}

                                {/* Background alternating rows */}
                                {sortedTasks.map((task, idx) => (
                                    <Box
                                        key={`bg-${task.id}`}
                                        sx={{
                                            position: 'absolute',
                                            left: 0,
                                            right: 0,
                                            top: HEADER_HEIGHT + idx * ROW_HEIGHT,
                                            height: ROW_HEIGHT,
                                            background:
                                                idx % 2 === 0
                                                    ? alpha(theme.palette.primary.main, 0.015)
                                                    : 'transparent',
                                        }}
                                    />
                                ))}

                                {/* Task bars */}
                                <Box sx={{ position: 'relative', mt: `${HEADER_HEIGHT}px` }}>
                                    {sortedTasks.map((task, idx) => {
                                        const startX = getXPosition(task._start);
                                        const width = Math.max(
                                            MIN_BAR_WIDTH,
                                            task._days * pixelsPerDay
                                        );
                                        const top =
                                            idx * ROW_HEIGHT + (ROW_HEIGHT - BAR_HEIGHT) / 2;

                                        if (task._isMilestone) {
                                            const diamondX = getXPosition(task._end) - 8;
                                            return (
                                                <Tooltip
                                                    key={task.id}
                                                    title={`${task.title} (Milestone) — ${formatDay(task._end)}`}
                                                    arrow
                                                >
                                                    <Box
                                                        sx={{
                                                            position: 'absolute',
                                                            left: diamondX,
                                                            top,
                                                            width: 16,
                                                            height: 16,
                                                            transform: 'rotate(45deg)',
                                                            background: '#DC2626',
                                                            border: '2px solid #fff',
                                                            boxShadow:
                                                                '0 4px 12px rgba(220,38,38,0.35)',
                                                            cursor: 'default',
                                                        }}
                                                    />
                                                </Tooltip>
                                            );
                                        }

                                        const color =
                                            statusColors[task.status] || statusColors.todo;

                                        return (
                                            <Tooltip
                                                key={task.id}
                                                arrow
                                                title={`${task.title} • ${formatDay(task._start)} → ${formatDay(
                                                    task._end
                                                )} • ${task._days} day${task._days > 1 ? 's' : ''} • ${task.status}`}
                                            >
                                                <Box
                                                    onDoubleClick={() =>
                                                        router.visit(
                                                            route('tasks.index', project.id)
                                                        )
                                                    }
                                                    sx={{
                                                        position: 'absolute',
                                                        left: startX,
                                                        top,
                                                        width,
                                                        height: BAR_HEIGHT,
                                                        background: `linear-gradient(90deg, ${alpha(color, 0.95)}, ${alpha(
                                                            color,
                                                            0.82
                                                        )})`,
                                                        borderRadius: 10,
                                                        border: (t) =>
                                                            `1px solid ${alpha('#000', 0.08)}`,
                                                        boxShadow: `0 6px 16px ${alpha(color, 0.38)}`,
                                                        cursor: 'pointer',
                                                        transition:
                                                            'transform .18s ease, box-shadow .18s ease',
                                                        '&:hover': {
                                                            transform: 'translateY(-2px)',
                                                            boxShadow: `0 10px 24px ${alpha(color, 0.5)}`,
                                                        },
                                                    }}
                                                />
                                            </Tooltip>
                                        );
                                    })}
                                </Box>
                            </Box>
                        </Box>
                    </Paper>
                </Box>

                {/* Footer tip */}
                <Box sx={{ px: { xs: 1.5, md: 3 }, pb: 2, pt: 0.5, opacity: 0.7 }}>
                    <Typography variant="caption">
                        Tip: Use the Zoom controls to change scale. Double-click a bar to jump back
                        to the board.
                    </Typography>
                </Box>
            </Box>
        </>
    );
}
