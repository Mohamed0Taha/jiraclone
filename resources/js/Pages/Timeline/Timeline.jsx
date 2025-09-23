// resources/js/Pages/Timeline/Timeline.jsx
import React, { useState, useCallback, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
  Box, Typography, Paper, Container, Button,
  IconButton, Chip, useTheme, alpha,
  ButtonGroup, Tooltip
} from '@mui/material';
import {
  Lock as LockIcon,
  LockOpen as LockOpenIcon,
  DragIndicator as DragIndicatorIcon,
  ArrowBack as ArrowBackIcon,
  Today as TodayIcon,
  ViewWeek as ViewWeekIcon,
  CalendarMonth as CalendarMonthIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Schedule as ScheduleIcon,
  CheckCircle as CheckCircleIcon
} from '@mui/icons-material';
import Timeline, {
  TimelineHeaders,
  SidebarHeader,
  DateHeader
} from 'react-calendar-timeline';
import moment from 'moment';
import axios from 'axios';
import { METHODOLOGIES, DEFAULT_METHOD, getStatusMeta, getStatusOrder } from '@/Pages/Board/meta';
import { usePage, router } from '@inertiajs/react';
import { route } from 'ziggy-js';

export default function TimelinePage({ auth, project = {}, tasks = {}, users = [] }) {
  const { props } = usePage();
  const authenticatedUser = auth || props?.auth || {};
  const theme = useTheme();

  // Compact rows by default; expand only for overlaps
  const MIN_ROW_HEIGHT = 40;
  const PER_LANE_EXTRA = 26;

  const [visibleTimeStart, setVisibleTimeStart] = useState(moment().startOf('week').valueOf());
  const [visibleTimeEnd, setVisibleTimeEnd] = useState(moment().endOf('week').add(1, 'week').valueOf());
  const [selectedItem, setSelectedItem] = useState(null);
  const [viewMode, setViewMode] = useState('week');
  const [isDragging, setIsDragging] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Methodology detection (same logic as Board)
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
    [METHODOLOGIES.KANBAN]: { todo: 'todo', inprogress: 'inprogress', review: 'review', done: 'done' },
    [METHODOLOGIES.SCRUM]: { backlog: 'todo', todo: 'todo', inprogress: 'inprogress', testing: 'review', review: 'review', done: 'done' },
    [METHODOLOGIES.AGILE]: { backlog: 'todo', todo: 'todo', inprogress: 'inprogress', testing: 'review', review: 'review', done: 'done' },
    [METHODOLOGIES.WATERFALL]: { requirements: 'todo', design: 'inprogress', implementation: 'inprogress', verification: 'review', maintenance: 'done' },
    [METHODOLOGIES.LEAN]: { backlog: 'todo', todo: 'inprogress', testing: 'review', review: 'review', done: 'done' },
  };

  // Server default to method mapping (from Board.jsx)
  const SERVER_DEFAULT_TO_METHOD = {
    [METHODOLOGIES.KANBAN]: { todo: 'todo', inprogress: 'inprogress', review: 'review', done: 'done' },
    [METHODOLOGIES.SCRUM]: { todo: 'todo', inprogress: 'inprogress', review: 'review', done: 'done' },
    [METHODOLOGIES.AGILE]: { todo: 'todo', inprogress: 'inprogress', review: 'review', done: 'done' },
    [METHODOLOGIES.WATERFALL]: { todo: 'requirements', inprogress: 'design', review: 'verification', done: 'maintenance' },
    [METHODOLOGIES.LEAN]: { todo: 'backlog', inprogress: 'todo', review: 'testing', done: 'done' },
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
        const finalPhase = defaultPhase;
        const taskWithStatus = { ...task, status: finalPhase };
        tasksByStatus[finalPhase].push(taskWithStatus);
        allTasks.push(taskWithStatus);
      });
    });
  }

  // Dynamic groups (one per status)
  const [groups] = useState(() =>
    STATUS_ORDER.map((status) => {
      const meta = STATUS_META[status];
      return {
        id: status,
        title: meta?.title || status,
        rightTitle: '',
        stackItems: true
      };
    })
  );

  // Calculate lanes (how many overlapping rows are needed) for a set of items in a group
  const calcLanesForGroup = (groupItems) => {
    if (!groupItems.length) return 1;
    const sorted = [...groupItems].sort((a, b) => a.start_time - b.start_time);
    const lanes = [];
    sorted.forEach((it) => {
      let placed = false;
      for (let i = 0; i < lanes.length; i++) {
        if (lanes[i] <= it.start_time) {
          lanes[i] = it.end_time;
          placed = true;
          break;
        }
      }
      if (!placed) lanes.push(it.end_time);
    });
    return Math.max(1, lanes.length);
  };

  // Compute per-group heights for react-calendar-timeline
  const computeGroupHeights = useCallback((currentItems, previewOverride = null) => {
    return groups.map((group) => {
      const groupItems = currentItems.filter(it => it.group === group.id);
      const itemsWithPreview = previewOverride && previewOverride.groupId === group.id
        ? [...groupItems, { start_time: previewOverride.start_time, end_time: previewOverride.end_time }]
        : groupItems;
      const lanes = calcLanesForGroup(itemsWithPreview);
      return lanes <= 1 ? MIN_ROW_HEIGHT : MIN_ROW_HEIGHT + (lanes - 1) * PER_LANE_EXTRA;
    });
  }, [groups]);

  const [groupHeights, setGroupHeights] = useState(() => computeGroupHeights([]));

  // Colors
  function getStatusColor(status) {
    const meta = STATUS_META[status];
    if (meta?.accent) return meta.accent;
    switch (status) {
      case 'done': return theme.palette.success.main;
      case 'inprogress': return theme.palette.info.main;
      case 'review': return theme.palette.warning.main;
      default: return theme.palette.grey[600];
    }
  }
  function getStatusColorLight(status) {
    const meta = STATUS_META[status];
    if (meta?.accent) return alpha(meta.accent, 0.7);
    switch (status) {
      case 'done': return alpha(theme.palette.success.main, 0.7);
      case 'inprogress': return alpha(theme.palette.info.main, 0.7);
      case 'review': return alpha(theme.palette.warning.main, 0.7);
      default: return alpha(theme.palette.grey[600], 0.7);
    }
  }

  // Items state
  const [items, setItems] = useState(
    allTasks.map((task, index) => {
      const startDate = task.start_date ? moment(task.start_date) : moment().startOf('day');
      const endDate = task.end_date ? moment(task.end_date) : startDate.clone().add(1, 'day');
      const finalEndDate = endDate.isBefore(startDate) ? startDate.clone().add(1, 'day') : endDate;
      return {
        id: task.id || index,
        group: task.status || 'todo',
        title: task.title || 'Untitled Task',
        start_time: startDate.valueOf(),
        end_time: finalEndDate.valueOf(),
        canMove: !isLocked,
        canResize: !isLocked ? 'both' : false,
        canChangeGroup: !isLocked,
        originalTask: task,
        itemProps: {
          style: {
            background: `linear-gradient(135deg, ${getStatusColor(task.status)} 0%, ${getStatusColorLight(task.status)} 100%)`,
            border: `2px solid ${alpha(getStatusColor(task.status), 0.4)}`,
            borderRadius: '6px',
            color: '#ffffff',
            boxShadow: theme.shadows[2],
            fontSize: '11px',
            fontWeight: 500,
            padding: '0',
            cursor: !isLocked ? 'grab' : 'default',
            transition: 'all 0.2s ease',
            minHeight: '24px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }
        }
      };
    })
  );

  // Update group heights when items change
  useEffect(() => {
    setGroupHeights(computeGroupHeights(items));
  }, [items, computeGroupHeights]);

  // Drag preview: temporarily expand only the row being hovered if needed
  const handleItemDrag = useCallback((itemId, dragTime, newGroupOrder) => {
    if (isLocked || !isDragging) return;
    const targetGroup = groups[newGroupOrder];
    if (!targetGroup) return;

    const dragged = items.find(i => i.id === itemId);
    if (!dragged) return;
    const duration = dragged.end_time - dragged.start_time;
    setGroupHeights(computeGroupHeights(items, {
      groupId: targetGroup.id,
      start_time: dragTime,
      end_time: dragTime + duration
    }));
  }, [isLocked, isDragging, groups, items, computeGroupHeights]);

  // View mode handlers
  const handleViewModeChange = useCallback((mode) => {
    setViewMode(mode);
    const now = moment();
    let start, end;
    switch (mode) {
      case 'day':
        start = now.clone().startOf('day'); end = now.clone().endOf('day'); break;
      case 'week':
        start = now.clone().startOf('week'); end = now.clone().endOf('week').add(1, 'week'); break;
      case 'month':
        start = now.clone().startOf('month'); end = now.clone().endOf('month'); break;
      default:
        start = now.clone().startOf('week'); end = now.clone().endOf('week').add(1, 'week');
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

  // Move
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

      item.start_time = dragTime;
      item.end_time = dragTime + duration;
      item.group = newGroup;
      setItems(newItems);

      const updateData = {
        start_date: moment(dragTime).format('YYYY-MM-DD'),
        end_date: moment(dragTime + duration).format('YYYY-MM-DD')
      };
      if (newGroup !== oldGroup) {
        const serverStatus = METHOD_TO_SERVER[methodology]?.[newGroup] || newGroup;
        updateData.status = serverStatus;
      }

      try {
        await axios.patch(
          `/projects/${project.id}/tasks/${item.originalTask.id}`,
          updateData,
          {
            headers: {
              'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
              'Accept': 'application/json',
            }
          }
        );
      } catch (error) {
        const revertedItems = [...items];
        const revertItem = revertedItems.find(i => i.id === itemId);
        if (revertItem) {
          revertItem.start_time = originalStart;
          revertItem.end_time = originalEnd;
          revertItem.group = oldGroup;
        }
        setItems(revertedItems);
        alert('Failed to update task. Please try again.');
      }
    }
  };

  // Resize
  const handleItemResize = async (itemId, time, edge) => {
    if (isLocked) return;
    const newItems = [...items];
    const item = newItems.find(i => i.id === itemId);
    if (item && item.originalTask) {
      const originalStart = item.start_time;
      const originalEnd = item.end_time;

      if (edge === 'left') item.start_time = time; else item.end_time = time;
      setItems(newItems);

      try {
        await axios.patch(
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
      } catch (error) {
        const revertedItems = [...items];
        const revertItem = revertedItems.find(i => i.id === itemId);
        if (revertItem) {
          revertItem.start_time = originalStart;
          revertItem.end_time = originalEnd;
        }
        setItems(revertedItems);
        alert('Failed to update task dates. Please try again.');
      }
    }
  };

  // Lock toggle
  const toggleLock = () => {
    const newLockState = !isLocked;
    setIsLocked(newLockState);
    const updatedItems = items.map(item => ({
      ...item,
      canMove: !newLockState,
      canResize: !newLockState ? 'both' : false,
      canChangeGroup: !newLockState
    }));
    setItems(updatedItems);
  };

  // Renderer
  const itemRenderer = ({ item, itemContext, getItemProps, getResizeProps }) => {
    const { left: leftResizeProps, right: rightResizeProps } = getResizeProps();
    const backgroundColor = itemContext.selected
      ? alpha(getStatusColor(item.originalTask.status), 0.9)
      : `linear-gradient(135deg, ${getStatusColor(item.originalTask.status)} 0%, ${getStatusColorLight(item.originalTask.status)} 100%)`;

    return (
      <Tooltip
        title={item.title}
        arrow
        placement="top"
        enterDelay={500}
        leaveDelay={0}
      >
        <div {...getItemProps({
          style: {
            ...item.itemProps.style,
            background: backgroundColor,
            boxShadow: itemContext.selected ? theme.shadows[4] : theme.shadows[2],
            transform: itemContext.dragging ? 'scale(1.02)' : 'scale(1)',
            zIndex: itemContext.selected ? 88 : itemContext.dragging ? 89 : 80,
            display: 'flex',
            alignItems: 'center',
            position: 'relative'
          }
        })}>
          {!isLocked && itemContext.useResizeHandle && (
            <div {...leftResizeProps} style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              left: 0,
              width: '8px',
              background: 'rgba(255,255,255,0.3)',
              cursor: 'ew-resize',
              borderRadius: '4px 0 0 4px',
              opacity: itemContext.selected ? 1 : 0.7,
              transition: 'opacity 0.2s ease'
            }} />
          )}
          <div style={{
            padding: '2px 8px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            fontSize: '11px',
            fontWeight: 500,
            flex: 1,
            display: 'flex',
            alignItems: 'center'
          }}>
            {item.title}
          </div>
          {!isLocked && itemContext.useResizeHandle && (
            <div {...rightResizeProps} style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              width: '8px',
              background: 'rgba(255,255,255,0.3)',
              cursor: 'ew-resize',
              borderRadius: '0 4px 4px 0',
              opacity: itemContext.selected ? 1 : 0.7,
              transition: 'opacity 0.2s ease'
            }} />
          )}
        </div>
      </Tooltip>
    );
  };

  return (
    <AuthenticatedLayout user={authenticatedUser}>
      <Head title={`${project?.name ?? 'Project'} — Timeline`} />

      {/* Global style fixes */}
      <style dangerouslySetInnerHTML={{
        __html: `
          .react-calendar-timeline .rct-calendar-header {
            position: relative;
            z-index: 3; /* keep header above grid/items backgrounds */
            border: 1px solid ${theme.palette.divider};
          }
          .react-calendar-timeline .rct-vertical-lines .rct-vl {
            border-color: ${theme.palette.mode === 'dark'
              ? alpha(theme.palette.common.white, 0.16)
              : alpha(theme.palette.common.black, 0.12)} !important;
          }
          .react-calendar-timeline .rct-items {
            background: ${theme.palette.mode === 'dark'
              ? 'linear-gradient(90deg, rgba(255,255,255,0.04) 0, rgba(255,255,255,0.04) 50%, transparent 50%, transparent 100%)'
              : '#fafbfc'};
            background-size: 48px 100%;
          }
          .react-calendar-timeline .rct-sidebar-header {
            background: ${theme.palette.mode === 'dark' ? theme.palette.background.default : '#f8fafc'};
            color: ${theme.palette.text.primary};
          }
          .react-calendar-timeline .rct-sidebar-row {
            background: ${theme.palette.mode === 'dark' ? theme.palette.background.paper : '#ffffff'};
            color: ${theme.palette.text.primary};
            border-bottom: 1px solid ${theme.palette.divider};
            font-weight: 500;
            padding: 0 10px;
          }
          .react-calendar-timeline .rct-header-root {
            background: ${theme.palette.mode === 'dark' ? theme.palette.background.default : '#ffffff'};
            color: ${theme.palette.text.primary};
          }
          .react-calendar-timeline .rct-dateHeader,
          .react-calendar-timeline .rct-dateHeader .rct-label {
            color: ${theme.palette.text.primary};
          }
          .react-calendar-timeline .rct-item:hover { z-index: 88; }
          .react-calendar-timeline .rct-horizontal-lines { stroke: ${theme.palette.divider}; }
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
                    '&:hover': { background: alpha(theme.palette.primary.main, 0.2) }
                  }}
                >
                  <ArrowBackIcon />
                </IconButton>
              </Tooltip>
              <Box>
                <Typography variant="h5" sx={{ fontWeight: 700, color: theme.palette.text.primary }}>
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
                      fontWeight: 600
                    }}
                  />
                  <Chip
                    icon={<CheckCircleIcon sx={{ fontSize: 16 }} />}
                    label={`${allTasks.filter(t => t.status === 'done').length} completed`}
                    size="small"
                    sx={{
                      background: alpha(theme.palette.success.main, 0.1),
                      color: theme.palette.success.main,
                      fontWeight: 600
                    }}
                  />
                </Box>
              </Box>
            </Box>

            {/* Controls */}
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <Tooltip title={isLocked ? 'Unlock timeline for editing' : 'Lock timeline to prevent changes'}>
                <Button
                  variant={isLocked ? 'contained' : 'outlined'}
                  color={isLocked ? 'warning' : 'primary'}
                  size="small"
                  onClick={toggleLock}
                  startIcon={isLocked ? <LockIcon /> : <LockOpenIcon />}
                  sx={{ minWidth: 120, fontWeight: 600 }}
                >
                  {isLocked ? 'Locked' : 'Unlocked'}
                </Button>
              </Tooltip>

              <ButtonGroup size="small" variant="outlined">
                <Tooltip title="Day View">
                  <Button onClick={() => handleViewModeChange('day')} variant={viewMode === 'day' ? 'contained' : 'outlined'}>
                    <TodayIcon fontSize="small" />
                  </Button>
                </Tooltip>
                <Tooltip title="Week View">
                  <Button onClick={() => handleViewModeChange('week')} variant={viewMode === 'week' ? 'contained' : 'outlined'}>
                    <ViewWeekIcon fontSize="small" />
                  </Button>
                </Tooltip>
                <Tooltip title="Month View">
                  <Button onClick={() => handleViewModeChange('month')} variant={viewMode === 'month' ? 'contained' : 'outlined'}>
                    <CalendarMonthIcon fontSize="small" />
                  </Button>
                </Tooltip>
              </ButtonGroup>

              <ButtonGroup size="small" variant="outlined">
                <Tooltip title="Zoom In">
                  <IconButton onClick={handleZoomIn} size="small"><ZoomInIcon /></IconButton>
                </Tooltip>
                <Tooltip title="Zoom Out">
                  <IconButton onClick={handleZoomOut} size="small"><ZoomOutIcon /></IconButton>
                </Tooltip>
              </ButtonGroup>
            </Box>
          </Box>
        </Paper>

        {/* Timeline Container */}
        <Container maxWidth={false} sx={{ py: 3 }}>
          <Paper elevation={2} sx={{ borderRadius: 2, overflow: 'hidden', background: theme.palette.background.paper }}>
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
              lineHeight={MIN_ROW_HEIGHT}
              groupHeights={groupHeights}
              itemHeightRatio={0.75}
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
              timeSteps={{ second: 1, minute: 1, hour: 1, day: 1, month: 1, year: 1 }}
              dragSnap={60 * 60 * 1000}
              onItemDrag={(itemId, dragTime, newGroupOrder) => {
                setIsDragging(true);
                handleItemDrag(itemId, dragTime, newGroupOrder);
              }}
              onItemDrop={() => {
                setIsDragging(false);
                setGroupHeights(computeGroupHeights(items));
              }}
              itemRenderer={itemRenderer}
            >
              <TimelineHeaders className="timeline-headers">
                {/* EXACT same width/position as the sidebar column */}
                <SidebarHeader>
                  {({ getRootProps }) => {
                    const rootProps = getRootProps();     // includes exact computed style/width
                    const baseStyle = rootProps.style || {};
                    return (
                      <div
                        {...rootProps}
                        style={{
                          ...baseStyle,                      // do NOT override width/height/position
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          paddingLeft: 10,                  // same left padding as rows
                          fontWeight: 700,
                          textTransform: 'uppercase',
                          letterSpacing: 0.5,
                          background: theme.palette.mode === 'dark'
                            ? theme.palette.background.default
                            : '#f8fafc',
                          color: theme.palette.text.primary
                        }}
                      >
                        Status
                      </div>
                    );
                  }}
                </SidebarHeader>

                {/* Primary header (weeks/months) */}
                <DateHeader
                  unit="primaryHeader"
                  style={{
                    background: theme.palette.mode === 'dark'
                      ? theme.palette.background.default
                      : '#ffffff',
                    color: theme.palette.text.primary,
                    borderBottom: `1px solid ${theme.palette.divider}`
                  }}
                />

                {/* Secondary header (days) — black cells in dark mode for contrast */}
                <DateHeader
                  unit="day"
                  intervalRenderer={({ getIntervalProps, intervalContext }) => {
                    const baseStyle = getIntervalProps().style || {};
                    const dark = theme.palette.mode === 'dark';
                    const cellStyle = {
                      ...baseStyle,
                      background: dark ? '#000000' : theme.palette.background.paper,
                      color: dark ? theme.palette.common.white : theme.palette.text.primary,
                      borderRight: `1px solid ${theme.palette.divider}`,
                      borderBottom: `1px solid ${theme.palette.divider}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 700,
                      fontSize: 12,
                      padding: '4px 6px',
                      boxSizing: 'border-box'
                    };
                    return (
                      <div {...getIntervalProps({ style: cellStyle })}>
                        <span>{intervalContext.intervalText}</span>
                      </div>
                    );
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
      </Box>
    </AuthenticatedLayout>
  );
}
