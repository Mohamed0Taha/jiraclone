import React, { useState, useCallback, useEffect } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Box,
    Stepper,
    Step,
    StepLabel,
    Typography,
    Paper,
    Stack,
    Alert,
    Card,
    CardContent,
    Button,
    RadioGroup,
    FormControlLabel,
    Radio,
    LinearProgress,
    Chip,
    Divider,
} from '@mui/material';
import {
    CheckCircle as CheckIcon,
    ArrowBack as BackIcon,
    Quiz as QuizIcon,
    Assignment as ProjectIcon,
    EmojiEvents as TrophyIcon,
    Close as CloseIcon,
} from '@mui/icons-material';

const CERTIFICATION_PHASES = [
    {
        id: 'pm_concepts',
        label: 'PM Concepts & Theory',
        icon: QuizIcon,
        description: 'Answer questions about core project management concepts',
    },
    {
        id: 'practical_scenario',
        label: 'Practical Scenario',
        icon: ProjectIcon,
        description: 'Complete a realistic project management scenario',
    },
    {
        id: 'certification_complete',
        label: 'Certification Complete',
        icon: TrophyIcon,
        description: 'Receive your certification',
    },
];

export default function CertificationIndex({
    auth,
    attempt,
    pmQuestions,
    currentQuestion,
    totalQuestions,
    answeredCount = 0,
    score,
    maxScore,
    phase,
    feedback,
    remainingSeconds,
    timeUp,
}) {
    // Add localRemaining state early so effects can use it
    const [localRemaining, setLocalRemaining] = useState(remainingSeconds ?? 20 * 60);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showFeedback, setShowFeedback] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [feedbackType, setFeedbackType] = useState('info');

    const currentPhase = phase || 'pm_concepts';
    const activeStepIndex = CERTIFICATION_PHASES.findIndex((p) => p.id === currentPhase);

    useEffect(() => {
        if (feedback) {
            setFeedbackMessage(
                feedback.correct
                    ? `Correct! You earned ${feedback.points_earned} points. ${feedback.explanation}`
                    : `Incorrect. ${feedback.explanation}`
            );
            setFeedbackType(feedback.correct ? 'success' : 'error');
            setShowFeedback(true);
            // Clear the selected answer for the next question
            setSelectedAnswers({});
        }
    }, [feedback]);

    useEffect(() => {
        if (showFeedback) {
            const timer = setTimeout(() => {
                setShowFeedback(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [showFeedback]);

    const handleAnswerChange = (questionId, answer) => {
        setSelectedAnswers((prev) => ({
            ...prev,
            [questionId]: answer,
        }));
    };

    const submitAnswer = useCallback(async () => {
        if (!currentQuestion || !selectedAnswers[currentQuestion.id]) {
            setFeedbackMessage('Please select an answer before continuing.');
            setFeedbackType('warning');
            setShowFeedback(true);
            return;
        }

        setIsSubmitting(true);

        router.post(
            route('certification.answer'),
            {
                question_id: currentQuestion.id,
                answer: selectedAnswers[currentQuestion.id],
            },
            {
                preserveScroll: true,
                onError: (errors) => {
                    setFeedbackMessage(errors.answer || 'An error occurred. Please try again.');
                    setFeedbackType('error');
                    setShowFeedback(true);
                },
                onFinish: () => {
                    setIsSubmitting(false);
                },
            }
        );
    }, [currentQuestion, selectedAnswers]);

    const goToPreviousQuestion = useCallback(() => {
        router.post(
            route('certification.previous'),
            {},
            {
                preserveScroll: true,
            }
        );
    }, []);

    const startPracticalScenario = useCallback(() => {
        router.post(
            route('certification.start-practical'),
            {},
            {
                preserveScroll: true,
            }
        );
    }, []);

    const renderProgressBar = () => {
        if (currentPhase === 'pm_concepts' && totalQuestions > 0) {
            const progress = (answeredCount / totalQuestions) * 100;
            return (
                <Box sx={{ mb: 3 }}>
                    <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="center"
                        sx={{ mb: 1 }}
                    >
                        <Typography variant="body2" color="textSecondary">
                            Question Progress
                        </Typography>
                        <Typography variant="body2" color="textSecondary">
                            {answeredCount} / {totalQuestions} completed
                        </Typography>
                    </Stack>
                    <LinearProgress
                        variant="determinate"
                        value={progress}
                        sx={{ height: 8, borderRadius: 4 }}
                    />
                </Box>
            );
        }
        return null;
    };

    const renderScoreDisplay = () => {
        // Hide score during pm_concepts until completed or time up
        if (phase === 'pm_concepts' && currentQuestion && !timeUp) return null;
        if (score !== undefined && maxScore !== undefined) {
            const percentage = maxScore > 0 ? (score / maxScore) * 100 : 0;
            const isPassingScore = percentage >= 90;

            return (
                <Box sx={{ mb: 3 }}>
                    <Stack direction="row" spacing={2} alignItems="center">
                        <Chip
                            label={`Score: ${score}/${maxScore} (${percentage.toFixed(1)}%)`}
                            color={isPassingScore ? 'success' : 'warning'}
                            variant="filled"
                        />
                        {!isPassingScore && (
                            <Typography variant="body2" color="warning.main">
                                90%+ required for certification
                            </Typography>
                        )}
                    </Stack>
                </Box>
            );
        }
        return null;
    };

    const renderPMConceptsPhase = () => {
        if (!currentQuestion) {
            return (
                <Box sx={{ textAlign: 'center', py: 6 }}>
                    <Typography variant="h5" gutterBottom>
                        PM Concepts Assessment Complete!
                    </Typography>
                    <Typography variant="body1" paragraph>
                        You've completed all the project management concept questions.
                    </Typography>
                    {renderScoreDisplay()}
                    {score !== undefined &&
                    maxScore !== undefined &&
                    (score / maxScore) * 100 >= 90 ? (
                        <>
                            <Typography variant="body1" color="success.main" gutterBottom>
                                Congratulations! You've passed the concepts phase.
                            </Typography>
                            <Button
                                variant="contained"
                                onClick={startPracticalScenario}
                                startIcon={<ProjectIcon />}
                                size="large"
                                sx={{ mt: 2 }}
                            >
                                Start Practical Scenario
                            </Button>
                        </>
                    ) : (
                        <Stack spacing={2} alignItems="center">
                            <Alert severity="warning" sx={{ maxWidth: 600, mx: 'auto' }}>
                                You need at least 90% to proceed to the practical scenario phase.
                                Please review project management concepts and try again.
                            </Alert>
                            <Button
                                variant="outlined"
                                onClick={() => {
                                    router.post(route('certification.reset'));
                                }}
                                size="medium"
                            >
                                Start Over
                            </Button>
                        </Stack>
                    )}
                </Box>
            );
        }

        // Timer calculations (use localRemaining for smooth countdown)
        const totalSeconds = 20 * 60;
        const remainRaw =
            typeof localRemaining === 'number'
                ? localRemaining
                : (remainingSeconds ?? totalSeconds);
        
        // Debug: Log the values to understand where large number comes from
        console.log('Timer Debug - remainingSeconds:', remainingSeconds, 'localRemaining:', localRemaining, 'remainRaw:', remainRaw);
        
        const remaining = Math.max(0, Math.min(totalSeconds, Math.floor(remainRaw)));
        const elapsed = totalSeconds - remaining;
        const progressFrac = elapsed / totalSeconds; // 0..1
        const circumference = 2 * Math.PI * 42; // r=42
        const strokeDashoffset = (1 - progressFrac) * circumference;
        const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
        const ss = String(remaining % 60).padStart(2, '0');
        return (
            <Box sx={{ maxWidth: 800, mx: 'auto' }}>
                {renderProgressBar()}
                {renderScoreDisplay()}

                <Card>
                    <CardContent>
                        <Stack spacing={3}>
                            <Box>
                                <Chip
                                    label={
                                        currentQuestion.category.charAt(0).toUpperCase() +
                                        currentQuestion.category.slice(1)
                                    }
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                />
                                <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                                    Difficulty: {currentQuestion.difficulty}/3 • Points:{' '}
                                    {currentQuestion.points}
                                </Typography>
                            </Box>

                            <Typography
                                variant="h6"
                                className="exam-question"
                                style={{ userSelect: 'none' }}
                            >
                                {currentQuestion.question}
                            </Typography>

                            {Array.isArray(currentQuestion.options) &&
                            currentQuestion.options.length > 0 ? (
                                <RadioGroup
                                    value={selectedAnswers[currentQuestion.id] || ''}
                                    onChange={(e) =>
                                        handleAnswerChange(currentQuestion.id, e.target.value)
                                    }
                                >
                                    {currentQuestion.options.map((option, index) => (
                                        <FormControlLabel
                                            key={index}
                                            value={option}
                                            control={<Radio />}
                                            label={option}
                                            sx={{
                                                '& .MuiFormControlLabel-label': {
                                                    fontSize: '0.95rem',
                                                    lineHeight: 1.5,
                                                },
                                            }}
                                        />
                                    ))}
                                </RadioGroup>
                            ) : (
                                <Box>
                                    <Typography
                                        variant="body2"
                                        color="textSecondary"
                                        sx={{ mb: 1 }}
                                    >
                                        Provide your answer:
                                    </Typography>
                                    <textarea
                                        style={{
                                            width: '100%',
                                            minHeight: 160,
                                            padding: 12,
                                            fontSize: '0.95rem',
                                            borderRadius: 8,
                                            border: '1px solid #ccc',
                                            resize: 'vertical',
                                        }}
                                        value={selectedAnswers[currentQuestion.id] || ''}
                                        onChange={(e) =>
                                            handleAnswerChange(currentQuestion.id, e.target.value)
                                        }
                                        placeholder="Type your response here..."
                                        onCopy={(e) => e.preventDefault()}
                                        onCut={(e) => e.preventDefault()}
                                        onPaste={(e) => e.preventDefault()}
                                    />
                                </Box>
                            )}

                            {showFeedback && (
                                <Alert
                                    severity={feedbackType}
                                    onClose={() => setShowFeedback(false)}
                                    action={
                                        <Button
                                            color="inherit"
                                            size="small"
                                            onClick={() => setShowFeedback(false)}
                                        >
                                            <CloseIcon fontSize="inherit" />
                                        </Button>
                                    }
                                >
                                    {feedbackMessage}
                                </Alert>
                            )}

                            <Stack direction="row" spacing={2} justifyContent="flex-end">
                                {answeredCount > 0 && (
                                    <Button
                                        variant="outlined"
                                        startIcon={<BackIcon />}
                                        onClick={goToPreviousQuestion}
                                        disabled={isSubmitting}
                                    >
                                        Previous
                                    </Button>
                                )}

                                <Button
                                    variant="contained"
                                    onClick={submitAnswer}
                                    disabled={!selectedAnswers[currentQuestion.id] || isSubmitting}
                                    endIcon={isSubmitting ? null : <CheckIcon />}
                                >
                                    {isSubmitting ? 'Submitting...' : 'Submit Answer'}
                                </Button>
                            </Stack>
                        </Stack>
                    </CardContent>
                </Card>
                {/* Timer + Anti-cheat notice */}
                {phase === 'pm_concepts' && !timeUp && (
                    <>
                        <Box sx={{ position: 'fixed', bottom: 24, left: 24, zIndex: 2000 }}>
                            <Box sx={{ position: 'relative', width: 100, height: 100 }}>
                                <svg
                                    width={100}
                                    height={100}
                                    role="img"
                                    aria-label={`Time remaining ${mm}:${ss}`}
                                >
                                    <circle
                                        cx={50}
                                        cy={50}
                                        r={42}
                                        stroke="#e0e0e0"
                                        strokeWidth={6}
                                        fill="none"
                                    />
                                    <circle
                                        cx={50}
                                        cy={50}
                                        r={42}
                                        stroke={remaining < 60 ? '#d32f2f' : '#1976d2'}
                                        strokeWidth={6}
                                        fill="none"
                                        strokeDasharray={circumference}
                                        strokeDashoffset={strokeDashoffset}
                                        strokeLinecap="round"
                                        style={{
                                            transition: 'stroke-dashoffset 1s linear',
                                            transform: 'rotate(-90deg)',
                                            transformOrigin: '50% 50%',
                                        }}
                                    />
                                    <text
                                        x="50%"
                                        y="50%"
                                        dominantBaseline="middle"
                                        textAnchor="middle"
                                        fontSize="16"
                                        fontFamily="monospace"
                                        fill={remaining < 60 ? '#d32f2f' : '#1976d2'}
                                    >
                                        {mm}:{ss}
                                    </text>
                                </svg>
                            </Box>
                        </Box>
                        <Typography
                            variant="caption"
                            color="textSecondary"
                            sx={{ position: 'fixed', bottom: 8, left: 24, zIndex: 2001 }}
                        >
                            Time Remaining
                        </Typography>
                    </>
                )}
                {timeUp && (
                    <Alert severity="warning" sx={{ mt: 2 }}>
                        Time is up. No further answers accepted.
                    </Alert>
                )}
            </Box>
        );
    };

    const renderPracticalScenarioPhase = () => {
        // This should redirect to the dedicated PracticalScenario page
        // The controller should handle this redirect automatically
        return (
            <Box sx={{ maxWidth: 800, mx: 'auto', textAlign: 'center', py: 6 }}>
                <Typography variant="h5" gutterBottom>
                    Loading Practical Scenario...
                </Typography>
                <Typography variant="body1" paragraph>
                    Preparing your personalized project management challenge.
                </Typography>
                <LinearProgress sx={{ mt: 2 }} />
            </Box>
        );
    };

    const renderCertificationCompletePhase = () => {
        return (
            <Box sx={{ maxWidth: 800, mx: 'auto', textAlign: 'center', py: 6 }}>
                <TrophyIcon sx={{ fontSize: 80, color: 'gold', mb: 2 }} />
                <Typography variant="h4" gutterBottom>
                    Congratulations!
                </Typography>
                <Typography variant="h6" color="textSecondary" paragraph>
                    You have successfully completed the Project Management with AI certification.
                </Typography>
                {renderScoreDisplay()}
                <Button variant="contained" size="large" sx={{ mt: 2 }}>
                    Download Certificate
                </Button>
            </Box>
        );
    };

    const renderPhaseContent = () => {
        switch (currentPhase) {
            case 'pm_concepts':
                return renderPMConceptsPhase();
            case 'practical_scenario':
                return renderPracticalScenarioPhase();
            case 'certification_complete':
                return renderCertificationCompletePhase();
            default:
                return renderPMConceptsPhase();
        }
    };

    /* Enhanced countdown: continuous timer with automatic expiration handling */
    useEffect(() => {
        setLocalRemaining(remainingSeconds ?? 20 * 60);
    }, [remainingSeconds]);

    useEffect(() => {
        if (phase !== 'pm_concepts') return;
        if (typeof remainingSeconds !== 'number') return;

        // If already time up, don't start timer
        if (timeUp || remainingSeconds <= 0) {
            setLocalRemaining(0);
            return;
        }

        const tick = () => {
            setLocalRemaining((prev) => {
                // initialize
                if (prev === null || prev === undefined) return remainingSeconds ?? 20 * 60;
                const newValue = prev - 1;

                // When timer hits 0, automatically redirect to cooldown page
                if (newValue <= 0) {
                    setTimeout(() => {
                        router.reload(); // This will trigger the backend to detect expiration and show cooldown
                    }, 1000);
                    return 0;
                }
                return newValue;
            });
        };

        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [phase, remainingSeconds, timeUp]);

    useEffect(() => {
        // periodic server sync (30s) to correct drift and check expiration
        if (phase !== 'pm_concepts') return;
        if (!remainingSeconds || timeUp) return;

        const sync = setInterval(() => {
            router.reload({ only: ['remainingSeconds', 'timeUp'] });
        }, 30000);
        return () => clearInterval(sync);
    }, [phase, timeUp, remainingSeconds]);

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Typography variant="h4" component="h2">
                        PM with AI Certification
                    </Typography>
                </Box>
            }
        >
            <Head title="PM with AI Certification" />

            <Box sx={{ maxWidth: 1200, mx: 'auto', p: 3 }}>
                {/* Phase Stepper */}
                <Paper sx={{ p: 3, mb: 4 }}>
                    <Stepper activeStep={activeStepIndex} alternativeLabel>
                        {CERTIFICATION_PHASES.map((phase, index) => {
                            const StepIcon = phase.icon;
                            return (
                                <Step key={phase.id}>
                                    <StepLabel
                                        StepIconComponent={() => (
                                            <StepIcon
                                                color={
                                                    index <= activeStepIndex
                                                        ? 'primary'
                                                        : 'disabled'
                                                }
                                                sx={{ fontSize: 28 }}
                                            />
                                        )}
                                    >
                                        <Typography variant="subtitle1" fontWeight={600}>
                                            {phase.label}
                                        </Typography>
                                        <Typography variant="body2" color="textSecondary">
                                            {phase.description}
                                        </Typography>
                                    </StepLabel>
                                </Step>
                            );
                        })}
                    </Stepper>
                </Paper>

                {/* Phase Content */}
                <Paper sx={{ p: 4 }}>{renderPhaseContent()}</Paper>
            </Box>
        </AuthenticatedLayout>
    );
}
