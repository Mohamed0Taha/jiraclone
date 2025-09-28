// resources/js/Pages/Timeline/Timeline.jsx
import React, { useState, useCallback, useEffect, useMemo } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Box, Typography, Paper, Container, Button,
    IconButton, Chip, Card, CardContent, useTheme, alpha,
    Avatar, AvatarGroup, ButtonGroup, Divider, Zoom, Fade, Tooltip
} from '@mui/material';
import {
    CalendarToday as CalendarIcon,
    ViewWeek as WeekIcon,
    ViewModule as MonthIcon,
    Lock as LockIcon,
    LockOpen as LockOpenIcon,
    DragIndicator as DragIndicatorIcon,
    ArrowBack as ArrowBackIcon,
    Today as TodayIcon,
    ViewWeek as ViewWeekIcon,
    CalendarMonth as ViewMonthIcon,
    ZoomIn as ZoomInIcon,
    ZoomOut as ZoomOutIcon,
    Schedule as ScheduleIcon,
    CheckCircle as CheckCircleIcon,
    ChevronLeft as ChevronLeftIcon,
    ChevronRight as ChevronRightIcon
} from '@mui/icons-material';
import Timeline, {
    TimelineHeaders,
    SidebarHeader,
    DateHeader
} from 'react-calendar-timeline';
// Timeline CSS imported in app.jsx
import moment from 'moment';
import axios from 'axios';
import { METHODOLOGIES, DEFAULT_METHOD, getStatusMeta, getStatusOrder } from '@/Pages/Board/meta';
import { usePage, router } from '@inertiajs/react';
import { route } from 'ziggy-js';

const computeMaxOverlap = (groupItems = []) => {
    if (!groupItems.length) return 0;

    const events = [];
    groupItems.forEach((item) => {
        events.push({ time: item.start_time, type: 'start' });
        events.push({ time: item.end_time, type: 'end' });
    });

    events.sort((a, b) => {
        if (a.time === b.time) {
            if (a.type === b.type) return 0;
            return a.type === 'end' ? -1 : 1;
        }
        return a.time - b.time;
    });

    let current = 0;
    let max = 0;
    events.forEach((event) => {
        if (event.type === 'start') {
            current += 1;
            if (current > max) max = current;
        } else {
            current = Math.max(0, current - 1);
        }
    });

    return max;
};

const buildOverlapMap = (itemList = [], statuses = []) => {
    const grouped = itemList.reduce((acc, item) => {
        if (!acc[item.group]) acc[item.group] = [];
        acc[item.group].push(item);
        return acc;
    }, {});

    const result = {};
    statuses.forEach((status) => {
        const groupItems = grouped[status] || [];
        result[status] = computeMaxOverlap(groupItems);
    });

    return result;
};

export default function TimelinePage({ auth, project = {}, tasks = {}, users = [] }) {
    const { props } = usePage();
    const authenticatedUser = auth || props?.auth || {};
    const theme = useTheme();
    const [visibleTimeStart, setVisibleTimeStart] = useState(moment().startOf('week').valueOf());
    const [visibleTimeEnd, setVisibleTimeEnd] = useState(moment().endOf('week').add(1, 'week').valueOf());
    const [selectedItem, setSelectedItem] = useState(null);
    const [viewMode, setViewMode] = useState('week');
    const [isDragging, setIsDragging] = useState(false);
    const [isLocked, setIsLocked] = useState(false); // Lock state for timeline

    const EMPTY_GROUP_HEIGHT = 44;
    const SINGLE_TASK_HEIGHT = 68;

    const computeGroupHeight = useCallback((laneCount = 0) => {
        if (laneCount <= 0) return EMPTY_GROUP_HEIGHT;
        return Math.max(EMPTY_GROUP_HEIGHT, laneCount * SINGLE_TASK_HEIGHT);
    }, [EMPTY_GROUP_HEIGHT, SINGLE_TASK_HEIGHT]);
    
    // Get project methodology (same logic as Board.jsx)
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
    
    const methodology = initialMethod;
    const STATUS_META = getStatusMeta(methodology);
    const STATUS_ORDER = getStatusOrder(methodology);
    
    // Server statuses (canonical)
    const SERVER_STATUSES = ['todo', 'inprogress', 'review', 'done'];
    
    // Method to server mapping (from Board.jsx)
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
    
    // Server default to method mapping (from Board.jsx)
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
        [METHODOLOGIES.LEAN]: { 
            todo: 'backlog', 
            inprogress: 'todo', 
            review: 'testing', 
            done: 'done' 
        },
    };
    
    // Build task columns (same logic as Board.jsx buildInitialColumns)
    const tasksByStatus = {};
    const allTasks = [];
    
    // Initialize columns
    STATUS_ORDER.forEach((status) => {
        tasksByStatus[status] = [];
    });
    
    if (tasks && typeof tasks === 'object') {
        SERVER_STATUSES.forEach((serverKey) => {
            const arr = Array.isArray(tasks[serverKey]) ? tasks[serverKey] : [];
            if (!arr.length) return;
            
            const defaultPhase = SERVER_DEFAULT_TO_METHOD[methodology]?.[serverKey] || STATUS_ORDER[0];
            arr.forEach((task) => {
                if (!task) return;
                
                // For Timeline, we don't have phaseMap, so use default phase
                const finalPhase = defaultPhase;
                const taskWithStatus = { ...task, status: finalPhase };
                tasksByStatus[finalPhase].push(taskWithStatus);
                allTasks.push(taskWithStatus);
            });
        });
    }

    // Dynamic groups that update based on current task distribution
    // Function to calculate optimal height for a status group
    // Function to update group heights dynamically
    const updateGroupHeights = useCallback((currentItems) => {
        const overlapMap = buildOverlapMap(currentItems, STATUS_ORDER);

        setGroups(prevGroups => {
            let changed = false;
            const nextGroups = prevGroups.map(group => {
                const lanes = overlapMap[group.id] || 0;
                const nextHeight = computeGroupHeight(lanes);
                if (group.height === nextHeight) {
                    return group;
                }
                changed = true;
                return { ...group, height: nextHeight };
            });
            return changed ? nextGroups : prevGroups;
        });
    }, [STATUS_ORDER, computeGroupHeight]);
    // Get status color based on methodology
    function getStatusColor(status) {
        const meta = STATUS_META[status];
        if (meta?.accent) {
            return meta.accent;
        }
        // Fallback colors for common statuses
        switch (status) {
            case 'done': return theme.palette.success.main;
            case 'inprogress': return theme.palette.info.main;
            case 'review': return theme.palette.warning.main;
            default: return theme.palette.grey[600];
        }
    }

    function getStatusColorLight(status) {
        const meta = STATUS_META[status];
        if (meta?.accent) {
            return alpha(meta.accent, 0.7);
        }
        // Fallback colors for common statuses
        switch (status) {
            case 'done': return alpha(theme.palette.success.main, 0.7);
            case 'inprogress': return alpha(theme.palette.info.main, 0.7);
            case 'review': return alpha(theme.palette.warning.main, 0.7);
            default: return alpha(theme.palette.grey[600], 0.7);
        }
    }

    // Map tasks to timeline items grouped by status
    const [items, setItems] = useState(
        allTasks.map((task, index) => {
            const startDate = task.start_date ? moment(task.start_date) : moment().startOf('day');
            const endDate = task.end_date ? moment(task.end_date) : startDate.clone().add(1, 'day');
            const finalEndDate = endDate.isBefore(startDate) ? startDate.clone().add(1, 'day') : endDate;

            // Get assignees for avatars
            const assignees = task.assignees || [];
            
            return {
                id: task.id || index,
                group: task.status || 'todo', // Group by status, not individual task
                title: task.title || 'Untitled Task',
                start_time: startDate.valueOf(),
                end_time: finalEndDate.valueOf(),
                canMove: !isLocked,
                canResize: !isLocked ? 'both' : false,
                canChangeGroup: !isLocked, // Allow moving between status groups
                originalTask: task,
                assignees: assignees,
                itemProps: {
                    style: {
                        background: `linear-gradient(135deg, ${getStatusColor(task.status)} 0%, ${getStatusColorLight(task.status)} 100%)`,
                        border: `2px solid ${alpha(getStatusColor(task.status), 0.4)}`,
                        borderRadius: '6px',
                        color: '#ffffff',
                        boxShadow: theme.shadows[2],
                        fontSize: '11px',
                        fontWeight: 500,
                        padding: '6px 10px',
                        cursor: !isLocked ? 'grab' : 'default',
                        transition: 'left 160ms ease-out, width 160ms ease-out, transform 120ms ease-out, box-shadow 180ms ease, background 220ms ease',
                        minHeight: '28px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                    }
                }
            };
        })
    );

    const [groups, setGroups] = useState(() => {
        const overlapMap = buildOverlapMap(items, STATUS_ORDER);
        return STATUS_ORDER.map((status) => {
            const meta = STATUS_META[status];
            const laneCount = overlapMap[status] || (tasksByStatus[status]?.length ? 1 : 0);
            return {
                id: status,
                title: meta?.title || status,
                rightTitle: '',
                stackItems: true,
                height: computeGroupHeight(laneCount),
            };
        });
    });

    const groupHeights = useMemo(
        () => groups.map(group => group.height ?? computeGroupHeight(0)),
        [groups, computeGroupHeight]
    );

    // Update group heights when items change
    useEffect(() => {
        updateGroupHeights(items);
    }, [items, updateGroupHeights]);

    // Handle drag preview - expand target group when dragging over it
    const handleItemDrag = useCallback((itemId, dragTime, newGroupOrder) => {
        if (isLocked || !isDragging) return;

        const targetGroupId = groups[newGroupOrder]?.id;
        if (!targetGroupId) return;

        const movingItem = items.find((candidate) => candidate.id === itemId);
        if (!movingItem) return;

        const duration = movingItem.end_time - movingItem.start_time;
        const simulatedItems = items.map((item) => {
            if (item.id === itemId) {
                return {
                    ...item,
                    group: targetGroupId,
                    start_time: dragTime,
                    end_time: dragTime + duration,
                };
            }
            return item;
        });

        const overlapMap = buildOverlapMap(simulatedItems, STATUS_ORDER);

        setGroups(prevGroups => {
            let changed = false;
            const nextGroups = prevGroups.map(group => {
                const lanes = overlapMap[group.id] || 0;
                const targetHeight = computeGroupHeight(lanes);
                if (group.height === targetHeight) {
                    return group;
                }
                changed = true;
                return { ...group, height: targetHeight };
            });
            return changed ? nextGroups : prevGroups;
        });
    }, [isLocked, isDragging, groups, items, STATUS_ORDER, computeGroupHeight]);

    // View mode handlers
    const handleViewModeChange = useCallback((mode) => {
        setViewMode(mode);
        const now = moment();
        let start, end;
        
        switch (mode) {
            case 'day':
                start = now.clone().startOf('day');
                end = now.clone().endOf('day');
                break;
            case 'week':
                start = now.clone().startOf('week');
                end = now.clone().endOf('week').add(1, 'week');
                break;
            case 'month':
                start = now.clone().startOf('month');
                end = now.clone().endOf('month');
                break;
        }
        
        setVisibleTimeStart(start.valueOf());
        setVisibleTimeEnd(end.valueOf());
    }, []);

    // Zoom handlers
    const handleZoomIn = useCallback(() => {
        const zoom = visibleTimeEnd - visibleTimeStart;
        const newZoom = zoom * 0.75;
        const center = (visibleTimeStart + visibleTimeEnd) / 2;
        setVisibleTimeStart(center - newZoom / 2);
        setVisibleTimeEnd(center + newZoom / 2);
    }, [visibleTimeStart, visibleTimeEnd]);

    const handleZoomOut = useCallback(() => {
        const zoom = visibleTimeEnd - visibleTimeStart;
        const newZoom = zoom * 1.25;
        const center = (visibleTimeStart + visibleTimeEnd) / 2;
        setVisibleTimeStart(center - newZoom / 2);
        setVisibleTimeEnd(center + newZoom / 2);
    }, [visibleTimeStart, visibleTimeEnd]);

    const handleTimelineShift = useCallback((direction) => {
        const unit = viewMode === 'month' ? 'month' : viewMode === 'week' ? 'week' : 'day';
        setVisibleTimeStart(prev => moment(prev).add(direction, unit).valueOf());
        setVisibleTimeEnd(prev => moment(prev).add(direction, unit).valueOf());
    }, [viewMode]);

    // Handle item move with proper backend update  
    const handleItemMove = async (itemId, dragTime, newGroupOrder) => {
        if (isLocked) return;
        
        const newItems = [...items];
        const item = newItems.find(i => i.id === itemId);
        
        if (item && item.originalTask) {
            const oldGroup = item.group;
            const newGroup = groups[newGroupOrder].id;
            const duration = item.end_time - item.start_time;
            const originalStart = item.start_time;
            const originalEnd = item.end_time;
            
            // Update local state immediately for responsive UI
            item.start_time = dragTime;
            item.end_time = dragTime + duration;
            item.group = newGroup;
            setItems(newItems);
            
            // Update group heights to accommodate the moved task
            updateGroupHeights(newItems);
            
            // Prepare update data
            const updateData = {
                start_date: moment(dragTime).format('YYYY-MM-DD'),
                end_date: moment(dragTime + duration).format('YYYY-MM-DD')
            };
            
            // Add status if group changed - map methodology status back to server status
            if (newGroup !== oldGroup) {
                const serverStatus = METHOD_TO_SERVER[methodology]?.[newGroup] || newGroup;
                updateData.status = serverStatus;
            }
            
            // Update in backend using proper route
            try {
                const response = await axios.patch(
                    `/projects/${project.id}/tasks/${item.originalTask.id}`,
                    updateData,
                    {
                        headers: {
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
                            'Accept': 'application/json',
                        }
                    }
                );
                
                console.log('Task updated successfully:', response.data);
            } catch (error) {
                console.error('Failed to update task:', error.response?.data || error);
                
                // Revert on error
                const revertedItems = [...items];
                const revertItem = revertedItems.find(i => i.id === itemId);
                if (revertItem) {
                    revertItem.start_time = originalStart;
                    revertItem.end_time = originalEnd;
                    revertItem.group = oldGroup;
                }
                setItems(revertedItems);
                
                // Show error message
                alert('Failed to update task. Please try again.');
            }
        }
    };

    // Handle item resize with proper backend update
    const handleItemResize = async (itemId, time, edge) => {
        if (isLocked) return;
        
        const newItems = [...items];
        const item = newItems.find(i => i.id === itemId);
        
        if (item && item.originalTask) {
            const originalStart = item.start_time;
            const originalEnd = item.end_time;
            
            // Update local state immediately
            if (edge === 'left') {
                item.start_time = time;
            } else {
                item.end_time = time;
            }
            setItems(newItems);
            
            // Update in backend
            try {
                const response = await axios.patch(
                    `/projects/${project.id}/tasks/${item.originalTask.id}`,
                    {
                        start_date: moment(item.start_time).format('YYYY-MM-DD'),
                        end_date: moment(item.end_time).format('YYYY-MM-DD')
                    },
                    {
                        headers: {
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
                            'Accept': 'application/json',
                        }
                    }
                );
                
                console.log('Task dates updated successfully:', response.data);
            } catch (error) {
                console.error('Failed to update task dates:', error.response?.data || error);
                
                // Revert on error
                const revertedItems = [...items];
                const revertItem = revertedItems.find(i => i.id === itemId);
                if (revertItem) {
                    revertItem.start_time = originalStart;
                    revertItem.end_time = originalEnd;
                }
                setItems(revertedItems);
                
                // Show error message
                alert('Failed to update task dates. Please try again.');
            }
        }
    };
    
    // Toggle lock state
    const toggleLock = () => {
        const newLockState = !isLocked;
        setIsLocked(newLockState);
        
        // Update all items' move/resize capabilities
        const updatedItems = items.map(item => ({
            ...item,
            canMove: !newLockState,
            canResize: !newLockState ? 'both' : false,
            canChangeGroup: !newLockState
        }));
        setItems(updatedItems);
    };

    // Custom item renderer for better stacked task display with tooltips
    const itemRenderer = ({ item, itemContext, getItemProps, getResizeProps }) => {
        const backgroundColor = itemContext.selected
            ? alpha(getStatusColor(item.originalTask?.status || item.group), 0.9)
            : `linear-gradient(135deg, ${getStatusColor(item.originalTask?.status || item.group)} 0%, ${getStatusColorLight(item.originalTask?.status || item.group)} 100%)`;
        const formattedRange = `${moment(item.start_time).format('MMM D')} → ${moment(item.end_time).format('MMM D')}`;
        const { left: leftResizeProps, right: rightResizeProps } = getResizeProps();
        const leftHandleProps = {
            ...leftResizeProps,
            className: `${leftResizeProps.className || ''} timeline-resize-handle timeline-resize-handle-left`.trim(),
            style: {
                ...leftResizeProps.style,
                width: 10,
                borderRadius: 6,
                cursor: 'ew-resize',
                height: '100%'
            },
            onClick: (event) => event.stopPropagation(),
        };
        const rightHandleProps = {
            ...rightResizeProps,
            className: `${rightResizeProps.className || ''} timeline-resize-handle timeline-resize-handle-right`.trim(),
            style: {
                ...rightResizeProps.style,
                width: 10,
                borderRadius: 6,
                cursor: 'ew-resize',
                height: '100%'
            },
            onClick: (event) => event.stopPropagation(),
        };
        
        const transitions = itemContext.dragging
            ? 'transform 40ms linear, box-shadow 120ms ease, background 160ms ease'
            : 'left 160ms ease-out, width 160ms ease-out, transform 120ms ease-out, box-shadow 160ms ease, background 220ms ease';

        const itemProps = getItemProps({
            className: 'timeline-item',
            style: {
                background: backgroundColor,
                border: `2px solid ${alpha(getStatusColor(item.originalTask?.status || item.group), 0.4)}`,
                borderRadius: '6px',
                color: '#ffffff',
                boxShadow: itemContext.selected ? theme.shadows[4] : theme.shadows[2],
                fontSize: '11px',
                fontWeight: 500,
                padding: '6px 10px',
                cursor: itemContext.dragging ? 'grabbing' : (!isLocked ? 'grab' : 'default'),
                transition: transitions,
                transform: itemContext.dragging ? 'scale(1.02)' : 'scale(1)',
                zIndex: itemContext.selected ? 89 : 'auto',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                paddingRight: !isLocked ? 18 : 10
            }
        });

        return (
            <Tooltip 
                title={`${item.title} • ${formattedRange}`} 
                arrow 
                placement="top"
                enterDelay={500}
                leaveDelay={0}
            >
                <div {...itemProps}>
                    <span className="timeline-item__title">{item.title}</span>
                    <span className="timeline-item__dates">{formattedRange}</span>
                    {!isLocked && (
                        <>
                            <div {...leftHandleProps} />
                            <div {...rightHandleProps} />
                        </>
                    )}
                </div>
            </Tooltip>
        );
    };

    return (
        <AuthenticatedLayout user={authenticatedUser}>
            <Head title={`${project?.name ?? 'Project'} — Timeline`} />
            
            {/* Custom styles for timeline calendar in dark mode */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .react-calendar-timeline .rct-dateHeader {
                    color: ${theme.palette.mode === 'dark' ? '#ffffff' : '#000000'} !important;
                    background: ${theme.palette.mode === 'dark' ? theme.palette.background.default : '#ffffff'} !important;
                }
                .react-calendar-timeline .rct-dateHeader-primary {
                    color: ${theme.palette.mode === 'dark' ? '#ffffff' : '#000000'} !important;
                    background: ${theme.palette.mode === 'dark' ? theme.palette.background.default : '#ffffff'} !important;
                }
                .react-calendar-timeline .rct-dateHeader .rct-label {
                    color: ${theme.palette.mode === 'dark' ? '#ffffff' : '#000000'} !important;
                }
                    .react-calendar-timeline .rct-horizontal-lines .rct-hl-even,
                    .react-calendar-timeline .rct-horizontal-lines .rct-hl-odd {
                        border-color: ${theme.palette.divider} !important;
                    }
                    .react-calendar-timeline .rct-vertical-lines .rct-vl {
                        border-color: ${theme.palette.divider} !important;
                    }
                `
            }} />

            <Box sx={{ 
                minHeight: '100vh', 
                background: theme.palette.mode === 'dark' 
                    ? theme.palette.background.default 
                    : 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)'
            }}>
                {/* Header */}
                <Paper 
                    elevation={0}
                    sx={{
                        borderRadius: 0,
                        borderBottom: `1px solid ${theme.palette.divider}`,
                        background: theme.palette.background.paper,
                        position: 'sticky',
                        top: 0,
                        zIndex: 100
                    }}
                >
                    <Box sx={{ 
                        px: 3, 
                        py: 2,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Tooltip title="Back to Board">
                                <IconButton
                                    onClick={() => router.visit(route('tasks.index', project.id))}
                                    sx={{
                                        background: alpha(theme.palette.primary.main, 0.1),
                                        '&:hover': {
                                            background: alpha(theme.palette.primary.main, 0.2),
                                        }
                                    }}
                                >
                                    <ArrowBackIcon />
                                </IconButton>
                            </Tooltip>
                            <Box>
                                <Typography variant="h5" sx={{ 
                                    fontWeight: 700,
                                    color: theme.palette.text.primary,
                                }}>
                                    {project?.name || 'Project Timeline'}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                                    <Chip 
                                        icon={<ScheduleIcon sx={{ fontSize: 16 }} />}
                                        label={`${allTasks.length} total`}
                                        size="small"
                                        sx={{
                                            background: alpha(theme.palette.info.main, 0.1),
                                            color: theme.palette.info.main,
                                            fontWeight: 600,
                                        }}
                                    />
                                    <Chip
                                        icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                                        label={`${allTasks.filter(t => t.status === 'done').length} completed`}
                                        size="small"
                                        sx={{
                                            background: alpha(theme.palette.success.main, 0.1),
                                            color: theme.palette.success.main,
                                            fontWeight: 600,
                                        }}
                                    />
                                </Box>
                            </Box>
                        </Box>

                        {/* Control Panel */}
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            {/* Lock/Unlock Toggle */}
                            <Tooltip title={isLocked ? 'Unlock timeline for editing' : 'Lock timeline to prevent changes'}>
                                <Button
                                    variant={isLocked ? 'contained' : 'outlined'}
                                    color={isLocked ? 'warning' : 'primary'}
                                    size="small"
                                    onClick={toggleLock}
                                    startIcon={isLocked ? <LockIcon /> : <LockOpenIcon />}
                                    sx={{
                                        minWidth: 120,
                                        fontWeight: 600,
                                    }}
                                >
                                    {isLocked ? 'Locked' : 'Unlocked'}
                                </Button>
                            </Tooltip>
                            {/* View Mode Selector */}
                            <ButtonGroup size="small" variant="outlined">
                                <Tooltip title="Day View">
                                    <Button
                                        onClick={() => handleViewModeChange('day')}
                                        variant={viewMode === 'day' ? 'contained' : 'outlined'}
                                    >
                                        <TodayIcon fontSize="small" />
                                    </Button>
                                </Tooltip>
                                <Tooltip title="Week View">
                                    <Button
                                        onClick={() => handleViewModeChange('week')}
                                        variant={viewMode === 'week' ? 'contained' : 'outlined'}
                                    >
                                        <ViewWeekIcon fontSize="small" />
                                    </Button>
                                </Tooltip>
                                <Tooltip title="Month View">
                                    <Button
                                        onClick={() => handleViewModeChange('month')}
                                        variant={viewMode === 'month' ? 'contained' : 'outlined'}
                                    >
                                        <ViewMonthIcon fontSize="small" />
                                    </Button>
                                </Tooltip>
                            </ButtonGroup>

                            {/* Timeline Navigation */}
                            <ButtonGroup size="small" variant="outlined">
                                <Tooltip title="Previous period">
                                    <Button onClick={() => handleTimelineShift(-1)} sx={{ minWidth: 40 }}>
                                        <ChevronLeftIcon fontSize="small" />
                                    </Button>
                                </Tooltip>
                                <Tooltip title="Next period">
                                    <Button onClick={() => handleTimelineShift(1)} sx={{ minWidth: 40 }}>
                                        <ChevronRightIcon fontSize="small" />
                                    </Button>
                                </Tooltip>
                            </ButtonGroup>

                            {/* Zoom Controls */}
                            <ButtonGroup size="small" variant="outlined">
                                <Tooltip title="Zoom In">
                                    <IconButton onClick={handleZoomIn} size="small">
                                        <ZoomInIcon />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Zoom Out">
                                    <IconButton onClick={handleZoomOut} size="small">
                                        <ZoomOutIcon />
                                    </IconButton>
                                </Tooltip>
                            </ButtonGroup>
                        </Box>
                    </Box>
                </Paper>

                {/* Timeline Container */}
                <Container maxWidth={false} sx={{ py: 3 }}>
                    <Paper
                        elevation={2}
                        sx={{
                            borderRadius: 2,
                            overflow: 'hidden',
                            background: theme.palette.background.paper
                        }}
                    >
                        <Timeline
                            groups={groups}
                            items={items}
                            defaultTimeStart={moment().startOf('week')}
                            defaultTimeEnd={moment().endOf('week').add(1, 'week')}
                            visibleTimeStart={visibleTimeStart}
                            visibleTimeEnd={visibleTimeEnd}
                            onTimeChange={(start, end, updateScrollCanvas) => {
                                if (!isDragging) {
                                    setVisibleTimeStart(start);
                                    setVisibleTimeEnd(end);
                                    updateScrollCanvas(start, end);
                                }
                            }}
                            onItemMove={handleItemMove}
                            onItemResize={handleItemResize}
                            onItemSelect={(itemId) => setSelectedItem(itemId)}
                            onItemDeselect={() => setSelectedItem(null)}
                            lineHeight={SINGLE_TASK_HEIGHT}
                            itemHeightRatio={0.6}
                            groupHeights={groupHeights}
                            canMove={!isLocked}
                            canResize={!isLocked ? 'both' : false}
                            canChangeGroup={!isLocked}
                            stackItems={true}
                            useResizeHandle={true}
                            traditionalZoom={false}
                            minZoom={60 * 60 * 1000}
                            maxZoom={365.24 * 86400 * 1000}
                            sidebarWidth={150}
                            rightSidebarWidth={50}
                            itemTouchSendsClick={false}
                            timeSteps={{
                                second: 1,
                                minute: 1,
                                hour: 1,
                                day: 1,
                                month: 1,
                                year: 1
                            }}
                            dragSnap={15 * 60 * 1000} // 15 minutes for smoother resizing
                            resizeSnap={15 * 60 * 1000} // 15 minutes for resize operations
                            onItemDrag={(itemId, dragTime, newGroupOrder) => {
                                setIsDragging(true);
                                handleItemDrag(itemId, dragTime, newGroupOrder);
                            }}
                            onItemDrop={() => {
                                setIsDragging(false);
                            }}
                            itemRenderer={itemRenderer}
                        >
                            <TimelineHeaders className="timeline-headers">
                                <SidebarHeader>
                                    {({ getRootProps }) => (
                                        <div {...getRootProps()} style={{
                                            background: theme.palette.mode === 'dark' 
                                                ? theme.palette.background.default
                                                : '#f8fafc',
                                            borderBottom: `1px solid ${theme.palette.divider}`,
                                            borderRight: `1px solid ${theme.palette.divider}`,
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'flex-start',
                                            padding: '0 12px',
                                            fontWeight: 600,
                                            fontSize: '14px',
                                            color: theme.palette.text.primary,
                                            textTransform: 'uppercase'
                                        }}>
                                            Status
                                        </div>
                                    )}
                                </SidebarHeader>
                                <DateHeader 
                                    unit="primaryHeader"
                                    style={{
                                        background: theme.palette.mode === 'dark'
                                            ? theme.palette.background.default
                                            : '#ffffff'
                                    }}
                                />
                                <DateHeader 
                                    style={{
                                        background: theme.palette.background.paper
                                    }}
                                />
                            </TimelineHeaders>
                        </Timeline>

                        {/* Helper Text */}
                        <Box sx={{ 
                            p: 2, 
                            background: theme.palette.mode === 'dark' 
                                ? alpha(theme.palette.info.main, 0.15)
                                : alpha(theme.palette.info.main, 0.08),
                            borderTop: `1px solid ${theme.palette.divider}`
                        }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="body2" sx={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: 1,
                                    color: theme.palette.text.primary,
                                    fontWeight: 500,
                                }}>
                                    <DragIndicatorIcon sx={{ fontSize: 18 }} />
                                    {isLocked 
                                        ? 'Timeline is locked. Click unlock button to enable editing.'
                                        : 'Drag tasks to change dates • Resize edges to adjust duration • Drag between rows to change status'
                                    }
                                </Typography>
                                {isLocked && (
                                    <Chip
                                        icon={<LockIcon sx={{ fontSize: 16 }} />}
                                        label="Read-only mode"
                                        color="warning"
                                        size="small"
                                        sx={{ fontWeight: 600 }}
                                    />
                                )}
                            </Box>
                        </Box>
                    </Paper>
                </Container>

                <style dangerouslySetInnerHTML={{
                    __html: `
                        .react-calendar-timeline .rct-sidebar-header {
                            background: ${theme.palette.mode === 'dark' ? theme.palette.background.default : '#f8fafc'};
                            color: ${theme.palette.text.primary};
                        }
                        .react-calendar-timeline .rct-sidebar-row {
                            background: ${theme.palette.mode === 'dark' ? theme.palette.background.paper : '#ffffff'};
                            color: ${theme.palette.text.primary};
                            border-bottom: 1px solid ${theme.palette.divider};
                            font-weight: 500;
                            padding: 0 12px;
                            display: flex;
                            align-items: center;
                            min-height: ${EMPTY_GROUP_HEIGHT}px;
                        }
                        .react-calendar-timeline .rct-header-root {
                            background: ${theme.palette.mode === 'dark' ? theme.palette.background.default : '#ffffff'};
                            color: ${theme.palette.text.primary};
                        }
                        .react-calendar-timeline .rct-dateHeader {
                            color: ${theme.palette.mode === 'dark' ? '#ffffff' : '#000000'};
                        }
                        .react-calendar-timeline .rct-item:hover {
                            z-index: 88;
                        }
                        .react-calendar-timeline .rct-items {
                            background: ${theme.palette.mode === 'dark' ? theme.palette.background.default : '#fafbfc'};
                        }
                        .react-calendar-timeline .rct-vertical-lines .rct-vl {
                            stroke: ${theme.palette.divider};
                        }
                        .react-calendar-timeline .rct-horizontal-lines {
                            stroke: ${theme.palette.divider};
                        }
                        .react-calendar-timeline .rct-calendar-header {
                            border: 1px solid ${theme.palette.divider};
                        }
                        .react-calendar-timeline .rct-sidebar {
                            border-right: 1px solid ${theme.palette.divider};
                        }
                        .timeline-item__title {
                            font-weight: 700;
                            letter-spacing: 0.02em;
                            flex: 1;
                            overflow: hidden;
                            text-overflow: ellipsis;
                            white-space: nowrap;
                        }
                        .timeline-item__dates {
                            font-size: 10px;
                            font-weight: 600;
                            opacity: 0.75;
                            text-transform: uppercase;
                            letter-spacing: 0.04em;
                            flex-shrink: 0;
                        }
                        .timeline-item:hover .timeline-item__dates {
                            opacity: 1;
                        }
                        .timeline-resize-handle {
                            position: absolute;
                            top: -2px;
                            bottom: -2px;
                            background: rgba(255, 255, 255, 0.72);
                            border-radius: 6px;
                            cursor: ew-resize !important;
                            transition: background 0.18s ease, box-shadow 0.22s ease;
                            box-shadow: 0 0 0 1px ${alpha('#000000', 0.08)} inset;
                        }
                        .timeline-resize-handle:hover {
                            background: rgba(255, 255, 255, 0.96);
                            box-shadow: 0 0 0 1px ${alpha('#000000', 0.18)} inset, 0 0 6px ${alpha('#000000', 0.12)};
                        }
                        .timeline-resize-handle-left {
                            left: -1px;
                        }
                        .timeline-resize-handle-right {
                            right: -1px;
                        }
                    `
                }} />
            </Box>
        </AuthenticatedLayout>
    );
}
