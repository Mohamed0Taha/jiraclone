import React, { useState } from 'react';
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
import ImageModal from '@/Components/ImageModal';

/**
 * TaskCard
 * - Start/Due row with compact formatting: "Aug 6 → Aug 12"
 * - Progress rail based on start_date → end_date
 * - Overdue highlighting (if now > due and status !== "done")
 * - Title never overlaps icons (pure flex, no absolute positioning)
 * - Title clamps to 2 lines on narrow widths
 * - Task ID displayed above title in blue
 */
export default function TaskCard({ task, onEdit, onDelete, onClick, onImageUpload, accent }) {
    const theme = useTheme();
    const defaultAccent = theme.palette.primary.main;
    const [imageModalOpen, setImageModalOpen] = useState(false);

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
        progress = Math.round(Math.min(100, rawElapsedPct));
    }

    const overdue = !!(endMid && nowMid > endMid && task?.status !== 'done');

    // Derive a schedule health color from elapsed % of available time (green -> red)
    let scheduleColor = accent || defaultAccent;
    if (task?.status === 'done') {
        // Task is complete - always show green regardless of timing
        scheduleColor = (t) => t.palette.success.main;
    } else if (rawElapsedPct != null) {
        if (rawElapsedPct <= 50)
            scheduleColor = (t) => t.palette.success.main; // Plenty of time
        else if (rawElapsedPct <= 75)
            scheduleColor = (t) => t.palette.info.main; // Past halfway
        else if (rawElapsedPct <= 90)
            scheduleColor = (t) => t.palette.warning.main; // Approaching due
        else if (rawElapsedPct <= 100)
            scheduleColor = (t) => t.palette.warning.dark; // Critical window
        else scheduleColor = (t) => t.palette.error.main; // Over time
    }
    if (overdue) scheduleColor = (t) => t.palette.error.main;

    // Human tooltip text for schedule state
    const scheduleTooltip = (() => {
        if (task?.status === 'done') return 'Task completed';
        if (rawElapsedPct == null) return 'No schedule data';
        const pctTxt = `${Math.round(rawElapsedPct)}% of scheduled time elapsed`;
        if (overdue) return pctTxt + ' (overdue)';
        if (rawElapsedPct > 100) return pctTxt + ' (time fully consumed)';
        return pctTxt;
    })();

    return (
        <>
            <Tooltip
                title={onClick ? 'Click to view task details and comments' : ''}
                placement="top"
                disableHoverListener={!onClick}
            >
                <Card
                    variant="outlined"
                    onClick={onClick}
                    sx={{
                        borderLeft: `4px solid ${accent || defaultAccent}`,
                        borderRadius: 2,
                        overflow: 'hidden',
                        background: (t) => alpha(t.palette.background.paper, 0.98),
                        cursor: onClick ? 'pointer' : 'default',
                        transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                        '&:hover': onClick
                            ? {
                                  transform: 'translateY(-2px)',
                                  boxShadow: theme.shadows[4],
                              }
                            : {},
                    }}
                >
                    {task?.cover_image && (
                        <Box
                            sx={{
                                width: '100%',
                                aspectRatio: '16 / 9',
                                overflow: 'hidden',
                                backgroundColor: 'grey.100',
                                borderBottom: '1px solid',
                                borderColor: 'divider',
                                cursor: 'pointer',
                                position: 'relative',
                                '&:hover': {
                                    '&::after': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        backgroundColor: 'rgba(0,0,0,0.1)',
                                        transition: 'background-color 0.2s',
                                    },
                                },
                            }}
                            onClick={(e) => {
                                stop(e);
                                setImageModalOpen(true);
                            }}
                        >
                            <img
                                src={task.cover_image}
                                alt={task.title || 'Task image'}
                                style={{
                                    width: '100%',
                                    height: '100%',
                                    objectFit: 'cover',
                                    display: 'block',
                                }}
                                loading="lazy"
                            />
                        </Box>
                    )}
                    <CardContent
                        sx={{
                            p: 1.25,
                            minHeight: 200,
                            display: 'flex',
                            flexDirection: 'column',
                        }}
                    >
                        {/* Header row: title + actions */}
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: 1,
                                mb:
                                    task?.description || start || end || task?.milestone
                                        ? 0.75
                                        : 0.25,
                            }}
                        >
                            {/* Task ID + Title */}
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                {/* Task ID - added above title in blue */}
                                {task?.id && (
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            display: 'block',
                                            fontWeight: 600,
                                            letterSpacing: 0.5,
                                            lineHeight: 1.1,
                                            mb: 0.25,
                                            color: 'primary.main', // Changed to blue using theme primary color
                                        }}
                                        title={`Task ID: ${task.id}`}
                                    >
                                        #{task.id}
                                    </Typography>
                                )}

                                {/* Title */}
                                <Typography
                                    variant="subtitle2"
                                    fontWeight={700}
                                    sx={{
                                        lineHeight: 1.25,
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        wordBreak: 'break-word',
                                    }}
                                    title={task?.title || '(Untitled)'}
                                >
                                    {task?.title || '(Untitled)'}
                                </Typography>
                            </Box>

                            {/* Actions (stay to the right, do not shrink) */}
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 0.5,
                                    flexShrink: 0,
                                }}
                            >
                                <Tooltip title="View Details">
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            stop(e);
                                            onClick?.();
                                        }}
                                        aria-label="View task details"
                                    >
                                        <VisibilityIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Edit">
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            stop(e);
                                            onEdit?.();
                                        }}
                                        aria-label="Edit task"
                                    >
                                        <EditIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                {onImageUpload && (
                                    <Tooltip title="Add Image">
                                        <IconButton
                                            size="small"
                                            component="label"
                                            aria-label="Add image"
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <AddPhotoAlternateIcon fontSize="small" />
                                            <input
                                                hidden
                                                type="file"
                                                accept="image/*"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        onImageUpload?.(file);
                                                        e.target.value = '';
                                                    }
                                                }}
                                            />
                                        </IconButton>
                                    </Tooltip>
                                )}
                                <Tooltip title="Delete">
                                    <IconButton
                                        size="small"
                                        onClick={(e) => {
                                            stop(e);
                                            onDelete?.();
                                        }}
                                        aria-label="Delete task"
                                    >
                                        <DeleteIcon fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                            </Box>
                        </Box>
                        {/* Optional milestone badge (tiny) */}
                        {task?.milestone && (
                            <Stack
                                direction="row"
                                spacing={0.5}
                                sx={{ mb: 0.5 }}
                                alignItems="center"
                            >
                                <FlagRoundedIcon
                                    fontSize="inherit"
                                    style={{ fontSize: 14 }}
                                    sx={{ color: (t) => t.palette.warning.main }}
                                />
                                <Typography
                                    variant="caption"
                                    sx={{ fontWeight: 600, color: (t) => t.palette.warning.main }}
                                >
                                    Milestone
                                </Typography>
                            </Stack>
                        )}
                        {/* Priority and Comments row */}
                        <Stack direction="row" spacing={1} sx={{ mb: 0.75 }} alignItems="center">
                            {/* Priority badge */}
                            <Chip
                                label={getPriorityLabel(task?.priority)}
                                size="small"
                                icon={
                                    task?.priority === 'urgent' ? (
                                        <PriorityHighIcon style={{ fontSize: 14 }} />
                                    ) : undefined
                                }
                                sx={{
                                    height: 20,
                                    fontSize: '0.7rem',
                                    fontWeight: 600,
                                    backgroundColor: getPriorityColor(task?.priority),
                                    color: 'white',
                                    '& .MuiChip-icon': {
                                        color: 'white',
                                    },
                                }}
                            />

                            {/* Comments count */}
                            {task?.comments_count > 0 && (
                                <Chip
                                    label={`${task.comments_count} ${task.comments_count === 1 ? 'comment' : 'comments'}`}
                                    size="small"
                                    icon={<CommentIcon style={{ fontSize: 14 }} />}
                                    sx={{
                                        height: 20,
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        backgroundColor: 'primary.main',
                                        color: 'white',
                                        '& .MuiChip-icon': {
                                            color: 'white',
                                        },
                                    }}
                                />
                            )}

                            {task?.attachments_count > 0 && (
                                <Chip
                                    label={`${task.attachments_count}`}
                                    size="small"
                                    icon={<ImageIcon style={{ fontSize: 14 }} />}
                                    sx={{
                                        height: 20,
                                        fontSize: '0.7rem',
                                        fontWeight: 600,
                                        backgroundColor: 'secondary.main',
                                        color: 'white',
                                        '& .MuiChip-icon': {
                                            color: 'white',
                                        },
                                    }}
                                />
                            )}

                            {/* Show "Add comment" hint if no comments */}
                            {(!task?.comments_count || task.comments_count === 0) && onClick && (
                                <Stack direction="row" spacing={0.25} alignItems="center">
                                    <CommentIcon
                                        style={{ fontSize: 14 }}
                                        sx={{ color: 'text.secondary' }}
                                    />
                                    <Typography variant="caption" color="text.secondary">
                                        Click to add comments
                                    </Typography>
                                </Stack>
                            )}
                        </Stack>
                        {/* Description */}
                        {task?.description && (
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{
                                    mb: 0.75,
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                    overflow: 'hidden',
                                    lineHeight: 1.4,
                                    fontSize: '0.85rem',
                                    wordBreak: 'break-word',
                                }}
                            >
                                {task.description}
                            </Typography>
                        )}{' '}
                        {/* Dates row */}
                        {(start || end) && (
                            <Stack
                                direction="row"
                                spacing={0.5}
                                alignItems="center"
                                sx={{ mb: progress !== null ? 0.6 : 0.2, minHeight: 20 }}
                            >
                                <CalendarMonthRoundedIcon
                                    fontSize="inherit"
                                    style={{ fontSize: 16 }}
                                    sx={{ color: (t) => alpha(t.palette.text.primary, 0.66) }}
                                />
                                <Typography variant="caption" color="text.secondary">
                                    {fmt(start)}
                                </Typography>
                                <ArrowRightAltRoundedIcon
                                    fontSize="inherit"
                                    style={{ fontSize: 16 }}
                                    sx={{ color: (t) => alpha(t.palette.text.primary, 0.5) }}
                                />
                                <Tooltip
                                    title={overdue ? 'Task is overdue' : ''}
                                    disableHoverListener={!overdue}
                                >
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            fontWeight: 600,
                                            color: (t) =>
                                                overdue
                                                    ? t.palette.error.main
                                                    : t.palette.text.secondary,
                                        }}
                                    >
                                        {fmt(end)}
                                    </Typography>
                                </Tooltip>
                            </Stack>
                        )}
                        {/* Progress rail */}
                        {progress !== null && (
                            <Tooltip title={scheduleTooltip} placement="top" arrow>
                                <Box
                                    sx={{
                                        position: 'relative',
                                        height: 8,
                                        borderRadius: 4,
                                        overflow: 'hidden',
                                        background: (t) => alpha(t.palette.text.disabled, 0.15),
                                        mb: 0.75,
                                    }}
                                    aria-label={scheduleTooltip}
                                >
                                    <Box
                                        sx={{
                                            position: 'absolute',
                                            inset: 0,
                                            width: `${progress}%`,
                                            height: '100%',
                                            background: scheduleColor,
                                            transition:
                                                'width .25s ease, background-color .25s ease',
                                        }}
                                    />
                                    {/* Thin marker for "today" position if not overdue */}
                                    {rawElapsedPct != null && rawElapsedPct <= 100 && (
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                top: 0,
                                                bottom: 0,
                                                left: `${Math.min(100, Math.max(0, rawElapsedPct))}%`,
                                                width: 2,
                                                transform: 'translateX(-1px)',
                                                background: (t) =>
                                                    alpha(t.palette.common.black, 0.25),
                                            }}
                                        />
                                    )}
                                </Box>
                            </Tooltip>
                        )}
                        {/* Meta */}
                        <Box sx={{ mt: 'auto' }}>
                            {task?.creator?.name && (
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                >
                                    Created by {task.creator.name}
                                </Typography>
                            )}
                            {task?.assignee?.name && (
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    display="block"
                                >
                                    Assigned to {task.assignee.name}
                                </Typography>
                            )}
                        </Box>
                    </CardContent>
                </Card>
            </Tooltip>
            {/* Image Modal */}
            <ImageModal
                open={imageModalOpen}
                onClose={() => setImageModalOpen(false)}
                src={task?.cover_image}
                alt={task?.title || 'Task image'}
                title={`Task #${task?.id}: ${task?.title}`}
                downloadUrl={task?.cover_image}
            />
        </>
    );
}
