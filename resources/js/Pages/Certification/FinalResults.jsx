import React from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Box,
    Typography,
    Paper,
    Stack,
    Button,
    Card,
    CardContent,
    LinearProgress,
    Chip,
    Divider,
    List,
    ListItem,
    ListItemText,
    Alert,
    Grid,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    CheckCircle as CheckIcon,
    Cancel as WrongIcon,
    EmojiEvents as TrophyIcon,
    Download as DownloadIcon,
    Refresh as RetryIcon,
    Assignment as ProjectIcon,
    Share as ShareIcon,
    Badge as BadgeIcon,
} from '@mui/icons-material';

export default function FinalResults({
    auth,
    attempt,
    totalScore,
    maxPossibleScore,
    percentage,
    passed,
    theoreticalScore,
    practicalScore,
    projectPerformance,
    certificateReady,
}) {
    const safePercentage =
        typeof percentage === 'number' && !isNaN(percentage)
            ? percentage
            : maxPossibleScore > 0
              ? (totalScore / maxPossibleScore) * 100
              : 0;

    const safePassed = passed !== undefined ? passed : safePercentage >= 70;

    const publicSerial = attempt?.serial;

    const openPublicCertificate = () => {
        if (!publicSerial) {
            alert('Certificate serial missing. Try refreshing.');
            return;
        }
        window.location.href = `/certificates/${publicSerial}`;
    };

    const openPublicBadge = () => {
        if (!publicSerial) {
            alert('Badge serial missing. Try refreshing.');
            return;
        }
        window.location.href = `/certificates/${publicSerial}/badge`;
    };

    const handleLinkedInShare = () => {
        const certificationTitle = 'Project Management with AI Certification';
        const issuer = window.location.origin;
        const shareText = encodeURIComponent(
            `I'm excited to share that I've earned my ${certificationTitle}! 🎉 With a score of ${safePercentage.toFixed(1)}%, I've demonstrated expertise in project management theory, practical application, crisis management, and AI-enhanced project delivery.`
        );
        const shareUrl = encodeURIComponent(window.location.href);

        const linkedInShareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}&summary=${shareText}`;
        window.open(linkedInShareUrl, '_blank', 'width=600,height=600');
    };

    const handleRetakeCertification = () => {
        router.post(route('certification.reset'));
    };

    const getGrade = (percentage) => {
        if (percentage >= 95) return { grade: 'A+', color: 'success', description: 'Outstanding' };
        if (percentage >= 90) return { grade: 'A', color: 'success', description: 'Excellent' };
        if (percentage >= 85) return { grade: 'B+', color: 'info', description: 'Very Good' };
        if (percentage >= 80) return { grade: 'B', color: 'info', description: 'Good' };
        if (percentage >= 75) return { grade: 'C+', color: 'warning', description: 'Satisfactory' };
        if (percentage >= 70) return { grade: 'C', color: 'warning', description: 'Passing' };
        return { grade: 'F', color: 'error', description: 'Failed' };
    };

    const gradeInfo = getGrade(safePercentage);

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Final Results - Project Management Certification" />

            <Box sx={{ maxWidth: 'lg', mx: 'auto', p: 3 }}>
                {/* Header */}
                <Paper
                    sx={{
                        p: 4,
                        mb: 4,
                        textAlign: 'center',
                        background: safePassed
                            ? 'linear-gradient(45deg, #4caf50, #81c784)'
                            : 'linear-gradient(45deg, #f44336, #ef5350)',
                        color: 'white',
                    }}
                >
                    <TrophyIcon sx={{ fontSize: 60, mb: 2 }} />

                    <Typography variant="h3" gutterBottom>
                        {safePassed ? 'Congratulations!' : 'Assessment Complete'}
                    </Typography>

                    <Typography variant="h5" gutterBottom>
                        Project Management with AI Certification
                    </Typography>

                    <Box sx={{ mt: 3, mb: 2 }}>
                        <Typography variant="h2" fontWeight="bold">
                            {safePercentage.toFixed(1)}%
                        </Typography>
                        <Chip
                            label={gradeInfo.grade}
                            color={gradeInfo.color}
                            variant="filled"
                            sx={{ fontSize: '1.2rem', p: 2, mt: 1 }}
                        />
                    </Box>

                    <Typography variant="h6">{gradeInfo.description} Performance</Typography>

                    <Typography variant="body1" sx={{ mt: 2 }}>
                        Final Score: {totalScore || 0} out of {maxPossibleScore || 0} points
                    </Typography>
                </Paper>

                {/* Results Breakdown */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <Typography variant="h6" gutterBottom color="primary">
                                    Theoretical Knowledge
                                </Typography>
                                <Typography variant="h3" color="primary">
                                    {theoreticalScore?.percentage?.toFixed(1) || 0}%
                                </Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={theoreticalScore?.percentage || 0}
                                    sx={{ mt: 2, height: 8, borderRadius: 4 }}
                                    color="primary"
                                />
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    {theoreticalScore?.score || 0} /{' '}
                                    {theoreticalScore?.maxScore || 0} points
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <Typography variant="h6" gutterBottom color="secondary">
                                    Practical Application
                                </Typography>
                                <Typography variant="h3" color="secondary">
                                    {practicalScore?.percentage?.toFixed(1) || 0}%
                                </Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={practicalScore?.percentage || 0}
                                    sx={{ mt: 2, height: 8, borderRadius: 4 }}
                                    color="secondary"
                                />
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    {practicalScore?.score || 0} / {practicalScore?.maxScore || 0}{' '}
                                    points
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent sx={{ textAlign: 'center' }}>
                                <Typography variant="h6" gutterBottom color="success.main">
                                    Project Management
                                </Typography>
                                <Typography variant="h3" color="success.main">
                                    {projectPerformance?.score?.toFixed(1) || 0}%
                                </Typography>
                                <LinearProgress
                                    variant="determinate"
                                    value={projectPerformance?.score || 0}
                                    sx={{ mt: 2, height: 8, borderRadius: 4 }}
                                    color="success"
                                />
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                    Practical Performance
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Project Performance Details */}
                {projectPerformance && (
                    <Paper sx={{ p: 3, mb: 4 }}>
                        <Typography variant="h6" gutterBottom>
                            <ProjectIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Practical Performance
                        </Typography>

                        <Grid container spacing={2} sx={{ mt: 2 }}>
                            <Grid item xs={12} sm={6} md={3}>
                                <Box textAlign="center">
                                    <Typography
                                        variant="h4"
                                        color={
                                            projectPerformance.budgetHealth === 'healthy'
                                                ? 'success.main'
                                                : 'error.main'
                                        }
                                    >
                                        {projectPerformance.budgetUtilization?.toFixed(1) || 0}%
                                    </Typography>
                                    <Typography variant="caption">Budget Utilization</Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Box textAlign="center">
                                    <Typography
                                        variant="h4"
                                        color={
                                            projectPerformance.scheduleHealth === 'on_track'
                                                ? 'success.main'
                                                : 'warning.main'
                                        }
                                    >
                                        {projectPerformance.completionRate?.toFixed(1) || 0}%
                                    </Typography>
                                    <Typography variant="caption">Task Completion</Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Box textAlign="center">
                                    <Typography variant="h4" color="info.main">
                                        {projectPerformance.clientSatisfaction || 0}%
                                    </Typography>
                                    <Typography variant="caption">Client Satisfaction</Typography>
                                </Box>
                            </Grid>
                            <Grid item xs={12} sm={6} md={3}>
                                <Box textAlign="center">
                                    <Typography variant="h4" color="secondary.main">
                                        {projectPerformance.qualityScore || 0}%
                                    </Typography>
                                    <Typography variant="caption">Quality Score</Typography>
                                </Box>
                            </Grid>
                        </Grid>

                        <Divider sx={{ my: 3 }} />

                        <Typography variant="subtitle1" gutterBottom>
                            Project Management Competencies Demonstrated:
                        </Typography>

                        <List>
                            {[
                                {
                                    skill: 'Budget Management',
                                    score: projectPerformance.budgetManagement || 0,
                                },
                                {
                                    skill: 'Timeline Control',
                                    score: projectPerformance.timelineControl || 0,
                                },
                                {
                                    skill: 'Risk Response',
                                    score: projectPerformance.riskResponse || 0,
                                },
                                {
                                    skill: 'Team Leadership',
                                    score: projectPerformance.teamLeadership || 0,
                                },
                                {
                                    skill: 'Stakeholder Management',
                                    score: projectPerformance.stakeholderManagement || 0,
                                },
                            ].map((competency) => (
                                <ListItem key={competency.skill} sx={{ py: 0.5 }}>
                                    <ListItemText
                                        primary={competency.skill}
                                        secondary={
                                            <Box
                                                sx={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    mt: 0.5,
                                                }}
                                            >
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={competency.score}
                                                    sx={{
                                                        flexGrow: 1,
                                                        mr: 2,
                                                        height: 6,
                                                        borderRadius: 3,
                                                    }}
                                                />
                                                <Typography variant="caption">
                                                    {competency.score}%
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Paper>
                )}

                {/* Certification Status */}
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    {safePassed ? (
                        <>
                            <CheckIcon sx={{ fontSize: 60, color: 'success.main', mb: 2 }} />
                            <Typography variant="h5" gutterBottom color="success.main">
                                Certification Achieved!
                            </Typography>
                            <Typography variant="body1" paragraph>
                                You have successfully completed the Project Management with AI
                                certification. You demonstrated strong theoretical knowledge and
                                practical project management skills.
                            </Typography>

                            {certificateReady && (
                                <Stack
                                    direction="row"
                                    spacing={2}
                                    justifyContent="center"
                                    sx={{ mt: 3, flexWrap: 'wrap' }}
                                >
                                    <Button
                                        variant="contained"
                                        size="large"
                                        startIcon={<DownloadIcon />}
                                        onClick={openPublicCertificate}
                                        sx={{ px: 4 }}
                                    >
                                        View Certificate
                                    </Button>
                                    <Button
                                        variant="outlined"
                                        size="large"
                                        startIcon={<BadgeIcon />}
                                        onClick={openPublicBadge}
                                        sx={{ px: 4 }}
                                    >
                                        View Badge
                                    </Button>
                                    <Button
                                        variant="contained"
                                        color="info"
                                        size="large"
                                        startIcon={<ShareIcon />}
                                        onClick={handleLinkedInShare}
                                        sx={{
                                            px: 4,
                                            bgcolor: '#0077B5',
                                            '&:hover': { bgcolor: '#005885' },
                                        }}
                                    >
                                        Share on LinkedIn
                                    </Button>
                                </Stack>
                            )}

                            <Alert severity="success" sx={{ mt: 3, textAlign: 'left' }}>
                                <Typography variant="body2">
                                    <strong>Your certification includes:</strong>
                                    <br />
                                    • Verified project management theoretical knowledge
                                    <br />
                                    • Hands-on practical project management experience
                                    <br />
                                    • Crisis management and decision-making skills
                                    <br />
                                    • AI-enhanced project management capabilities
                                    <br />• Digital badge and PDF certificate
                                </Typography>
                            </Alert>
                        </>
                    ) : (
                        <>
                            <WrongIcon sx={{ fontSize: 60, color: 'error.main', mb: 2 }} />
                            <Typography variant="h5" gutterBottom color="error.main">
                                Certification Not Achieved
                            </Typography>
                            <Typography variant="body1" paragraph>
                                You need at least 70% to achieve certification. Review your
                                performance and consider retaking the assessment.
                            </Typography>

                            <Button
                                variant="contained"
                                size="large"
                                startIcon={<RetryIcon />}
                                onClick={handleRetakeCertification}
                                sx={{ px: 4, mt: 2 }}
                            >
                                Retake Certification
                            </Button>

                            <Alert severity="info" sx={{ mt: 3, textAlign: 'left' }}>
                                <Typography variant="body2">
                                    <strong>Areas to focus on for improvement:</strong>
                                    <br />
                                    {theoreticalScore?.percentage < 70 &&
                                        '• Review project management theory and concepts\n'}
                                    {practicalScore?.percentage < 70 &&
                                        '• Practice scenario-based problem solving\n'}
                                    {(projectPerformance?.score || 0) < 70 &&
                                        '• Improve project planning and execution skills\n'}
                                    • Study risk management and crisis response techniques
                                    <br />• Practice budget and timeline management
                                </Typography>
                            </Alert>
                        </>
                    )}
                </Paper>
            </Box>
        </AuthenticatedLayout>
    );
}
