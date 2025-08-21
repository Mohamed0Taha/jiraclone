// resources/js/Pages/Projects/Edit.jsx
import React, { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { Head, useForm, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    alpha,
    Alert,
    Box,
    Breadcrumbs,
    Button,
    Chip,
    Container,
    Divider,
    Fade,
    Grid,
    IconButton,
    InputAdornment,
    LinearProgress,
    Link as MuiLink,
    MenuItem,
    Paper,
    Stack,
    Step,
    StepLabel,
    Stepper,
    TextField,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import KeyIcon from '@mui/icons-material/Key';
import DescriptionIcon from '@mui/icons-material/Description';
import TitleIcon from '@mui/icons-material/Title';
import CategoryRoundedIcon from '@mui/icons-material/CategoryRounded';
import PublicRoundedIcon from '@mui/icons-material/PublicRounded';
import MapRoundedIcon from '@mui/icons-material/MapRounded';
import GroupsRoundedIcon from '@mui/icons-material/GroupsRounded';
import MonetizationOnRoundedIcon from '@mui/icons-material/MonetizationOnRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import FlagRoundedIcon from '@mui/icons-material/FlagRounded';
import WarningAmberRoundedIcon from '@mui/icons-material/WarningAmberRounded';
import CalendarMonthRoundedIcon from '@mui/icons-material/CalendarMonthRounded';
import RestartAltRoundedIcon from '@mui/icons-material/RestartAltRounded';

export default function Edit({ auth, project }) {
    const theme = useTheme();

    const { data, setData, patch, processing, errors, reset, transform } = useForm({
        name: project?.name || '',
        key: project?.key || '',
        description: project?.description || '',
        start_date: project?.start_date || '',
        end_date: project?.end_date || '',
        meta: {
            project_type: project?.meta?.project_type || '',
            domain: project?.meta?.domain || '',
            area: project?.meta?.area || '',
            location: project?.meta?.location || '',
            team_size: project?.meta?.team_size ?? '',
            budget: project?.meta?.budget || '',
            primary_stakeholder: project?.meta?.primary_stakeholder || '',
            objectives: project?.meta?.objectives || '',
            constraints: project?.meta?.constraints || '',
        },
    });

    // Ensure KEY stays uppercase
    useEffect(() => {
        transform((d) => ({
            ...d,
            key: (d.key || '')
                .toUpperCase()
                .replace(/[^A-Z0-9]/g, '')
                .slice(0, 12),
        }));
    }, [transform]);

    const [activeStep, setActiveStep] = useState(0);

    const steps = ['Basics', 'Context', 'Description & Preview'];

    const next = () => setActiveStep((s) => Math.min(steps.length - 1, s + 1));
    const back = () => setActiveStep((s) => Math.max(0, s - 1));

    const submit = (e) => {
        e.preventDefault();
        patch(route('projects.update', project.id), {
            preserveScroll: true,
            onSuccess: () => {},
        });
    };

    const gradient = `linear-gradient(115deg, ${alpha(
        theme.palette.primary.main,
        0.85
    )} 0%, ${alpha(theme.palette.secondary.main, 0.8)} 60%, ${alpha(
        theme.palette.primary.dark,
        0.85
    )} 100%)`;

    const SummaryPreview = useMemo(() => {
        const ls = [];
        const m = data.meta || {};
        if (m.project_type) ls.push(`Type: ${m.project_type}`);
        if (m.domain) ls.push(`Domain: ${m.domain}`);
        if (m.area) ls.push(`Area: ${m.area}`);
        if (m.location) ls.push(`Location: ${m.location}`);
        if (m.team_size) ls.push(`Team size: ${m.team_size}`);
        if (data.start_date) ls.push(`Start: ${data.start_date}`);
        if (data.end_date) ls.push(`End: ${data.end_date}`);
        if (m.budget) ls.push(`Budget: ${m.budget}`);
        if (m.primary_stakeholder) ls.push(`Primary stakeholder: ${m.primary_stakeholder}`);
        if (m.objectives) ls.push(`Objectives: ${m.objectives}`);
        if (m.constraints) ls.push(`Constraints: ${m.constraints}`);

        return (
            <Box
                sx={{
                    mt: 2,
                    px: 2,
                    py: 1.5,
                    borderRadius: 2,
                    border: `1px dashed ${alpha(theme.palette.primary.main, 0.35)}`,
                    background: alpha(theme.palette.primary.main, 0.05),
                }}
            >
                {ls.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                        No context set yet.
                    </Typography>
                ) : (
                    <Box>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>
                            Context Summary:
                        </Typography>
                        {ls.map((line, i) => (
                            <Typography key={i} variant="body2" sx={{ display: 'block' }}>
                                • {line}
                            </Typography>
                        ))}
                    </Box>
                )}
            </Box>
        );
    }, [data, theme]);

    return (
        <>
            <Head title={`Edit Project – ${project?.name || ''}`} />
            <AuthenticatedLayout user={auth?.user}>
                {/* Hero */}
                <Box
                    sx={{
                        background: gradient,
                        color: '#fff',
                        pt: { xs: 7, md: 9 },
                        pb: { xs: 8, md: 10 },
                        position: 'relative',
                        overflow: 'hidden',
                    }}
                >
                    <Box
                        aria-hidden
                        sx={{
                            position: 'absolute',
                            top: -120,
                            left: -80,
                            width: 440,
                            height: 440,
                            borderRadius: '50%',
                            background: alpha('#fff', 0.12),
                            filter: 'blur(90px)',
                        }}
                    />
                    <Box
                        aria-hidden
                        sx={{
                            position: 'absolute',
                            bottom: -140,
                            right: -120,
                            width: 500,
                            height: 500,
                            borderRadius: '50%',
                            background: alpha('#fff', 0.14),
                            filter: 'blur(100px)',
                        }}
                    />
                    <Container maxWidth="md" sx={{ position: 'relative' }}>
                        <Breadcrumbs
                            aria-label="breadcrumb"
                            sx={{
                                '& a, & .MuiTypography-root': {
                                    color: alpha('#fff', 0.9),
                                    fontSize: 14,
                                },
                            }}
                        >
                            <MuiLink
                                underline="hover"
                                color="inherit"
                                href="/dashboard"
                                sx={{ fontWeight: 500 }}
                            >
                                Dashboard
                            </MuiLink>
                            <MuiLink
                                underline="hover"
                                color="inherit"
                                href="/projects"
                                sx={{ fontWeight: 500 }}
                            >
                                Projects
                            </MuiLink>
                            <Typography color="inherit" sx={{ fontWeight: 600 }}>
                                Edit
                            </Typography>
                        </Breadcrumbs>

                        <Typography
                            variant="h3"
                            fontWeight={700}
                            sx={{
                                mt: 3,
                                letterSpacing: '-0.5px',
                                textShadow: '0 4px 22px rgba(0,0,0,0.25)',
                            }}
                        >
                            Edit Project
                        </Typography>
                        <Typography
                            variant="h6"
                            sx={{ mt: 2, maxWidth: 720, color: alpha('#fff', 0.92) }}
                        >
                            Update the project basics, context, and description. Your changes will
                            improve AI suggestions across the app.
                        </Typography>
                        <Stack direction="row" spacing={1.5} mt={3} flexWrap="wrap">
                            <Chip
                                icon={<AutoAwesomeIcon />}
                                label="Context enhances AI"
                                sx={{
                                    bgcolor: alpha('#000', 0.25),
                                    color: '#fff',
                                    '& .MuiChip-icon': { color: '#fff' },
                                    backdropFilter: 'blur(4px)',
                                }}
                            />
                            <Chip
                                label="Changes are saved securely"
                                sx={{
                                    bgcolor: alpha('#fff', 0.16),
                                    color: '#fff',
                                    backdropFilter: 'blur(4px)',
                                }}
                            />
                        </Stack>
                    </Container>
                </Box>

                {/* Form Section */}
                <Box
                    sx={{ bgcolor: 'background.default', py: { xs: 5, md: 8 }, minHeight: '60vh' }}
                >
                    <Container maxWidth="md">
                        <Fade in timeout={500}>
                            <Paper
                                elevation={0}
                                sx={{
                                    p: { xs: 3, sm: 5 },
                                    borderRadius: 4,
                                    position: 'relative',
                                    border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                                    background:
                                        theme.palette.mode === 'light'
                                            ? 'linear-gradient(145deg,#ffffff,#f8f9fb)'
                                            : alpha(theme.palette.background.paper, 0.7),
                                    backdropFilter: 'blur(6px)',
                                    boxShadow:
                                        theme.palette.mode === 'light'
                                            ? '0 4px 18px -4px rgba(0,0,0,.12)'
                                            : '0 4px 18px -6px rgba(0,0,0,.7)',
                                    overflow: 'hidden',
                                }}
                            >
                                {processing && (
                                    <LinearProgress
                                        sx={{
                                            position: 'absolute',
                                            left: 0,
                                            top: 0,
                                            width: '100%',
                                            borderTopLeftRadius: 16,
                                            borderTopRightRadius: 16,
                                        }}
                                    />
                                )}

                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={1}
                                    mb={2}
                                    sx={{ flexWrap: 'wrap' }}
                                >
                                    <IconButton
                                        aria-label="Back to projects"
                                        size="small"
                                        href={`/projects/${project.id}/tasks`}
                                        sx={{
                                            bgcolor: alpha(theme.palette.primary.main, 0.08),
                                            '&:hover': {
                                                bgcolor: alpha(theme.palette.primary.main, 0.18),
                                            },
                                        }}
                                    >
                                        <ArrowBackIcon fontSize="small" />
                                    </IconButton>
                                    <Typography variant="h5" fontWeight={700}>
                                        Project Details
                                    </Typography>
                                </Stack>

                                <Divider sx={{ mb: 3 }} />

                                <Stepper activeStep={activeStep} alternativeLabel sx={{ mb: 4 }}>
                                    {steps.map((label) => (
                                        <Step key={label}>
                                            <StepLabel>{label}</StepLabel>
                                        </Step>
                                    ))}
                                </Stepper>

                                <Box
                                    component="form"
                                    onSubmit={submit}
                                    noValidate
                                    autoComplete="off"
                                >
                                    {activeStep === 0 && (
                                        <Stack spacing={3}>
                                            <TextField
                                                label="Project Name"
                                                required
                                                value={data.name}
                                                onChange={(e) => setData('name', e.target.value)}
                                                error={Boolean(errors.name)}
                                                helperText={errors.name}
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment position="start">
                                                            <TitleIcon fontSize="small" />
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />

                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        label="Project Key"
                                                        placeholder="ABC"
                                                        value={data.key}
                                                        onChange={(e) =>
                                                            setData('key', e.target.value)
                                                        }
                                                        error={Boolean(errors.key)}
                                                        helperText={
                                                            errors.key ||
                                                            'Uppercase letters & digits only (max 12).'
                                                        }
                                                        InputProps={{
                                                            startAdornment: (
                                                                <InputAdornment position="start">
                                                                    <KeyIcon fontSize="small" />
                                                                </InputAdornment>
                                                            ),
                                                            inputProps: {
                                                                style: { letterSpacing: '2px' },
                                                            },
                                                        }}
                                                    />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        label="Team Size"
                                                        type="number"
                                                        value={data.meta.team_size}
                                                        onChange={(e) =>
                                                            setData('meta', {
                                                                ...data.meta,
                                                                team_size: e.target.value
                                                                    ? Number(e.target.value)
                                                                    : '',
                                                            })
                                                        }
                                                        error={Boolean(errors?.['meta.team_size'])}
                                                        helperText={errors?.['meta.team_size']}
                                                        InputProps={{
                                                            startAdornment: (
                                                                <InputAdornment position="start">
                                                                    <GroupsRoundedIcon fontSize="small" />
                                                                </InputAdornment>
                                                            ),
                                                        }}
                                                    />
                                                </Grid>
                                            </Grid>

                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        label="Start Date"
                                                        type="date"
                                                        value={data.start_date || ''}
                                                        onChange={(e) =>
                                                            setData('start_date', e.target.value)
                                                        }
                                                        error={Boolean(errors.start_date)}
                                                        helperText={errors.start_date}
                                                        InputLabelProps={{ shrink: true }}
                                                        InputProps={{
                                                            startAdornment: (
                                                                <InputAdornment position="start">
                                                                    <CalendarMonthRoundedIcon fontSize="small" />
                                                                </InputAdornment>
                                                            ),
                                                        }}
                                                    />
                                                </Grid>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        label="End Date"
                                                        type="date"
                                                        value={data.end_date || ''}
                                                        onChange={(e) =>
                                                            setData('end_date', e.target.value)
                                                        }
                                                        error={Boolean(errors.end_date)}
                                                        helperText={errors.end_date}
                                                        InputLabelProps={{ shrink: true }}
                                                        InputProps={{
                                                            startAdornment: (
                                                                <InputAdornment position="start">
                                                                    <CalendarMonthRoundedIcon fontSize="small" />
                                                                </InputAdornment>
                                                            ),
                                                        }}
                                                    />
                                                </Grid>
                                            </Grid>

                                            <Stack
                                                direction="row"
                                                justifyContent="flex-end"
                                                spacing={1.5}
                                                mt={1}
                                            >
                                                <Button
                                                    variant="contained"
                                                    onClick={next}
                                                    sx={{ textTransform: 'none', fontWeight: 700 }}
                                                >
                                                    Next
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    )}

                                    {activeStep === 1 && (
                                        <Stack spacing={3}>
                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        label="Project Type"
                                                        value={data.meta.project_type}
                                                        onChange={(e) =>
                                                            setData('meta', {
                                                                ...data.meta,
                                                                project_type: e.target.value,
                                                            })
                                                        }
                                                        error={Boolean(
                                                            errors?.['meta.project_type']
                                                        )}
                                                        helperText={errors?.['meta.project_type']}
                                                        InputProps={{
                                                            startAdornment: (
                                                                <InputAdornment position="start">
                                                                    <CategoryRoundedIcon fontSize="small" />
                                                                </InputAdornment>
                                                            ),
                                                        }}
                                                        select
                                                    >
                                                        <MenuItem value="">—</MenuItem>
                                                        <MenuItem value="Software">
                                                            Software
                                                        </MenuItem>
                                                        <MenuItem value="Marketing">
                                                            Marketing
                                                        </MenuItem>
                                                        <MenuItem value="Construction">
                                                            Construction
                                                        </MenuItem>
                                                        <MenuItem value="Event">Event</MenuItem>
                                                        <MenuItem value="Research">
                                                            Research
                                                        </MenuItem>
                                                        <MenuItem value="Operations">
                                                            Operations
                                                        </MenuItem>
                                                        <MenuItem value="Other">Other</MenuItem>
                                                    </TextField>
                                                </Grid>

                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        label="Domain / Industry"
                                                        value={data.meta.domain}
                                                        onChange={(e) =>
                                                            setData('meta', {
                                                                ...data.meta,
                                                                domain: e.target.value,
                                                            })
                                                        }
                                                        error={Boolean(errors?.['meta.domain'])}
                                                        helperText={errors?.['meta.domain']}
                                                        InputProps={{
                                                            startAdornment: (
                                                                <InputAdornment position="start">
                                                                    <PublicRoundedIcon fontSize="small" />
                                                                </InputAdornment>
                                                            ),
                                                        }}
                                                    />
                                                </Grid>
                                            </Grid>

                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        label="Area / Department"
                                                        value={data.meta.area}
                                                        onChange={(e) =>
                                                            setData('meta', {
                                                                ...data.meta,
                                                                area: e.target.value,
                                                            })
                                                        }
                                                        error={Boolean(errors?.['meta.area'])}
                                                        helperText={errors?.['meta.area']}
                                                        InputProps={{
                                                            startAdornment: (
                                                                <InputAdornment position="start">
                                                                    <MapRoundedIcon fontSize="small" />
                                                                </InputAdornment>
                                                            ),
                                                        }}
                                                    />
                                                </Grid>

                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        label="Location"
                                                        value={data.meta.location}
                                                        onChange={(e) =>
                                                            setData('meta', {
                                                                ...data.meta,
                                                                location: e.target.value,
                                                            })
                                                        }
                                                        error={Boolean(errors?.['meta.location'])}
                                                        helperText={errors?.['meta.location']}
                                                        InputProps={{
                                                            startAdornment: (
                                                                <InputAdornment position="start">
                                                                    <MapRoundedIcon fontSize="small" />
                                                                </InputAdornment>
                                                            ),
                                                        }}
                                                    />
                                                </Grid>
                                            </Grid>

                                            <Grid container spacing={2}>
                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        label="Budget"
                                                        value={data.meta.budget}
                                                        onChange={(e) =>
                                                            setData('meta', {
                                                                ...data.meta,
                                                                budget: e.target.value,
                                                            })
                                                        }
                                                        error={Boolean(errors?.['meta.budget'])}
                                                        helperText={errors?.['meta.budget']}
                                                        InputProps={{
                                                            startAdornment: (
                                                                <InputAdornment position="start">
                                                                    <MonetizationOnRoundedIcon fontSize="small" />
                                                                </InputAdornment>
                                                            ),
                                                        }}
                                                    />
                                                </Grid>

                                                <Grid item xs={12} sm={6}>
                                                    <TextField
                                                        label="Primary Stakeholder"
                                                        value={data.meta.primary_stakeholder}
                                                        onChange={(e) =>
                                                            setData('meta', {
                                                                ...data.meta,
                                                                primary_stakeholder: e.target.value,
                                                            })
                                                        }
                                                        error={Boolean(
                                                            errors?.['meta.primary_stakeholder']
                                                        )}
                                                        helperText={
                                                            errors?.['meta.primary_stakeholder']
                                                        }
                                                        InputProps={{
                                                            startAdornment: (
                                                                <InputAdornment position="start">
                                                                    <PersonRoundedIcon fontSize="small" />
                                                                </InputAdornment>
                                                            ),
                                                        }}
                                                    />
                                                </Grid>
                                            </Grid>

                                            <TextField
                                                label="Objectives"
                                                value={data.meta.objectives}
                                                onChange={(e) =>
                                                    setData('meta', {
                                                        ...data.meta,
                                                        objectives: e.target.value,
                                                    })
                                                }
                                                error={Boolean(errors?.['meta.objectives'])}
                                                helperText={errors?.['meta.objectives']}
                                                multiline
                                                minRows={3}
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment
                                                            position="start"
                                                            sx={{ alignSelf: 'flex-start', mt: 1 }}
                                                        >
                                                            <FlagRoundedIcon fontSize="small" />
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />

                                            <TextField
                                                label="Constraints"
                                                value={data.meta.constraints}
                                                onChange={(e) =>
                                                    setData('meta', {
                                                        ...data.meta,
                                                        constraints: e.target.value,
                                                    })
                                                }
                                                error={Boolean(errors?.['meta.constraints'])}
                                                helperText={errors?.['meta.constraints']}
                                                multiline
                                                minRows={3}
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment
                                                            position="start"
                                                            sx={{ alignSelf: 'flex-start', mt: 1 }}
                                                        >
                                                            <WarningAmberRoundedIcon fontSize="small" />
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />

                                            <Stack
                                                direction="row"
                                                justifyContent="space-between"
                                                spacing={1.5}
                                                mt={1}
                                            >
                                                <Button
                                                    variant="outlined"
                                                    onClick={back}
                                                    sx={{ textTransform: 'none', fontWeight: 600 }}
                                                >
                                                    Back
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    onClick={next}
                                                    sx={{ textTransform: 'none', fontWeight: 700 }}
                                                >
                                                    Next
                                                </Button>
                                            </Stack>
                                        </Stack>
                                    )}

                                    {activeStep === 2 && (
                                        <Stack spacing={3}>
                                            <Alert
                                                severity="info"
                                                icon={<AutoAwesomeIcon fontSize="small" />}
                                                sx={{
                                                    borderRadius: 3,
                                                    bgcolor:
                                                        theme.palette.mode === 'light'
                                                            ? alpha(theme.palette.info.light, 0.25)
                                                            : alpha(theme.palette.info.dark, 0.35),
                                                }}
                                            >
                                                The context below will be appended to your
                                                description as a structured summary to help AI
                                                features.
                                            </Alert>

                                            <TextField
                                                label="Project Description"
                                                placeholder="Purpose, scope, goals, success criteria..."
                                                value={data.description}
                                                onChange={(e) =>
                                                    setData('description', e.target.value)
                                                }
                                                error={Boolean(errors.description)}
                                                helperText={errors.description}
                                                multiline
                                                minRows={5}
                                                InputProps={{
                                                    startAdornment: (
                                                        <InputAdornment
                                                            position="start"
                                                            sx={{ alignSelf: 'flex-start', mt: 1 }}
                                                        >
                                                            <DescriptionIcon
                                                                fontSize="small"
                                                                sx={{ mt: '2px' }}
                                                            />
                                                        </InputAdornment>
                                                    ),
                                                }}
                                            />

                                            {SummaryPreview}

                                            <Stack
                                                direction="row"
                                                justifyContent="space-between"
                                                spacing={1.5}
                                                mt={1}
                                            >
                                                <Button
                                                    variant="outlined"
                                                    onClick={back}
                                                    sx={{ textTransform: 'none', fontWeight: 600 }}
                                                >
                                                    Back
                                                </Button>
                                                <Stack direction="row" spacing={1.5}>
                                                    <Button
                                                        type="button"
                                                        variant="text"
                                                        color="warning"
                                                        disabled={processing}
                                                        onClick={() => {
                                                            reset();
                                                            setData('name', project?.name || '');
                                                            setData('key', project?.key || '');
                                                            setData(
                                                                'description',
                                                                project?.description || ''
                                                            );
                                                            setData(
                                                                'start_date',
                                                                project?.start_date || ''
                                                            );
                                                            setData(
                                                                'end_date',
                                                                project?.end_date || ''
                                                            );
                                                            setData('meta', {
                                                                project_type:
                                                                    project?.meta?.project_type ||
                                                                    '',
                                                                domain: project?.meta?.domain || '',
                                                                area: project?.meta?.area || '',
                                                                location:
                                                                    project?.meta?.location || '',
                                                                team_size:
                                                                    project?.meta?.team_size ?? '',
                                                                budget: project?.meta?.budget || '',
                                                                primary_stakeholder:
                                                                    project?.meta
                                                                        ?.primary_stakeholder || '',
                                                                objectives:
                                                                    project?.meta?.objectives || '',
                                                                constraints:
                                                                    project?.meta?.constraints ||
                                                                    '',
                                                            });
                                                        }}
                                                        startIcon={<RestartAltRoundedIcon />}
                                                        sx={{ textTransform: 'none' }}
                                                    >
                                                        Reset changes
                                                    </Button>
                                                    <Button
                                                        type="submit"
                                                        variant="contained"
                                                        startIcon={<SaveIcon />}
                                                        disabled={processing}
                                                        sx={{
                                                            textTransform: 'none',
                                                            fontWeight: 700,
                                                            px: 3,
                                                            boxShadow:
                                                                '0 6px 18px -6px rgba(0,0,0,.25), 0 8px 32px -12px rgba(0,0,0,.25)',
                                                        }}
                                                    >
                                                        {processing ? 'Saving...' : 'Save Changes'}
                                                    </Button>
                                                </Stack>
                                            </Stack>
                                        </Stack>
                                    )}
                                </Box>
                            </Paper>
                        </Fade>
                    </Container>
                </Box>
            </AuthenticatedLayout>
        </>
    );
}
