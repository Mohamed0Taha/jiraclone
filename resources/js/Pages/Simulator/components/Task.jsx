import React, { useState, useMemo, useEffect } from 'react';
import {
    Card,
    CardContent,
    Stack,
    Typography,
    Chip,
    LinearProgress,
    MenuItem,
    IconButton,
    Tooltip,
    Select,
    FormControl,
    InputLabel,
    Collapse,
    Box,
    Button,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Alert,
    Divider,
    Grid,
} from '@mui/material';
import DoneIcon from '@mui/icons-material/Done';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import SettingsIcon from '@mui/icons-material/Settings';
import SplitscreenIcon from '@mui/icons-material/Splitscreen';
import GroupIcon from '@mui/icons-material/Group';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningIcon from '@mui/icons-material/Warning';

const priorityColor = (p) => ({ High: 'error', Medium: 'warning', Low: 'success' })[p] || 'default';
const statusColor = (s) =>
    ({ Completed: 'success', 'In Progress': 'warning', Pending: 'default', Cancelled: 'error' })[
        s
    ] || 'default';

export default function Task({
    task,
    team,
    onChange,
    defaultExpanded = false,
    highlighted = false,
    highlightColor,
    collapseVersion,
    onTaskAction, // New prop for complex actions
    currentWeek,
    simulationState,
    events = [],
    resolvedEventIds = [],
    onResolveEventAction,
}) {
    const [local, setLocal] = useState(task);
    const [expanded, setExpanded] = useState(defaultExpanded);
    const [actionDialog, setActionDialog] = useState({ open: false, type: null });
    const [actionParams, setActionParams] = useState({});
    const [actionResult, setActionResult] = useState(null);
    
    // If parent later forces expansion (e.g., walkthrough), respond once
    useEffect(() => {
        if (defaultExpanded) setExpanded(true);
    }, [defaultExpanded]);
    // Collapse when collapseVersion changes (week change) unless onboarding forcing expansion
    useEffect(() => {
        if (!defaultExpanded) setExpanded(false);
    }, [collapseVersion]);

    const handleField = (field, value) => {
        const updated = { ...local, [field]: value };
        setLocal(updated);
        onChange && onChange(updated);
    };

    const toggleStatus = () => {
        const order = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
        const idx = order.indexOf(local.status);
        handleField('status', order[(idx + 1) % order.length]);
    };

    const handleAdvancedAction = (actionType) => {
        setActionDialog({ open: true, type: actionType });
        setActionParams({});
        setActionResult(null);
    };

    const executeAdvancedAction = async () => {
        try {
            if (!onTaskAction) {
                setActionResult({ success: false, message: 'Task actions not supported in this context' });
                return;
            }

            const result = await onTaskAction(local.id, actionDialog.type, actionParams);
            setActionResult(result);
            
            if (result.success) {
                // Update task state based on action result
                if (result.taskUpdates) {
                    const updated = { ...local, ...result.taskUpdates };
                    setLocal(updated);
                    onChange && onChange(updated);
                }
                
                // Close dialog after short delay to show success
                setTimeout(() => {
                    setActionDialog({ open: false, type: null });
                    setActionResult(null);
                }, 1500);
            }
        } catch (error) {
            setActionResult({ success: false, message: 'Action failed: ' + error.message });
        }
    };

    const canPerformAction = (actionType) => {
        if (!simulationState) return true;
        
        switch (actionType) {
            case 'split_task':
                return local.estimated_hours > 8 && local.progress < 50;
            case 'add_resources':
                return local.status === 'In Progress' && simulationState.budget > 1000;
            case 'change_scope':
                return local.progress < 30;
            case 'rush_delivery':
                return local.status === 'In Progress' && simulationState.budget > 500;
            case 'request_budget':
                return simulationState.budget < 20000; // Can request if budget is low
            case 'handle_delays':
                return local.status === 'In Progress' || local.status === 'Pending'; // Can handle delays on active tasks
            default:
                return true;
        }
    };

    // Derive active unresolved events impacting this task
    // Centralized event resolution now handled by Command Center component
    const impactingEvents = useMemo(() => [], []);
    return (
        <Card
            variant="outlined"
            sx={{
                borderLeft: 4,
                borderLeftColor: highlighted
                    ? highlightColor || 'info.main'
                    : priorityColor(local.priority) + '.main',
                boxShadow: highlighted ? `0 0 0 2px ${highlightColor || '#0288d1'}` : 'none',
                transition: 'box-shadow 0.25s, border-color 0.25s',
                position: 'relative',
                // Distinct background tint for Task cards (soft warm)
                background: highlighted
                    ? 'linear-gradient(145deg,#fffbe6,#fff3bf)'
                    : 'linear-gradient(145deg,#ffffff,#fafafa)',
                borderColor: highlighted ? 'rgba(255,200,0,0.6)' : 'rgba(0,0,0,0.08)',
                // Maintain consistent dimension & prevent squeezing when many tasks exist
                flexShrink: 0,
                minHeight: expanded ? undefined : 60,
                '::after': highlighted
                    ? {
                          content: '""',
                          position: 'absolute',
                          inset: 0,
                          border: '2px solid',
                          borderColor: highlightColor || 'info.light',
                          borderRadius: 1,
                          pointerEvents: 'none',
                      }
                    : undefined,
            }}
        >
            <CardContent sx={{ py: 0.75, '&:last-child': { pb: 0.75 } }}>
                <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: 50 }}>
                    <IconButton
                        size="small"
                        onClick={() => setExpanded((e) => !e)}
                        aria-label={expanded ? 'collapse' : 'expand'}
                    >
                        {expanded ? (
                            <ExpandLessIcon fontSize="small" />
                        ) : (
                            <ExpandMoreIcon fontSize="small" />
                        )}
                    </IconButton>
                    <Typography
                        variant="body2"
                        fontWeight={600}
                        flex={1}
                        noWrap
                        title={local.title}
                        sx={
                            local.status === 'Cancelled'
                                ? { textDecoration: 'line-through', opacity: 0.6 }
                                : undefined
                        }
                    >
                        {local.title}
                    </Typography>
                    <Stack
                        direction="row"
                        spacing={0.5}
                        alignItems="center"
                        flexWrap="nowrap"
                        sx={{ maxWidth: 360, overflow: 'hidden' }}
                    >
                        <Chip
                            size="small"
                            label={local.priority}
                            color={priorityColor(local.priority)}
                            variant="outlined"
                        />
                        <Chip
                            size="small"
                            label={`${local.progress}%`}
                            color={statusColor(local.status)}
                        />
                        {local.assignee && (
                            <Chip
                                size="small"
                                label={local.assignee}
                                color="info"
                                variant="filled"
                            />
                        )}
                        {local.required_skills && (
                            <Chip size="small" label={local.required_skills[0]} />
                        )}
                    </Stack>
                    <Tooltip title="Cycle Status">
                        <IconButton size="small" onClick={toggleStatus} aria-label="toggle status">
                            {local.status === 'Completed' ? (
                                <DoneIcon fontSize="small" />
                            ) : (
                                <PlayArrowIcon fontSize="small" />
                            )}
                        </IconButton>
                    </Tooltip>
                </Stack>
                <Collapse in={expanded} timeout="auto" unmountOnExit>
                    <Box mt={1.25}>
                        <Stack direction="row" spacing={1} mb={1}>
                            <FormControl size="small" fullWidth>
                                <InputLabel id={`assignee-${local.id}`}>Assignee</InputLabel>
                                <Select
                                    labelId={`assignee-${local.id}`}
                                    label="Assignee"
                                    value={local.assignee || ''}
                                    onChange={(e) => handleField('assignee', e.target.value)}
                                >
                                    <MenuItem value="">
                                        <em>Unassigned</em>
                                    </MenuItem>
                                    {team.map((m) => (
                                        <MenuItem key={m.id} value={m.name}>
                                            {m.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl size="small" fullWidth>
                                <InputLabel id={`priority-${local.id}`}>Priority</InputLabel>
                                <Select
                                    labelId={`priority-${local.id}`}
                                    label="Priority"
                                    value={local.priority}
                                    onChange={(e) => handleField('priority', e.target.value)}
                                >
                                    {['High', 'Medium', 'Low'].map((p) => (
                                        <MenuItem key={p} value={p}>
                                            {p}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>
                        <Stack direction="row" spacing={1} mb={1}>
                            <FormControl size="small" fullWidth>
                                <InputLabel id={`status-${local.id}`}>Status</InputLabel>
                                <Select
                                    labelId={`status-${local.id}`}
                                    label="Status"
                                    value={local.status}
                                    onChange={(e) => handleField('status', e.target.value)}
                                >
                                    {['Pending', 'In Progress', 'Completed', 'Cancelled'].map(
                                        (s) => (
                                            <MenuItem key={s} value={s}>
                                                {s}
                                            </MenuItem>
                                        )
                                    )}
                                </Select>
                            </FormControl>
                            <FormControl size="small" fullWidth>
                                <InputLabel id={`progress-${local.id}`}>Progress %</InputLabel>
                                <Select
                                    labelId={`progress-${local.id}`}
                                    label="Progress %"
                                    value={local.progress}
                                    onChange={(e) =>
                                        handleField('progress', Number(e.target.value))
                                    }
                                >
                                    {[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((p) => (
                                        <MenuItem key={p} value={p}>
                                            {p}%
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Stack>
                        {local.required_skills && (
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                display="block"
                                mb={0.5}
                            >
                                Skills: {local.required_skills.join(', ')}
                            </Typography>
                        )}
                        <Stack spacing={0.25}>
                            <LinearProgress
                                variant="determinate"
                                value={local.progress}
                                sx={{ height: 6, borderRadius: 2 }}
                            />
                            {local.estimated_hours && (
                                <Typography variant="caption" color="text.secondary">
                                    Est: {local.estimated_hours}h • Remaining:{' '}
                                    {local.remaining_hours ?? local.estimated_hours}h
                                </Typography>
                            )}
                        </Stack>

                        {/* Advanced Task Actions */}
                        <Divider sx={{ my: 1 }} />
                        <Typography variant="caption" color="text.secondary" fontWeight={600}>
                            Task Actions
                        </Typography>
                        <Grid container spacing={0.5} sx={{ mt: 0.5 }}>
                            <Grid item xs={6}>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    fullWidth
                                    startIcon={<SplitscreenIcon />}
                                    disabled={!canPerformAction('split_task')}
                                    onClick={() => handleAdvancedAction('split_task')}
                                    sx={{ fontSize: '0.75rem', py: 0.5 }}
                                >
                                    Split Task
                                </Button>
                            </Grid>
                            <Grid item xs={6}>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    fullWidth
                                    startIcon={<GroupIcon />}
                                    disabled={!canPerformAction('add_resources')}
                                    onClick={() => handleAdvancedAction('add_resources')}
                                    sx={{ fontSize: '0.75rem', py: 0.5 }}
                                >
                                    Add Resources
                                </Button>
                            </Grid>
                            <Grid item xs={6}>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    fullWidth
                                    startIcon={<SettingsIcon />}
                                    disabled={!canPerformAction('change_scope')}
                                    onClick={() => handleAdvancedAction('change_scope')}
                                    sx={{ fontSize: '0.75rem', py: 0.5 }}
                                >
                                    Change Scope
                                </Button>
                            </Grid>
                            <Grid item xs={6}>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    fullWidth
                                    startIcon={<TrendingUpIcon />}
                                    disabled={!canPerformAction('rush_delivery')}
                                    onClick={() => handleAdvancedAction('rush_delivery')}
                                    sx={{ fontSize: '0.75rem', py: 0.5 }}
                                >
                                    Rush Delivery
                                </Button>
                            </Grid>
                            <Grid item xs={6}>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    fullWidth
                                    startIcon={<AccessTimeIcon />}
                                    disabled={!canPerformAction('request_budget')}
                                    onClick={() => handleAdvancedAction('request_budget')}
                                    sx={{ fontSize: '0.75rem', py: 0.5 }}
                                >
                                    Request Budget
                                </Button>
                            </Grid>
                            <Grid item xs={6}>
                                <Button
                                    size="small"
                                    variant="outlined"
                                    fullWidth
                                    startIcon={<WarningIcon />}
                                    disabled={!canPerformAction('handle_delays')}
                                    onClick={() => handleAdvancedAction('handle_delays')}
                                    sx={{ fontSize: '0.75rem', py: 0.5 }}
                                >
                                    Handle Delays
                                </Button>
                            </Grid>
                        </Grid>

                        {/* Risk Indicators */}
                        {(local.progress > 80 || local.remaining_hours > local.estimated_hours * 1.2) && (
                            <Alert 
                                severity="warning" 
                                sx={{ mt: 1 }}
                                icon={<WarningIcon />}
                            >
                                {local.progress > 80 ? 'Task nearing completion - limited action options' : 
                                 'Task behind schedule - consider taking action'}
                            </Alert>
                        )}
                        {/* Event impacts removed from task card to increase challenge; view & resolve via Command Center */}
                    </Box>
                </Collapse>
            </CardContent>

            {/* Advanced Action Dialog */}
            <Dialog 
                open={actionDialog.open} 
                onClose={() => setActionDialog({ open: false, type: null })}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>
                    {actionDialog.type === 'split_task' && 'Split Task'}
                    {actionDialog.type === 'add_resources' && 'Add Resources'}
                    {actionDialog.type === 'change_scope' && 'Change Scope'}
                    {actionDialog.type === 'rush_delivery' && 'Rush Delivery'}
                    {actionDialog.type === 'request_budget' && 'Request Additional Budget'}
                    {actionDialog.type === 'handle_delays' && 'Handle External Delays'}
                </DialogTitle>
                <DialogContent>
                    {actionResult && (
                        <Alert 
                            severity={actionResult.success ? 'success' : 'error'} 
                            sx={{ mb: 2 }}
                        >
                            {actionResult.message}
                        </Alert>
                    )}

                    {actionDialog.type === 'split_task' && (
                        <Stack spacing={2}>
                            <Typography variant="body2" color="text.secondary">
                                Split this task into multiple smaller tasks for better management and parallel execution.
                            </Typography>
                            <TextField
                                label="Number of Sub-tasks"
                                type="number"
                                size="small"
                                value={actionParams.subtaskCount || 2}
                                onChange={(e) => setActionParams({...actionParams, subtaskCount: parseInt(e.target.value)})}
                                inputProps={{ min: 2, max: 5 }}
                            />
                            <TextField
                                label="Split Strategy"
                                select
                                size="small"
                                value={actionParams.splitStrategy || 'by_feature'}
                                onChange={(e) => setActionParams({...actionParams, splitStrategy: e.target.value})}
                            >
                                <MenuItem value="by_feature">By Feature</MenuItem>
                                <MenuItem value="by_complexity">By Complexity</MenuItem>
                                <MenuItem value="by_skill">By Skill Requirement</MenuItem>
                            </TextField>
                        </Stack>
                    )}

                    {actionDialog.type === 'add_resources' && (
                        <Stack spacing={2}>
                            <Typography variant="body2" color="text.secondary">
                                Add additional team members or external resources to accelerate task completion.
                            </Typography>
                            <TextField
                                label="Additional Team Members"
                                type="number"
                                size="small"
                                value={actionParams.additionalMembers || 1}
                                onChange={(e) => setActionParams({...actionParams, additionalMembers: parseInt(e.target.value)})}
                                inputProps={{ min: 1, max: 3 }}
                            />
                            <TextField
                                label="Resource Type"
                                select
                                size="small"
                                value={actionParams.resourceType || 'internal'}
                                onChange={(e) => setActionParams({...actionParams, resourceType: e.target.value})}
                            >
                                <MenuItem value="internal">Internal Team Member</MenuItem>
                                <MenuItem value="contractor">External Contractor</MenuItem>
                                <MenuItem value="consultant">Subject Matter Expert</MenuItem>
                            </TextField>
                            <Typography variant="caption" color="warning.main">
                                Estimated additional cost: ${(actionParams.additionalMembers || 1) * (actionParams.resourceType === 'internal' ? 2000 : 5000)}
                            </Typography>
                        </Stack>
                    )}

                    {actionDialog.type === 'change_scope' && (
                        <Stack spacing={2}>
                            <Typography variant="body2" color="text.secondary">
                                Modify the task scope to adjust effort, timeline, or deliverables.
                            </Typography>
                            <TextField
                                label="Scope Change"
                                select
                                size="small"
                                value={actionParams.scopeChange || 'reduce'}
                                onChange={(e) => setActionParams({...actionParams, scopeChange: e.target.value})}
                            >
                                <MenuItem value="reduce">Reduce Scope (-25% effort)</MenuItem>
                                <MenuItem value="expand">Expand Scope (+40% effort)</MenuItem>
                                <MenuItem value="refocus">Refocus Priorities</MenuItem>
                            </TextField>
                            <TextField
                                label="Justification"
                                multiline
                                rows={2}
                                size="small"
                                value={actionParams.justification || ''}
                                onChange={(e) => setActionParams({...actionParams, justification: e.target.value})}
                                placeholder="Explain the reason for scope change..."
                            />
                        </Stack>
                    )}

                    {actionDialog.type === 'rush_delivery' && (
                        <Stack spacing={2}>
                            <Typography variant="body2" color="text.secondary">
                                Accelerate task delivery through overtime, additional resources, or quality trade-offs.
                            </Typography>
                            <TextField
                                label="Rush Strategy"
                                select
                                size="small"
                                value={actionParams.rushStrategy || 'overtime'}
                                onChange={(e) => setActionParams({...actionParams, rushStrategy: e.target.value})}
                            >
                                <MenuItem value="overtime">Team Overtime (+50% cost)</MenuItem>
                                <MenuItem value="parallel">Parallel Development (+30% risk)</MenuItem>
                                <MenuItem value="mvp">Deliver MVP First</MenuItem>
                            </TextField>
                            <TextField
                                label="Target Completion"
                                type="number"
                                size="small"
                                value={actionParams.targetWeeks || Math.max(1, (currentWeek || 1) + 1)}
                                onChange={(e) => setActionParams({...actionParams, targetWeeks: parseInt(e.target.value)})}
                                inputProps={{ min: currentWeek || 1, max: (currentWeek || 1) + 4 }}
                                helperText="Week number for completion"
                            />
                        </Stack>
                    )}

                    {actionDialog.type === 'request_budget' && (
                        <Stack spacing={2}>
                            <Typography variant="body2" color="text.secondary">
                                Request additional budget allocation to accelerate critical path and add specialist capacity.
                            </Typography>
                            <TextField
                                label="Budget Amount Requested"
                                type="number"
                                size="small"
                                value={actionParams.budgetAmount || 10000}
                                onChange={(e) => setActionParams({...actionParams, budgetAmount: parseInt(e.target.value)})}
                                inputProps={{ min: 5000, max: 25000, step: 1000 }}
                                helperText="Amount in USD"
                            />
                            <TextField
                                label="Justification"
                                multiline
                                rows={2}
                                size="small"
                                value={actionParams.justification || ''}
                                onChange={(e) => setActionParams({...actionParams, justification: e.target.value})}
                                placeholder="Explain why additional budget is needed..."
                            />
                            <Typography variant="caption" color="info.main">
                                Higher amounts may require executive approval but provide greater acceleration.
                            </Typography>
                        </Stack>
                    )}

                    {actionDialog.type === 'handle_delays' && (
                        <Stack spacing={2}>
                            <Typography variant="body2" color="text.secondary">
                                Address external dependencies and vendor delays that are impacting this task.
                            </Typography>
                            <TextField
                                label="Delay Mitigation Strategy"
                                select
                                size="small"
                                value={actionParams.delayStrategy || 'expedite'}
                                onChange={(e) => setActionParams({...actionParams, delayStrategy: e.target.value})}
                            >
                                <MenuItem value="expedite">Pay Expedited Fee</MenuItem>
                                <MenuItem value="parallel">Start Parallel Contingency</MenuItem>
                                <MenuItem value="absorb">Absorb Delay (Extend Timeline)</MenuItem>
                                <MenuItem value="reschedule">Reschedule Dependencies</MenuItem>
                            </TextField>
                            <TextField
                                label="Expected Cost Impact"
                                type="number"
                                size="small"
                                value={actionParams.costImpact || 1200}
                                onChange={(e) => setActionParams({...actionParams, costImpact: parseInt(e.target.value)})}
                                inputProps={{ min: 0, max: 5000, step: 100 }}
                                helperText="Additional cost for mitigation"
                            />
                        </Stack>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button 
                        onClick={() => setActionDialog({ open: false, type: null })}
                        disabled={!!actionResult?.success}
                    >
                        Cancel
                    </Button>
                    <Button 
                        onClick={executeAdvancedAction}
                        variant="contained"
                        disabled={!!actionResult}
                    >
                        Execute Action
                    </Button>
                </DialogActions>
            </Dialog>
            {/* Per-task event resolution dialog removed */}
        </Card>
    );
}
