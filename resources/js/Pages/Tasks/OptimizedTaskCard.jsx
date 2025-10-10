import React, { useState, memo, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Card,
    CardContent,
    Box,
    Typography,
    IconButton,
    Tooltip,
    Stack,
    Chip,
    useTheme,
    Skeleton,
    Badge,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import VisibilityIcon from '@mui/icons-material/Visibility';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import ArrowRightAltRoundedIcon from '@mui/icons-material/ArrowRightAltRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import CommentIcon from '@mui/icons-material/Comment';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import ImageIcon from '@mui/icons-material/Image';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import SyncIcon from '@mui/icons-material/Sync';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import SubdirectoryArrowRightIcon from '@mui/icons-material/SubdirectoryArrowRight';
import ImageModal from '@/Components/ImageModal';
import { LazyImage, LazyBackground } from '@/hooks/useLazyAssets.jsx';

/**
 * OptimizedTaskCard - High Performance Task Card Component
 * - Lazy loading for images and assets
 * - Memoization for performance
 * - Optimistic update indicators
 * - Efficient re-rendering
 */
const OptimizedTaskCard = memo(
    ({
        task,
        onEdit,
        onDelete,
        onClick,
        onImageUpload,
        accent,
        isPending = false,
        isUpdating = false,
        lazy = true,
        projectId,
        onDuplicateClick,
        onParentClick,
        onAddSubTask,
    }) => {
        const { t } = useTranslation();
        const theme = useTheme();
        const defaultAccent = theme.palette.primary.main;
        const [imageModalOpen, setImageModalOpen] = useState(false);
        const [imageLoading, setImageLoading] = useState(false);
        const [visible, setVisible] = useState(false);
        const cardRef = useRef(null);

        // Intersection observer for visibility
        useEffect(() => {
            if (!lazy || !cardRef.current) return;

            const observer = new IntersectionObserver(
                ([entry]) => {
                    if (entry.isIntersecting) {
                        setVisible(true);
                        observer.disconnect();
                    }
                },
                { rootMargin: '100px' }
            );

            observer.observe(cardRef.current);

            return () => observer.disconnect();
        }, [lazy]);

        const stop = (e) => {
            e.preventDefault();
            e.stopPropagation();
        };

        const parseDate = (v) => {
            if (!v) return null;
            const d = new Date(v);
            return Number.isNaN(d.getTime()) ? null : d;
        };

        const fmt = (v) => {
            const d = typeof v === 'string' ? parseDate(v) : v;
            if (!d) return '—';
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        };

        const getPriorityColor = (priority) => {
            switch (priority) {
                case 'urgent':
                    return theme.palette.error.main;
                case 'high':
                    return theme.palette.warning.main;
                case 'medium':
                    return theme.palette.info.main;
                case 'low':
                    return theme.palette.success.main;
                default:
                    return theme.palette.info.main;
            }
        };

        const getPriorityLabel = (priority) => {
            switch (priority) {
                case 'urgent':
                    return 'Urgent';
                case 'high':
                    return 'High';
                case 'medium':
                    return 'Medium';
                case 'low':
                    return 'Low';
                default:
                    return 'Medium';
            }
        };

        const start = parseDate(task?.start_date);
        const end = parseDate(task?.end_date);
        const now = new Date();

        // Normalized (midnight) copies so we don't mutate original Date objects
        const normalize = (d) => (d ? new Date(d.getFullYear(), d.getMonth(), d.getDate()) : null);
        const startMid = normalize(start);
        const endMid = normalize(end);
        const nowMid = normalize(now);

        let progress = null; // 0–100 (capped) percent of scheduled time elapsed
        let rawElapsedPct = null; // uncapped percent (can exceed 100)
        if (startMid && endMid && endMid > startMid) {
            const totalMs = endMid.getTime() - startMid.getTime();
            const elapsedMs = Math.max(0, nowMid.getTime() - startMid.getTime());
            rawElapsedPct = (elapsedMs / totalMs) * 100;
            progress = Math.min(100, rawElapsedPct);
        }

        const isOverdue = task.status !== 'done' && endMid && nowMid && nowMid > endMid;

        const showDateRow = start || end;
        const showProgress = typeof progress === 'number';

        const cardAccent = accent || defaultAccent;

        // Derived counts/flags used for chips
        const commentsCount = Number(task?.comments_count || 0);
        const attachmentsCount = Number(task?.attachments_count || 0);
        const subCount = Array.isArray(task?.children) ? task.children.length : 0;
        const hasSubs = !!task?.has_sub_tasks || subCount > 0;

        // Render skeleton if not visible yet (for lazy loading)
        if (lazy && !visible) {
            return (
                <Card
                    ref={cardRef}
                    sx={{
                        mb: 1.5,
                        borderRadius: 2,
                        boxShadow: theme.shadows[1],
                        minHeight: '120px',
                    }}
                >
                    <CardContent sx={{ p: 2 }}>
                        <Stack spacing={1}>
                            <Skeleton variant="text" width="60%" height={20} />
                            <Skeleton variant="text" width="100%" height={16} />
                            <Skeleton variant="text" width="80%" height={16} />
                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                <Skeleton variant="circular" width={24} height={24} />
                                <Skeleton variant="circular" width={24} height={24} />
                                <Skeleton variant="circular" width={24} height={24} />
                            </Box>
                        </Stack>
                    </CardContent>
                </Card>
            );
        }

        return (
            <>
                <Card
                    ref={cardRef}
                    onClick={onClick}
                    sx={{
                        mb: 1.5,
                        borderRadius: 3,
                        cursor: 'pointer',
                        position: 'relative',
                        boxShadow: isPending
                            ? `0 0 0 2px ${alpha(cardAccent, 0.35)}`
                            : theme.shadows[1],
                        background:
                            theme.palette.mode === 'dark'
                                ? `linear-gradient(135deg, ${alpha(cardAccent, 0.08)}, ${alpha('#0f172a', 0.9)})`
                                : `linear-gradient(135deg, ${alpha(cardAccent, 0.06)}, ${alpha('#fff', 0.8)})`,
                        backdropFilter: 'blur(2px)',
                        overflow: 'hidden',
                        border: `1px solid ${alpha(cardAccent, 0.15)}`,
                        transition: 'box-shadow .25s, transform .25s, background .4s',
                        '&:before': {
                            content: '""',
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            bottom: 0,
                            width: 5,
                            background: isOverdue
                                ? theme.palette.error.main
                                : `linear-gradient(180deg, ${cardAccent}, ${alpha(cardAccent, 0.4)})`,
                        },
                        '&:hover': {
                            boxShadow: theme.shadows[6],
                            transform: isPending ? 'translateY(0)' : 'translateY(-3px)',
                        },
                        opacity: isPending ? 0.85 : 1,
                    }}
                >
                    {/* Thin top progress bar when pending/updating */}
                    {(isPending || isUpdating) && (
                        <Box
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                height: 3,
                                width: '100%',
                                background: alpha(cardAccent, 0.15),
                                overflow: 'hidden',
                                '&:after': {
                                    content: '""',
                                    position: 'absolute',
                                    inset: 0,
                                    background: `linear-gradient(90deg, transparent, ${cardAccent}, transparent)`,
                                    animation: 'shimmer 1.15s linear infinite',
                                },
                            }}
                        />
                    )}

                    {/* Cover Image */}
                    {task.cover_image && (
                        <LazyBackground
                            src={task.cover_image}
                            style={{
                                height: 120,
                                backgroundSize: 'cover',
                                backgroundPosition: 'center',
                                position: 'relative',
                            }}
                        >
                            <Box
                                sx={{
                                    position: 'absolute',
                                    top: 0,
                                    right: 0,
                                    p: 1,
                                    display: 'flex',
                                    gap: 0.5,
                                }}
                                onClick={stop}
                            >
                                <IconButton
                                    size="small"
                                    onClick={() => setImageModalOpen(true)}
                                    sx={{
                                        backgroundColor:
                                            theme.palette.mode === 'dark'
                                                ? 'rgba(17,24,39, 0.9)'
                                                : 'rgba(255, 255, 255, 0.9)',
                                        color: theme.palette.mode === 'dark' ? '#e5e7eb' : undefined,
                                        '&:hover': {
                                            backgroundColor:
                                                theme.palette.mode === 'dark'
                                                    ? 'rgba(17,24,39, 1)'
                                                    : 'rgba(255, 255, 255, 1)',
                                        },
                                    }}
                                >
                                    <VisibilityIcon fontSize="small" />
                                </IconButton>
                            </Box>
                        </LazyBackground>
                    )}

                    <CardContent
                        sx={{
                            p: 2.25,
                            '&:last-child': { pb: 2.25 },
                            minHeight: 210,
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {/* Task ID */}
                        <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 0.5 }}>
                            <Typography
                                variant="caption"
                                sx={{
                                    color: cardAccent,
                                    fontWeight: 700,
                                    letterSpacing: 0.7,
                                    textTransform: 'uppercase',
                                    display: 'block',
                                    fontSize: '0.65rem',
                                }}
                            >
                                #{task.id}
                            </Typography>
                            {isOverdue && (
                                <Chip
                                    label="Overdue"
                                    size="small"
                                    color="error"
                                    sx={{ height: 18, fontSize: '0.55rem', fontWeight: 600 }}
                                />
                            )}
                            {task.milestone && (
                                <Chip
                                    label="Milestone"
                                    size="small"
                                    color="secondary"
                                    sx={{ height: 18, fontSize: '0.55rem' }}
                                />
                            )}
                        </Stack>

                        {/* Title */}
                        <Typography
                            variant="subtitle2"
                            sx={{
                                fontWeight: 600,
                                color: theme.palette.text.primary,
                                mb: 1,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden',
                                lineHeight: 1.3,
                            }}
                        >
                            {task.title}
                        </Typography>

                        {/* Duplicate Indicators */}
                        {task.is_duplicate && (
                            <Box
                                sx={{
                                    mb: 1,
                                    p: 1,
                                    borderRadius: 1,
                                    bgcolor: alpha(theme.palette.warning.main, 0.1),
                                    border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                                    cursor: task.duplicate_of?.id ? 'pointer' : 'default',
                                    '&:hover': task.duplicate_of?.id
                                        ? {
                                            bgcolor: alpha(theme.palette.warning.main, 0.15),
                                        }
                                        : {},
                                }}
                                onClick={(e) => {
                                    if (task.duplicate_of?.id && onDuplicateClick) {
                                        e.stopPropagation();
                                        onDuplicateClick(task.duplicate_of.id);
                                    }
                                }}
                            >
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <ContentCopyIcon
                                        sx={{
                                            fontSize: '1rem',
                                            color: theme.palette.warning.main,
                                        }}
                                    />
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            fontWeight: 600,
                                            color: theme.palette.warning.dark,
                                            textDecoration: task.duplicate_of?.id
                                                ? 'underline'
                                                : 'none',
                                        }}
                                    >
                                        Duplicate of: #{task.duplicate_of?.id || 'Unknown'}
                                    </Typography>
                                </Stack>
                            </Box>
                        )}

                        {task.has_duplicates && !task.is_duplicate && (
                            <Box sx={{ mb: 1 }}>
                                <Chip
                                    icon={<ContentCopyIcon />}
                                    label={`Has ${task.duplicates?.length || 0} duplicate(s)`}
                                    size="small"
                                    sx={{
                                        fontSize: '0.7rem',
                                        height: 20,
                                        bgcolor: alpha(theme.palette.info.main, 0.1),
                                        color: theme.palette.info.main,
                                        '& .MuiChip-icon': {
                                            fontSize: '0.75rem',
                                            color: theme.palette.info.main,
                                        },
                                    }}
                                />
                            </Box>
                        )}

                        {/* Sub-task Indicators */}
                        {task.is_sub_task && (
                            <Box
                                sx={{
                                    mb: 1,
                                    p: 1,
                                    borderRadius: 1,
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    border: `1px solid ${alpha(theme.palette.primary.main, 0.3)}`,
                                    cursor: task.parent?.id ? 'pointer' : 'default',
                                    '&:hover': task.parent?.id
                                        ? {
                                            bgcolor: alpha(theme.palette.primary.main, 0.15),
                                        }
                                        : {},
                                }}
                                onClick={(e) => {
                                    if (task.parent?.id && onParentClick) {
                                        e.stopPropagation();
                                        onParentClick(task.parent.id);
                                    }
                                }}
                            >
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <SubdirectoryArrowRightIcon
                                        sx={{
                                            fontSize: '1rem',
                                            color: theme.palette.primary.main,
                                        }}
                                    />
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            fontWeight: 600,
                                            color: theme.palette.primary.dark,
                                            textDecoration: task.parent?.id ? 'underline' : 'none',
                                        }}
                                    >
                                        Child of: #{task.parent?.id || 'Unknown'}
                                    </Typography>
                                </Stack>
                            </Box>
                        )}

                        {task.has_sub_tasks && !task.is_sub_task && (
                            <Box sx={{ mb: 1 }}>
                                <Chip
                                    icon={<AccountTreeIcon />}
                                    label={`Has ${task.children?.length || 0} sub-task(s)`}
                                    size="small"
                                    sx={{
                                        fontSize: '0.7rem',
                                        height: 20,
                                        bgcolor: alpha(theme.palette.success.main, 0.1),
                                        color: theme.palette.success.main,
                                        '& .MuiChip-icon': {
                                            fontSize: '0.75rem',
                                            color: theme.palette.success.main,
                                        },
                                    }}
                                />
                            </Box>
                        )}

                        {/* Description Preview */}
                        {task.description && (
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                    mb: 1.4,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    lineHeight: 1.35,
                                    fontSize: '0.78rem',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {task.description}
                            </Typography>
                        )}

                        {/* Date Row */}
                        {showDateRow && (
                            <Stack
                                direction="row"
                                alignItems="center"
                                spacing={0.75}
                                sx={{
                                    mb: 1.35,
                                    color: theme.palette.text.secondary,
                                    flexWrap: 'wrap',
                                }}
                            >
                                <CalendarMonthRoundedIcon sx={{ fontSize: 14 }} />
                                <Typography variant="caption">
                                    {start ? fmt(start) : '—'}
                                </Typography>
                                <ArrowRightAltRoundedIcon sx={{ fontSize: 16, opacity: 0.6 }} />
                                <Typography variant="caption">{end ? fmt(end) : '—'}</Typography>
                                {showProgress && (
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            ml: 1,
                                            fontWeight: 500,
                                            color:
                                                rawElapsedPct > 100
                                                    ? 'error.main'
                                                    : 'text.secondary',
                                        }}
                                    >
                                        {Math.round(rawElapsedPct || 0)}%
                                    </Typography>
                                )}
                            </Stack>
                        )}

                        {/* Progress Rail */}
                        {showProgress && (
                            <Box sx={{ mb: 1.3 }}>
                                <Box
                                    sx={{
                                        position: 'relative',
                                        height: 6,
                                        borderRadius: 3,
                                        backgroundColor: alpha(cardAccent, 0.12),
                                        overflow: 'hidden',
                                    }}
                                >
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            inset: 0,
                                            backdropFilter: 'blur(2px)',
                                            opacity: 0.35,
                                        }}
                                    />
                                    <Box
                                        sx={{
                                            height: '100%',
                                            width: `${progress}%`,
                                            background:
                                                rawElapsedPct > 100
                                                    ? theme.palette.error.main
                                                    : `linear-gradient(90deg, ${alpha(cardAccent, 0.6)}, ${cardAccent})`,
                                            transition: 'width .35s cubic-bezier(.4,0,.2,1)',
                                        }}
                                    />
                                </Box>
                            </Box>
                        )}

                        {/* Chips Row */}
                        <Stack
                            direction="row"
                            spacing={0.75}
                            sx={{ mb: 1, flexWrap: 'wrap', rowGap: 0.75 }}
                        >
                            <Chip
                                size="small"
                                label={getPriorityLabel(task.priority)}
                                icon={<FlagRoundedIcon sx={{ fontSize: 14 }} />}
                                sx={{
                                    height: 22,
                                    fontSize: '0.6rem',
                                    backgroundColor: alpha(getPriorityColor(task.priority), 0.14),
                                    color: getPriorityColor(task.priority),
                                    border: `1px solid ${alpha(getPriorityColor(task.priority), 0.35)}`,
                                    fontWeight: 600,
                                    pl: 0.5,
                                }}
                            />
                            {commentsCount > 0 && (
                                <Chip
                                    size="small"
                                    label={commentsCount}
                                    icon={<CommentIcon sx={{ fontSize: 14 }} />}
                                    sx={{
                                        height: 22,
                                        fontSize: '0.55rem',
                                        backgroundColor: alpha(cardAccent, 0.1),
                                        border: `1px solid ${alpha(cardAccent, 0.25)}`,
                                    }}
                                />
                            )}
                            {attachmentsCount > 0 && (
                                <Chip
                                    size="small"
                                    label={attachmentsCount}
                                    icon={<ImageIcon sx={{ fontSize: 14 }} />}
                                    sx={{
                                        height: 22,
                                        fontSize: '0.55rem',
                                        backgroundColor: alpha(cardAccent, 0.1),
                                        border: `1px solid ${alpha(cardAccent, 0.25)}`,
                                    }}
                                />
                            )}
                            {task?.is_sub_task && (
                                <Chip
                                    size="small"
                                    label={'Subtask'}
                                    icon={<SubdirectoryArrowRightIcon sx={{ fontSize: 14 }} />}
                                    sx={{
                                        height: 22,
                                        fontSize: '0.55rem',
                                        backgroundColor: alpha(theme.palette.info.main, 0.12),
                                        color: theme.palette.info.main,
                                        border: `1px solid ${alpha(theme.palette.info.main, 0.3)}`,
                                        fontWeight: 600,
                                    }}
                                />
                            )}
                        </Stack>

                        {/* Meta Row */}
                        <Stack
                            direction="row"
                            justifyContent="space-between"
                            alignItems="center"
                            sx={{ mt: 'auto' }}
                        >
                            {/* Left: Assignee */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {task.assignee && (
                                    <Tooltip title={`Assigned to ${task.assignee.name}`}>
                                        <Box
                                            sx={{
                                                width: 28,
                                                height: 28,
                                                borderRadius: '50%',
                                                background: `linear-gradient(135deg, ${alpha(cardAccent, 0.9)}, ${cardAccent})`,
                                                color: '#fff',
                                                fontSize: '0.7rem',
                                                fontWeight: 700,
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                letterSpacing: 0.5,
                                                boxShadow: `0 2px 4px ${alpha(cardAccent, 0.4)}`,
                                            }}
                                        >
                                            {task.assignee.name.charAt(0).toUpperCase()}
                                        </Box>
                                    </Tooltip>
                                )}
                            </Box>

                            {/* Right: Actions */}
                            <Stack
                                direction="row"
                                spacing={0.25}
                                onClick={stop}
                                sx={{
                                    opacity: 0.0,
                                    transition: 'opacity .25s',
                                    pointerEvents: 'none',
                                    '.MuiCard-root:hover &': {
                                        opacity: 0.9,
                                        pointerEvents: 'auto',
                                    },
                                }}
                            >
                                <Tooltip title={t('buttons.upload')}>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            stop(e);
                                            onImageUpload?.(task.id);
                                        }}
                                        sx={{ p: 0.5 }}
                                    >
                                        <AddPhotoAlternateIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={t('board.editTask')}>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            stop(e);
                                            onEdit?.(task);
                                        }}
                                        sx={{ p: 0.5 }}
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={t('board.createSubTask', 'Add sub-task')}>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            stop(e);
                                            onAddSubTask?.(task);
                                        }}
                                        sx={{ p: 0.5 }}
                                    >
                                        <SubdirectoryArrowRightIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title={t('board.deleteTask')}>
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            stop(e);
                                            onDelete?.(task.id);
                                        }}
                                        sx={{
                                            p: 0.5,
                                            '&:hover': { color: theme.palette.error.main },
                                        }}
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Stack>
                        </Stack>
                    </CardContent>
                </Card>

                {/* Image Modal */}
                {task.cover_image && (
                    <ImageModal
                        open={imageModalOpen}
                        onClose={() => setImageModalOpen(false)}
                        imageUrl={task.cover_image}
                        title={task.title}
                    />
                )}

                {/* CSS for spinning animation */}
                <style>{`
                    @keyframes spin {
                        from {
                            transform: rotate(0deg);
                        }
                        to {
                            transform: rotate(360deg);
                        }
                    }
                    @keyframes shimmer {
                        0% {
                            transform: translateX(-100%);
                        }
                        100% {
                            transform: translateX(100%);
                        }
                    }
                `}</style>
            </>
        );
    }
);

OptimizedTaskCard.displayName = 'OptimizedTaskCard';

export default OptimizedTaskCard;
