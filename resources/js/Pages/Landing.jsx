import React from 'react';
import { Head, useForm } from '@inertiajs/react';

import { Box, Button, Container, Link, Stack, TextField, Typography, Paper } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

export default function Landing({ errors }) {
    /* ----- email/password form ----- */
    const { data, setData, post, processing } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();
        post('/login');
    };

    return (
        <>
            <Head title="Welcome" />

            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'linear-gradient(135deg, #eef2ff 0%, #e0e7ff 100%)',
                }}
            >
                <Container maxWidth="sm">
                    <Stack spacing={6} textAlign="center">
                        <Typography variant="h2" sx={{ fontWeight: 800, color: 'primary.main' }}>
                            Dominus
                        </Typography>

                        <Typography variant="subtitle1" color="text.secondary">
                            The open-source project management solution for productive teams.
                        </Typography>

                        {/* ----- Google sign-in ----- */}
                        <Button
                            variant="contained"
                            color="error"
                            href="/auth/google"
                            startIcon={<GoogleIcon />}
                            sx={{ textTransform: 'none', px: 4, py: 2 }}
                        >
                            Sign in with Google
                        </Button>

                        {/* ----- OR divider ----- */}
                        <Typography variant="overline" color="text.secondary">
                            or
                        </Typography>

                        {/* ----- Email / password card ----- */}
                        <Paper elevation={1} sx={{ p: 4 }}>
                            <form onSubmit={submit}>
                                <Stack spacing={2}>
                                    <TextField
                                        label="Email"
                                        type="email"
                                        name="email"
                                        value={data.email}
                                        onChange={(e) => setData('email', e.target.value)}
                                        error={Boolean(errors.email)}
                                        helperText={errors.email}
                                        required
                                        fullWidth
                                    />

                                    <TextField
                                        label="Password"
                                        type="password"
                                        name="password"
                                        value={data.password}
                                        onChange={(e) => setData('password', e.target.value)}
                                        error={Boolean(errors.password)}
                                        helperText={errors.password}
                                        required
                                        fullWidth
                                    />

                                    <Button type="submit" variant="contained" disabled={processing}>
                                        Log&nbsp;In
                                    </Button>

                                    <Link
                                        href={route('password.request')}
                                        underline="hover"
                                        sx={{ fontSize: 14 }}
                                    >
                                        Forgot your password?
                                    </Link>
                                </Stack>
                            </form>
                        </Paper>
                    </Stack>
                </Container>
            </Box>
        </>
    );
}
