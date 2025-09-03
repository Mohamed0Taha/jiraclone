import React, { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button as MUIButton, Typography, Box, Paper, LinearProgress, Tooltip, IconButton } from '@mui/material';
import GroupIcon from '@mui/icons-material/Group';
import CelebrationIcon from '@mui/icons-material/Celebration';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import QueryBuilderIcon from '@mui/icons-material/QueryBuilder';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import HandshakeIcon from '@mui/icons-material/Handshake';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import RestartAltIcon from '@mui/icons-material/RestartAlt';

// Import existing simulator components (they should work without auth context)
import Team from '../Simulator/components/Team';
import Tasks from '../Simulator/components/Tasks';
import Events from '../Simulator/components/Events';

export default function Index({ title, description }) {
    // Simulator state
    const [simulation, setSimulation] = useState(null);
    const [sessionId, setSessionId] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    
    // Game state (similar to authenticated version)
    const [currentWeek, setCurrentWeek] = useState(1);
    const [collapseVersion, setCollapseVersion] = useState(0);
    const [resolvedEventIds, setResolvedEventIds] = useState([]);
    const [actionResults, setActionResults] = useState([]);
    const [totalScore, setTotalScore] = useState(0);
    const [actionCount, setActionCount] = useState(0);
    const [activityLog, setActivityLog] = useState([]);
    
    // Mutable state from simulation
    const [tasks, setTasks] = useState([]);
    const [team, setTeam] = useState([]);
    const [dynamicEvents, setDynamicEvents] = useState([]);
    
    const totalWeeks = simulation?.project?.total_weeks || 10;
    const project = simulation?.project;
    const baseEvents = simulation?.events || [];
    const allEvents = useMemo(() => [...baseEvents, ...dynamicEvents], [baseEvents, dynamicEvents]);
    
    const logAction = useCallback(label => setActivityLog(l => [{ id: Date.now(), label }, ...l.slice(0, 6)]), []);
    
    // Initialize simulation
    const generateSimulation = async () => {
        setLoading(true);
        setError(null);
        
        try {
            const response = await fetch('/simulator/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                },
            });
            
            const data = await response.json();
            
            if (data.success) {
                setSimulation(data.simulation);
                setSessionId(data.session_id);
                setTasks(data.simulation.tasks || []);
                setTeam((data.simulation.team || []).map(m => ({ ...m, morale: m.morale ?? 70 })));
                setCurrentWeek(1);
                setResolvedEventIds([]);
                setActionResults([]);
                setTotalScore(0);
                setActionCount(0);
                setActivityLog([]);
                setDynamicEvents([]);
                logAction('Simulation started');
            } else {
                setError(data.error || 'Failed to generate simulation');
            }
        } catch (err) {
            setError('Network error. Please try again.');
            console.error('Simulation generation error:', err);
        } finally {
            setLoading(false);
        }
    };
    
    // Restart simulation
    const restartSimulation = () => {
        setSimulation(null);
        setSessionId(null);
        generateSimulation();
    };
    
    // Metrics calculation
    const metrics = useMemo(() => {
        if (!simulation) return { budget: 100, morale: 100, velocity: 100, quality_risk: 0, schedule_buffer: 100 };
        
        const totalBudget = tasks.reduce((sum, task) => sum + (task.budget || 0), 0);
        const avgMorale = team.length > 0 ? team.reduce((sum, member) => sum + (member.morale || 70), 0) / team.length : 70;
        const completedTasks = tasks.filter(task => task.status === 'Done').length;
        const totalTasks = tasks.length;
        const velocity = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
        
        return {
            budget: Math.max(0, 100 - (totalBudget / 100)), // Simplified budget calculation
            morale: avgMorale,
            velocity: velocity,
            quality_risk: Math.max(0, 20 - (completedTasks * 5)), // Lower with more completed tasks
            schedule_buffer: Math.max(0, 100 - (currentWeek / totalWeeks) * 100),
        };
    }, [simulation, tasks, team, currentWeek, totalWeeks]);
    
    // Week advance
    const advanceWeek = useCallback(() => {
        if (currentWeek < totalWeeks) {
            setCurrentWeek(prev => prev + 1);
            setCollapseVersion(prev => prev + 1);
            logAction(`Advanced to Week ${currentWeek + 1}`);
        }
    }, [currentWeek, totalWeeks, logAction]);
    
    // Event resolution wrapper
    const handleEventAction = async (event, action, gameState) => {
        if (!sessionId) return;
        
        try {
            const response = await fetch('/simulator/evaluate-action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    event: event,
                    action: action,
                    game_state: gameState,
                }),
            });
            
            const data = await response.json();
            if (data.success) {
                // Apply results to local state
                const result = data.result;
                setActionResults(prev => [...prev, result]);
                setActionCount(prev => prev + 1);
                setTotalScore(prev => prev + (result.score || 0));
                logAction(`Event resolved: ${event.title}`);
                
                // Mark event as resolved
                setResolvedEventIds(prev => [...prev, event.id]);
            }
        } catch (err) {
            console.error('Event action error:', err);
        }
    };
    
    // Task action wrapper
    const handleTaskAction = async (taskId, action, gameState) => {
        if (!sessionId) return;
        
        try {
            const response = await fetch('/simulator/evaluate-task-action', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content'),
                },
                body: JSON.stringify({
                    session_id: sessionId,
                    task_id: taskId,
                    action: action,
                    game_state: gameState,
                }),
            });
            
            const data = await response.json();
            if (data.success) {
                logAction(`Task action: ${action}`);
            }
        } catch (err) {
            console.error('Task action error:', err);
        }
    };
    
    if (!simulation) {
        return (
            <>
                <Head title="Project Management Simulator - Practice Free" />
                
                <div className="min-h-screen bg-gray-50">
                    {/* Header */}
                    <header className="bg-white shadow-sm border-b">
                        <div className="container mx-auto px-4 py-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-8">
                                    <a href="/" className="text-2xl font-bold text-blue-600">TaskPilot</a>
                                    <nav className="hidden md:flex space-x-6">
                                        <a href="/" className="text-gray-600 hover:text-gray-900 transition-colors">Home</a>
                                        <a href="/blog" className="text-gray-600 hover:text-gray-900 transition-colors">Blog</a>
                                        <span className="text-blue-600 font-medium">Simulator</span>
                                    </nav>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <a href="/login" className="text-gray-600 hover:text-gray-900">Login</a>
                                    <a href="/register" className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors">Get Started</a>
                                </div>
                            </div>
                        </div>
                    </header>
                    
                    {/* Hero Section */}
                    <main className="container mx-auto px-4 py-12">
                        <div className="max-w-4xl mx-auto text-center">
                            <div className="mb-8">
                                <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-6">
                                    <PlayArrowIcon className="text-blue-600 text-4xl" />
                                </div>
                                <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                                    Project Management Simulator
                                </h1>
                                <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8">
                                    Practice your project management skills with realistic scenarios. 
                                    Handle team dynamics, budget constraints, scope changes, and unexpected events.
                                    <strong> No signup required!</strong>
                                </p>
                            </div>
                            
                            {/* Features */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                                <div className="p-6 bg-white rounded-lg shadow-md">
                                    <GroupIcon className="text-blue-600 text-3xl mb-4 mx-auto" />
                                    <h3 className="font-semibold text-gray-900 mb-2">Team Management</h3>
                                    <p className="text-gray-600 text-sm">Manage team morale, workload, and skill assignments</p>
                                </div>
                                <div className="p-6 bg-white rounded-lg shadow-md">
                                    <QueryBuilderIcon className="text-blue-600 text-3xl mb-4 mx-auto" />
                                    <h3 className="font-semibold text-gray-900 mb-2">Real Scenarios</h3>
                                    <p className="text-gray-600 text-sm">Handle scope creep, vendor delays, and quality issues</p>
                                </div>
                                <div className="p-6 bg-white rounded-lg shadow-md">
                                    <EmojiEventsIcon className="text-blue-600 text-3xl mb-4 mx-auto" />
                                    <h3 className="font-semibold text-gray-900 mb-2">Skill Building</h3>
                                    <p className="text-gray-600 text-sm">Learn through practice with immediate feedback</p>
                                </div>
                            </div>
                            
                            {/* CTA */}
                            <div className="space-y-4">
                                {error && (
                                    <div className="p-4 bg-red-50 border border-red-200 rounded-md text-red-600">
                                        {error}
                                    </div>
                                )}
                                
                                <button
                                    onClick={generateSimulation}
                                    disabled={loading}
                                    className="inline-flex items-center px-8 py-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {loading ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                            Generating Scenario...
                                        </>
                                    ) : (
                                        <>
                                            <PlayArrowIcon className="mr-2" />
                                            Start Practice Simulation
                                        </>
                                    )}
                                </button>
                                
                                <p className="text-sm text-gray-500">
                                    Takes 10-20 minutes • Realistic project scenarios • Free to use
                                </p>
                            </div>
                            
                            {/* Footer CTA */}
                            <div className="mt-16 p-8 bg-blue-600 text-white rounded-lg">
                                <h2 className="text-2xl font-bold mb-4">Want the Full Experience?</h2>
                                <p className="text-blue-100 mb-6">
                                    Get access to project templates, team management tools, AI assistance, and more with TaskPilot.
                                </p>
                                <a href="/register" 
                                   className="bg-white text-blue-600 px-6 py-3 rounded-md font-semibold hover:bg-gray-100 transition-colors">
                                    Try TaskPilot Free
                                </a>
                            </div>
                        </div>
                    </main>
                </div>
            </>
        );
    }
    
    // Show simulator interface (similar to authenticated version but simplified)
    return (
        <>
            <Head title={`PM Simulator - ${project?.title || 'Practice Session'}`} />
            
            <div className="min-h-screen bg-gray-100">
                {/* Top bar */}
                <div className="bg-white shadow-sm border-b px-4 py-3">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <h1 className="text-lg font-semibold text-gray-900">Project Management Simulator</h1>
                            <span className="text-sm text-gray-500">Practice Mode</span>
                        </div>
                        <div className="flex items-center space-x-3">
                            <span className="text-sm text-gray-600">Week {currentWeek}/{totalWeeks}</span>
                            <button
                                onClick={restartSimulation}
                                className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
                            >
                                <RestartAltIcon className="text-sm mr-1" />
                                New Scenario
                            </button>
                        </div>
                    </div>
                </div>
                
                {/* Metrics bar */}
                <div className="bg-white border-b px-4 py-3">
                    <div className="grid grid-cols-5 gap-4">
                        {Object.entries(metrics).map(([key, value]) => (
                            <div key={key} className="text-center">
                                <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">
                                    {key.replace('_', ' ')}
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                                        <div 
                                            className={`h-2 rounded-full ${
                                                key === 'quality_risk' 
                                                    ? value > 50 ? 'bg-red-500' : value > 25 ? 'bg-yellow-500' : 'bg-green-500'
                                                    : value > 75 ? 'bg-green-500' : value > 50 ? 'bg-yellow-500' : 'bg-red-500'
                                            }`}
                                            style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
                                        />
                                    </div>
                                    <span className="text-sm font-medium text-gray-900">
                                        {Math.round(value)}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                
                {/* Main simulator content */}
                <div className="p-4">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Left column - Team and Tasks */}
                        <div className="lg:col-span-2 space-y-6">
                            <Team 
                                team={team}
                                setTeam={setTeam}
                                logAction={logAction}
                                evaluateTaskAction={handleTaskAction}
                                gameState={{ tasks, team, currentWeek, metrics }}
                            />
                            
                            <Tasks
                                tasks={tasks}
                                setTasks={setTasks}
                                team={team}
                                collapseVersion={collapseVersion}
                                logAction={logAction}
                                evaluateTaskAction={handleTaskAction}
                                gameState={{ tasks, team, currentWeek, metrics }}
                            />
                        </div>
                        
                        {/* Right column - Events and Controls */}
                        <div className="space-y-6">
                            <Events
                                events={allEvents}
                                resolvedEventIds={resolvedEventIds}
                                setResolvedEventIds={setResolvedEventIds}
                                tasks={tasks}
                                team={team}
                                currentWeek={currentWeek}
                                logAction={logAction}
                                evaluateSimulationAction={handleEventAction}
                                gameState={{ tasks, team, currentWeek, metrics }}
                            />
                            
                            {/* Week advance */}
                            <Paper className="p-4">
                                <div className="text-center">
                                    <Typography variant="h6" className="mb-3">Week Progress</Typography>
                                    <LinearProgress 
                                        variant="determinate" 
                                        value={(currentWeek / totalWeeks) * 100} 
                                        className="mb-4"
                                    />
                                    <button
                                        onClick={advanceWeek}
                                        disabled={currentWeek >= totalWeeks}
                                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {currentWeek >= totalWeeks ? 'Project Complete' : `Advance to Week ${currentWeek + 1}`}
                                    </button>
                                </div>
                            </Paper>
                            
                            {/* Activity log */}
                            {activityLog.length > 0 && (
                                <Paper className="p-4">
                                    <Typography variant="h6" className="mb-3">Recent Actions</Typography>
                                    <div className="space-y-1">
                                        {activityLog.map(action => (
                                            <div key={action.id} className="text-sm text-gray-600 p-2 bg-gray-50 rounded">
                                                {action.label}
                                            </div>
                                        ))}
                                    </div>
                                </Paper>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
