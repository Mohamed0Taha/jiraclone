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
    Alert,
    Grid,
} from '@mui/material';
import {
    CheckCircle as CheckIcon,
    Cancel as WrongIcon,
    PlayArrow as NextIcon,
    Refresh as RetryIcon,
} from '@mui/icons-material';

export default function PhaseResults({
    auth,
    attempt,
    answeredQuestions,
    totalScore,
    maxPossibleScore,
    percentage,
    passed,
    phase,
    nextPhase,
}) {
    // Ensure percentage is a valid number
    const safePercentage =
        typeof percentage === 'number' && !isNaN(percentage)
            ? percentage
            : maxPossibleScore > 0
              ? (totalScore / maxPossibleScore) * 100
              : 0;

    // Ensure passed status
    const safePassed = passed !== undefined ? passed : safePercentage >= 70;

    const handleContinue = () => {
        router.post(route('certification.start-practical'));
    };

    const handleRetake = () => {
        router.post(route('certification.reset'));
    };

    const getDifficultyLabel = (difficulty) => {
        switch (difficulty) {
            case 1:
                return 'Easy';
            case 2:
                return 'Medium';
            case 3:
                return 'Hard';
            default:
                return 'Unknown';
        }
    };

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Assessment Results - Project Management Certification" />

            <Box sx={{ maxWidth: 'lg', mx: 'auto', p: 3 }}>
                <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4 }}>
                    PM Concepts Phase Results
                </Typography>

                {/* Overall Score Card */}
                <Card
                    sx={{
                        mb: 4,
                        background: safePassed
                            ? 'linear-gradient(45deg, #4caf50, #81c784)'
                            : 'linear-gradient(45deg, #f44336, #ef5350)',
                        color: 'white',
                    }}
                >
                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                        <Typography variant="h3" gutterBottom>
                            {safePercentage.toFixed(1)}%
                        </Typography>
                        <Typography variant="h6" gutterBottom>
                            {totalScore || 0} out of {maxPossibleScore || 0} points
                        </Typography>
                        <Typography variant="body1">
                            {safePassed
                                ? '✅ You passed the PM Concepts phase!'
                                : '❌ You need 70% to proceed to practical scenarios'}
                        </Typography>
                    </CardContent>
                </Card>

                {/* Progress Bar */}
                <Paper sx={{ p: 3, mb: 4 }}>
                    <Typography variant="h6" gutterBottom>
                        Assessment Progress
                    </Typography>
                    <LinearProgress
                        variant="determinate"
                        value={Math.min(safePercentage, 100)}
                        sx={{ height: 12, borderRadius: 6, mb: 2 }}
                        color={safePassed ? 'success' : 'error'}
                    />
                    <Stack direction="row" justifyContent="space-between">
                        <Typography variant="body2" color="text.secondary">
                            Questions answered:{' '}
                            {Array.isArray(answeredQuestions) ? answeredQuestions.length : 0}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {safePercentage.toFixed(1)}% Score
                        </Typography>
                    </Stack>
                </Paper>

                {/* Question Breakdown */}
                <Paper sx={{ p: 3, mb: 4 }}>
                    <Typography variant="h6" gutterBottom>
                        Question by Question Breakdown
                    </Typography>
                    <Divider sx={{ mb: 2 }} />

                    {Array.isArray(answeredQuestions) && answeredQuestions.length > 0 ? (
                        <List>
                            {answeredQuestions.map((answer, index) => {
                                const questionText = answer.question || answer.question_text || 'Question text not available';
                                const userAnsRaw = answer.user_answer !== undefined ? answer.user_answer : answer.selected_answer;
                                const userAns = Array.isArray(userAnsRaw) ? userAnsRaw.join(', ') : (userAnsRaw || '—');
                                const correctRaw = answer.correct_answer;
                                const correctAns = Array.isArray(correctRaw) ? correctRaw.join(', ') : (correctRaw || 'Not available');
                                const difficulty = answer.difficulty || answer.question?.difficulty || 0;
                                const maxPts = answer.max_points || answer.question?.points || 0;
                                const ptsEarned = answer.points_earned || 0;
                                return (
                                <ListItem
                                    key={index}
                                    divider
                                    sx={{
                                        flexDirection: 'column',
                                        alignItems: 'flex-start',
                                        py: 2,
                                    }}
                                >
                                    <Stack
                                        direction="row"
                                        spacing={2}
                                        alignItems="center"
                                        sx={{ width: '100%', mb: 1 }}
                                    >
                                        {answer.is_correct ? (
                                            <CheckIcon color="success" />
                                        ) : (
                                            <WrongIcon color="error" />
                                        )}

                                        <Box sx={{ flexGrow: 1 }}>
                                            <Typography variant="body1" fontWeight={600}>
                                                Question {index + 1}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {questionText}
                                            </Typography>
                                        </Box>

                                        <Stack spacing={1} alignItems="flex-end">
                                            <Chip
                                                label={getDifficultyLabel(difficulty)}
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                                {ptsEarned}/{maxPts} pts
                                            </Typography>
                                        </Stack>
                                    </Stack>

                                    <Grid container spacing={2} sx={{ mt: 1 }}>
                                        <Grid item xs={12} md={6}>
                                            <Typography variant="body2" color="text.secondary">
                                                <strong>Your Answer:</strong>{' '}
                                                {userAns}
                                            </Typography>
                                        </Grid>
                                        <Grid item xs={12} md={6}>
                                            <Typography variant="body2" color="success.main">
                                                <strong>Correct Answer:</strong>{' '}
                                                {correctAns}
                                            </Typography>
                                        </Grid>
                                        {(answer.explanation || answer.question?.explanation) && (
                                            <Grid item xs={12}>
                                                <Alert severity="info" sx={{ mt: 1 }}>
                                                    <Typography variant="body2">
                                                        <strong>Explanation:</strong>{' '}
                                                        {answer.explanation || answer.question?.explanation}
                                                    </Typography>
                                                </Alert>
                                            </Grid>
                                        )}
                                    </Grid>
                                </ListItem>
                                );
                            })}
                        </List>
                    ) : (
                        <Alert severity="warning">
                            No answered questions found. Please retake the assessment.
                        </Alert>
                    )}
                </Paper>

                {/* Action Buttons */}
                <Paper sx={{ p: 4, textAlign: 'center' }}>
                    <Typography variant="h6" gutterBottom>
                        What's Next?
                    </Typography>

                    <Stack
                        direction="row"
                        spacing={2}
                        justifyContent="center"
                        alignItems="center"
                        sx={{ mt: 3 }}
                    >
                        {safePassed ? (
                            <Button
                                variant="contained"
                                size="large"
                                onClick={handleContinue}
                                startIcon={<NextIcon />}
                                sx={{ px: 4, py: 1.5 }}
                            >
                                Continue to Practical Scenario
                            </Button>
                        ) : (
                            <Alert severity="warning" sx={{ mb: 2, textAlign: 'center' }}>
                                You need at least 70% to proceed to the practical scenario phase.
                            </Alert>
                        )}

                        <Button
                            variant="outlined"
                            size="large"
                            onClick={handleRetake}
                            startIcon={<RetryIcon />}
                            sx={{ px: 4, py: 1.5 }}
                        >
                            Retake Assessment
                        </Button>
                    </Stack>

                    <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
                        {safePassed
                            ? 'Great job! You can now proceed to the practical scenario phase where you will tackle real-world PM challenges.'
                            : 'Review the explanations above and try again. You can retake the assessment as many times as needed.'}
                    </Typography>
                </Paper>
            </Box>
        </AuthenticatedLayout>
    );
}
