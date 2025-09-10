import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button as MUIButton,
    Typography,
    Box,
    Paper,
    LinearProgress,
    Tooltip,
    IconButton,
} from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import CelebrationIcon from '@mui/icons-material/Celebration';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import QueryBuilderIcon from '@mui/icons-material/QueryBuilder';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HandshakeIcon from '@mui/icons-material/Handshake';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import PublicLayout from '@/Layouts/PublicLayout';
import Team from './components/Team';
import Tasks from './components/Tasks';
import Events from './components/Events';
// CommandCenter removed; event resolution now handled inline within Events component
import {
    Dialog as MuiDialog,
    DialogTitle as MuiDialogTitle,
    DialogContent as MuiDialogContent,
    DialogActions as MuiDialogActions,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
} from '@mui/material';

export default function Index({ auth, simulation, certificationAttempt }) {
    const totalWeeks = simulation?.project?.total_weeks || 10;
    const [currentWeek, setCurrentWeek] = useState(1);
    const [projectWeeks] = useState(totalWeeks);
    // Collapse signal for tasks (increments each week)
    const [collapseVersion, setCollapseVersion] = useState(0);
    // Track resolved events so they disappear once handled (button or related task update)
    const [resolvedEventIds, setResolvedEventIds] = useState([]);

    // Action results and feedback tracking
    const [actionResults, setActionResults] = useState([]); // Store all action results for scoring
    const [totalScore, setTotalScore] = useState(0);
    const [actionCount, setActionCount] = useState(0);

    // Initialize data from simulation prop
    const project = simulation?.project;
    const baseEvents = simulation?.events || [];
    const [dynamicEvents, setDynamicEvents] = useState([]); // synthetic follow-up / injected events
    const allEvents = useMemo(() => [...baseEvents, ...dynamicEvents], [baseEvents, dynamicEvents]);

    // Local mutable state copies so user interactions can mutate
    const [tasks, setTasks] = useState(() => simulation?.tasks || []);
    const [team, setTeam] = useState(() =>
        (simulation?.team || []).map((m) => ({ ...m, morale: m.morale ?? 70 }))
    );

    // Budget normalization: fix existing simulations with high task budgets
    useEffect(() => {
        setTasks((prevTasks) =>
            prevTasks.map((task) => {
                // If task budget is > 500, normalize it to reasonable levels
                if ((task.budget || 0) > 500) {
                    const normalizedBudget = Math.min(400, (task.estimated_hours || 6) * 50);
                    console.log(
                        `Normalizing task "${task.title}" budget from ${task.budget} to ${normalizedBudget}`
                    );
                    return { ...task, budget: normalizedBudget };
                }
                return task;
            })
        );
    }, []); // Only run once on mount

    // Activity log (must be declared before any callbacks that use logAction)
    const [activityLog, setActivityLog] = useState([]);
    const logAction = useCallback(
        (label) => setActivityLog((l) => [{ id: Date.now(), label }, ...l.slice(0, 6)]),
        []
    );

    // Helper to resolve events by predicate after generic user actions (task changes etc.)
    // MOVED EARLY to avoid temporal dead zone in useEffect
    const attemptPassiveResolutions = useCallback(
        (updatedTasks = tasks) => {
            setResolvedEventIds((prev) => {
                let add = [];
                const unresolved = allEvents.filter((e) => !prev.includes(e.id));
                for (const ev of unresolved) {
                    switch (ev.action_type) {
                        case 'scope_creep':
                            // resolve when affected task estimate increased beyond original OR remaining hours are high OR progress indicates expansion
                            if (ev.task_ids?.length) {
                                const t = updatedTasks.find((tk) => tk.id === ev.task_ids[0]);
                                if (t && t.original_estimate) {
                                    // Multiple ways to detect scope increase:
                                    // 1. Direct estimate increase
                                    // 2. High remaining hours relative to progress
                                    // 3. Task shows signs of expansion (remaining_hours field)
                                    // 4. Task is in progress with expanded scope indicators
                                    const estimateIncreased =
                                        t.estimated_hours > t.original_estimate;
                                    const hasHighRemainingHours =
                                        t.remaining_hours &&
                                        t.remaining_hours > t.original_estimate * 0.8;
                                    const lowProgressHighEffort =
                                        t.progress < 50 &&
                                        (t.estimated_hours || t.remaining_hours || 0) >
                                            t.original_estimate;
                                    const inProgressWithExpansion =
                                        t.status === 'In Progress' &&
                                        t.progress > 0 &&
                                        t.remaining_hours > t.original_estimate * 0.5;

                                    if (
                                        estimateIncreased ||
                                        hasHighRemainingHours ||
                                        lowProgressHighEffort ||
                                        inProgressWithExpansion
                                    ) {
                                        add.push(ev.id);
                                    }
                                } else if (t && t.status === 'In Progress' && t.progress >= 20) {
                                    // Fallback: if no original estimate but task is progressing, consider scope handled
                                    add.push(ev.id);
                                }
                            }
                            break;
                        case 'vendor_delay':
                            // resolve if timeline was adjusted (effects applied) OR user set impacted task status back to Pending (re-planned)
                            // OR if the handle_delays action was used (handled in task action now)
                            if (ev.task_ids?.length) {
                                const t = updatedTasks.find((tk) => tk.id === ev.task_ids[0]);
                                if (t && (t.status === 'Pending' || t.delay_handled))
                                    add.push(ev.id);
                            }
                            break;
                        case 'quality_issue':
                            // resolve when progress reduced (refactor) or task moved to In Progress from Pending
                            if (ev.task_ids?.length) {
                                const t = updatedTasks.find((tk) => tk.id === ev.task_ids[0]);
                                if (t && (t.progress < 5 || t.status === 'In Progress'))
                                    add.push(ev.id);
                            }
                            break;
                        case 'budget_request':
                            // resolved only via explicit option (backend) or via task request_budget action; skip passive
                            break;
                        case 'funding_injection':
                            // same as budget_request
                            break;
                        case 'technical_debt':
                            if (ev.task_ids?.length) {
                                const t = updatedTasks.find((tk) => tk.id === ev.task_ids[0]);
                                if (
                                    t &&
                                    t.progress < 90 &&
                                    t.progress >= 0 &&
                                    t.status === 'In Progress'
                                )
                                    add.push(ev.id);
                            }
                            break;
                        case 'add_task':
                            // resolve if a new task with similar title exists (simple contains check)
                            if (tasks.some((tk) => /Compliance/i.test(tk.title))) add.push(ev.id);
                            break;
                        case 'team_conflict':
                            // resolve when at least one conflicting member removed from task_ids or reassigned (no tasks shared)
                            if (ev.member_ids?.length) {
                                const shared = updatedTasks.filter(
                                    (t) =>
                                        t.assignee &&
                                        ev.member_ids.includes(t.assignee_id || t.assignee)
                                );
                                if (shared.length === 0) add.push(ev.id);
                            }
                            break;
                        case 'attrition':
                            // resolve only via explicit option or member removed
                            break;
                        case 'standup':
                            // standups should auto-resolve when week advances or when standup action is taken
                            if ((ev.trigger_week || 0) < currentWeek) add.push(ev.id);
                            break;
                        case 'morale_slump':
                            // resolve when team morale improves (any team member morale goes above 70)
                            if (team.some((member) => (member.morale || 70) > 70)) add.push(ev.id);
                            break;
                        case 'budget_cut':
                            // resolved only via explicit action (scope reduction, task deferral, timeline extension)
                            break;
                        case 'member_sickness':
                            // resolved only via explicit action (hire temp, redistribute, delay)
                            break;
                        case 'member_demands':
                            // resolved only via explicit action (approve, bonus, decline)
                            break;
                        default:
                            // Fallback: resolve any unhandled event types after 2 weeks
                            if ((ev.trigger_week || 0) <= currentWeek - 2) {
                                add.push(ev.id);
                                logAction(`Auto-resolved lingering event: ${ev.title}`);
                            }
                            break;
                    }
                }
                if (!add.length) return prev;
                return [...prev, ...add.filter((i) => !prev.includes(i))];
            });
        },
        [allEvents, tasks, currentWeek, team, logAction]
    );

    // Trigger passive resolutions whenever tasks change
    useEffect(() => {
        attemptPassiveResolutions();
    }, [tasks, attemptPassiveResolutions]);

    // Event resolution functions (basic one defined early, complex one deferred)
    const resolveEvent = useCallback(
        (id) => setResolvedEventIds((prev) => (prev.includes(id) ? prev : [...prev, id])),
        []
    );

    // Force resolve all remaining events (emergency resolution) - defined after allEvents is available
    const resolveAllEvents = useCallback(() => {
        const unresolvedIds = allEvents
            .filter((e) => (e.trigger_week || 0) <= currentWeek && !resolvedEventIds.includes(e.id))
            .map((e) => e.id);
        if (unresolvedIds.length > 0) {
            setResolvedEventIds((prev) => [...prev, ...unresolvedIds]);
            logAction(`Force-resolved ${unresolvedIds.length} remaining events`);
        }
    }, [allEvents, currentWeek, resolvedEventIds, logAction]);

    // Debug function to manually trigger passive resolution with logging
    const debugPassiveResolution = useCallback(() => {
        console.log('=== DEBUG: Attempting Passive Resolution ===');
        const unresolved = allEvents.filter((e) => !resolvedEventIds.includes(e.id));
        console.log('Unresolved events:', unresolved);

        unresolved.forEach((ev) => {
            if (ev.action_type === 'scope_creep' && ev.task_ids?.length) {
                const t = tasks.find((tk) => tk.id === ev.task_ids[0]);
                console.log(`Scope creep event ${ev.id}:`, {
                    task: t,
                    original_estimate: t?.original_estimate,
                    estimated_hours: t?.estimated_hours,
                    remaining_hours: t?.remaining_hours,
                    progress: t?.progress,
                });
            }
        });

        attemptPassiveResolutions();
    }, [allEvents, resolvedEventIds, tasks, attemptPassiveResolutions]);

    // ===== Budget Helpers & State (moved early to avoid temporal dead zone in callbacks) =====
    // Sum spent budget across non-cancelled tasks
    const calcSpent = useCallback(
        (ts) =>
            ts
                .filter((t) => t.status !== 'Cancelled')
                .reduce((sum, t) => sum + ((t.budget || 0) * (t.progress || 0)) / 100, 0),
        []
    );
    const totalBudget = project?.constraints?.budget || 0;
    const [remainingBudget, setRemainingBudget] = useState(totalBudget); // logical remaining
    const [displayedBudget, setDisplayedBudget] = useState(totalBudget); // animated display value
    useEffect(() => {
        setRemainingBudget(
            Math.max(
                0,
                totalBudget - calcSpent(tasks) - overheadCostsRef.current + adjustmentsRef.current
            )
        );
    }, [tasks, totalBudget, calcSpent]);
    // Budget / cost tracking refs (declare early so callbacks can capture safely)
    const adjustmentsRef = useRef(0); // savings or extra spend adjustments
    const overheadCostsRef = useRef(0);
    // Placeholder for coin burst (real implementation assigned later)
    const spawnCoinBurstRef = useRef(null);
    const spawnCoinBurst = useCallback((...args) => {
        if (typeof spawnCoinBurstRef.current === 'function') {
            return spawnCoinBurstRef.current(...args);
        }
    }, []);

    // Check if simulation was completed (stored in sessionStorage to persist across navigation)
    const [simulationCompleted, setSimulationCompleted] = useState(() => {
        try {
            return sessionStorage.getItem('simulationCompleted') === 'true';
        } catch {
            return false;
        }
    });

    // Only show current week events (prior weeks drop off UI per requirement)
    const visibleEvents = useMemo(
        () =>
            allEvents.filter(
                (e) => (e.trigger_week || 0) === currentWeek && !resolvedEventIds.includes(e.id)
            ),
        [allEvents, currentWeek, resolvedEventIds]
    );

    // Debug: Log all events to help identify scheduling
    useEffect(() => {
        if (allEvents.length > 0) {
            console.log('All events in simulation:');
            console.table(
                allEvents.map((e) => ({
                    id: e.id,
                    title: e.title,
                    type: e.type,
                    action_type: e.action_type,
                    trigger_week: e.trigger_week,
                    severity: e.severity,
                    current_week: currentWeek,
                    visible:
                        (e.trigger_week || 0) === currentWeek && !resolvedEventIds.includes(e.id),
                }))
            );
        }
    }, [allEvents, currentWeek, resolvedEventIds]);

    // Performance: limit how many event cards render initially
    const [showAllEvents, setShowAllEvents] = useState(false);
    const LIMITED_EVENT_COUNT = 12; // render cap to prevent large re-render cost
    const eventsForRender = useMemo(() => {
        if (showAllEvents) return visibleEvents;
        return visibleEvents.slice(0, LIMITED_EVENT_COUNT);
    }, [visibleEvents, showAllEvents]);

    // Highlighted tasks (from event selection)
    const [highlightedTaskIds, setHighlightedTaskIds] = useState([]);
    const [highlightColorMap, setHighlightColorMap] = useState({}); // taskId => color string
    const [selectedEventId, setSelectedEventId] = useState(null);

    // Derive week-adjusted team availability from events (e.g., sickness morale etc.)
    const baseTeam = team; // base team now dynamic
    const weekAdjustedTeam = useMemo(() => {
        if (!baseTeam.length) return [];
        const weekEvents = allEvents.filter((e) => e.trigger_week === currentWeek);
        return baseTeam.map((m) => {
            let clone = { ...m };
            // Sickness: member unavailable this week (capacity -> 0 visually via workload)
            const sick = weekEvents.find(
                (ev) => ev.type === 'Member Sickness' && (ev.member_ids || []).includes(m.id)
            );
            if (sick) {
                clone.status = 'Unavailable';
                clone.workload = 0;
            }
            // Morale shift affecting specific member (simple +/-10% workload visual)
            const morale = weekEvents.find(
                (ev) => ev.type === 'Morale' && (ev.member_ids || []).includes(m.id)
            );
            if (morale && !sick) {
                const delta = morale.id % 2 === 0 ? 10 : -10;
                clone.workload = Math.min(100, Math.max(5, (clone.workload || 50) + delta));
                clone.status = delta > 0 ? 'Active' : 'Busy';
            }
            return clone;
        });
    }, [baseTeam, allEvents, currentWeek]);

    const palette = [
        '#1976d2',
        '#2e7d32',
        '#ed6c02',
        '#9c27b0',
        '#d81b60',
        '#00838f',
        '#ef6c00',
        '#6d4c41',
    ];
    const handleEventSelect = useCallback((event) => {
        if (event?.task_ids?.length) {
            const colorMap = {};
            event.task_ids.forEach((tid, idx) => {
                colorMap[tid] = palette[idx % palette.length];
            });
            setHighlightColorMap(colorMap);
            setHighlightedTaskIds(event.task_ids);
            setSelectedEventId(event.id);
        } else {
            setHighlightColorMap({});
            setHighlightedTaskIds([]);
            setSelectedEventId(event?.id || null);
        }
    }, []);

    const clearHighlights = useCallback(() => {
        setHighlightedTaskIds([]);
        setHighlightColorMap({});
        setSelectedEventId(null);
    }, []);

    // Follow-up & trade-off analytics state
    const [pendingFollowUps, setPendingFollowUps] = useState([]); // {token,dueWeek}
    const [tradeoffStats, setTradeoffStats] = useState({
        budget_spent: 0,
        budget_gained: 0,
        morale_up: 0,
        morale_down: 0,
        risk_up: 0,
        risk_down: 0,
        velocity_up: 0,
        velocity_down: 0,
        timeline_up: 0,
        timeline_down: 0,
        actions: 0,
    });

    // Complex action handling for new event system
    const handleComplexAction = useCallback(
        (event, action, evaluation, backendEffects = null) => {
            // Store the action result for scoring
            setActionResults((prev) => [
                ...prev,
                {
                    eventId: event.id,
                    action,
                    evaluation,
                    week: currentWeek,
                    timestamp: Date.now(),
                },
            ]);

            // Update total score and count
            setActionCount((prev) => prev + 1);
            setTotalScore((prev) => prev + evaluation.overall_score);

            // Schedule follow-up if chosen option includes follow_up token
            const chosen = event.resolution_options?.find(
                (o) => (o.key || o.id) === action.resolution_option
            );
            if (chosen?.follow_up) {
                const m = /(\d+)\s*week/i.exec(chosen.follow_up);
                const offset = m ? parseInt(m[1], 10) : 2;
                setPendingFollowUps((prev) => [
                    ...prev,
                    { token: chosen.follow_up, dueWeek: currentWeek + offset },
                ]);
            }

            // Apply backend effects if available, otherwise use frontend logic
            if (backendEffects) {
                applyBackendEffects(backendEffects);
            } else {
                // Apply specific event resolutions based on event type and chosen action
                applySpecificEventResolution(event, action, evaluation);
            }

            // Capture trade-offs
            const eff = backendEffects || evaluation.metrics_impact || {};
            setTradeoffStats((prev) => {
                const next = { ...prev };
                if (eff.budget_delta) {
                    eff.budget_delta < 0
                        ? (next.budget_spent += Math.abs(eff.budget_delta))
                        : (next.budget_gained += eff.budget_delta);
                }
                if (eff.team_morale_change) {
                    eff.team_morale_change > 0
                        ? (next.morale_up += eff.team_morale_change)
                        : (next.morale_down += Math.abs(eff.team_morale_change));
                }
                if (eff.quality_risk_delta) {
                    eff.quality_risk_delta > 0
                        ? (next.risk_up += eff.quality_risk_delta)
                        : (next.risk_down += Math.abs(eff.quality_risk_delta));
                }
                if (eff.velocity_delta_pct) {
                    eff.velocity_delta_pct > 0
                        ? (next.velocity_up += eff.velocity_delta_pct)
                        : (next.velocity_down += Math.abs(eff.velocity_delta_pct));
                }
                if (eff.timeline_delta) {
                    eff.timeline_delta > 0
                        ? (next.timeline_up += eff.timeline_delta)
                        : (next.timeline_down += Math.abs(eff.timeline_delta));
                }
                next.actions += 1;
                return next;
            });

            // Log the action
            logAction(
                `Resolved ${event.type}: ${event.title} (Score: ${evaluation.overall_score})`
            );

            // Provide visual feedback
            if (evaluation.overall_score >= 85) {
                spawnCoinBurst(evaluation.overall_score, { x: window.innerWidth / 2, y: 100 });
            }
            // Note: applyBackendEffects & applySpecificEventResolution defined later; excluding from deps to avoid TDZ.
        },
        [currentWeek]
    );

    // Unified evaluator for resolving event options using existing backend endpoint
    const evaluateEventResolution = useCallback(
        async (event, optionKey, notes = '') => {
            try {
                const response = await fetch('/simulator/evaluate-action', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN':
                            document
                                .querySelector('meta[name="csrf-token"]')
                                ?.getAttribute('content') || '',
                    },
                    body: JSON.stringify({
                        event_id: event.id,
                        event,
                        resolution_option: optionKey,
                        notes,
                        game_state: {
                            remaining_budget: remainingBudget,
                            team_utilization: team.length
                                ? team.reduce((s, m) => s + (m.workload || 50), 0) /
                                  (team.length * 100)
                                : 0.5,
                            team_morale_avg: team.length
                                ? team.reduce((s, m) => s + (m.morale || 70), 0) / team.length
                                : 70,
                            timeline_buffer_weeks: Math.max(0, projectWeeks - currentWeek),
                            current_week: currentWeek,
                        },
                        week: currentWeek,
                    }),
                });
                const data = await response.json();
                if (data.success) {
                    handleComplexAction(
                        event,
                        { resolution_option: optionKey },
                        data.evaluation,
                        data.effects
                    );
                    resolveEvent(event.id);
                    return { success: true, evaluation: data.evaluation, effects: data.effects };
                }
                return { success: false, message: data.message || 'Evaluation failed' };
            } catch (e) {
                return { success: false, message: e.message };
            }
        },
        [remainingBudget, team, projectWeeks, currentWeek, handleComplexAction, resolveEvent]
    );

    // Apply backend-provided effects (more accurate than frontend guessing)
    const applyBackendEffects = useCallback(
        (effects) => {
            if (!effects || Object.keys(effects).length === 0) return; // nothing to do
            // Avoid noisy logs in production; only log significant changes
            if (
                effects.task_updates ||
                effects.team_updates ||
                effects.budget_change ||
                effects.timeline_change
            ) {
                console.debug('Applying backend effects summary', {
                    taskUpdates: effects.task_updates
                        ? Object.keys(effects.task_updates).length
                        : 0,
                    teamUpdates: effects.team_updates
                        ? Object.keys(effects.team_updates).length
                        : 0,
                    budget: effects.budget_change,
                    timeline: effects.timeline_change,
                });
            }

            // Apply task updates
            if (effects.task_updates && Object.keys(effects.task_updates).length > 0) {
                setTasks((prev) =>
                    prev.map((task) => {
                        const updates = effects.task_updates[task.id];
                        if (updates) {
                            const updatedTask = { ...task };
                            // Capture original estimate once
                            if (!updatedTask.original_estimate && updatedTask.estimated_hours) {
                                updatedTask.original_estimate = updatedTask.estimated_hours;
                            }

                            // Apply specific status changes (key improvement!)
                            if (updates.status) {
                                updatedTask.status = updates.status;
                                console.log(`Task ${task.id} status changed to: ${updates.status}`);
                            }

                            // Apply progress changes with smart handling
                            if (updates.progress_boost) {
                                updatedTask.progress = Math.min(
                                    100,
                                    (task.progress || 0) + updates.progress_boost
                                );
                            }
                            if (updates.progress === 'reduced_by_30_percent') {
                                updatedTask.progress = Math.max(0, (task.progress || 0) * 0.7);
                            }

                            // Apply effort adjustments
                            if (updates.estimated_hours === 'increased_by_40_hours') {
                                updatedTask.estimated_hours = (task.estimated_hours || 0) + 40;
                            } else if (typeof updates.estimated_hours === 'number') {
                                updatedTask.estimated_hours = updates.estimated_hours;
                            } else if (
                                typeof updates.estimated_hours === 'string' &&
                                updates.estimated_hours.startsWith('increased_by_') &&
                                updates.estimated_hours.endsWith('_percent')
                            ) {
                                const m = /increased_by_(\d+)_percent/.exec(
                                    updates.estimated_hours
                                );
                                if (m) {
                                    const pct = parseInt(m[1], 10);
                                    updatedTask.estimated_hours = Math.round(
                                        (updatedTask.estimated_hours || task.estimated_hours || 0) *
                                            (1 + pct / 100)
                                    );
                                }
                            }
                            if (updates.estimated_hours === 'increased_by_20_percent') {
                                updatedTask.estimated_hours = Math.floor(
                                    (task.estimated_hours || 0) * 1.2
                                );
                            }
                            if (updates.estimated_hours === 'increased_by_30_percent') {
                                updatedTask.estimated_hours = Math.floor(
                                    (task.estimated_hours || 0) * 1.3
                                );
                            }
                            if (updates.estimated_hours === 'increased_by_50_percent') {
                                updatedTask.estimated_hours = Math.floor(
                                    (task.estimated_hours || 0) * 1.5
                                );
                            }

                            // Apply priority changes
                            if (updates.priority) {
                                updatedTask.priority = updates.priority;
                            }

                            // Apply assignee changes with smart resolution
                            if (updates.assignee === 'skill_expert') {
                                // Find team member with best skills for this task
                                const taskSkills = task.required_skills || ['General'];
                                const expert = team.find(
                                    (m) =>
                                        taskSkills.some((skill) =>
                                            (m.skills || []).includes(skill)
                                        ) && (m.morale || 70) > 50
                                );
                                updatedTask.assignee = expert ? expert.name : task.assignee;
                            } else if (updates.assignee === 'neutral_member') {
                                // Find neutral team member not involved in conflict
                                const conflictMemberIds = effects.event?.member_ids || [];
                                const neutralMember = team.find(
                                    (m) =>
                                        !conflictMemberIds.includes(m.id) && (m.morale || 70) > 60
                                );
                                updatedTask.assignee = neutralMember
                                    ? neutralMember.name
                                    : task.assignee;
                            } else if (updates.assignee) {
                                updatedTask.assignee = updates.assignee;
                            }

                            // Apply all other updates
                            Object.keys(updates).forEach((key) => {
                                if (
                                    ![
                                        'progress_boost',
                                        'progress',
                                        'estimated_hours',
                                        'priority',
                                        'assignee',
                                    ].includes(key)
                                ) {
                                    updatedTask[key] = updates[key];
                                }
                            });

                            return updatedTask;
                        }
                        return task;
                    })
                );
                // After applying task updates, re-run passive resolution checks
                setTimeout(() => attemptPassiveResolutions(), 0);
            }

            // Create new tasks if specified by effects
            if (effects.new_tasks && effects.new_tasks.length > 0) {
                const newTasks = effects.new_tasks.map((taskTemplate) => ({
                    ...taskTemplate,
                    id: Date.now() + Math.random(),
                    assignee: null,
                    progress: 0,
                    created_by_event: true,
                    created_week: currentWeek,
                }));

                setTasks((prev) => [...prev, ...newTasks]);
                logAction(`Created ${newTasks.length} new task(s) from event resolution`);
            }

            // Apply team updates
            if (effects.team_updates && Object.keys(effects.team_updates).length > 0) {
                setTeam((prev) =>
                    prev.map((member) => {
                        const updates = effects.team_updates[member.id];
                        if (updates) {
                            const updatedMember = { ...member };

                            if (updates.morale_change) {
                                updatedMember.morale = Math.min(
                                    100,
                                    Math.max(0, (member.morale || 70) + updates.morale_change)
                                );
                            }

                            // Apply workload changes
                            if (updates.workload) {
                                updatedMember.workload = updates.workload;
                            }

                            // Apply other updates
                            Object.keys(updates).forEach((key) => {
                                if (!['morale_change', 'workload'].includes(key)) {
                                    updatedMember[key] = updates[key];
                                }
                            });

                            return updatedMember;
                        }
                        return member;
                    })
                );
            }

            // Apply budget changes (support legacy budget_change and new budget_delta key)
            if (effects.budget_change || effects.budget_delta) {
                const delta = effects.budget_change || effects.budget_delta;
                adjustmentsRef.current += delta;
                spawnCoinBurst(delta);
                setRemainingBudget(
                    Math.max(
                        0,
                        totalBudget -
                            calcSpent(tasks) -
                            overheadCostsRef.current +
                            adjustmentsRef.current
                    )
                );
            }

            // Apply timeline changes
            if (effects.timeline_change) {
                // Could extend project timeline or add buffer
                logAction(`Timeline adjusted by ${effects.timeline_change} weeks`);
            }

            // Log applied effects
            if (effects.applied_effects && effects.applied_effects.length > 0) {
                effects.applied_effects.forEach((effect) => logAction(effect));
            }
            // Member reassignment / departure hints
            if (effects.member_reassign_from) {
                setTasks((prev) =>
                    prev.map((t) => {
                        const member = team.find((m) => m.id === effects.member_reassign_from);
                        if (member && t.assignee === member.name) {
                            return {
                                ...t,
                                assignee: null,
                                status: t.status === 'In Progress' ? 'Pending' : t.status,
                                reassignment_needed: true,
                            };
                        }
                        return t;
                    })
                );
                logAction('Tasks require reassignment from flagged member');
            }
            if (effects.member_departure_id) {
                const departed = team.find((m) => m.id === effects.member_departure_id);
                setTeam((prev) => prev.filter((m) => m.id !== effects.member_departure_id));
                setTasks((prev) =>
                    prev.map((t) =>
                        departed && t.assignee === departed.name
                            ? {
                                  ...t,
                                  assignee: null,
                                  status: t.status === 'In Progress' ? 'Pending' : t.status,
                                  capacity_loss: true,
                              }
                            : t
                    )
                );
                logAction('Member departed (capacity impact applied)');
            }
        },
        [
            adjustmentsRef,
            spawnCoinBurst,
            logAction,
            currentWeek,
            team,
            setRemainingBudget,
            totalBudget,
            calcSpent,
            tasks,
        ]
    );

    // Apply specific resolutions based on the event type and action taken
    const applySpecificEventResolution = useCallback(
        (event, action, evaluation) => {
            const actionKey = action.resolution_option;
            const eventType = event.type;
            const affectedTaskIds = event.task_ids || [];
            const affectedMemberIds = event.member_ids || [];

            console.log(`Applying resolution: ${eventType} -> ${actionKey}`);

            // Budget Crisis Events
            if (eventType === 'Budget Crisis' || event.title?.includes('Budget')) {
                switch (actionKey) {
                    case 'cancel_low_priority':
                        // Cancel all low priority tasks
                        setTasks((prev) =>
                            prev.map((task) =>
                                task.priority === 'Low' || affectedTaskIds.includes(task.id)
                                    ? {
                                          ...task,
                                          status: 'Cancelled',
                                          cancellation_reason: 'Budget constraints',
                                      }
                                    : task
                            )
                        );
                        // Refund unused budget from cancelled tasks
                        const cancelledBudget = tasks
                            .filter(
                                (t) =>
                                    (t.priority === 'Low' || affectedTaskIds.includes(t.id)) &&
                                    t.status !== 'Cancelled'
                            )
                            .reduce(
                                (sum, t) =>
                                    sum + ((t.budget || 0) * (100 - (t.progress || 0))) / 100,
                                0
                            );
                        adjustmentsRef.current += cancelledBudget;
                        spawnCoinBurst(cancelledBudget);
                        break;
                    case 'reduce_scope_across_tasks':
                        // Reduce scope of multiple tasks
                        setTasks((prev) =>
                            prev.map((task) =>
                                affectedTaskIds.includes(task.id) || task.status === 'Pending'
                                    ? {
                                          ...task,
                                          estimated_hours: Math.floor(
                                              (task.estimated_hours || 0) * 0.75
                                          ),
                                          budget: Math.floor((task.budget || 0) * 0.8),
                                          scope_reduced: true,
                                          scope_reduction_notes:
                                              '25% scope reduction due to budget constraints',
                                      }
                                    : task
                            )
                        );
                        break;
                    case 'defer_to_phase_two':
                        // Move tasks to future phase (set to pending with notes)
                        setTasks((prev) =>
                            prev.map((task) =>
                                affectedTaskIds.includes(task.id)
                                    ? {
                                          ...task,
                                          status: 'Pending',
                                          deferred: true,
                                          deferral_reason:
                                              'Moved to Phase 2 due to budget constraints',
                                          original_priority: task.priority,
                                          priority: 'Low', // Reduce priority for deferred items
                                      }
                                    : task
                            )
                        );
                        break;
                }
            }

            // Member Availability/Sickness Events
            else if (
                eventType === 'Member Sickness' ||
                eventType === 'Member Unavailable' ||
                event.title?.includes('unavailable')
            ) {
                const affectedMember = team.find((m) => affectedMemberIds.includes(m.id));
                const memberName = affectedMember?.name;

                switch (actionKey) {
                    case 'reassign_tasks':
                    case 'redistribute_workload':
                        // Reassign tasks from unavailable member to available team members
                        setTasks((prev) =>
                            prev.map((task) => {
                                if (task.assignee === memberName && task.status !== 'Completed') {
                                    // Find best available team member based on skills
                                    const availableMembers = team.filter(
                                        (m) =>
                                            (m.id !== affectedMemberIds[0] &&
                                                (m.morale || 70) > 50 &&
                                                (task.required_skills || []).some((skill) =>
                                                    (m.skills || []).includes(skill)
                                                )) ||
                                            (task.required_skills || []).includes('General')
                                    );

                                    if (availableMembers.length > 0) {
                                        const newAssignee =
                                            availableMembers[
                                                Math.floor(Math.random() * availableMembers.length)
                                            ];
                                        return {
                                            ...task,
                                            assignee: newAssignee.name,
                                            reassigned: true,
                                            reassignment_reason: `Reassigned from ${memberName} due to unavailability`,
                                            original_assignee: memberName,
                                        };
                                    } else {
                                        // No suitable assignee - delay task
                                        return {
                                            ...task,
                                            status: 'Pending',
                                            assignee: null,
                                            delay_reason: `Delayed due to ${memberName}'s unavailability`,
                                            estimated_hours: (task.estimated_hours || 0) * 1.1, // 10% penalty for delay
                                        };
                                    }
                                }
                                return task;
                            })
                        );
                        break;
                    case 'bring_temporary_help':
                    case 'outsource_specialist':
                        // Add temporary team member or mark tasks for outsourcing
                        const outsourcingCost = affectedTaskIds.length * 1500;
                        if (remainingBudget >= outsourcingCost) {
                            adjustmentsRef.current -= outsourcingCost;
                            spawnCoinBurst(-outsourcingCost);

                            setTasks((prev) =>
                                prev.map((task) =>
                                    task.assignee === memberName &&
                                    affectedTaskIds.includes(task.id)
                                        ? {
                                              ...task,
                                              assignee: 'External Contractor',
                                              outsourced: true,
                                              outsourcing_cost: 1500,
                                              estimated_hours: Math.floor(
                                                  (task.estimated_hours || 0) * 0.9
                                              ), // Specialists work faster
                                          }
                                        : task
                                )
                            );
                        } else {
                            // Insufficient budget - delay tasks
                            setTasks((prev) =>
                                prev.map((task) =>
                                    task.assignee === memberName &&
                                    affectedTaskIds.includes(task.id)
                                        ? {
                                              ...task,
                                              status: 'Pending',
                                              assignee: null,
                                              delay_reason:
                                                  'Insufficient budget for temporary help',
                                          }
                                        : task
                                )
                            );
                        }
                        break;
                    case 'delay_affected_tasks':
                        // Properly delay tasks instead of cancelling
                        setTasks((prev) =>
                            prev.map((task) =>
                                task.assignee === memberName && affectedTaskIds.includes(task.id)
                                    ? {
                                          ...task,
                                          status: 'Pending',
                                          delayed: true,
                                          delay_reason: `Delayed due to ${memberName}'s unavailability`,
                                          estimated_hours: (task.estimated_hours || 0) * 1.15, // 15% time penalty
                                          original_assignee: task.assignee,
                                          assignee: null,
                                      }
                                    : task
                            )
                        );
                        break;
                }

                // Update team member status if taking leave/sick
                if (actionKey === 'approve_sick_leave' || actionKey === 'grant_time_off') {
                    setTeam((prev) =>
                        prev.map((member) =>
                            affectedMemberIds.includes(member.id)
                                ? {
                                      ...member,
                                      availability: 'Limited',
                                      availability_reason:
                                          actionKey === 'approve_sick_leave'
                                              ? 'Sick Leave'
                                              : 'Time Off',
                                      morale: Math.min(100, (member.morale || 70) + 10), // Morale boost for approved leave
                                  }
                                : member
                        )
                    );
                }
            }

            // Budget Cut Events (NEW MANDATORY EVENT TYPE)
            else if (eventType === 'Budget Cut' || event.title?.includes('Budget Cut')) {
                const costReduction = 0.2; // 20% budget reduction
                const affectedTaskCount = Math.ceil(tasks.length * 0.25); // Affect 25% of tasks

                switch (actionKey) {
                    case 'reduce_scope':
                        // Cancel non-critical tasks to meet budget
                        setTasks((prev) =>
                            prev.map((task) =>
                                task.priority === 'Low' && task.status !== 'Done'
                                    ? {
                                          ...task,
                                          status: 'Cancelled',
                                          cancellation_reason: 'Budget cut - scope reduction',
                                          scope_reduced: true,
                                      }
                                    : task
                            )
                        );
                        // Team morale decreases due to scope reduction
                        setTeam((prev) =>
                            prev.map((member) => ({
                                ...member,
                                morale: Math.max(0, (member.morale || 70) - 3),
                            }))
                        );
                        break;
                    case 'defer_tasks':
                        // Move tasks to future phases
                        setTasks((prev) =>
                            prev.map((task, index) =>
                                index < affectedTaskCount &&
                                task.status !== 'Done' &&
                                task.priority !== 'High'
                                    ? {
                                          ...task,
                                          status: 'Pending',
                                          deferred: true,
                                          deferral_reason:
                                              'Moved to Phase 2 due to budget constraints',
                                          original_priority: task.priority,
                                          priority: 'Low',
                                      }
                                    : task
                            )
                        );
                        break;
                    case 'negotiate_timeline':
                        // Extend project timeline to absorb cost
                        // Timeline extension handled by effects in backend
                        setTeam((prev) =>
                            prev.map((member) => ({
                                ...member,
                                morale: Math.max(0, (member.morale || 70) - 2),
                            }))
                        );
                        break;
                }
            }

            // Member Demands Events (NEW MANDATORY EVENT TYPE)
            else if (
                eventType === 'Member Demands' ||
                event.title?.includes('Compensation Request')
            ) {
                const affectedMember = team.find((m) => affectedMemberIds.includes(m.id));

                switch (actionKey) {
                    case 'approve_increase':
                        // Grant salary increase - significant budget impact but big morale boost
                        if (affectedMember) {
                            setTeam((prev) =>
                                prev.map((member) =>
                                    affectedMemberIds.includes(member.id)
                                        ? {
                                              ...member,
                                              morale: Math.min(100, (member.morale || 70) + 8),
                                              workload: Math.min(100, (member.workload || 50) + 10), // Increased productivity
                                              salary_increased: true,
                                              retention_risk: 'Low',
                                          }
                                        : member
                                )
                            );
                        }
                        break;
                    case 'offer_bonus':
                        // One-time bonus - moderate impact
                        if (affectedMember) {
                            setTeam((prev) =>
                                prev.map((member) =>
                                    affectedMemberIds.includes(member.id)
                                        ? {
                                              ...member,
                                              morale: Math.min(100, (member.morale || 70) + 3),
                                              bonus_received: true,
                                          }
                                        : member
                                )
                            );
                        }
                        break;
                    case 'decline_request':
                        // Decline - risk of departure
                        if (affectedMember) {
                            setTeam((prev) =>
                                prev.map((member) =>
                                    affectedMemberIds.includes(member.id)
                                        ? {
                                              ...member,
                                              morale: Math.max(0, (member.morale || 70) - 5),
                                              retention_risk: 'High',
                                              attrition_risk: true,
                                          }
                                        : member
                                )
                            );
                        }
                        break;
                }
            }

            // Skill Gap Events
            else if (eventType === 'Skill Gap' || event.title?.includes('skill')) {
                switch (actionKey) {
                    case 'consolidate_to_expert':
                        // Assign all skill-related tasks to the most experienced member
                        const skillRequired =
                            event.desc?.match(/(\w+) expertise/)?.[1] || 'General';
                        const expert = team.find(
                            (m) =>
                                (m.skills || []).includes(skillRequired) &&
                                affectedMemberIds.includes(m.id)
                        );

                        if (expert) {
                            setTasks((prev) =>
                                prev.map((task) =>
                                    affectedTaskIds.includes(task.id)
                                        ? {
                                              ...task,
                                              assignee: expert.name,
                                              consolidated_to_expert: true,
                                              quality_assured: true,
                                          }
                                        : task
                                )
                            );
                            // Expert gets overloaded - morale decreases
                            setTeam((prev) =>
                                prev.map((member) =>
                                    member.id === expert.id
                                        ? {
                                              ...member,
                                              morale: Math.max(0, (member.morale || 70) - 10),
                                              workload: 'High',
                                          }
                                        : member
                                )
                            );
                        }
                        break;
                    case 'pair_programming':
                    case 'implement_mentoring':
                        // Pair junior members with experts
                        setTasks((prev) =>
                            prev.map((task) =>
                                affectedTaskIds.includes(task.id)
                                    ? {
                                          ...task,
                                          paired_programming: true,
                                          estimated_hours: Math.floor(
                                              (task.estimated_hours || 0) * 1.2
                                          ), // 20% overhead initially
                                          skill_transfer: true,
                                      }
                                    : task
                            )
                        );
                        // Team skill development
                        setTeam((prev) =>
                            prev.map((member) =>
                                !affectedMemberIds.includes(member.id) // Non-experts get skill boost
                                    ? {
                                          ...member,
                                          skills: [...(member.skills || []), skillRequired].filter(
                                              (s, i, arr) => arr.indexOf(s) === i
                                          ),
                                          morale: Math.min(100, (member.morale || 70) + 5), // Learning morale boost
                                      }
                                    : member
                            )
                        );
                        break;
                }
            }

            // Team Conflict Events
            else if (eventType === 'Team Conflict' || event.title?.includes('friction')) {
                switch (actionKey) {
                    case 'mediate_alignment':
                        // Improve team morale and resolve conflicts
                        setTeam((prev) =>
                            prev.map((member) =>
                                affectedMemberIds.includes(member.id)
                                    ? {
                                          ...member,
                                          morale: Math.min(100, (member.morale || 70) + 10),
                                          conflict_resolved: true,
                                      }
                                    : member
                            )
                        );
                        break;
                    case 'reassign_task':
                        // Move conflicting tasks to neutral members
                        const neutralMembers = team.filter(
                            (m) => !affectedMemberIds.includes(m.id)
                        );
                        if (neutralMembers.length > 0) {
                            setTasks((prev) =>
                                prev.map((task) =>
                                    affectedTaskIds.includes(task.id)
                                        ? {
                                              ...task,
                                              assignee:
                                                  neutralMembers[
                                                      Math.floor(
                                                          Math.random() * neutralMembers.length
                                                      )
                                                  ].name,
                                              conflict_resolution: 'Reassigned to neutral member',
                                          }
                                        : task
                                )
                            );
                        }
                        break;
                    case 'set_written_protocol':
                        // Implement protocols to prevent future conflicts
                        setTeam((prev) =>
                            prev.map((member) => ({
                                ...member,
                                protocol_training: true,
                                morale: Math.min(100, (member.morale || 70) + 3),
                            }))
                        );
                        // Add small admin overhead to all tasks
                        setTasks((prev) =>
                            prev.map((task) => ({
                                ...task,
                                admin_overhead: (task.admin_overhead || 0) + 0.1,
                            }))
                        );
                        break;
                }
            }

            // Standup Events
            else if (eventType === 'Standup') {
                switch (actionKey) {
                    case 'focused_standup':
                        // Quick progress boost with minimal time cost
                        setTasks((prev) =>
                            prev.map((task) =>
                                task.status === 'In Progress'
                                    ? {
                                          ...task,
                                          progress: Math.min(100, (task.progress || 0) + 8),
                                          standup_boost: 'focused',
                                          coordination_level: 'high',
                                      }
                                    : task
                            )
                        );
                        setTeam((prev) =>
                            prev.map((member) => ({
                                ...member,
                                morale: Math.min(100, (member.morale || 70) + 2),
                                standup_participation: 'active',
                            }))
                        );
                        break;
                    case 'detailed_planning':
                        // Larger progress boost with better coordination
                        setTasks((prev) =>
                            prev.map((task) =>
                                task.status === 'In Progress' || task.status === 'Pending'
                                    ? {
                                          ...task,
                                          progress: Math.min(100, (task.progress || 0) + 8),
                                          detailed_planning: true,
                                          blocker_addressed: true,
                                      }
                                    : task
                            )
                        );
                        setTeam((prev) =>
                            prev.map((member) => ({
                                ...member,
                                morale: Math.min(100, (member.morale || 70) + 5),
                                coordination_improved: true,
                            }))
                        );
                        // Higher time cost
                        adjustmentsRef.current -= Math.floor(team.length * 50); // 30min meeting cost
                        break;
                    case 'skip_standup':
                        // Minimal boost, slight morale hit, saves time
                        setTasks((prev) =>
                            prev.map((task) =>
                                task.status === 'In Progress'
                                    ? {
                                          ...task,
                                          progress: Math.min(100, (task.progress || 0) + 5),
                                          standup_skipped: true,
                                      }
                                    : task
                            )
                        );
                        setTeam((prev) =>
                            prev.map((member) => ({
                                ...member,
                                morale: Math.max(0, (member.morale || 70) - 1),
                                coordination_risk: 'increased',
                            }))
                        );
                        break;
                }
            }

            // Quality Issues Events
            else if (eventType === 'Quality Issue' || event.title?.includes('Quality')) {
                switch (actionKey) {
                    case 'implement_code_review':
                        setTasks((prev) =>
                            prev.map((task) =>
                                affectedTaskIds.includes(task.id)
                                    ? {
                                          ...task,
                                          quality_assured: true,
                                          code_review_implemented: true,
                                          estimated_hours: Math.floor(
                                              (task.estimated_hours || 0) * 1.15
                                          ), // 15% overhead for reviews
                                      }
                                    : task
                            )
                        );
                        break;
                    case 'refactor_immediately':
                        setTasks((prev) =>
                            prev.map((task) =>
                                affectedTaskIds.includes(task.id)
                                    ? {
                                          ...task,
                                          status: 'In Progress', // Restart for refactor
                                          progress: Math.max(0, (task.progress || 0) - 30), // Step back for refactor
                                          refactored: true,
                                          quality_improved: true,
                                      }
                                    : task
                            )
                        );
                        break;
                    case 'technical_debt_later':
                        setTasks((prev) =>
                            prev.map((task) =>
                                affectedTaskIds.includes(task.id)
                                    ? {
                                          ...task,
                                          technical_debt: true,
                                          debt_documented: true,
                                          future_refactor_required: true,
                                      }
                                    : task
                            )
                        );
                        break;
                }
            }

            // Client Feedback Events
            else if (eventType === 'Client Feedback' || event.title?.includes('Client')) {
                switch (actionKey) {
                    case 'implement_changes':
                        setTasks((prev) =>
                            prev.map((task) =>
                                affectedTaskIds.includes(task.id)
                                    ? {
                                          ...task,
                                          status:
                                              task.status === 'Completed'
                                                  ? 'In Progress'
                                                  : task.status, // Reopen if needed
                                          progress: Math.max(0, (task.progress || 0) - 20), // Rework required
                                          client_feedback_incorporated: true,
                                          estimated_hours: Math.floor(
                                              (task.estimated_hours || 0) * 1.3
                                          ), // 30% more work
                                      }
                                    : task
                            )
                        );
                        break;
                    case 'negotiate_scope':
                        // Maintain current task state but add negotiation overhead
                        setTasks((prev) =>
                            prev.map((task) =>
                                affectedTaskIds.includes(task.id)
                                    ? {
                                          ...task,
                                          scope_negotiated: true,
                                          stakeholder_alignment: true,
                                          admin_overhead: (task.admin_overhead || 0) + 0.1,
                                      }
                                    : task
                            )
                        );
                        break;
                    case 'defer_feedback':
                        setTasks((prev) =>
                            prev.map((task) =>
                                affectedTaskIds.includes(task.id)
                                    ? {
                                          ...task,
                                          feedback_deferred: true,
                                          future_rework_risk: 'high',
                                          technical_debt: true,
                                      }
                                    : task
                            )
                        );
                        break;
                }
            }

            // Technology/Infrastructure Events
            else if (eventType === 'Technology Issue' || event.title?.includes('Infrastructure')) {
                switch (actionKey) {
                    case 'implement_workaround':
                        setTasks((prev) =>
                            prev.map((task) =>
                                affectedTaskIds.includes(task.id)
                                    ? {
                                          ...task,
                                          workaround_implemented: true,
                                          technical_debt: true,
                                          estimated_hours: Math.floor(
                                              (task.estimated_hours || 0) * 1.1
                                          ), // 10% overhead
                                      }
                                    : task
                            )
                        );
                        break;
                    case 'upgrade_infrastructure':
                        const upgradeCost = 3000;
                        if (remainingBudget >= upgradeCost) {
                            adjustmentsRef.current -= upgradeCost;
                            spawnCoinBurst(-upgradeCost);
                            setTasks((prev) =>
                                prev.map((task) =>
                                    affectedTaskIds.includes(task.id)
                                        ? {
                                              ...task,
                                              infrastructure_upgraded: true,
                                              estimated_hours: Math.floor(
                                                  (task.estimated_hours || 0) * 0.85
                                              ), // 15% efficiency gain
                                          }
                                        : task
                                )
                            );
                        } else {
                            // Can't afford upgrade - implement workaround
                            setTasks((prev) =>
                                prev.map((task) =>
                                    affectedTaskIds.includes(task.id)
                                        ? {
                                              ...task,
                                              workaround_implemented: true,
                                              upgrade_deferred: true,
                                          }
                                        : task
                                )
                            );
                        }
                        break;
                    case 'delay_until_resolved':
                        setTasks((prev) =>
                            prev.map((task) =>
                                affectedTaskIds.includes(task.id)
                                    ? {
                                          ...task,
                                          status: 'Pending',
                                          delay_reason:
                                              'Infrastructure issues - waiting for resolution',
                                          delayed_weeks: 1,
                                      }
                                    : task
                            )
                        );
                        break;
                }
            }

            // Apply general metrics impact
            if (evaluation.metrics_impact) {
                // Budget changes
                if (evaluation.metrics_impact.budget_change) {
                    adjustmentsRef.current += evaluation.metrics_impact.budget_change;
                    if (evaluation.metrics_impact.budget_change !== 0) {
                        spawnCoinBurst(evaluation.metrics_impact.budget_change);
                    }
                }

                // Team morale changes
                if (evaluation.metrics_impact.team_morale_change) {
                    setTeam((prev) =>
                        prev.map((member) => ({
                            ...member,
                            morale: Math.min(
                                100,
                                Math.max(
                                    0,
                                    (member.morale || 70) +
                                        evaluation.metrics_impact.team_morale_change
                                )
                            ),
                        }))
                    );
                }
            }
        },
        [tasks, team, remainingBudget, adjustmentsRef, spawnCoinBurst]
    );

    // Apply the consequences of actions to the game state (budget, tasks, team)
    const applyActionConsequences = useCallback((consequences, metricsImpact) => {
        // Apply budget changes
        if (metricsImpact?.budget_change) {
            adjustmentsRef.current += metricsImpact.budget_change;
        }

        // Apply team morale changes
        if (metricsImpact?.team_morale_change) {
            setTeam((prev) =>
                prev.map((member) => ({
                    ...member,
                    morale: Math.min(
                        100,
                        Math.max(0, (member.morale || 70) + metricsImpact.team_morale_change)
                    ),
                }))
            );
        }

        // Apply task changes based on consequences
        consequences.forEach((consequence) => {
            switch (consequence.type) {
                case 'timeline_delay':
                    // Could extend task deadlines or reduce progress
                    setTasks((prev) =>
                        prev.map((task) => ({
                            ...task,
                            estimated_hours: task.estimated_hours
                                ? task.estimated_hours * 1.1
                                : task.estimated_hours,
                        }))
                    );
                    break;
                case 'velocity_boost_future':
                    // Could improve future task progress rates
                    setTasks((prev) =>
                        prev.map((task) =>
                            task.status === 'In Progress'
                                ? {
                                      ...task,
                                      progress: Math.min(100, (task.progress || 0) + 5),
                                  }
                                : task
                        )
                    );
                    break;
                case 'quality_assurance':
                    // Mark quality-related improvements
                    setTasks((prev) =>
                        prev.map((task) =>
                            task.priority === 'High'
                                ? {
                                      ...task,
                                      quality_assured: true,
                                  }
                                : task
                        )
                    );
                    break;
            }
        });
    }, []);

    // (calcSpent & budget state moved earlier)

    // Calculate current game state for action evaluation
    const getCurrentGameState = useCallback(() => {
        const spent = calcSpent(tasks);
        const remainingBudget = Math.max(
            0,
            totalBudget - spent - overheadCostsRef.current + adjustmentsRef.current
        );

        const avgMorale =
            team.length > 0 ? team.reduce((sum, m) => sum + (m.morale || 70), 0) / team.length : 70;
        const teamUtilization =
            team.length > 0
                ? team.reduce((sum, m) => sum + (m.workload || 50), 0) / (team.length * 100)
                : 0.5;

        return {
            remaining_budget: remainingBudget,
            team_utilization: teamUtilization,
            timeline_buffer_weeks: Math.max(0, projectWeeks - currentWeek),
            current_week: currentWeek,
            total_weeks: projectWeeks,
            team_morale_avg: avgMorale,
            tasks_total: tasks.length,
            tasks_completed: tasks.filter((t) => t.status === 'Completed').length,
            tasks_in_progress: tasks.filter((t) => t.status === 'In Progress').length,
        };
    }, [project, tasks, team, currentWeek, projectWeeks, calcSpent]);

    // Expose lightweight game state for components (e.g. Events.jsx) / devtools
    useEffect(() => {
        try {
            const gs = getCurrentGameState();
            window.__SIM_STATE = {
                remainingBudget: gs.remaining_budget,
                teamUtilization: gs.team_utilization,
                timelineBuffer: gs.timeline_buffer_weeks,
                currentWeek: gs.current_week,
                teamMorale: gs.team_morale_avg,
                tasksTotal: gs.tasks_total,
                tasksCompleted: gs.tasks_completed,
            };
        } catch (e) {
            /* silent */
        }
    }, [getCurrentGameState]);

    // Advance-week guard: require at least one task to have progressed (status changed or progress > 0)
    const [advanceGuardOpen, setAdvanceGuardOpen] = useState(false);
    const attemptAdvanceWeek = () => {
        if (currentWeek >= projectWeeks) return;

        // Try to resolve any lingering events before advancing
        attemptPassiveResolutions();

        const progressed = tasks.some(
            (t) => (t.status && t.status !== 'Pending') || (t.progress || 0) > 0
        );
        if (!progressed) {
            setAdvanceGuardOpen(true);
            return;
        }

        setCurrentWeek((w) => {
            const nextWeek = w + 1;
            logAction(`Advanced to Week ${nextWeek}`);

            // Auto-resolve old standup events from previous weeks
            const oldStandups = allEvents
                .filter(
                    (e) =>
                        e.action_type === 'standup' &&
                        (e.trigger_week || 0) < nextWeek &&
                        !resolvedEventIds.includes(e.id)
                )
                .map((e) => e.id);

            if (oldStandups.length > 0) {
                setTimeout(() => {
                    setResolvedEventIds((prev) => [...prev, ...oldStandups]);
                }, 100);
            }

            return nextWeek;
        });
    };
    const confirmAdvanceAnyway = () => {
        setAdvanceGuardOpen(false);
        setCurrentWeek((w) => {
            const nextWeek = w + 1;
            logAction(`Advanced to Week ${nextWeek} (forced)`);

            // Try to resolve lingering events when advancing
            attemptPassiveResolutions();

            return nextWeek;
        });
    };
    const cancelAdvance = () => setAdvanceGuardOpen(false);

    // When week changes (after mount), collapse tasks
    useEffect(() => {
        if (currentWeek !== 1) {
            setCollapseVersion((v) => v + 1);
        }
    }, [currentWeek]);

    // Onboarding / guided walkthrough
    const [introOpen, setIntroOpen] = useState(true);
    // Walkthrough steps:
    // 0 = intro modal
    // 1 = events panel
    // 2 = tasks panel
    // 3 = team panel
    // 4 = navigation (next week button)
    // 5 = done
    const [walkStep, setWalkStep] = useState(0);
    const eventsRef = useRef(null);
    const tasksRef = useRef(null);
    const teamRef = useRef(null);
    const navRef = useRef(null);
    const prevWalkStepRef = useRef(0);

    const startWalkthrough = () => {
        setIntroOpen(false);
        setWalkStep(1);
    };
    const advanceWalk = () => setWalkStep((s) => Math.min(5, s + 1));
    const skipWalk = () => setWalkStep(5);

    // ONLY expand during onboarding tasks step (week 1 initial guidance)
    const forceExpandTaskId = useMemo(() => {
        if (walkStep === 2 && currentWeek === 1) {
            return simulation?.tasks?.[0]?.id;
        }
        return null; // never auto-expand after onboarding or on week changes
    }, [walkStep, simulation, currentWeek]);

    // Auto-highlight tasks impacted by events of the current week (discovery aid)
    useEffect(() => {
        if (walkStep > 0 && walkStep < 5) return; // skip during walkthrough until finished
        const weekEvents = allEvents.filter((e) => e.trigger_week === currentWeek);
        const tasks = [...new Set(weekEvents.flatMap((e) => e.task_ids || []))];
        if (tasks.length) {
            const colorMap = {};
            tasks.forEach((tid, idx) => {
                colorMap[tid] = palette[idx % palette.length];
            });
            setHighlightColorMap(colorMap);
            setHighlightedTaskIds(tasks);
            setSelectedEventId(null);
        } else {
            setHighlightColorMap({});
            setHighlightedTaskIds([]);
        }
    }, [currentWeek, allEvents, walkStep]);

    // When leaving tasks walkthrough step (step 2 -> 3), force collapse
    useEffect(() => {
        if (prevWalkStepRef.current === 2 && walkStep === 3) {
            setCollapseVersion((v) => v + 1);
        }
        prevWalkStepRef.current = walkStep;
    }, [walkStep]);

    // ===== Budget Tracking & Effects (declarations moved up) =====

    // Coin & praise bursts
    const [coinBursts, setCoinBursts] = useState([]); // {id, amt, x, y} viewport (client) coordinates
    const [praiseBursts, setPraiseBursts] = useState([]); // {id, memberId}
    const wrapperRef = useRef(null); // still used for other future needs
    // Assign real implementation (after hooks that capture spawnCoinBurst have been declared)
    spawnCoinBurstRef.current = (amt, origin = null) => {
        if (!amt || amt <= 0) return;
        let x = null,
            y = null;
        if (origin) {
            if (origin.x != null && origin.y != null) {
                x = origin.x;
                y = origin.y;
            } else if (origin.clientX != null) {
                x = origin.clientX;
                y = origin.clientY;
            } else if (origin.left != null) {
                x = origin.left + origin.width / 2;
                y = origin.top + origin.height / 2;
            }
        }
        if (x == null || y == null) {
            // fallback center
            x = window.innerWidth / 2;
            y = 80;
        }
        // Compensate for CSS zoom shrinking container (non-Firefox path uses zoom)
        if (!isFirefox) {
            const uiScale = 0.6;
            const wrapperRect = wrapperRef.current?.getBoundingClientRect();
            const baseLeft = wrapperRect ? wrapperRect.left : 0;
            const baseTop = wrapperRect ? wrapperRect.top : 0;
            // Re-project point into unzoomed coordinate space then back to viewport so overlay matches visual click
            x = baseLeft + (x - baseLeft) / uiScale;
            y = baseTop + (y - baseTop) / uiScale;
        }
        const id = Date.now() + Math.random();
        setCoinBursts((b) => [...b, { id, amt, x, y }]);
        setTimeout(() => setCoinBursts((b) => b.filter((c) => c.id !== id)), 1800);
    };
    const spawnPraise = (memberId) => {
        const id = Date.now() + Math.random();
        setPraiseBursts((p) => [...p, { id, memberId }]);
        setTimeout(() => setPraiseBursts((p) => p.filter((pb) => pb.id !== id)), 1400);
    };

    // Mutators
    const handleTaskChange = (updated) => {
        // Preserve original assignee for reassignment rule checks
        setTasks((prev) =>
            prev.map((t) =>
                t.id === updated.id
                    ? { ...t, original_assignee: t.original_assignee || t.assignee, ...updated }
                    : t
            )
        );
        if (updated.status === 'Cancelled') {
            const prior = tasks.find((t) => t.id === updated.id);
            if (prior) {
                const spent = ((prior.budget || 0) * (prior.progress || 0)) / 100;
                const refund = (prior.budget || 0) - spent;
                adjustmentsRef.current += refund;
                spawnCoinBurst(refund);
                setRemainingBudget(
                    Math.max(0, totalBudget - calcSpent(tasks) + adjustmentsRef.current)
                );
            }
        }
        // Resolve events referencing this task (update_task, reassign_task)
        const relatedEvents = allEvents.filter(
            (e) =>
                ['update_task', 'reassign_task'].includes(e.action_type) &&
                (e.task_ids || []).includes(updated.id) &&
                !e.resolution_requires_action
        );
        if (relatedEvents.length) {
            // Condition A: general update events -> all referenced tasks not 'Pending'
            // Condition B (sickness): if event type is Member Sickness, resolve when none of the tasks still assigned to the sick member
            // Condition C (reassign rules): must change assignee or redistribute workload
            const resolvableIds = [];
            relatedEvents.forEach((ev) => {
                const tasksForEvent = (ev.task_ids || []).map((id) =>
                    id === updated.id ? updated : tasks.find((t) => t.id === id) || {}
                );
                const isSickness = ev.type === 'Member Sickness';
                const isReassign = ev.action_type === 'reassign_task';
                let ok = false;
                if (isSickness) {
                    const sickMemberId = (ev.member_ids || [])[0];
                    ok = tasksForEvent.every(
                        (t) =>
                            t.assignee == null ||
                            !team.find((m) => m.id === sickMemberId)?.name ||
                            t.assignee !== team.find((m) => m.id === sickMemberId)?.name
                    );
                } else if (isReassign) {
                    if (ev.resolution_rule?.must_change_assignee_for_task_ids?.length) {
                        ok = ev.resolution_rule.must_change_assignee_for_task_ids.every((tid) => {
                            const t =
                                tasksForEvent.find((tx) => tx.id === tid) ||
                                tasks.find((tx) => tx.id === tid);
                            return t && t.assignee && t.assignee !== t.original_assignee;
                        });
                    }
                    if (ev.resolution_rule?.must_reassign_from_member) {
                        const memberName = ev.resolution_rule.must_reassign_from_member;
                        ok = tasksForEvent.some((t) => t.assignee && t.assignee !== memberName);
                    }
                } else {
                    ok = tasksForEvent.every((t) => t.status && t.status !== 'Pending');
                }
                if (ok) resolvableIds.push(ev.id);
            });
            if (resolvableIds.length)
                setResolvedEventIds((prev) => [
                    ...prev,
                    ...resolvableIds.filter((id) => !prev.includes(id)),
                ]);
        }
        // Budget risk cancellation rule
        allEvents.forEach((ev) => {
            if (
                ev.resolution_rule?.must_cancel_one_of_task_ids &&
                ev.action_type === 'update_task' &&
                !resolvedEventIds.includes(ev.id) &&
                !ev.resolution_requires_action
            ) {
                const satisfied = ev.resolution_rule.must_cancel_one_of_task_ids.some(
                    (tid) =>
                        (tid === updated.id && updated.status === 'Cancelled') ||
                        tasks.find((t) => t.id === tid)?.status === 'Cancelled'
                );
                if (satisfied)
                    setResolvedEventIds((prev) => (prev.includes(ev.id) ? prev : [...prev, ev.id]));
            }
        });
    };

    const handleTaskAction = useCallback(
        async (taskId, actionType, params) => {
            try {
                const task = tasks.find((t) => t.id === taskId);
                if (!task) {
                    return { success: false, message: 'Task not found' };
                }

                let result = { success: true, message: '', taskUpdates: {} };
                let budgetImpact = 0;
                let teamEffects = [];

                switch (actionType) {
                    case 'split_task':
                        if (task.estimated_hours <= 8 || task.progress >= 50) {
                            return {
                                success: false,
                                message: 'Task cannot be split (too small or too advanced)',
                            };
                        }

                        const subtaskCount = params.subtaskCount || 2;
                        const baseHours = Math.floor(task.estimated_hours / subtaskCount);

                        // Create new subtasks
                        const newTasks = [];
                        for (let i = 1; i <= subtaskCount; i++) {
                            const subtask = {
                                ...task,
                                id: Date.now() + i,
                                title: `${task.title} - Part ${i}`,
                                estimated_hours: baseHours,
                                remaining_hours: baseHours,
                                progress: 0,
                                budget: Math.floor((task.budget || 0) / subtaskCount),
                                parent_task_id: taskId,
                                split_strategy: params.splitStrategy,
                            };
                            newTasks.push(subtask);
                        }

                        setTasks((prev) => [...prev.filter((t) => t.id !== taskId), ...newTasks]);
                        result.message = `Task split into ${subtaskCount} subtasks using ${params.splitStrategy} strategy`;
                        budgetImpact = -200; // Administrative overhead
                        break;

                    case 'add_resources':
                        const additionalMembers = params.additionalMembers || 1;
                        const resourceType = params.resourceType || 'internal';
                        const costPerMember = resourceType === 'internal' ? 2000 : 5000;
                        budgetImpact = -(additionalMembers * costPerMember);

                        if (remainingBudget + budgetImpact < 0) {
                            return {
                                success: false,
                                message: 'Insufficient budget for additional resources',
                            };
                        }

                        result.taskUpdates = {
                            additional_resources: additionalMembers,
                            resource_type: resourceType,
                            estimated_hours: Math.max(
                                4,
                                task.estimated_hours - additionalMembers * 8
                            ),
                        };
                        result.message = `Added ${additionalMembers} ${resourceType} resource(s) to accelerate task`;
                        break;

                    case 'change_scope':
                        if (task.progress >= 30) {
                            return {
                                success: false,
                                message: 'Cannot change scope - task too advanced',
                            };
                        }

                        const scopeChange = params.scopeChange || 'reduce';
                        let effortModifier = 1;
                        let budgetModifier = 1;

                        switch (scopeChange) {
                            case 'reduce':
                                effortModifier = 0.75;
                                budgetModifier = 0.75;
                                result.message =
                                    'Scope reduced by 25% - faster delivery, less comprehensive';
                                break;
                            case 'expand':
                                effortModifier = 1.4;
                                budgetModifier = 1.4;
                                budgetImpact = -((task.budget || 0) * 0.4);
                                result.message =
                                    'Scope expanded by 40% - more comprehensive, higher cost';
                                break;
                            case 'refocus':
                                result.message =
                                    'Task priorities refocused - optimized for current needs';
                                break;
                        }

                        result.taskUpdates = {
                            estimated_hours: Math.floor(
                                (task.estimated_hours || 0) * effortModifier
                            ),
                            budget: Math.floor((task.budget || 0) * budgetModifier),
                            scope_change: scopeChange,
                            scope_justification: params.justification,
                        };
                        break;

                    case 'rush_delivery':
                        if (task.status !== 'In Progress') {
                            return {
                                success: false,
                                message: 'Task must be in progress to rush delivery',
                            };
                        }

                        const rushStrategy = params.rushStrategy || 'overtime';
                        const targetWeeks = params.targetWeeks || currentWeek + 1;

                        switch (rushStrategy) {
                            case 'overtime':
                                budgetImpact = -Math.floor((task.budget || 0) * 0.5);
                                result.taskUpdates = {
                                    progress: Math.min(100, task.progress + 15),
                                    rush_mode: true,
                                    target_completion_week: targetWeeks,
                                };
                                teamEffects = [
                                    {
                                        type: 'morale_decrease',
                                        amount: 5,
                                        reason: 'overtime_pressure',
                                    },
                                ];
                                result.message =
                                    'Overtime scheduled - task accelerated but team morale decreased';
                                break;
                            case 'parallel':
                                budgetImpact = -Math.floor((task.budget || 0) * 0.3);
                                result.taskUpdates = {
                                    progress: Math.min(100, task.progress + 10),
                                    quality_risk: 'increased',
                                    parallel_development: true,
                                };
                                result.message =
                                    'Parallel development initiated - faster but higher risk';
                                break;
                            case 'mvp':
                                result.taskUpdates = {
                                    progress: Math.min(100, task.progress + 20),
                                    delivery_scope: 'mvp',
                                    future_enhancement_required: true,
                                };
                                result.message =
                                    'MVP delivery prioritized - core functionality delivered first';
                                break;
                        }
                        break;

                    case 'handle_delays':
                        const delayStrategy = params.delayStrategy || 'expedite';
                        const costImpact = params.costImpact || 1200;

                        // Find and resolve related vendor_delay events
                        const delayEvents = allEvents.filter(
                            (e) =>
                                e.action_type === 'vendor_delay' &&
                                e.task_ids?.includes(taskId) &&
                                !resolvedEventIds.includes(e.id)
                        );

                        delayEvents.forEach((event) => {
                            resolveEvent(event.id);
                        });

                        switch (delayStrategy) {
                            case 'expedite':
                                budgetImpact = -costImpact;
                                result.taskUpdates = {
                                    delay_handled: true,
                                    expedited: true,
                                    progress: Math.min(100, task.progress + 8),
                                };
                                result.message =
                                    'Expedited fee paid - vendor delays resolved, progress boosted';
                                break;
                            case 'parallel':
                                budgetImpact = -(costImpact * 1.5);
                                result.taskUpdates = {
                                    delay_handled: true,
                                    parallel_track: true,
                                    quality_risk: 'increased',
                                };
                                result.message =
                                    'Parallel contingency started - delays bypassed but risk increased';
                                break;
                            case 'absorb':
                                budgetImpact = 0; // No cost but timeline impact
                                result.taskUpdates = {
                                    delay_handled: true,
                                    timeline_extended: true,
                                    estimated_hours: Math.floor((task.estimated_hours || 0) * 1.1),
                                };
                                teamEffects = [
                                    {
                                        type: 'morale_decrease',
                                        amount: 3,
                                        reason: 'timeline_pressure',
                                    },
                                ];
                                result.message =
                                    'Delay absorbed - timeline extended, slight team morale decrease';
                                break;
                            case 'reschedule':
                                budgetImpact = -(costImpact * 0.5);
                                result.taskUpdates = {
                                    delay_handled: true,
                                    rescheduled: true,
                                    dependency_risk: 'managed',
                                };
                                result.message =
                                    'Dependencies rescheduled - delay managed with coordination cost';
                                break;
                        }
                        break;

                    case 'request_budget':
                        const budgetAmount = params.budgetAmount || 10000;
                        const justification = params.justification || '';

                        // Find related budget_request events to resolve
                        const budgetEvents = allEvents.filter(
                            (e) =>
                                e.action_type === 'budget_request' &&
                                e.task_ids?.includes(taskId) &&
                                !resolvedEventIds.includes(e.id)
                        );

                        console.log('Budget request debug:', {
                            taskId,
                            allEvents: allEvents.length,
                            budgetEvents: budgetEvents.length,
                            resolvedEventIds: resolvedEventIds.length,
                            budgetEventsFound: budgetEvents.map((e) => ({
                                id: e.id,
                                action_type: e.action_type,
                                task_ids: e.task_ids,
                            })),
                        });

                        if (budgetEvents.length > 0) {
                            // Try to resolve via the backend evaluation system
                            const targetEvent = budgetEvents[0];
                            const approvalOption = targetEvent.resolution_options?.find(
                                (opt) =>
                                    opt.key === 'approve' ||
                                    opt.title?.toLowerCase().includes('approve')
                            );

                            if (approvalOption) {
                                try {
                                    const actionResponse = await fetch(
                                        '/simulator/evaluate-action',
                                        {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'X-CSRF-TOKEN':
                                                    document.querySelector(
                                                        'meta[name="csrf-token"]'
                                                    ).content,
                                            },
                                            body: JSON.stringify({
                                                event_id: targetEvent.id,
                                                event: targetEvent,
                                                resolution_option: approvalOption.key,
                                                notes: justification,
                                                game_state: {
                                                    remaining_budget: remainingBudget,
                                                    team_morale_avg:
                                                        team.reduce(
                                                            (sum, m) => sum + (m.morale || 70),
                                                            0
                                                        ) / team.length,
                                                    timeline_buffer_weeks: Math.max(
                                                        0,
                                                        totalWeeks - currentWeek
                                                    ),
                                                    total_weeks: totalWeeks,
                                                    current_week: currentWeek,
                                                },
                                                week: currentWeek,
                                            }),
                                        }
                                    );

                                    const actionResult = await actionResponse.json();
                                    if (actionResult.success && actionResult.effects) {
                                        // Apply backend effects
                                        applyBackendEffects(actionResult.effects);
                                        // Mark event as resolved
                                        resolveEvent(targetEvent.id);
                                        result.message = `Budget request processed: ${actionResult.evaluation?.feedback || 'Additional funding secured'}`;
                                    } else {
                                        result.message = `Budget request submitted but ${actionResult.evaluation?.feedback || 'outcome uncertain'}`;
                                    }
                                } catch (error) {
                                    console.log(
                                        'Backend budget request failed, resolving locally:',
                                        error
                                    );
                                    // Fallback: resolve locally if backend fails
                                    resolveEvent(targetEvent.id);
                                    result.message =
                                        'Budget request submitted - awaiting management review';
                                }
                            } else {
                                // No approval option found, resolve anyway since user took action
                                console.log(
                                    'No approval option found, resolving budget event anyway'
                                );
                                resolveEvent(targetEvent.id);
                                result.message =
                                    'Budget request submitted - will be reviewed by management';
                            }
                        } else {
                            // No budget events found but still mark as submitted
                            console.log('No budget events found for task', taskId);
                            result.message =
                                'Budget request submitted - will be reviewed by management';
                        }

                        result.taskUpdates = {
                            budget_request_submitted: true,
                            requested_amount: budgetAmount,
                            justification: justification,
                        };
                        break;

                    default:
                        return { success: false, message: 'Unknown action type' };
                }

                // Apply budget impact
                if (budgetImpact !== 0) {
                    adjustmentsRef.current += budgetImpact;
                    if (budgetImpact < 0) {
                        overheadCostsRef.current += Math.abs(budgetImpact);
                    }
                    setRemainingBudget(
                        Math.max(
                            0,
                            totalBudget -
                                calcSpent(tasks) -
                                overheadCostsRef.current +
                                adjustmentsRef.current
                        )
                    );

                    if (budgetImpact < 0) {
                        spawnCoinBurst(budgetImpact); // Negative burst for costs
                    }
                }

                // Apply team effects
                if (teamEffects.length > 0) {
                    setTeam((prev) =>
                        prev.map((member) => {
                            let updatedMember = { ...member };
                            teamEffects.forEach((effect) => {
                                if (effect.type === 'morale_decrease') {
                                    updatedMember.morale = Math.max(
                                        0,
                                        (updatedMember.morale || 70) - effect.amount
                                    );
                                } else if (effect.type === 'morale_increase') {
                                    updatedMember.morale = Math.min(
                                        100,
                                        (updatedMember.morale || 70) + effect.amount
                                    );
                                }
                            });
                            return updatedMember;
                        })
                    );
                }

                // Record action for scoring
                setActionResults((prev) => [
                    ...prev,
                    {
                        type: 'task_action',
                        action: actionType,
                        task: task.title,
                        week: currentWeek,
                        result: result.message,
                        budget_impact: budgetImpact,
                    },
                ]);

                setActionCount((prev) => prev + 1);
                const actionScore = Math.max(1, 5 + Math.floor(budgetImpact / 100));
                setTotalScore((prev) => prev + actionScore);

                return result;
            } catch (error) {
                console.error('Task action error:', error);
                return { success: false, message: 'Action failed: ' + error.message };
            }
        },
        [
            tasks,
            currentWeek,
            remainingBudget,
            totalBudget,
            team,
            calcSpent,
            allEvents,
            resolvedEventIds,
            resolveEvent,
            applyBackendEffects,
            totalWeeks,
        ]
    );

    const handleRemoveMember = (memberId, evt) => {
        const member = team.find((m) => m.id === memberId);
        setTeam((prev) => prev.filter((m) => m.id !== memberId));
        setTasks((prev) =>
            prev.map((t) => (t.assignee === member?.name ? { ...t, assignee: null } : t))
        );
        if (member) {
            const remainingWeeks = projectWeeks - currentWeek + 1;
            const savings = (member.capacity_hours || 30) * remainingWeeks * 100; // simple cost model (treated as salary refund)
            adjustmentsRef.current += savings;
            const native = evt?.nativeEvent || evt;
            const coords =
                native && native.clientX != null ? { x: native.clientX, y: native.clientY } : null;
            spawnCoinBurst(savings, coords || evt); // use precise mouse position
            setRemainingBudget(
                Math.max(0, totalBudget - calcSpent(tasks) + adjustmentsRef.current)
            );
        }
        // Resolve remove_member events for this member
        const toResolve = allEvents
            .filter(
                (e) =>
                    e.action_type === 'remove_member' &&
                    (e.member_ids || []).includes(memberId) &&
                    !resolvedEventIds.includes(e.id)
            )
            .map((e) => e.id);
        if (toResolve.length)
            setResolvedEventIds((prev) => [
                ...prev,
                ...toResolve.filter((id) => !prev.includes(id)),
            ]);
    };
    const handlePraiseMember = (memberId) => {
        setTeam((prev) =>
            prev.map((m) =>
                m.id === memberId
                    ? {
                          ...m,
                          workload: Math.max(5, (m.workload || 50) - 5),
                          morale: Math.min(100, (m.morale ?? 70) + 10),
                          status: 'Active',
                      }
                    : m
            )
        );
        spawnPraise(memberId);
        // Resolve praise_member events for this member
        const toResolve = allEvents
            .filter(
                (e) =>
                    e.action_type === 'praise_member' &&
                    (e.member_ids || []).includes(memberId) &&
                    !resolvedEventIds.includes(e.id)
            )
            .map((e) => e.id);
        if (toResolve.length)
            setResolvedEventIds((prev) => [
                ...prev,
                ...toResolve.filter((id) => !prev.includes(id)),
            ]);
    };

    // Ceremony actions
    const TEAM_EVENT_COST = 150; // Reduced from 500
    const STANDUP_COST = 50; // Reduced from 200

    const applyOverheadCost = (amt) => {
        overheadCostsRef.current += amt;
        setRemainingBudget(
            Math.max(
                0,
                totalBudget - calcSpent(tasks) - overheadCostsRef.current + adjustmentsRef.current
            )
        );
    };

    const handleTeamEvent = () => {
        // Increase morale for all active members
        setTeam((prev) => prev.map((m) => ({ ...m, morale: Math.min(100, (m.morale ?? 70) + 8) })));
        applyOverheadCost(TEAM_EVENT_COST);
        logAction('Team Event (+morale, -budget)');
        // Resolve team_event / morale_slump intervention events (those requiring morale action)
        const toResolve = allEvents
            .filter(
                (e) =>
                    ['team_event', 'morale_slump'].includes(e.action_type) &&
                    (e.trigger_week || 0) === currentWeek &&
                    !resolvedEventIds.includes(e.id)
            )
            .map((e) => e.id);
        if (toResolve.length)
            setResolvedEventIds((prev) => [
                ...prev,
                ...toResolve.filter((id) => !prev.includes(id)),
            ]);
    };

    const handleStandup = () => {
        const beforeSpent = calcSpent(tasks);
        console.log('Before standup - Total spent:', beforeSpent);
        console.log(
            'Tasks budgets:',
            tasks.map((t) => ({ title: t.title, budget: t.budget, progress: t.progress }))
        );

        // Boost progress for all active tasks (not cancelled / done)
        setTasks((prev) =>
            prev.map((t) => {
                if (t.status === 'Cancelled') return t;
                const newProg = Math.min(100, (t.progress || 0) + 5);
                const newStatus = newProg >= 100 ? 'Done' : t.status;
                return { ...t, progress: newProg, status: newStatus };
            })
        );

        setTimeout(() => {
            const afterSpent = calcSpent(tasks);
            console.log('After standup - Total spent:', afterSpent);
            console.log('Budget impact from progress:', afterSpent - beforeSpent);
        }, 100);

        applyOverheadCost(STANDUP_COST);
        logAction('Standup (+5% progress, -budget)');
        // Resolve standup events current week
        const toResolve = allEvents
            .filter(
                (e) =>
                    e.action_type === 'standup' &&
                    (e.trigger_week || 0) === currentWeek &&
                    !resolvedEventIds.includes(e.id)
            )
            .map((e) => e.id);
        if (toResolve.length)
            setResolvedEventIds((prev) => [
                ...prev,
                ...toResolve.filter((id) => !prev.includes(id)),
            ]);
    };

    // Ensure tasks have original_estimate captured once
    useEffect(() => {
        setTasks((prev) =>
            prev.map((t) =>
                t.original_estimate ? t : { ...t, original_estimate: t.estimated_hours }
            )
        );
    }, []);

    // Week change audio (events also animate separately)
    useEffect(() => {
        if (currentWeek > 1) {
            try {
                new Audio('/sounds/notify.mp3').play();
            } catch (e) {}
        }
    }, [currentWeek]);

    // Keyframes injection (once)
    useEffect(() => {
        if (typeof document !== 'undefined' && !document.getElementById('sim-anim')) {
            const style = document.createElement('style');
            style.id = 'sim-anim';
            style.innerHTML = `@keyframes coin-pop{0%{transform:translateY(0) scale(.8);opacity:1}60%{transform:translateY(-40px) scale(1);opacity:1}100%{transform:translateY(-65px) scale(.9);opacity:0}} @keyframes fadeInSlide{0%{opacity:0;transform:translateY(-6px)}100%{opacity:1;transform:translateY(0)}}`;
            document.head.appendChild(style);
        }
    }, []);

    // Unified interactive icon button style for header quick actions
    const actionIconSx = {
        width: 44,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(255,255,255,0.18)',
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.25)',
        backdropFilter: 'blur(4px)',
        transition: 'all .25s',
        boxShadow: '0 2px 6px -2px rgba(0,0,0,0.35)',
        '&:hover': {
            bgcolor: 'rgba(255,255,255,0.30)',
            boxShadow: '0 4px 14px -2px rgba(0,0,0,0.45)',
        },
        '&:active': { transform: 'scale(.92)' },
        '&.Mui-disabled': { opacity: 0.35, boxShadow: 'none', backdropFilter: 'none' },
    };
    // (activityLog + logAction moved to top to avoid temporal dead zone when referenced inside early callbacks)

    // ===== Conflict Resolution UI State =====
    const [conflictOpen, setConflictOpen] = useState(false);
    const [conflictMemberA, setConflictMemberA] = useState('');
    const [conflictMemberB, setConflictMemberB] = useState('');
    const openConflictResolver = () => {
        // Pre-fill if selected event is a conflict
        if (selectedEventId) {
            const ev = allEvents.find((e) => e.id === selectedEventId);
            if (ev && ev.type === 'Team Conflict' && (ev.member_ids || []).length >= 2) {
                setConflictMemberA(ev.member_ids[0]);
                setConflictMemberB(ev.member_ids[1]);
            }
        }
        setConflictOpen(true);
    };
    const closeConflictResolver = () => setConflictOpen(false);
    const canMediate = useMemo(
        () => conflictMemberA && conflictMemberB && conflictMemberA !== conflictMemberB,
        [conflictMemberA, conflictMemberB]
    );
    const handleMediate = () => {
        if (!canMediate) return;
        // Apply morale boosts and small workload normalization
        setTeam((prev) =>
            prev.map((m) => {
                if ([conflictMemberA, conflictMemberB].includes(m.id)) {
                    return {
                        ...m,
                        morale: Math.min(100, (m.morale ?? 70) + 8),
                        status: 'Active',
                        workload: Math.max(30, (m.workload || 50) - 5),
                    };
                }
                return m;
            })
        );
        // Resolve any current week team_conflict events referencing these members
        const toResolve = allEvents
            .filter(
                (e) =>
                    e.action_type === 'team_event' &&
                    e.type === 'Team Conflict' &&
                    (e.trigger_week || 0) === currentWeek &&
                    (e.member_ids || []).every((id) =>
                        [conflictMemberA, conflictMemberB].includes(id)
                    )
            )
            .map((e) => e.id);
        if (toResolve.length)
            setResolvedEventIds((prev) => [
                ...prev,
                ...toResolve.filter((id) => !prev.includes(id)),
            ]);
        logAction('Mediated conflict between members ' + conflictMemberA + ' & ' + conflictMemberB);
        setConflictOpen(false);
    };

    // ===== Add Task (Manager Directive) State =====
    const selectedEvent = useMemo(
        () => allEvents.find((e) => e.id === selectedEventId),
        [selectedEventId, allEvents]
    );
    // Detect any active manager directive requiring a new task (supports legacy simulations where action_type was update_task)
    const addTaskDirectiveEvent = useMemo(() => {
        // Prefer explicit add_task action_type
        let ev = allEvents.find(
            (e) =>
                e.action_type === 'add_task' &&
                (e.trigger_week || 0) <= currentWeek &&
                !resolvedEventIds.includes(e.id)
        );
        if (ev) return ev;
        // Fallback: legacy event with specific title/desc pattern
        return allEvents.find(
            (e) =>
                e.type === 'Manager Directive' &&
                /Add Compliance Audit Task/i.test(e.title || '') &&
                (e.trigger_week || 0) <= currentWeek &&
                !resolvedEventIds.includes(e.id)
        );
    }, [allEvents, currentWeek, resolvedEventIds]);
    // Build metadata (explicit or parsed)
    const addTaskMeta = useMemo(() => {
        if (!addTaskDirectiveEvent) return null;
        if (addTaskDirectiveEvent.new_task) return addTaskDirectiveEvent.new_task;
        // Parse description for legacy structure
        const d = addTaskDirectiveEvent.desc || '';
        const titleMatch = /task "([^"]+)"/i.exec(d);
        const priorityMatch = /(High|Medium|Low) priority/i.exec(d);
        const hoursMatch = /estimated\s+(\d+)h/i.exec(d);
        const skillsMatch = /skills?:\s*([^\)]+)/i.exec(d);
        const skills = skillsMatch
            ? skillsMatch[1]
                  .split(/[,\n]/)
                  .map((s) => s.trim())
                  .filter(Boolean)
            : ['General'];
        return {
            title: titleMatch ? titleMatch[1] : 'New Task',
            priority: priorityMatch ? priorityMatch[1] : 'Medium',
            estimated_hours: hoursMatch ? parseInt(hoursMatch[1]) : 8,
            required_skills: skills,
        };
    }, [addTaskDirectiveEvent]);
    const [addTaskOpen, setAddTaskOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState(''); // user must choose
    const [newTaskEst, setNewTaskEst] = useState(''); // hours blank until user enters
    const [newTaskSkills, setNewTaskSkills] = useState(''); // user-provided skills list
    useEffect(() => {
        if (addTaskMeta) {
            // Only prefill the title; leave rest for user to decide per requirement
            setNewTaskTitle(addTaskMeta.title || '');
            setNewTaskPriority('');
            setNewTaskEst('');
            setNewTaskSkills('');
        }
    }, [addTaskMeta]);
    const openAddTask = () => {
        if (addTaskMeta) setAddTaskOpen(true);
    };
    const closeAddTask = () => setAddTaskOpen(false);
    const handleCreateTask = () => {
        if (!newTaskTitle.trim() || !newTaskPriority || !newTaskEst) return; // guard
        const nextId = tasks.reduce((max, t) => Math.max(max, t.id), 0) + 1;
        const parsedEst = parseInt(newTaskEst, 10);
        if (isNaN(parsedEst) || parsedEst <= 0) return;
        const est = parsedEst;
        // Simple proportional budget: average per-hour cost * estimated hours
        const avgMemberWeekly = team.length
            ? team.reduce((s, m) => s + (m.weekly_cost || 0), 0) / team.length
            : 3000;
        const avgHourly =
            avgMemberWeekly /
            (team.length
                ? team.reduce((s, m) => s + (m.capacity_hours || 30), 0) / team.length || 30
                : 30);
        const budget = Math.round(avgHourly * est * 1.05); // slight overhead buffer
        const skillList = newTaskSkills
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean);
        const task = {
            id: nextId,
            title: newTaskTitle || 'New Task',
            priority: newTaskPriority,
            status: 'Pending',
            assignee: null,
            progress: 0,
            estimated_hours: est,
            remaining_hours: est,
            required_skills: skillList.length ? skillList : ['General'],
            budget,
            budget_share_pct: null,
            cancellable: true,
        };
        setTasks((prev) => [...prev, task]);
        // Resolve event
        if (selectedEvent && selectedEvent.action_type === 'add_task') {
            setResolvedEventIds((prev) =>
                prev.includes(selectedEvent.id) ? prev : [...prev, selectedEvent.id]
            );
            logAction('Added task for directive: ' + task.title);
        }
        setAddTaskOpen(false);
    };

    // ===== End-of-Project Evaluation State =====
    const [resultsOpen, setResultsOpen] = useState(simulationCompleted);
    const [results, setResults] = useState(null);

    const computeResults = useCallback(() => {
        const totalTasks = tasks.length;
        const doneTasks = tasks.filter((t) => t.status === 'Done').length;
        const cancelledTasks = tasks.filter((t) => t.status === 'Cancelled').length;
        const activeTasks = totalTasks - cancelledTasks;
        const highPriority = tasks.filter((t) => t.priority === 'High');
        const highDone = highPriority.filter((t) => t.status === 'Done').length;
        const lowCancelled = tasks.filter(
            (t) => t.priority === 'Low' && t.status === 'Cancelled'
        ).length;
        const spent = totalBudget - remainingBudget;
        const remainingPct = totalBudget ? remainingBudget / totalBudget : 0;
        const deliveryRate = activeTasks ? doneTasks / activeTasks : 0;
        const highFocus = highPriority.length ? highDone / highPriority.length : 0;
        const adaptiveness = (lowCancelled + 1) / (cancelledTasks + 1); // higher if most cancellations are low priority
        const avgMorale = team.length
            ? team.reduce((s, m) => s + (m.morale ?? 70), 0) / team.length
            : 70;
        const removals = simulation?.team ? simulation.team.length - team.length : 0;
        const actionCounts = activityLog.reduce(
            (acc, a) => {
                if (a.label.includes('Standup')) acc.standups++;
                if (a.label.includes('Team Event')) acc.teamEvents++;
                if (a.label.toLowerCase().includes('praise')) acc.praises++;
                return acc;
            },
            { standups: 0, teamEvents: 0, praises: 0 }
        );

        // Calculate action performance metrics
        const avgActionScore = actionCount > 0 ? totalScore / actionCount : 0;
        const actionParticipation = allEvents.filter(
            (e) => e.resolution_options && e.resolution_options.length > 0
        ).length;
        const actionCompletionRate =
            actionParticipation > 0 ? actionCount / actionParticipation : 0;

        // Scoring weights & formulas - adjusted to include action performance
        const scoreBudget = (() => {
            // Encourage reasonable remaining (10-40%). Penalize hoarding or overspend.
            const sweetMin = 0.1,
                sweetMax = 0.4;
            if (remainingPct < sweetMin)
                return 50 * Math.max(0, 1 - (sweetMin - remainingPct) * 2.5);
            if (remainingPct > sweetMax)
                return 50 * Math.max(0, 1 - (remainingPct - sweetMax) * 2.0);
            return 50; // inside sweet band - reduced from 60 to make room for actions
        })();
        const scoreDelivery = 20 * deliveryRate; // reduced from 25
        const scoreHighFocus = 20 * highFocus; // reduced from 25
        const scoreAdapt = 12 * adaptiveness; // reduced from 15
        const scoreMorale = 15 * (avgMorale / 100); // reduced from 20
        const scoreStability =
            10 * Math.max(0, 1 - removals / Math.max(1, simulation?.team?.length || 1)); // reduced from 15

        // New action performance scoring (20 points total)
        const scoreActionQuality = actionCount > 0 ? Math.min(15, avgActionScore * 0.15) : 0; // Up to 15 points for quality
        const scoreActionEngagement = Math.min(5, actionCompletionRate * 5); // Up to 5 points for engagement

        let raw =
            scoreBudget +
            scoreDelivery +
            scoreHighFocus +
            scoreAdapt +
            scoreMorale +
            scoreStability +
            scoreActionQuality +
            scoreActionEngagement;
        raw = Math.max(0, Math.min(100, raw));
        const tier =
            raw >= 85
                ? 'Elite'
                : raw >= 70
                  ? 'Strong'
                  : raw >= 55
                    ? 'Developing'
                    : 'Needs Improvement';
        return {
            summary: {
                totalWeeks: projectWeeks,
                totalTasks,
                doneTasks,
                cancelledTasks,
                highPriority: highPriority.length,
                highDone,
                lowCancelled,
                remainingBudget: Math.round(remainingBudget),
                spent: Math.round(spent),
                remainingPct: +(remainingPct * 100).toFixed(1),
                avgMorale: Math.round(avgMorale),
                removals,
                actionCount,
                avgActionScore: +avgActionScore.toFixed(1),
                actionCompletionRate: +(actionCompletionRate * 100).toFixed(1),
                ...actionCounts,
            },
            scores: {
                budget: +scoreBudget.toFixed(1),
                delivery: +scoreDelivery.toFixed(1),
                highFocus: +scoreHighFocus.toFixed(1),
                adaptiveness: +scoreAdapt.toFixed(1),
                morale: +scoreMorale.toFixed(1),
                stability: +scoreStability.toFixed(1),
                actionQuality: +scoreActionQuality.toFixed(1),
                actionEngagement: +scoreActionEngagement.toFixed(1),
            },
            overall: +raw.toFixed(1),
            tier,
        };
    }, [
        tasks,
        totalBudget,
        remainingBudget,
        team,
        projectWeeks,
        simulation,
        activityLog,
        actionCount,
        totalScore,
        allEvents,
    ]);

    // Submit certification score when simulation completes
    const submitCertificationScore = useCallback(
        async (simulationScore) => {
            if (!certificationAttempt) return;

            try {
                const response = await fetch('/certification/complete-from-simulator', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN': document
                            .querySelector('meta[name="csrf-token"]')
                            .getAttribute('content'),
                    },
                    body: JSON.stringify({
                        simulation_score: simulationScore,
                        simulation_data: {
                            project_title: project?.title,
                            total_weeks: projectWeeks,
                            final_budget: remainingBudget,
                            total_budget: totalBudget,
                            tasks_completed: tasks.filter((t) => t.status === 'Done').length,
                            total_tasks: tasks.length,
                            team_final_morale:
                                team.reduce((sum, m) => sum + (m.morale || 70), 0) / team.length,
                            actions_taken: actionCount,
                            events_resolved: resolvedEventIds.length,
                            activity_log: activityLog.slice(0, 10), // Last 10 actions
                        },
                    }),
                });

                const result = await response.json();
                console.log('Certification completion result:', result);

                // Store the result for display in the results dialog
                sessionStorage.setItem('certificationResult', JSON.stringify(result));
            } catch (error) {
                console.error('Failed to submit certification score:', error);
            }
        },
        [
            certificationAttempt,
            project,
            projectWeeks,
            remainingBudget,
            totalBudget,
            tasks,
            team,
            actionCount,
            resolvedEventIds,
            activityLog,
        ]
    );

    useEffect(() => {
        if (currentWeek === projectWeeks && !resultsOpen) {
            const r = computeResults();
            setResults(r);
            setResultsOpen(true);
            // Mark simulation as completed
            try {
                sessionStorage.setItem('simulationCompleted', 'true');
                setSimulationCompleted(true);

                // If this is part of certification, automatically submit the score
                if (certificationAttempt) {
                    submitCertificationScore(r.overall);
                }
            } catch (e) {
                // Ignore storage errors
            }
        }
        // If returning to completed simulation, show results
        if (simulationCompleted && !resultsOpen && !results) {
            const r = computeResults();
            setResults(r);
            setResultsOpen(true);
        }
    }, [
        currentWeek,
        projectWeeks,
        resultsOpen,
        computeResults,
        simulationCompleted,
        results,
        certificationAttempt,
    ]);

    // ===== Fixed Default Zoom with Firefox transform fallback =====
    // Different zoom levels for public vs authenticated users
    // Public users: 70% zoom (better fit for smaller screens)
    // Authenticated users: 72% zoom (certification experience)
    const isPublicUser = !auth?.user;

    // Theme colors from Dashboard
    const dashboardGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    const dashboardCardGradient =
        'linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)';
    const dashboardAccent = '#764ba2';
    const dashboardPrimary = '#667eea';
    const dashboardTextShadow = '0 0 14px rgba(255,255,255,0.6), 0 0 38px rgba(120,160,255,0.35)';
    const uiScale = isPublicUser ? 0.7 : 0.72;
    // Font scaling factor
    const fontScale = 1.6;
    const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
    // Prevent manual zoom (Ctrl + / - / 0 and pinch zoom)
    // Enhanced prevention for public users
    useEffect(() => {
        const keyBlock = (e) => {
            if (e.ctrlKey && ['+', '=', '-', '0'].includes(e.key)) {
                e.preventDefault();
            }
        };
        const wheelBlock = (e) => {
            if (e.ctrlKey) {
                e.preventDefault();
            }
        };

        // Enhanced zoom prevention for public users (mobile pinch-to-zoom)
        let touchStartDistance = 0;
        const touchStart = (e) => {
            if (isPublicUser && e.touches.length >= 2) {
                touchStartDistance = Math.hypot(
                    e.touches[0].pageX - e.touches[1].pageX,
                    e.touches[0].pageY - e.touches[1].pageY
                );
            }
        };

        const touchMove = (e) => {
            if (isPublicUser && e.touches.length >= 2) {
                e.preventDefault(); // Prevent pinch zoom on mobile
            }
        };

        window.addEventListener('keydown', keyBlock, { passive: false });
        window.addEventListener('wheel', wheelBlock, { passive: false });

        if (isPublicUser) {
            window.addEventListener('touchstart', touchStart, { passive: false });
            window.addEventListener('touchmove', touchMove, { passive: false });
        }

        return () => {
            window.removeEventListener('keydown', keyBlock);
            window.removeEventListener('wheel', wheelBlock);
            if (isPublicUser) {
                window.removeEventListener('touchstart', touchStart);
                window.removeEventListener('touchmove', touchMove);
            }
        };
    }, [isPublicUser]);

    // Hide horizontal scroll introduced by scaled container
    useEffect(() => {
        const prev = document.body.style.overflowX;
        document.body.style.overflowX = 'hidden';
        return () => {
            document.body.style.overflowX = prev;
        };
    }, []);
    // Remove default body margin to prevent bottom gap under scaled content
    useEffect(() => {
        const prevM = document.body.style.margin;
        const prevP = document.body.style.padding;
        document.body.style.margin = '0';
        document.body.style.padding = '0';
        return () => {
            document.body.style.margin = prevM;
            document.body.style.padding = prevP;
        };
    }, []);
    // Hide vertical scrollbar when content fits viewport (post-scale)
    useEffect(() => {
        const updateOverflow = () => {
            const needsScroll = document.documentElement.scrollHeight > window.innerHeight + 2;
            if (!needsScroll) {
                document.body.style.overflowY = 'hidden';
            } else {
                document.body.style.overflowY = 'auto';
            }
        };
        updateOverflow();
        window.addEventListener('resize', updateOverflow);
        return () => window.removeEventListener('resize', updateOverflow);
    }, []);

    // Enhanced viewport control for public users (disable zoom completely on mobile)
    useEffect(() => {
        if (isPublicUser) {
            const viewport = document.querySelector('meta[name=viewport]');
            let originalContent = null;

            if (viewport) {
                originalContent = viewport.content;
                viewport.content =
                    'width=device-width, initial-scale=0.7, maximum-scale=0.7, minimum-scale=0.7, user-scalable=no';
            } else {
                const newViewport = document.createElement('meta');
                newViewport.name = 'viewport';
                newViewport.content =
                    'width=device-width, initial-scale=0.7, maximum-scale=0.7, minimum-scale=0.7, user-scalable=no';
                document.head.appendChild(newViewport);
            }

            return () => {
                if (viewport && originalContent) {
                    viewport.content = originalContent;
                }
            };
        }
    }, [isPublicUser]);

    // Simple flex approach (header + progress bar; panels flex to fill)

    // Animate displayed budget toward remainingBudget (lotto style) when it increases
    useEffect(() => {
        if (displayedBudget === remainingBudget) return;
        const start = displayedBudget;
        const end = remainingBudget;
        const diff = end - start;
        const duration = 900; // ms
        const startTime = performance.now();
        const step = (now) => {
            const t = Math.min(1, (now - startTime) / duration);
            // easeOutQuad
            const eased = 1 - (1 - t) * (1 - t);
            const current = start + diff * eased;
            setDisplayedBudget(current);
            if (t < 1) requestAnimationFrame(step);
            else setDisplayedBudget(end);
        };
        requestAnimationFrame(step);
    }, [remainingBudget]);

    // Choose layout based on whether user is logged in (public vs authenticated)
    const Layout = auth?.user ? AuthenticatedLayout : PublicLayout;
    const layoutProps = auth?.user ? { user: auth.user } : {};

    return (
        <Layout {...layoutProps}>
            <Head title="Project Management Simulator" />
            {/* Scaled UI wrapper fills full viewport (after scale) without horizontal scroll */}
            <div
                ref={wrapperRef}
                style={
                    isFirefox
                        ? {
                              transform: `scale(${uiScale})`,
                              transformOrigin: 'top left',
                              height: `calc((100vh - 5vh) / ${uiScale})`,
                              width: `${100 / uiScale}%`,
                              display: 'flex',
                              flexDirection: 'column',
                              background: dashboardGradient,
                              fontSize: `${fontScale}em`,
                          }
                        : {
                              zoom: uiScale,
                              height: `calc((100vh - 5vh) / ${uiScale})`,
                              width: '100%',
                              display: 'flex',
                              flexDirection: 'column',
                              background: dashboardGradient,
                              fontSize: `${fontScale}em`,
                          }
                }
            >
                {/* Header Section */}
                <div
                    style={{
                        background: dashboardGradient,
                        color: 'white',
                        padding: '8px 16px 6px 16px',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        boxShadow: '0 4px 18px rgba(0,0,0,0.28)',
                        position: 'relative',
                        borderBottom: '2px solid #fff2',
                        fontSize: `${fontScale * 0.8}em`,
                    }}
                >
                    <h1
                        style={{
                            margin: 0,
                            fontSize: `${1.2 * fontScale}rem`,
                            fontWeight: 700,
                            letterSpacing: '-0.025em',
                            lineHeight: 1.05,
                            background: 'linear-gradient(135deg,#fff 0%,#f2f5ff 45%,#ffffff 80%)',
                            backgroundClip: 'text',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            textShadow: dashboardTextShadow,
                        }}
                    >
                        {project?.title || 'ProjectSimulate'}
                    </h1>

                    {/* Day Counter and Controls */}
                    <div
                        ref={navRef}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            position: 'relative',
                        }}
                    >
                        {/* Budget */}
                        <div
                            style={{
                                background: dashboardCardGradient,
                                padding: '6px 8px',
                                borderRadius: 6,
                                minWidth: 200,
                                maxWidth: 200,
                                boxShadow: '0 1px 4px rgba(120,120,180,0.08)',
                                height: '44px',
                                display: 'flex',
                                flexDirection: 'column',
                                justifyContent: 'center',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    fontSize: `${0.6 * fontScale}rem`,
                                    fontWeight: 500,
                                    color: dashboardAccent,
                                }}
                            >
                                <span>Budget</span>
                                <span>
                                    ${Math.round(displayedBudget).toLocaleString()} / $
                                    {totalBudget.toLocaleString()}
                                </span>
                            </div>
                            <LinearProgress
                                variant="determinate"
                                value={
                                    totalBudget
                                        ? ((totalBudget - remainingBudget) / totalBudget) * 100
                                        : 0
                                }
                                sx={{
                                    mt: 0.3,
                                    height: 3,
                                    borderRadius: 2,
                                    background: 'rgba(120,120,180,0.15)',
                                }}
                            />
                        </div>
                        <div
                            style={{
                                background: dashboardCardGradient,
                                padding: '6px 8px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '6px',
                                fontSize: `${0.6 * fontScale}rem`,
                                fontWeight: 500,
                                color: dashboardPrimary,
                                boxShadow: '0 1px 4px rgba(120,120,180,0.08)',
                                minWidth: 200,
                                maxWidth: 200,
                                height: '44px',
                            }}
                        >
                            <span style={{ fontSize: '0.9rem' }}>⏰</span>
                            <span>
                                Week {currentWeek} of {projectWeeks}
                            </span>
                        </div>

                        {/* Action Performance Metrics */}
                        {actionCount > 0 && (
                            <div
                                style={{
                                    background: dashboardCardGradient,
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    fontSize: `${0.6 * fontScale}rem`,
                                    fontWeight: 500,
                                    color: dashboardAccent,
                                    boxShadow: '0 1px 4px rgba(120,120,180,0.08)',
                                    minWidth: 160,
                                    maxWidth: 160,
                                    height: '44px',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <span>Actions</span>
                                    <span>{actionCount}</span>
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginTop: 2,
                                    }}
                                >
                                    <span>Avg Score</span>
                                    <span
                                        style={{
                                            color:
                                                actionCount > 0
                                                    ? totalScore / actionCount >= 80
                                                        ? '#2e7d32'
                                                        : totalScore / actionCount >= 60
                                                          ? '#ed6c02'
                                                          : '#d32f2f'
                                                    : dashboardAccent,
                                        }}
                                    >
                                        {actionCount > 0 ? Math.round(totalScore / actionCount) : 0}
                                    </span>
                                </div>
                            </div>
                        )}
                        {tradeoffStats.actions > 0 && (
                            <div
                                style={{
                                    background: dashboardCardGradient,
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    justifyContent: 'center',
                                    fontSize: `${0.6 * fontScale}rem`,
                                    fontWeight: 500,
                                    color: dashboardAccent,
                                    boxShadow: '0 1px 4px rgba(120,120,180,0.08)',
                                    minWidth: 200,
                                    maxWidth: 200,
                                    height: '44px',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                    }}
                                >
                                    <span>Trade-offs</span>
                                    <span>{tradeoffStats.actions}</span>
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        marginTop: 2,
                                    }}
                                >
                                    <span>
                                        +${(tradeoffStats.budget_gained / 1000).toFixed(1)}k
                                    </span>
                                    <span style={{ color: '#d32f2f' }}>
                                        -{(tradeoffStats.budget_spent / 1000).toFixed(1)}k
                                    </span>
                                </div>
                            </div>
                        )}

                        {/* Agile quick action buttons (interactive) */}
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title={`Standup (Cost $${STANDUP_COST}, +5% progress)`}>
                                <span>
                                    <IconButton
                                        size="small"
                                        onClick={handleStandup}
                                        sx={actionIconSx}
                                        disabled={remainingBudget < STANDUP_COST}
                                        aria-label="run standup"
                                    >
                                        <GroupIcon fontSize="inherit" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            {addTaskMeta && (
                                <Tooltip title="Create Task (manager directive)">
                                    <span>
                                        <IconButton
                                            size="small"
                                            onClick={openAddTask}
                                            sx={actionIconSx}
                                            aria-label="add task from directive"
                                        >
                                            +
                                        </IconButton>
                                    </span>
                                </Tooltip>
                            )}
                            <Tooltip title="Resolve Team Conflict (mediate)">
                                <span>
                                    <IconButton
                                        size="small"
                                        onClick={openConflictResolver}
                                        sx={actionIconSx}
                                        disabled={weekAdjustedTeam.length < 2}
                                        aria-label="mediate conflict"
                                    >
                                        <HandshakeIcon fontSize="inherit" />
                                    </IconButton>
                                </span>
                            </Tooltip>
                            <Tooltip title={`Team Event (Cost $${TEAM_EVENT_COST}, +morale)`}>
                                <span>
                                    <IconButton
                                        size="small"
                                        onClick={handleTeamEvent}
                                        sx={{ ...actionIconSx, bgcolor: 'rgba(255,255,255,0.20)' }}
                                        disabled={remainingBudget < TEAM_EVENT_COST}
                                        aria-label="team event"
                                    >
                                        <CelebrationIcon fontSize="inherit" />
                                    </IconButton>
                                </span>
                            </Tooltip>

                            {/* Debug: Resolve All Events (development aid) */}
                            {visibleEvents.length > 0 && (
                                <Tooltip title="Force resolve all current events" arrow>
                                    <IconButton
                                        onClick={resolveAllEvents}
                                        sx={{
                                            ...actionIconSx,
                                            opacity: 0.7,
                                            fontSize: '12px',
                                        }}
                                        aria-label="resolve all events"
                                    >
                                        ✓
                                    </IconButton>
                                </Tooltip>
                            )}

                            {/* Debug: Test passive resolution */}
                            {visibleEvents.length > 0 && (
                                <Tooltip title="Debug: Test passive resolution logic" arrow>
                                    <IconButton
                                        onClick={debugPassiveResolution}
                                        sx={{
                                            ...actionIconSx,
                                            opacity: 0.5,
                                            fontSize: '10px',
                                        }}
                                        aria-label="debug resolution"
                                    >
                                        🔍
                                    </IconButton>
                                </Tooltip>
                            )}
                        </Box>
                        <IconButton
                            onClick={() => {
                                attemptAdvanceWeek();
                                if (walkStep === 4) advanceWalk();
                            }}
                            disabled={currentWeek >= projectWeeks}
                            aria-label="advance week"
                            sx={{
                                ...actionIconSx,
                                // unify base appearance, but add accent ring + subtle gradient
                                background:
                                    'linear-gradient(145deg, rgba(255,255,255,0.20), rgba(255,255,255,0.12))',
                                color: '#fff',
                                boxShadow:
                                    walkStep === 4
                                        ? '0 0 0 4px #667eea, 0 4px 12px -2px rgba(0,0,0,0.45)'
                                        : actionIconSx.boxShadow,
                                position: 'relative',
                                top: '1px',
                                '&:hover': {
                                    ...(actionIconSx['&:hover'] || {}),
                                    background:
                                        'linear-gradient(145deg, rgba(255,255,255,0.32), rgba(255,255,255,0.18))',
                                },
                            }}
                        >
                            <ArrowForwardIcon fontSize="small" />
                        </IconButton>
                        <Dialog
                            open={advanceGuardOpen}
                            onClose={cancelAdvance}
                            maxWidth="xs"
                            fullWidth
                        >
                            <DialogTitle>No Progress Made</DialogTitle>
                            <DialogContent dividers>
                                <Typography variant="body2" gutterBottom>
                                    You haven't advanced any tasks this week (no status or progress
                                    changes). Moving forward without action may waste capacity.
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    Make at least one update or choose Continue to advance anyway.
                                </Typography>
                            </DialogContent>
                            <DialogActions>
                                <MUIButton onClick={cancelAdvance}>Stay</MUIButton>
                                <MUIButton onClick={confirmAdvanceAnyway} variant="contained">
                                    Continue
                                </MUIButton>
                            </DialogActions>
                        </Dialog>
                        {walkStep === 4 && (
                            <GuideOverlayLeft
                                title="Navigate Weeks"
                                description="Use this button to advance the simulation one week at a time. Strategy shifts as new events appear."
                                onNext={advanceWalk}
                                onSkip={skipWalk}
                                final
                            />
                        )}
                        {/* Coin bursts */}

                        {/* Conflict dialog mounted near root (outside conditional sections) */}
                        {/* Coin bursts now rendered globally using fixed viewport coordinates */}
                    </div>

                    {/* Removed duplicate user avatar (dropdown already present elsewhere) */}
                </div>

                {/* Progress Bar */}
                <div
                    style={{
                        height: '10px',
                        background: dashboardCardGradient,
                        position: 'relative',
                        boxShadow: '0 2px 8px rgba(120,120,180,0.10)',
                        borderRadius: '6px',
                        marginBottom: '2px',
                    }}
                >
                    <div
                        style={{
                            height: '100%',
                            width: `${(currentWeek / projectWeeks) * 100}%`,
                            background: dashboardAccent,
                            transition: 'width 0.3s ease',
                            borderRadius: '6px',
                        }}
                    ></div>
                </div>

                {/* Main Content - Three Panel Layout */}
                <div
                    style={{
                        display: 'flex',
                        flex: 1,
                        minHeight: 0,
                        background: dashboardCardGradient,
                        overflow: 'hidden',
                        fontSize: `${1.15 * fontScale}rem`,
                    }}
                >
                    {/* Events + Command Center Panel */}
                    <div
                        ref={eventsRef}
                        style={{
                            flex: '0 0 30%',
                            display: 'flex',
                            flexDirection: 'column',
                            background: dashboardCardGradient,
                            borderRight: '2px solid #eaeaea',
                            position: 'relative',
                            minHeight: 0,
                        }}
                    >
                        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: 4 }}>
                            <Events
                                events={eventsForRender}
                                week={currentWeek}
                                onSelect={handleEventSelect}
                                highlightColorMap={highlightColorMap}
                                selectedEventId={selectedEventId}
                                resolvedEventIds={resolvedEventIds}
                                onResolve={resolveEvent}
                                onActionTaken={handleComplexAction}
                                onResolveOption={evaluateEventResolution}
                            />
                        </div>
                        {walkStep === 1 && (
                            <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8 }}>
                                <GuideOverlay
                                    onNext={advanceWalk}
                                    onSkip={skipWalk}
                                    title="Events"
                                    description="Assess and resolve events directly here. Select an event and choose an option inline."
                                />
                            </div>
                        )}
                    </div>

                    {/* Tasks Panel - Center */}
                    <div
                        ref={tasksRef}
                        style={{
                            flex: '0 0 45%',
                            display: 'flex',
                            flexDirection: 'column',
                            background: '#fff',
                            borderRight: '2px solid #eaeaea',
                            padding: 0,
                            position: 'relative',
                            boxShadow: walkStep === 2 ? '0 0 0 4px #667eea inset' : undefined,
                            zIndex: walkStep === 2 ? 10 : 'auto',
                            minHeight: 0,
                            fontSize: `${1.15 * fontScale}rem`,
                        }}
                    >
                        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: 4 }}>
                            <Tasks
                                tasks={tasks}
                                team={weekAdjustedTeam.filter((m) =>
                                    team.some((tm) => tm.id === m.id)
                                )}
                                week={currentWeek}
                                highlightedTaskIds={highlightedTaskIds}
                                highlightColorMap={highlightColorMap}
                                onClearHighlights={clearHighlights}
                                forceExpandTaskId={forceExpandTaskId}
                                collapseVersion={collapseVersion}
                                onTaskChange={handleTaskChange}
                                onTaskAction={handleTaskAction}
                                currentWeek={currentWeek}
                                simulationState={{
                                    budget: remainingBudget,
                                    totalBudget: totalBudget,
                                    teamMorale:
                                        team.length > 0
                                            ? team.reduce((sum, m) => sum + (m.morale || 70), 0) /
                                              team.length
                                            : 70,
                                    weekProgress: currentWeek / projectWeeks,
                                    tasksCompleted: tasks.filter((t) => t.status === 'Completed')
                                        .length,
                                    totalTasks: tasks.length,
                                }}
                                canAddTask={!!addTaskMeta}
                                onShowAddTask={openAddTask}
                                events={allEvents}
                                resolvedEventIds={resolvedEventIds}
                                onResolveEventAction={async (
                                    event,
                                    resolutionOption,
                                    notes = ''
                                ) => {
                                    try {
                                        const response = await fetch('/simulator/evaluate-action', {
                                            method: 'POST',
                                            headers: {
                                                'Content-Type': 'application/json',
                                                'X-CSRF-TOKEN':
                                                    document
                                                        .querySelector('meta[name="csrf-token"]')
                                                        ?.getAttribute('content') || '',
                                            },
                                            body: JSON.stringify({
                                                event_id: event.id,
                                                event,
                                                resolution_option: resolutionOption,
                                                notes,
                                                game_state: {
                                                    remaining_budget: remainingBudget,
                                                    team_utilization: team.length
                                                        ? team.reduce(
                                                              (s, m) => s + (m.workload || 50),
                                                              0
                                                          ) /
                                                          (team.length * 100)
                                                        : 0.5,
                                                    team_morale_avg: team.length
                                                        ? team.reduce(
                                                              (s, m) => s + (m.morale || 70),
                                                              0
                                                          ) / team.length
                                                        : 70,
                                                    timeline_buffer_weeks: Math.max(
                                                        0,
                                                        projectWeeks - currentWeek
                                                    ),
                                                    current_week: currentWeek,
                                                },
                                                week: currentWeek,
                                            }),
                                        });
                                        const data = await response.json();
                                        if (data.success) {
                                            handleComplexAction(
                                                event,
                                                { resolution_option: resolutionOption },
                                                data.evaluation,
                                                data.effects
                                            );
                                            resolveEvent(event.id);
                                            return {
                                                success: true,
                                                evaluation: data.evaluation,
                                                effects: data.effects,
                                            };
                                        }
                                        return {
                                            success: false,
                                            message: data.message || 'Evaluation failed',
                                        };
                                    } catch (e) {
                                        console.error('Event action error', e);
                                        return { success: false, message: e.message };
                                    }
                                }}
                            />
                        </div>
                        {walkStep === 2 && (
                            <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8 }}>
                                <GuideOverlay
                                    onNext={advanceWalk}
                                    onSkip={skipWalk}
                                    title="Tasks"
                                    description="Update task status, progress, priority, or assignee. Expanded first task for you to explore."
                                />
                            </div>
                        )}
                    </div>

                    {/* Team Panel - Right (swapped) */}
                    <div
                        ref={teamRef}
                        style={{
                            flex: '0 0 25%',
                            display: 'flex',
                            flexDirection: 'column',
                            background: dashboardCardGradient,
                            padding: 0,
                            position: 'relative',
                            boxShadow: walkStep === 3 ? '0 0 0 4px #667eea inset' : undefined,
                            zIndex: walkStep === 3 ? 10 : 'auto',
                            minHeight: 0,
                            fontSize: `${1.15 * fontScale}rem`,
                        }}
                    >
                        <div style={{ flex: 1, overflowY: 'auto', minHeight: 0, paddingRight: 4 }}>
                            <Team
                                members={weekAdjustedTeam}
                                onRemove={handleRemoveMember}
                                onPraise={handlePraiseMember}
                                praiseBursts={praiseBursts}
                            />
                        </div>
                        {walkStep === 3 && (
                            <div style={{ position: 'absolute', left: 8, right: 8, bottom: 8 }}>
                                <GuideOverlay
                                    onNext={advanceWalk}
                                    onSkip={skipWalk}
                                    title="Team"
                                    description="Assign team members to tasks matching their skills and adapt to weekly availability changes."
                                />
                            </div>
                        )}
                    </div>
                </div>
                {/* Bottom spacer to reserve 5% gap without causing scroll */}
                <div style={{ height: '5vh', flexShrink: 0 }} />
                {/* Floating coin layer (outside zoom impact) */}
                <div
                    style={{
                        position: 'fixed',
                        left: 0,
                        top: 0,
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none',
                        zIndex: 9999,
                    }}
                >
                    {coinBursts.map((c) => (
                        <div
                            key={c.id}
                            style={{
                                position: 'absolute',
                                left: c.x,
                                top: c.y,
                                transform: 'translate(-50%, -50%)',
                                fontWeight: 700,
                                fontSize: 16,
                                color: '#ffdf66',
                                animation: 'coin-pop 1.6s ease-out forwards',
                                textShadow: '0 0 8px rgba(0,0,0,0.45)',
                                background: 'rgba(0,0,0,0.25)',
                                padding: '2px 6px',
                                borderRadius: 6,
                                border: '1px solid rgba(255,255,255,0.4)',
                                backdropFilter: 'blur(2px)',
                            }}
                        >
                            +{Math.round(c.amt).toLocaleString()}
                        </div>
                    ))}
                </div>

                {/* Intro Modal */}
                <Dialog open={introOpen} maxWidth="sm" fullWidth>
                    <DialogTitle>Project Brief</DialogTitle>
                    <DialogContent dividers>
                        <Typography variant="h6" gutterBottom>
                            {project?.title}
                        </Typography>
                        <Typography variant="body2" paragraph>
                            {project?.description}
                        </Typography>
                        <Typography variant="subtitle2" gutterBottom>
                            Objective
                        </Typography>
                        <Typography variant="body2" paragraph>
                            {project?.primary_objective}
                        </Typography>
                        <Typography variant="subtitle2" gutterBottom>
                            Your Goal in the Simulator
                        </Typography>
                        <Typography variant="body2" paragraph>
                            Respond to weekly events, keep high‑priority tasks on track, reallocate
                            or cancel tasks if budgets or risks force trade‑offs, and utilize team
                            skills efficiently across {projectWeeks} weeks.
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            You can revisit this guidance later by refreshing (walkthrough runs once
                            per load).
                        </Typography>
                    </DialogContent>
                    <DialogActions>
                        <MUIButton onClick={startWalkthrough} variant="contained">
                            Start
                        </MUIButton>
                    </DialogActions>
                </Dialog>
            </div>
            {resultsOpen && results && (
                <Dialog
                    open
                    onClose={() => {
                        setResultsOpen(false);
                        // Keep completion flag so users can return to results by going back
                    }}
                    maxWidth="md"
                    fullWidth
                >
                    <DialogTitle>Project Results & Evaluation</DialogTitle>
                    <DialogContent dividers>
                        <Typography variant="subtitle1" gutterBottom>
                            Overall Score: <strong>{results.overall}</strong> ({results.tier})
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 2 }}>
                            {Object.entries(results.scores).map(([k, v]) => (
                                <Box
                                    key={k}
                                    sx={{
                                        flex: '1 1 150px',
                                        background: '#f5f5f5',
                                        p: 1.2,
                                        borderRadius: 1,
                                    }}
                                >
                                    <Typography
                                        variant="caption"
                                        sx={{ textTransform: 'uppercase', fontWeight: 600 }}
                                    >
                                        {k}
                                    </Typography>
                                    <Typography variant="body2" fontWeight={600}>
                                        {v}
                                    </Typography>
                                </Box>
                            ))}
                        </Box>
                        <Typography variant="subtitle2" gutterBottom>
                            Summary
                        </Typography>
                        <ul style={{ marginTop: 4, marginBottom: 12 }}>
                            <li>
                                {results.summary.doneTasks}/{results.summary.totalTasks} tasks
                                completed ({results.summary.cancelledTasks} cancelled)
                            </li>
                            <li>
                                {results.summary.highDone}/{results.summary.highPriority} high
                                priority tasks delivered
                            </li>
                            <li>
                                Budget remaining: $
                                {results.summary.remainingBudget.toLocaleString()} (
                                {results.summary.remainingPct}%)
                            </li>
                            <li>
                                Average morale: {results.summary.avgMorale}% | Removals:{' '}
                                {results.summary.removals}
                            </li>
                            <li>
                                Standups: {results.summary.standups} | Team Events:{' '}
                                {results.summary.teamEvents} | Praises: {results.summary.praises}
                            </li>
                        </ul>
                        <Typography variant="subtitle2" gutterBottom>
                            Feedback
                        </Typography>
                        <Typography variant="body2" paragraph>
                            {results.overall >= 85 &&
                                'Excellent resource stewardship and prioritization. Consider experimenting with selective risk to accelerate even further.'}
                            {results.overall >= 70 &&
                                results.overall < 85 &&
                                'Strong execution. Fine-tune budget utilization and sustain morale during later weeks.'}
                            {results.overall >= 55 &&
                                results.overall < 70 &&
                                'Developing practice. Improve early focus on high priority outcomes and purposeful cancellations.'}
                            {results.overall < 55 &&
                                'Struggled across key levers. Re-evaluate early allocation, intervene sooner on risks, and protect morale.'}
                        </Typography>
                        {/* Certification Status */}
                        {certificationAttempt && (
                            <Box
                                sx={{
                                    mt: 2,
                                    p: 2,
                                    bgcolor:
                                        results.overall >= 70 ? 'success.light' : 'warning.light',
                                    borderRadius: 1,
                                }}
                            >
                                <Typography variant="subtitle2" gutterBottom>
                                    Certification Status
                                </Typography>
                                <Typography variant="body2">
                                    {results.overall >= 70
                                        ? `✅ Simulator Passed (${results.overall}% ≥ 70% required)`
                                        : `❌ Simulator Failed (${results.overall}% < 70% required)`}
                                </Typography>
                                {(() => {
                                    try {
                                        const certResult = JSON.parse(
                                            sessionStorage.getItem('certificationResult') || '{}'
                                        );
                                        if (certResult.success !== undefined) {
                                            return (
                                                <Typography variant="body2" sx={{ mt: 1 }}>
                                                    <strong>Final Result: </strong>
                                                    {certResult.passed
                                                        ? '🎉 Certification Granted!'
                                                        : '❌ Certification Not Granted'}
                                                    <br />
                                                    Theory: {certResult.theory_percentage}% |
                                                    Simulator: {certResult.simulation_percentage}%
                                                </Typography>
                                            );
                                        }
                                    } catch (e) {}
                                    return null;
                                })()}
                            </Box>
                        )}
                    </DialogContent>
                    <DialogActions>
                        {certificationAttempt ? (
                            // Certification mode actions
                            <>
                                {(() => {
                                    try {
                                        const certResult = JSON.parse(
                                            sessionStorage.getItem('certificationResult') || '{}'
                                        );
                                        if (certResult.passed) {
                                            return (
                                                <>
                                                    <MUIButton
                                                        onClick={() =>
                                                            (window.location.href =
                                                                '/certification/certificate')
                                                        }
                                                        variant="contained"
                                                    >
                                                        View Certificate
                                                    </MUIButton>
                                                    <MUIButton
                                                        onClick={() =>
                                                            (window.location.href =
                                                                '/certification/badge')
                                                        }
                                                    >
                                                        View Badge
                                                    </MUIButton>
                                                </>
                                            );
                                        }
                                    } catch (e) {}
                                    return (
                                        <MUIButton
                                            onClick={() =>
                                                (window.location.href = '/certification')
                                            }
                                            variant="contained"
                                        >
                                            Back to Certification
                                        </MUIButton>
                                    );
                                })()}
                            </>
                        ) : (
                            // Regular simulation mode actions
                            <>
                                <MUIButton
                                    onClick={() => {
                                        // Clear completion flag only when user explicitly wants to restart
                                        try {
                                            sessionStorage.removeItem('simulationCompleted');
                                        } catch (e) {}
                                        setSimulationCompleted(false);
                                        setResultsOpen(false);
                                        setCurrentWeek(1);
                                        // Reset all simulation state for a fresh start
                                        setTasks(simulation?.tasks || []);
                                        setTeam(
                                            (simulation?.team || []).map((m) => ({
                                                ...m,
                                                morale: m.morale ?? 70,
                                            }))
                                        );
                                        setResolvedEventIds([]);
                                    }}
                                >
                                    Start New Simulation
                                </MUIButton>
                            </>
                        )}
                    </DialogActions>
                </Dialog>
            )}
            <MuiDialog open={conflictOpen} onClose={closeConflictResolver} maxWidth="sm" fullWidth>
                <MuiDialogTitle>Conflict Resolution</MuiDialogTitle>
                <MuiDialogContent dividers>
                    <Typography variant="body2" mb={2}>
                        Select two members experiencing friction and apply mediation to resolve the
                        conflict event for this week.
                    </Typography>
                    <Box display="flex" gap={2}>
                        <FormControl fullWidth size="small">
                            <InputLabel>Member A</InputLabel>
                            <Select
                                label="Member A"
                                value={conflictMemberA}
                                onChange={(e) => setConflictMemberA(e.target.value)}
                            >
                                {weekAdjustedTeam.map((m) => (
                                    <MenuItem key={m.id} value={m.id}>
                                        {m.id}: {m.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <FormControl fullWidth size="small">
                            <InputLabel>Member B</InputLabel>
                            <Select
                                label="Member B"
                                value={conflictMemberB}
                                onChange={(e) => setConflictMemberB(e.target.value)}
                            >
                                {weekAdjustedTeam.map((m) => (
                                    <MenuItem key={m.id} value={m.id}>
                                        {m.id}: {m.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Box>
                    {conflictMemberA && conflictMemberB && conflictMemberA === conflictMemberB && (
                        <Typography color="error" variant="caption" mt={1} display="block">
                            Select two different members.
                        </Typography>
                    )}
                </MuiDialogContent>
                <MuiDialogActions>
                    <MUIButton onClick={closeConflictResolver}>Cancel</MUIButton>
                    <MUIButton onClick={handleMediate} disabled={!canMediate} variant="contained">
                        Mediate
                    </MUIButton>
                </MuiDialogActions>
            </MuiDialog>
            <MuiDialog open={addTaskOpen} onClose={closeAddTask} maxWidth="sm" fullWidth>
                <MuiDialogTitle>Create Task From Directive</MuiDialogTitle>
                <MuiDialogContent dividers>
                    <Typography variant="body2" mb={1}>
                        Add the requested task. You can tweak fields before creating.
                    </Typography>
                    <TextField
                        label="Title"
                        fullWidth
                        size="small"
                        sx={{ mb: 1.2 }}
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                    />
                    <FormControl fullWidth size="small" sx={{ mb: 1.2 }} required>
                        <InputLabel>Priority</InputLabel>
                        <Select
                            label="Priority"
                            value={newTaskPriority}
                            onChange={(e) => setNewTaskPriority(e.target.value)}
                            displayEmpty
                        >
                            <MenuItem value="">
                                <em>Select priority</em>
                            </MenuItem>
                            {['High', 'Medium', 'Low'].map((p) => (
                                <MenuItem key={p} value={p}>
                                    {p}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <TextField
                        label="Estimated Hours"
                        placeholder="e.g. 10"
                        type="number"
                        size="small"
                        fullWidth
                        sx={{ mb: 1.2 }}
                        value={newTaskEst}
                        onChange={(e) => setNewTaskEst(e.target.value)}
                        required
                    />
                    <TextField
                        label="Required Skills (comma separated)"
                        placeholder="e.g. Governance, Analysis"
                        size="small"
                        fullWidth
                        sx={{ mb: 0.6 }}
                        value={newTaskSkills}
                        onChange={(e) => setNewTaskSkills(e.target.value)}
                    />
                    <Typography variant="caption" color="text.secondary">
                        Priority, hours & skills must be chosen to create. Budget auto-calculated.
                    </Typography>
                </MuiDialogContent>
                <MuiDialogActions>
                    <MUIButton onClick={closeAddTask}>Cancel</MUIButton>
                    <MUIButton
                        variant="contained"
                        onClick={handleCreateTask}
                        disabled={!newTaskTitle.trim() || !newTaskPriority || !newTaskEst}
                    >
                        Create Task
                    </MUIButton>
                </MuiDialogActions>
            </MuiDialog>
        </Layout>
    );
}

// Lightweight overlay component for walkthrough steps
function GuideOverlay({ title, description, onNext, onSkip, final }) {
    return (
        <Box
            sx={{
                position: 'absolute',
                left: 16,
                right: 16,
                bottom: 12,
                zIndex: 30,
                pointerEvents: 'none',
            }}
        >
            <Paper
                elevation={6}
                sx={{
                    position: 'relative',
                    p: 2,
                    border: '2px solid #1976d2',
                    background: '#fff',
                    pointerEvents: 'auto',
                    borderRadius: 2,
                }}
            >
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    {title}
                </Typography>
                <Typography variant="body2" gutterBottom>
                    {description}
                </Typography>
                <Box display="flex" justifyContent="space-between" mt={1}>
                    <MUIButton size="small" onClick={onSkip}>
                        Skip
                    </MUIButton>
                    <MUIButton size="small" variant="contained" onClick={onNext}>
                        {final ? 'Finish' : 'Next'}
                    </MUIButton>
                </Box>
                {/* Arrow */}
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: -12,
                        left: 40,
                        width: 0,
                        height: 0,
                        borderLeft: '12px solid transparent',
                        borderRight: '12px solid transparent',
                        borderTop: '12px solid #1976d2',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        bottom: -10,
                        left: 41,
                        width: 0,
                        height: 0,
                        borderLeft: '11px solid transparent',
                        borderRight: '11px solid transparent',
                        borderTop: '11px solid #fff',
                    }}
                />
            </Paper>
        </Box>
    );
}

// Overlay that sits to the left of the navigation buttons
function GuideOverlayLeft({ title, description, onNext, onSkip, final }) {
    return (
        <Box
            sx={{
                position: 'absolute',
                left: -280,
                top: 0,
                width: 260,
                zIndex: 40,
                pointerEvents: 'none',
            }}
        >
            <Paper
                elevation={6}
                sx={{
                    position: 'relative',
                    p: 2,
                    border: '2px solid #1976d2',
                    background: '#fff',
                    pointerEvents: 'auto',
                    borderRadius: 2,
                }}
            >
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                    {title}
                </Typography>
                <Typography variant="body2" gutterBottom>
                    {description}
                </Typography>
                <Box display="flex" justifyContent="space-between" mt={1}>
                    <MUIButton size="small" onClick={onSkip}>
                        Skip
                    </MUIButton>
                    <MUIButton size="small" variant="contained" onClick={onNext}>
                        {final ? 'Finish' : 'Next'}
                    </MUIButton>
                </Box>
                {/* Arrow pointing right toward button */}
                <Box
                    sx={{
                        position: 'absolute',
                        top: 16,
                        right: -12,
                        width: 0,
                        height: 0,
                        borderTop: '12px solid transparent',
                        borderBottom: '12px solid transparent',
                        borderLeft: '12px solid #1976d2',
                    }}
                />
                <Box
                    sx={{
                        position: 'absolute',
                        top: 16,
                        right: -10,
                        width: 0,
                        height: 0,
                        borderTop: '11px solid transparent',
                        borderBottom: '11px solid transparent',
                        borderLeft: '11px solid #fff',
                    }}
                />
            </Paper>
        </Box>
    );
}
