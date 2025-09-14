// Step 1: Basic Information Form
// resources/js/Pages/Projects/CreateStepBasics.jsx

import React, { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Box, TextField, Typography, InputAdornment, Stack } from '@mui/material';
import TitleIcon from '@mui/icons-material/Title';
import KeyIcon from '@mui/icons-material/Key';
import DescriptionIcon from '@mui/icons-material/Description';

const CreateStepBasics = memo(({ data, setData, errors, localErrors, nameRef }) => {
    const { t } = useTranslation();
    const eFor = (field) => errors[field] || localErrors[field] || '';

    return (
        <Stack spacing={3}>
            <Box>
                <Typography variant="h6" fontWeight={600} mb={2}>
                    {t('projects.basics.title')}
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                    {t('projects.basics.subtitle')}
                </Typography>
            </Box>

            <TextField
                ref={nameRef}
                fullWidth
                label={t('projects.basics.nameLabel')}
                placeholder={t('projects.basics.namePlaceholder')}
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                error={!!eFor('name')}
                helperText={eFor('name') || t('projects.basics.nameHelper')}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <TitleIcon />
                        </InputAdornment>
                    ),
                }}
            />

            <TextField
                fullWidth
                label={t('projects.basics.keyLabel')}
                placeholder={t('projects.basics.keyPlaceholder')}
                value={data.key}
                onChange={(e) => {
                    setData('key', e.target.value.toUpperCase());
                    setData('meta', { ...data.meta, __keyTouched: true });
                }}
                error={!!eFor('key')}
                helperText={eFor('key') || t('projects.basics.keyHelper')}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start">
                            <KeyIcon />
                        </InputAdornment>
                    ),
                }}
            />

            <TextField
                fullWidth
                multiline
                rows={4}
                label={t('projects.basics.descriptionLabel')}
                placeholder={t('projects.basics.descriptionPlaceholder')}
                value={data.description}
                onChange={(e) => setData('description', e.target.value)}
                error={!!eFor('description')}
                helperText={eFor('description') || t('projects.basics.descriptionHelper')}
                InputProps={{
                    startAdornment: (
                        <InputAdornment position="start" sx={{ alignSelf: 'flex-start', mt: 1 }}>
                            <DescriptionIcon />
                        </InputAdornment>
                    ),
                }}
            />
        </Stack>
    );
});

CreateStepBasics.displayName = 'CreateStepBasics';

export default CreateStepBasics;
