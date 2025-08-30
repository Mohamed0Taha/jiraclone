import React, { useState } from 'react';
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
    Stepper,
    Step,
    StepLabel,
    TextField,
    Alert,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    List,
    ListItem,
    ListItemText,
    Chip,
    Grid,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    Send as SubmitIcon,
    Assignment as ProjectIcon,
} from '@mui/icons-material';

export default function PracticalScenario({
    auth,
    attempt,
    scenario,
    currentChallenge,
    step,
    totalSteps,
}) {
    const [response, setResponse] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        if (response.trim().length < 50) {
            alert('Please provide a detailed response (minimum 50 characters)');
            return;
        }

        setIsSubmitting(true);

        router.post(
            route('certification.practical.submit'),
            {
                response: response.trim(),
                step: step,
            },
            {
                onFinish: () => setIsSubmitting(false),
                onError: () => setIsSubmitting(false),
            }
        );
    };

    const steps = [
        'Requirements Definition',
        'Timeline Creation',
        'Crisis Management',
        'Resource Optimization',
        'AI Implementation',
    ];

    const getChallengeIcon = () => <ProjectIcon />;

    return (
        <AuthenticatedLayout user={auth.user}>
            <Head title="Practical Scenario - Project Management Certification" />

            <Box sx={{ maxWidth: 'lg', mx: 'auto', p: 3 }}>
                <Typography variant="h4" gutterBottom align="center" sx={{ mb: 4 }}>
                    Practical Scenario
                </Typography>

                {/* Progress Stepper */}
                <Paper sx={{ p: 3, mb: 4 }}>
                    <Stepper activeStep={step - 1} alternativeLabel>
                        {steps.map((label, index) => (
                            <Step key={label} completed={index < step - 1}>
                                <StepLabel>{label}</StepLabel>
                            </Step>
                        ))}
                    </Stepper>

                    <Box sx={{ mt: 2, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            Step {step} of {totalSteps}
                        </Typography>
                        <LinearProgress
                            variant="determinate"
                            value={(step / totalSteps) * 100}
                            sx={{ mt: 1, height: 8, borderRadius: 5 }}
                        />
                    </Box>
                </Paper>

                {/* Scenario Context */}
                <Accordion sx={{ mb: 3 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography variant="h6">Project Context & Background</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom color="primary">
                                            {scenario.title}
                                        </Typography>
                                        <Typography variant="body2" paragraph>
                                            {scenario.description}
                                        </Typography>

                                        <Typography variant="subtitle2" gutterBottom sx={{ mt: 2 }}>
                                            Project Constraints:
                                        </Typography>
                                        <Stack spacing={1}>
                                            <Chip
                                                label={`Budget: $${scenario.constraints.budget.toLocaleString()}`}
                                                size="small"
                                            />
                                            <Chip
                                                label={`Timeline: ${scenario.constraints.timeline} weeks`}
                                                size="small"
                                            />
                                            <Chip
                                                label={`Team: ${scenario.constraints.team_size} members`}
                                                size="small"
                                            />
                                            <Chip
                                                label={`Priority: ${scenario.constraints.client_priority}`}
                                                size="small"
                                                color="primary"
                                            />
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>

                            <Grid item xs={12} md={6}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Team Members
                                        </Typography>
                                        <List dense>
                                            {scenario.team_members.map((member, index) => (
                                                <ListItem key={index} divider>
                                                    <ListItemText
                                                        primary={member.name}
                                                        secondary={
                                                            <Stack
                                                                direction="row"
                                                                spacing={1}
                                                                sx={{ mt: 0.5 }}
                                                            >
                                                                <Chip
                                                                    label={member.role}
                                                                    size="small"
                                                                    variant="outlined"
                                                                />
                                                                <Chip
                                                                    label={`${member.capacity}h/week`}
                                                                    size="small"
                                                                />
                                                            </Stack>
                                                        }
                                                    />
                                                </ListItem>
                                            ))}
                                        </List>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    </AccordionDetails>
                </Accordion>

                {/* Current Challenge */}
                <Paper sx={{ p: 3, mb: 4 }}>
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
                        {getChallengeIcon()}
                        <Typography variant="h5">
                            Challenge {step}:{' '}
                            {currentChallenge.type
                                .replace('_', ' ')
                                .replace(/\b\w/g, (l) => l.toUpperCase())}
                        </Typography>
                        <Chip label={`${currentChallenge.points} points`} color="primary" />
                    </Stack>

                    <Alert severity="info" sx={{ mb: 3 }}>
                        <Typography variant="body1" paragraph>
                            <strong>Situation:</strong> {currentChallenge.description}
                        </Typography>
                        <Typography variant="body1">
                            <strong>Your Task:</strong> {currentChallenge.task}
                        </Typography>
                    </Alert>

                    <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>
                        Your Response:
                    </Typography>
                    <TextField
                        multiline
                        rows={8}
                        fullWidth
                        variant="outlined"
                        placeholder="Provide a detailed response explaining your approach, reasoning, and specific actions you would take as the project manager. Consider the impact on scope, time, cost, quality, and team dynamics."
                        value={response}
                        onChange={(e) => setResponse(e.target.value)}
                        helperText={`${response.length}/50 minimum characters. Be specific and detailed in your response.`}
                        sx={{ mb: 3 }}
                    />

                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="body2" color="text.secondary">
                            This is a practical assessment where your project management
                            decision-making skills will be evaluated.
                        </Typography>
                        <Button
                            variant="contained"
                            size="large"
                            onClick={handleSubmit}
                            disabled={isSubmitting || response.trim().length < 50}
                            startIcon={<SubmitIcon />}
                            sx={{ px: 4 }}
                        >
                            {isSubmitting ? 'Submitting...' : 'Submit Response'}
                        </Button>
                    </Stack>
                </Paper>

                {/* Instructions */}
                <Alert severity="warning" sx={{ mb: 2 }}>
                    <Typography variant="body2">
                        <strong>Important:</strong> Take your time to provide thoughtful, detailed
                        responses. Consider multiple perspectives, potential risks, and the impact
                        of your decisions on the project's success. Your responses will be evaluated
                        based on project management best practices and practical wisdom.
                    </Typography>
                </Alert>
            </Box>
        </AuthenticatedLayout>
    );
}
