import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  TextField,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
} from '@mui/icons-material';

export default function SimpleWorkflowBuilder({ project, workflow, onBack, onSave }) {
  const [name, setName] = useState(workflow?.name || '');

  const handleSave = () => {
    const workflowData = {
      name,
      description: 'Simple workflow',
      status: 'active',
      trigger: 'manual',
      actions: [],
      lastRun: new Date().toISOString(),
      runsCount: 0,
    };
    onSave(workflowData);
  };

  return (
    <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
      <Paper sx={{ p: 4, borderRadius: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            variant="outlined"
          >
            Back
          </Button>
          <Typography variant="h4" fontWeight={700}>
            Simple Workflow Builder
          </Typography>
        </Stack>

        <Box sx={{ mb: 3 }}>
          <TextField
            fullWidth
            label="Workflow Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            sx={{ mb: 2 }}
          />
        </Box>

        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!name.trim()}
          >
            Save Workflow
          </Button>
          <Button variant="outlined" onClick={onBack}>
            Cancel
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
