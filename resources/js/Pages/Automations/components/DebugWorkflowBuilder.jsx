import React, { useState } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Stack,
  TextField,
  Card,
  CardContent,
  Divider,
  useTheme,
  alpha,
  Alert,
  Snackbar,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Build as BuildIcon,
} from '@mui/icons-material';

export default function DebugWorkflowBuilder({ project, workflow, onBack, onSave }) {
  const theme = useTheme();
  const [name, setName] = useState(workflow?.name || '');
  const [description, setDescription] = useState(workflow?.description || '');
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // 'success', 'error', ''

  const handleSave = async () => {
    console.log('handleSave called with data:', { name, description });
    setIsSaving(true);
    setSaveStatus('');
    
    try {
      const workflowData = {
        name,
        description,
        status: 'active',
        trigger: 'manual',
        actions: [
          {
            id: 'placeholder',
            type: 'noop',
            name: 'Placeholder Action',
            note: 'Edit this workflow later to configure real actions.'
          }
        ],
        lastRun: new Date().toISOString(),
        runsCount: 0,
      };
      
      console.log('Calling onSave with:', workflowData);
      console.log('onSave function:', onSave);
      
      if (typeof onSave === 'function') {
        await onSave(workflowData);
        console.log('onSave called successfully');
        setSaveStatus('success');
        // Auto-redirect after a short delay to show success message
        setTimeout(() => {
          console.log('Auto-redirecting after successful save');
        }, 1500);
      } else {
        console.error('onSave is not a function:', typeof onSave);
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('Error in handleSave:', error);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  console.log('DebugWorkflowBuilder rendered with:', { project, workflow });

  return (
    <Box sx={{ p: 3, maxWidth: 1000, mx: 'auto' }}>
      {/* Header */}
      <Paper
        elevation={0}
        sx={{
          mb: 4,
          p: 4,
          borderRadius: 4,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white',
        }}
      >
        <Stack direction="row" alignItems="center" spacing={3}>
          <Button
            startIcon={<ArrowBackIcon />}
            onClick={onBack}
            sx={{
              bgcolor: 'rgba(255,255,255,0.2)',
              color: 'white',
              '&:hover': { bgcolor: 'rgba(255,255,255,0.3)' },
            }}
          >
            Back
          </Button>
          <Typography variant="h4" fontWeight={700}>
            Debug Workflow Builder
          </Typography>
        </Stack>
      </Paper>

      {/* Basic Form */}
      <Paper sx={{ p: 4, borderRadius: 3, mb: 3 }}>
        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 3 }}>
          <BuildIcon color="primary" />
          <Typography variant="h5" fontWeight={600}>
            Workflow Details
          </Typography>
        </Stack>

        <Stack spacing={3}>
          <TextField
            fullWidth
            label="Workflow Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter workflow name..."
          />
          
          <TextField
            fullWidth
            multiline
            rows={3}
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what this workflow does..."
          />
        </Stack>
      </Paper>

      {/* Test alpha function */}
      <Card 
        sx={{ 
          mb: 3,
          background: alpha(theme.palette.primary.main, 0.1),
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        }}
      >
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Test Alpha Function
          </Typography>
          <Typography color="text.secondary">
            This tests if the alpha function is working properly with theme colors.
          </Typography>
        </CardContent>
      </Card>

      {/* Actions */}
      <Paper sx={{ p: 3, borderRadius: 3 }}>
        {saveStatus === 'success' && (
          <Alert severity="success" sx={{ mb: 3 }}>
            ✅ Workflow saved successfully! You should be redirected back to the list.
          </Alert>
        )}
        
        {saveStatus === 'error' && (
          <Alert severity="error" sx={{ mb: 3 }}>
            ❌ Failed to save workflow. Check the console for details.
          </Alert>
        )}
        
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!name.trim() || isSaving}
            size="large"
            sx={{
              minWidth: 160,
              bgcolor: isSaving ? 'grey.400' : 'primary.main',
            }}
          >
            {isSaving ? 'Saving...' : 'Save Workflow'}
          </Button>
          <Button 
            variant="outlined" 
            onClick={onBack}
            size="large"
            disabled={isSaving}
          >
            Cancel
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
