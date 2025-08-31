import React from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Container,
    Paper,
    Typography,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Stack,
    Divider,
    Alert,
} from '@mui/material';
import {
    EmojiEvents as TrophyIcon,
    School as CertificateIcon,
    Refresh as RetakeIcon,
    Verified as VerifiedIcon,
} from '@mui/icons-material';

export default function CertificateChoice({
    auth,
    existingCertificate,
    certificateUrl,
    badgeUrl,
    canRetake,
}) {
    const getScoreColor = (score) => {
        if (score >= 90) return 'success';
        if (score >= 80) return 'info';
        if (score >= 70) return 'warning';
        return 'default';
    };

    const getScoreLabel = (score) => {
        if (score >= 90) return 'Outstanding';
        if (score >= 80) return 'Excellent';
        if (score >= 70) return 'Good';
        return 'Satisfactory';
    };

    const handleRetake = () => {
        // Reset any existing attempt and start fresh
        window.location.href = '/certification/reset';
    };

    const handleViewCertificate = () => {
        window.location.href = certificateUrl;
    };

    const handleViewBadge = () => {
        window.location.href = badgeUrl;
    };

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                    Project Management Certification
                </h2>
            }
        >
            <Head title="Certification Status" />

            <Container maxWidth="md" sx={{ py: 4 }}>
                <Paper elevation={3} sx={{ p: 4 }}>
                    <Box textAlign="center" mb={4}>
                        <TrophyIcon sx={{ fontSize: 64, color: 'gold', mb: 2 }} />
                        <Typography variant="h3" gutterBottom color="primary.main">
                            Certification Status
                        </Typography>
                        <Typography variant="h6" color="text.secondary">
                            You have an existing Project Management Professional Certificate
                        </Typography>
                    </Box>

                    <Card sx={{ mb: 4, bgcolor: 'background.default' }}>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center" mb={2}>
                                <VerifiedIcon color="success" />
                                <Typography variant="h6">Current Certification</Typography>
                                <Chip
                                    label={getScoreLabel(existingCertificate.score)}
                                    color={getScoreColor(existingCertificate.score)}
                                    size="small"
                                />
                            </Stack>

                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                    gap: 2,
                                    mb: 3,
                                }}
                            >
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Final Score
                                    </Typography>
                                    <Typography variant="h4" color="primary.main">
                                        {existingCertificate.score.toFixed(1)}%
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Completed
                                    </Typography>
                                    <Typography variant="body1" fontWeight={600}>
                                        {existingCertificate.completed_at}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        ({existingCertificate.days_ago} days ago)
                                    </Typography>
                                </Box>
                                <Box>
                                    <Typography variant="caption" color="text.secondary">
                                        Certificate ID
                                    </Typography>
                                    <Typography variant="body2" fontFamily="monospace">
                                        {existingCertificate.serial.substring(0, 8)}...
                                    </Typography>
                                </Box>
                            </Box>

                            <Alert severity="info" sx={{ mb: 2 }}>
                                Your certificate is{' '}
                                {existingCertificate.days_ago > 30
                                    ? 'eligible for renewal'
                                    : 'still valid'}
                                .
                                {existingCertificate.days_ago > 30 &&
                                    ' You can retake the certification to potentially improve your score.'}
                            </Alert>
                        </CardContent>
                    </Card>

                    <Typography variant="h5" gutterBottom textAlign="center">
                        What would you like to do?
                    </Typography>

                    <Stack spacing={3} sx={{ mt: 3 }}>
                        {/* View Existing Certificate */}
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<CertificateIcon />}
                                onClick={handleViewCertificate}
                                sx={{ flex: 1 }}
                            >
                                View Certificate
                            </Button>
                            <Button
                                variant="outlined"
                                size="large"
                                startIcon={<TrophyIcon />}
                                onClick={handleViewBadge}
                                sx={{ flex: 1 }}
                            >
                                View Badge
                            </Button>
                        </Stack>

                        <Divider>
                            <Chip label="OR" size="small" />
                        </Divider>

                        {/* Retake Option */}
                        {canRetake && (
                            <Box textAlign="center">
                                <Button
                                    variant="contained"
                                    color="secondary"
                                    size="large"
                                    startIcon={<RetakeIcon />}
                                    onClick={handleRetake}
                                    sx={{
                                        minWidth: 300,
                                        bgcolor: 'warning.main',
                                        '&:hover': {
                                            bgcolor: 'warning.dark',
                                        },
                                    }}
                                >
                                    Retake Certification
                                </Button>
                                <Typography
                                    variant="caption"
                                    display="block"
                                    color="text.secondary"
                                    mt={1}
                                >
                                    Start a new certification to potentially improve your score
                                </Typography>
                            </Box>
                        )}
                    </Stack>

                    <Box mt={4} p={2} bgcolor="grey.50" borderRadius={1}>
                        <Typography
                            variant="caption"
                            color="text.secondary"
                            textAlign="center"
                            display="block"
                        >
                            Your current certificate is publicly verifiable and shareable on
                            professional networks like LinkedIn.
                        </Typography>
                    </Box>
                </Paper>
            </Container>
        </AuthenticatedLayout>
    );
}
