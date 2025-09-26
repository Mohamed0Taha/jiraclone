import React from 'react';
import { Head, useForm, Link as InertiaLink } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
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
import ThemeToggle from '@/Components/ThemeToggle';
import LanguageDropdown from '@/Components/LanguageDropdown';
import { lighten, darken } from '@mui/material/styles';

export default function Landing({ errors, plans = [] }) {
    const theme = useTheme();
    const { t } = useTranslation();
    const isDark = theme.palette.mode === 'dark';
    const backgroundDefault = theme.palette.background.default;
    const backgroundPaper = theme.palette.background.paper;
    const textPrimary = theme.palette.text.primary;
    const textSecondary = theme.palette.text.secondary;
    const divider = theme.palette.divider;
    const primaryMain = theme.palette.primary.main;
    const primaryLight = theme.palette.primary.light || lighten(primaryMain, 0.2);
    const primaryDark = theme.palette.primary.dark || darken(primaryMain, 0.2);
    const primaryContrast = theme.palette.getContrastText
        ? theme.palette.getContrastText(primaryMain)
        : '#ffffff';
    const accentPrimary = primaryMain;

    // Video autoplay handling – try to start with sound; if blocked, fallback to muted
    const videoRef = React.useRef(null);
    const [muted, setMuted] = React.useState(false); // request sound first
    React.useEffect(() => {
        const v = videoRef.current;
        if (!v) return;
        v.muted = false;
        v.volume = 1.0;
        const attempt = v.play();
        if (attempt && attempt.catch) {
            attempt.catch(() => {
                // Browser blocked autoplay with sound – fallback to muted autoplay
                v.muted = true;
                setMuted(true);
                const retry = v.play();
                if (retry && retry.catch) retry.catch(() => { });
            });
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
            icon: <AutoAwesome sx={{ fontSize: 48, color: '#E53E3E' }} />,
            title: t('landing.features.aiProductivity.title'),
            description: t('landing.features.aiProductivity.description'),
            color: '#E53E3E',
        },
        {
            icon: <ViewModule sx={{ fontSize: 48, color: '#319795' }} />,
            title: t('landing.features.collaborate.title'),
            description: t('landing.features.collaborate.description'),
            color: '#319795',
        },
        {
            icon: <Settings sx={{ fontSize: 48, color: '#3182CE' }} />,
            title: t('landing.features.customize.title'),
            description: t('landing.features.customize.description'),
            color: '#3182CE',
        },
        {
            icon: <IntegrationInstructions sx={{ fontSize: 48, color: '#38A169' }} />,
            title: t('landing.features.integrate.title'),
            description: t('landing.features.integrate.description'),
            color: '#38A169',
        },
        {
            icon: <AutoFixHigh sx={{ fontSize: 48, color: '#D69E2E' }} />,
            title: t('landing.features.streamline.title'),
            description: t('landing.features.streamline.description'),
            color: '#D69E2E',
        },
        {
            icon: <Search sx={{ fontSize: 48, color: '#805AD5' }} />,
            title: t('landing.features.search.title'),
            description: t('landing.features.search.description'),
            color: '#805AD5',
        },
        {
            icon: <Home sx={{ fontSize: 48, color: '#2F855A' }} />,
            title: t('landing.features.stayAhead.title'),
            description: t('landing.features.stayAhead.description'),
            color: '#2F855A',
        },
    ];

    const methodologies = [
        { name: 'Agile', color: '#E53E3E' },
        { name: 'Scrum', color: '#319795' },
        { name: 'Kanban', color: '#3182CE' },
        { name: 'Waterfall', color: '#38A169' },
        { name: 'Lean', color: '#D69E2E' },
        { name: 'DevOps', color: '#805AD5' },
        { name: 'Hybrid', color: '#2F855A' },
        { name: 'SAFe', color: '#E53E3E' },
    ];

    const pricingPlans = React.useMemo(() => (Array.isArray(plans) ? plans : []), [plans]);
    const planAccentMap = React.useMemo(
        () => ({
            basic: '#2563eb',
            pro: '#7C3AED',
            business: '#F97316',
        }),
        []
    );

    const resolvePlanCta = (plan) => {
        if (plan?.key === 'business') {
            return { label: 'Talk to sales', href: '/contact' };
        }

        if (!plan || (plan.price ?? 0) === 0) {
            return { label: 'Start for free', href: route('register') };
        }

        return { label: `Upgrade to ${plan.name}`, href: route('register') };
    };

    return (
        <>
            <Head title={t('head.landing')}>
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
                        '@context': 'https://schema.org',
                        '@type': 'SoftwareApplication',
                        name: 'TaskPilot',
                        description:
                            'The modern project workspace where productivity meets simplicity. A single place for projects, tasks, chat, docs, and more.',
                        url: 'https://taskpilot.us',
                        applicationCategory: 'BusinessApplication',
                        operatingSystem: 'Web Browser',
                        offers: {
                            '@type': 'Offer',
                            price: '0',
                            priceCurrency: 'USD',
                            priceValidUntil: '2025-12-31',
                        },
                        aggregateRating: {
                            '@type': 'AggregateRating',
                            ratingValue: '4.8',
                            ratingCount: '1247',
                        },
                        publisher: {
                            '@type': 'Organization',
                            name: 'TaskPilot',
                            url: 'https://taskpilot.us',
                        },
                    })}
                </script>
            </Head>

            <Box sx={{ bgcolor: backgroundDefault, minHeight: '100vh' }}>
                {/* Header/Navigation */}
                <Box
                    sx={{
                        py: 2,
                        borderBottom: '1px solid',
                        borderColor: divider,
                        position: 'sticky',
                        top: 0,
                        bgcolor: backgroundPaper,
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
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                <Box
                                    component="img"
                                    src="/taskpilot-logo.png"
                                    alt="TaskPilot Logo"
                                    sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                    }}
                                />
                                <Typography variant="h5" sx={{ fontWeight: 700, color: primaryMain }}>
                                    TaskPilot
                                </Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                {/* Use the same Theme + Language controls as the app header */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <ThemeToggle />
                                    <LanguageDropdown />
                                </Box>

                                <Button
                                    variant="text"
                                    size="small"
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        color: accentPrimary,
                                        '&:hover': { color: isDark ? primaryLight : primaryDark },
                                    }}
                                    onClick={() => {
                                        const section = document.getElementById('pricing');
                                        if (section) {
                                            section.scrollIntoView({ behavior: 'smooth' });
                                        }
                                    }}
                                >
                                    Pricing
                                </Button>

                                <Button
                                    variant="outlined"
                                    size="small"
                                    sx={{
                                        textTransform: 'none',
                                        borderColor: accentPrimary,
                                        color: accentPrimary,
                                        borderWidth: 2,
                                        borderRadius: 2,
                                        px: 3,
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        '&:hover': {
                                            borderColor: primaryDark,
                                            bgcolor: accentPrimary,
                                            color: primaryContrast,
                                            transform: 'translateY(-2px)',
                                            boxShadow: `0 8px 20px ${alpha(primaryMain, 0.25)}`,
                                        },
                                    }}
                                    onClick={() => {
                                        document
                                            .getElementById('login-form')
                                            .scrollIntoView({ behavior: 'smooth' });
                                    }}
                                >
                                    {t('landing.loginButton')}
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
                                    {t('landing.signUpFree')}
                                </Button>
                            </Box>
                        </Box>
                    </Container>
                </Box>

                {/* Product Demo Video Section (moved to top) */}
                <Box
                    sx={{
                        pt: { xs: 4, md: 6 },
                        pb: { xs: 2, md: 4 },
                        bgcolor: isDark ? alpha(textPrimary, 0.08) : '#F8F9FA',
                    }}
                >
                    <Container maxWidth="lg">
                        <Box
                            sx={{
                                position: 'relative',
                                maxWidth: 960,
                                mx: 'auto',
                                borderRadius: 4,
                                overflow: 'hidden',
                                boxShadow: '0 25px 50px rgba(0, 0, 0, 0.15)',
                                background: 'linear-gradient(135deg, #FF6B6B, #4ECDC4)',
                                p: { xs: 1.5, sm: 2.5, md: 3 },
                                mb: 4,
                            }}
                        >
                            <Box sx={{ position: 'relative' }}>
                                <video
                                    ref={videoRef}
                                    controls
                                    autoPlay
                                    muted={muted}
                                    playsInline
                                    // loop
                                    style={{
                                        width: '100%',
                                        height: 'auto',
                                        borderRadius: '12px',
                                        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.2)',
                                    }}
                                >
                                    <source src="/videos/intro.mp4" type="video/mp4" />
                                    Your browser does not support the video tag.
                                </video>
                                {muted && (
                                    <Button
                                        variant="contained"
                                        size="small"
                                        onClick={() => {
                                            if (videoRef.current) {
                                                videoRef.current.muted = false;
                                                videoRef.current.volume = 1.0;
                                                const p = videoRef.current.play();
                                                if (p && p.catch) p.catch(() => { });
                                                setMuted(false);
                                            }
                                        }}
                                        sx={{
                                            position: 'absolute',
                                            bottom: 12,
                                            right: 12,
                                            textTransform: 'none',
                                            background: 'linear-gradient(135deg, #FF6B6B, #45B7D1)',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
                                            '&:hover': {
                                                background:
                                                    'linear-gradient(135deg, #45B7D1, #FF6B6B)',
                                            },
                                        }}
                                    >
                                        Unmute
                                    </Button>
                                )}
                            </Box>
                        </Box>
                    </Container>
                </Box>

                {/* Hero Section */}
                <Box sx={{ py: { xs: 6, md: 10 }, bgcolor: backgroundPaper }}>
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
                                    color: textPrimary,
                                    maxWidth: 900,
                                    mx: 'auto',
                                }}
                            >
                                {t('landing.heroTitle')}{' '}
                                <Box component="span" sx={{ color: primaryMain }}>
                                    {t('landing.heroSubtitle')}
                                </Box>
                            </Typography>

                            <Typography
                                variant="h5"
                                sx={{
                                    mb: 6,
                                    color: textSecondary,
                                    fontWeight: 400,
                                    maxWidth: 600,
                                    mx: 'auto',
                                    lineHeight: 1.4,
                                }}
                            >
                                {t('landing.heroDescription')}
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
                                    {t('landing.getStarted')}
                                </Button>
                            </Stack>

                            <Typography variant="body2" sx={{ color: textSecondary, fontWeight: 500 }}>
                                {t('landing.productivityJourney')}
                            </Typography>
                        </Box>

                        {/* Project Management Methodologies */}
                        <Box sx={{ textAlign: 'center', mb: 8 }}>
                            <Typography
                                variant="body2"
                                sx={{ mb: 4, color: textSecondary, fontWeight: 500 }}
                            >
                                {t('landing.methodologiesSupport')}
                            </Typography>

                            <Grid container spacing={3} justifyContent="center" alignItems="center">
                                {methodologies.map((methodology, index) => (
                                    <Grid size={{ xs: 6, sm: 4, md: 3 }} key={index}>
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

                {/* (Video section moved above) */}

                {/* Core Widgets Showcase */}
                <Box sx={{ py: { xs: 10, md: 14 }, bgcolor: backgroundPaper }}>
                    <Container maxWidth="xl">
                        <Box sx={{ textAlign: 'center', mb: 12 }}>
                            <Typography
                                variant="h2"
                                sx={{
                                    fontSize: { xs: '2.5rem', md: '3.5rem' },
                                    fontWeight: 700,
                                    mb: 4,
                                    color: textPrimary,
                                }}
                            >
                                Core Widgets & Features
                            </Typography>
                            <Typography
                                variant="h5"
                                sx={{
                                    color: textSecondary,
                                    fontWeight: 400,
                                    maxWidth: 700,
                                    mx: 'auto',
                                    mb: 10,
                                    lineHeight: 1.5,
                                }}
                            >
                                Powerful tools designed for modern teams that work the way you do
                            </Typography>
                        </Box>

                        {/* Real App Widgets Showcase */}
                        <Box
                            sx={{
                                mb: 10,
                                display: 'grid',
                                gap: { xs: 4, sm: 6 },
                                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, minmax(0,1fr))' },
                                alignItems: 'stretch',
                            }}
                        >
                            {/* Task Board Widget */}
                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        flex: 1,
                                        p: 3, // reduced from 4 to tighten outer padding
                                        borderRadius: 4,
                                        border: isDark
                                            ? `1px solid ${alpha(textPrimary, 0.18)}`
                                            : '1px solid #D9E8F7',
                                        background: isDark
                                            ? `linear-gradient(135deg, ${alpha(textPrimary, 0.16)} 0%, ${alpha(textPrimary, 0.08)} 100%)`
                                            : 'linear-gradient(135deg, #F7FAFF 0%, #F2F6FE 55%, #EDF2FA 100%)',
                                        position: 'relative',
                                        overflow: 'hidden',
                                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        '&:hover': {
                                            transform: 'translateY(-6px)',
                                            boxShadow: '0 10px 32px rgba(0, 0, 0, 0.12)',
                                        },
                                    }}
                                >
                                    <Typography
                                        variant="h5"
                                        sx={{
                                            mb: 4,
                                            fontWeight: 700,
                                            color: isDark ? primaryLight : '#4F46E5',
                                            fontSize: '1.3rem',
                                        }}
                                    >
                                        📋 Kanban Board
                                    </Typography>

                                    {/* Real Kanban Columns */}
                                    <Grid container spacing={3}>
                                        {[
                                            {
                                                key: 'todo',
                                                title: 'To Do',
                                                accent: '#FFA432',
                                                tasks: [
                                                    {
                                                        id: 1,
                                                        title: 'Create user stories',
                                                        priority: 'high',
                                                    },
                                                    {
                                                        id: 2,
                                                        title: 'Design wireframes',
                                                        priority: 'medium',
                                                    },
                                                ],
                                            },
                                            {
                                                key: 'inprogress',
                                                title: 'In Progress',
                                                accent: '#2C8DFF',
                                                tasks: [
                                                    {
                                                        id: 3,
                                                        title: 'Build API endpoints',
                                                        priority: 'urgent',
                                                    },
                                                ],
                                            },
                                            {
                                                key: 'done',
                                                title: 'Done',
                                                accent: '#22B36B',
                                                tasks: [
                                                    {
                                                        id: 4,
                                                        title: 'Project setup ✓',
                                                        priority: 'low',
                                                    },
                                                ],
                                            },
                                        ].map((column, colIndex) => (
                                            <Grid size={{ xs: 4 }} key={column.key}>
                                                <Box
                                                    sx={{
                                                        p: 2, // reduced from 3
                                                        borderRadius: 3,
                                                        background: isDark
                                                            ? `linear-gradient(135deg, ${alpha(textPrimary, 0.12)} 0%, ${alpha(textPrimary, 0.06)} 100%)`
                                                            : `linear-gradient(135deg, ${alpha(column.accent, 0.08)} 0%, ${alpha(column.accent, 0.04)} 100%)`,
                                                        border: isDark
                                                            ? `1px solid ${alpha(column.accent, 0.45)}`
                                                            : `1px solid ${alpha(column.accent, 0.18)}`,
                                                        minHeight: 350,
                                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                                                    }}
                                                >
                                                    {/* Column Header */}
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            mb: 2.5,
                                                            p: 1.5, // reduced from 2
                                                            borderRadius: 2,
                                                            background: isDark
                                                                ? alpha(textPrimary, 0.2)
                                                                : 'rgba(255,255,255,0.8)',
                                                            backdropFilter: 'blur(8px)',
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                width: 20,
                                                                height: 20,
                                                                borderRadius: '50%',
                                                                background: `linear-gradient(145deg, ${column.accent}, ${alpha(column.accent, 0.8)})`,
                                                                mr: 2,
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                color: 'white',
                                                                fontSize: '0.8rem',
                                                                fontWeight: 'bold',
                                                                boxShadow: `0 2px 8px ${alpha(column.accent, 0.3)}`,
                                                            }}
                                                        >
                                                            {column.tasks.length}
                                                        </Box>
                                                        <Typography
                                                            variant="subtitle1"
                                                            sx={{
                                                                fontWeight: 700,
                                                                color: isDark ? '#e2e8f0' : column.accent,
                                                                fontSize: '0.9rem',
                                                                textTransform: 'uppercase',
                                                                letterSpacing: 0.5,
                                                            }}
                                                        >
                                                            {column.title}
                                                        </Typography>
                                                    </Box>

                                                    {/* Task Cards */}
                                                    <Stack spacing={2}>
                                                        {column.tasks.map((task) => {
                                                            const priorityColorMap = {
                                                                urgent: '#d32f2f',
                                                                high: '#f57c00',
                                                                medium: '#1976d2',
                                                                low: '#388e3c',
                                                            };
                                                            const priorityColor =
                                                                priorityColorMap[task.priority] ?? column.accent;
                                                            const chipBg = alpha(priorityColor, isDark ? 0.28 : 0.12);

                                                            return (
                                                                <Box
                                                                    key={task.id}
                                                                    sx={{
                                                                        p: 2.5,
                                                                        bgcolor: isDark
                                                                            ? alpha(textPrimary, 0.08)
                                                                            : backgroundPaper,
                                                                        borderRadius: 3,
                                                                        borderLeft: `4px solid ${column.accent}`,
                                                                        boxShadow:
                                                                            '0 4px 12px rgba(0,0,0,0.08)',
                                                                        transition: 'all 0.2s ease',
                                                                        cursor: 'pointer',
                                                                        backdropFilter: 'blur(8px)',
                                                                        '&:hover': {
                                                                            transform: 'translateY(-3px)',
                                                                            boxShadow:
                                                                                '0 8px 20px rgba(0,0,0,0.12)',
                                                                        },
                                                                    }}
                                                                >
                                                                    <Typography
                                                                        variant="body1"
                                                                        sx={{
                                                                            fontWeight: 600,
                                                                            mb: 1.5,
                                                                            fontSize: '0.9rem',
                                                                            lineHeight: 1.4,
                                                                            color: textPrimary,
                                                                        }}
                                                                    >
                                                                        {task.title}
                                                                    </Typography>
                                                                    <Chip
                                                                        label={task.priority}
                                                                        size="small"
                                                                        sx={{
                                                                            fontSize: '0.75rem',
                                                                            height: 24,
                                                                            fontWeight: 600,
                                                                            bgcolor: chipBg,
                                                                            color: isDark ? '#f8fafc' : priorityColor,
                                                                        }}
                                                                    />
                                                                </Box>
                                                            );
                                                        })}
                                                    </Stack>
                                                </Box>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>
                            </Box>{' '}
                            {/* Close Task Board wrapper */}
                            {/* Removed stray Grid closing tag */}
                            {/* Project Analytics Widget */}
                            <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                                <Box
                                    sx={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        flex: 1,
                                        p: 4,
                                        borderRadius: 4,
                                        border: isDark
                                            ? `1px solid ${alpha(textPrimary, 0.18)}`
                                            : '1px solid #E5D5EF',
                                        background: isDark
                                            ? `linear-gradient(135deg, ${alpha(textPrimary, 0.16)} 0%, ${alpha(textPrimary, 0.1)} 100%)`
                                            : 'linear-gradient(135deg, #F9F3FF 0%, #E3D2FF 100%)',
                                        boxShadow: '0 4px 16px rgba(0, 0, 0, 0.06)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        '&:hover': {
                                            transform: 'translateY(-6px)',
                                            boxShadow: '0 10px 32px rgba(0, 0, 0, 0.12)',
                                        },
                                    }}
                                >
                                    <Typography
                                        variant="h5"
                                        sx={{
                                            mb: 4,
                                            fontWeight: 700,
                                            color: isDark ? primaryLight : '#7B1FA2',
                                            fontSize: '1.3rem',
                                        }}
                                    >
                                        📊 Project Analytics
                                    </Typography>
                                    {/* Stats Cards */}
                                    <Grid container spacing={3} sx={{ mb: 4 }}>
                                        {[
                                            {
                                                label: 'Total Tasks',
                                                value: '24',
                                                color: '#FF6B6B',
                                                icon: '📋',
                                            },
                                            {
                                                label: 'Completed',
                                                value: '18',
                                                color: '#4ECDC4',
                                                icon: '✅',
                                            },
                                            {
                                                label: 'In Progress',
                                                value: '4',
                                                color: '#45B7D1',
                                                icon: '🚧',
                                            },
                                            {
                                                label: 'Overdue',
                                                value: '2',
                                                color: '#FFA726',
                                                icon: '⏰',
                                            },
                                        ].map((stat, i) => (
                                            <Grid size={{ xs: 6 }} key={i}>
                                                <Box
                                                    sx={{
                                                        p: 3,
                                                        bgcolor: backgroundPaper,
                                                        borderRadius: 3,
                                                        textAlign: 'center',
                                                        border: `1px solid ${alpha(stat.color, 0.2)}`,
                                                        transition: 'all 0.2s ease',
                                                        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                                                        '&:hover': {
                                                            transform: 'translateY(-4px)',
                                                            boxShadow: `0 8px 20px ${alpha(stat.color, 0.2)}`,
                                                        },
                                                    }}
                                                >
                                                    <Typography
                                                        variant="body1"
                                                        sx={{
                                                            fontSize: '0.85rem',
                                                            color: textSecondary,
                                                            mb: 1,
                                                            fontWeight: 600,
                                                        }}
                                                    >
                                                        {stat.icon} {stat.label}
                                                    </Typography>
                                                    <Typography
                                                        variant="h4"
                                                        sx={{
                                                            color: stat.color,
                                                            fontWeight: 700,
                                                            fontSize: '1.8rem',
                                                        }}
                                                    >
                                                        {stat.value}
                                                    </Typography>
                                                </Box>
                                            </Grid>
                                        ))}
                                    </Grid>
                                    {/* Progress Chart */}
                                    <Box
                                        sx={{
                                            p: 3,
                                            bgcolor: backgroundPaper,
                                            borderRadius: 3,
                                            mb: 3,
                                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                                            flexGrow: 1,
                                        }}
                                    >
                                        <Typography
                                            variant="subtitle1"
                                            sx={{ mb: 3, fontWeight: 700, fontSize: '1rem' }}
                                        >
                                            Completion Progress
                                        </Typography>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'end',
                                                height: 100,
                                                gap: 2,
                                            }}
                                        >
                                            {[40, 65, 45, 80, 55, 70, 85].map((height, i) => (
                                                <Box
                                                    key={i}
                                                    sx={{
                                                        flex: 1,
                                                        height: `${height}%`,
                                                        bgcolor: i < 5 ? '#7B1FA2' : '#4CAF50',
                                                        borderRadius: '4px 4px 0 0',
                                                        opacity: 0.8,
                                                        transition: 'all 0.3s ease',
                                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                                        '&:hover': {
                                                            opacity: 1,
                                                            transform: 'scaleY(1.1)',
                                                        },
                                                    }}
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                    {/* Team Performance */}
                                    <Box
                                        sx={{
                                            p: 3,
                                            bgcolor: backgroundPaper,
                                            borderRadius: 3,
                                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                                        }}
                                    >
                                        <Typography
                                            variant="subtitle1"
                                            sx={{ mb: 2, fontWeight: 700, fontSize: '1rem' }}
                                        >
                                            Team Velocity
                                        </Typography>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                            <Box
                                                sx={{
                                                    width: 60,
                                                    height: 8,
                                                    bgcolor: '#E0E0E0',
                                                    borderRadius: 4,
                                                    overflow: 'hidden',
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        width: '75%',
                                                        height: '100%',
                                                        bgcolor: '#4CAF50',
                                                        borderRadius: 4,
                                                        transition: 'width 0.3s ease',
                                                    }}
                                                />
                                            </Box>
                                            <Typography
                                                variant="body1"
                                                sx={{
                                                    fontSize: '0.9rem',
                                                    color: textSecondary,
                                                    fontWeight: 600,
                                                }}
                                            >
                                                75% efficiency
                                            </Typography>
                                        </Box>
                                    </Box>{' '}
                                    {/* End inner analytics content box */}
                                </Box>{' '}
                                {/* End analytics wrapper column */}
                            </Box>{' '}
                            {/* End Real App Widgets Showcase grid */}
                        </Box>

                        {/* Workflow Automation Widget - Real workflow styling */}
                        <Grid container spacing={8} sx={{ mb: 10 }}>
                            <Grid size={{ xs: 12, lg: 6 }}>
                                <Box
                                    sx={{
                                        p: 5,
                                        borderRadius: 4,
                                        border: isDark
                                            ? `1px solid ${alpha(textPrimary, 0.18)}`
                                            : '2px solid #E8F5E8',
                                        background: isDark
                                            ? `linear-gradient(135deg, ${alpha(textPrimary, 0.14)} 0%, ${alpha(textPrimary, 0.08)} 100%)`
                                            : 'linear-gradient(135deg, #F0FDF4 0%, #ECFDF5 55%, #E7F5EE 100%)',
                                        minHeight: 450,
                                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        '&:hover': {
                                            transform: 'translateY(-8px)',
                                            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.12)',
                                        },
                                    }}
                                >
                                    <Typography
                                        variant="h5"
                                        sx={{
                                            mb: 4,
                                            fontWeight: 700,
                                            color: isDark ? alpha('#a7f3d0', 0.9) : '#22B36B',
                                            fontSize: '1.3rem',
                                        }}
                                    >
                                        🔄 Workflow Automation
                                    </Typography>

                                    {/* Workflow Builder Style */}
                                    <Box sx={{ position: 'relative' }}>
                                        {[
                                            {
                                                step: '🎯',
                                                title: 'Trigger: Task Completed',
                                                desc: 'When any task is marked as done',
                                                color: '#25D3B3',
                                            },
                                            {
                                                step: '⚡',
                                                title: 'Action: Auto-Assign',
                                                desc: 'Next task assigned to team member',
                                                color: '#4D9FFF',
                                            },
                                            {
                                                step: '🔔',
                                                title: 'Notify: Send Alert',
                                                desc: 'Slack notification sent to team',
                                                color: '#FFB961',
                                            },
                                            {
                                                step: '📊',
                                                title: 'Update: Dashboard',
                                                desc: 'Analytics updated in real-time',
                                                color: '#A97CFF',
                                            },
                                        ].map((item, i) => (
                                            <Box
                                                key={i}
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    mb: 4,
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        width: 50,
                                                        height: 50,
                                                        borderRadius: '50%',
                                                        background: `linear-gradient(145deg, ${item.color}, ${alpha(item.color, 0.8)})`,
                                                        color: 'white',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        fontSize: '1.4rem',
                                                        mr: 3,
                                                        boxShadow: `0 6px 16px ${alpha(item.color, 0.3)}`,
                                                        transition: 'all 0.2s ease',
                                                        '&:hover': {
                                                            transform: 'scale(1.1)',
                                                        },
                                                    }}
                                                >
                                                    {item.step}
                                                </Box>
                                                <Box>
                                                    <Typography
                                                        variant="subtitle1"
                                                        sx={{
                                                            fontWeight: 700,
                                                            fontSize: '1rem',
                                                            mb: 0.5,
                                                        }}
                                                    >
                                                        {item.title}
                                                    </Typography>
                                                    <Typography
                                                        variant="body1"
                                                        color="text.secondary"
                                                        sx={{ fontSize: '0.9rem', lineHeight: 1.4 }}
                                                    >
                                                        {item.desc}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        ))}

                                        {/* Connecting Line */}
                                        <Box
                                            sx={{
                                                position: 'absolute',
                                                left: 24,
                                                top: 65,
                                                bottom: 80,
                                                width: 3,
                                                background:
                                                    'linear-gradient(180deg, #25D3B3, #4D9FFF, #FFB961, #A97CFF)',
                                                opacity: 0.4,
                                                borderRadius: 2,
                                            }}
                                        />
                                    </Box>
                                </Box>
                            </Grid>

                            {/* AI Assistant Widget - Real chat styling */}
                            <Grid size={{ xs: 12, lg: 6 }}>
                                <Box
                                    sx={{
                                        p: 5,
                                        borderRadius: 4,
                                        border: isDark
                                            ? `1px solid ${alpha(textPrimary, 0.18)}`
                                            : '2px solid #FFF3E0',
                                        background: isDark
                                            ? `linear-gradient(135deg, ${alpha(textPrimary, 0.14)} 0%, ${alpha(textPrimary, 0.07)} 100%)`
                                            : 'linear-gradient(135deg, #FFF8EC 0%, #FFE2BC 100%)',
                                        minHeight: 450,
                                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        '&:hover': {
                                            transform: 'translateY(-8px)',
                                            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.12)',
                                        },
                                    }}
                                >
                                    <Typography
                                        variant="h5"
                                        sx={{
                                            mb: 4,
                                            fontWeight: 700,
                                            color: isDark ? alpha('#ffb26b', 0.9) : '#E65100',
                                            fontSize: '1.3rem',
                                        }}
                                    >
                                        🤖 AI Project Assistant
                                    </Typography>

                                    {/* Chat Messages */}
                                    <Stack
                                        spacing={3}
                                        sx={{ mb: 4, maxHeight: 300, overflow: 'hidden' }}
                                    >
                                        {/* User Message */}
                                        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                                            <Box
                                                sx={{
                                                    maxWidth: '85%',
                                                    p: 3,
                                                    bgcolor: isDark
                                                        ? alpha(primaryMain, 0.2)
                                                        : '#E3F2FD',
                                                    borderRadius: '20px 20px 6px 20px',
                                                    fontSize: '0.95rem',
                                                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                                                    fontWeight: 500,
                                                    color: isDark ? '#f8fafc' : textPrimary,
                                                }}
                                            >
                                                "Can you help me optimize this project timeline?"
                                            </Box>
                                        </Box>

                                        {/* AI Response */}
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 2,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: '50%',
                                                    background:
                                                        'linear-gradient(145deg, #FF6B6B, #4ECDC4)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontSize: '1.2rem',
                                                    flexShrink: 0,
                                                    boxShadow:
                                                        '0 4px 12px rgba(255, 107, 107, 0.3)',
                                                }}
                                            >
                                                🤖
                                            </Box>
                                            <Box
                                                sx={{
                                                    maxWidth: '85%',
                                                    p: 3,
                                                    bgcolor: isDark ? alpha(textPrimary, 0.12) : backgroundPaper,
                                                    borderRadius: '6px 20px 20px 20px',
                                                    fontSize: '0.95rem',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                                    lineHeight: 1.5,
                                                    color: textPrimary,
                                                }}
                                            >
                                                "I've analyzed your project and can reduce the
                                                timeline by 15% by optimizing task dependencies.
                                                Here's what I suggest:
                                                <br />• Parallel execution of UI/API work
                                                <br />• Early testing integration
                                                <br />• Resource reallocation"
                                            </Box>
                                        </Box>

                                        {/* Typing Indicator */}
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'flex-start',
                                                gap: 2,
                                            }}
                                        >
                                            <Box
                                                sx={{
                                                    width: 40,
                                                    height: 40,
                                                    borderRadius: '50%',
                                                    background:
                                                        'linear-gradient(145deg, #FF6B6B, #4ECDC4)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: 'white',
                                                    fontSize: '1.2rem',
                                                    boxShadow:
                                                        '0 4px 12px rgba(255, 107, 107, 0.3)',
                                                }}
                                            >
                                                🤖
                                            </Box>
                                            <Box
                                                sx={{
                                                    p: 3,
                                                    bgcolor: isDark ? alpha(textPrimary, 0.12) : backgroundPaper,
                                                    borderRadius: '6px 20px 20px 20px',
                                                    fontSize: '0.95rem',
                                                    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                }}
                                            >
                                                <Box
                                                    sx={{
                                                        fontSize: '0.85rem',
                                                        color: 'grey.500',
                                                        fontWeight: 500,
                                                    }}
                                                >
                                                    AI is thinking
                                                </Box>
                                                {[0, 1, 2].map((i) => (
                                                    <Box
                                                        key={i}
                                                        sx={{
                                                            width: 6,
                                                            height: 6,
                                                            borderRadius: '50%',
                                                            bgcolor: 'grey.400',
                                                            animation: `bounce 1.4s ease-in-out ${i * 0.16}s infinite both`,
                                                            '@keyframes bounce': {
                                                                '0%, 80%, 100%': {
                                                                    transform: 'scale(0)',
                                                                },
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
                                p: 6,
                                borderRadius: 4,
                                border: isDark ? `2px solid ${alpha(primaryMain, 0.2)}` : '2px solid #E1F5FE',
                                background: isDark
                                    ? `linear-gradient(135deg, ${alpha(primaryMain, 0.18)} 0%, ${alpha(primaryMain, 0.08)} 100%)`
                                    : 'linear-gradient(135deg, #E1F5FE 0%, #F8F9FA 100%)',
                                textAlign: 'center',
                                mb: 8,
                                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
                            }}
                        >
                            <Typography
                                variant="h5"
                                sx={{
                                    mb: 5,
                                    fontWeight: 700,
                                    color: isDark ? primaryLight : primaryMain,
                                    fontSize: '1.3rem',
                                }}
                            >
                                👥 Project Management Dashboard
                            </Typography>

                        <Grid
                            container
                            spacing={5}
                            sx={{
                                '--card-radius': '20px',
                                '--card-border': isDark
                                    ? '1px solid rgba(255,255,255,0.08)'
                                    : '1px solid rgba(2,119,189,0.12)',
                            }}
                        >
                                {/* Shared card style helper */}
                                {[
                                    {
                                        key: 'overview',
                                        title: 'Project Overview',
                                        content: (
                                            <Box>
                                                <Box
                                                    sx={{
                                                        p: 2.5,
                                                        border: '1px solid #E3F2FD',
                                                        borderRadius: 3,
                                                        borderLeft: '4px solid #FF6B6B',
                                                        mb: 2.5,
                                                        transition: 'border-color .25s ease',
                                                    }}
                                                >
                                                    <Typography
                                                        variant="subtitle1"
                                                        sx={{ fontWeight: 700, mb: 1 }}
                                                    >
                                                        E-Commerce Platform
                                                    </Typography>
                                                    <Box
                                                        sx={{
                                                            display: 'flex',
                                                            gap: 1,
                                                            mb: 1.5,
                                                            flexWrap: 'wrap',
                                                        }}
                                                    >
                                                        <Chip
                                                            label="Web App"
                                                            size="small"
                                                            sx={{
                                                                fontSize: '0.65rem',
                                                                height: 22,
                                                                fontWeight: 600,
                                                            }}
                                                        />
                                                        <Chip
                                                            label="React"
                                                            size="small"
                                                            sx={{
                                                                fontSize: '0.65rem',
                                                                height: 22,
                                                                fontWeight: 600,
                                                            }}
                                                        />
                                                    </Box>
                                                    <Box
                                                        sx={{
                                                            position: 'relative',
                                                            height: 10,
                                                            bgcolor: 'grey.100',
                                                            borderRadius: 5,
                                                            overflow: 'hidden',
                                                            mb: 1.5,
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                position: 'absolute',
                                                                inset: 0,
                                                                width: '75%',
                                                                bgcolor: '#4CAF50',
                                                                borderRadius: 5,
                                                                transition: 'width .4s ease',
                                                            }}
                                                        />
                                                    </Box>
                                                    <Typography
                                                        variant="caption"
                                                        sx={{ fontWeight: 600, letterSpacing: 0.3 }}
                                                    >
                                                        75% Complete
                                                    </Typography>
                                                </Box>
                                                <Stack direction="row" spacing={2}>
                                                    {[
                                                        { label: 'Tasks', value: 24 },
                                                        { label: 'Members', value: 3 },
                                                        { label: 'Active Sprint', value: 'Week 5' },
                                                    ].map((i) => (
                                                        <Box
                                                            key={i.label}
                                                            sx={{
                                                                flex: 1,
                                                                p: 1.5,
                                                                borderRadius: 2,
                                                                bgcolor: isDark ? alpha(textPrimary, 0.08) : 'grey.50',
                                                            }}
                                                        >
                                                            <Typography
                                                                variant="caption"
                                                                sx={{
                                                                    textTransform: 'uppercase',
                                                                    fontWeight: 600,
                                                                    color: textSecondary,
                                                                    letterSpacing: 0.5,
                                                                }}
                                                            >
                                                                {i.label}
                                                            </Typography>
                                                            <Typography
                                                                variant="body1"
                                                                sx={{ fontWeight: 700 }}
                                                            >
                                                                {i.value}
                                                            </Typography>
                                                        </Box>
                                                    ))}
                                                </Stack>
                                            </Box>
                                        ),
                                    },
                                    {
                                        key: 'team',
                                        title: 'Team Members',
                                        content: (
                                            <Stack spacing={2}>
                                                {[
                                                    {
                                                        name: 'Alex Chen',
                                                        role: 'Lead Dev',
                                                        color: '#FF6B6B',
                                                        workload: 85,
                                                    },
                                                    {
                                                        name: 'Sam Rodriguez',
                                                        role: 'Designer',
                                                        color: '#4ECDC4',
                                                        workload: 70,
                                                    },
                                                    {
                                                        name: 'Jordan Kim',
                                                        role: 'QA Engineer',
                                                        color: '#45B7D1',
                                                        workload: 60,
                                                    },
                                                ].map((member) => (
                                                    <Box
                                                        key={member.name}
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            gap: 1.5,
                                                        }}
                                                    >
                                                        <Avatar
                                                            sx={{
                                                                bgcolor: member.color,
                                                                width: 38,
                                                                height: 38,
                                                                fontSize: '0.85rem',
                                                                fontWeight: 700,
                                                            }}
                                                        >
                                                            {member.name
                                                                .split(' ')
                                                                .map((n) => n[0])
                                                                .join('')}
                                                        </Avatar>
                                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{
                                                                    fontWeight: 700,
                                                                    lineHeight: 1.2,
                                                                }}
                                                            >
                                                                {member.name}
                                                            </Typography>
                                                            <Typography
                                                                variant="caption"
                                                                sx={{ color: 'text.secondary' }}
                                                            >
                                                                {member.role} • {member.workload}%
                                                                capacity
                                                            </Typography>
                                                        </Box>
                                                        <Box
                                                            sx={{
                                                                width: 46,
                                                                height: 6,
                                                                bgcolor: 'grey.200',
                                                                borderRadius: 3,
                                                                overflow: 'hidden',
                                                            }}
                                                        >
                                                            <Box
                                                                sx={{
                                                                    width: `${member.workload}%`,
                                                                    height: '100%',
                                                                    bgcolor: member.color,
                                                                    opacity: 0.65,
                                                                }}
                                                            />
                                                        </Box>
                                                    </Box>
                                                ))}
                                            </Stack>
                                        ),
                                    },
                                    {
                                        key: 'activity',
                                        title: 'Recent Activity',
                                        content: (
                                            <Stack
                                                spacing={1.75}
                                                sx={{
                                                    maxHeight: 210,
                                                    overflowY: 'auto',
                                                    pr: 0.5,
                                                    '&::-webkit-scrollbar': { width: 6 },
                                                    '&::-webkit-scrollbar-thumb': {
                                                        bgcolor: 'grey.300',
                                                        borderRadius: 3,
                                                    },
                                                }}
                                            >
                                                {[
                                                    {
                                                        action: 'Task completed',
                                                        user: 'Alex',
                                                        time: '2 min ago',
                                                        color: '#4CAF50',
                                                    },
                                                    {
                                                        action: 'Comment added',
                                                        user: 'Sam',
                                                        time: '5 min ago',
                                                        color: '#2196F3',
                                                    },
                                                    {
                                                        action: 'Priority updated',
                                                        user: 'Jordan',
                                                        time: '12 min ago',
                                                        color: '#FF9800',
                                                    },
                                                    {
                                                        action: 'New milestone',
                                                        user: 'Alex',
                                                        time: '1 hour ago',
                                                        color: '#9C27B0',
                                                    },
                                                    {
                                                        action: 'Sprint planning',
                                                        user: 'Sam',
                                                        time: '2 hours ago',
                                                        color: '#607D8B',
                                                    },
                                                ].map((a) => (
                                                    <Box
                                                        key={a.user + a.time}
                                                        sx={{
                                                            display: 'flex',
                                                            alignItems: 'flex-start',
                                                            gap: 1.5,
                                                        }}
                                                    >
                                                        <Box
                                                            sx={{
                                                                width: 8,
                                                                height: 8,
                                                                mt: '6px',
                                                                borderRadius: '50%',
                                                                bgcolor: a.color,
                                                                flexShrink: 0,
                                                            }}
                                                        />
                                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                                            <Typography
                                                                variant="body2"
                                                                sx={{ lineHeight: 1.25 }}
                                                            >
                                                                <Box
                                                                    component="span"
                                                                    sx={{ fontWeight: 700 }}
                                                                >
                                                                    {a.user}
                                                                </Box>{' '}
                                                                {a.action}
                                                            </Typography>
                                                            <Typography
                                                                variant="caption"
                                                                sx={{ color: 'text.secondary' }}
                                                            >
                                                                {a.time}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                ))}
                                            </Stack>
                                        ),
                                    },
                                ].map((card) => (
                                    <Grid size={{ xs: 12, sm: 6, md: 4 }} key={card.key}>
                                        <Box
                                            sx={{
                                                position: 'relative',
                                                height: '100%',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 2.5,
                                                p: 3.5,
                                                bgcolor: backgroundPaper,
                                                borderRadius: 'var(--card-radius)',
                                                border: 'var(--card-border)',
                                                boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
                                                transition:
                                                    'box-shadow .25s ease, transform .25s ease',
                                                overflow: 'hidden',
                                                '&:hover': {
                                                    boxShadow: '0 10px 28px rgba(0,0,0,0.10)',
                                                    transform: 'translateY(-4px)',
                                                },
                                            }}
                                        >
                                            <Typography
                                                variant="subtitle1"
                                                sx={{
                                                    fontWeight: 700,
                                                    color: primaryMain,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                }}
                                            >
                                                {card.key === 'overview' && '📁'}
                                                {card.key === 'team' && '👥'}
                                                {card.key === 'activity' && '🕒'}
                                                {card.title}
                                            </Typography>
                                            {card.content}
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    </Container>
                </Box>

                {/* Features Section */}
                <Box
                    sx={{
                        py: { xs: 8, md: 12 },
                        bgcolor: isDark ? alpha(textPrimary, 0.05) : '#FAFBFC',
                    }}
                >
                    <Container maxWidth="lg">
                        <Box sx={{ textAlign: 'center', mb: 10 }}>
                            <Typography
                                variant="h2"
                                sx={{
                                    fontSize: { xs: '2rem', md: '3rem' },
                                    fontWeight: 700,
                                    mb: 3,
                                    color: textPrimary,
                                }}
                            >
                                Everything your team is looking for
                            </Typography>
                            <Typography
                                variant="h6"
                                sx={{
                                    color: textSecondary,
                                    fontWeight: 400,
                                    maxWidth: 600,
                                    mx: 'auto',
                                }}
                            >
                                TaskPilot's exceptional flexibility can handle any type of work. And
                                we never stop innovating.
                            </Typography>
                        </Box>

                        <Grid container spacing={6} justifyContent="center" sx={{ maxWidth: 1200, mx: 'auto' }} >
                            {features.map((feature, index) => (
                                <Grid size={{ xs: 12, md: 6, lg: 4 }} key={index}>
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
                                                color: textPrimary,
                                            }}
                                        >
                                            {feature.title}
                                        </Typography>
                                        <Typography
                                            variant="body1"
                                            sx={{
                                                color: textSecondary,
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
                <Box
                    id="pricing"
                    sx={{
                        py: { xs: 8, md: 12 },
                        bgcolor: backgroundPaper,
                        borderTop: '1px solid',
                        borderBottom: '1px solid',
                        borderColor: divider,
                    }}
                >
                    <Container maxWidth="lg">
                        <Box sx={{ textAlign: 'center', mb: 8 }}>
                            <Chip
                                label="Pricing"
                                sx={{
                                    mb: 2.5,
                                    px: 2,
                                    fontWeight: 700,
                                    backgroundColor: alpha(primaryMain, 0.12),
                                    color: primaryMain,
                                    textTransform: 'uppercase',
                                    letterSpacing: 1.4,
                                }}
                            />
                            <Typography
                                variant="h2"
                                sx={{
                                    fontSize: { xs: '2rem', md: '3rem' },
                                    fontWeight: 700,
                                    color: textPrimary,
                                    mb: 2,
                                }}
                            >
                                Simple pricing designed for teams of every size
                            </Typography>
                            <Typography
                                variant="h6"
                                sx={{
                                    color: textSecondary,
                                    maxWidth: 640,
                                    mx: 'auto',
                                    fontWeight: 400,
                                }}
                            >
                                Every plan includes the Project Assistant, real-time dashboards, and secure cloud
                                storage. Pick the AI credit pack that matches the pace of your projects.
                            </Typography>
                        </Box>

                        <Grid container spacing={3} justifyContent="center">
                            {pricingPlans.map((plan) => {
                                const accentColor = planAccentMap[plan.key] ?? '#2563eb';
                                const isHighlight = Boolean(plan.highlight);
                                const priceValue = plan.price ?? 0;
                                const intervalLabel = priceValue > 0 && plan.interval
                                    ? `/${String(plan.interval).toLowerCase()}`
                                    : '';
                                const currencyLabel = priceValue > 0 && plan.currency
                                    ? String(plan.currency).toUpperCase()
                                    : 'USD';
                                const cta = resolvePlanCta(plan);
                                const cardBackground = isHighlight
                                    ? `linear-gradient(140deg, ${alpha(accentColor, isDark ? 0.35 : 0.18)}, ${alpha(accentColor, isDark ? 0.18 : 0.05)})`
                                    : isDark
                                        ? alpha(textPrimary, 0.08)
                                        : 'linear-gradient(180deg, #ffffff 0%, #f9fafb 100%)';
                                const cardHoverBackground = isHighlight
                                    ? `linear-gradient(135deg, ${alpha(accentColor, isDark ? 0.45 : 0.2)}, ${alpha(accentColor, isDark ? 0.22 : 0.08)})`
                                    : isDark
                                        ? alpha(textPrimary, 0.12)
                                        : 'linear-gradient(180deg, #ffffff 0%, #eef2ff 100%)';
                                const cardBorderColor = alpha(accentColor, isHighlight ? (isDark ? 0.6 : 0.45) : (isDark ? 0.28 : 0.18));
                                const cardShadow = isHighlight
                                    ? (isDark ? '0 22px 48px -16px rgba(78,205,196,0.35)' : '0 22px 48px -16px rgba(124,58,237,0.32)')
                                    : (isDark ? '0 18px 42px -18px rgba(0,0,0,0.6)' : '0 14px 36px -20px rgba(15,23,42,0.25)');
                                const cardHoverShadow = isHighlight
                                    ? (isDark ? '0 32px 60px -16px rgba(78,205,196,0.4)' : '0 30px 56px -16px rgba(124,58,237,0.38)')
                                    : (isDark ? '0 20px 48px -18px rgba(0,0,0,0.65)' : '0 20px 44px -18px rgba(15,23,42,0.28)');

                                return (
                                    <Grid size={{ xs: 12, md: 4 }} key={plan.key}>
                                        <Box
                                            sx={{
                                                position: 'relative',
                                                height: '100%',
                                                p: 4,
                                                borderRadius: 4,
                                                background: cardBackground,
                                                border: `1px solid ${cardBorderColor}`,
                                                boxShadow: cardShadow,
                                                transition: 'transform .25s ease, box-shadow .25s ease',
                                                '&:hover': {
                                                    transform: 'translateY(-6px)',
                                                    boxShadow: cardHoverShadow,
                                                    background: cardHoverBackground,
                                                },
                                            }}
                                        >
                                            {isHighlight && (
                                                <Chip
                                                    label="Most popular"
                                                    color="secondary"
                                                    size="small"
                                                    sx={{
                                                        position: 'absolute',
                                                        top: 24,
                                                        right: 24,
                                                        fontWeight: 700,
                                                        backgroundColor: primaryMain,
                                                        color: 'white',
                                                    }}
                                                />
                                            )}

                                            <Stack spacing={2.5}>
                                                <Box>
                                                <Typography
                                                    variant="h5"
                                                    sx={{
                                                        fontWeight: 700,
                                                        color: textPrimary,
                                                        letterSpacing: '-0.3px',
                                                    }}
                                                >
                                                    {plan.name}
                                                </Typography>
                                                <Typography variant="body2" sx={{ color: textSecondary, mt: 0.5 }}>
                                                    {plan.description}
                                                </Typography>
                                                </Box>

                                                <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                                                    {priceValue === 0 ? (
                                                        <Typography
                                                            variant="h3"
                                                            sx={{ fontWeight: 800, color: accentColor }}
                                                        >
                                                            Free
                                                        </Typography>
                                                    ) : (
                                                        <>
                                                            <Typography
                                                                variant="h3"
                                                                sx={{ fontWeight: 800, color: accentColor }}
                                                            >
                                                                ${priceValue}
                                                            </Typography>
                                                            <Typography variant="body1" sx={{ color: textSecondary }}>
                                                                {intervalLabel}
                                                            </Typography>
                                                        </>
                                                    )}
                                                </Box>

                                                {priceValue > 0 && (
                                                    <Typography variant="caption" sx={{ color: textSecondary, fontWeight: 600 }}>
                                                        Billed in {currencyLabel}
                                                    </Typography>
                                                )}

                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: 600,
                                                        color: alpha(accentColor, 0.85),
                                                        backgroundColor: alpha(accentColor, 0.12),
                                                        borderRadius: 2,
                                                        px: 1.5,
                                                        py: 0.75,
                                                    }}
                                                >
                                                    {plan.ai_credits ?? 'Includes AI assistant automation'}
                                                </Typography>

                                                <Stack spacing={1.5} sx={{ mt: 1 }}>
                                                    {(plan.features ?? []).map((feature) => (
                                                        <Stack
                                                            key={feature}
                                                            direction="row"
                                                            spacing={1}
                                                            alignItems="flex-start"
                                                        >
                                                            <CheckCircle
                                                                sx={{
                                                                    fontSize: 20,
                                                                    color: accentColor,
                                                                    mt: 0.2,
                                                                }}
                                                            />
                                                            <Typography variant="body2" sx={{ color: textSecondary }}>
                                                                {feature}
                                                            </Typography>
                                                        </Stack>
                                                    ))}
                                                </Stack>

                                                <Button
                                                    href={cta.href}
                                                    variant={isHighlight ? 'contained' : 'outlined'}
                                                    size="large"
                                                    sx={{
                                                        mt: 2,
                                                        textTransform: 'none',
                                                        fontWeight: 700,
                                                        borderRadius: 2,
                                                        px: 3,
                                                        background: isHighlight
                                                            ? `linear-gradient(135deg, ${accentColor}, ${alpha(accentColor, 0.75)})`
                                                            : 'transparent',
                                                        color: isHighlight ? 'white' : accentColor,
                                                        borderColor: alpha(accentColor, isHighlight ? 0 : 0.5),
                                                        '&:hover': {
                                                            background: isHighlight
                                                                ? `linear-gradient(135deg, ${alpha(accentColor, 0.9)}, ${accentColor})`
                                                                : alpha(accentColor, 0.1),
                                                            borderColor: alpha(accentColor, 0.6),
                                                            color: isHighlight ? 'white' : accentColor,
                                                        },
                                                    }}
                                                >
                                                    {cta.label}
                                                </Button>
                                            </Stack>
                                        </Box>
                                    </Grid>
                                );
                            })}
                        </Grid>

                        <Stack
                            direction={{ xs: 'column', sm: 'row' }}
                            spacing={2}
                            justifyContent="center"
                            alignItems="center"
                            sx={{ mt: 6, color: textSecondary }}
                        >
                            <Typography variant="body2" sx={{ fontWeight: 500, color: textSecondary }}>
                                Prices listed in USD. Cancel or switch plans anytime.
                            </Typography>
                            <Typography variant="body2" sx={{ fontWeight: 500, color: textSecondary }}>
                                Need enterprise licensing? <Link href="/contact">Contact our team</Link> for a custom quote.
                            </Typography>
                        </Stack>
                    </Container>
                </Box>

                <Box
                    id="login-form"
                    sx={{
                        py: { xs: 8, md: 12 },
                        bgcolor: isDark ? alpha(textPrimary, 0.06) : '#FAFBFC',
                    }}
                >
                    <Container maxWidth="sm">
                        <Paper
                            elevation={0}
                            sx={{
                                p: { xs: 4, sm: 6 },
                                borderRadius: 3,
                                border: '1px solid',
                                borderColor: divider,
                                bgcolor: backgroundPaper,
                            }}
                        >
                            <Box sx={{ textAlign: 'center', mb: 4 }}>
                                <Typography
                                    variant="h4"
                                    sx={{ fontWeight: 700, mb: 1, color: textPrimary }}
                                >
                                    Welcome back
                                </Typography>
                                <Typography variant="body1" sx={{ color: textSecondary }}>
                                    {t('landing.signInDescription')}
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
                                        borderColor: isDark ? alpha(textPrimary, 0.25) : 'grey.300',
                                        color: textPrimary,
                                        '&:hover': {
                                            borderColor: isDark ? alpha(textPrimary, 0.35) : 'grey.400',
                                            bgcolor: isDark ? alpha(textPrimary, 0.12) : 'grey.50',
                                        },
                                    }}
                                >
                                    {t('landing.continueWithGoogle')}
                                </Button>

                                <Box sx={{ display: 'flex', alignItems: 'center', my: 2 }}>
                                    <Divider sx={{ flex: 1 }} />
                                    <Typography variant="body2" sx={{ px: 2, color: textSecondary }}>
                                        {t('common.or')}
                                    </Typography>
                                    <Divider sx={{ flex: 1 }} />
                                </Box>
                            </Stack>

                            <form onSubmit={submit}>
                                <Stack spacing={3}>
                                    <TextField
                                        label={t('auth.email')}
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
                                                    borderColor: primaryMain,
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: primaryMain,
                                                },
                                            },
                                        }}
                                    />

                                    <TextField
                                        label={t('auth.password')}
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
                                                    borderColor: primaryMain,
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: primaryMain,
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
                                        {processing ? t('auth.signingIn') : t('auth.logIn')}
                                    </Button>

                                    <Box sx={{ textAlign: 'center' }}>
                                        <Link
                                            href={route('password.request')}
                                            underline="hover"
                                            sx={{
                                                fontSize: 14,
                                                color: primaryMain,
                                                '&:hover': { color: primaryDark },
                                            }}
                                        >
                                            Forgot your password?
                                        </Link>
                                    </Box>

                                    <Typography
                                        variant="body2"
                                        sx={{ textAlign: 'center', color: textSecondary }}
                                    >
                                        Don't have an account?{' '}
                                        <Link
                                            href={route('register')}
                                            underline="hover"
                                            sx={{
                                                fontWeight: 600,
                                                color: primaryMain,
                                                '&:hover': { color: primaryDark },
                                            }}
                                        >
                                            {t('auth.signUpNow')}
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
                        bgcolor: backgroundPaper,
                        borderTop: '1px solid',
                        borderColor: divider,
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
                                    sx={{ fontWeight: 700, color: primaryMain, mr: 2 }}
                                >
                                    TaskPilot
                                </Typography>
                                <Typography variant="body2" sx={{ color: textSecondary }}>
                                    The everything app, for work.
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                                <Link
                                    href="/blog"
                                    sx={{
                                        color: textSecondary,
                                        textDecoration: 'none',
                                        '&:hover': { color: primaryMain },
                                    }}
                                >
                                    Blog
                                </Link>
                                <InertiaLink
                                    href="/privacy_policy"
                                    style={{
                                        color: textSecondary,
                                        textDecoration: 'none',
                                    }}
                                    onMouseEnter={(e) => (e.target.style.color = primaryMain)}
                                    onMouseLeave={(e) => (e.target.style.color = textSecondary)}
                                >
                                    Privacy
                                </InertiaLink>
                                <InertiaLink
                                    href="/terms_of_service"
                                    style={{
                                        color: textSecondary,
                                        textDecoration: 'none',
                                    }}
                                    onMouseEnter={(e) => (e.target.style.color = primaryMain)}
                                    onMouseLeave={(e) => (e.target.style.color = textSecondary)}
                                >
                                    Terms
                                </InertiaLink>
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
                    🚀 {t('landing.getStarted')}
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
