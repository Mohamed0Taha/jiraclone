// resources/js/Pages/ProjectAccordion.jsx
import React, { useMemo } from 'react';
import { router } from '@inertiajs/react';
import {
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Box,
    Button,
    Chip,
    IconButton,
    Stack,
    Typography,
    Tooltip,
    alpha,
    LinearProgress,
    useTheme,
} from '@mui/material';
import ExpandMoreRoundedIcon from '@mui/icons-material/ExpandMoreRounded';
import DeleteRoundedIcon from '@mui/icons-material/DeleteRounded';
import EditRoundedIcon from '@mui/icons-material/EditRounded';

/* Match the Board.jsx STATUS_META (keep in sync!) */
import LightbulbOutlinedIcon from '@mui/icons-material/LightbulbOutlined';
import RocketLaunchRoundedIcon from '@mui/icons-material/RocketLaunchRounded';
import RateReviewRoundedIcon from '@mui/icons-material/RateReviewRounded';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';

/**
 * Consider extracting STATUS_META + ORDER to a shared file
 * (e.g. resources/js/config/statuses.js) to avoid duplication.
 */
const STATUS_META = {
    todo: {
        title: 'To Do',
        accent: '#FFA432',
        gradient: 'linear-gradient(135deg,#FFF8EC 0%,#FFE2BC 100%)',
        iconBg: 'linear-gradient(145deg,#FFD088,#FFAE45)',
        icon: <LightbulbOutlinedIcon sx={{ fontSize: 15 }} />,
    },
    inprogress: {
        title: 'In Progress',
        accent: '#2C8DFF',
        gradient: 'linear-gradient(135deg,#F1F8FF 0%,#CFE5FF 100%)',
        iconBg: 'linear-gradient(145deg,#77B6FF,#3B8DFF)',
        icon: <RocketLaunchRoundedIcon sx={{ fontSize: 15 }} />,
    },
    review: {
        title: 'Review',
        accent: '#9C4DFF',
        gradient: 'linear-gradient(135deg,#F9F3FF 0%,#E3D2FF 100%)',
        iconBg: 'linear-gradient(145deg,#C39BFF,#9C4DFF)',
        icon: <RateReviewRoundedIcon sx={{ fontSize: 15 }} />,
    },
    done: {
        title: 'Done',
        accent: '#22B36B',
        gradient: 'linear-gradient(135deg,#F2FFF5 0%,#CDEFD8 100%)',
        iconBg: 'linear-gradient(145deg,#5FD598,#22B36B)',
        icon: <CheckCircleRoundedIcon sx={{ fontSize: 15 }} />,
    },
};

const ORDER = ['todo', 'inprogress', 'review', 'done'];

export default function ProjectAccordion({ project, ownership, rowSx = {}, onDelete, endActions }) {
    const theme = useTheme();

    // Determine ownership colors
    const isOwner = ownership === 'owner';
    const ownershipColor = isOwner ? theme.palette.primary.main : theme.palette.secondary.main;

    /* Normalize tasks */
    const grouped = useMemo(() => {
        const empty = ORDER.reduce((a, s) => ({ ...a, [s]: [] }), {});
        if (project?.tasks && typeof project.tasks === 'object' && !Array.isArray(project.tasks)) {
            const out = { ...empty };
            ORDER.forEach((s) => {
                const arr = project.tasks[s];
                out[s] = Array.isArray(arr) ? arr : [];
            });
            return out;
        }
        if (Array.isArray(project?.tasks)) {
            return project.tasks.reduce((acc, t) => {
                if (t && t.status && acc[t.status]) acc[t.status].push(t);
                return acc;
            }, empty);
        }
        return empty;
    }, [project]);

    const counts = ORDER.reduce((acc, s) => {
        acc[s] = grouped[s].length;
        return acc;
    }, {});
    const total = ORDER.reduce((sum, s) => sum + counts[s], 0);
    const done = counts.done;
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);

    const gotoBoard = (e) => {
        e.stopPropagation();
        router.visit(`/projects/${project.id}/tasks`);
    };

    const gotoEdit = (e) => {
        e.stopPropagation();
        router.visit(`/projects/${project.id}/edit`);
    };

    const StatusPill = ({ status }) => {
        const meta = STATUS_META[status];
        const count = counts[status];
        return (
            <Box
                key={status}
                sx={{
                    position: 'relative',
                    px: 1,
                    pl: 1.05,
                    pr: 1,
                    height: 30,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 0.6,
                    lineHeight: 1,
                    background: alpha(meta.accent, 0.1),
                    border: `1px solid ${alpha(meta.accent, 0.35)}`,
                    boxShadow: `0 1px 2px ${alpha(meta.accent, 0.18)} inset`,
                    flexShrink: 0,
                    transition: 'background-color .25s, border-color .25s, transform .25s',
                    '&:hover': {
                        background: alpha(meta.accent, 0.16),
                        borderColor: alpha(meta.accent, 0.55),
                    },
                }}
            >
                <Box
                    sx={{
                        width: 18,
                        height: 18,
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        background: meta.iconBg,
                        color: '#fff',
                        boxShadow: `0 1px 3px -1px ${alpha(meta.accent, 0.55)}`,
                        fontSize: 11.5,
                    }}
                >
                    {meta.icon}
                </Box>
                <Typography
                    variant="caption"
                    sx={{
                        fontWeight: 600,
                        letterSpacing: 0.4,
                        textTransform: 'uppercase',
                        fontSize: 10.2,
                        color: alpha(theme.palette.text.primary, 0.78),
                        display: 'flex',
                        alignItems: 'center',
                        gap: 0.45,
                        whiteSpace: 'nowrap',
                    }}
                >
                    {meta.title}
                    <Box
                        component="span"
                        sx={{
                            px: 0.55,
                            py: 0.1,
                            ml: 0.15,
                            fontSize: 10.5,
                            lineHeight: 1.1,
                            fontWeight: 600,
                            borderRadius: 1.25,
                            background: alpha(meta.accent, 0.22),
                            color: alpha(theme.palette.text.primary, 0.87),
                        }}
                    >
                        {count}
                    </Box>
                </Typography>
            </Box>
        );
    };

    const TaskChip = ({ t, status }) => {
        const meta = STATUS_META[status];
        return (
            <Chip
                key={t.id}
                label={t.title}
                size="small"
                variant="outlined"
                title={t.title}
                sx={{
                    mr: 0.6,
                    mb: 0.6,
                    borderRadius: 2.5,
                    fontWeight: 500,
                    maxWidth: 190,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    borderColor: alpha(meta.accent, 0.55),
                    color: alpha(theme.palette.text.primary, 0.8),
                    background: alpha(meta.accent, 0.07),
                    '&:hover': {
                        background: alpha(meta.accent, 0.15),
                    },
                }}
            />
        );
    };

    return (
        <Accordion
            disableGutters
            sx={{
                borderRadius: 2, // Reduced border radius
                overflow: 'hidden',
                position: 'relative',
                border: `1px solid ${alpha(theme.palette.divider, 0.12)}`,
                background:
                    theme.palette.mode === 'light'
                        ? `linear-gradient(135deg, 
                        rgba(255,255,255,0.95) 0%, 
                        rgba(255,255,255,0.85) 100%
                      ), 
                      radial-gradient(ellipse at top left, 
                        ${alpha(theme.palette.primary.main, 0.03)} 0%, 
                        transparent 50%
                      )`
                        : `linear-gradient(135deg, 
                        ${alpha(theme.palette.background.paper, 0.95)} 0%, 
                        ${alpha(theme.palette.background.paper, 0.85)} 100%
                      )`,
                backdropFilter: 'blur(20px)',
                boxShadow: `
                    0 4px 12px -3px ${alpha(theme.palette.common.black, 0.08)},
                    0 2px 4px -2px ${alpha(theme.palette.common.black, 0.04)},
                    inset 0 1px 0 ${alpha(theme.palette.common.white, 0.1)}
                `, // Reduced shadow for slimmer look
                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '1px',
                    background: `linear-gradient(90deg, 
                        transparent, 
                        ${alpha(theme.palette.primary.main, 0.4)}, 
                        transparent
                    )`,
                },
                '&:hover': {
                    transform: 'translateY(-2px)', // Reduced hover lift for slimmer appearance
                    boxShadow: `
                        0 8px 20px -4px ${alpha(theme.palette.common.black, 0.12)},
                        0 4px 8px -4px ${alpha(theme.palette.common.black, 0.06)},
                        inset 0 1px 0 ${alpha(theme.palette.common.white, 0.2)},
                        0 0 0 1px ${alpha(theme.palette.primary.main, 0.1)}
                    `,
                    '&::before': {
                        background: `linear-gradient(90deg, 
                            transparent, 
                            ${theme.palette.primary.main}, 
                            transparent
                        )`,
                        height: '2px',
                    },
                },
                '&.Mui-expanded': {
                    '&::before': {
                        background: `linear-gradient(90deg, 
                            ${theme.palette.primary.main}, 
                            ${theme.palette.secondary.main}, 
                            ${theme.palette.primary.main}
                        )`,
                        height: '3px',
                    },
                },
                ...rowSx,
            }}
        >
            <AccordionSummary
                expandIcon={
                    <ExpandMoreRoundedIcon
                        sx={{
                            color: theme.palette.text.secondary,
                            transition: 'all 0.3s ease',
                            '&:hover': {
                                color: theme.palette.primary.main,
                                transform: 'scale(1.1)',
                            },
                        }}
                    />
                }
                sx={{
                    minHeight: 56, // Reduced from 72 to make slimmer
                    px: 3,
                    py: 1.5, // Reduced padding
                    background: `linear-gradient(135deg, 
                        ${alpha(theme.palette.background.default, 0.4)} 0%, 
                        ${alpha(theme.palette.background.default, 0.1)} 100%
                    )`,
                    '& .MuiAccordionSummary-content': {
                        alignItems: 'center',
                        my: 0,
                        gap: 2,
                    },
                    '& .MuiAccordionSummary-expandIconWrapper': {
                        color: theme.palette.text.secondary,
                        '&.Mui-expanded': {
                            color: theme.palette.primary.main,
                        },
                    },
                    '&:hover': {
                        background: `linear-gradient(135deg, 
                            ${alpha(theme.palette.primary.main, 0.04)} 0%, 
                            ${alpha(theme.palette.secondary.main, 0.02)} 100%
                        )`,
                    },
                }}
            >
                {/* Project name interactive element styled like a button (avoid nested button) */}
                <Box
                    role="button"
                    tabIndex={0}
                    onClick={gotoBoard}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            gotoBoard(e);
                        }
                    }}
                    sx={{
                        px: 0.75,
                        py: 0.75,
                        cursor: 'pointer',
                        textTransform: 'none',
                        fontWeight: 800,
                        fontSize: 16,
                        color: 'text.primary',
                        borderRadius: 1.5,
                        maxWidth: { xs: 180, sm: 260, md: 360 },
                        display: 'flex',
                        alignItems: 'center',
                        '&:hover': {
                            backgroundColor: alpha(theme.palette.primary.main, 0.08),
                            color: 'text.primary',
                        },
                        '&:focus-visible': {
                            outline: `2px solid ${alpha(theme.palette.primary.main, 0.35)}`,
                            outlineOffset: 2,
                        },
                    }}
                >
                    <Typography
                        component="span"
                        noWrap
                        sx={{ fontSize: 'inherit', fontWeight: 'inherit' }}
                    >
                        {project.name}
                    </Typography>
                    <Chip
                        size="small"
                        label={isOwner ? 'OWNER' : 'COLLABORATOR'}
                        sx={{
                            ml: 1.5,
                            height: 20,
                            fontWeight: 700,
                            fontSize: '0.65rem',
                            letterSpacing: '0.05em',
                            background: alpha(ownershipColor, 0.12),
                            color: ownershipColor,
                            border: `1px solid ${alpha(ownershipColor, 0.25)}`,
                            '& .MuiChip-label': {
                                px: 1,
                            },
                        }}
                    />
                </Box>

                <Stack
                    direction="row"
                    spacing={1.1}
                    sx={{
                        ml: 'auto',
                        mr: 1.5,
                        flexWrap: 'nowrap',
                        overflow: 'hidden',
                        alignItems: 'center',
                        maxWidth: { xs: '55%', sm: '60%', md: '65%' },
                        justifyContent: 'flex-end',
                    }}
                >
                    {ORDER.map((s) => (
                        <StatusPill key={s} status={s} />
                    ))}
                </Stack>

                {endActions ? (
                    <Box
                        onClick={(e) => e.stopPropagation()}
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                    >
                        {endActions}
                    </Box>
                ) : (
                    <Box
                        onClick={(e) => e.stopPropagation()}
                        sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}
                    >
                        <Tooltip title="Edit project" arrow>
                            <Box
                                component="div"
                                role="button"
                                tabIndex={0}
                                onClick={gotoEdit}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        gotoEdit(e);
                                    }
                                }}
                                aria-label={`Edit project ${project.name}`}
                                sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: alpha('#243A63', 0.7),
                                    '&:hover': { 
                                        color: alpha('#243A63', 0.95),
                                        backgroundColor: alpha('#243A63', 0.08),
                                    },
                                    '&:focus-visible': {
                                        outline: `2px solid ${alpha('#243A63', 0.35)}`,
                                        outlineOffset: 1,
                                    },
                                }}
                            >
                                <EditRoundedIcon fontSize="small" />
                            </Box>
                        </Tooltip>

                        <Tooltip title="Delete project" arrow>
                            <Box
                                component="div"
                                role="button"
                                tabIndex={0}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete?.(e, project);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        onDelete?.(e, project);
                                    }
                                }}
                                aria-label={`Delete project ${project.name}`}
                                sx={{
                                    width: 32,
                                    height: 32,
                                    borderRadius: 1,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer',
                                    color: alpha('#243A63', 0.7),
                                    '&:hover': { 
                                        color: alpha('#243A63', 0.95),
                                        backgroundColor: alpha('#243A63', 0.08),
                                    },
                                    '&:focus-visible': {
                                        outline: `2px solid ${alpha('#243A63', 0.35)}`,
                                        outlineOffset: 1,
                                    },
                                }}
                            >
                                <DeleteRoundedIcon fontSize="small" />
                            </Box>
                        </Tooltip>
                    </Box>
                )}
            </AccordionSummary>

            <AccordionDetails
                sx={{
                    bgcolor: 'transparent',
                    px: 2,
                    pt: 1.25,
                    pb: 2.2,
                    borderTop: `1px solid ${alpha('#2C3E55', 0.1)}`,
                    position: 'relative',
                    '&:before': {
                        content: '""',
                        position: 'absolute',
                        inset: 0,
                        pointerEvents: 'none',
                        background:
                            'linear-gradient(180deg,rgba(255,255,255,0.6),rgba(255,255,255,0.2))',
                        opacity: 0.5,
                    },
                }}
            >
                {project.description && (
                    <Typography
                        variant="body2"
                        sx={{
                            color: alpha(theme.palette.text.primary, 0.75),
                            mb: 1.4,
                            whiteSpace: 'pre-line',
                            fontWeight: 400,
                        }}
                    >
                        {project.description}
                    </Typography>
                )}

                <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1 }}>
                    <Typography
                        variant="caption"
                        fontWeight={700}
                        sx={{
                            letterSpacing: 0.6,
                            textTransform: 'uppercase',
                            fontSize: 11,
                            color: alpha(theme.palette.text.primary, 0.65),
                        }}
                    >
                        Progress
                    </Typography>
                    <Box sx={{ flexGrow: 1 }}>
                        <LinearProgress
                            variant="determinate"
                            value={pct}
                            sx={{
                                height: 8,
                                borderRadius: 10,
                                background: alpha('#1F3A60', 0.12),
                                '& .MuiLinearProgress-bar': {
                                    borderRadius: 10,
                                    background:
                                        'linear-gradient(90deg,#5FD598 0%,#22B36B 60%,#189455)',
                                    boxShadow: '0 0 6px -1px rgba(34,179,107,.6)',
                                },
                            }}
                        />
                    </Box>
                    <Chip
                        label={`${pct}%`}
                        size="small"
                        sx={{
                            fontWeight: 600,
                            height: 24,
                            background: alpha('#22B36B', 0.12),
                            border: `1px solid ${alpha('#22B36B', 0.4)}`,
                            color: alpha(theme.palette.text.primary, 0.8),
                        }}
                    />
                </Stack>

                <Typography
                    variant="caption"
                    fontWeight={700}
                    sx={{
                        letterSpacing: 0.6,
                        textTransform: 'uppercase',
                        fontSize: 11,
                        color: alpha(theme.palette.text.primary, 0.55),
                    }}
                >
                    Tasks ({total})
                </Typography>

                <Box
                    sx={{
                        mt: 0.8,
                        display: 'flex',
                        flexWrap: 'wrap',
                        maxHeight: 170,
                        overflowY: 'auto',
                        pr: 0.5,
                        '&::-webkit-scrollbar': { width: 7 },
                        '&::-webkit-scrollbar-thumb': {
                            borderRadius: 6,
                            backgroundColor: alpha('#1F3A60', 0.35),
                        },
                    }}
                >
                    {total === 0 && (
                        <Chip
                            label="No tasks yet"
                            size="small"
                            variant="outlined"
                            sx={{
                                fontStyle: 'italic',
                                borderRadius: 2,
                                borderColor: alpha('#1F3A60', 0.35),
                            }}
                        />
                    )}
                    {ORDER.map((s) =>
                        grouped[s].map((t) => <TaskChip key={t.id} t={t} status={s} />)
                    )}
                </Box>
            </AccordionDetails>
        </Accordion>
    );
}
