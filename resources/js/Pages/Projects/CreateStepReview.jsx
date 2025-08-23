// Step 4: Review Form
// resources/js/Pages/Projects/CreateStepReview.jsx

import React, { memo } from 'react';
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
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        return new Date(dateStr).toLocaleDateString();
    };

    return (
        <Stack spacing={3}>
            <Box>
                <Typography variant="h6" fontWeight={600} mb={2}>
                    Review & Submit
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                    Please review your project details before creating.
                </Typography>
            </Box>

            {creationMethod === 'document' && documentAnalysisData && (
                <Alert severity="success" sx={{ mb: 3 }}>
                    <Typography variant="body2" sx={{ mb: 1, fontWeight: 600 }}>
                        ✨ AI Document Analysis Complete
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Project details were extracted from your uploaded document. You can edit any field above if needed.
                    </Typography>
                </Alert>
            )}

            <Alert severity="info" sx={{ mb: 3 }}>
                You can edit these details later in the project settings.
            </Alert>

            <Box>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>
                    Basic Information
                </Typography>
                <Stack spacing={1.5}>
                    <ReviewLine label="Project Name" value={data.name} />
                    <ReviewLine label="Key" value={data.key} />
                    <ReviewLine label="Description" value={data.description} />
                </Stack>
            </Box>

            <Divider />

            <Box>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>
                    Scope & Timeline
                </Typography>
                <Stack spacing={1.5}>
                    <ReviewLine label="Start Date" value={formatDate(data.start_date)} />
                    <ReviewLine label="End Date" value={formatDate(data.end_date)} />
                    <ReviewLine label="Project Type" value={data.meta.project_type} />
                    <ReviewLine label="Domain" value={data.meta.domain} />
                    <ReviewLine label="Area/Location" value={data.meta.area} />
                    <ReviewLine
                        label="Team Size"
                        value={`${data.meta.team_size} ${data.meta.team_size === 1 ? 'person' : 'people'}`}
                    />
                    <ReviewLine label="Budget" value={data.meta.budget} />
                    <ReviewLine label="Primary Stakeholder" value={data.meta.primary_stakeholder} />
                </Stack>
            </Box>

            <Divider />

            <Box>
                <Typography variant="subtitle1" fontWeight={600} mb={2}>
                    Objectives & Constraints
                </Typography>
                <Stack spacing={1.5}>
                    <ReviewLine label="Objectives" value={data.meta.objectives} />
                    <ReviewLine label="Constraints" value={data.meta.constraints} />
                </Stack>
            </Box>

            <Box sx={{ pt: 2 }}>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                    <Chip
                        label="Ready to Create"
                        color="primary"
                        variant="filled"
                        sx={{ fontWeight: 600 }}
                    />
                    {data.start_date && (
                        <Chip label={`Starts ${formatDate(data.start_date)}`} variant="outlined" />
                    )}
                    {data.meta.team_size > 1 && (
                        <Chip label={`${data.meta.team_size} team members`} variant="outlined" />
                    )}
                </Stack>
            </Box>
        </Stack>
    );
});

CreateStepReview.displayName = 'CreateStepReview';
ReviewLine.displayName = 'ReviewLine';

export default CreateStepReview;
