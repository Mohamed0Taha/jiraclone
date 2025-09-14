// Step 4: Review Form
// resources/js/Pages/Projects/CreateStepReview.jsx

import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Typography, Stack, Chip, Divider, Alert } from '@mui/material';

const ReviewLine = memo(({ label, value }) => (
    <Stack direction="row" spacing={1.5} alignItems="baseline">
        <Typography sx={{ minWidth: 170, color: 'text.secondary', fontWeight: 600 }}>
            {label}
        </Typography>
        <Typography sx={{ whiteSpace: 'pre-line' }}>{value || '—'}</Typography>
    </Stack>
));

const CreateStepReview = memo(({ data, documentAnalysisData, creationMethod }) => {
    const { t } = useTranslation();
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString();
    };

    return (
        <Stack spacing={3}>
            <Box>
                <Typography variant="h6" fontWeight={600} mb={2}>
                    {t('projects.review.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                    {t('projects.review.subtitle')}
                </Typography>
            </Box>

            {creationMethod === 'document' && documentAnalysisData && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                        {t('projects.review.aiCompleteTitle')}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {t('projects.review.aiCompleteBody')}
                    </Typography>
                </Alert>
            )}

            <Alert severity="info" sx={{ mb: 3 }}>
                {t('projects.review.editLaterInfo')}
            </Alert>

            <Box>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>
                    {t('projects.review.basicInformation')}
                </Typography>
                <Stack spacing={1.5}>
                    <ReviewLine label={t('project.projectName')} value={data.name} />
                    <ReviewLine label={t('projects.review.key')} value={data.key} />
                    <ReviewLine label={t('project.description')} value={data.description} />
                </Stack>
            </Box>

            <Divider />

            <Box>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>
                    {t('projects.review.scopeTimeline')}
                </Typography>
                <Stack spacing={1.5}>
                    <ReviewLine label={t('projectScope.startDate')} value={formatDate(data.start_date)} />
                    <ReviewLine label={t('projectScope.endDate')} value={formatDate(data.end_date)} />
                    <ReviewLine label={t('projectScope.projectType')} value={data.meta.project_type} />
                    <ReviewLine label={t('projectScope.domain')} value={data.meta.domain} />
                    <ReviewLine label={t('projects.review.areaLocation')} value={data.meta.area} />
                    <ReviewLine
                        label={t('projects.review.teamSize')}
                        value={
                            data.meta.team_size === 1
                                ? t('projects.review.teamMembersChip', { count: data.meta.team_size })
                                : t('projects.review.teamMembersChip_plural', { count: data.meta.team_size })
                        }
                    />
                    <ReviewLine label={t('projects.review.budget')} value={data.meta.budget} />
                    <ReviewLine label={t('projects.review.primaryStakeholder')} value={data.meta.primary_stakeholder} />
                </Stack>
            </Box>

            <Divider />

            <Box>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>
                    {t('projects.review.objectivesConstraints')}
                </Typography>
                <Stack spacing={1.5}>
                    <ReviewLine label={t('projects.objectives.primaryObjectivesLabel')} value={data.meta.objectives} />
                    <ReviewLine label={t('projects.objectives.constraintsLabel')} value={data.meta.constraints} />
                </Stack>
            </Box>

            <Box sx={{ pt: 2 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip
                        label={t('projects.review.readyToCreate')}
                        color="primary"
                        variant="filled"
                        sx={{ fontWeight: 600 }}
                    />
                    {data.start_date && (
                        <Chip label={t('projects.review.startsOn', { date: formatDate(data.start_date) })} variant="outlined" />
                    )}
                    {data.meta.team_size > 1 && (
                        <Chip label={t('projects.review.teamMembersChip_plural', { count: data.meta.team_size })} variant="outlined" />
                    )}
                </Stack>
            </Box>
        </Stack>
    );
});

CreateStepReview.displayName = 'CreateStepReview';
ReviewLine.displayName = 'ReviewLine';

export default CreateStepReview;
