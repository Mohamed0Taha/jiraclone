// resources/js/Pages/Dashboard.jsx
import React, { useMemo, useState, useCallback, memo } from 'react';
import { Head, router } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Box,
    Container,
    Stack,
    Typography,
    Button,
    Paper,
    IconButton,
    TextField,
    InputAdornment,
    ToggleButton,
    ToggleButtonGroup,
    Select,
    MenuItem,
    Chip,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogContentText,
    DialogActions,
    Divider,
    Badge,
    alpha,
    useTheme,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import SortIcon from '@mui/icons-material/Sort';
import ViewListIcon from '@mui/icons-material/ViewList';
import ViewModuleIcon from '@mui/icons-material/ViewModule';
import AddIcon from '@mui/icons-material/Add';
import EditRoundedIcon from '@mui/icons-material/EditRounded';
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import StarIcon from '@mui/icons-material/Star';
import GroupIcon from '@mui/icons-material/Group';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import PersonIcon from '@mui/icons-material/Person';
import ProjectAccordion from '@/Pages/ProjectAccordion';
const designTokens = {
    radii: {
        xl: 4,
        lg: 4,
        md: 4,
    },
    gradients: (theme) => ({
        hero:
            theme.palette.mode === 'dark'
                ? `linear-gradient(135deg, #1a1b3a 0%, #2d1b69 50%, #4338ca 100%)`
                : `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
        accent: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`,
        card:
            theme.palette.mode === 'dark'
                ? `linear-gradient(145deg, rgba(255, 255, 255, 0.05) 0%, rgba(255, 255, 255, 0.02) 100%)`
                : `linear-gradient(145deg, rgba(255, 255, 255, 0.9) 0%, rgba(248, 250, 252, 0.8) 100%)`,
        stats: `linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(168, 85, 247, 0.1) 100%)`,
    }),
    blur: {
        heavy: '24px',
        medium: '16px',
        light: '8px',
    },
    shadows: {
        subtle: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        soft: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        medium: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
        elevated: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    },
};

// Enhanced row color generator with more vibrant palette
const useRowColor = () => {
    const theme = useTheme();

    return useMemo(() => {
        const basePalette = [
            theme.palette.primary.main,
            theme.palette.secondary.main,
            theme.palette.info.main,
            theme.palette.success.main,
            theme.palette.warning.main,
        ];

        // Pre-compute alpha values for performance
        const alphaValues = basePalette.map((color) => ({
            bg: alpha(color, 0.1),
            hover: alpha(color, 0.18),
            focus: alpha(color, 0.25),
        }));

        return (index) => {
            const colors = alphaValues[index % alphaValues.length];
            return {
                bgcolor: colors.bg,
                transition: 'background-color .3s ease, transform .3s ease, box-shadow .3s ease',
                '&:hover': {
                    bgcolor: colors.hover,
                    transform: 'translateY(-2px)',
                    boxShadow: designTokens.shadows.soft,
                },
                '&:focus-within': {
                    outline: `2px solid ${colors.focus}`,
                    outlineOffset: 2,
                },
            };
        };
    }, [theme.palette]);
};

export default function Dashboard({ auth, projects, appsumo_welcome, message }) {
    const theme = useTheme();
    const rowSx = useRowColor();
    const { t } = useTranslation();

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [projectToDelete, setProjectToDelete] = useState(null);
    const [query, setQuery] = useState('');
    const [sort, setSort] = useState('recent');
    const [viewMode, setViewMode] = useState('list');
    const [isClient, setIsClient] = useState(false);
    const [stars, setStars] = useState([]); // regenerated each "beat"
    const [orbs, setOrbs] = useState([]); // smooth shifting circular lights
    const STAR_REGEN_INTERVAL = 7000; // ms (visual beat)
    const [scope, setScope] = useState('all'); // 'all' | 'owned'

    React.useEffect(() => {
        setIsClient(true);
    }, []);

    // Generate stars client-side to avoid SSR mismatch
    React.useEffect(() => {
        if (!isClient) return;
        const STAR_COUNT = 26;
        const ORB_COUNT = 2;
        const regen = () => {
            const newStars = Array.from({ length: STAR_COUNT }, (_, i) => ({
                id: i,
                top: Math.random() * 92 + 2, // keep inside bounds
                left: Math.random() * 92 + 2,
                size: 1.5 + Math.random() * 3.5,
                delay: +(Math.random() * 2).toFixed(2),
                duration: 6 + Math.random() * 10,
                driftX: Math.random() * 60 - 30,
                driftY: Math.random() * 40 - 20,
                twinkleOffset: Math.random(),
            }));
            setStars(newStars);

            const newOrbs = Array.from({ length: ORB_COUNT }, (_, i) => ({
                id: i,
                top: Math.random() * 60 + i * 10,
                left: Math.random() * 70 + i * 5,
                size: 140 + Math.random() * 120,
                duration: 30 + Math.random() * 25,
                opacity: 0.25 + Math.random() * 0.25,
            }));
            setOrbs(newOrbs);
        };
        regen();
        const id = setInterval(regen, STAR_REGEN_INTERVAL);
        return () => clearInterval(id);
    }, [isClient]);

    // Memoized callbacks
    const askDelete = useCallback((e, project) => {
        e?.stopPropagation?.();
        e?.preventDefault?.();
        setProjectToDelete(project);
        setConfirmOpen(true);
    }, []);

    const confirmDelete = useCallback(() => {
        if (projectToDelete) {
            router.delete(`/projects/${projectToDelete.id}`, { preserveScroll: true });
        }
        setConfirmOpen(false);
        setProjectToDelete(null);
    }, [projectToDelete]);

    const handleClearSearch = useCallback(() => setQuery(''), []);
    const handleCloseDialog = useCallback(() => setConfirmOpen(false), []);
    const handleQueryChange = useCallback((e) => setQuery(e.target.value), []);
    const handleSortChange = useCallback((e) => setSort(e.target.value), []);

    // Optimized filtering and sorting logic
    const { ownedProjects, memberProjects } = useMemo(() => {
        if (!Array.isArray(projects)) return { ownedProjects: [], memberProjects: [] };

        // Separate projects by ownership first
        const owned = projects.filter((p) => p.is_owner);
        const member = projects.filter((p) => !p.is_owner);

        // Apply filtering to both groups
        const filterProjects = (projectList) => {
            if (!query.trim()) return projectList;

            const q = query.toLowerCase();
            return projectList.filter((project) => {
                const { name = '', key = '', description = '', owner = {} } = project;
                return (
                    name.toLowerCase().includes(q) ||
                    key.toLowerCase().includes(q) ||
                    description.toLowerCase().includes(q) ||
                    (owner.name || '').toLowerCase().includes(q)
                );
            });
        };

        // Apply sorting to both groups
        const sortProjects = (projectList) => {
            switch (sort) {
                case 'name_asc':
                    return [...projectList].sort((a, b) =>
                        (a.name || '').localeCompare(b.name || '')
                    );
                case 'name_desc':
                    return [...projectList].sort((a, b) =>
                        (b.name || '').localeCompare(a.name || '')
                    );
                case 'recent':
                default:
                    return [...projectList].sort((a, b) => {
                        if (a.created_at && b.created_at) {
                            return new Date(b.created_at) - new Date(a.created_at);
                        }
                        return (b.id || 0) - (a.id || 0);
                    });
            }
        };

        return {
            ownedProjects: sortProjects(filterProjects(owned)),
            memberProjects: sortProjects(filterProjects(member)),
        };
    }, [projects, query, sort]);

    const filtered = [...ownedProjects, ...memberProjects];
    const projectCount = Array.isArray(projects) ? projects.length : 0;
    // Projects actually visible given current scope (all vs owned) and search
    const displayProjects = scope === 'owned' ? ownedProjects : filtered;
    const displayCount = displayProjects.length;

    // Aggregate metrics for stats bar
    const stats = useMemo(() => {
        const aggregate = { totalTasks: 0, doneTasks: 0 };
        const all = Array.isArray(projects) ? projects : [];
        all.forEach((p) => {
            if (!p || !p.tasks) return;
            if (Array.isArray(p.tasks)) {
                aggregate.totalTasks += p.tasks.length;
                aggregate.doneTasks += p.tasks.filter((t) => t.status === 'done').length;
            } else if (typeof p.tasks === 'object') {
                const buckets = Object.values(p.tasks).filter(Array.isArray);
                buckets.forEach((arr) => {
                    aggregate.totalTasks += arr.length;
                });
                const doneArr = p.tasks.done;
                if (Array.isArray(doneArr)) aggregate.doneTasks += doneArr.length;
            }
        });
        const completion =
            aggregate.totalTasks === 0
                ? 0
                : Math.round((aggregate.doneTasks / aggregate.totalTasks) * 100);
        return {
            owned: ownedProjects.length,
            shared: memberProjects.length,
            total: projectCount,
            completion,
            tasks: aggregate.totalTasks,
        };
    }, [ownedProjects.length, memberProjects.length, projectCount, projects]);

    const handleViewChange = useCallback((_, val) => {
        if (val) setViewMode(val);
    }, []);

    // Create stats items with actual color values
    const statsItems = useMemo(
        () => [
            {
                label: t('dashboard.owner'),
                value: stats.owned,
                color: theme.palette.primary.main,
                icon: <StarIcon />,
            },
            {
                label: t('dashboard.collaborator'),
                value: stats.shared,
                color: theme.palette.secondary.main,
                icon: <GroupIcon />,
            },
            {
                label: t('dashboard.totalTasks'),
                value: stats.tasks,
                color: theme.palette.info.main,
                icon: <AutoAwesomeIcon />,
            },
            {
                label: t('dashboard.completion'),
                value: `${stats.completion}%`,
                color: theme.palette.success.main,
                icon: <AdminPanelSettingsIcon />,
            },
        ],
        [stats, theme.palette, t]
    );

    // Enhanced hero styles with modern gradient
    const heroStyles = useMemo(() => {
        return {
            background: designTokens.gradients(theme).hero,
            color: '#ffffff',
            pt: { xs: 8, md: 12 },
            pb: { xs: 8, md: 12 },
            position: 'relative',
            overflow: 'hidden',
            // Decorative layered starfield + floating orbs
            '& .decor-star': {
                position: 'absolute',
                width: 4,
                height: 4,
                borderRadius: '50%',
                background: 'radial-gradient(circle,#fff,rgba(255,255,255,0.1))',
                boxShadow: '0 0 6px 2px rgba(255,255,255,0.35)',
                opacity: 0,
                animation: 'starPop 6s ease-in-out infinite',
            },
            '& .decor-orb': {
                position: 'absolute',
                borderRadius: '50%',
                background:
                    'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.28), rgba(255,255,255,0))',
                mixBlendMode: 'overlay',
                filter: 'blur(8px)',
                transition:
                    'top 6s ease, left 6s ease, width 8s ease, height 8s ease, opacity 2s ease',
            },
            '&::before': {
                content: '""',
                position: 'absolute',
                inset: 0,
                background:
                    theme.palette.mode === 'dark'
                        ? 'linear-gradient(135deg, rgba(0,0,0,0.2) 0%, transparent 50%)'
                        : 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, transparent 50%)',
                pointerEvents: 'none',
            },
            '&::after': {
                content: '""',
                position: 'absolute',
                top: '-30%',
                left: '-10%',
                width: '140%',
                height: '160%',
                background:
                    'radial-gradient(circle at 70% 30%, rgba(255,255,255,0.18), rgba(255,255,255,0) 60%)',
                mixBlendMode: 'overlay',
                animation: 'lightSweep 18s ease-in-out infinite',
                pointerEvents: 'none',
            },
            '@media (prefers-reduced-motion: reduce)': {
                '& .decor-star, & .decor-orb': { animation: 'none', transition: 'none' },
                '&::after': { animation: 'none' },
            },
        };
    }, [theme]);

    // Enhanced filter styles with subtle elevation
    const filterPaperStyles = useMemo(
        () => ({
            p: { xs: 2.5, md: 3 },
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            borderRadius: designTokens.radii.lg,
            background: designTokens.gradients(theme).card,
            backdropFilter: `blur(${designTokens.blur.light})`,
            boxShadow: designTokens.shadows.soft,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
                boxShadow: designTokens.shadows.medium,
                transform: 'translateY(-1px)',
            },
        }),
        [theme]
    );

    // Enhanced projects paper styles
    const projectsPaperStyles = useMemo(() => {
        return {
            p: { xs: 3, md: 4 },
            borderRadius: designTokens.radii.xl,
            background: designTokens.gradients(theme).card,
            border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            boxShadow: designTokens.shadows.soft,
            backdropFilter: `blur(${designTokens.blur.light})`,
            transition: 'all 0.2s ease-in-out',
        };
    }, [theme]);

    return (
        <>
            <Head title={t('common.dashboard')} />

            <AuthenticatedLayout user={auth.user}>
                {/* AppSumo Welcome Message */}
                {appsumo_welcome && (
                    <Box
                        sx={{
                            backgroundColor: '#dcfce7',
                            borderBottom: '1px solid #bbf7d0',
                            py: 2,
                        }}
                    >
                        <Container maxWidth="lg">
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 3,
                                    backgroundColor: 'white',
                                    border: '2px solid #22c55e',
                                    borderRadius: 2,
                                    background: 'linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%)',
                                }}
                            >
                                <Stack direction="row" alignItems="center" spacing={2}>
                                    <Box
                                        sx={{
                                            width: 48,
                                            height: 48,
                                            borderRadius: '50%',
                                            backgroundColor: '#22c55e',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                        }}
                                    >
                                        <Typography sx={{ fontSize: '24px' }}>🎉</Typography>
                                    </Box>
                                    <Box sx={{ flexGrow: 1 }}>
                                        <Typography
                                            variant="h6"
                                            sx={{ fontWeight: 'bold', color: '#166534', mb: 0.5 }}
                                        >
                                            Welcome to TaskPilot - Lifetime Access Activated!
                                        </Typography>
                                        <Typography
                                            variant="body2"
                                            sx={{ color: '#166534', mb: 2 }}
                                        >
                                            {t('dashboard.appsumoWelcome')}
                                        </Typography>
                                        <Stack direction="row" spacing={2} alignItems="center">
                                            <Button
                                                variant="contained"
                                                size="small"
                                                sx={{
                                                    backgroundColor: '#22c55e',
                                                    '&:hover': { backgroundColor: '#16a34a' },
                                                }}
                                                onClick={() =>
                                                    window.open(
                                                        'https://appsumo.com/products/taskpilot',
                                                        '_blank'
                                                    )
                                                }
                                            >
                                                {t('dashboard.leaveReview')}
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                size="small"
                                                onClick={() => router.visit('/certification')}
                                            >
                                                {t('dashboard.getCertified')}
                                            </Button>
                                        </Stack>
                                    </Box>
                                </Stack>
                            </Paper>
                        </Container>
                    </Box>
                )}

                {/* Regular success message */}
                {message && !appsumo_welcome && (
                    <Box
                        sx={{
                            backgroundColor: '#dbeafe',
                            borderBottom: '1px solid #93c5fd',
                            py: 1,
                        }}
                    >
                        <Container maxWidth="lg">
                            <Typography
                                variant="body2"
                                sx={{ color: '#1e40af', textAlign: 'center' }}
                            >
                                {message}
                            </Typography>
                        </Container>
                    </Box>
                )}

                {/* Clean Hero Section */}
                <Box sx={heroStyles}>
                    <Container maxWidth="lg" sx={{ position: 'relative' }}>
                        {/* Dynamic randomized stars (client-side only) */}
                        {stars.map((star) => (
                            <Box
                                key={star.id}
                                className="decor-star"
                                sx={{
                                    top: `${star.top}%`,
                                    left: `${star.left}%`,
                                    width: star.size,
                                    height: star.size,
                                    animationDelay: `${star.delay}s`,
                                    animationDuration: `${star.duration}s`,
                                    '--drift-x': `${star.driftX}px`,
                                    '--drift-y': `${star.driftY}px`,
                                    '--twinkle-offset': star.twinkleOffset,
                                }}
                            />
                        ))}
                        {orbs.map((o) => (
                            <Box
                                key={o.id}
                                className="decor-orb"
                                sx={{
                                    top: `${o.top}%`,
                                    left: `${o.left}%`,
                                    width: o.size,
                                    height: o.size,
                                    opacity: o.opacity,
                                }}
                            />
                        ))}
                        <Stack
                            direction={{ xs: 'column', md: 'row' }}
                            spacing={4}
                            alignItems={{ xs: 'flex-start', md: 'center' }}
                            justifyContent="space-between"
                        >
                            <Box maxWidth={720}>
                                <Typography
                                    variant="h2"
                                    component="h1"
                                    fontWeight={800}
                                    sx={{
                                        mb: 3,
                                        background:
                                            'linear-gradient(135deg,#fff 0%,#f2f5ff 45%,#ffffff 80%)',
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        fontSize: { xs: '2.55rem', md: '3.6rem' },
                                        letterSpacing: '-0.025em',
                                        lineHeight: 1.05,
                                        position: 'relative',
                                        textShadow:
                                            '0 0 14px rgba(255,255,255,0.6), 0 0 38px rgba(120,160,255,0.35)',
                                        // Removed all ::after shimmer/rectangle
                                    }}
                                >
                                    {t('dashboard.welcomeBack', { name: auth.user?.name || 'Explorer' })}
                                </Typography>
                                <Typography
                                    variant="h6"
                                    sx={{
                                        color: alpha('#fff', 0.85),
                                        maxWidth: 600,
                                        fontWeight: 400,
                                        fontSize: { xs: '1.1rem', md: '1.25rem' },
                                        lineHeight: 1.6,
                                        textShadow: '0 2px 4px rgba(0,0,0,0.1)',
                                        mb: 2,
                                    }}
                                >
                                    {t('dashboard.yourWorkspace')}
                                </Typography>
                                <Stack direction="row" spacing={1.5} sx={{ mb: { xs: 3, md: 0 } }}>
                                    <Button
                                        onClick={() => setScope('owned')}
                                        size="small"
                                        startIcon={<AutoAwesomeIcon sx={{ fontSize: 18 }} />}
                                        variant={scope === 'owned' ? 'contained' : 'outlined'}
                                        sx={{
                                            borderRadius: 1.5,
                                            fontWeight: 600,
                                            textTransform: 'none',
                                            background:
                                                scope === 'owned'
                                                    ? `linear-gradient(135deg, ${alpha(theme.palette.primary.light, 0.85)}, ${theme.palette.primary.main})`
                                                    : 'rgba(255,255,255,0.06)',
                                            color:
                                                scope === 'owned'
                                                    ? '#fff'
                                                    : 'rgba(255,255,255,0.85)',
                                            boxShadow:
                                                scope === 'owned'
                                                    ? `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`
                                                    : 'none',
                                            borderColor: alpha(
                                                '#ffffff',
                                                scope === 'owned' ? 0.35 : 0.15
                                            ),
                                            px: 2.5,
                                            backdropFilter: 'blur(6px)',
                                            '&:hover': {
                                                background:
                                                    scope === 'owned'
                                                        ? `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`
                                                        : 'rgba(255,255,255,0.12)',
                                            },
                                        }}
                                    >
                                        {t('dashboard.projectsCount', { count: ownedProjects.length })}
                                    </Button>
                                    <Button
                                        onClick={() => setScope('all')}
                                        size="small"
                                        variant={scope === 'all' ? 'contained' : 'outlined'}
                                        sx={{
                                            borderRadius: 1.5,
                                            fontWeight: 600,
                                            textTransform: 'none',
                                            background:
                                                scope === 'all'
                                                    ? 'rgba(30,41,59,0.6)'
                                                    : 'rgba(255,255,255,0.06)',
                                            color:
                                                scope === 'all' ? '#fff' : 'rgba(255,255,255,0.85)',
                                            borderColor: alpha(
                                                '#ffffff',
                                                scope === 'all' ? 0.35 : 0.15
                                            ),
                                            px: 2.5,
                                            backdropFilter: 'blur(6px)',
                                            '&:hover': {
                                                background:
                                                    scope === 'all'
                                                        ? 'rgba(15,23,42,0.75)'
                                                        : 'rgba(255,255,255,0.12)',
                                            },
                                        }}
                                    >
                                        {t('dashboard.allProjectsWithCount', {
                                            count: filtered.length,
                                            defaultValue: `${t('dashboard.allProjects')} (${filtered.length})`,
                                        })}
                                    </Button>
                                </Stack>
                            </Box>

                            <Stack direction="row" spacing={2}>
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    href="/projects/create"
                                    size="large"
                                    sx={{
                                        textTransform: 'none',
                                        fontWeight: 600,
                                        fontSize: '1.1rem',
                                        px: 4,
                                        py: 1.75,
                                        borderRadius: designTokens.radii.lg,
                                        background:
                                            theme.palette.mode === 'dark'
                                                ? 'rgba(15,23,42,0.95)'
                                                : 'rgba(255, 255, 255, 0.95)',
                                        color:
                                            theme.palette.mode === 'dark'
                                                ? theme.palette.text.primary
                                                : theme.palette.primary.main,
                                        boxShadow: designTokens.shadows.medium,
                                        backdropFilter: 'blur(10px)',
                                        border:
                                            theme.palette.mode === 'dark'
                                                ? '1px solid rgba(255, 255, 255, 0.12)'
                                                : '1px solid rgba(255, 255, 255, 0.2)',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        '&:hover': {
                                            background:
                                                theme.palette.mode === 'dark'
                                                    ? 'rgba(15,23,42,1)'
                                                    : 'rgba(255, 255, 255, 1)',
                                            boxShadow: designTokens.shadows.elevated,
                                            transform: 'translateY(-2px)',
                                        },
                                    }}
                                >
                                    {t('dashboard.createProject', { defaultValue: 'Create Project' })}
                                </Button>
                            </Stack>
                        </Stack>
                    </Container>
                </Box>

                {/* Main content */}
                <Box
                    sx={{
                        py: { xs: 5, md: 7 },
                        bgcolor: 'background.default',
                        minHeight: '60vh',
                        background:
                            theme.palette.mode === 'dark'
                                ? 'radial-gradient(circle at 50% 50%, #1a1c2b 0%, #141620 100%)'
                                : 'radial-gradient(circle at 50% 50%, #f8f9ff 0%, #f0f2f9 100%)',
                    }}
                >
                    <Container maxWidth="lg">
                        <Stack spacing={4}>
                            {/* Enhanced Filter + Sort Bar */}
                            <Paper
                                elevation={0}
                                sx={{
                                    p: 3,
                                    mb: 2,
                                    borderRadius: designTokens.radii.xl,
                                    background: designTokens.gradients(theme).card,
                                    backdropFilter: `blur(${designTokens.blur.heavy})`,
                                    border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                    boxShadow: designTokens.shadows.subtle,
                                    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    '&::before': {
                                        content: '""',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        height: '1px',
                                        background: `linear-gradient(90deg, transparent, ${alpha(theme.palette.primary.main, 0.3)}, transparent)`,
                                    },
                                }}
                                aria-label="Project filters and view controls"
                            >
                                <Stack
                                    direction={{ xs: 'column', md: 'row' }}
                                    spacing={2.5}
                                    alignItems={{ xs: 'stretch', md: 'center' }}
                                    justifyContent="space-between"
                                >
                                    <Stack direction="row" alignItems="center" spacing={2} flex={1}>
                                        <SearchIcon
                                            sx={{ color: 'text.secondary', fontSize: 20 }}
                                        />
                                        <TextField
                                            fullWidth
                                            placeholder={t('dashboard.searchProjects')}
                                            value={query}
                                            onChange={handleQueryChange}
                                            size="medium"
                                            InputProps={{
                                                sx: {
                                                    borderRadius: designTokens.radii.lg,
                                                    backgroundColor: alpha(
                                                        theme.palette.background.paper,
                                                        0.8
                                                    ),
                                                    '& .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: alpha(
                                                            theme.palette.divider,
                                                            0.2
                                                        ),
                                                    },
                                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: alpha(
                                                            theme.palette.primary.main,
                                                            0.3
                                                        ),
                                                    },
                                                    '&.Mui-focused .MuiOutlinedInput-notchedOutline':
                                                    {
                                                        borderColor: theme.palette.primary.main,
                                                        borderWidth: '2px',
                                                        boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.1)}`,
                                                    },
                                                },
                                            }}
                                            sx={{
                                                maxWidth: 480,
                                                '& .MuiOutlinedInput-root': {
                                                    borderRadius: designTokens.radii.lg,
                                                },
                                            }}
                                        />
                                    </Stack>

                                    <Stack
                                        direction="row"
                                        spacing={3}
                                        alignItems="center"
                                        justifyContent={{ xs: 'space-between', md: 'flex-end' }}
                                        flexWrap="wrap"
                                        rowGap={2}
                                    >
                                        <Stack direction="row" alignItems="center" spacing={1.5}>
                                            <SortIcon
                                                sx={{ color: 'text.secondary', fontSize: 20 }}
                                            />
                                            <Select
                                                size="small"
                                                value={sort}
                                                onChange={handleSortChange}
                                                sx={{
                                                    minWidth: 180,
                                                    borderRadius: designTokens.radii.md,
                                                    '& .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: alpha(
                                                            theme.palette.divider,
                                                            0.2
                                                        ),
                                                    },
                                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                                        borderColor: alpha(
                                                            theme.palette.primary.main,
                                                            0.3
                                                        ),
                                                    },
                                                }}
                                                displayEmpty
                                                aria-label="Sort projects"
                                            >
                                                <MenuItem value="recent">{t('dashboard.sortRecent')}</MenuItem>
                                                <MenuItem value="name_asc">{t('dashboard.sortNameAsc')}</MenuItem>
                                                <MenuItem value="name_desc">{t('dashboard.sortNameDesc')}</MenuItem>
                                            </Select>
                                        </Stack>

                                        <Divider
                                            flexItem
                                            orientation="vertical"
                                            sx={{ display: { xs: 'none', md: 'block' } }}
                                        />

                                        <ToggleButtonGroup
                                            exclusive
                                            size="small"
                                            value={viewMode}
                                            onChange={handleViewChange}
                                            aria-label="Change project view mode"
                                            sx={{
                                                '& .MuiToggleButton-root': {
                                                    borderRadius: designTokens.radii.md,
                                                    border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                                                    color: 'text.secondary',
                                                    transition: 'all 0.2s ease',
                                                    px: 2,
                                                    fontWeight: 600,
                                                    textTransform: 'none',
                                                    '&:hover': {
                                                        backgroundColor: alpha(
                                                            theme.palette.primary.main,
                                                            0.08
                                                        ),
                                                        color: 'primary.main',
                                                    },
                                                    '&.Mui-selected': {
                                                        backgroundColor: theme.palette.primary.main,
                                                        color: theme.palette.primary.contrastText,
                                                        boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.3)}`,
                                                        '&:hover': {
                                                            backgroundColor:
                                                                theme.palette.primary.dark,
                                                        },
                                                    },
                                                },
                                            }}
                                        >
                                            <ToggleButton value="list" aria-label="List view">
                                                <ViewListIcon fontSize="small" sx={{ mr: 1 }} />
                                                {t('floating.list')}
                                            </ToggleButton>
                                            <ToggleButton value="grid" aria-label="Grid view">
                                                <ViewModuleIcon fontSize="small" sx={{ mr: 1 }} />
                                                {t('floating.grid')}
                                            </ToggleButton>
                                        </ToggleButtonGroup>

                                        <Button
                                            variant="contained"
                                            startIcon={<AddIcon />}
                                            href="/projects/create"
                                            sx={{
                                                textTransform: 'none',
                                                borderRadius: designTokens.radii.lg,
                                                fontWeight: 700,
                                                px: 3,
                                                py: 1.2,
                                                background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                                boxShadow: `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                '&:hover': {
                                                    transform: 'translateY(-2px)',
                                                    boxShadow: `0 6px 20px ${alpha(theme.palette.primary.main, 0.5)}`,
                                                    background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                                                },
                                            }}
                                        >
                                            {t('dashboard.createFirstProject')}
                                        </Button>
                                    </Stack>
                                </Stack>
                            </Paper>

                            {/* Compact Stats Chips */}
                            <Stack
                                direction="row"
                                spacing={2}
                                flexWrap="wrap"
                                justifyContent="center"
                                sx={{ mb: 4 }}
                                aria-label="Project statistics overview"
                            >
                                {statsItems.map((s, i) => (
                                    <Chip
                                        key={s.label}
                                        icon={
                                            <Box
                                                sx={{
                                                    width: 20,
                                                    height: 20,
                                                    borderRadius: '50%',
                                                    background: `linear-gradient(135deg, ${s.color}, ${alpha(s.color, 0.7)})`,
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    color: '#ffffff',
                                                    '& svg': { fontSize: 12 },
                                                }}
                                            >
                                                {s.icon}
                                            </Box>
                                        }
                                        label={
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: 1,
                                                }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    sx={{ fontWeight: 600, fontSize: '0.75rem' }}
                                                >
                                                    {s.label.toUpperCase()}
                                                </Typography>
                                                <Typography
                                                    variant="body2"
                                                    sx={{
                                                        fontWeight: 800,
                                                        color: s.color,
                                                        fontSize: '0.875rem',
                                                    }}
                                                >
                                                    {isClient ? s.value : '...'}
                                                </Typography>
                                            </Box>
                                        }
                                        variant="outlined"
                                        sx={{
                                            borderRadius: designTokens.radii.lg,
                                            border: `1px solid ${alpha(s.color, 0.2)}`,
                                            backgroundColor: alpha(s.color, 0.05),
                                            transition: 'all 0.4s cubic-bezier(.4,0,.2,1)',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            '&::after': {
                                                content: '""',
                                                position: 'absolute',
                                                inset: 0,
                                                background: `radial-gradient(circle at 30% 30%, ${alpha(s.color, 0.25)}, transparent 70%)`,
                                                opacity: 0,
                                                transition: 'opacity .45s ease',
                                            },
                                            '&:hover': {
                                                backgroundColor: alpha(s.color, 0.1),
                                                borderColor: alpha(s.color, 0.3),
                                                transform: 'translateY(-1px)',
                                                boxShadow: `0 4px 14px ${alpha(s.color, 0.25)}`,
                                                '&::after': { opacity: 1 },
                                            },
                                        }}
                                    />
                                ))}
                            </Stack>

                            {/* Enhanced Projects Section */}
                            <Paper elevation={0} sx={projectsPaperStyles}>
                                <Stack
                                    direction={{ xs: 'column', sm: 'row' }}
                                    spacing={2}
                                    justifyContent="space-between"
                                    alignItems={{ xs: 'flex-start', sm: 'center' }}
                                    mb={4}
                                >
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">
                                            {displayCount === 0
                                                ? t('dashboard.noProjectsFound')
                                                : t('dashboard.projectsCount', { count: displayCount })}
                                        </Typography>
                                    </Box>
                                    {query && (
                                        <Button
                                            size="small"
                                            variant="text"
                                            onClick={handleClearSearch}
                                            sx={{
                                                textTransform: 'none',
                                                fontWeight: 600,
                                            }}
                                        >
                                            {t('common.search')}
                                        </Button>
                                    )}
                                </Stack>

                                {projectCount === 0 ? (
                                    <EmptyState />
                                ) : displayCount === 0 ? (
                                    <FilteredEmptyState reset={handleClearSearch} />
                                ) : viewMode === 'grid' ? (
                                    <Grid container spacing={3} aria-label="Projects grid view">
                                        {(scope === 'owned' ? ownedProjects : ownedProjects).map(
                                            (p, idx) => (
                                                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={p.id}>
                                                    <Fade
                                                        in
                                                        timeout={500}
                                                        style={{ transitionDelay: `${idx * 50}ms` }}
                                                    >
                                                        <div>
                                                            <ProjectCard
                                                                project={p}
                                                                ownership="owner"
                                                                onDelete={askDelete}
                                                            />
                                                        </div>
                                                    </Fade>
                                                </Grid>
                                            )
                                        )}
                                        {scope === 'owned'
                                            ? null
                                            : memberProjects.map((p, idx) => (
                                                <Grid size={{ xs: 12, sm: 6, md: 4 }} key={p.id}>
                                                    <Fade
                                                        in
                                                        timeout={500}
                                                        style={{
                                                            transitionDelay: `${(idx + ownedProjects.length) * 50}ms`,
                                                        }}
                                                    >
                                                        <div>
                                                            <ProjectCard
                                                                project={p}
                                                                ownership="member"
                                                                onDelete={askDelete}
                                                            />
                                                        </div>
                                                    </Fade>
                                                </Grid>
                                            ))}
                                    </Grid>
                                ) : (
                                    <Stack spacing={3}>
                                        {/* All Projects - Visually Distinguished by Ownership */}
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                flexDirection: 'column',
                                                gap: 2,
                                            }}
                                        >
                                            {/* Owned Projects with Visual Distinction */}
                                            {(scope === 'owned'
                                                ? ownedProjects
                                                : ownedProjects
                                            ).map((p, idx) => (
                                                <Box
                                                    key={p.id}
                                                    sx={{
                                                        position: 'relative',
                                                        borderLeft: `4px solid ${theme.palette.primary.main}`,
                                                        borderRadius: 1, // 4px
                                                        background: `linear-gradient(145deg, ${alpha(theme.palette.primary.main, 0.02)}, ${alpha(theme.palette.primary.main, 0.05)})`,
                                                        boxShadow: `0 2px 8px ${alpha(theme.palette.primary.main, 0.1)}`,
                                                        overflow: 'hidden',
                                                        opacity: 0,
                                                        transform: 'translateY(8px)',
                                                        animation: 'fadeSlide 0.55s ease forwards',
                                                        animationDelay: `${0.02 + idx * 0.02}s`,
                                                        '&::before': {
                                                            content: '""',
                                                            position: 'absolute',
                                                            top: 0,
                                                            left: 0,
                                                            right: 0,
                                                            height: '2px',
                                                            background: `linear-gradient(90deg, ${theme.palette.primary.main}, transparent)`,
                                                        },
                                                        '@keyframes fadeSlide': {
                                                            to: {
                                                                opacity: 1,
                                                                transform: 'translateY(0)',
                                                            },
                                                        },
                                                    }}
                                                >
                                                    <ProjectAccordion
                                                        project={p}
                                                        ownership="owner"
                                                        rowSx={rowSx(idx)}
                                                        onDelete={askDelete}
                                                        endActions={
                                                            <ProjectActionButtons
                                                                project={p}
                                                                onDelete={askDelete}
                                                            />
                                                        }
                                                    />
                                                </Box>
                                            ))}

                                            {/* Member Projects with Visual Distinction */}
                                            {scope === 'owned'
                                                ? null
                                                : memberProjects.map((p, idx) => (
                                                    <Box
                                                        key={p.id}
                                                        sx={{
                                                            position: 'relative',
                                                            borderLeft: `4px solid ${theme.palette.secondary.main}`,
                                                            borderRadius: 1, // 4px
                                                            background: `linear-gradient(145deg, ${alpha(theme.palette.secondary.main, 0.02)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
                                                            boxShadow: `0 2px 8px ${alpha(theme.palette.secondary.main, 0.1)}`,
                                                            overflow: 'hidden',
                                                            opacity: 0,
                                                            transform: 'translateY(8px)',
                                                            animation:
                                                                'fadeSlide 0.55s ease forwards',
                                                            animationDelay: `${0.1 + idx * 0.02}s`,
                                                            '&::before': {
                                                                content: '""',
                                                                position: 'absolute',
                                                                top: 0,
                                                                left: 0,
                                                                right: 0,
                                                                height: '2px',
                                                                background: `linear-gradient(90deg, ${theme.palette.secondary.main}, transparent)`,
                                                            },
                                                            '@keyframes fadeSlide': {
                                                                to: {
                                                                    opacity: 1,
                                                                    transform: 'translateY(0)',
                                                                },
                                                            },
                                                        }}
                                                    >
                                                        <ProjectAccordion
                                                            project={p}
                                                            ownership="member"
                                                            rowSx={rowSx(
                                                                idx + ownedProjects.length
                                                            )}
                                                            onDelete={askDelete}
                                                            endActions={
                                                                <ProjectActionButtons
                                                                    project={p}
                                                                    onDelete={askDelete}
                                                                />
                                                            }
                                                        />
                                                    </Box>
                                                ))}
                                        </Box>
                                    </Stack>
                                )}
                            </Paper>
                        </Stack>
                    </Container>
                </Box>
            </AuthenticatedLayout>

            {/* Enhanced Delete confirmation dialog */}
            <Dialog
                open={confirmOpen}
                onClose={handleCloseDialog}
                aria-labelledby="delete-project-title"
                PaperProps={{
                    sx: {
                        borderRadius: designTokens.radii.lg,
                        background: theme.palette.background.paper,
                        boxShadow: designTokens.shadows.heavy,
                    },
                }}
            >
                <DialogTitle id="delete-project-title" sx={{ fontWeight: 700, fontSize: '1.5rem' }}>
                    {t('dashboard.deleteProject')}
                </DialogTitle>
                <DialogContent dividers>
                    <DialogContentText component="div" sx={{ lineHeight: 1.6, fontSize: '1.1rem' }}>
                        {projectToDelete ? (
                            <>
                                {t('dashboard.deleteConfirmation', {
                                    name: projectToDelete.name
                                })}
                            </>
                        ) : (
                            t('dashboard.areYouSure')
                        )}
                    </DialogContentText>
                </DialogContent>
                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button
                        onClick={handleCloseDialog}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: designTokens.radii.md,
                        }}
                    >
                        {t('common.cancel')}
                    </Button>
                    <Button
                        variant="contained"
                        color="error"
                        onClick={confirmDelete}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 600,
                            borderRadius: designTokens.radii.md,
                        }}
                    >
                        {t('common.delete')}
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}

// Enhanced Project Action Buttons
const ProjectActionButtons = memo(({ project, onDelete }) => {
    const { t } = useTranslation();
    const theme = useTheme();
    const [leaving, setLeaving] = useState(false);

    const handleEdit = useCallback(
        (e) => {
            e.stopPropagation();
            router.visit(`/projects/${project.id}/edit`);
        },
        [project.id]
    );

    const handleDelete = useCallback(
        (e) => {
            onDelete(e, project);
        },
        [onDelete, project]
    );

    const handleLeave = useCallback(
        async (e) => {
            e.stopPropagation();
            if (leaving) return;
            setLeaving(true);
            try {
                await router.post(
                    `/projects/${project.id}/members/leave`,
                    {},
                    {
                        preserveScroll: true,
                        onFinish: () => setLeaving(false),
                    }
                );
            } catch (err) {
                setLeaving(false);
            }
        },
        [leaving, project.id]
    );

    return (
        <Stack direction="row" spacing={1} alignItems="center">
            {project.is_owner ? (
                <Tooltip title={t('dashboard.owner')} arrow>
                    <Chip
                        size="small"
                        label={t('dashboard.owner')}
                        icon={<AdminPanelSettingsIcon sx={{ fontSize: 14 }} />}
                        sx={{
                            bgcolor: alpha(theme.palette.success.main, 0.15),
                            color: theme.palette.success.main,
                            height: 28,
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                        }}
                    />
                </Tooltip>
            ) : (
                <Tooltip
                    title={project.owner?.name ? `${t('dashboard.owner')}: ${project.owner.name}` : t('dashboard.collaborator')}
                    arrow
                >
                    <Chip
                        size="small"
                        label={t('dashboard.collaborator')}
                        icon={<GroupIcon sx={{ fontSize: 14 }} />}
                        sx={{
                            bgcolor: alpha(theme.palette.warning.main, 0.15),
                            color: theme.palette.warning.main,
                            height: 28,
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            border: `1px solid ${alpha(theme.palette.warning.main, 0.3)}`,
                        }}
                    />
                </Tooltip>
            )}
            {project.is_owner ? (
                <>
                    <Tooltip title={t('buttons.edit')} arrow>
                        <IconButton
                            size="small"
                            onClick={handleEdit}
                            aria-label="Edit project"
                            sx={{
                                width: 36,
                                height: 36,
                                background: alpha(theme.palette.primary.main, 0.1),
                                '&:hover': {
                                    background: alpha(theme.palette.primary.main, 0.2),
                                },
                            }}
                        >
                            <EditRoundedIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={t('buttons.delete')} arrow>
                        <IconButton
                            size="small"
                            onClick={handleDelete}
                            aria-label="Delete project"
                            sx={{
                                width: 36,
                                height: 36,
                                background: alpha(theme.palette.error.main, 0.1),
                                '&:hover': {
                                    background: alpha(theme.palette.error.main, 0.2),
                                },
                            }}
                            color="error"
                        >
                            <DeleteForeverIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </>
            ) : (
                <Tooltip title={t('dashboard.leaveProject', 'Leave project')} arrow>
                    <Button
                        size="small"
                        variant="outlined"
                        onClick={handleLeave}
                        disabled={leaving}
                        sx={{
                            textTransform: 'none',
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: theme.palette.error.main,
                            borderColor: alpha(theme.palette.error.main, 0.3),
                            '&:hover': {
                                borderColor: theme.palette.error.main,
                                background: alpha(theme.palette.error.main, 0.05),
                            },
                        }}
                    >
                        {leaving ? 'Leaving...' : 'Leave'}
                    </Button>
                </Tooltip>
            )}
        </Stack>
    );
});

// Enhanced Empty State
function EmptyState() {
    return (
        <Box sx={{ py: 10, px: 2, textAlign: 'center', color: 'text.secondary' }}>
            <Box
                sx={{
                    mx: 'auto',
                    width: 140,
                    height: 140,
                    mb: 4,
                    borderRadius: '50%',
                    background:
                        'radial-gradient(circle at 30% 30%, rgba(123, 104, 238, 0.1), transparent 60%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 60,
                    opacity: 0.8,
                    animation: 'pulse 2s ease-in-out infinite',
                    '@keyframes pulse': {
                        '0%, 100%': { transform: 'scale(1)' },
                        '50%': { transform: 'scale(1.05)' },
                    },
                }}
                aria-hidden
            >
                🚀
            </Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
                You have no projects yet
            </Typography>
            <Typography variant="body1" sx={{ maxWidth: 480, mx: 'auto', mb: 4 }}>
                Get started by creating your first project. Organize work, track issues, and
                collaborate efficiently.
            </Typography>
            <Button
                href="/projects/create"
                variant="contained"
                startIcon={<AddIcon />}
                sx={{
                    mt: 2,
                    textTransform: 'none',
                    fontWeight: 700,
                    fontSize: '1.1rem',
                    px: 4,
                    py: 1.5,
                    borderRadius: designTokens.radii.lg,
                }}
            >
                Create your first project
            </Button>
        </Box>
    );
}

// Enhanced Filtered Empty State
function FilteredEmptyState({ reset }) {
    return (
        <Box sx={{ py: 9, px: 2, textAlign: 'center', color: 'text.secondary' }}>
            <Box
                sx={{
                    mx: 'auto',
                    width: 130,
                    height: 130,
                    mb: 4,
                    borderRadius: '28px',
                    background:
                        'linear-gradient(145deg, rgba(123, 104, 238, 0.1), transparent 70%)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 50,
                    opacity: 0.8,
                }}
                aria-hidden
            >
                🔍
            </Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>
                No matching projects
            </Typography>
            <Typography variant="body1" sx={{ maxWidth: 480, mx: 'auto', mb: 4 }}>
                Try adjusting your search terms or reset the filters to view all projects again.
            </Typography>
            <Button
                onClick={reset}
                variant="outlined"
                sx={{
                    textTransform: 'none',
                    fontWeight: 600,
                    borderRadius: designTokens.radii.lg,
                    px: 4,
                    py: 1,
                }}
            >
                Reset filters
            </Button>
        </Box>
    );
}

// Enhanced Project Card for grid view
const ProjectCard = memo(function ProjectCard({ project, ownership, onDelete }) {
    const { t } = useTranslation();
    const theme = useTheme();
    const isOwner = project.is_owner;
    const ownerName = !isOwner && project.owner ? project.owner.name : null;

    const goto = useCallback(() => {
        router.visit(`/projects/${project.id}/tasks`);
    }, [project.id]);

    const handleDelete = useCallback(
        (e) => {
            e.stopPropagation();
            onDelete(e, project);
        },
        [onDelete, project]
    );

    // Completion estimation
    let done = 0,
        total = 0;
    if (project.tasks) {
        if (Array.isArray(project.tasks)) {
            total = project.tasks.length;
            done = project.tasks.filter((t) => t.status === 'done').length;
        } else if (typeof project.tasks === 'object') {
            Object.entries(project.tasks).forEach(([status, arr]) => {
                if (Array.isArray(arr)) {
                    total += arr.length;
                    if (status === 'done') done += arr.length;
                }
            });
        }
    }
    const pct = total === 0 ? 0 : Math.round((done / total) * 100);

    const ownershipColor = isOwner ? theme.palette.primary.main : theme.palette.secondary.main;
    const ownershipBg = isOwner
        ? alpha(theme.palette.primary.main, 0.05)
        : alpha(theme.palette.secondary.main, 0.05);

    return (
        <Card
            role="group"
            aria-label={`Project ${project.name}`}
            tabIndex={0}
            onClick={goto}
            sx={{
                position: 'relative',
                height: '100%',
                cursor: 'pointer',
                borderRadius: designTokens.radii.xl,
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                background: `linear-gradient(145deg, ${ownershipBg}, ${alpha(theme.palette.background.paper, 0.8)})`,
                backdropFilter: 'blur(20px)',
                border: `1px solid ${alpha(ownershipColor, 0.2)}`,
                borderLeft: `4px solid ${ownershipColor}`,
                boxShadow: `0 2px 12px ${alpha(ownershipColor, 0.1)}`,
                transition: 'all 0.3s ease',
                '&:hover': {
                    transform: 'translateY(-6px)',
                    boxShadow: `0 6px 24px ${alpha(ownershipColor, 0.2)}`,
                    borderColor: alpha(ownershipColor, 0.4),
                },
                '&:focus-visible': {
                    outline: `2px solid ${ownershipColor}`,
                    outlineOffset: 2,
                },
                '&::before': {
                    content: '""',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    height: '2px',
                    background: `linear-gradient(90deg, ${ownershipColor}, transparent)`,
                },
                '@media (prefers-reduced-motion: reduce)': {
                    transition: 'none',
                    '&:hover': { transform: 'none' },
                },
            }}
        >
            {/* Ownership Badge */}
            <Box
                sx={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    zIndex: 10,
                }}
            >
                <Chip
                    size="small"
                    label={isOwner ? 'OWNER' : 'COLLABORATOR'}
                    sx={{
                        fontWeight: 800,
                        fontSize: '0.65rem',
                        letterSpacing: '0.1em',
                        background: alpha(ownershipColor, 0.15),
                        color: ownershipColor,
                        border: `1px solid ${alpha(ownershipColor, 0.3)}`,
                        '& .MuiChip-label': {
                            px: 1.5,
                        },
                    }}
                />
            </Box>

            <CardContent
                sx={{ p: 3, pt: 5, display: 'flex', flexDirection: 'column', gap: 2, flexGrow: 1 }}
            >
                <Stack
                    direction="row"
                    spacing={1}
                    alignItems="flex-start"
                    justifyContent="space-between"
                >
                    <Box sx={{ minWidth: 0, flex: 1 }}>
                        <Typography
                            variant="h6"
                            sx={{
                                fontWeight: 700,
                                pr: 1,
                                lineHeight: 1.2,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 1,
                                background:
                                    theme.palette.mode === 'dark'
                                        ? `linear-gradient(90deg, ${theme.palette.text.primary}, ${alpha(theme.palette.text.primary, 0.8)})`
                                        : `linear-gradient(90deg, ${ownershipColor}, ${alpha(ownershipColor, 0.7)})`,
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                            noWrap
                            title={project.name}
                        >
                            {project.name || 'Untitled'}
                        </Typography>
                        {project.description && (
                            <Typography
                                variant="body2"
                                sx={{
                                    color: 'text.secondary',
                                    mt: 1,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 2,
                                    WebkitBoxOrient: 'vertical',
                                }}
                                title={project.description}
                            >
                                {project.description}
                            </Typography>
                        )}
                    </Box>
                </Stack>
                {ownerName && (
                    <Chip
                        size="small"
                        icon={<PersonIcon sx={{ fontSize: 14 }} />}
                        label={ownerName}
                        sx={{
                            alignSelf: 'flex-start',
                            bgcolor: alpha(theme.palette.info.main, 0.12),
                            color: theme.palette.info.main,
                            fontWeight: 600,
                            border: `1px solid ${alpha(theme.palette.info.main, 0.2)}`,
                        }}
                    />
                )}
                <Box sx={{ mt: 'auto' }}>
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            mb: 1,
                        }}
                    >
                        <Typography
                            variant="caption"
                            sx={{ fontWeight: 700, color: 'text.secondary' }}
                        >
                            Progress
                        </Typography>
                        <Typography
                            variant="caption"
                            sx={{ fontWeight: 700, color: 'text.primary' }}
                        >
                            {pct}%
                        </Typography>
                    </Box>
                    <Box
                        sx={{
                            position: 'relative',
                            height: 8,
                            bgcolor: alpha(theme.palette.primary.main, 0.15),
                            borderRadius: 4,
                            overflow: 'hidden',
                        }}
                        aria-label={`Completion ${pct}%`}
                    >
                        <Box
                            sx={{
                                position: 'absolute',
                                inset: 0,
                                width: `${pct}%`,
                                background: `linear-gradient(90deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                                transition: 'width .8s cubic-bezier(.4,0,.2,1)',
                                borderRadius: 4,
                            }}
                        />
                    </Box>
                    <Stack
                        direction="row"
                        spacing={1}
                        mt={2}
                        alignItems="center"
                        justifyContent="space-between"
                    >
                        <Typography
                            variant="caption"
                            sx={{ fontWeight: 600, color: 'text.secondary' }}
                        >
                            {done} of {total} tasks
                        </Typography>
                        {isOwner ? (
                            <Tooltip title={t('dashboard.deleteProject')} arrow>
                                <IconButton
                                    size="small"
                                    onClick={handleDelete}
                                    aria-label={`Delete ${project.name}`}
                                    sx={{
                                        background: alpha(theme.palette.error.main, 0.1),
                                        '&:hover': {
                                            background: alpha(theme.palette.error.main, 0.2),
                                        },
                                    }}
                                >
                                    <DeleteForeverIcon fontSize="small" />
                                </IconButton>
                            </Tooltip>
                        ) : (
                            <Tooltip title={t('dashboard.leaveProject')} arrow>
                                <Button
                                    size="small"
                                    variant="text"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        router.post(`/projects/${project.id}/members/leave`, {});
                                    }}
                                    sx={{
                                        textTransform: 'none',
                                        fontSize: '0.7rem',
                                        fontWeight: 700,
                                        color: theme.palette.error.main,
                                    }}
                                >
                                    Leave
                                </Button>
                            </Tooltip>
                        )}
                    </Stack>
                </Box>
            </CardContent>
        </Card>
    );
});

/* Global keyframe style injection (scoped via sx selectors) */
// We co-locate keyframe names used in sx animations to avoid scattering.
// MUI will handle vendor prefixing where required.
// These are referenced inside sx objects above (titleSheen, starPop, orbFloat, shardDrift, lightSweep)
// Because we're not using a global stylesheet here, we can inject via a style tag once (idempotent guard).
if (typeof document !== 'undefined' && !document.getElementById('dashboard-anim-keyframes')) {
    const style = document.createElement('style');
    style.id = 'dashboard-anim-keyframes';
    style.innerHTML = `
    @keyframes titleSheen { 
    0% { background-position: 220% 50%; opacity: .85; }
    45% { opacity: 1; }
    100% { background-position: -60% 50%; opacity: .9; }
    }
    @keyframes starPop { 
    0% { transform: translate3d(0,0,0) scale(.2); opacity: 0; }
    8% { opacity: 1; transform: translate3d(var(--drift-x,0), var(--drift-y,0),0) scale(1); }
    60% { opacity: .9; }
    90% { opacity: .15; }
    100% { opacity: 0; transform: translate3d(calc(var(--drift-x,0)*1.2), calc(var(--drift-y,0)*1.2),0) scale(.2); }
    }
    @keyframes orbFloat { 
        0% { transform: translate3d(0,0,0) scale(1); }
        50% { transform: translate3d(30px,-20px,0) scale(1.05); }
        100% { transform: translate3d(0,0,0) scale(1); }
    }
    @keyframes shardDrift { 
        0% { transform: translate3d(0,0,0) rotate(25deg); }
        50% { transform: translate3d(-40px,25px,0) rotate(35deg); }
        100% { transform: translate3d(0,0,0) rotate(25deg); }
    }
    @keyframes lightSweep { 
        0%, 85% { opacity: 0; transform: translateX(-10%) translateY(0); }
        40% { opacity: 1; }
        60% { opacity: .5; }
        100% { opacity: 0; transform: translateX(8%) translateY(-2%); }
    }`;
    document.head.appendChild(style);
}
