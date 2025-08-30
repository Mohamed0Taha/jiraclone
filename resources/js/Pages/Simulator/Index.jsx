import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button as MUIButton, Typography, Box, Paper, LinearProgress, Tooltip, IconButton } from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import CelebrationIcon from '@mui/icons-material/Celebration';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import QueryBuilderIcon from '@mui/icons-material/QueryBuilder';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HandshakeIcon from '@mui/icons-material/Handshake';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import Team from './components/Team';
import Tasks from './components/Tasks';
import Events from './components/Events';
import { Dialog as MuiDialog, DialogTitle as MuiDialogTitle, DialogContent as MuiDialogContent, DialogActions as MuiDialogActions, FormControl, InputLabel, Select, MenuItem, TextField } from '@mui/material';

export default function Index({ auth, simulation }) {
    const totalWeeks = simulation?.project?.total_weeks || 10;
    const [currentWeek, setCurrentWeek] = useState(1);
    const [projectWeeks] = useState(totalWeeks);
    // Collapse signal for tasks (increments each week)
    const [collapseVersion, setCollapseVersion] = useState(0);
    // Track resolved events so they disappear once handled (button or related task update)
    const [resolvedEventIds, setResolvedEventIds] = useState([]);
    const resolveEvent = useCallback((id) => setResolvedEventIds(prev => prev.includes(id) ? prev : [...prev, id]), []);
    
    // Initialize data from simulation prop
    const project = simulation?.project;
    const allEvents = simulation?.events || [];
    
    // Local mutable state copies so user interactions can mutate
    const [tasks, setTasks] = useState(() => simulation?.tasks || []);
    const [team, setTeam] = useState(() => (simulation?.team || []).map(m => ({ ...m, morale: m.morale ?? 70 })));
    
    // Check if simulation was completed (stored in sessionStorage to persist across navigation)
    const [simulationCompleted, setSimulationCompleted] = useState(() => {
        try {
            return sessionStorage.getItem('simulationCompleted') === 'true';
        } catch {
            return false;
        }
    });
    
    // Only show current week events (prior weeks drop off UI per requirement)
    const visibleEvents = useMemo(() => allEvents.filter(e => (e.trigger_week || 0) === currentWeek), [allEvents, currentWeek]);

    // Highlighted tasks (from event selection)
    const [highlightedTaskIds, setHighlightedTaskIds] = useState([]);
    const [highlightColorMap, setHighlightColorMap] = useState({}); // taskId => color string
    const [selectedEventId, setSelectedEventId] = useState(null);

    // Derive week-adjusted team availability from events (e.g., sickness morale etc.)
    const baseTeam = team; // base team now dynamic
    const weekAdjustedTeam = useMemo(() => {
        if (!baseTeam.length) return [];
        const weekEvents = allEvents.filter(e => e.trigger_week === currentWeek);
        return baseTeam.map(m => {
            let clone = { ...m };
            // Sickness: member unavailable this week (capacity -> 0 visually via workload)
            const sick = weekEvents.find(ev => ev.type === 'Member Sickness' && (ev.member_ids || []).includes(m.id));
            if (sick) {
                clone.status = 'Unavailable';
                clone.workload = 0;
            }
            // Morale shift affecting specific member (simple +/-10% workload visual)
            const morale = weekEvents.find(ev => ev.type === 'Morale' && (ev.member_ids || []).includes(m.id));
            if (morale && !sick) {
                const delta = (morale.id % 2 === 0) ? 10 : -10;
                clone.workload = Math.min(100, Math.max(5, (clone.workload || 50) + delta));
                clone.status = delta > 0 ? 'Active' : 'Busy';
            }
            return clone;
        });
    }, [baseTeam, allEvents, currentWeek]);

    const palette = ['#1976d2','#2e7d32','#ed6c02','#9c27b0','#d81b60','#00838f','#ef6c00','#6d4c41'];
    const handleEventSelect = useCallback(event => {
        if (event?.task_ids?.length) {
            const colorMap = {};
            event.task_ids.forEach((tid, idx) => { colorMap[tid] = palette[idx % palette.length]; });
            setHighlightColorMap(colorMap);
            setHighlightedTaskIds(event.task_ids);
            setSelectedEventId(event.id);
        } else {
            setHighlightColorMap({});
            setHighlightedTaskIds([]);
            setSelectedEventId(event?.id || null);
        }
    }, []);

    const clearHighlights = useCallback(() => { setHighlightedTaskIds([]); setHighlightColorMap({}); setSelectedEventId(null); }, []);

    // Advance-week guard: require at least one task to have progressed (status changed or progress > 0)
    const [advanceGuardOpen, setAdvanceGuardOpen] = useState(false);
    const attemptAdvanceWeek = () => {
        if (currentWeek >= projectWeeks) return;
        const progressed = tasks.some(t => (t.status && t.status !== 'Pending') || (t.progress || 0) > 0);
        if (!progressed) { setAdvanceGuardOpen(true); return; }
        setCurrentWeek(w => w + 1);
    };
    const confirmAdvanceAnyway = () => { setAdvanceGuardOpen(false); setCurrentWeek(w => w + 1); };
    const cancelAdvance = () => setAdvanceGuardOpen(false);

    // When week changes (after mount), collapse tasks
    useEffect(() => {
        if (currentWeek !== 1) {
            setCollapseVersion(v => v + 1);
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
    const advanceWalk = () => setWalkStep(s => Math.min(5, s + 1));
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
        const weekEvents = allEvents.filter(e => e.trigger_week === currentWeek);
        const tasks = [...new Set(weekEvents.flatMap(e => e.task_ids || []))];
        if (tasks.length) {
            const colorMap = {};
            tasks.forEach((tid, idx) => { colorMap[tid] = palette[idx % palette.length]; });
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
            setCollapseVersion(v => v + 1);
        }
        prevWalkStepRef.current = walkStep;
    }, [walkStep]);

    // ===== Budget Tracking & Effects =====
    const totalBudget = project?.constraints?.budget || 0;
    const adjustmentsRef = useRef(0); // savings from removals / cancellations
    const calcSpent = useCallback((ts) => ts.filter(t => t.status !== 'Cancelled').reduce((sum, t) => sum + ((t.budget || 0) * (t.progress || 0) / 100), 0), []);
    const [remainingBudget, setRemainingBudget] = useState(totalBudget); // logical value
    const [displayedBudget, setDisplayedBudget] = useState(totalBudget); // animated display value
    const overheadCostsRef = useRef(0); // costs from ceremonies / events / standups
    useEffect(() => { setRemainingBudget(Math.max(0, totalBudget - calcSpent(tasks) - overheadCostsRef.current + adjustmentsRef.current)); }, [tasks, totalBudget, calcSpent]);

    // Coin & praise bursts
    const [coinBursts, setCoinBursts] = useState([]); // {id, amt, x, y} viewport (client) coordinates
    const [praiseBursts, setPraiseBursts] = useState([]); // {id, memberId}
    const wrapperRef = useRef(null); // still used for other future needs
    const spawnCoinBurst = (amt, origin=null) => {
        if (!amt || amt <= 0) return;
        let x = null, y = null;
        if (origin) {
            if (origin.x != null && origin.y != null) { x = origin.x; y = origin.y; }
            else if (origin.clientX != null) { x = origin.clientX; y = origin.clientY; }
            else if (origin.left != null) { x = origin.left + origin.width/2; y = origin.top + origin.height/2; }
        }
        if (x == null || y == null) { // fallback center
            x = window.innerWidth/2; y = 80;
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
        const id = Date.now()+Math.random();
        setCoinBursts(b => [...b,{id,amt,x,y}]);
        setTimeout(()=>setCoinBursts(b=>b.filter(c=>c.id!==id)),1800);
    };
    const spawnPraise = (memberId) => { const id = Date.now()+Math.random(); setPraiseBursts(p => [...p,{id,memberId}]); setTimeout(()=>setPraiseBursts(p=>p.filter(pb=>pb.id!==id)),1400); };

    // Mutators
    const handleTaskChange = (updated) => {
        // Preserve original assignee for reassignment rule checks
        setTasks(prev => prev.map(t => t.id === updated.id ? {...t, original_assignee: t.original_assignee || t.assignee, ...updated} : t));
        if (updated.status === 'Cancelled') {
            const prior = tasks.find(t => t.id === updated.id);
            if (prior) {
                const spent = (prior.budget||0)*(prior.progress||0)/100;
                const refund = (prior.budget||0) - spent;
                adjustmentsRef.current += refund;
                spawnCoinBurst(refund);
                setRemainingBudget(Math.max(0, totalBudget - calcSpent(tasks) + adjustmentsRef.current));
            }
        }
        // Resolve events referencing this task (update_task, reassign_task)
        const relatedEvents = allEvents.filter(e => ['update_task','reassign_task'].includes(e.action_type) && (e.task_ids||[]).includes(updated.id));
        if (relatedEvents.length) {
            // Condition A: general update events -> all referenced tasks not 'Pending'
            // Condition B (sickness): if event type is Member Sickness, resolve when none of the tasks still assigned to the sick member
            // Condition C (reassign rules): must change assignee or redistribute workload
            const resolvableIds = [];
            relatedEvents.forEach(ev => {
                const tasksForEvent = (ev.task_ids||[]).map(id => (id === updated.id ? updated : tasks.find(t=>t.id===id) || {}));
                const isSickness = ev.type === 'Member Sickness';
                const isReassign = ev.action_type === 'reassign_task';
                let ok = false;
                if (isSickness) {
                    const sickMemberId = (ev.member_ids||[])[0];
                    ok = tasksForEvent.every(t => t.assignee == null || !team.find(m=>m.id===sickMemberId)?.name || t.assignee !== team.find(m=>m.id===sickMemberId)?.name);
                } else if (isReassign) {
                    if (ev.resolution_rule?.must_change_assignee_for_task_ids?.length) {
                        ok = ev.resolution_rule.must_change_assignee_for_task_ids.every(tid => {
                            const t = tasksForEvent.find(tx=>tx.id===tid) || tasks.find(tx=>tx.id===tid);
                            return t && t.assignee && t.assignee !== t.original_assignee;
                        });
                    }
                    if (ev.resolution_rule?.must_reassign_from_member) {
                        const memberName = ev.resolution_rule.must_reassign_from_member;
                        ok = tasksForEvent.some(t => t.assignee && t.assignee !== memberName);
                    }
                } else {
                    ok = tasksForEvent.every(t => t.status && t.status !== 'Pending');
                }
                if (ok) resolvableIds.push(ev.id);
            });
            if (resolvableIds.length) setResolvedEventIds(prev => [...prev, ...resolvableIds.filter(id=>!prev.includes(id))]);
        }
        // Budget risk cancellation rule
        allEvents.forEach(ev => {
            if (ev.resolution_rule?.must_cancel_one_of_task_ids && ev.action_type === 'update_task' && !resolvedEventIds.includes(ev.id)) {
                const satisfied = ev.resolution_rule.must_cancel_one_of_task_ids.some(tid => (tid === updated.id && updated.status === 'Cancelled') || tasks.find(t=>t.id===tid)?.status === 'Cancelled');
                if (satisfied) setResolvedEventIds(prev => prev.includes(ev.id) ? prev : [...prev, ev.id]);
            }
        });
    };
    const handleRemoveMember = (memberId, evt) => {
        const member = team.find(m=>m.id===memberId);
        setTeam(prev => prev.filter(m => m.id !== memberId));
        setTasks(prev => prev.map(t => (t.assignee === member?.name) ? {...t, assignee: null} : t));
        if (member) {
            const remainingWeeks = projectWeeks - currentWeek + 1;
            const savings = (member.capacity_hours || 30) * remainingWeeks * 100; // simple cost model (treated as salary refund)
            adjustmentsRef.current += savings;
            const native = evt?.nativeEvent || evt;
            const coords = native && native.clientX != null ? { x: native.clientX, y: native.clientY } : null;
            spawnCoinBurst(savings, coords || evt); // use precise mouse position
            setRemainingBudget(Math.max(0, totalBudget - calcSpent(tasks) + adjustmentsRef.current));
        }
    // Resolve remove_member events for this member
    const toResolve = allEvents.filter(e => e.action_type === 'remove_member' && (e.member_ids||[]).includes(memberId) && !resolvedEventIds.includes(e.id)).map(e=>e.id);
    if (toResolve.length) setResolvedEventIds(prev => [...prev, ...toResolve.filter(id=>!prev.includes(id))]);
    };
    const handlePraiseMember = (memberId) => {
        setTeam(prev => prev.map(m => m.id === memberId ? {
            ...m,
            workload: Math.max(5,(m.workload||50)-5),
            morale: Math.min(100, (m.morale ?? 70) + 10),
            status: 'Active'
        } : m));
        spawnPraise(memberId);
    // Resolve praise_member events for this member
    const toResolve = allEvents.filter(e => e.action_type === 'praise_member' && (e.member_ids||[]).includes(memberId) && !resolvedEventIds.includes(e.id)).map(e=>e.id);
    if (toResolve.length) setResolvedEventIds(prev => [...prev, ...toResolve.filter(id=>!prev.includes(id))]);
    };

    // Ceremony actions
    const TEAM_EVENT_COST = 500;
    const STANDUP_COST = 200;

    const applyOverheadCost = (amt) => {
        overheadCostsRef.current += amt;
        setRemainingBudget(Math.max(0, totalBudget - calcSpent(tasks) - overheadCostsRef.current + adjustmentsRef.current));
    };

    const handleTeamEvent = () => {
        // Increase morale for all active members
        setTeam(prev => prev.map(m => ({ ...m, morale: Math.min(100, (m.morale ?? 70) + 8) })));
        applyOverheadCost(TEAM_EVENT_COST);
        logAction('Team Event (+morale, -budget)');
    // Resolve team_event events current week
    const toResolve = allEvents.filter(e => e.action_type === 'team_event' && (e.trigger_week||0) === currentWeek && !resolvedEventIds.includes(e.id)).map(e=>e.id);
    if (toResolve.length) setResolvedEventIds(prev => [...prev, ...toResolve.filter(id=>!prev.includes(id))]);
    };

    const handleStandup = () => {
        // Boost progress for all active tasks (not cancelled / done)
        setTasks(prev => prev.map(t => {
            if (t.status === 'Cancelled') return t;
            const newProg = Math.min(100, (t.progress || 0) + 10);
            const newStatus = newProg >= 100 ? 'Done' : t.status;
            return { ...t, progress: newProg, status: newStatus };
        }));
        applyOverheadCost(STANDUP_COST);
        logAction('Standup (+10% progress, -budget)');
    // Resolve standup events current week
    const toResolve = allEvents.filter(e => e.action_type === 'standup' && (e.trigger_week||0) === currentWeek && !resolvedEventIds.includes(e.id)).map(e=>e.id);
    if (toResolve.length) setResolvedEventIds(prev => [...prev, ...toResolve.filter(id=>!prev.includes(id))]);
    };

    // Week change audio (events also animate separately)
    useEffect(() => { if (currentWeek > 1) { try { new Audio('/sounds/notify.mp3').play(); } catch(e) {} } }, [currentWeek]);

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
        '&:hover': { bgcolor: 'rgba(255,255,255,0.30)', boxShadow:'0 4px 14px -2px rgba(0,0,0,0.45)' },
        '&:active': { transform: 'scale(.92)' },
        '&.Mui-disabled': { opacity: 0.35, boxShadow:'none', backdropFilter:'none' }
    };
    const [activityLog, setActivityLog] = useState([]);
    const logAction = label => setActivityLog(l => [{id: Date.now(), label}, ...l.slice(0,6)]);
    
    // ===== Conflict Resolution UI State =====
    const [conflictOpen, setConflictOpen] = useState(false);
    const [conflictMemberA, setConflictMemberA] = useState('');
    const [conflictMemberB, setConflictMemberB] = useState('');
    const openConflictResolver = () => {
        // Pre-fill if selected event is a conflict
        if (selectedEventId) {
            const ev = allEvents.find(e => e.id === selectedEventId);
            if (ev && ev.type === 'Team Conflict' && (ev.member_ids||[]).length >= 2) {
                setConflictMemberA(ev.member_ids[0]);
                setConflictMemberB(ev.member_ids[1]);
            }
        }
        setConflictOpen(true);
    };
    const closeConflictResolver = () => setConflictOpen(false);
    const canMediate = useMemo(() => conflictMemberA && conflictMemberB && conflictMemberA !== conflictMemberB, [conflictMemberA, conflictMemberB]);
    const handleMediate = () => {
        if (!canMediate) return;
        // Apply morale boosts and small workload normalization
        setTeam(prev => prev.map(m => {
            if ([conflictMemberA, conflictMemberB].includes(m.id)) {
                return { ...m, morale: Math.min(100, (m.morale ?? 70) + 8), status: 'Active', workload: Math.max(30, (m.workload||50) - 5) };
            }
            return m;
        }));
        // Resolve any current week team_conflict events referencing these members
        const toResolve = allEvents.filter(e => e.action_type === 'team_event' && e.type === 'Team Conflict' && (e.trigger_week||0) === currentWeek && (e.member_ids||[]).every(id => [conflictMemberA, conflictMemberB].includes(id))).map(e=>e.id);
        if (toResolve.length) setResolvedEventIds(prev => [...prev, ...toResolve.filter(id=>!prev.includes(id))]);
        logAction('Mediated conflict between members '+conflictMemberA+' & '+conflictMemberB);
        setConflictOpen(false);
    };

    // ===== Add Task (Manager Directive) State =====
    const selectedEvent = useMemo(()=> allEvents.find(e=>e.id===selectedEventId), [selectedEventId, allEvents]);
    // Detect any active manager directive requiring a new task (supports legacy simulations where action_type was update_task)
    const addTaskDirectiveEvent = useMemo(()=>{
        // Prefer explicit add_task action_type
        let ev = allEvents.find(e => e.action_type === 'add_task' && (e.trigger_week||0) <= currentWeek && !resolvedEventIds.includes(e.id));
        if (ev) return ev;
        // Fallback: legacy event with specific title/desc pattern
        return allEvents.find(e => e.type === 'Manager Directive' && /Add Compliance Audit Task/i.test(e.title || '') && (e.trigger_week||0) <= currentWeek && !resolvedEventIds.includes(e.id));
    }, [allEvents, currentWeek, resolvedEventIds]);
    // Build metadata (explicit or parsed)
    const addTaskMeta = useMemo(()=>{
        if (!addTaskDirectiveEvent) return null;
        if (addTaskDirectiveEvent.new_task) return addTaskDirectiveEvent.new_task;
        // Parse description for legacy structure
        const d = addTaskDirectiveEvent.desc || '';
        const titleMatch = /task "([^"]+)"/i.exec(d);
        const priorityMatch = /(High|Medium|Low) priority/i.exec(d);
        const hoursMatch = /estimated\s+(\d+)h/i.exec(d);
        const skillsMatch = /skills?:\s*([^\)]+)/i.exec(d);
        const skills = skillsMatch ? skillsMatch[1].split(/[,\n]/).map(s=>s.trim()).filter(Boolean) : ['General'];
        return {
            title: titleMatch ? titleMatch[1] : 'New Task',
            priority: priorityMatch ? priorityMatch[1] : 'Medium',
            estimated_hours: hoursMatch ? parseInt(hoursMatch[1]) : 8,
            required_skills: skills
        };
    }, [addTaskDirectiveEvent]);
    const [addTaskOpen, setAddTaskOpen] = useState(false);
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState(''); // user must choose
    const [newTaskEst, setNewTaskEst] = useState(''); // hours blank until user enters
    const [newTaskSkills, setNewTaskSkills] = useState(''); // user-provided skills list
    useEffect(()=>{
        if (addTaskMeta) {
            // Only prefill the title; leave rest for user to decide per requirement
            setNewTaskTitle(addTaskMeta.title || '');
            setNewTaskPriority('');
            setNewTaskEst('');
            setNewTaskSkills('');
        }
    }, [addTaskMeta]);
    const openAddTask = () => { if (addTaskMeta) setAddTaskOpen(true); };
    const closeAddTask = () => setAddTaskOpen(false);
    const handleCreateTask = () => {
        if (!newTaskTitle.trim() || !newTaskPriority || !newTaskEst) return; // guard
        const nextId = tasks.reduce((max,t)=>Math.max(max,t.id),0)+1;
        const parsedEst = parseInt(newTaskEst, 10);
        if (isNaN(parsedEst) || parsedEst <= 0) return;
        const est = parsedEst;
        // Simple proportional budget: average per-hour cost * estimated hours
        const avgMemberWeekly = team.length ? team.reduce((s,m)=>s + (m.weekly_cost||0),0)/team.length : 3000;
        const avgHourly = avgMemberWeekly / (team.length ? (team.reduce((s,m)=>s + (m.capacity_hours||30),0)/team.length || 30) : 30);
        const budget = Math.round(avgHourly * est * 1.05); // slight overhead buffer
        const skillList = newTaskSkills.split(',').map(s=>s.trim()).filter(Boolean);
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
        setTasks(prev => [...prev, task]);
        // Resolve event
        if (selectedEvent && selectedEvent.action_type === 'add_task') {
            setResolvedEventIds(prev => prev.includes(selectedEvent.id) ? prev : [...prev, selectedEvent.id]);
            logAction('Added task for directive: '+task.title);
        }
        setAddTaskOpen(false);
    };

    // ===== End-of-Project Evaluation State =====
    const [resultsOpen, setResultsOpen] = useState(simulationCompleted);
    const [results, setResults] = useState(null);

    const computeResults = useCallback(() => {
        const totalTasks = tasks.length;
        const doneTasks = tasks.filter(t => t.status === 'Done').length;
        const cancelledTasks = tasks.filter(t => t.status === 'Cancelled').length;
        const activeTasks = totalTasks - cancelledTasks;
        const highPriority = tasks.filter(t => t.priority === 'High');
        const highDone = highPriority.filter(t => t.status === 'Done').length;
        const lowCancelled = tasks.filter(t => t.priority === 'Low' && t.status === 'Cancelled').length;
        const spent = totalBudget - remainingBudget;
        const remainingPct = totalBudget ? (remainingBudget / totalBudget) : 0;
        const deliveryRate = activeTasks ? (doneTasks / activeTasks) : 0;
        const highFocus = highPriority.length ? (highDone / highPriority.length) : 0;
        const adaptiveness = (lowCancelled + 1) / (cancelledTasks + 1); // higher if most cancellations are low priority
        const avgMorale = team.length ? (team.reduce((s,m)=> s + (m.morale ?? 70),0)/team.length) : 70;
        const removals = simulation?.team ? (simulation.team.length - team.length) : 0;
        const actionCounts = activityLog.reduce((acc,a)=>{ if(a.label.includes('Standup')) acc.standups++; if(a.label.includes('Team Event')) acc.teamEvents++; if(a.label.toLowerCase().includes('praise')) acc.praises++; return acc; }, {standups:0, teamEvents:0, praises:0});
        // Scoring weights & formulas
        const scoreBudget = (() => {
            // Encourage reasonable remaining (10-40%). Penalize hoarding or overspend.
            const sweetMin = 0.1, sweetMax = 0.4;
            if (remainingPct < sweetMin) return 60 * Math.max(0, 1 - (sweetMin - remainingPct)*2.5);
            if (remainingPct > sweetMax) return 60 * Math.max(0, 1 - (remainingPct - sweetMax)*2.0);
            return 60; // inside sweet band
        })();
        const scoreDelivery = 25 * deliveryRate;
        const scoreHighFocus = 25 * highFocus;
        const scoreAdapt = 15 * adaptiveness;
        const scoreMorale = 20 * (avgMorale/100);
        const scoreStability = 15 * Math.max(0, 1 - removals / Math.max(1, simulation?.team?.length || 1));
        let raw = scoreBudget + scoreDelivery + scoreHighFocus + scoreAdapt + scoreMorale + scoreStability;
        raw = Math.max(0, Math.min(100, raw));
        const tier = raw >= 85 ? 'Elite' : raw >= 70 ? 'Strong' : raw >= 55 ? 'Developing' : 'Needs Improvement';
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
                remainingPct: +(remainingPct*100).toFixed(1),
                avgMorale: Math.round(avgMorale),
                removals,
                ...actionCounts
            },
            scores: {
                budget: +scoreBudget.toFixed(1),
                delivery: +scoreDelivery.toFixed(1),
                highFocus: +scoreHighFocus.toFixed(1),
                adaptiveness: +scoreAdapt.toFixed(1),
                morale: +scoreMorale.toFixed(1),
                stability: +scoreStability.toFixed(1)
            },
            overall: +raw.toFixed(1),
            tier
        };
    }, [tasks, totalBudget, remainingBudget, team, projectWeeks, simulation, activityLog]);

    useEffect(() => {
        if (currentWeek === projectWeeks && !resultsOpen) {
            const r = computeResults();
            setResults(r);
            setResultsOpen(true);
            // Mark simulation as completed
            try {
                sessionStorage.setItem('simulationCompleted', 'true');
                setSimulationCompleted(true);
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
    }, [currentWeek, projectWeeks, resultsOpen, computeResults, simulationCompleted, results]);

    // ===== Fixed Default Zoom (60%) with Firefox transform fallback =====
    // Theme colors from Dashboard
    const dashboardGradient = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    const dashboardCardGradient = 'linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)';
    const dashboardAccent = '#764ba2';
    const dashboardPrimary = '#667eea';
    const dashboardTextShadow = '0 0 14px rgba(255,255,255,0.6), 0 0 38px rgba(120,160,255,0.35)';
    const uiScale = 0.72;
    // Font scaling factor
    const fontScale = 1.6;
    const isFirefox = typeof navigator !== 'undefined' && /firefox/i.test(navigator.userAgent);
    // Prevent manual zoom (Ctrl + / - / 0 and pinch zoom)
    useEffect(() => {
        const keyBlock = (e) => { if (e.ctrlKey && ['+', '=', '-', '0'].includes(e.key)) { e.preventDefault(); } };
        const wheelBlock = (e) => { if (e.ctrlKey) { e.preventDefault(); } };
        window.addEventListener('keydown', keyBlock, { passive:false });
        window.addEventListener('wheel', wheelBlock, { passive:false });
        return () => { window.removeEventListener('keydown', keyBlock); window.removeEventListener('wheel', wheelBlock); };
    }, []);

    // Hide horizontal scroll introduced by scaled container
    useEffect(() => { const prev = document.body.style.overflowX; document.body.style.overflowX = 'hidden'; return ()=>{ document.body.style.overflowX = prev; }; }, []);
    // Remove default body margin to prevent bottom gap under scaled content
    useEffect(()=>{ const prevM = document.body.style.margin; const prevP = document.body.style.padding; document.body.style.margin='0'; document.body.style.padding='0'; return ()=>{ document.body.style.margin=prevM; document.body.style.padding=prevP; }; }, []);
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
            const t = Math.min(1, (now - startTime)/duration);
            // easeOutQuad
            const eased = 1 - (1 - t)*(1 - t);
            const current = start + diff * eased;
            setDisplayedBudget(current);
            if (t < 1) requestAnimationFrame(step); else setDisplayedBudget(end);
        };
        requestAnimationFrame(step);
    }, [remainingBudget]);

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Project Management Simulator" />
            {/* Scaled UI wrapper fills full viewport (after scale) without horizontal scroll */}
            <div ref={wrapperRef} style={ isFirefox ? {
                transform: `scale(${uiScale})`,
                transformOrigin: 'top left',
                height: `calc((100vh - 5vh) / ${uiScale})`,
                width: `${100 / uiScale}%`,
                display:'flex',
                flexDirection:'column',
                background: dashboardGradient,
                fontSize: `${fontScale}em`
            } : {
                zoom: uiScale,
                height: `calc((100vh - 5vh) / ${uiScale})`,
                width: '100%',
                display:'flex',
                flexDirection:'column',
                background: dashboardGradient,
                fontSize: `${fontScale}em`
            }}>
            
            {/* Header Section */}
            <div style={{ 
                background: dashboardGradient,
                color: 'white',
                padding: '8px 16px 6px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 4px 18px rgba(0,0,0,0.28)',
                position: 'relative',
                borderBottom: '2px solid #fff2',
                fontSize: `${fontScale * 0.8}em`
            }}>
                <h1 style={{ 
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
                }}>
                    {project?.title || 'ProjectSimulate'}
                </h1>

                {/* Day Counter and Controls */}
                <div ref={navRef} style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                    {/* Budget */}
                    <div style={{ 
                        background: dashboardCardGradient, 
                        padding:'6px 8px', 
                        borderRadius:6, 
                        minWidth:200, 
                        maxWidth:200, 
                        boxShadow:'0 1px 4px rgba(120,120,180,0.08)',
                        height: '44px',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'center'
                    }}>
                        <div style={{ display:'flex', justifyContent:'space-between', fontSize: `${0.6 * fontScale}rem`, fontWeight:500, color: dashboardAccent }}>
                            <span>Budget</span><span>${Math.round(displayedBudget).toLocaleString()} / ${totalBudget.toLocaleString()}</span>
                        </div>
                        <LinearProgress variant="determinate" value={ totalBudget ? ((totalBudget-remainingBudget)/totalBudget)*100 : 0 } sx={{ mt:0.3, height:3, borderRadius:2, background:'rgba(120,120,180,0.15)' }} />
                    </div>
                    <div style={{ 
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
                        boxShadow:'0 1px 4px rgba(120,120,180,0.08)',
                        minWidth:200,
                        maxWidth:200,
                        height: '44px'
                    }}>
                        <span style={{ fontSize: '0.9rem' }}>⏰</span>
                        <span>
                            Week {currentWeek} of {projectWeeks}
                        </span>
                    </div>
                    
                    {/* Agile quick action buttons (interactive) */}
                    <Box sx={{ display:'flex', gap:1 }}>
                        <Tooltip title={`Standup (Cost $${STANDUP_COST}, +10% progress)`}>
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
                                    sx={{ ...actionIconSx, bgcolor:'rgba(255,255,255,0.20)' }}
                                    disabled={remainingBudget < TEAM_EVENT_COST}
                                    aria-label="team event"
                                >
                                    <CelebrationIcon fontSize="inherit" />
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Box>
            <IconButton
                        onClick={() => { attemptAdvanceWeek(); if (walkStep === 4) advanceWalk(); }}
                        disabled={currentWeek >= projectWeeks}
                        aria-label="advance week"
                        sx={{
                            ...actionIconSx,
                            // unify base appearance, but add accent ring + subtle gradient
                            background: 'linear-gradient(145deg, rgba(255,255,255,0.20), rgba(255,255,255,0.12))',
                            color: '#fff',
                            boxShadow: walkStep === 4 ? '0 0 0 4px #667eea, 0 4px 12px -2px rgba(0,0,0,0.45)' : actionIconSx.boxShadow,
                position: 'relative',
                top: '1px',
                '&:hover': { ...(actionIconSx['&:hover']||{}), background: 'linear-gradient(145deg, rgba(255,255,255,0.32), rgba(255,255,255,0.18))' }
                        }}
                    >
                        <ArrowForwardIcon fontSize="small" />
                    </IconButton>
                    <Dialog open={advanceGuardOpen} onClose={cancelAdvance} maxWidth="xs" fullWidth>
                        <DialogTitle>No Progress Made</DialogTitle>
                        <DialogContent dividers>
                            <Typography variant="body2" gutterBottom>
                                You haven't advanced any tasks this week (no status or progress changes). Moving forward without action may waste capacity.
                            </Typography>
                            <Typography variant="caption" color="text.secondary">Make at least one update or choose Continue to advance anyway.</Typography>
                        </DialogContent>
                        <DialogActions>
                            <MUIButton onClick={cancelAdvance}>Stay</MUIButton>
                            <MUIButton onClick={confirmAdvanceAnyway} variant="contained">Continue</MUIButton>
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
            <div style={{ 
                height: '10px', 
                background: dashboardCardGradient,
                position: 'relative',
                boxShadow: '0 2px 8px rgba(120,120,180,0.10)',
                borderRadius: '6px',
                marginBottom: '2px'
            }}>
                <div style={{
                    height: '100%',
                    width: `${(currentWeek / projectWeeks) * 100}%`,
                    background: dashboardAccent,
                    transition: 'width 0.3s ease',
                    borderRadius: '6px'
                }}></div>
            </div>

            {/* Main Content - Three Panel Layout */}
            <div style={{ 
                display: 'flex',
                flex: 1,
                minHeight: 0,
                background: dashboardCardGradient,
                overflow: 'hidden',
                fontSize: `${1.15 * fontScale}rem`
            }}>
                {/* Events Panel */}
                <div ref={eventsRef} style={{ 
                    flex: '0 0 30%', 
                    display: 'flex',
                    flexDirection: 'column',
                    background: dashboardCardGradient,
                    borderRight: '2px solid #eaeaea',
                    padding: 0,
                    position: 'relative',
                    boxShadow: walkStep === 1 ? '0 0 0 4px #667eea inset' : undefined,
                    zIndex: walkStep === 1 ? 10 : 'auto',
                    minHeight: 0
                }}>
                    <div style={{ flex:1, overflowY:'auto', minHeight:0, paddingRight:4 }}>
                        <Events
                            events={visibleEvents}
                            week={currentWeek}
                            onSelect={handleEventSelect}
                            highlightColorMap={highlightColorMap}
                            selectedEventId={selectedEventId}
                            resolvedEventIds={resolvedEventIds}
                            onResolve={resolveEvent}
                        />
                    </div>
                    {walkStep === 1 && (
                        <div style={{ position:'absolute', left:8, right:8, bottom:8 }}>
                            <GuideOverlay onNext={advanceWalk} onSkip={skipWalk} title="Events" description="These are dynamic project events. Each week new events appear. Click an event to highlight related tasks." />
                        </div>
                    )}
                </div>

                {/* Tasks Panel - Center */}
                <div ref={tasksRef} style={{ 
                    flex: '0 0 45%',
                    display: 'flex',
                    flexDirection: 'column',
                    background: '#fff',
                    borderRight: '2px solid #eaeaea',
                    padding: 0,
                    position: 'relative',
                    boxShadow: walkStep === 2 ? '0 0 0 4px #667eea inset' : undefined,
                    zIndex: walkStep === 2 ? 10 : 'auto',
                    minHeight:0,
                    fontSize: `${1.15 * fontScale}rem`
                }}>
                    <div style={{ flex:1, overflowY:'auto', minHeight:0, paddingRight:4 }}>
                        <Tasks 
                            tasks={tasks} 
                            team={weekAdjustedTeam.filter(m=>team.some(tm=>tm.id===m.id))} 
                            week={currentWeek} 
                            highlightedTaskIds={highlightedTaskIds}
                            highlightColorMap={highlightColorMap}
                            onClearHighlights={clearHighlights}
                            forceExpandTaskId={forceExpandTaskId}
                            collapseVersion={collapseVersion}
                            onTaskChange={handleTaskChange}
                            canAddTask={!!addTaskMeta}
                            onShowAddTask={openAddTask}
                        />
                    </div>
                    {walkStep === 2 && (
                        <div style={{ position:'absolute', left:8, right:8, bottom:8 }}>
                            <GuideOverlay onNext={advanceWalk} onSkip={skipWalk} title="Tasks" description="Update task status, progress, priority, or assignee. Expanded first task for you to explore." />
                        </div>
                    )}
                </div>

                {/* Team Panel - Right (swapped) */}
                <div ref={teamRef} style={{ 
                    flex: '0 0 25%', 
                    display: 'flex',
                    flexDirection: 'column',
                    background: dashboardCardGradient,
                    padding: 0,
                    position: 'relative',
                    boxShadow: walkStep === 3 ? '0 0 0 4px #667eea inset' : undefined,
                    zIndex: walkStep === 3 ? 10 : 'auto',
                    minHeight:0,
                    fontSize: `${1.15 * fontScale}rem`
                }}>
                    <div style={{ flex:1, overflowY:'auto', minHeight:0, paddingRight:4 }}>
                        <Team members={weekAdjustedTeam} onRemove={handleRemoveMember} onPraise={handlePraiseMember} praiseBursts={praiseBursts} />
                    </div>
                    {walkStep === 3 && (
                        <div style={{ position:'absolute', left:8, right:8, bottom:8 }}>
                            <GuideOverlay onNext={advanceWalk} onSkip={skipWalk} title="Team" description="Assign team members to tasks matching their skills and adapt to weekly availability changes." />
                        </div>
                    )}
                </div>
            </div>
            {/* Bottom spacer to reserve 5% gap without causing scroll */}
            <div style={{ height:'5vh', flexShrink:0 }} />
            {/* Floating coin layer (outside zoom impact) */}
            <div style={{ position:'fixed', left:0, top:0, width:'100%', height:'100%', pointerEvents:'none', zIndex: 9999 }}>
                {coinBursts.map(c => (
                    <div key={c.id} style={{ position:'absolute', left:c.x, top:c.y, transform:'translate(-50%, -50%)', fontWeight:700, fontSize:16, color:'#ffdf66', animation:'coin-pop 1.6s ease-out forwards', textShadow:'0 0 8px rgba(0,0,0,0.45)', background:'rgba(0,0,0,0.25)', padding:'2px 6px', borderRadius:6, border:'1px solid rgba(255,255,255,0.4)', backdropFilter:'blur(2px)' }}>+{Math.round(c.amt).toLocaleString()}</div>
                ))}
            </div>

            {/* Intro Modal */}
            <Dialog open={introOpen} maxWidth="sm" fullWidth>
                <DialogTitle>Project Brief</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="h6" gutterBottom>{project?.title}</Typography>
                    <Typography variant="body2" paragraph>{project?.description}</Typography>
                    <Typography variant="subtitle2" gutterBottom>Objective</Typography>
                    <Typography variant="body2" paragraph>{project?.primary_objective}</Typography>
                    <Typography variant="subtitle2" gutterBottom>Your Goal in the Simulator</Typography>
                    <Typography variant="body2" paragraph>
                        Respond to weekly events, keep high‑priority tasks on track, reallocate or cancel tasks if budgets or risks force trade‑offs, and utilize team skills efficiently across {projectWeeks} weeks.
                    </Typography>
                    <Typography variant="caption" color="text.secondary">You can revisit this guidance later by refreshing (walkthrough runs once per load).</Typography>
                </DialogContent>
                <DialogActions>
                    <MUIButton onClick={startWalkthrough} variant="contained">Start</MUIButton>
                </DialogActions>
            </Dialog>
            </div>
        {resultsOpen && results && (
            <Dialog open onClose={()=>{
                setResultsOpen(false);
                // Keep completion flag so users can return to results by going back
            }} maxWidth="md" fullWidth>
                <DialogTitle>Project Results & Evaluation</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="subtitle1" gutterBottom>Overall Score: <strong>{results.overall}</strong> ({results.tier})</Typography>
                    <Box sx={{ display:'flex', flexWrap:'wrap', gap:2, mb:2 }}>
                        {Object.entries(results.scores).map(([k,v]) => (
                            <Box key={k} sx={{ flex:'1 1 150px', background:'#f5f5f5', p:1.2, borderRadius:1 }}>
                                <Typography variant="caption" sx={{ textTransform:'uppercase', fontWeight:600 }}>{k}</Typography>
                                <Typography variant="body2" fontWeight={600}>{v}</Typography>
                            </Box>
                        ))}
                    </Box>
                    <Typography variant="subtitle2" gutterBottom>Summary</Typography>
                    <ul style={{ marginTop:4, marginBottom:12 }}>
                        <li>{results.summary.doneTasks}/{results.summary.totalTasks} tasks completed ({results.summary.cancelledTasks} cancelled)</li>
                        <li>{results.summary.highDone}/{results.summary.highPriority} high priority tasks delivered</li>
                        <li>Budget remaining: ${results.summary.remainingBudget.toLocaleString()} ({results.summary.remainingPct}%)</li>
                        <li>Average morale: {results.summary.avgMorale}% | Removals: {results.summary.removals}</li>
                        <li>Standups: {results.summary.standups} | Team Events: {results.summary.teamEvents} | Praises: {results.summary.praises}</li>
                    </ul>
                    <Typography variant="subtitle2" gutterBottom>Feedback</Typography>
                    <Typography variant="body2" paragraph>
                        {results.overall >= 85 && 'Excellent resource stewardship and prioritization. Consider experimenting with selective risk to accelerate even further.'}
                        {results.overall >= 70 && results.overall < 85 && 'Strong execution. Fine-tune budget utilization and sustain morale during later weeks.'}
                        {results.overall >= 55 && results.overall < 70 && 'Developing practice. Improve early focus on high priority outcomes and purposeful cancellations.'}
                        {results.overall < 55 && 'Struggled across key levers. Re-evaluate early allocation, intervene sooner on risks, and protect morale.'}
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <MUIButton onClick={async ()=>{ 
                        try {
                            const res = await fetch('/certification/latest-serial');
                            if(!res.ok){ throw new Error('No certificate yet'); }
                            const data = await res.json();
                            if(data.serial){ window.location.href = `/certificates/${data.serial}`; }
                        } catch(err){
                            alert('Certificate not ready yet. Complete certification first.');
                        }
                    }} variant="contained">View Certificate</MUIButton>
                    <MUIButton onClick={async ()=>{ 
                        try {
                            const res = await fetch('/certification/latest-serial');
                            if(!res.ok){ throw new Error('No badge yet'); }
                            const data = await res.json();
                            if(data.serial){ window.location.href = `/certificates/${data.serial}/badge`; }
                        } catch(err){
                            alert('Badge not ready yet. Complete certification first.');
                        }
                    }}>View Badge</MUIButton>
                    <MUIButton onClick={()=>{ 
                        // Clear completion flag only when user explicitly wants to restart
                        try {
                            sessionStorage.removeItem('simulationCompleted');
                        } catch (e) {}
                        setSimulationCompleted(false);
                        setResultsOpen(false);
                        setCurrentWeek(1);
                        // Reset all simulation state for a fresh start
                        setTasks(simulation?.tasks || []);
                        setTeam((simulation?.team || []).map(m => ({ ...m, morale: m.morale ?? 70 })));
                        setResolvedEventIds([]);
                    }}>Start New Simulation</MUIButton>
                </DialogActions>
            </Dialog>
        )}
        <MuiDialog open={conflictOpen} onClose={closeConflictResolver} maxWidth="sm" fullWidth>
            <MuiDialogTitle>Conflict Resolution</MuiDialogTitle>
            <MuiDialogContent dividers>
                <Typography variant="body2" mb={2}>Select two members experiencing friction and apply mediation to resolve the conflict event for this week.</Typography>
                <Box display="flex" gap={2}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Member A</InputLabel>
                        <Select label="Member A" value={conflictMemberA} onChange={e=>setConflictMemberA(e.target.value)}>
                            {weekAdjustedTeam.map(m => <MenuItem key={m.id} value={m.id}>{m.id}: {m.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <FormControl fullWidth size="small">
                        <InputLabel>Member B</InputLabel>
                        <Select label="Member B" value={conflictMemberB} onChange={e=>setConflictMemberB(e.target.value)}>
                            {weekAdjustedTeam.map(m => <MenuItem key={m.id} value={m.id}>{m.id}: {m.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Box>
                {conflictMemberA && conflictMemberB && conflictMemberA === conflictMemberB && (
                    <Typography color="error" variant="caption" mt={1} display="block">Select two different members.</Typography>
                )}
            </MuiDialogContent>
            <MuiDialogActions>
                <MUIButton onClick={closeConflictResolver}>Cancel</MUIButton>
                <MUIButton onClick={handleMediate} disabled={!canMediate} variant="contained">Mediate</MUIButton>
            </MuiDialogActions>
        </MuiDialog>
        <MuiDialog open={addTaskOpen} onClose={closeAddTask} maxWidth="sm" fullWidth>
            <MuiDialogTitle>Create Task From Directive</MuiDialogTitle>
            <MuiDialogContent dividers>
                <Typography variant="body2" mb={1}>Add the requested task. You can tweak fields before creating.</Typography>
                <TextField label="Title" fullWidth size="small" sx={{ mb:1.2 }} value={newTaskTitle} onChange={e=>setNewTaskTitle(e.target.value)} />
                <FormControl fullWidth size="small" sx={{ mb:1.2 }} required>
                    <InputLabel>Priority</InputLabel>
                    <Select label="Priority" value={newTaskPriority} onChange={e=>setNewTaskPriority(e.target.value)} displayEmpty>
                        <MenuItem value=""><em>Select priority</em></MenuItem>
                        {['High','Medium','Low'].map(p=> <MenuItem key={p} value={p}>{p}</MenuItem> )}
                    </Select>
                </FormControl>
                <TextField label="Estimated Hours" placeholder="e.g. 10" type="number" size="small" fullWidth sx={{ mb:1.2 }} value={newTaskEst} onChange={e=>setNewTaskEst(e.target.value)} required />
                <TextField label="Required Skills (comma separated)" placeholder="e.g. Governance, Analysis" size="small" fullWidth sx={{ mb:0.6 }} value={newTaskSkills} onChange={e=>setNewTaskSkills(e.target.value)} />
                <Typography variant="caption" color="text.secondary">Priority, hours & skills must be chosen to create. Budget auto-calculated.</Typography>
            </MuiDialogContent>
            <MuiDialogActions>
                <MUIButton onClick={closeAddTask}>Cancel</MUIButton>
                <MUIButton variant="contained" onClick={handleCreateTask} disabled={!newTaskTitle.trim() || !newTaskPriority || !newTaskEst}>Create Task</MUIButton>
            </MuiDialogActions>
        </MuiDialog>
        </AuthenticatedLayout>
    );
}

// Lightweight overlay component for walkthrough steps
function GuideOverlay({ title, description, onNext, onSkip, final }) {
    return (
        <Box sx={{ position: 'absolute', left: 16, right: 16, bottom: 12, zIndex: 30, pointerEvents: 'none' }}>
            <Paper elevation={6} sx={{ position: 'relative', p: 2, border: '2px solid #1976d2', background: '#fff', pointerEvents: 'auto', borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>{title}</Typography>
                <Typography variant="body2" gutterBottom>{description}</Typography>
                <Box display="flex" justifyContent="space-between" mt={1}>
                    <MUIButton size="small" onClick={onSkip}>Skip</MUIButton>
                    <MUIButton size="small" variant="contained" onClick={onNext}>{final ? 'Finish' : 'Next'}</MUIButton>
                </Box>
                {/* Arrow */}
                <Box sx={{ position: 'absolute', bottom: -12, left: 40, width: 0, height: 0, borderLeft: '12px solid transparent', borderRight: '12px solid transparent', borderTop: '12px solid #1976d2' }} />
                <Box sx={{ position: 'absolute', bottom: -10, left: 41, width: 0, height: 0, borderLeft: '11px solid transparent', borderRight: '11px solid transparent', borderTop: '11px solid #fff' }} />
            </Paper>
        </Box>
    );
}

// Overlay that sits to the left of the navigation buttons
function GuideOverlayLeft({ title, description, onNext, onSkip, final }) {
    return (
        <Box sx={{ position: 'absolute', left: -280, top: 0, width: 260, zIndex: 40, pointerEvents: 'none' }}>
            <Paper elevation={6} sx={{ position: 'relative', p: 2, border: '2px solid #1976d2', background: '#fff', pointerEvents: 'auto', borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={600} gutterBottom>{title}</Typography>
                <Typography variant="body2" gutterBottom>{description}</Typography>
                <Box display="flex" justifyContent="space-between" mt={1}>
                    <MUIButton size="small" onClick={onSkip}>Skip</MUIButton>
                    <MUIButton size="small" variant="contained" onClick={onNext}>{final ? 'Finish' : 'Next'}</MUIButton>
                </Box>
                {/* Arrow pointing right toward button */}
                <Box sx={{ position: 'absolute', top: 16, right: -12, width: 0, height: 0, borderTop: '12px solid transparent', borderBottom: '12px solid transparent', borderLeft: '12px solid #1976d2' }} />
                <Box sx={{ position: 'absolute', top: 16, right: -10, width: 0, height: 0, borderTop: '11px solid transparent', borderBottom: '11px solid transparent', borderLeft: '11px solid #fff' }} />
            </Paper>
        </Box>
    );
}
