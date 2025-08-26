import React, { useState, useCallback } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Box, Stepper, Step, StepLabel, Button, Typography, Paper, Stack, Alert } from '@mui/material';

/* Steps definition */
const STEPS = [
  'Create a Project from Requirements',
  'Generate Tasks from Prompts & Suggestions',
  'Edit Tasks (Assignee, Dates, Status)',
  'Use the Chat Assistant (Query + Execute)',
  'Manage Project Members (Add & Remove)',
  'Certification Award'
];

export default function CertificationIndex({ auth, attempt }) {
  const current = attempt?.current_step || 1; // 1-based
  const [activeStep, setActiveStep] = useState(current - 1);

  const advance = useCallback((targetStep) => {
    router.post(route('certification.progress'), { step: targetStep }, {
      preserveScroll: true,
      onSuccess: () => setActiveStep(targetStep - 1)
    });
  }, []);

  const complete = useCallback(() => {
    router.post(route('certification.complete'), {}, {
      preserveScroll: true,
      onSuccess: () => setActiveStep(5)
    });
  }, []);

  const renderStepContent = (idx) => {
    switch(idx) {
      case 0:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Create a Project</Typography>
            <Typography variant="body2" paragraph>
              Use the Project creation form to build a project from a requirements document. (Mock interaction placeholder.)
            </Typography>
            <Button variant="contained" onClick={() => advance(2)}>I created a project</Button>
          </Box>
        );
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Generate Tasks</Typography>
            <Typography variant="body2" paragraph>
              Enter prompts and use suggestions to generate tasks automatically. (Mock interaction placeholder.)
            </Typography>
            <Button variant="contained" onClick={() => advance(3)}>Tasks generated</Button>
          </Box>
        );
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Edit Tasks</Typography>
            <Typography variant="body2" paragraph>
              Update assignee, due dates, and status on a task. (Mock interaction placeholder.)
            </Typography>
            <Button variant="contained" onClick={() => advance(4)}>I edited a task</Button>
          </Box>
        );
      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Chat Assistant</Typography>
            <Typography variant="body2" paragraph>
              Ask the assistant for project insights and run a single command. (Mock interaction placeholder.)
            </Typography>
            <Button variant="contained" onClick={() => advance(5)}>I queried the assistant</Button>
          </Box>
        );
      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom>Manage Members</Typography>
            <Typography variant="body2" paragraph>
              Add and remove a collaborator from your project. (Mock interaction placeholder.)
            </Typography>
            <Button variant="contained" onClick={() => complete()}>I managed members</Button>
          </Box>
        );
      case 5:
        return (
          <Box textAlign="center">
            <Typography variant="h5" gutterBottom>Congratulations! 🎉</Typography>
            <Typography variant="body2" paragraph>
              You have completed the TaskPilot Product Certification. Your certificate serial number is below.
            </Typography>
            {attempt?.serial && <Alert severity="success" sx={{ mb: 2 }}>Serial: {attempt.serial}</Alert>}
            <Button variant="outlined" href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://taskpilot.us/certification?user='+attempt?.id)}`} target="_blank">Share on LinkedIn</Button>
          </Box>
        );
      default:
        return null;
    }
  };

  return (
    <AuthenticatedLayout user={auth?.user}>
      <Head title="Certification" />
      <Box sx={{ maxWidth: 960, mx: 'auto', p: { xs: 2, md: 4 } }}>
        <Typography variant="h4" fontWeight={700} gutterBottom>TaskPilot Certification</Typography>
        <Typography variant="body1" sx={{ mb: 3 }}>
          Progress through each interactive step to earn your certification.
        </Typography>
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 }, mb: 4 }}>
          <Stepper activeStep={activeStep} alternativeLabel>
            {STEPS.map(label => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>
        </Paper>
        <Paper variant="outlined" sx={{ p: { xs: 2, md: 3 } }}>
          {renderStepContent(activeStep)}
        </Paper>
      </Box>
    </AuthenticatedLayout>
  );
}
