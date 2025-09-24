import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useForm, Head } from '@inertiajs/react';
import {
    Box,
    Button,
    Card,
    CardContent,
    Container,
    Grid,
    TextField,
    Typography,
    Stack,
    Paper,
    useTheme,
    alpha,
    Chip,
    Divider,
} from '@mui/material';
import {
    Add as AddIcon,
    Folder as FolderIcon,
    FolderOpen as FolderOpenIcon,
    Person as PersonIcon,
    AdminPanelSettings as AdminIcon,
} from '@mui/icons-material';
import CrownIcon from '@mui/icons-material/WorkspacePremiumRounded';

import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

export default function ProjectsIndex({ projects, auth }) {
    const theme = useTheme();
    const { t } = useTranslation();
    const [showForm, setShowForm] = useState(projects.length === 0);
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/projects');
    };

    // Separate owned and member projects
    const ownedProjects = projects.filter((p) => p.is_owner);
    const memberProjects = projects.filter((p) => !p.is_owner);

    const getRoleIcon = (role) => {
        switch (role) {
            case 'owner':
                return <CrownIcon sx={{ fontSize: 16 }} />;
            case 'admin':
                return <AdminIcon sx={{ fontSize: 16 }} />;
            default:
                return <PersonIcon sx={{ fontSize: 16 }} />;
        }
    };

    const getRoleColor = (role) => {
        switch (role) {
            case 'owner':
                return 'warning';
            case 'admin':
                return 'primary';
            default:
                return 'default';
        }
    };

    const ProjectCard = ({ project }) => (
        <Grid size={{ xs: 12, sm: 6, md: 4 }} key={project.id}>
            <Card
                sx={{
                    height: '100%',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    borderRadius: theme.shape.borderRadius,
                    '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: theme.shadows[8],
                        borderColor: theme.palette.primary.main,
                    },
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                }}
                onClick={() => (window.location.href = `/projects/${project.id}`)}
            >
                <CardContent sx={{ p: 3 }}>
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
                        <Box
                            sx={{
                                p: 1.5,
                                borderRadius: 2,
                                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.2)}, ${alpha(theme.palette.primary.light, 0.1)})`,
                                color: theme.palette.primary.main,
                            }}
                        >
                            <FolderIcon sx={{ fontSize: 24 }} />
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0 }}>
                            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
                                <Typography
                                    variant="h6"
                                    component="h2"
                                    fontWeight={600}
                                    noWrap
                                    title={project.name}
                                    sx={{ flex: 1 }}
                                >
                                    {project.name}
                                </Typography>
                                {/* Show DRAFT status for draft projects, otherwise show user role */}
                                {project.status === 'draft' ? (
                                    <Chip
                                        label="DRAFT"
                                        size="small"
                                        color="warning"
                                        sx={{ textTransform: 'uppercase', fontWeight: 600 }}
                                    />
                                ) : (
                                    <Chip
                                        icon={getRoleIcon(project.user_role)}
                                        label={project.user_role}
                                        size="small"
                                        color={getRoleColor(project.user_role)}
                                        sx={{ textTransform: 'capitalize' }}
                                    />
                                )}
                            </Stack>
                            {project.description && (
                                <Typography
                                    variant="body2"
                                    color="text.secondary"
                                    sx={{
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                    }}
                                >
                                    {project.description}
                                </Typography>
                            )}
                        </Box>
                    </Stack>
                </CardContent>
            </Card>
        </Grid>
    );

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title={t('dashboard.myProjects')} />
            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h3" component="h1" fontWeight={700} sx={{ mb: 2 }}>
                        Your Projects
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Manage and organize your work with TaskPilot projects
                    </Typography>
                </Box>

                {projects.length === 0 ? (
                    <Paper
                        sx={{
                            textAlign: 'center',
                            py: 10,
                            px: 4,
                            background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.secondary.main, 0.05)})`,
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                            borderRadius: 4,
                        }}
                    >
                        <FolderOpenIcon
                            sx={{ fontSize: 80, color: theme.palette.primary.main, mb: 2 }}
                        />
                        <Typography variant="h5" sx={{ mb: 2 }}>
                            No projects yet
                        </Typography>
                        <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                            Create your first project to get started with TaskPilot
                        </Typography>
                        {!showForm && (
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<AddIcon />}
                                onClick={() => setShowForm(true)}
                                sx={{
                                    px: 4,
                                    py: 1.5,
                                    borderRadius: theme.shape.borderRadius,
                                    background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                    boxShadow: theme.shadows[4],
                                    '&:hover': {
                                        background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                                        boxShadow: theme.shadows[8],
                                    },
                                }}
                            >
                                Create Your First Project
                            </Button>
                        )}
                    </Paper>
                ) : (
                    <Box>
                        {/* Owned Projects Section */}
                        {ownedProjects.length > 0 && (
                            <Box sx={{ mb: 4 }}>
                                <Typography
                                    variant="h5"
                                    fontWeight={600}
                                    sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                                >
                                    <CrownIcon color="warning" />
                                    My Projects ({ownedProjects.length})
                                </Typography>
                                <Grid container spacing={3}>
                                    {ownedProjects.map((project) => (
                                        <ProjectCard
                                            key={`owned-${project.id}`}
                                            project={project}
                                        />
                                    ))}
                                </Grid>
                            </Box>
                        )}

                        {/* Member Projects Section */}
                        {memberProjects.length > 0 && (
                            <Box>
                                {ownedProjects.length > 0 && <Divider sx={{ my: 4 }} />}
                                <Typography
                                    variant="h5"
                                    fontWeight={600}
                                    sx={{ mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}
                                >
                                    <PersonIcon color="primary" />
                                    Shared with Me ({memberProjects.length})
                                </Typography>
                                <Grid container spacing={3}>
                                    {memberProjects.map((project) => (
                                        <ProjectCard
                                            key={`member-${project.id}`}
                                            project={project}
                                        />
                                    ))}
                                </Grid>
                            </Box>
                        )}

                        {/* Show all projects together if no separation needed */}
                        {ownedProjects.length === 0 && memberProjects.length === 0 && (
                            <Grid container spacing={3}>
                                {projects.map((project) => (
                                    <ProjectCard key={project.id} project={project} />
                                ))}
                            </Grid>
                        )}
                    </Box>
                )}

                {showForm && (
                    <Card sx={{ mt: 4, borderRadius: theme.shape.borderRadius }}>
                        <CardContent sx={{ p: 4 }}>
                            <Typography variant="h5" sx={{ mb: 3 }}>
                                {t('projects.createNewProjectTitle')}
                            </Typography>
                            <Box
                                component="form"
                                onSubmit={submit}
                                sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}
                            >
                                <TextField
                                    fullWidth
                                    label={t('projects.basics.nameLabel')}
                                    value={data.name}
                                    onChange={(e) => setData('name', e.target.value)}
                                    error={!!errors.name}
                                    helperText={errors.name}
                                    required
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: theme.shape.borderRadius,
                                        },
                                    }}
                                />

                                <TextField
                                    fullWidth
                                    label={t('projects.basics.descriptionLabel')}
                                    value={data.description}
                                    onChange={(e) => setData('description', e.target.value)}
                                    error={!!errors.description}
                                    helperText={errors.description}
                                    multiline
                                    rows={3}
                                    sx={{
                                        '& .MuiOutlinedInput-root': {
                                            borderRadius: theme.shape.borderRadius,
                                        },
                                    }}
                                />

                                <Stack direction="row" spacing={2} justifyContent="flex-end">
                                    <Button
                                        variant="outlined"
                                        onClick={() => setShowForm(false)}
                                        sx={{ borderRadius: theme.shape.borderRadius }}
                                    >
                                        {t('buttons.cancel')}
                                    </Button>
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        disabled={processing}
                                        sx={{
                                            borderRadius: theme.shape.borderRadius,
                                            background: `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                                            '&:hover': {
                                                background: `linear-gradient(135deg, ${theme.palette.primary.dark}, ${theme.palette.primary.main})`,
                                            },
                                        }}
                                    >
                                        {processing ? t('projects.creating') : t('projects.createProject')}
                                    </Button>
                                </Stack>
                            </Box>
                        </CardContent>
                    </Card>
                )}
            </Container>
        </AuthenticatedLayout>
    );
}
