import React, { useState, useCallback, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { usePage } from '@inertiajs/react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    CircularProgress,
    Dialog,
    DialogContent,
    Divider,
    Fade,
    Stack,
    TextField,
    Typography,
    alpha,
    useTheme,
    IconButton,
    Tooltip,
    InputAdornment,
} from '@mui/material';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import SkipNextRoundedIcon from '@mui/icons-material/SkipNextRounded';
import TipsAndUpdatesRoundedIcon from '@mui/icons-material/TipsAndUpdatesRounded';
import AddRoundedIcon from '@mui/icons-material/AddRounded';
import RemoveRoundedIcon from '@mui/icons-material/RemoveRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';

/** GET suggestions for project creation context */
async function loadAISuggestions(draftProject, projectData, max = 8) {
    const clamped = Math.max(3, Math.min(8, max || 8));
    
    try {
        // If we have a draft project, try the existing AI suggestions endpoint
        if (draftProject?.id) {
            const url = `/projects/${draftProject.id}/tasks/ai/suggestions?max=${encodeURIComponent(clamped)}`;
            const response = await fetch(url, {
                headers: { 
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                },
                credentials: 'same-origin',
            });
            
            if (response.ok && response.headers.get('content-type')?.includes('application/json')) {
                const data = await response.json();
                if (Array.isArray(data?.suggestions)) {
                    return data.suggestions.filter((s) => typeof s === 'string' && s.trim() !== '');
                }
            }
        }
        
        // Fallback to intelligent default suggestions
        return getDefaultSuggestions(projectData, clamped);
    } catch (error) {
        console.error('Failed to load AI suggestions:', error);
        return getDefaultSuggestions(projectData, clamped);
    }
}

/** Fallback suggestions based on project type and domain */
function getDefaultSuggestions(projectData, max) {
    const baseSuggestions = [
        'Project planning and requirements gathering',
        'Technical architecture and system design',
        'User interface and experience design',
        'Development environment setup',
        'Core functionality implementation',
        'Testing and quality assurance',
        'Documentation and user guides',
        'Deployment and production setup',
        'Performance optimization',
        'Security audit and implementation',
        'User acceptance testing',
        'Training and knowledge transfer',
    ];
    
    // Customize suggestions based on project type
    const typeSpecific = {
        'Software Development': [
            'API development and integration',
            'Database design and optimization',
            'Frontend component development',
            'Backend service implementation',
            'Code review and refactoring',
            'Unit and integration testing',
            'CI/CD pipeline setup',
        ],
        'Marketing Campaign': [
            'Market research and analysis',
            'Campaign strategy development',
            'Content creation and copywriting',
            'Social media management',
            'Analytics and performance tracking',
            'A/B testing implementation',
            'Lead generation optimization',
        ],
        'Design Project': [
            'Brand identity development',
            'Visual design system creation',
            'User research and personas',
            'Prototype development',
            'Design validation and testing',
            'Asset creation and optimization',
            'Style guide documentation',
        ],
        'Research & Development': [
            'Literature review and analysis',
            'Hypothesis formulation',
            'Experiment design and setup',
            'Data collection and analysis',
            'Results interpretation',
            'Report writing and documentation',
            'Peer review and validation',
        ],
    };
    
    const projectType = projectData?.meta?.project_type || '';
    const domain = projectData?.meta?.domain || '';
    const specificSuggestions = typeSpecific[projectType] || typeSpecific[domain] || [];
    
    const allSuggestions = [...baseSuggestions, ...specificSuggestions];
    
    // Shuffle and return requested amount
    const shuffled = allSuggestions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, max);
}

/** Case-insensitive contains */
function includesLine(haystack, needle) {
    return haystack.toLowerCase().includes(needle.toLowerCase());
}

const VALID_TASK_STATUSES = ['todo', 'inprogress', 'review', 'done'];
const VALID_TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'];

function normalizeStatus(rawStatus) {
    if (!rawStatus) {
        return 'todo';
    }

    const lowered = rawStatus.toString().trim().toLowerCase();
    const compact = lowered.replace(/[\s_-]+/g, '');

    if (VALID_TASK_STATUSES.includes(lowered)) {
        return lowered;
    }

    if (VALID_TASK_STATUSES.includes(compact)) {
        return compact;
    }

    const aliasMap = {
        'to-do': 'todo',
        'not started': 'todo',
        'notstarted': 'todo',
        'in-progress': 'inprogress',
        'in progress': 'inprogress',
        'qa': 'review',
        'quality assurance': 'review',
        'completed': 'done',
        'complete': 'done',
    };

    if (aliasMap[lowered]) {
        return aliasMap[lowered];
    }

    if (aliasMap[compact]) {
        return aliasMap[compact];
    }

    return 'todo';
}

function normalizePriority(rawPriority) {
    if (!rawPriority) {
        return 'medium';
    }

    const lowered = rawPriority.toString().trim().toLowerCase();

    if (VALID_TASK_PRIORITIES.includes(lowered)) {
        return lowered;
    }

    const aliasMap = {
        'normal': 'medium',
        'standard': 'medium',
        'highest': 'urgent',
        'critical': 'urgent',
    };

    return aliasMap[lowered] || 'medium';
}

function normalizeEstimatedHours(value) {
    if (value === undefined || value === null || value === '') {
        return null;
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        const rounded = Math.round(value);
        return Math.max(1, Math.min(1000, rounded));
    }

    if (typeof value === 'string') {
        const match = value.match(/(\d+(?:\.\d+)?)/);
        if (!match) {
            return null;
        }

        const parsed = Math.round(parseFloat(match[1]));
        if (Number.isNaN(parsed)) {
            return null;
        }

        return Math.max(1, Math.min(1000, parsed));
    }

    if (typeof value === 'object' && value !== null) {
        const numeric = 'hours' in value ? value.hours : undefined;
        return normalizeEstimatedHours(numeric);
    }

    return null;
}

/** Generate intelligent tasks based on project context */
async function generateIntelligentTasks(projectData, count, prompt) {
    // Simulate API delay for realistic experience
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));
    
    const projectType = projectData?.meta?.project_type || '';
    const domain = projectData?.meta?.domain || '';
    const objectives = projectData?.meta?.objectives || '';
    const constraints = projectData?.meta?.constraints || '';
    
    // Task templates based on project type and domain
    const taskTemplates = {
        'Software Development': [
            {
                title: 'Set up development environment',
                description: 'Configure development tools, IDE, and local environment for the project.',
                priority: 'high',
                estimated_hours: 4,
                tags: ['setup', 'development']
            },
            {
                title: 'Design system architecture',
                description: 'Create technical architecture diagrams and define system components.',
                priority: 'high',
                estimated_hours: 8,
                tags: ['architecture', 'design']
            },
            {
                title: 'Implement core functionality',
                description: 'Develop the main features and core business logic.',
                priority: 'high',
                estimated_hours: 16,
                tags: ['development', 'core']
            },
            {
                title: 'Write unit tests',
                description: 'Create comprehensive unit tests for all components.',
                priority: 'medium',
                estimated_hours: 6,
                tags: ['testing', 'quality']
            },
            {
                title: 'Set up CI/CD pipeline',
                description: 'Configure continuous integration and deployment workflows.',
                priority: 'medium',
                estimated_hours: 4,
                tags: ['devops', 'automation']
            },
            {
                title: 'Create API documentation',
                description: 'Document all API endpoints and integration guidelines.',
                priority: 'medium',
                estimated_hours: 3,
                tags: ['documentation', 'api']
            },
            {
                title: 'Perform security audit',
                description: 'Review code for security vulnerabilities and implement fixes.',
                priority: 'high',
                estimated_hours: 5,
                tags: ['security', 'audit']
            },
            {
                title: 'Deploy to production',
                description: 'Deploy the application to production environment.',
                priority: 'high',
                estimated_hours: 3,
                tags: ['deployment', 'production']
            }
        ],
        'Marketing Campaign': [
            {
                title: 'Conduct market research',
                description: 'Research target audience, competitors, and market trends.',
                priority: 'high',
                estimated_hours: 8,
                tags: ['research', 'market']
            },
            {
                title: 'Develop campaign strategy',
                description: 'Create comprehensive marketing strategy and campaign plan.',
                priority: 'high',
                estimated_hours: 6,
                tags: ['strategy', 'planning']
            },
            {
                title: 'Create content calendar',
                description: 'Plan and schedule content across all marketing channels.',
                priority: 'medium',
                estimated_hours: 4,
                tags: ['content', 'planning']
            },
            {
                title: 'Design marketing materials',
                description: 'Create visual assets, banners, and promotional materials.',
                priority: 'medium',
                estimated_hours: 8,
                tags: ['design', 'creative']
            },
            {
                title: 'Set up analytics tracking',
                description: 'Implement tracking for campaign performance metrics.',
                priority: 'high',
                estimated_hours: 3,
                tags: ['analytics', 'tracking']
            },
            {
                title: 'Launch social media campaign',
                description: 'Execute social media marketing across platforms.',
                priority: 'medium',
                estimated_hours: 5,
                tags: ['social', 'launch']
            },
            {
                title: 'Monitor and optimize performance',
                description: 'Track campaign metrics and optimize for better results.',
                priority: 'high',
                estimated_hours: 4,
                tags: ['optimization', 'monitoring']
            },
            {
                title: 'Generate campaign report',
                description: 'Compile results and insights from the campaign.',
                priority: 'low',
                estimated_hours: 3,
                tags: ['reporting', 'analysis']
            }
        ],
        'Design Project': [
            {
                title: 'Conduct user research',
                description: 'Research target users, their needs, and pain points.',
                priority: 'high',
                estimated_hours: 6,
                tags: ['research', 'users']
            },
            {
                title: 'Create user personas',
                description: 'Develop detailed user personas based on research findings.',
                priority: 'high',
                estimated_hours: 4,
                tags: ['personas', 'ux']
            },
            {
                title: 'Design wireframes',
                description: 'Create low-fidelity wireframes for key user flows.',
                priority: 'high',
                estimated_hours: 8,
                tags: ['wireframes', 'ux']
            },
            {
                title: 'Develop design system',
                description: 'Create comprehensive design system with components and guidelines.',
                priority: 'medium',
                estimated_hours: 10,
                tags: ['design-system', 'ui']
            },
            {
                title: 'Create high-fidelity mockups',
                description: 'Design detailed visual mockups for all screens.',
                priority: 'high',
                estimated_hours: 12,
                tags: ['mockups', 'ui']
            },
            {
                title: 'Build interactive prototype',
                description: 'Create clickable prototype for user testing.',
                priority: 'medium',
                estimated_hours: 6,
                tags: ['prototype', 'testing']
            },
            {
                title: 'Conduct usability testing',
                description: 'Test design with real users and gather feedback.',
                priority: 'high',
                estimated_hours: 5,
                tags: ['testing', 'usability']
            },
            {
                title: 'Prepare design handoff',
                description: 'Package designs and specifications for development team.',
                priority: 'medium',
                estimated_hours: 3,
                tags: ['handoff', 'documentation']
            }
        ],
        'Research & Development': [
            {
                title: 'Literature review',
                description: 'Review existing research and publications in the field.',
                priority: 'high',
                estimated_hours: 10,
                tags: ['research', 'literature']
            },
            {
                title: 'Define research hypothesis',
                description: 'Formulate clear research questions and hypotheses.',
                priority: 'high',
                estimated_hours: 4,
                tags: ['hypothesis', 'planning']
            },
            {
                title: 'Design experiments',
                description: 'Plan experimental methodology and procedures.',
                priority: 'high',
                estimated_hours: 6,
                tags: ['experiments', 'methodology']
            },
            {
                title: 'Collect and analyze data',
                description: 'Gather experimental data and perform statistical analysis.',
                priority: 'high',
                estimated_hours: 15,
                tags: ['data', 'analysis']
            },
            {
                title: 'Validate results',
                description: 'Verify findings through peer review and replication.',
                priority: 'medium',
                estimated_hours: 5,
                tags: ['validation', 'review']
            },
            {
                title: 'Write research paper',
                description: 'Document findings in a comprehensive research paper.',
                priority: 'medium',
                estimated_hours: 8,
                tags: ['writing', 'documentation']
            },
            {
                title: 'Present findings',
                description: 'Prepare and deliver presentation of research results.',
                priority: 'low',
                estimated_hours: 3,
                tags: ['presentation', 'communication']
            }
        ]
    };
    
    // Get relevant task templates
    let availableTasks = taskTemplates[projectType] || taskTemplates[domain] || [];
    
    // If no specific templates, use generic project tasks
    if (availableTasks.length === 0) {
        availableTasks = [
            {
                title: 'Project kickoff meeting',
                description: 'Organize initial team meeting to align on project goals and timeline.',
                priority: 'high',
                estimated_hours: 2,
                tags: ['meeting', 'kickoff']
            },
            {
                title: 'Requirements gathering',
                description: 'Collect and document detailed project requirements.',
                priority: 'high',
                estimated_hours: 6,
                tags: ['requirements', 'planning']
            },
            {
                title: 'Create project timeline',
                description: 'Develop detailed project schedule with milestones.',
                priority: 'medium',
                estimated_hours: 3,
                tags: ['timeline', 'planning']
            },
            {
                title: 'Resource allocation',
                description: 'Assign team members and allocate necessary resources.',
                priority: 'medium',
                estimated_hours: 2,
                tags: ['resources', 'team']
            },
            {
                title: 'Risk assessment',
                description: 'Identify potential risks and develop mitigation strategies.',
                priority: 'medium',
                estimated_hours: 4,
                tags: ['risk', 'planning']
            },
            {
                title: 'Progress review',
                description: 'Regular review of project progress and adjustments.',
                priority: 'low',
                estimated_hours: 2,
                tags: ['review', 'monitoring']
            }
        ];
    }
    
    // Customize tasks based on objectives and constraints
    if (objectives && objectives.length > 50) {
        availableTasks.unshift({
            title: 'Define success metrics',
            description: `Establish clear KPIs and success criteria based on: ${objectives.substring(0, 100)}...`,
            priority: 'high',
            estimated_hours: 3,
            tags: ['metrics', 'objectives']
        });
    }
    
    if (constraints && constraints.length > 30) {
        availableTasks.push({
            title: 'Address project constraints',
            description: `Develop strategies to work within constraints: ${constraints.substring(0, 100)}...`,
            priority: 'medium',
            estimated_hours: 4,
            tags: ['constraints', 'planning']
        });
    }
    
    // Add custom tasks based on prompt
    if (prompt && prompt.length > 100) {
        availableTasks.unshift({
            title: 'Custom requirement implementation',
            description: 'Implement specific requirements mentioned in project context.',
            priority: 'high',
            estimated_hours: 6,
            tags: ['custom', 'requirements']
        });
    }
    
    // Shuffle and select the requested number of tasks
    const shuffled = availableTasks.sort(() => Math.random() - 0.5);
    const selectedTasks = shuffled.slice(0, count);
    
    // Format tasks with proper IDs
    return selectedTasks.map((task, index) => ({
        id: `generated-${index + 1}`,
        title: task.title,
        description: task.description,
        priority: task.priority,
        status: 'todo',
        estimated_hours: task.estimated_hours,
        tags: task.tags || []
    }));
}

/** AI Task Generation Loading Modal */
const AIGenerationModal = ({ open, count, onClose }) => {
    const theme = useTheme();
    const { t } = useTranslation();
    
    const [progress, setProgress] = useState(0);
    const [currentStep, setCurrentStep] = useState(0);
    
    const steps = [
        'Analyzing project requirements...',
        'Generating task structure...',
        'Optimizing task dependencies...',
        'Finalizing task details...',
    ];
    
    useEffect(() => {
        if (!open) {
            setProgress(0);
            setCurrentStep(0);
            return;
        }
        
        const interval = setInterval(() => {
            setProgress((prev) => {
                const newProgress = prev + Math.random() * 15 + 5;
                if (newProgress >= 100) {
                    clearInterval(interval);
                    return 100;
                }
                
                // Update step based on progress
                const stepIndex = Math.floor((newProgress / 100) * steps.length);
                setCurrentStep(Math.min(stepIndex, steps.length - 1));
                
                return newProgress;
            });
        }, 800);
        
        return () => clearInterval(interval);
    }, [open, steps.length]);
    
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
                    backdropFilter: 'blur(10px)',
                },
            }}
        >
            <DialogContent sx={{ p: 4, textAlign: 'center' }}>
                <Stack spacing={3} alignItems="center">
                    {/* AI Robot Icon with Animation */}
                    <Box
                        sx={{
                            position: 'relative',
                            display: 'flex',
                            alignItems: 'center',
                            gap: 0.5,
                            '@keyframes robotBounce': {
                                '0%, 20%, 50%, 80%, 100%': {
                                    transform: 'translateY(0) rotate(0deg)',
                                },
                                '40%': {
                                    transform: 'translateY(-2px) rotate(-2deg)',
                                },
                                '60%': {
                                    transform: 'translateY(-1px) rotate(1deg)',
                                },
                            },
                        }}
                    >
                        <SmartToyRoundedIcon
                            sx={{
                                fontSize: 48,
                                color: theme.palette.primary.main,
                                animation: 'robotBounce 2s ease-in-out infinite',
                                filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))',
                            }}
                        />
                    </Box>
                    
                    <Typography variant="h6" fontWeight={700}>
                        Generating {count} AI Tasks
                    </Typography>
                    
                    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 300 }}>
                        {steps[currentStep]}
                    </Typography>
                    
                    {/* Progress Bar */}
                    <Box sx={{ width: '100%', maxWidth: 300 }}>
                        <Box
                            sx={{
                                width: '100%',
                                height: 8,
                                borderRadius: 999,
                                background: alpha(theme.palette.primary.main, 0.1),
                                overflow: 'hidden',
                                position: 'relative',
                            }}
                        >
                            <Box
                                sx={{
                                    width: `${progress}%`,
                                    height: '100%',
                                    background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                    transition: 'width 0.8s ease',
                                    borderRadius: 999,
                                }}
                            />
                        </Box>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ mt: 1, display: 'block' }}
                        >
                            {Math.round(progress)}% complete
                        </Typography>
                    </Box>
                    
                    <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                        This may take a few moments...
                    </Typography>
                </Stack>
            </DialogContent>
        </Dialog>
    );
};

export default function CreateStepAITasks({ 
    data, 
    setData, 
    draftProject,
    onTasksGenerated, 
    onSkip 
}) {
    const { t } = useTranslation();
    const theme = useTheme();
    const { processing, errors = {} } = usePage().props;

    const [count, setCount] = useState(5);
    const [prompt, setPrompt] = useState('');
    const [chips, setChips] = useState([]);
    const [loadingChips, setLoadingChips] = useState(false);
    const [chipError, setChipError] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [showGenerationModal, setShowGenerationModal] = useState(false);

    /** Fetch & set suggestions; filters out ones already in the prompt */
    const fetchSuggestions = useCallback(async (qty = count) => {
        try {
            setLoadingChips(true);
            setChipError('');
            const list = await loadAISuggestions(draftProject, data, qty);
            const filtered = list.filter((s) => !includesLine(prompt, s));
            setChips(filtered);
        } catch (e) {
            console.error('AI suggestions error:', e);
            setChipError('Could not load AI suggestions. You can still type your own instructions.');
            setChips(getDefaultSuggestions(data, qty));
        } finally {
            setLoadingChips(false);
        }
    }, [count, data, prompt, draftProject]);

    /** Initial load of suggestions */
    useEffect(() => {
        if (data?.name) {
            fetchSuggestions(count);
        }
    }, [data?.name, count]); // Removed fetchSuggestions to prevent reload when prompt changes

    /** Append chip to prompt */
    const appendChip = useCallback((text) => {
        setPrompt((prev) => {
            if (!prev) return text;
            if (includesLine(prev, text)) return prev;
            return `${prev.trim()}\n- ${text}`;
        });
        setChips((prev) => prev.filter((c) => c !== text));
    }, []);

    // Align with backend validation (min 1, max 8 to prevent timeouts)
    const inc = () => setCount((n) => Math.min(8, Math.max(1, n + 1)));
    const dec = () => setCount((n) => Math.min(8, Math.max(1, n - 1)));
    const reset = () => {
        setCount(5);
        setPrompt('');
        fetchSuggestions(5);
    };

    const handleGenerate = async () => {
        setIsGenerating(true);
        setShowGenerationModal(true);

        try {
            // Build complete prompt with all context
            const projectContext = `
Project Name: ${data.name}
Description: ${data.description}
Project Type: ${data.meta?.project_type || 'Not specified'}
Domain: ${data.meta?.domain || 'Not specified'}
Team Size: ${data.meta?.team_size || 'Not specified'}
Budget: ${data.meta?.budget || 'Not specified'}
Timeline: ${data.start_date ? `${data.start_date} to ${data.end_date || 'TBD'}` : 'Not specified'}
Objectives: ${data.meta?.objectives || 'Not specified'}
Constraints: ${data.meta?.constraints || 'Not specified'}

Additional Instructions:
${prompt}
            `.trim();

            console.log('Generating tasks with:', {
                count,
                promptLength: projectContext.length,
                projectData: data,
            });

            // Generate tasks using intelligent generation
            const generatedTasks = await generateIntelligentTasks(data, count, projectContext);
            
            // If we have a draft project, immediately save tasks to it
            if (draftProject?.id && generatedTasks?.length > 0) {
                try {
                    console.log('Saving tasks directly to draft project:', draftProject.id);
                    
                    const tasksPayload = generatedTasks.map((task, index) => {
                        const title = task.title?.trim()
                            ? task.title.trim()
                            : `Untitled Task ${index + 1}`;

                        if (!task.title || task.title.trim() === '') {
                            console.warn(`Task ${index} has no title:`, task);
                        }

                        const normalizedStatus = normalizeStatus(task.status);
                        const normalizedPriority = normalizePriority(task.priority);
                        // Note: estimated_hours column doesn't exist in tasks table

                        return {
                            title,
                            description: task.description || '',
                            status: normalizedStatus,
                            priority: normalizedPriority,
                        };
                    });
                    
                    console.log('Tasks payload:', tasksPayload);
                    
                    // Create tasks directly on the draft project
                    const response = await fetch(`/projects/${draftProject.id}/tasks/bulk`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Accept': 'application/json',
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
                        },
                        credentials: 'same-origin',
                        body: JSON.stringify({
                            tasks: tasksPayload
                        }),
                    });

                    if (response.ok) {
                        console.log('Tasks saved successfully to draft project');
                    } else {
                        const errorData = await response.json().catch(() => null);
                        console.error('Failed to save tasks to draft project:', {
                            status: response.status,
                            statusText: response.statusText,
                            errorData
                        });
                    }
                } catch (error) {
                    console.error('Error saving tasks to draft project:', error);
                }
            }
            
            setIsGenerating(false);
            setShowGenerationModal(false);
            onTasksGenerated?.(generatedTasks, projectContext);

        } catch (error) {
            console.error('AI task generation failed:', error);
            setIsGenerating(false);
            setShowGenerationModal(false);
            
            // Show error message to user
            alert(`Failed to generate tasks: ${error.message}. Please try again or skip this step.`);
        }
    };

    const handleSkip = () => {
        onSkip?.();
    };

    const meterPct = Math.max(0, Math.min(100, Math.round((count / 8) * 100)));

    /** Pretty palettes for suggestion chips (rotating) */
    const chipPalettes = [
        { bg: alpha(theme.palette.info.main, 0.12), brd: alpha(theme.palette.info.main, 0.35) },
        { bg: alpha(theme.palette.success.main, 0.12), brd: alpha(theme.palette.success.main, 0.35) },
        { bg: alpha(theme.palette.warning.main, 0.12), brd: alpha(theme.palette.warning.main, 0.35) },
        { bg: alpha(theme.palette.secondary.main, 0.12), brd: alpha(theme.palette.secondary.main, 0.35) },
        { bg: alpha(theme.palette.primary.main, 0.12), brd: alpha(theme.palette.primary.main, 0.35) },
    ];

    return (
        <Box>
            <Stack spacing={3}>
                {/* Header */}
                <Box>
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                        {t('projects.aiTasks.title')} (Optional)
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        {t('projects.aiTasks.subtitle')}
                    </Typography>
                </Box>

                    {/* Skip Option */}
                    <Card
                        sx={{
                            background: alpha(theme.palette.info.main, 0.05),
                            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                        }}
                    >
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <SkipNextRoundedIcon sx={{ color: theme.palette.info.main }} />
                                <Box sx={{ flexGrow: 1 }}>
                                    <Typography variant="subtitle2" fontWeight={600}>
                                        {t('projects.aiTasks.skipTitle')}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('projects.aiTasks.skipDescription')}
                                    </Typography>
                                </Box>
                                <Button
                                    variant="outlined"
                                    onClick={handleSkip}
                                    startIcon={<SkipNextRoundedIcon />}
                                    sx={{ textTransform: 'none' }}
                                >
                                    {t('common.skip')}
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>

                    <Divider />

                    {/* AI Task Generation */}
                    <Box>
                        <Stack direction="row" spacing={1.2} alignItems="center" mb={2}>
                            <AutoAwesomeRoundedIcon
                                sx={{ color: alpha(theme.palette.primary.main, 0.9) }}
                            />
                            <Typography variant="h6" fontWeight={900} letterSpacing={-0.2}>
                                {t('aiTask.generator')}
                            </Typography>
                            <Chip
                                size="small"
                                label={`${count} tasks`}
                                sx={{
                                    ml: 'auto',
                                    fontWeight: 800,
                                    height: 26,
                                    borderRadius: 999,
                                    background: 'linear-gradient(135deg,#22c55e22,#22c55e14 60%,#16a34a22)',
                                    border: `1px solid ${alpha('#22c55e', 0.35)}`,
                                }}
                            />
                        </Stack>

                        {/* Count control */}
                        <Typography
                            variant="subtitle2"
                            sx={{
                                fontWeight: 900,
                                letterSpacing: 0.3,
                                mb: 0.5,
                                color: alpha(theme.palette.text.primary, 0.85),
                            }}
                        >
                            Number of Tasks to Generate
                        </Typography>

                        <Stack direction="row" spacing={1} alignItems="center" mb={3}>
                            <TextField
                                type="number"
                                size="small"
                                value={count}
                                onChange={(e) =>
                                    setCount(() =>
                                        Math.min(8, Math.max(1, Number(e.target.value) || 1))
                                    )
                                }
                                disabled={isGenerating || processing}
                                inputProps={{ min: 1, max: 8 }}
                                sx={{ width: 120 }}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <Tooltip title={t('common.decrease')}>
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        onClick={dec}
                                                        disabled={count <= 1 || isGenerating || processing}
                                                    >
                                                        <RemoveRoundedIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </InputAdornment>
                                    ),
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <Tooltip title={t('common.increase')}>
                                                <span>
                                                    <IconButton
                                                        size="small"
                                                        onClick={inc}
                                                        disabled={count >= 8 || isGenerating || processing}
                                                    >
                                                        <AddRoundedIcon fontSize="small" />
                                                    </IconButton>
                                                </span>
                                            </Tooltip>
                                        </InputAdornment>
                                    ),
                                }}
                            />

                            <Box
                                sx={{
                                    flexGrow: 1,
                                    height: 10,
                                    borderRadius: 999,
                                    background: alpha(theme.palette.primary.main, 0.1),
                                    overflow: 'hidden',
                                    position: 'relative',
                                }}
                            >
                                <Box
                                    sx={{
                                        width: `${meterPct}%`,
                                        height: '100%',
                                        background: 'linear-gradient(90deg,#34D399,#10B981 55%,#059669)',
                                        transition: 'width .25s ease',
                                    }}
                                />
                                <Typography
                                    variant="caption"
                                    sx={{
                                        position: 'absolute',
                                        right: 8,
                                        top: -18,
                                        color: alpha(theme.palette.text.primary, 0.55),
                                        fontWeight: 600,
                                    }}
                                >
                                    {count} requested
                                </Typography>
                            </Box>
                        </Stack>

                        {/* Prompt Input */}
                        <TextField
                            multiline
                            minRows={4}
                            fullWidth
                            placeholder="Provide additional context or specific requirements for the tasks you want to generate..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            disabled={isGenerating || processing}
                            sx={{ mb: 2 }}
                        />

                        {/* AI Suggestions */}
                        <Stack spacing={0.8}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.3 }}>
                                <Typography
                                    variant="caption"
                                    sx={{ color: alpha(theme.palette.text.primary, 0.6) }}
                                >
                                    Click suggestions to add them to your prompt:
                                </Typography>
                                <Chip
                                    size="small"
                                    label={`${chips.length} suggestions`}
                                    sx={{
                                        height: 22,
                                        fontWeight: 700,
                                        background: alpha(theme.palette.primary.main, 0.08),
                                        border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                                    }}
                                />
                                <Box sx={{ flexGrow: 1 }} />
                                <Tooltip title="Refresh suggestions">
                                    <span>
                                        <Button
                                            size="small"
                                            variant="text"
                                            onClick={() => fetchSuggestions(count)}
                                            startIcon={<RestartAltRoundedIcon />}
                                            disabled={loadingChips}
                                            sx={{ textTransform: 'none', fontWeight: 700 }}
                                        >
                                            {t('buttons.refresh')}
                                        </Button>
                                    </span>
                                </Tooltip>
                            </Stack>

                            {chipError && (
                                <Typography variant="caption" color="error" sx={{ mb: 0.5 }}>
                                    {chipError}
                                </Typography>
                            )}

                            <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1.2}>
                                {loadingChips
                                    ? Array.from({ length: Math.max(6, Math.min(10, count)) }).map(
                                          (_, i) => (
                                              <Chip
                                                  key={`skeleton-${i}`}
                                                  label={t('common.loading')}
                                                  icon={<TipsAndUpdatesRoundedIcon />}
                                                  sx={{
                                                      opacity: 0.65,
                                                      fontWeight: 700,
                                                      background: alpha(theme.palette.info.main, 0.12),
                                                      border: `1px solid ${alpha(theme.palette.info.main, 0.35)}`,
                                                  }}
                                              />
                                          )
                                      )
                                    : chips.map((s, idx) => {
                                          const pal = chipPalettes[idx % chipPalettes.length];
                                          return (
                                              <Chip
                                                  key={`${idx}-${s}`}
                                                  onClick={() => appendChip(s)}
                                                  icon={<TipsAndUpdatesRoundedIcon />}
                                                  label={s}
                                                  sx={{
                                                      cursor: 'pointer',
                                                      fontWeight: 700,
                                                      background: pal.bg,
                                                      border: `1px solid ${pal.brd}`,
                                                      transition: 'transform .15s, box-shadow .15s, background .15s',
                                                      '&:hover': {
                                                          background: alpha(pal.brd, 0.18),
                                                          transform: 'translateY(-1px)',
                                                          boxShadow: `0 6px 16px -8px ${alpha(pal.brd, 0.55)}`,
                                                      },
                                                  }}
                                              />
                                          );
                                      })}
                            </Stack>
                        </Stack>

                        {/* Actions */}
                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={1.2}
                            justifyContent="flex-end"
                            mt={3}
                        >
                            <Button
                                variant="text"
                                startIcon={<RestartAltRoundedIcon />}
                                onClick={reset}
                                disabled={isGenerating || processing}
                                sx={{ textTransform: 'none', fontWeight: 700 }}
                            >
                                {t('buttons.reset')}
                            </Button>
                            <Button
                                variant="contained"
                                onClick={handleGenerate}
                                disabled={isGenerating || processing}
                                startIcon={
                                    isGenerating || processing ? (
                                        <CircularProgress size={16} color="inherit" />
                                    ) : (
                                        <AutoAwesomeRoundedIcon />
                                    )
                                }
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 900,
                                    px: 2.6,
                                    background:
                                        isGenerating || processing
                                            ? 'linear-gradient(135deg,#9CA3AF,#6B7280)'
                                            : 'linear-gradient(135deg,#6366F1,#4F46E5 55%,#4338CA)',
                                    boxShadow: '0 8px 20px -8px rgba(79,70,229,.55), 0 2px 6px rgba(0,0,0,.25)',
                                    '&:hover': {
                                        background:
                                            isGenerating || processing
                                                ? 'linear-gradient(135deg,#9CA3AF,#6B7280)'
                                                : 'linear-gradient(135deg,#595CEB,#4841D6 55%,#3B32B8)',
                                    },
                                    '&:disabled': {
                                        background: 'linear-gradient(135deg,#9CA3AF,#6B7280)',
                                        color: 'rgba(255,255,255,0.7)',
                                    },
                                }}
                            >
                                {isGenerating || processing
                                    ? `Generating ${count} tasks...`
                                    : `Generate ${count} Tasks`}
                            </Button>
                        </Stack>
                    </Box>
            </Stack>
            
            {/* AI Generation Modal */}
            <AIGenerationModal
                open={showGenerationModal}
                count={count}
                onClose={() => {
                    // Don't allow closing during generation
                    if (!isGenerating) {
                        setShowGenerationModal(false);
                    }
                }}
            />
        </Box>
    );
}
