import { useState } from 'react';
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
    IconButton
} from '@mui/material';
import { 
    Visibility, 
    VisibilityOff, 
    Email as EmailIcon, 
    Login as LoginIcon 
} from '@mui/icons-material';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Login({ status, canResetPassword }) {
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
            <Head title="Log in" />

            <Card sx={{ 
                maxWidth: 480, 
                mx: 'auto', 
                p: 2,
                boxShadow: theme.shadows[8],
                borderRadius: theme.shape.borderRadius 
            }}>
                <CardContent sx={{ p: 4 }}>
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            mb: 2
                        }}>
                            <LoginIcon sx={{ 
                                fontSize: 32, 
                                color: theme.palette.primary.main,
                                mr: 1
                            }} />
                            <Typography 
                                variant="h4" 
                                component="h1" 
                                sx={{ 
                                    fontWeight: 700,
                                    color: theme.palette.primary.main,
                                    fontFamily: '"Inter", "Segoe UI", sans-serif'
                                }}
                            >
                                Welcome back
                            </Typography>
                        </Box>
                        <Typography 
                            variant="body1" 
                            color="textSecondary"
                            sx={{ mb: 1 }}
                        >
                            Sign in to your TaskPilot account
                        </Typography>
                    </Box>

                    {status && (
                        <Alert 
                            severity="success" 
                            sx={{ mb: 3 }}
                        >
                            {status}
                        </Alert>
                    )}

                    <Box component="form" onSubmit={submit} sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            id="email"
                            name="email"
                            label="Email"
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
                            label="Password"
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
                                            aria-label="toggle password visibility"
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
                            label="Remember me"
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
                            {processing ? 'Signing in...' : 'Sign in'}
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
                                        Forgot your password?
                                    </MuiLink>
                                </Link>
                            </Box>
                        )}
                    </Box>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
