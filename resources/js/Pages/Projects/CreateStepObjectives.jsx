// Step 3: Objectives Form
// resources/js/Pages/Projects/CreateStepObjectives.jsx

import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, TextField, Typography, InputAdornment, Stack } from '@mui/material';
import InsightsIcon from '@mui/icons-material/Insights';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

const CreateStepObjectives = memo(({ data, setMeta }) => {
    const { t } = useTranslation();
    return (
        <Stack spacing={3}>
            <Box>
                <Typography variant="h6" fontWeight={600} mb={2}>
                    {t('projects.objectives.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                    {t('projects.objectives.subtitle')}
                </Typography>
            </Box>

            <TextField
                fullWidth
                multiline
                rows={4}
                label={t('projects.objectives.primaryObjectivesLabel')}
                placeholder={t('projects.objectives.primaryObjectivesPlaceholder')}
                value={data.meta.objectives}
                onChange={(e) => setMeta('objectives', e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                            <InsightsIcon />
                        </InputAdornment>
                    ),
                }}
                helperText={t('projects.objectives.primaryObjectivesHelper')}
            />

            <TextField
                fullWidth
                multiline
                rows={3}
                label={t('projects.objectives.constraintsLabel')}
                placeholder={t('projects.objectives.constraintsPlaceholder')}
                value={data.meta.constraints}
                onChange={(e) => setMeta('constraints', e.target.value)}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                            <WarningAmberIcon />
                        </InputAdornment>
                    ),
                }}
                helperText={t('projects.objectives.constraintsHelper')}
            />
        </Stack>
    );
});

CreateStepObjectives.displayName = 'CreateStepObjectives';

export default CreateStepObjectives;
