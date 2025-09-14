import React from 'react';
import { useTranslation } from 'react-i18next';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    Chip,
    Stack,
    Divider,
} from '@mui/material';
import { alpha } from '@mui/material/styles';
import CalendarTodayIcon from '@mui/icons-material/CalendarToday';
import KeyIcon from '@mui/icons-material/Key';
import InfoIcon from '@mui/icons-material/Info';
import { router } from '@inertiajs/react';

export default function ProjectDetailsDialog({ open, onClose, project = {} }) {
    const { t } = useTranslation();
    const handleEdit = () => {
        router.visit(`/projects/${project.id}/edit`);
        onClose();
    };

    const formatDate = (dateString) => {
        if (!dateString) return t('project.notSet');
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
        });
    };

    const getMethodologyColor = (methodology) => {
        const colors = {
            kanban: '#4F46E5',
            scrum: '#06B6D4',
            agile: '#10B981',
            waterfall: '#0EA5E9',
            lean: '#22C55E',
        };
        return colors[methodology?.toLowerCase()] || '#6B7280';
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            sx={{
                '& .MuiDialog-paper': {
                    borderRadius: 3,
                    minHeight: '400px',
                },
            }}
        >
            <DialogTitle sx={{ pb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={1}>
                    <InfoIcon sx={{ color: 'text.secondary' }} />
                    <Typography variant="h6" component="span">
                        {t('project.projectDetails')}
                    </Typography>
                </Stack>
            </DialogTitle>

            <DialogContent sx={{ pt: 1 }}>
                <Stack spacing={3}>
                    {/* Project Name */}
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                            {t('project.projectName')}
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {project.name || t('project.untitledProject')}
                        </Typography>
                    </Box>

                    <Divider />

                    {/* Project Key & Methodology */}
                    <Stack direction="row" spacing={4} sx={{ flexWrap: 'wrap', gap: 2 }}>
                        <Box sx={{ minWidth: '200px' }}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                                {t('project.projectKey')}
                            </Typography>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <KeyIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                                <Typography
                                    variant="body1"
                                    sx={{ fontFamily: 'monospace', fontWeight: 600 }}
                                >
                                    {project.key || 'N/A'}
                                </Typography>
                            </Stack>
                        </Box>

                        {project.meta?.methodology && (
                            <Box>
                                <Typography
                                    variant="subtitle2"
                                    color="text.secondary"
                                    sx={{ mb: 1 }}
                                >
                                    {t('board.methodology')}
                                </Typography>
                                <Chip
                                    label={project.meta.methodology.toUpperCase()}
                                    sx={{
                                        backgroundColor:
                                            getMethodologyColor(project.meta.methodology) + '20',
                                        color: getMethodologyColor(project.meta.methodology),
                                        fontWeight: 600,
                                        fontSize: '0.75rem',
                                        borderRadius: 1,
                                    }}
                                />
                            </Box>
                        )}
                    </Stack>

                    <Divider />

                    {/* Project Dates */}
                    <Box>
                        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 2 }}>
                            {t('project.timeline')}
                        </Typography>
                        <Stack direction="row" spacing={4} sx={{ flexWrap: 'wrap', gap: 2 }}>
                            <Box>
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={1}
                                    sx={{ mb: 0.5 }}
                                >
                                    <CalendarTodayIcon
                                        sx={{ fontSize: 16, color: 'text.secondary' }}
                                    />
                                    <Typography variant="body2" color="text.secondary">
                                        {t('project.startDate')}
                                    </Typography>
                                </Stack>
                                <Typography variant="body1">
                                    {formatDate(project.start_date)}
                                </Typography>
                            </Box>
                            <Box>
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    spacing={1}
                                    sx={{ mb: 0.5 }}
                                >
                                    <CalendarTodayIcon
                                        sx={{ fontSize: 16, color: 'text.secondary' }}
                                    />
                                    <Typography variant="body2" color="text.secondary">
                                        {t('project.endDate')}
                                    </Typography>
                                </Stack>
                                <Typography variant="body1">
                                    {formatDate(project.end_date)}
                                </Typography>
                            </Box>
                        </Stack>
                    </Box>

                    {/* Project Description */}
                    {project.description && (
                        <>
                            <Divider />
                            <Box>
                                <Typography
                                    variant="subtitle2"
                                    color="text.secondary"
                                    sx={{ mb: 1 }}
                                >
                                    {t('project.description')}
                                </Typography>
                                <Typography
                                    variant="body1"
                                    sx={(theme) => ({
                                        lineHeight: 1.6,
                                        whiteSpace: 'pre-wrap',
                                        maxHeight: '200px',
                                        overflow: 'auto',
                                        p: 2,
                                        backgroundColor:
                                            theme.palette.mode === 'dark'
                                                ? alpha(theme.palette.common.white, 0.03)
                                                : theme.palette.grey[50],
                                        borderRadius: 1,
                                        border: '1px solid',
                                        borderColor: theme.palette.divider,
                                    })}
                                >
                                    {project.description}
                                </Typography>
                            </Box>
                        </>
                    )}

                    {/* Additional Metadata */}
                    {project.meta && Object.keys(project.meta).length > 1 && (
                        <>
                            <Divider />
                            <Box>
                                <Typography
                                    variant="subtitle2"
                                    color="text.secondary"
                                    sx={{ mb: 1 }}
                                >
                                    {t('project.additionalInformation')}
                                </Typography>
                                <Box
                                    sx={(theme) => ({
                                        p: 2,
                                        backgroundColor:
                                            theme.palette.mode === 'dark'
                                                ? alpha(theme.palette.common.white, 0.03)
                                                : theme.palette.grey[50],
                                        borderRadius: 1,
                                        border: '1px solid',
                                        borderColor: theme.palette.divider,
                                    })}
                                >
                                    {Object.entries(project.meta || {})
                                        .filter(([key]) => key !== 'methodology')
                                        .map(([key, value]) => (
                                            <Stack
                                                key={key}
                                                direction="row"
                                                spacing={1}
                                                sx={{ mb: 1 }}
                                            >
                                                <Typography
                                                    variant="body2"
                                                    color="text.secondary"
                                                    sx={{ minWidth: '100px' }}
                                                >
                                                    {key
                                                        .replace(/_/g, ' ')
                                                        .replace(/\b\w/g, (l) => l.toUpperCase())}
                                                    :
                                                </Typography>
                                                <Typography variant="body2">
                                                    {typeof value === 'object'
                                                        ? JSON.stringify(value)
                                                        : String(value)}
                                                </Typography>
                                            </Stack>
                                        ))}
                                </Box>
                            </Box>
                        </>
                    )}
                </Stack>
            </DialogContent>

            <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
                <Button onClick={onClose} variant="outlined">
                    {t('project.close')}
                </Button>
                <Button onClick={handleEdit} variant="contained" sx={{ fontWeight: 600 }}>
                    {t('project.editProject')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
