import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import {
    Box,
    Button,
    Container,
    Link,
    Stack,
    TextField,
    Typography,
    Paper,
    Grid,
    Card,
    CardContent,
    Chip,
    Avatar,
    useTheme,
    alpha,
    Divider,
} from '@mui/material';
import {
    Google as GoogleIcon,
    AutoAwesome,
    ViewModule,
    Settings,
    IntegrationInstructions,
    Search,
    Home,
    TrendingUp,
    Timeline,
    GroupWork,
    Security,
    Speed,
    CheckCircle,
    Star,
    Business,
    Group,
    Assignment,
    Dashboard,
    AutoFixHigh,
    Analytics,
    Schedule,
    Task,
    Rocket,
    Lightbulb,
    Shield,
} from '@mui/icons-material';

export default function Landing({ errors }) {
    const theme = useTheme();

    // Add CSS keyframes for animations
    React.useEffect(() => {
        const style = document.createElement('style');
        style.textContent = `
            @keyframes gradientShift {
                0% { background-position: 0% 50%; }
                50% { background-position: 100% 50%; }
                100% { background-position: 0% 50%; }
            }
            @keyframes bounce {
                0%, 20%, 53%, 80%, 100% {
                    transform: translateY(0);
                }
                40%, 43% {
                    transform: translateY(-10px);
                }
                70% {
                    transform: translateY(-5px);
                }
            }
        `;
        document.head.appendChild(style);
        return () => document.head.removeChild(style);
    }, []);

    /* ----- email/password form ----- */
    const { data, setData, post, processing } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post('/login');
    };

    const features = [
        {
            icon: <AutoAwesome sx={{ fontSize: 48, color: '#FF6B6B' }} />,
            title: 'AI-powered productivity',
            description:
                'Get work done faster with the only AI-powered assistant tailored to your role.',
            color: '#FF6B6B',
        },
        {
            icon: <ViewModule sx={{ fontSize: 48, color: '#4ECDC4' }} />,
            title: 'View work your way',
            description:
                'Instantly switch between 15 views including list, board, gantt, and more.',
            color: '#4ECDC4',
        },
        {
            icon: <Settings sx={{ fontSize: 48, color: '#45B7D1' }} />,
            title: 'Customize in a click',
            description:
                'Configuring TaskPilot for different types of work is as easy as flipping a switch.',
            color: '#45B7D1',
        },
        {
            icon: <IntegrationInstructions sx={{ fontSize: 48, color: '#96CEB4' }} />,
            title: 'Plays well with others',
            description: 'Easily integrates with the tools you already use.',
            color: '#96CEB4',
        },
        {
            icon: <AutoFixHigh sx={{ fontSize: 48, color: '#FFEAA7' }} />,
            title: 'Streamline workflows',
            description: 'Eliminate repetitive tasks and focus on what matters most.',
            color: '#FFEAA7',
        },
        {
            icon: <Search sx={{ fontSize: 48, color: '#DDA0DD' }} />,
            title: 'Search everything',
            description:
                'Find any file in TaskPilot, a connected app, or your local drive, from one place.',
            color: '#DDA0DD',
        },
        {
            icon: <Home sx={{ fontSize: 48, color: '#F7DC6F' }} />,
            title: "Stay ahead of what's next",
            description:
                'Organize your work, reminders, and calendar events all from your personalized Home.',
            color: '#F7DC6F',
        },
    ];

    const methodologies = [
        { name: 'Agile', color: '#FF6B6B' },
        { name: 'Scrum', color: '#4ECDC4' },
        { name: 'Kanban', color: '#45B7D1' },
        { name: 'Waterfall', color: '#96CEB4' },
        { name: 'Lean', color: '#FFEAA7' },
        { name: 'DevOps', color: '#DDA0DD' },
        { name: 'Hybrid', color: '#98D8C8' },
        { name: 'SAFe', color: '#F7DC6F' },
    ];

    return (
        <>
            <Head title="TaskPilot - The AI workspace where all your work gets done">
                <meta
                    name="description"
                    content="The converged AI workspace, where all your work gets done. A single place for projects, tasks, chat, docs, and more. Where humans, AI, and agents work—together."
                />
                <meta
                    name="keywords"
                    content="project management software, team collaboration tool, task management, productivity app, project tracking, workflow automation, agile project management, scrum tool, kanban board, team productivity, project planning, task organizer, project dashboard, milestone tracking, resource management, time tracking, project analytics, team communication, project reporting, deadline management, project coordination, work management, business productivity, startup tools, remote work, distributed teams, project oversight, task automation, workflow management, team efficiency, project monitoring, task prioritization, project control, team synchronization, project optimization, project management platform, collaboration software, productivity software, management tool, business tool, enterprise solution, project success, team performance, project delivery, task completion, project goals, team objectives, project metrics, productivity metrics, business intelligence, project insights, team insights, collaborative workspace, digital workplace, project ecosystem, productivity platform, management platform, collaboration platform, business platform, work platform, team platform, project technology, productivity technology, management technology, business technology, work technology, team technology"
                />
                <meta
                    property="og:title"
                    content="TaskPilot - The AI workspace where all your work gets done"
                />
                <meta
                    property="og:description"
                    content="A single place for projects, tasks, chat, docs, and more. Where humans, AI, and agents work—together."
                />
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://taskpilot.us" />
                <meta property="og:site_name" content="TaskPilot" />
                <meta name="twitter:card" content="summary_large_image" />
                <meta
                    name="twitter:title"
                    content="TaskPilot - The AI workspace where all your work gets done"
                />
                <meta
                    name="twitter:description"
                    content="A single place for projects, tasks, chat, docs, and more. Where humans, AI, and agents work—together."
                />
                <meta name="robots" content="index, follow" />
                <meta name="author" content="TaskPilot" />
                <link rel="canonical" href="https://taskpilot.us" />
                
                {/* Structured Data for SEO */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "SoftwareApplication",
                        "name": "TaskPilot",
                        "description": "The modern project workspace where productivity meets simplicity. A single place for projects, tasks, chat, docs, and more.",
                        "url": "https://taskpilot.us",
                        "applicationCategory": "BusinessApplication",
                        "operatingSystem": "Web Browser",
                        "offers": {
                            "@type": "Offer",
                            "price": "0",
                            "priceCurrency": "USD",
                            "priceValidUntil": "2025-12-31"
                        },
                        "aggregateRating": {
                            "@type": "AggregateRating",
                            "ratingValue": "4.8",
                            "ratingCount": "1247"
                        },
                        "publisher": {
                            "@type": "Organization",
                            "name": "TaskPilot",
                            "url": "https://taskpilot.us"
                        }
                    })}
                </script>
            </Head>

            <Box sx={{ bgcolor: 'white', minHeight: '100vh' }}>
                {/* Header/Navigation */}
                <Box
                    sx={{
                        py: 2,
                        borderBottom: '1px solid',
                        borderColor: 'grey.200',
                        position: 'sticky',
                        top: 0,
                        bgcolor: 'white',
                        zIndex: 10,
                    }}
                >
                    <Container maxWidth="lg">
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}
                        >
                            <Typography variant="h5" sx={{ fontWeight: 700, color: '#7C6AE8' }}>
                                TaskPilot
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 2 }}>
                                <Button
                                    variant="outlined"
                                    size="small"
                                    sx={{
                                        textTransform: 'none',
                                        borderColor: '#4ECDC4',
                                        color: '#4ECDC4',
                                        borderWidth: 2,
                                        borderRadius: 2,
                                        px: 3,
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        '&:hover': {
                                            borderColor: '#4ECDC4',
                                            bgcolor: '#4ECDC4',
                                            color: 'white',
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 8px 20px rgba(78, 205, 196, 0.3)',
                                        },
                                    }}
                                    onClick={() => {
                                        document
                                            .getElementById('login-form')
                                            .scrollIntoView({ behavior: 'smooth' });
                                    }}
                                >
                                    Log in
                                </Button>
                                <Button
                                    variant="contained"
                                    size="small"
                                    href={route('register')}
                                    sx={{
                                        textTransform: 'none',
                                        background: 'linear-gradient(135deg, #FF6B6B, #45B7D1)',
                                        borderRadius: 2,
                                        px: 3,
                                        py: 1,
                                        boxShadow: '0 4px 15px rgba(255, 107, 107, 0.3)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        '&:hover': {
                                            background: 'linear-gradient(135deg, #45B7D1, #FF6B6B)',
                                            transform: 'translateY(-2px) scale(1.05)',
                                            boxShadow: '0 8px 25px rgba(255, 107, 107, 0.4)',
                                        },
                                    }}
                                >
                                    Sign up
                                </Button>
                            </Box>
                        </Box>
                    </Container>
                </Box>

                {/* Hero Section */}
                <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: 'white' }}>
                    <Container maxWidth="lg">
                        <Box sx={{ textAlign: 'center', mb: 8 }}>
                            <Typography
                                variant="h1"
                                sx={{
                                    fontSize: {
                                        xs: '2.5rem',
                                        sm: '3.5rem',
                                        md: '4.5rem',
                                        lg: '5rem',
                                    },
                                    fontWeight: 700,
                                    lineHeight: 1.1,
                                    mb: 4,
                                    color: '#1a1a1a',
                                    maxWidth: 900,
                                    mx: 'auto',
                                }}
                            >
                                The modern project workspace,{' '}
                                <Box component="span" sx={{ color: '#7C6AE8' }}>
                                    where productivity meets simplicity
                                </Box>
                            </Typography>

                            <Typography
                                variant="h5"
                                sx={{
                                    mb: 6,
                                    color: 'grey.700',
                                    fontWeight: 400,
                                    maxWidth: 600,
                                    mx: 'auto',
                                    lineHeight: 1.4,
                                }}
                            >
                                A single place for projects, tasks, chat, docs, and more. Where
                                teams collaborate and AI helps you work smarter.
                            </Typography>

                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={2}
                                justifyContent="center"
                                sx={{ mb: 4 }}
                            >
                                <Button
                                    variant="contained"
                                    size="large"
                                    href={route('register')}
                                    sx={{
                                        background:
                                            'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)',
                                        backgroundSize: '200% 200%',
                                        animation: 'gradientShift 3s ease infinite',
                                        color: 'white',
                                        py: 2,
                                        px: 4,
                                        fontSize: '1.1rem',
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        borderRadius: 2,
                                        boxShadow: '0 8px 25px rgba(255, 107, 107, 0.3)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        '&:hover': {
                                            transform: 'translateY(-3px) scale(1.05)',
                                            boxShadow: '0 15px 35px rgba(255, 107, 107, 0.4)',
                                            animation: 'gradientShift 1s ease infinite',
                                        },
                                    }}
                                >
                                    Get Started
                                </Button>
                            </Stack>

                            <Typography variant="body2" sx={{ color: 'grey.600', fontWeight: 500 }}>
                                Start your productivity journey today
                            </Typography>
                        </Box>

                        {/* Project Management Methodologies */}
                        <Box sx={{ textAlign: 'center', mb: 8 }}>
                            <Typography
                                variant="body2"
                                sx={{ mb: 4, color: 'grey.600', fontWeight: 500 }}
                            >
                                Supports all project management methodologies
                            </Typography>

                            <Grid container spacing={3} justifyContent="center" alignItems="center">
                                {methodologies.map((methodology, index) => (
                                    <Grid item xs={6} sm={4} md={3} key={index}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                py: 2,
                                                px: 3,
                                                borderRadius: 2,
                                                background: `linear-gradient(135deg, ${alpha(methodology.color, 0.05)} 0%, ${alpha(methodology.color, 0.02)} 100%)`,
                                                border: `1px solid ${alpha(methodology.color, 0.1)}`,
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                '&:hover': {
                                                    transform: 'translateY(-4px) scale(1.05)',
                                                    background: `linear-gradient(135deg, ${alpha(methodology.color, 0.1)} 0%, ${alpha(methodology.color, 0.05)} 100%)`,
                                                    border: `1px solid ${alpha(methodology.color, 0.2)}`,
                                                    boxShadow: `0 8px 25px ${alpha(methodology.color, 0.2)}`,
                                                },
                                            }}
                                        >
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    fontWeight: 600,
                                                    color: methodology.color,
                                                    fontSize: '1.1rem',
                                                    transition: 'color 0.3s ease',
                                                }}
                                            >
                                                {methodology.name}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    </Container>
                </Box>

                {/* Product Demo Video Section */}
                <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: '#F8F9FA' }}>
                    <Container maxWidth="lg">
                        <Box sx={{ textAlign: 'center', mb: 8 }}>
                            <Typography
                                variant="h2"
                                sx={{
                                    fontSize: { xs: '2rem', md: '3rem' },
                                    fontWeight: 700,
                                    mb: 3,
                                    color: '#1a1a1a',
                                }}
                            >
                                See TaskPilot in Action
                            </Typography>
                            <Typography
                                variant="h6"
                                sx={{
                                    color: 'grey.700',
                                    fontWeight: 400,
                                    maxWidth: 600,
                                    mx: 'auto',
                                    mb: 6,
                                }}
                            >
                                Watch how TaskPilot transforms the way teams collaborate and manage projects
                            </Typography>
                        </Box>

                        <Box
                            sx={{
                                position: 'relative',
                                maxWidth: 900,
                                mx: 'auto',
                                borderRadius: 4,
                                overflow: 'hidden',
                                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
                                background: 'linear-gradient(135deg, #FF6B6B, #4ECDC4)',
                                p: 3,
                                mb: 8,
                            }}
                        >
                            <video
                                controls
                                style={{
                                    width: '100%',
                                    height: 'auto',
                                    borderRadius: '12px',
                                    boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
                                }}
                                poster="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODAwIiBoZWlnaHQ9IjQ1MCIgdmlld0JveD0iMCAwIDgwMCA0NTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNDUwIiBmaWxsPSIjRjhGOUZBIi8+Cjx0ZXh0IHg9IjQwMCIgeT0iMjI1IiB0ZXh0LWFuY2hvcj0ibWlkZGxlIiBmaWxsPSIjNjY2IiBmb250LXNpemU9IjI0Ij5UYXNrUGlsb3QgSW50cm88L3RleHQ+Cjwvc3ZnPgo="
                            >
                                <source src="/videos/intro.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        </Box>
                    </Container>
                </Box>

                {/* Core Widgets Showcase */}
                <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: 'white' }}>
                    <Container maxWidth="lg">
                        <Box sx={{ textAlign: 'center', mb: 10 }}>
                            <Typography
                                variant="h2"
                                sx={{
                                    fontSize: { xs: '2rem', md: '3rem' },
                                    fontWeight: 700,
                                    mb: 3,
                                    color: '#1a1a1a',
                                }}
                            >
                                Core Widgets & Features
                            </Typography>
                            <Typography
                                variant="h6"
                                sx={{
                                    color: 'grey.700',
                                    fontWeight: 400,
                                    maxWidth: 600,
                                    mx: 'auto',
                                    mb: 8,
                                }}
                            >
                                Powerful tools designed for modern teams
                            </Typography>
                        </Box>

                        {/* Real App Widgets Showcase */}
                        <Grid container spacing={6} sx={{ mb: 8 }}>
                            {/* Task Board Widget - Using actual TaskCard styling */}
                            <Grid item xs={12} md={6}>
                                <Box
                                    sx={{
                                        p: 4,
                                        borderRadius: 3,
                                        border: '2px solid #E3F2FD',
                                        background: 'linear-gradient(135deg, #F7FAFF 0%, #F2F6FE 55%, #EDF2FA 100%)',
                                        height: 400,
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#4F46E5' }}>
                                        📋 Kanban Board
                                    </Typography>
                                    
                                    {/* Real Kanban Columns */}
                                    <Grid container spacing={2}>
                                        {[
                                            { 
                                                key: 'todo', 
                                                title: 'To Do', 
                                                accent: '#FFA432',
                                                tasks: [
                                                    { id: 1, title: 'Create user stories', priority: 'high' },
                                                    { id: 2, title: 'Design wireframes', priority: 'medium' }
                                                ]
                                            },
                                            { 
                                                key: 'inprogress', 
                                                title: 'In Progress', 
                                                accent: '#2C8DFF',
                                                tasks: [
                                                    { id: 3, title: 'Build API endpoints', priority: 'urgent' },
                                                ]
                                            },
                                            { 
                                                key: 'done', 
                                                title: 'Done', 
                                                accent: '#22B36B',
                                                tasks: [
                                                    { id: 4, title: 'Project setup ✓', priority: 'low' }
                                                ]
                                            }
                                        ].map((column, colIndex) => (
                                            <Grid item xs={4} key={column.key}>
                                                <Box sx={{ 
                                                    p: 2, 
                                                    borderRadius: 2,
                                                    background: `linear-gradient(135deg, ${alpha(column.accent, 0.08)} 0%, ${alpha(column.accent, 0.04)} 100%)`,
                                                    border: `1px solid ${alpha(column.accent, 0.18)}`,
                                                    minHeight: 280 
                                                }}>
                                                    {/* Column Header */}
                                                    <Box sx={{ 
                                                        display: 'flex', 
                                                        alignItems: 'center', 
                                                        mb: 2,
                                                        p: 1,
                                                        borderRadius: 1,
                                                        background: 'rgba(255,255,255,0.6)',
                                                    }}>
                                                        <Box
                                                            sx={{
                                                                width: 18,
                                                                height: 18,
                                                                borderRadius: '50%',
                                                                background: `linear-gradient(145deg, ${column.accent}, ${alpha(column.accent, 0.8)})`,
                                                                mr: 1,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: 'white',
                                                                fontSize: '10px',
                                                                fontWeight: 'bold'
                                                            }}
                                                        >
                                                            {column.tasks.length}
                                                        </Box>
                                                        <Typography variant="subtitle2" sx={{ 
                                                            fontWeight: 700, 
                                                            color: column.accent,
                                                            fontSize: '0.75rem',
                                                            textTransform: 'uppercase',
                                                            letterSpacing: 0.5
                                                        }}>
                                                            {column.title}
                                                        </Typography>
                                                    </Box>
                                                    
                                                    {/* Task Cards */}
                                                    <Stack spacing={1.5}>
                                                        {column.tasks.map((task) => (
                                                            <Box
                                                                key={task.id}
                                                                sx={{
                                                                    p: 2,
                                                                    bgcolor: 'white',
                                                                    borderRadius: 2,
                                                                    borderLeft: `4px solid ${column.accent}`,
                                                                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                                                    transition: 'all 0.2s ease',
                                                                    cursor: 'pointer',
                                                                    '&:hover': {
                                                                        transform: 'translateY(-2px)',
                                                                        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                                                                    }
                                                                }}
                                                            >
                                                                <Typography variant="body2" sx={{ 
                                                                    fontWeight: 500, 
                                                                    mb: 1,
                                                                    fontSize: '0.8rem'
                                                                }}>
                                                                    {task.title}
                                                                </Typography>
                                                                <Chip
                                                                    label={task.priority}
                                                                    size="small"
                                                                    sx={{
                                                                        fontSize: '0.7rem',
                                                                        height: 20,
                                                                        bgcolor: task.priority === 'urgent' ? '#ffebee' : 
                                                                                task.priority === 'high' ? '#fff3e0' :
                                                                                task.priority === 'medium' ? '#e3f2fd' : '#e8f5e8',
                                                                        color: task.priority === 'urgent' ? '#d32f2f' : 
                                                                               task.priority === 'high' ? '#f57c00' :
                                                                               task.priority === 'medium' ? '#1976d2' : '#388e3c',
                                                                    }}
                                                                />
                                                            </Box>
                                                        ))}
                                                    </Stack>
                                                </Box>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>
                            </Grid>
                            
                            {/* Project Analytics Widget - Real stats styling */}
                            <Grid item xs={12} md={6}>
                                <Box
                                    sx={{
                                        p: 4,
                                        borderRadius: 3,
                                        border: '2px solid #F3E5F5',
                                        background: 'linear-gradient(135deg, #F9F3FF 0%, #E3D2FF 100%)',
                                        height: 400,
                                    }}
                                >
                                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#7B1FA2' }}>
                                        📊 Project Analytics
                                    </Typography>
                                    
                                    {/* Stats Cards */}
                                    <Grid container spacing={2} sx={{ mb: 3 }}>
                                        {[
                                            { label: 'Total Tasks', value: '24', color: '#FF6B6B', icon: '📋' },
                                            { label: 'Completed', value: '18', color: '#4ECDC4', icon: '✅' },
                                            { label: 'In Progress', value: '4', color: '#45B7D1', icon: '🚧' },
                                            { label: 'Overdue', value: '2', color: '#FFA726', icon: '⏰' },
                                        ].map((stat, i) => (
                                            <Grid item xs={6} key={i}>
                                                <Box sx={{ 
                                                    p: 2, 
                                                    bgcolor: 'white', 
                                                    borderRadius: 2, 
                                                    textAlign: 'center',
                                                    border: `1px solid ${alpha(stat.color, 0.2)}`,
                                                    transition: 'all 0.2s ease',
                                                    '&:hover': {
                                                        transform: 'translateY(-2px)',
                                                        boxShadow: `0 4px 12px ${alpha(stat.color, 0.2)}`,
                                                    }
                                                }}>
                                                    <Typography variant="body2" sx={{ 
                                                        fontSize: '0.75rem', 
                                                        color: 'grey.600', 
                                                        mb: 0.5 
                                                    }}>
                                                        {stat.icon} {stat.label}
                                                    </Typography>
                                                    <Typography variant="h6" sx={{ 
                                                        color: stat.color, 
                                                        fontWeight: 700,
                                                        fontSize: '1.25rem'
                                                    }}>
                                                        {stat.value}
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                        ))}
                                    </Grid>
                                    
                                    {/* Progress Chart */}
                                    <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, mb: 2 }}>
                                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                                            Completion Progress
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'end', height: 80, gap: 1 }}>
                                            {[40, 65, 45, 80, 55, 70, 85].map((height, i) => (
                                                <Box
                                                    key={i}
                                                    sx={{
                                                        flex: 1,
                                                        height: `${height}%`,
                                                        bgcolor: i < 5 ? '#7B1FA2' : '#4CAF50',
                                                        borderRadius: '2px 2px 0 0',
                                                        opacity: 0.8,
                                                        transition: 'all 0.3s ease',
                                                        '&:hover': {
                                                            opacity: 1,
                                                            transform: 'scaleY(1.1)',
                                                        }
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                    
                                    {/* Team Performance */}
                                    <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2 }}>
                                        <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                            Team Velocity
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ 
                                                width: 20, 
                                                height: 4, 
                                                bgcolor: '#4CAF50', 
                                                borderRadius: 2,
                                                flex: 0.75 
                                            }} />
                                            <Typography variant="body2" sx={{ fontSize: '0.8rem', color: 'grey.600' }}>
                                                75% efficiency
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Box>
                            </Grid>
                        </Grid>

                        {/* Workflow Automation Widget - Real workflow styling */}
                        <Grid container spacing={6} sx={{ mb: 8 }}>
                            <Grid item xs={12} md={6}>
                                <Box
                                    sx={{
                                        p: 4,
                                        borderRadius: 3,
                                        border: '2px solid #E8F5E8',
                                        background: 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 55%, #E7F5EE 100%)',
                                        height: 350,
                                    }}
                                >
                                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#22B36B' }}>
                                        🔄 Workflow Automation
                                    </Typography>
                                    
                                    {/* Workflow Builder Style */}
                                    <Box sx={{ position: 'relative' }}>
                                        {[
                                            { 
                                                step: '🎯', 
                                                title: 'Trigger: Task Completed', 
                                                desc: 'When any task is marked as done',
                                                color: '#25D3B3'
                                            },
                                            { 
                                                step: '⚡', 
                                                title: 'Action: Auto-Assign', 
                                                desc: 'Next task assigned to team member',
                                                color: '#4D9FFF'
                                            },
                                            { 
                                                step: '🔔', 
                                                title: 'Notify: Send Alert', 
                                                desc: 'Slack notification sent to team',
                                                color: '#FFB961'
                                            },
                                            { 
                                                step: '📊', 
                                                title: 'Update: Dashboard', 
                                                desc: 'Analytics updated in real-time',
                                                color: '#A97CFF'
                                            },
                                        ].map((item, i) => (
                                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                                                <Box
                                                    sx={{
                                                        width: 40,
                                                        height: 40,
                                                        borderRadius: '50%',
                                                        background: `linear-gradient(145deg, ${item.color}, ${alpha(item.color, 0.8)})`,
                                                        color: 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '1.2rem',
                                                        mr: 2,
                                                        boxShadow: `0 4px 12px ${alpha(item.color, 0.3)}`,
                                                    }}
                                                >
                                                    {item.step}
                                                </Box>
                                                <Box>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: '0.9rem' }}>
                                                        {item.title}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                                        {item.desc}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        ))}
                                        
                                        {/* Connecting Line */}
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                left: 19,
                                                top: 50,
                                                bottom: 60,
                                                width: 2,
                                                background: 'linear-gradient(180deg, #25D3B3, #4D9FFF, #FFB961, #A97CFF)',
                                                opacity: 0.3,
                                                borderRadius: 1,
                                            }}
                                        />
                                    </Box>
                                </Box>
                            </Grid>

                            {/* AI Assistant Widget - Real chat styling */}
                            <Grid item xs={12} md={6}>
                                <Box
                                    sx={{
                                        p: 4,
                                        borderRadius: 3,
                                        border: '2px solid #FFF3E0',
                                        background: 'linear-gradient(135deg, #FFF8EC 0%, #FFE2BC 100%)',
                                        height: 350,
                                    }}
                                >
                                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#E65100' }}>
                                        🤖 AI Project Assistant
                                    </Typography>
                                    
                                    {/* Chat Messages */}
                                    <Stack spacing={2} sx={{ mb: 3, maxHeight: 220, overflow: 'hidden' }}>
                                        {/* User Message */}
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <Box sx={{
                                                maxWidth: '80%',
                                                p: 2,
                                                bgcolor: '#E3F2FD',
                                                borderRadius: '18px 18px 4px 18px',
                                                fontSize: '0.85rem'
                                            }}>
                                                "Can you help me optimize this project timeline?"
                                            </Box>
                                        </Box>
                                        
                                        {/* AI Response */}
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                            <Box
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(145deg, #FF6B6B, #4ECDC4)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontSize: '1rem',
                                                    flexShrink: 0,
                                                }}
                                            >
                                                🤖
                                            </Box>
                                            <Box sx={{
                                                maxWidth: '80%',
                                                p: 2,
                                                bgcolor: 'white',
                                                borderRadius: '4px 18px 18px 18px',
                                                fontSize: '0.85rem',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                            }}>
                                                "I've analyzed your project and can reduce the timeline by 15% by optimizing task dependencies. Here's what I suggest:
                                                <br/>• Parallel execution of UI/API work
                                                <br/>• Early testing integration 
                                                <br/>• Resource reallocation"
                                            </Box>
                                        </Box>
                                        
                                        {/* Typing Indicator */}
                                        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
                                            <Box
                                                sx={{
                                                    width: 32,
                                                    height: 32,
                                                    borderRadius: '50%',
                                                    background: 'linear-gradient(145deg, #FF6B6B, #4ECDC4)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontSize: '1rem',
                                                }}
                                            >
                                                🤖
                                            </Box>
                                            <Box sx={{
                                                p: 2,
                                                bgcolor: 'white',
                                                borderRadius: '4px 18px 18px 18px',
                                                fontSize: '0.85rem',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 0.5,
                                            }}>
                                                <Box sx={{ fontSize: '0.7rem', color: 'grey.500' }}>AI is thinking</Box>
                                                {[0, 1, 2].map((i) => (
                                                    <Box
                                                        key={i}
                                                        sx={{
                                                            width: 4,
                                                            height: 4,
                                                            borderRadius: '50%',
                                                            bgcolor: 'grey.400',
                                                            animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite both`,
                                                            '@keyframes bounce': {
                                                                '0%, 80%, 100%': { transform: 'scale(0)' },
                                                                '40%': { transform: 'scale(1)' },
                                                            },
                                                        }}
                                                    />
                                                ))}
                                            </Box>
                                        </Box>
                                    </Stack>
                                </Box>
                            </Grid>
                        </Grid>

                        {/* Team Collaboration & Project Management */}
                        <Box
                            sx={{
                                p: 4,
                                borderRadius: 3,
                                border: '2px solid #E1F5FE',
                                background: 'linear-gradient(135deg, #E1F5FE 0%, #F8F9FA 100%)',
                                textAlign: 'center',
                                mb: 6,
                            }}
                        >
                            <Typography variant="h6" sx={{ mb: 4, fontWeight: 600, color: '#0277BD' }}>
                                👥 Project Management Dashboard
                            </Typography>
                            
                            <Grid container spacing={4}>
                                {/* Project Overview */}
                                <Grid item xs={12} md={4}>
                                    <Box sx={{ p: 3, bgcolor: 'white', borderRadius: 2, height: 200 }}>
                                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#0277BD' }}>
                                            Project Overview
                                        </Typography>
                                        
                                        {/* Project Card */}
                                        <Box sx={{
                                            p: 2,
                                            border: '2px solid #E3F2FD',
                                            borderRadius: 2,
                                            borderLeft: '4px solid #FF6B6B',
                                            mb: 2,
                                        }}>
                                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                                                E-Commerce Platform
                                            </Typography>
                                            <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                                <Chip label="Web App" size="small" sx={{ fontSize: '0.7rem', height: 20 }} />
                                                <Chip label="React" size="small" sx={{ fontSize: '0.7rem', height: 20 }} />
                                            </Box>
                                            <Box sx={{ 
                                                width: '100%', 
                                                height: 6, 
                                                bgcolor: '#E0E0E0', 
                                                borderRadius: 3,
                                                overflow: 'hidden'
                                            }}>
                                                <Box sx={{ 
                                                    width: '75%', 
                                                    height: '100%', 
                                                    bgcolor: '#4CAF50',
                                                    transition: 'width 0.3s ease'
                                                }} />
                                            </Box>
                                            <Typography variant="caption" sx={{ color: 'grey.600', fontSize: '0.7rem' }}>
                                                75% Complete
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Grid>
                                
                                {/* Team Members */}
                                <Grid item xs={12} md={4}>
                                    <Box sx={{ p: 3, bgcolor: 'white', borderRadius: 2, height: 200 }}>
                                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#0277BD' }}>
                                            Team Members
                                        </Typography>
                                        
                                        <Stack spacing={1.5}>
                                            {[
                                                { name: 'Alex Chen', role: 'Lead Dev', color: '#FF6B6B', workload: 85 },
                                                { name: 'Sam Rodriguez', role: 'Designer', color: '#4ECDC4', workload: 70 },
                                                { name: 'Jordan Kim', role: 'QA Engineer', color: '#45B7D1', workload: 60 },
                                            ].map((member, i) => (
                                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                    <Avatar
                                                        sx={{
                                                            bgcolor: member.color,
                                                            width: 32,
                                                            height: 32,
                                                            fontSize: '0.875rem',
                                                        }}
                                                    >
                                                        {member.name.split(' ').map(n => n[0]).join('')}
                                                    </Avatar>
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: '0.8rem' }}>
                                                            {member.name}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                            {member.role} • {member.workload}% capacity
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            ))}
                                        </Stack>
                                    </Box>
                                </Grid>
                                
                                {/* Recent Activity */}
                                <Grid item xs={12} md={4}>
                                    <Box sx={{ p: 3, bgcolor: 'white', borderRadius: 2, height: 200 }}>
                                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 600, color: '#0277BD' }}>
                                            Recent Activity
                                        </Typography>
                                        
                                        <Stack spacing={1.5}>
                                            {[
                                                { action: 'Task completed', user: 'Alex', time: '2 min ago', color: '#4CAF50' },
                                                { action: 'Comment added', user: 'Sam', time: '5 min ago', color: '#2196F3' },
                                                { action: 'Priority updated', user: 'Jordan', time: '12 min ago', color: '#FF9800' },
                                                { action: 'New milestone', user: 'Alex', time: '1 hour ago', color: '#9C27B0' },
                                            ].map((activity, i) => (
                                                <Box key={i} sx={{ display: 'flex', alignItems: 'center', fontSize: '0.8rem' }}>
                                                    <Box sx={{ 
                                                        width: 6, 
                                                        height: 6, 
                                                        borderRadius: '50%', 
                                                        bgcolor: activity.color, 
                                                        mr: 1.5,
                                                        flexShrink: 0
                                                    }} />
                                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                                                            <strong>{activity.user}</strong> {activity.action}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.7rem' }}>
                                                            {activity.time}
                                                        </Typography>
                                                    </Box>
                                                </Box>
                                            ))}
                                        </Stack>
                                    </Box>
                                </Grid>
                            </Grid>
                        </Box>
                    </Container>
                </Box>

                {/* Features Section */}
                <Box sx={{ py: { xs: 8, md: 12 }, bgcolor: '#FAFBFC' }}>
                    <Container maxWidth="lg">
                        <Box sx={{ textAlign: 'center', mb: 10 }}>
                            <Typography
                                variant="h2"
                                sx={{
                                    fontSize: { xs: '2rem', md: '3rem' },
                                    fontWeight: 700,
                                    mb: 3,
                                    color: '#1a1a1a',
                                }}
                            >
                                Everything your team is looking for
                            </Typography>
                            <Typography
                                variant="h6"
                                sx={{
                                    color: 'grey.700',
                                    fontWeight: 400,
                                    maxWidth: 600,
                                    mx: 'auto',
                                }}
                            >
                                TaskPilot's exceptional flexibility can handle any type of work. And
                                we never stop innovating.
                            </Typography>
                        </Box>

                        <Grid container spacing={6}>
                            {features.map((feature, index) => (
                                <Grid item xs={12} md={6} lg={4} key={index}>
                                    <Box
                                        sx={{
                                            textAlign: 'center',
                                            mb: 6,
                                            p: 4,
                                            borderRadius: 4,
                                            background: `linear-gradient(135deg, ${alpha(feature.color, 0.05)} 0%, ${alpha(feature.color, 0.02)} 100%)`,
                                            border: `1px solid ${alpha(feature.color, 0.1)}`,
                                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                                            '&:hover': {
                                                transform: 'translateY(-12px) scale(1.02)',
                                                boxShadow: `0 20px 40px ${alpha(feature.color, 0.2)}`,
                                                border: `1px solid ${alpha(feature.color, 0.3)}`,
                                                background: `linear-gradient(135deg, ${alpha(feature.color, 0.1)} 0%, ${alpha(feature.color, 0.05)} 100%)`,
                                            },
                                        }}
                                    >
                                        <Box
                                            sx={{
                                                mb: 3,
                                                p: 2,
                                                borderRadius: '50%',
                                                background: `linear-gradient(135deg, ${alpha(feature.color, 0.1)} 0%, ${alpha(feature.color, 0.05)} 100%)`,
                                                display: 'inline-block',
                                                transition: 'all 0.3s ease',
                                                '&:hover': {
                                                    transform: 'rotate(10deg) scale(1.1)',
                                                    background: `linear-gradient(135deg, ${alpha(feature.color, 0.2)} 0%, ${alpha(feature.color, 0.1)} 100%)`,
                                                },
                                            }}
                                        >
                                            {feature.icon}
                                        </Box>
                                        <Typography
                                            variant="h5"
                                            sx={{
                                                fontWeight: 600,
                                                mb: 2,
                                                color: '#1a1a1a',
                                            }}
                                        >
                                            {feature.title}
                                        </Typography>
                                        <Typography
                                            variant="body1"
                                            sx={{
                                                color: 'grey.700',
                                                lineHeight: 1.6,
                                                maxWidth: 300,
                                                mx: 'auto',
                                            }}
                                        >
                                            {feature.description}
                                        </Typography>
                                    </Box>
                                </Grid>
                            ))}
                        </Grid>
                    </Container>
                </Box>

                {/* Login Section */}
                <Box id="login-form" sx={{ py: { xs: 8, md: 12 }, bgcolor: '#FAFBFC' }}>
                    <Container maxWidth="sm">
                        <Paper
                            elevation={0}
                            sx={{
                                p: { xs: 4, sm: 6 },
                                borderRadius: 3,
                                border: '1px solid',
                                borderColor: 'grey.200',
                                bgcolor: 'white',
                            }}
                        >
                            <Box sx={{ textAlign: 'center', mb: 4 }}>
                                <Typography
                                    variant="h4"
                                    sx={{ fontWeight: 700, mb: 1, color: '#1a1a1a' }}
                                >
                                    Welcome back
                                </Typography>
                                <Typography variant="body1" color="grey.600">
                                    Sign in to continue to your workspace
                                </Typography>
                            </Box>

                            <Stack spacing={3} sx={{ mb: 4 }}>
                                <Button
                                    variant="outlined"
                                    size="large"
                                    href="/auth/google"
                                    startIcon={<GoogleIcon />}
                                    fullWidth
                                    sx={{
                                        py: 1.5,
                                        fontSize: '1rem',
                                        fontWeight: 500,
                                        textTransform: 'none',
                                        borderColor: 'grey.300',
                                        color: 'grey.700',
                                        '&:hover': {
                                            borderColor: 'grey.400',
                                            bgcolor: 'grey.50',
                                        },
                                    }}
                                >
                                    Continue with Google
                                </Button>

                                <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
                                    <Divider sx={{ flex: 1 }} />
                                    <Typography variant="body2" sx={{ px: 2, color: 'grey.500' }}>
                                        OR
                                    </Typography>
                                    <Divider sx={{ flex: 1 }} />
                                </Box>
                            </Stack>

                            <form onSubmit={submit}>
                                <Stack spacing={3}>
                                    <TextField
                                        label="Email"
                                        type="email"
                                        name="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        error={Boolean(errors.email)}
                                        helperText={errors.email}
                                        required
                                        fullWidth
                                        variant="outlined"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                                '& fieldset': {
                                                    borderColor: 'grey.300',
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: '#7C6AE8',
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#7C6AE8',
                                                },
                                            },
                                        }}
                                    />

                                    <TextField
                                        label="Password"
                                        type="password"
                                        name="password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        error={Boolean(errors.password)}
                                        helperText={errors.password}
                                        required
                                        fullWidth
                                        variant="outlined"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                                '& fieldset': {
                                                    borderColor: 'grey.300',
                                                },
                                                '&:hover fieldset': {
                                                    borderColor: '#7C6AE8',
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: '#7C6AE8',
                                                },
                                            },
                                        }}
                                    />

                                    <Button
                                        type="submit"
                                        variant="contained"
                                        size="large"
                                        disabled={processing}
                                        fullWidth
                                        sx={{
                                            py: 1.5,
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            borderRadius: 2,
                                            textTransform: 'none',
                                            background:
                                                'linear-gradient(135deg, #4ECDC4 0%, #45B7D1 100%)',
                                            boxShadow: '0 4px 15px rgba(78, 205, 196, 0.3)',
                                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                            '&:hover': {
                                                background:
                                                    'linear-gradient(135deg, #45B7D1 0%, #4ECDC4 100%)',
                                                transform: 'translateY(-2px)',
                                                boxShadow: '0 8px 25px rgba(78, 205, 196, 0.4)',
                                            },
                                            '&:disabled': {
                                                background:
                                                    'linear-gradient(135deg, #ccc 0%, #999 100%)',
                                                color: 'white',
                                            },
                                        }}
                                    >
                                        {processing ? 'Signing In...' : 'Log In'}
                                    </Button>

                                    <Box sx={{ textAlign: 'center' }}>
                                        <Link
                                            href={route('password.request')}
                                            underline="hover"
                                            sx={{
                                                fontSize: 14,
                                                color: '#7C6AE8',
                                                '&:hover': { color: '#6B5CE6' },
                                            }}
                                        >
                                            Forgot your password?
                                        </Link>
                                    </Box>

                                    <Typography
                                        variant="body2"
                                        color="grey.600"
                                        sx={{ textAlign: 'center' }}
                                    >
                                        Don't have an account?{' '}
                                        <Link
                                            href={route('register')}
                                            underline="hover"
                                            sx={{
                                                fontWeight: 600,
                                                color: '#7C6AE8',
                                                '&:hover': { color: '#6B5CE6' },
                                            }}
                                        >
                                            Sign up now
                                        </Link>
                                    </Typography>
                                </Stack>
                            </form>
                        </Paper>
                    </Container>
                </Box>

                {/* Footer */}
                <Box
                    sx={{
                        py: 6,
                        bgcolor: 'white',
                        borderTop: '1px solid',
                        borderColor: 'grey.200',
                    }}
                >
                    <Container maxWidth="lg">
                        <Box
                            sx={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                flexWrap: 'wrap',
                                gap: 2,
                            }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                <Typography
                                    variant="h6"
                                    sx={{ fontWeight: 700, color: '#7C6AE8', mr: 2 }}
                                >
                                    TaskPilot
                                </Typography>
                                <Typography variant="body2" color="grey.600">
                                    The everything app, for work.
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                <Link
                                    href="#"
                                    sx={{
                                        color: 'grey.600',
                                        textDecoration: 'none',
                                        '&:hover': { color: '#7C6AE8' },
                                    }}
                                >
                                    Security
                                </Link>
                                <Link
                                    href="#"
                                    sx={{
                                        color: 'grey.600',
                                        textDecoration: 'none',
                                        '&:hover': { color: '#7C6AE8' },
                                    }}
                                >
                                    Privacy
                                </Link>
                                <Link
                                    href="#"
                                    sx={{
                                        color: 'grey.600',
                                        textDecoration: 'none',
                                        '&:hover': { color: '#7C6AE8' },
                                    }}
                                >
                                    Terms
                                </Link>
                            </Box>
                        </Box>

                        <Typography
                            variant="body2"
                            color="grey.500"
                            sx={{ textAlign: 'center', mt: 4 }}
                        >
                            © 2025 TaskPilot
                        </Typography>
                    </Container>
                </Box>
            </Box>

            {/* Floating Action Button */}
            <Box
                sx={{
                    position: 'fixed',
                    bottom: 30,
                    right: 30,
                    zIndex: 1000,
                }}
            >
                <Button
                    variant="contained"
                    href={route('register')}
                    sx={{
                        background:
                            'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)',
                        backgroundSize: '200% 200%',
                        animation: 'gradientShift 3s ease infinite',
                        borderRadius: '50px',
                        px: 4,
                        py: 2,
                        fontSize: '1rem',
                        fontWeight: 600,
                        textTransform: 'none',
                        boxShadow: '0 8px 25px rgba(255, 107, 107, 0.4)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        '&:hover': {
                            transform: 'translateY(-3px) scale(1.05)',
                            boxShadow: '0 15px 35px rgba(255, 107, 107, 0.5)',
                            animation: 'bounce 1s ease infinite',
                        },
                    }}
                >
                    🚀 Get Started
                </Button>
            </Box>

            <style jsx global>{`
                html {
                    scroll-behavior: smooth;
                }
                body {
                    font-family:
                        -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu',
                        'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
                }
            `}</style>
        </>
    );
}
