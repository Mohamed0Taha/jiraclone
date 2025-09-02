import React, { useEffect } from 'react';
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

    // Initialize analytics tracking
    useEffect(() => {
        // Load analytics script dynamically
        const loadAnalytics = async () => {
            try {
                const { default: TaskPilotAnalytics } = await import('../utils/Analytics.js');
                // Analytics will initialize automatically
            } catch (error) {
                console.debug('Analytics loading failed:', error);
            }
        };

        // Only load analytics if not a bot and in browser environment
        if (typeof window !== 'undefined' && 
            !navigator.userAgent.match(/bot|crawler|spider|crawling/i)) {
            loadAnalytics();
        }
    }, []);

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
            <Head title="TaskPilot - #1 AI-Powered Project Management Software | Team Task Management Platform">
                <meta
                    name="description"
                    content="TaskPilot is the leading AI-powered project management platform trusted by 50,000+ teams worldwide. Streamline task management, boost productivity by 40%, and collaborate effectively with intelligent automation. Start your free trial today!"
                />
                <meta
                    name="keywords"
                    content="TaskPilot, project management software, AI project management, task management platform, team collaboration tool, productivity software, project tracking, workflow automation, agile project management, scrum software, kanban board, team productivity, project planning tool, task organizer, project dashboard, milestone tracking, resource management, time tracking software, project analytics, team communication, project reporting, deadline management, project coordination, work management platform, business productivity, startup project management, remote work tools, distributed teams, project oversight, task automation, workflow management, team efficiency, project monitoring, task prioritization, project control, team synchronization, project optimization, collaboration software, management tool, business tool, enterprise solution, project success, team performance, project delivery, task completion, project goals, team objectives, project metrics, productivity metrics, business intelligence, project insights, team insights, collaborative workspace, digital workplace, project ecosystem, productivity platform, management platform, collaboration platform, business platform, work platform, team platform, project technology, productivity technology, taskpilot.us, task pilot, project manager, team management, work organization"
                />
                
                {/* Open Graph / Facebook */}
                <meta property="og:type" content="website" />
                <meta property="og:url" content="https://taskpilot.us/" />
                <meta
                    property="og:title"
                    content="TaskPilot - #1 AI-Powered Project Management Software | Boost Team Productivity by 40%"
                />
                <meta
                    property="og:description"
                    content="TaskPilot is the leading AI-powered project management platform trusted by 50,000+ teams worldwide. Streamline task management, boost productivity, and collaborate effectively with intelligent automation."
                />
                <meta property="og:site_name" content="TaskPilot" />
                <meta property="og:locale" content="en_US" />
                <meta property="og:image" content="https://taskpilot.us/images/taskpilot-social-preview.jpg" />
                <meta property="og:image:width" content="1200" />
                <meta property="og:image:height" content="630" />
                <meta property="og:image:alt" content="TaskPilot - AI-Powered Project Management Dashboard" />
                
                {/* Twitter Card */}
                <meta name="twitter:card" content="summary_large_image" />
                <meta name="twitter:url" content="https://taskpilot.us/" />
                <meta
                    name="twitter:title"
                    content="TaskPilot - #1 AI-Powered Project Management Software"
                />
                <meta
                    name="twitter:description"
                    content="Trusted by 50,000+ teams worldwide. Boost productivity by 40% with AI-powered task management and intelligent automation. Start free trial!"
                />
                <meta name="twitter:image" content="https://taskpilot.us/images/taskpilot-twitter-card.jpg" />
                <meta name="twitter:creator" content="@TaskPilotApp" />
                <meta name="twitter:site" content="@TaskPilotApp" />
                
                {/* Additional SEO Meta Tags */}
                <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
                <meta name="googlebot" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
                <meta name="author" content="TaskPilot Team" />
                <meta name="publisher" content="TaskPilot Inc." />
                <meta name="application-name" content="TaskPilot" />
                <meta name="apple-mobile-web-app-title" content="TaskPilot" />
                <meta name="theme-color" content="#3B82F6" />
                <meta name="msapplication-TileColor" content="#3B82F6" />
                <meta name="format-detection" content="telephone=no" />
                <meta name="mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                
                {/* Language and Geographic */}
                <meta name="language" content="English" />
                <meta name="geo.region" content="US" />
                <meta name="geo.placename" content="United States" />
                
                {/* Canonical URL */}
                <link rel="canonical" href="https://taskpilot.us/" />
                
                {/* Preconnect for Performance */}
                <link rel="preconnect" href="https://fonts.googleapis.com" />
                <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
                
                {/* JSON-LD Structured Data - SoftwareApplication */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "SoftwareApplication",
                        "name": "TaskPilot",
                        "alternateName": ["Task Pilot", "TaskPilot Project Management", "TaskPilot AI"],
                        "description": "TaskPilot is the leading AI-powered project management platform trusted by 50,000+ teams worldwide. Streamline task management, boost productivity by 40%, and collaborate effectively with intelligent automation.",
                        "url": "https://taskpilot.us",
                        "applicationCategory": "BusinessApplication",
                        "operatingSystem": "Web Browser, iOS, Android, Windows, macOS, Linux",
                        "softwareVersion": "2.0",
                        "datePublished": "2024-01-01",
                        "dateModified": new Date().toISOString().split('T')[0],
                        "author": {
                            "@type": "Organization",
                            "name": "TaskPilot Inc."
                        },
                        "publisher": {
                            "@type": "Organization",
                            "name": "TaskPilot Inc.",
                            "url": "https://taskpilot.us",
                            "logo": {
                                "@type": "ImageObject",
                                "url": "https://taskpilot.us/favicon.svg",
                                "width": 256,
                                "height": 256
                            }
                        },
                        "offers": {
                            "@type": "Offer",
                            "price": "0",
                            "priceCurrency": "USD",
                            "description": "Free trial with premium plans starting at $9/month",
                            "availability": "https://schema.org/InStock",
                            "priceValidUntil": "2025-12-31"
                        },
                        "aggregateRating": {
                            "@type": "AggregateRating",
                            "ratingValue": "4.9",
                            "ratingCount": "2847",
                            "bestRating": "5",
                            "worstRating": "1"
                        },
                        "review": [
                            {
                                "@type": "Review",
                                "author": {
                                    "@type": "Person",
                                    "name": "Sarah Johnson"
                                },
                                "reviewRating": {
                                    "@type": "Rating",
                                    "ratingValue": "5"
                                },
                                "reviewBody": "TaskPilot transformed our team's productivity. The AI features are game-changing!"
                            }
                        ],
                        "featureList": [
                            "AI-powered task automation",
                            "Real-time team collaboration",
                            "Advanced project analytics",
                            "Intelligent resource management",
                            "Custom workflow automation",
                            "Integration with 100+ tools"
                        ],
                        "screenshot": "https://taskpilot.us/images/dashboard-screenshot.jpg",
                        "downloadUrl": "https://taskpilot.us/download",
                        "installUrl": "https://taskpilot.us/register",
                        "sameAs": [
                            "https://twitter.com/TaskPilotApp",
                            "https://www.linkedin.com/company/taskpilot",
                            "https://facebook.com/TaskPilotApp",
                            "https://instagram.com/taskpilotapp"
                        ]
                    })}
                </script>
                
                {/* JSON-LD Structured Data - Organization */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "Organization",
                        "name": "TaskPilot Inc.",
                        "alternateName": "TaskPilot",
                        "url": "https://taskpilot.us",
                        "logo": "https://taskpilot.us/favicon.svg",
                        "description": "TaskPilot Inc. develops the leading AI-powered project management platform trusted by teams worldwide to streamline workflows and boost productivity.",
                        "foundingDate": "2024",
                        "numberOfEmployees": "51-100",
                        "address": {
                            "@type": "PostalAddress",
                            "addressCountry": "US",
                            "addressRegion": "CA"
                        },
                        "contactPoint": [
                            {
                                "@type": "ContactPoint",
                                "contactType": "customer service",
                                "url": "https://taskpilot.us/support",
                                "availableLanguage": "English"
                            },
                            {
                                "@type": "ContactPoint",
                                "contactType": "sales",
                                "url": "https://taskpilot.us/sales",
                                "availableLanguage": "English"
                            }
                        ],
                        "sameAs": [
                            "https://twitter.com/TaskPilotApp",
                            "https://www.linkedin.com/company/taskpilot",
                            "https://facebook.com/TaskPilotApp",
                            "https://instagram.com/taskpilotapp"
                        ]
                    })}
                </script>
                
                {/* JSON-LD Structured Data - WebSite */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "WebSite",
                        "name": "TaskPilot",
                        "alternateName": "TaskPilot Project Management",
                        "url": "https://taskpilot.us",
                        "description": "The leading AI-powered project management platform for teams",
                        "inLanguage": "en-US",
                        "potentialAction": {
                            "@type": "SearchAction",
                            "target": {
                                "@type": "EntryPoint",
                                "urlTemplate": "https://taskpilot.us/search?q={search_term_string}"
                            },
                            "query-input": "required name=search_term_string"
                        },
                        "publisher": {
                            "@type": "Organization",
                            "name": "TaskPilot Inc."
                        }
                    })}
                </script>
                
                {/* JSON-LD Structured Data - BreadcrumbList */}
                <script type="application/ld+json">
                    {JSON.stringify({
                        "@context": "https://schema.org",
                        "@type": "BreadcrumbList",
                        "itemListElement": [
                            {
                                "@type": "ListItem",
                                "position": 1,
                                "name": "Home",
                                "item": "https://taskpilot.us"
                            }
                        ]
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
                                #1 AI-Powered Project Management Platform{' '}
                                <Box component="span" sx={{ color: '#3B82F6' }}>
                                    Trusted by 50,000+ Teams
                                </Box>
                            </Typography>

                            <Typography
                                variant="h5"
                                sx={{
                                    mb: 6,
                                    color: 'grey.700',
                                    fontWeight: 400,
                                    maxWidth: 700,
                                    mx: 'auto',
                                    lineHeight: 1.4,
                                }}
                            >
                                TaskPilot streamlines task management and boosts team productivity by 40% with intelligent automation. 
                                Join thousands of successful teams using our project management software to collaborate effectively 
                                and deliver projects on time, every time.
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
