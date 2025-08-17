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
    Security as SecurityIcon,
    Lock as LockIcon
} from '@mui/icons-material';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, useForm } from '@inertiajs/react';

export default function ConfirmPassword() {
    const theme = useTheme();
    const [showPassword, setShowPassword] = useState(false);
    
    const { data, setData, post, processing, errors, reset } = useForm({
        password: '',
    });

    const submit = (e) => {
        e.preventDefault();

        post(route('password.confirm'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <GuestLayout>
            <Head title="Confirm Password" />

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
                            <SecurityIcon sx={{ 
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
                                Confirm Password
                            </Typography>
                        </Box>
                        <Typography 
                            variant="body1" 
                            color="textSecondary"
                            sx={{ mb: 2 }}
                        >
                            This is a secure area of the application. Please confirm your password before continuing.
                        </Typography>
                    </Box>

                    <Box component="form" onSubmit={submit} sx={{ mt: 1 }}>
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
                            {processing ? 'Confirming...' : 'Confirm'}
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </GuestLayout>
    );
}
