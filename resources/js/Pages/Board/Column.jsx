// resources/js/Pages/Board/Column.jsx
import React from 'react';
import {
    alpha,
    Box,
    Button,
    Chip,
    Paper,
    Stack,
    Typography,
    useTheme,
    Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import PlaceRoundedIcon from '@mui/icons-material/PlaceRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import BusinessRoundedIcon from '@mui/icons-material/BusinessRounded';
import LocalAtmRoundedIcon from '@mui/icons-material/LocalAtmRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import InfoRoundedIcon from '@mui/icons-material/InfoRounded';
import KeyRoundedIcon from '@mui/icons-material/KeyRounded';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import { Droppable, Draggable } from 'react-beautiful-dnd';
import { STATUS_META as KANBAN_STATUS_META } from '../Board/meta.jsx';

/**
 * Column — compact version
 *  - Honors CSS vars: --col-w (width) and --col-gap (gap)
 *  - Adds scroll-snap for buttery horizontal scrolling
 *  - Accepts `statusMeta` to adapt visuals across methodologies
 */
export default function Column({
    statusKey,
    tasks = [],
    onAddTask,
    renderTaskCard,
    project,
    showProjectSummary,
    statusMeta,
}) {
    const theme = useTheme();
    const humanize = (k) =>
        String(k || '')
            .replace(/[_-]+/g, ' ')
            .replace(/\b\w/g, (m) => m.toUpperCase());

    const SOURCE_META = statusMeta || KANBAN_STATUS_META;

    const metaConf = SOURCE_META?.[statusKey] || {
        title: humanize(statusKey),
        accent: '#999',
        gradient: 'linear-gradient(135deg,#fff,#f7f7f7)',
        iconBg: 'linear-gradient(145deg,#bbb,#999)',
        iconEl: null,
    };

    const shouldShowSummary =
        typeof showProjectSummary === 'boolean' ? showProjectSummary : statusKey === 'todo';

    const Header = () => (
        <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{
                p: 0.75,
                pr: 0.9,
                mb: 0.5,
                borderRadius: 2,
                background: 'linear-gradient(135deg, rgba(255,255,255,.65), rgba(255,255,255,.35))',
                backdropFilter: 'blur(6px)',
                border: `1px solid ${alpha(metaConf.accent, 0.25)}`,
                position: 'sticky',
                top: 0,
                zIndex: 3,
            }}
        >
            <Stack direction="row" alignItems="center" spacing={0.75}>
                <Box
                    sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        background: metaConf.iconBg,
                        color: '#fff',
                        boxShadow: `0 2px 5px -2px ${alpha(metaConf.accent, 0.6)}, 0 0 0 2px ${alpha(metaConf.accent, 0.25)} inset`,
                        fontSize: 14,
                    }}
                >
                    {metaConf.iconEl}
                </Box>
                <Typography
                    variant="subtitle2"
                    sx={{
                        fontWeight: 800,
                        letterSpacing: 0.3,
                        textTransform: 'uppercase',
                        fontSize: 11.5,
                        color: alpha(theme.palette.text.primary, 0.82),
                    }}
                >
                    {metaConf.title}
                </Typography>
            </Stack>
            <Chip
                label={tasks.length}
                size="small"
                sx={{
                    fontWeight: 700,
                    fontSize: 11,
                    height: 22,
                    color: alpha(theme.palette.text.primary, 0.85),
                    background: alpha(metaConf.accent, 0.14),
                    '& .MuiChip-label': { px: 0.75 },
                    px: 0.4,
                }}
            />
        </Stack>
    );

    const Empty = () => (
        <Box
            sx={{
                flexGrow: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: `1.25px dashed ${alpha(metaConf.accent, 0.35)}`,
                borderRadius: 2,
                color: alpha(theme.palette.text.primary, 0.6),
                fontSize: 12.5,
                fontWeight: 500,
                p: 1.25,
                textAlign: 'center',
                background: alpha(metaConf.accent, 0.06),
            }}
        >
            No {metaConf.title} tasks
        </Box>
    );

    const ProjectSummary = ({ project }) => {
        if (!project) return null;
        const m = project.meta || {};
        const chips = [
            {
                icon: <KeyRoundedIcon fontSize="small" />,
                label: project.key || 'No key',
                show: true,
            },
            {
                icon: <CategoryRoundedIcon fontSize="small" />,
                label: [m.project_type, m.domain].filter(Boolean).join(' · '),
                show: m.project_type || m.domain,
            },
            {
                icon: <PlaceRoundedIcon fontSize="small" />,
                label: [m.area, m.location].filter(Boolean).join(' · '),
                show: m.area || m.location,
            },
            {
                icon: <GroupsRoundedIcon fontSize="small" />,
                label: m.team_size ? `${m.team_size} members` : null,
                show: !!m.team_size,
            },
            {
                icon: <LocalAtmRoundedIcon fontSize="small" />,
                label: m.budget ? `${m.budget}` : null,
                show: !!m.budget,
            },
            {
                icon: <BusinessRoundedIcon fontSize="small" />,
                label: m.primary_stakeholder || null,
                show: !!m.primary_stakeholder,
            },
            {
                icon: <CalendarMonthRoundedIcon fontSize="small" />,
                label:
                    project.start_date || project.end_date
                        ? `${project.start_date || '—'} → ${project.end_date || '—'}`
                        : null,
                show: project.start_date || project.end_date,
            },
        ].filter((c) => c.show && c.label);

        const soft = alpha(theme.palette.primary.main, 0.07);
        const border = alpha(theme.palette.primary.main, 0.2);

        return (
            <Paper
                elevation={0}
                sx={{
                    mb: 0.75,
                    borderRadius: 2,
                    p: 1,
                    background:
                        'linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.6))',
                    border: `1px solid ${border}`,
                    boxShadow: `0 10px 22px -18px rgba(0,0,0,.35)`,
                }}
            >
                <Stack spacing={0.75}>
                    <Typography
                        variant="subtitle2"
                        sx={{
                            fontWeight: 800,
                            letterSpacing: 0.1,
                            color: alpha(theme.palette.text.primary, 0.92),
                            lineHeight: 1.25,
                        }}
                    >
                        {project.name}
                    </Typography>

                    {chips.length > 0 && (
                        <Stack direction="row" spacing={0.6} flexWrap="wrap" rowGap={0.6}>
                            {chips.map((c, i) => (
                                <Chip
                                    key={i}
                                    icon={c.icon}
                                    label={c.label}
                                    size="small"
                                    sx={{
                                        bgcolor: soft,
                                        border: `1px solid ${border}`,
                                        '& .MuiChip-label': { fontWeight: 600 },
                                        height: 24,
                                    }}
                                />
                            ))}
                        </Stack>
                    )}

                    {(m.objectives || m.constraints) && (
                        <Stack spacing={0.4}>
                            {m.objectives && (
                                <Stack direction="row" spacing={0.5} alignItems="flex-start">
                                    <FlagRoundedIcon
                                        fontSize="small"
                                        sx={{
                                            mt: '2px',
                                            color: alpha(theme.palette.success.main, 0.9),
                                        }}
                                    />
                                    <Tooltip title={m.objectives} arrow placement="top">
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: alpha(theme.palette.text.primary, 0.8),
                                                maxHeight: 40,
                                                overflow: 'hidden',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                            }}
                                        >
                                            {m.objectives}
                                        </Typography>
                                    </Tooltip>
                                </Stack>
                            )}
                            {m.constraints && (
                                <Stack direction="row" spacing={0.5} alignItems="flex-start">
                                    <InfoRoundedIcon
                                        fontSize="small"
                                        sx={{
                                            mt: '2px',
                                            color: alpha(theme.palette.warning.main, 0.9),
                                        }}
                                    />
                                    <Tooltip title={m.constraints} arrow placement="top">
                                        <Typography
                                            variant="body2"
                                            sx={{
                                                color: alpha(theme.palette.text.primary, 0.75),
                                                maxHeight: 40,
                                                overflow: 'hidden',
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                            }}
                                        >
                                            {m.constraints}
                                        </Typography>
                                    </Tooltip>
                                </Stack>
                            )}
                        </Stack>
                    )}
                </Stack>
            </Paper>
        );
    };

    return (
        <Droppable droppableId={statusKey}>
            {(dropProvided, snapshot) => {
                const isOver = snapshot.isDraggingOver;
                return (
                    <Paper
                        ref={dropProvided.innerRef}
                        {...dropProvided.droppableProps}
                        elevation={0}
                        sx={{
                            flex: '0 0 var(--col-w)',
                            width: 'var(--col-w)',
                            minWidth: 'var(--col-w)',
                            maxWidth: 'var(--col-w)',
                            scrollSnapAlign: 'start',
                            display: 'flex',
                            flexDirection: 'column',
                            borderRadius: 3,
                            position: 'relative',
                            p: 0.9,
                            background: metaConf.gradient,
                            border: `1px solid ${alpha(metaConf.accent, 0.35)}`,
                            boxShadow: isOver
                                ? `0 0 0 2px ${alpha(metaConf.accent, 0.5)} inset, 0 6px 16px -10px ${alpha(metaConf.accent, 0.45)}`
                                : '0 2px 8px -6px rgba(0,0,0,.18)',
                            transition: 'box-shadow .25s, transform .25s',
                            transform: isOver ? 'translateY(-1px)' : 'none',
                            minHeight: 480,
                            overflow: 'hidden',
                            '&:before': {
                                content: '""',
                                pointerEvents: 'none',
                                position: 'absolute',
                                inset: 0,
                                borderRadius: 3,
                                background: `linear-gradient(180deg, ${alpha('#fff', 0.55)} 0%, transparent 60%)`,
                                mixBlendMode: 'overlay',
                                opacity: 0.45,
                            },
                        }}
                    >
                        {shouldShowSummary && project && <ProjectSummary project={project} />}

                        <Header />

                        <Stack
                            spacing={0.9}
                            sx={{
                                flexGrow: 1,
                                overflowY: 'auto',
                                pr: 0.25,
                                pb: 0.6,
                                '&::-webkit-scrollbar': { width: 6 },
                                '&::-webkit-scrollbar-thumb': {
                                    borderRadius: 6,
                                    backgroundColor: alpha(metaConf.accent, 0.45),
                                },
                            }}
                        >
                            {tasks.length === 0 && <Empty />}
                            {tasks.map((task, idx) => (
                                <Draggable key={task.id} draggableId={String(task.id)} index={idx}>
                                    {(dragProvided, dragSnapshot) => (
                                        <div
                                            ref={dragProvided.innerRef}
                                            {...dragProvided.draggableProps}
                                            {...dragProvided.dragHandleProps}
                                            style={dragProvided.draggableProps.style}
                                        >
                                            {renderTaskCard(task, dragSnapshot)}
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {dropProvided.placeholder}
                        </Stack>

                        <Box
                            sx={{
                                pt: 0.6,
                                mt: 0.35,
                                borderTop: `1px dashed ${alpha(metaConf.accent, 0.4)}`,
                            }}
                        >
                            <Button
                                size="small"
                                variant="text"
                                onClick={() => onAddTask(statusKey)}
                                sx={{
                                    textTransform: 'none',
                                    fontSize: 12.5,
                                    fontWeight: 600,
                                    letterSpacing: 0.2,
                                    color: metaConf.accent,
                                    minHeight: 28,
                                    px: 0.5,
                                    '&:hover': { background: alpha(metaConf.accent, 0.08) },
                                }}
                                startIcon={<AddIcon fontSize="small" />}
                            >
                                Add Task
                            </Button>
                        </Box>
                    </Paper>
                );
            }}
        </Droppable>
    );
}
