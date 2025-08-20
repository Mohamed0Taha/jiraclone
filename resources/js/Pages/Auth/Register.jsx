import { useState, useEffect } from 'react';
import { 
    Box, 
    TextField, 
    Button, 
    Typography, 
    Link as MuiLink,
    useTheme,
    Card,
    CardContent,
    InputAdornment,
    IconButton,
    Alert
} from '@mui/material';
import { 
    Visibility, 
    VisibilityOff, 
    PersonAdd as PersonAddIcon,
    Person as PersonIcon,
    Email as EmailIcon,
    Lock as LockIcon,
    GroupAdd as GroupAddIcon
} from '@mui/icons-material';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';

export default function Register({ message = null, prefill_email = null }) {
    const theme = useTheme();
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
    
    const { data, setData, post, processing, errors, reset } = useForm({
        name: '',
        email: prefill_email || '',
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        if (prefill_email) {
            setData('email', prefill_email);
        }
    }, [prefill_email]);

    const submit = (e) => {
        e.preventDefault();

        post(route('register'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Register" />

            <Card sx={{ 
                maxWidth: 480, 
                mx: 'auto', 
                p: 2,
                boxShadow: theme.shadows[8],
                borderRadius: theme.shape.borderRadius 
            }}>
                <CardContent sx={{ p: 4 }}>
                    <Box sx={{ textAlign: 'center', mb: 3 }}>
                        {message && (
                            <Alert 
                                severity="info" 
                                sx={{ 
                                    mb: 3, 
                                    borderRadius: theme.shape.borderRadius,
                                    '& .MuiAlert-icon': {
                                        color: theme.palette.primary.main,
                                    }
                                }}
                                icon={<GroupAddIcon />}
                            >
                                {message}
                            </Alert>
                        )}
                        
                        <Box sx={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            mb: 2
                        }}>
                            <PersonAddIcon sx={{ 
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
                                Create Account
                            </Typography>
                        </Box>
                        <Typography 
                            variant="body1" 
                            color="textSecondary"
                            sx={{ mb: 1 }}
                        >
                            {message ? 'Complete your registration to join the project' : 'Join TaskPilot and start managing your projects'}
                        </Typography>
                    </Box>

                    <Box component="form" onSubmit={submit} sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            id="name"
                            name="name"
                            label="Full Name"
                            type="text"
                            value={data.name}
                            onChange={(e) => setData('name', e.target.value)}
                            error={!!errors.name}
                            helperText={errors.name}
                            margin="normal"
                            autoComplete="name"
                            autoFocus
                            required
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <PersonIcon color="action" />
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
                            required
                            disabled={!!prefill_email}
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
                                ...(prefill_email && {
                                    '& .MuiInputBase-input.Mui-disabled': {
                                        WebkitTextFillColor: theme.palette.text.primary,
                                        color: theme.palette.text.primary,
                                    },
                                })
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
                            autoComplete="new-password"
                            required
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockIcon color="action" />
                                    </InputAdornment>
                                ),
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

                        <TextField
                            fullWidth
                            id="password_confirmation"
                            name="password_confirmation"
                            label="Confirm Password"
                            type={showPasswordConfirmation ? 'text' : 'password'}
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            error={!!errors.password_confirmation}
                            helperText={errors.password_confirmation}
                            margin="normal"
                            autoComplete="new-password"
                            required
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <LockIcon color="action" />
                                    </InputAdornment>
                                ),
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton
                                            aria-label="toggle password confirmation visibility"
                                            onClick={() => setShowPasswordConfirmation(!showPasswordConfirmation)}
                                            edge="end"
                                        >
                                            {showPasswordConfirmation ? <VisibilityOff /> : <Visibility />}
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

                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            disabled={processing}
                            sx={{
                                mt: 3,
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
                            {processing ? 'Creating Account...' : 'Create Account'}
                        </Button>

                        <Box sx={{ textAlign: 'center', mt: 2 }}>
                            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                                Already have an account?
                            </Typography>
                            <Link href={route('login')}>
                                <MuiLink
                                    component="span"
                                    variant="body2"
                                    sx={{
                                        color: theme.palette.primary.main,
                                        textDecoration: 'none',
                                        fontWeight: 500,
                                        '&:hover': {
                                            textDecoration: 'underline',
                                        },
                                    }}
                                >
                                    Sign in to your account
                                </MuiLink>
                            </Link>
                        </Box>
                    </Box>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
