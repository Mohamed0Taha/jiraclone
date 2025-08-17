import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Stack,
    useTheme,
    alpha,
} from '@mui/material';
import {
    Person as PersonIcon,
    Lock as LockIcon,
    DeleteForever as DeleteIcon,
} from '@mui/icons-material';
import DeleteUserForm from './Partials/DeleteUserForm';
import UpdatePasswordForm from './Partials/UpdatePasswordForm';
import UpdateProfileInformationForm from './Partials/UpdateProfileInformationForm';

export default function Edit({ mustVerifyEmail, status, auth }) {
    const theme = useTheme();
    
    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Profile" />

            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h3" component="h1" fontWeight={700} sx={{ mb: 2 }}>
                        Profile Settings
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Manage your account settings and preferences
                    </Typography>
                </Box>

                <Stack spacing={4}>
                    <Card sx={{ borderRadius: theme.shape.borderRadius, overflow: 'hidden' }}>
                        <Box 
                            sx={{ 
                                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.primary.light, 0.05)})`,
                                p: 3,
                                borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`
                            }}
                        >
                            <Stack direction="row" spacing={2} alignItems="center">
                                <PersonIcon sx={{ color: theme.palette.primary.main, fontSize: 28 }} />
                                <Box>
                                    <Typography variant="h6" fontWeight={600}>
                                        Profile Information
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Update your account's profile information and email address
                                    </Typography>
                                </Box>
                            </Stack>
                        </Box>
                        <CardContent sx={{ p: 4 }}>
                            <UpdateProfileInformationForm
                                mustVerifyEmail={mustVerifyEmail}
                                status={status}
                            />
                        </CardContent>
                    </Card>

                    <Card sx={{ borderRadius: theme.shape.borderRadius, overflow: 'hidden' }}>
                        <Box 
                            sx={{ 
                                background: `linear-gradient(135deg, ${alpha(theme.palette.warning.main, 0.1)}, ${alpha(theme.palette.warning.light, 0.05)})`,
                                p: 3,
                                borderBottom: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`
                            }}
                        >
                            <Stack direction="row" spacing={2} alignItems="center">
                                <LockIcon sx={{ color: theme.palette.warning.main, fontSize: 28 }} />
                                <Box>
                                    <Typography variant="h6" fontWeight={600}>
                                        Update Password
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Ensure your account is using a long, random password to stay secure
                                    </Typography>
                                </Box>
                            </Stack>
                        </Box>
                        <CardContent sx={{ p: 4 }}>
                            <UpdatePasswordForm />
                        </CardContent>
                    </Card>

                    <Card sx={{ borderRadius: theme.shape.borderRadius, overflow: 'hidden' }}>
                        <Box 
                            sx={{ 
                                background: `linear-gradient(135deg, ${alpha(theme.palette.error.main, 0.1)}, ${alpha(theme.palette.error.light, 0.05)})`,
                                p: 3,
                                borderBottom: `1px solid ${alpha(theme.palette.error.main, 0.1)}`
                            }}
                        >
                            <Stack direction="row" spacing={2} alignItems="center">
                                <DeleteIcon sx={{ color: theme.palette.error.main, fontSize: 28 }} />
                                <Box>
                                    <Typography variant="h6" fontWeight={600}>
                                        Delete Account
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        Permanently delete your account and all of its data
                                    </Typography>
                                </Box>
                            </Stack>
                        </Box>
                        <CardContent sx={{ p: 4 }}>
                            <DeleteUserForm />
                        </CardContent>
                    </Card>
                </Stack>
            </Container>
        </AuthenticatedLayout>
    );
}
