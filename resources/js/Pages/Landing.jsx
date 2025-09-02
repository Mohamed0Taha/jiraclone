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

                        {/* Task Board Widget */}
                        <Grid container spacing={6} sx={{ mb: 8 }}>
                            <Grid item xs={12} md={6}>
                                <Box
                                    sx={{
                                        p: 4,
                                        borderRadius: 3,
                                        border: '2px solid #E3F2FD',
                                        background: 'linear-gradient(135deg, #E3F2FD 0%, #F8F9FA 100%)',
                                        height: 350,
                                        position: 'relative',
                                        overflow: 'hidden',
                                    }}
                                >
                                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#1976D2' }}>
                                        📋 Kanban Board
                                    </Typography>
                                    
                                    {/* Mock Kanban Columns */}
                                    <Grid container spacing={2}>
                                        <Grid item xs={4}>
                                            <Box sx={{ p: 2, bgcolor: '#FFF3E0', borderRadius: 2, minHeight: 200 }}>
                                                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: '#E65100' }}>
                                                    To Do
                                                </Typography>
                                                <Box sx={{ mb: 2, p: 1.5, bgcolor: 'white', borderRadius: 1, fontSize: '0.75rem' }}>
                                                    Create user stories
                                                </Box>
                                                <Box sx={{ mb: 2, p: 1.5, bgcolor: 'white', borderRadius: 1, fontSize: '0.75rem' }}>
                                                    Design wireframes
                                                </Box>
                                                <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, fontSize: '0.75rem' }}>
                                                    Setup database
                                                </Box>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Box sx={{ p: 2, bgcolor: '#FFF9C4', borderRadius: 2, minHeight: 200 }}>
                                                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: '#F57F17' }}>
                                                    In Progress
                                                </Typography>
                                                <Box sx={{ mb: 2, p: 1.5, bgcolor: 'white', borderRadius: 1, fontSize: '0.75rem' }}>
                                                    Build API endpoints
                                                </Box>
                                                <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, fontSize: '0.75rem' }}>
                                                    Frontend components
                                                </Box>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={4}>
                                            <Box sx={{ p: 2, bgcolor: '#E8F5E8', borderRadius: 2, minHeight: 200 }}>
                                                <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600, color: '#2E7D32' }}>
                                                    Done
                                                </Typography>
                                                <Box sx={{ mb: 2, p: 1.5, bgcolor: 'white', borderRadius: 1, fontSize: '0.75rem' }}>
                                                    Project setup ✓
                                                </Box>
                                                <Box sx={{ p: 1.5, bgcolor: 'white', borderRadius: 1, fontSize: '0.75rem' }}>
                                                    Team onboarding ✓
                                                </Box>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Box>
                            </Grid>
                            
                            <Grid item xs={12} md={6}>
                                <Box
                                    sx={{
                                        p: 4,
                                        borderRadius: 3,
                                        border: '2px solid #F3E5F5',
                                        background: 'linear-gradient(135deg, #F3E5F5 0%, #F8F9FA 100%)',
                                        height: 350,
                                    }}
                                >
                                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#7B1FA2' }}>
                                        📊 Analytics Dashboard
                                    </Typography>
                                    
                                    {/* Mock Chart */}
                                    <Box sx={{ mb: 3, p: 2, bgcolor: 'white', borderRadius: 2, height: 120 }}>
                                        <Box sx={{ display: 'flex', alignItems: 'end', height: '100%', gap: 1 }}>
                                            {[40, 65, 45, 80, 55, 70, 85].map((height, i) => (
                                                <Box
                                                    key={i}
                                                    sx={{
                                                        flex: 1,
                                                        height: `${height}%`,
                                                        bgcolor: '#7B1FA2',
                                                        borderRadius: '2px 2px 0 0',
                                                        opacity: 0.8,
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                    
                                    {/* Stats Grid */}
                                    <Grid container spacing={2}>
                                        <Grid item xs={6}>
                                            <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, textAlign: 'center' }}>
                                                <Typography variant="h6" sx={{ color: '#7B1FA2', fontWeight: 600 }}>
                                                    85%
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Completion Rate
                                                </Typography>
                                            </Box>
                                        </Grid>
                                        <Grid item xs={6}>
                                            <Box sx={{ p: 2, bgcolor: 'white', borderRadius: 2, textAlign: 'center' }}>
                                                <Typography variant="h6" sx={{ color: '#7B1FA2', fontWeight: 600 }}>
                                                    24
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    Active Tasks
                                                </Typography>
                                            </Box>
                                        </Grid>
                                    </Grid>
                                </Box>
                            </Grid>
                        </Grid>

                        {/* Workflow Widget */}
                        <Grid container spacing={6} sx={{ mb: 8 }}>
                            <Grid item xs={12} md={6}>
                                <Box
                                    sx={{
                                        p: 4,
                                        borderRadius: 3,
                                        border: '2px solid #E8F5E8',
                                        background: 'linear-gradient(135deg, #E8F5E8 0%, #F8F9FA 100%)',
                                        height: 350,
                                    }}
                                >
                                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#2E7D32' }}>
                                        🔄 Workflow Automation
                                    </Typography>
                                    
                                    {/* Workflow Steps */}
                                    <Box sx={{ position: 'relative' }}>
                                        {[
                                            { step: 1, title: 'Task Created', desc: 'New task assigned' },
                                            { step: 2, title: 'Auto-Assign', desc: 'Based on workload' },
                                            { step: 3, title: 'Status Update', desc: 'Progress tracked' },
                                            { step: 4, title: 'Completion', desc: 'Auto-notification' },
                                        ].map((item, i) => (
                                            <Box key={i} sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                                                <Box
                                                    sx={{
                                                        width: 32,
                                                        height: 32,
                                                        borderRadius: '50%',
                                                        bgcolor: '#2E7D32',
                                                        color: 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '0.875rem',
                                                        fontWeight: 600,
                                                        mr: 2,
                                                    }}
                                                >
                                                    {item.step}
                                                </Box>
                                                <Box>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                        {item.title}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {item.desc}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        ))}
                                        
                                        {/* Connecting Line */}
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                left: 15,
                                                top: 40,
                                                bottom: 60,
                                                width: 2,
                                                bgcolor: '#2E7D32',
                                                opacity: 0.3,
                                            }}
                                        />
                                    </Box>
                                </Box>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Box
                                    sx={{
                                        p: 4,
                                        borderRadius: 3,
                                        border: '2px solid #FFF3E0',
                                        background: 'linear-gradient(135deg, #FFF3E0 0%, #F8F9FA 100%)',
                                        height: 350,
                                    }}
                                >
                                    <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#E65100' }}>
                                        👥 Team Collaboration
                                    </Typography>
                                    
                                    {/* Team Members */}
                                    <Box sx={{ mb: 3 }}>
                                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                                            Team Members
                                        </Typography>
                                        <Stack direction="row" spacing={1} sx={{ mb: 3 }}>
                                            {[
                                                { name: 'Alex', color: '#FF6B6B' },
                                                { name: 'Sam', color: '#4ECDC4' },
                                                { name: 'Jordan', color: '#45B7D1' },
                                                { name: 'Casey', color: '#96CEB4' },
                                            ].map((member, i) => (
                                                <Avatar
                                                    key={i}
                                                    sx={{
                                                        bgcolor: member.color,
                                                        width: 36,
                                                        height: 36,
                                                        fontSize: '0.875rem',
                                                    }}
                                                >
                                                    {member.name[0]}
                                                </Avatar>
                                            ))}
                                        </Stack>
                                    </Box>
                                    
                                    {/* Recent Activity */}
                                    <Box>
                                        <Typography variant="subtitle2" sx={{ mb: 2, fontWeight: 600 }}>
                                            Recent Activity
                                        </Typography>
                                        <Stack spacing={1.5}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem' }}>
                                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#FF6B6B', mr: 1 }} />
                                                Alex completed "User Authentication"
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem' }}>
                                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#4ECDC4', mr: 1 }} />
                                                Sam added new comment
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem' }}>
                                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#45B7D1', mr: 1 }} />
                                                Jordan updated task priority
                                            </Box>
                                            <Box sx={{ display: 'flex', alignItems: 'center', fontSize: '0.875rem' }}>
                                                <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: '#96CEB4', mr: 1 }} />
                                                Casey created milestone
                                            </Box>
                                        </Stack>
                                    </Box>
                                </Box>
                            </Grid>
                        </Grid>

                        {/* AI Assistant Widget */}
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
                            <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, color: '#0277BD' }}>
                                🤖 AI-Powered Assistant
                            </Typography>
                            
                            <Box
                                sx={{
                                    maxWidth: 600,
                                    mx: 'auto',
                                    p: 3,
                                    bgcolor: 'white',
                                    borderRadius: 2,
                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                                }}
                            >
                                <Typography variant="body2" sx={{ mb: 2, textAlign: 'left', color: 'grey.600' }}>
                                    💬 "Can you help me organize this project timeline?"
                                </Typography>
                                
                                <Divider sx={{ my: 2 }} />
                                
                                <Typography variant="body2" sx={{ textAlign: 'left', color: '#0277BD' }}>
                                    🤖 "I'll analyze your project requirements and create an optimized timeline with milestones. Here's what I suggest:
                                    <br />• Phase 1: Planning & Design (2 weeks)
                                    <br />• Phase 2: Development Sprint (4 weeks)  
                                    <br />• Phase 3: Testing & Deployment (1 week)
                                    <br />Would you like me to create tasks for each phase?"
                                </Typography>
                            </Box>
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
