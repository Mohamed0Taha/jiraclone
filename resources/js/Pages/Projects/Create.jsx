import React from 'react';
import { Head, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';

import { Box, Button, Container, Paper, Stack, TextField, Typography } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';

export default function Create({ auth }) {
    const { data, setData, post, processing, errors } = useForm({
        name: '',
        description: '',
    });

    const submit = (e) => {
        e.preventDefault();
        post('/projects');
    };

    return (
        <>
            <Head title="Create Project" />

            <AuthenticatedLayout user={auth.user}>
                <Box sx={{ py: 8, bgcolor: 'background.default', minHeight: '100vh' }}>
                    <Container maxWidth="md">
                        <Paper elevation={1} sx={{ p: 4 }}>
                            <Typography variant="h4" fontWeight={700} mb={4}>
                                Create New Project
                            </Typography>

                            <Box component="form" onSubmit={submit} noValidate>
                                <Stack spacing={3}>
                                    <TextField
                                        label="Project Name"
                                        variant="outlined"
                                        required
                                        value={data.name}
                                        onChange={(e) => setData('name', e.target.value)}
                                        error={Boolean(errors.name)}
                                        helperText={errors.name}
                                    />

                                    <TextField
                                        label="Description"
                                        variant="outlined"
                                        multiline
                                        minRows={3}
                                        value={data.description}
                                        onChange={(e) => setData('description', e.target.value)}
                                        error={Boolean(errors.description)}
                                        helperText={errors.description}
                                    />

                                    <Button
                                        type="submit"
                                        variant="contained"
                                        color="success"
                                        startIcon={<SaveIcon />}
                                        disabled={processing}
                                        sx={{ alignSelf: 'flex-start', textTransform: 'none' }}
                                    >
                                        Create Project
                                    </Button>
                                </Stack>
                            </Box>
                        </Paper>
                    </Container>
                </Box>
            </AuthenticatedLayout>
        </>
    );
}
