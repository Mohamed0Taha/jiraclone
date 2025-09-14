import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Box,
    TextField,
    FormControlLabel,
    Checkbox,
    Button,
    Typography,
    Link as MuiLink,
    Alert,
    useTheme,
    Card,
    CardContent,
    InputAdornment,
    IconButton,
    Divider,
    alpha,
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    Email as EmailIcon,
    Login as LoginIcon,
} from '@mui/icons-material';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword }) {
    const { t } = useTranslation();
    const theme = useTheme();
    const [showPassword, setShowPassword] = useState(false);

    const { data, setData, post, processing, errors, reset } = useForm({
        email: '',
        password: '',
        remember: false,
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title={t('auth.login')} />

            <Card
                sx={{
                    maxWidth: 480,
                    mx: 'auto',
                    p: 2,
                    boxShadow: theme.shadows[8],
                    borderRadius: theme.shape.borderRadius,
                }}
            >
                <CardContent sx={{ p: 4 }}>
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mb: 2,
                            }}
                        >
                            <LoginIcon
                                sx={{
                                    fontSize: 32,
                                    color: theme.palette.primary.main,
                                    mr: 1,
                                }}
                            />
                            <Typography
                                variant="h4"
                                component="h1"
                                sx={{
                                    fontWeight: 700,
                                    color: theme.palette.primary.main,
                                    fontFamily: '"Inter", "Segoe UI", sans-serif',
                                }}
                            >
                                {t('auth.welcomeBack')}
                            </Typography>
                        </Box>
                        <Typography variant="body1" color="textSecondary" sx={{ mb: 1 }}>
                            {t('auth.signInToAccount')}
                        </Typography>
                    </Box>

                    {status && (
                        <Alert severity="success" sx={{ mb: 3 }}>
                            {status}
                        </Alert>
                    )}

                    {/* Google Login Button */}
                    <Box mb={3}>
                        <Button
                            fullWidth
                            variant="outlined"
                            size="large"
                            href={route('google.login')}
                            sx={{
                                py: 1.5,
                                borderRadius: theme.shape.borderRadius,
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
                            {t('auth.continueWithGoogle')}
                        </Button>

                        <Box sx={{ my: 3, display: 'flex', alignItems: 'center' }}>
                            <Divider sx={{ flexGrow: 1 }} />
                            <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ mx: 2, fontWeight: 500 }}
                            >
                                {t('common.or')}
                            </Typography>
                            <Divider sx={{ flexGrow: 1 }} />
                        </Box>
                    </Box>

                    <Box component="form" onSubmit={submit} sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            id="email"
                            name="email"
                            label={t('auth.email')}
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            error={!!errors.email}
                            helperText={errors.email}
                            margin="normal"
                            autoComplete="username"
                            autoFocus
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <EmailIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: theme.shape.borderRadius,
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: theme.palette.primary.light,
                                    },
                                },
                            }}
                        />

                        <TextField
                            fullWidth
                            id="password"
                            name="password"
                            label={t('auth.password')}
                            type={showPassword ? 'text' : 'password'}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            error={!!errors.password}
                            helperText={errors.password}
                            margin="normal"
                            autoComplete="current-password"
                            InputProps={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label={t('auth.togglePasswordVisibility')}
                                            onClick={() => setShowPassword(!showPassword)}
                                            edge="end"
                                        >
                                            {showPassword ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                ),
                            }}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: theme.shape.borderRadius,
                                    '&:hover .MuiOutlinedInput-notchedOutline': {
                                        borderColor: theme.palette.primary.light,
                                    },
                                },
                            }}
                        />

                        <FormControlLabel
                            control={
                                <Checkbox
                                    checked={data.remember}
                                    onChange={(e) => setData('remember', e.target.checked)}
                                    name="remember"
                                    color="primary"
                                />
                            }
                            label={t('auth.rememberMe')}
                            sx={{ mt: 2, mb: 2 }}
                        />

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={processing}
                            sx={{
                                mt: 2,
                                mb: 2,
                                py: 1.5,
                                borderRadius: theme.shape.borderRadius,
                                background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                                boxShadow: theme.shadows[4],
                                '&:hover': {
                                    background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                                    boxShadow: theme.shadows[8],
                                },
                                '&:disabled': {
                                    background: theme.palette.action.disabledBackground,
                                },
                            }}
                        >
                            {processing ? t('auth.signingIn') : t('auth.signInWithEmail')}
                        </Button>

                        {canResetPassword && (
                            <Box sx={{ textAlign: 'center', mt: 2 }}>
                                <Link href={route('password.request')}>
                                    <MuiLink
                                        component="span"
                                        variant="body2"
                                        sx={{
                                            color: theme.palette.text.secondary,
                                            textDecoration: 'none',
                                            '&:hover': {
                                                color: theme.palette.primary.main,
                                                textDecoration: 'underline',
                                            },
                                        }}
                                    >
                                        {t('auth.forgotPassword')}
                                    </MuiLink>
                                </Link>
                            </Box>
                        )}

                        <Box sx={{ textAlign: 'center', mt: 2 }}>
                            <Typography variant="body2" color="text.secondary">
                                {t('auth.noAccount')}{' '}
                                <Link href={route('register')}>
                                    <MuiLink
                                        component="span"
                                        variant="body2"
                                        sx={{
                                            color: theme.palette.primary.main,
                                            textDecoration: 'none',
                                            fontWeight: 600,
                                            '&:hover': {
                                                textDecoration: 'underline',
                                            },
                                        }}
                                    >
                                        {t('auth.signUp')}
                                    </MuiLink>
                                </Link>
                            </Typography>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
