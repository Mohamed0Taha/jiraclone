// Step 1: Basic Information Form
// resources/js/Pages/Projects/CreateStepBasics.jsx

import React, { memo } from 'react';
import { Box, TextField, Typography, InputAdornment, Stack } from '@mui/material';
import TitleIcon from '@mui/icons-material/Title';
import KeyIcon from '@mui/icons-material/Key';
import DescriptionIcon from '@mui/icons-material/Description';

const CreateStepBasics = memo(({ data, setData, errors, localErrors, nameRef }) => {
    const eFor = (field) => errors[field] || localErrors[field] || '';

    return (
        <Stack spacing={3}>
            <Box>
                <Typography variant="h6" fontWeight={600} mb={2}>
                    Project Basics
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={3}>
                    Start with the fundamental details of your project.
                </Typography>
            </Box>

            <TextField
                ref={nameRef}
                fullWidth
                label="Project Name"
                placeholder="Enter a descriptive project name..."
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                error={!!eFor('name')}
                helperText={eFor('name') || 'The name should be clear and memorable'}
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
                label="Project Key"
                placeholder="AUTO"
                value={data.key}
                onChange={(e) => {
                    setData('key', e.target.value.toUpperCase());
                    setData('meta', { ...data.meta, __keyTouched: true });
                }}
                error={!!eFor('key')}
                helperText={eFor('key') || 'A unique identifier (uppercase letters & numbers only)'}
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
                label="Description"
                placeholder="Describe the project's purpose, goals, and scope..."
                value={data.description}
                onChange={(e) => setData('description', e.target.value)}
                error={!!eFor('description')}
                helperText={
                    eFor('description') || 'Provide context and objectives for team members'
                }
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
