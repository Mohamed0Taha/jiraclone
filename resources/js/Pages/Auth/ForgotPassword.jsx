import {
    Box,
    TextField,
    Button,
    Typography,
    Alert,
    useTheme,
    Card,
    CardContent,
    InputAdornment,
} from '@mui/material';
import { Email as EmailIcon, LockReset as LockResetIcon } from '@mui/icons-material';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';

export default function ForgotPassword({ status }) {
    const theme = useTheme();

    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="Forgot Password" />

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
                            <LockResetIcon
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
                                Reset Password
                            </Typography>
                        </Box>
                        <Typography variant="body1" color="textSecondary" sx={{ mb: 2 }}>
                            Forgot your password? No problem. Just let us know your email address
                            and we will email you a password reset link that will allow you to
                            choose a new one.
                        </Typography>
                    </Box>

                    {status && (
                        <Alert severity="success" sx={{ mb: 3 }}>
                            {status}
                        </Alert>
                    )}

                    <Box component="form" onSubmit={submit} sx={{ mt: 1 }}>
                        <TextField
                            fullWidth
                            id="email"
                            name="email"
                            label="Email Address"
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
                            {processing ? 'Sending...' : 'Email Password Reset Link'}
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
