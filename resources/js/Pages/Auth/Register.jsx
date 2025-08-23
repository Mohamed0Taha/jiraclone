import React, { useState, useMemo } from 'react';
import {
    Container,
    Paper,
    TextField,
    Button,
    Typography,
    Box,
    InputAdornment,
    Fade,
    Alert,
    alpha,
    Divider,
} from '@mui/material';
import { Email, Person, Lock, Visibility, VisibilityOff, HowToReg } from '@mui/icons-material';
import { Head, Link, useForm } from '@inertiajs/react';
import GuestLayout from '@/Layouts/GuestLayout';

// Landing page color scheme
const colors = {
    primary: '#FF6B6B',
    secondary: '#4ECDC4',
    accent: '#45B7D1',
    support: '#96CEB4',
    warm: '#FFEAA7',
    purple: '#DDA0DD',
    gradient: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)',
};

const RegistrationPage = ({ message = null, prefill_email = null }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [localErrors, setLocalErrors] = useState({});

    const { data, setData, post, processing, errors, clearErrors } = useForm({
        name: '',
        email: prefill_email || '',
        password: '',
        password_confirmation: '',
    });

    // Memoized validation to prevent unnecessary re-renders
    const validation = useMemo(() => {
        const newErrors = {};

        if (data.name && data.name.length < 2) {
            newErrors.name = 'Name must be at least 2 characters';
        }

        if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            newErrors.email = 'Please enter a valid email';
        }

        if (data.password && data.password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters';
        }

        if (data.password_confirmation && data.password !== data.password_confirmation) {
            newErrors.password_confirmation = 'Passwords do not match';
        }

        return newErrors;
    }, [data.name, data.email, data.password, data.password_confirmation]);

    const handleSubmit = (e) => {
        e.preventDefault();

        if (Object.keys(validation).length > 0) {
            setLocalErrors(validation);
            return;
        }

        post(route('register'));
    };

    const handleChange = (field) => (e) => {
        setData(field, e.target.value);
        clearErrors(field);
        if (localErrors[field]) {
            setLocalErrors((prev) => ({ ...prev, [field]: null }));
        }
    };

    const getError = (field) => errors[field] || localErrors[field];

    return (
        <>
            <Head title="Register" />

            <Box
                sx={{
                    minHeight: '100vh',
                    background: colors.gradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    p: 2,
                }}
            >
                <Container maxWidth="sm">
                    <Fade in={true} timeout={800}>
                        <Paper
                            elevation={20}
                            sx={{
                                p: 4,
                                borderRadius: 3,
                                background: 'rgba(255, 255, 255, 0.95)',
                                backdropFilter: 'blur(20px)',
                                border: `1px solid ${alpha(colors.primary, 0.1)}`,
                                boxShadow: `0 20px 60px ${alpha(colors.primary, 0.2)}`,
                            }}
                        >
                            {/* Header */}
                            <Box textAlign="center" mb={4}>
                                <Box
                                    sx={{
                                        width: 80,
                                        height: 80,
                                        borderRadius: '50%',
                                        background: colors.gradient,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 16px',
                                        boxShadow: `0 10px 30px ${alpha(colors.primary, 0.3)}`,
                                    }}
                                >
                                    <HowToReg sx={{ fontSize: 40, color: 'white' }} />
                                </Box>
                                <Typography
                                    variant="h4"
                                    sx={{
                                        fontWeight: 700,
                                        background: colors.gradient,
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        mb: 1,
                                    }}
                                >
                                    Join TaskPilot
                                </Typography>
                                <Typography variant="body1" color="text.secondary">
                                    Create your account to get started
                                </Typography>
                            </Box>

                            {message && (
                                <Alert severity="info" sx={{ mb: 3, borderRadius: 2 }}>
                                    {message}
                                </Alert>
                            )}

                            {/* Google Sign Up Button */}
                            <Box mb={3}>
                                <Button
                                    fullWidth
                                    variant="outlined"
                                    size="large"
                                    href={route('google.login')}
                                    sx={{
                                        py: 1.5,
                                        borderRadius: 2,
                                        borderColor: '#4285f4',
                                        color: '#4285f4',
                                        fontSize: '1rem',
                                        fontWeight: 500,
                                        textTransform: 'none',
                                        '&:hover': {
                                            borderColor: '#3367d6',
                                            backgroundColor: alpha('#4285f4', 0.04),
                                        },
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                    }}
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24">
                                        <path
                                            fill="#4285f4"
                                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                        />
                                        <path
                                            fill="#34a853"
                                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                        />
                                        <path
                                            fill="#fbbc05"
                                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                        />
                                        <path
                                            fill="#ea4335"
                                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                        />
                                    </svg>
                                    Continue with Google
                                </Button>

                                <Box sx={{ my: 3, display: 'flex', alignItems: 'center' }}>
                                    <Divider sx={{ flexGrow: 1 }} />
                                    <Typography
                                        variant="body2"
                                        color="text.secondary"
                                        sx={{ mx: 2, fontWeight: 500 }}
                                    >
                                        OR
                                    </Typography>
                                    <Divider sx={{ flexGrow: 1 }} />
                                </Box>
                            </Box>

                            <form onSubmit={handleSubmit}>
                                <Box display="flex" flexDirection="column" gap={3}>
                                    {/* Full Name */}
                                    <TextField
                                        fullWidth
                                        label="Full Name"
                                        value={data.name}
                                        onChange={handleChange('name')}
                                        error={!!getError('name')}
                                        helperText={getError('name')}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Person sx={{ color: colors.primary }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '&:hover fieldset': { borderColor: colors.primary },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: colors.secondary,
                                                },
                                            },
                                        }}
                                    />

                                    {/* Email */}
                                    <TextField
                                        fullWidth
                                        label="Email Address"
                                        type="email"
                                        value={data.email}
                                        onChange={handleChange('email')}
                                        error={!!getError('email')}
                                        helperText={getError('email')}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Email sx={{ color: colors.secondary }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '&:hover fieldset': {
                                                    borderColor: colors.secondary,
                                                },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: colors.accent,
                                                },
                                            },
                                        }}
                                    />

                                    {/* Password */}
                                    <TextField
                                        fullWidth
                                        label="Password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={data.password}
                                        onChange={handleChange('password')}
                                        error={!!getError('password')}
                                        helperText={getError('password')}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Lock sx={{ color: colors.accent }} />
                                                </InputAdornment>
                                            ),
                                            endAdornment: (
                                                <InputAdornment position="end">
                                                    <Button
                                                        onClick={() =>
                                                            setShowPassword(!showPassword)
                                                        }
                                                        sx={{ minWidth: 'auto', p: 1 }}
                                                    >
                                                        {showPassword ? (
                                                            <VisibilityOff
                                                                sx={{ color: colors.support }}
                                                            />
                                                        ) : (
                                                            <Visibility
                                                                sx={{ color: colors.support }}
                                                            />
                                                        )}
                                                    </Button>
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '&:hover fieldset': { borderColor: colors.accent },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: colors.support,
                                                },
                                            },
                                        }}
                                    />

                                    {/* Confirm Password */}
                                    <TextField
                                        fullWidth
                                        label="Confirm Password"
                                        type={showPassword ? 'text' : 'password'}
                                        value={data.password_confirmation}
                                        onChange={handleChange('password_confirmation')}
                                        error={!!getError('password_confirmation')}
                                        helperText={getError('password_confirmation')}
                                        InputProps={{
                                            startAdornment: (
                                                <InputAdornment position="start">
                                                    <Lock sx={{ color: colors.support }} />
                                                </InputAdornment>
                                            ),
                                        }}
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                '&:hover fieldset': { borderColor: colors.support },
                                                '&.Mui-focused fieldset': {
                                                    borderColor: colors.warm,
                                                },
                                            },
                                        }}
                                    />

                                    {/* Submit Button */}
                                    <Button
                                        type="submit"
                                        fullWidth
                                        variant="contained"
                                        size="large"
                                        disabled={processing}
                                        sx={{
                                            py: 1.5,
                                            mt: 2,
                                            borderRadius: 2,
                                            background: colors.gradient,
                                            fontSize: '1.1rem',
                                            fontWeight: 600,
                                            textTransform: 'none',
                                            boxShadow: `0 8px 25px ${alpha(colors.primary, 0.3)}`,
                                            '&:hover': {
                                                background: `linear-gradient(135deg, #45B7D1 0%, #FF6B6B 50%, #4ECDC4 100%)`,
                                                boxShadow: `0 12px 35px ${alpha(colors.primary, 0.4)}`,
                                                transform: 'translateY(-2px)',
                                            },
                                            '&:disabled': {
                                                background: alpha(colors.primary, 0.3),
                                            },
                                            transition: 'all 0.3s ease',
                                        }}
                                    >
                                        {processing ? 'Creating Account...' : 'Create Account with Email'}
                                    </Button>

                                    {/* Login Link */}
                                    <Box textAlign="center" mt={2}>
                                        <Typography variant="body2" color="text.secondary">
                                            Already have an account?{' '}
                                            <Link
                                                href={route('login')}
                                                style={{
                                                    color: colors.accent,
                                                    textDecoration: 'none',
                                                    fontWeight: 600,
                                                }}
                                            >
                                                Sign in
                                            </Link>
                                        </Typography>
                                    </Box>
                                </Box>
                            </form>
                        </Paper>
                    </Fade>
                </Container>
            </Box>
        </>
    );
};

export default RegistrationPage;
