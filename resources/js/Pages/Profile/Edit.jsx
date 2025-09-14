import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();
    const theme = useTheme();

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title={t('profile.title')} />

            <Container maxWidth="lg" sx={{ py: 4 }}>
                <Box sx={{ mb: 4 }}>
                    <Typography variant="h3" component="h1" fontWeight={700} sx={{ mb: 2 }}>
                        {t('profile.title')}
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        {t('profile.subtitle')}
                    </Typography>
                </Box>

                <Stack spacing={4}>
                    <Card sx={{ borderRadius: theme.shape.borderRadius, overflow: 'hidden' }}>
                        <Box
                            sx={{
                                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.1)}, ${alpha(theme.palette.primary.light, 0.05)})`,
                                p: 3,
                                borderBottom: `1px solid ${alpha(theme.palette.primary.main, 0.1)}`,
                            }}
                        >
                            <Stack direction="row" spacing={2} alignItems="center">
                                <PersonIcon
                                    sx={{ color: theme.palette.primary.main, fontSize: 28 }}
                                />
                                <Box>
                                    <Typography variant="h6" fontWeight={600}>
                                        {t('profile.profileInformation')}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('profile.profileInformationDesc')}
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
                                borderBottom: `1px solid ${alpha(theme.palette.warning.main, 0.1)}`,
                            }}
                        >
                            <Stack direction="row" spacing={2} alignItems="center">
                                <LockIcon
                                    sx={{ color: theme.palette.warning.main, fontSize: 28 }}
                                />
                                <Box>
                                    <Typography variant="h6" fontWeight={600}>
                                        {t('profile.updatePassword')}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('profile.updatePasswordDesc')}
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
                                borderBottom: `1px solid ${alpha(theme.palette.error.main, 0.1)}`,
                            }}
                        >
                            <Stack direction="row" spacing={2} alignItems="center">
                                <DeleteIcon
                                    sx={{ color: theme.palette.error.main, fontSize: 28 }}
                                />
                                <Box>
                                    <Typography variant="h6" fontWeight={600}>
                                        {t('profile.deleteAccount')}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        {t('profile.deleteAccountDesc')}
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
