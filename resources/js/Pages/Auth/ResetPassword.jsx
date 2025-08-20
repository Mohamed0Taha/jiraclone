import { useState } from 'react';
import { 
    Box, 
    TextField, 
    Button, 
    Typography, 
    useTheme,
    Card,
    CardContent,
    InputAdornment,
    IconButton
} from '@mui/material';
import { 
    Visibility, 
    VisibilityOff, 
    Lock as LockIcon,
    Email as EmailIcon,
    LockReset as LockResetIcon
} from '@mui/icons-material';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';

export default function ResetPassword({ token, email }) {
    const theme = useTheme();
    const [showPassword, setShowPassword] = useState(false);
    const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false);
    
    const { data, setData, post, processing, errors, reset } = useForm({
        token: token,
        email: email,
        password: '',
        password_confirmation: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.store'), {
            onFinish: () => reset('password', 'password_confirmation'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Reset Password" />

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
                            <LockResetIcon sx={{ 
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
                                Reset Password
                            </Typography>
                        </Box>
                        <Typography 
                            variant="body1" 
                            color="textSecondary"
                            sx={{ mb: 1 }}
                        >
                            Create a new password for your TaskPilot account
                        </Typography>
                    </Box>

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
                            label="New Password"
                            type={showPassword ? 'text' : 'password'}
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            error={!!errors.password}
                            helperText={errors.password}
                            margin="normal"
                            autoComplete="new-password"
                            autoFocus
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
                            label="Confirm New Password"
                            type={showPasswordConfirmation ? 'text' : 'password'}
                            value={data.password_confirmation}
                            onChange={(e) => setData('password_confirmation', e.target.value)}
                            error={!!errors.password_confirmation}
                            helperText={errors.password_confirmation}
                            margin="normal"
                            autoComplete="new-password"
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
                            {processing ? 'Resetting Password...' : 'Reset Password'}
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
