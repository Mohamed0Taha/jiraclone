import React, { useState, useCallback } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { 
  Box, Stepper, Step, StepLabel, Button, Typography, Paper, Stack, Alert, 
  TextField, Card, CardContent, Chip, Dialog, DialogTitle, DialogContent, 
  DialogActions, List, ListItem, ListItemText, IconButton, alpha 
} from '@mui/material';
import { 
  Add as AddIcon, 
  Chat as ChatIcon, 
  Assignment as AssignmentIcon,
  Group as GroupIcon,
  EmojiEvents as TrophyIcon,
  CheckCircle as CheckIcon,
  LinkedIn as LinkedInIcon
} from '@mui/icons-material';

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
  
  // Mock state for interactive elements
  const [mockProject, setMockProject] = useState({ name: '', description: '' });
  const [mockTasks, setMockTasks] = useState([]);
  const [mockMembers, setMockMembers] = useState(['John Doe', 'Sarah Chen']);
  const [chatQuery, setChatQuery] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState('');

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
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssignmentIcon color="primary" /> Step 1: Create a Project from Requirements
            </Typography>
            <Typography variant="body2" paragraph>
              Practice creating a project by filling out the form below with project requirements.
            </Typography>
            
            <Card variant="outlined" sx={{ mb: 3, bgcolor: alpha('#4F46E5', 0.02) }}>
              <CardContent>
                <Stack spacing={2}>
                  <TextField
                    label="Project Name"
                    value={mockProject.name}
                    onChange={(e) => setMockProject(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="E.g., E-commerce Website Redesign"
                    size="small"
                    fullWidth
                  />
                  <TextField
                    label="Project Description"
                    value={mockProject.description}
                    onChange={(e) => setMockProject(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe the project requirements and goals..."
                    multiline
                    rows={3}
                    size="small"
                    fullWidth
                  />
                </Stack>
              </CardContent>
            </Card>
            
            <Button 
              variant="contained" 
              disabled={!mockProject.name || !mockProject.description}
              onClick={() => advance(2)}
              startIcon={<CheckIcon />}
            >
              Project Created - Next Step
            </Button>
          </Box>
        );
        
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AddIcon color="primary" /> Step 2: Generate Tasks from Prompts
            </Typography>
            <Typography variant="body2" paragraph>
              Use AI suggestions to generate project tasks. Try adding some tasks below.
            </Typography>
            
            <Card variant="outlined" sx={{ mb: 3, bgcolor: alpha('#10B981', 0.02) }}>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="subtitle2">Suggested Task Templates:</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    {['User Research', 'Design Mockups', 'Frontend Development', 'Testing', 'Deployment'].map(suggestion => (
                      <Chip 
                        key={suggestion}
                        label={suggestion}
                        onClick={() => {
                          if (!mockTasks.find(t => t.title === suggestion)) {
                            setMockTasks(prev => [...prev, { 
                              id: Date.now(), 
                              title: suggestion, 
                              status: 'todo',
                              assignee: 'Unassigned'
                            }]);
                          }
                        }}
                        color="primary"
                        variant="outlined"
                        clickable
                        size="small"
                      />
                    ))}
                  </Stack>
                  
                  {mockTasks.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>Generated Tasks:</Typography>
                      {mockTasks.map(task => (
                        <Chip key={task.id} label={task.title} sx={{ mr: 1, mb: 1 }} />
                      ))}
                    </Box>
                  )}
                </Stack>
              </CardContent>
            </Card>
            
            <Button 
              variant="contained" 
              disabled={mockTasks.length === 0}
              onClick={() => advance(3)}
              startIcon={<CheckIcon />}
            >
              Tasks Generated - Next Step
            </Button>
          </Box>
        );
        
      case 2:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AssignmentIcon color="primary" /> Step 3: Edit Task Details
            </Typography>
            <Typography variant="body2" paragraph>
              Practice editing task assignees, dates, and status. Try modifying a task below.
            </Typography>
            
            <Card variant="outlined" sx={{ mb: 3, bgcolor: alpha('#F59E0B', 0.02) }}>
              <CardContent>
                {mockTasks.length > 0 ? (
                  <Stack spacing={2}>
                    <Typography variant="subtitle2">Sample Task to Edit:</Typography>
                    {mockTasks.slice(0,1).map(task => (
                      <Box key={task.id} sx={{ border: 1, borderColor: 'divider', borderRadius: 1, p: 2 }}>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <Typography sx={{ fontWeight: 500, flexGrow: 1 }}>{task.title}</Typography>
                          <TextField
                            select
                            label="Assignee"
                            value={task.assignee}
                            onChange={(e) => {
                              setMockTasks(prev => prev.map(t => 
                                t.id === task.id ? { ...t, assignee: e.target.value } : t
                              ));
                            }}
                            size="small"
                            SelectProps={{ native: true }}
                            sx={{ minWidth: 120 }}
                          >
                            <option value="Unassigned">Unassigned</option>
                            <option value="John Doe">John Doe</option>
                            <option value="Sarah Chen">Sarah Chen</option>
                          </TextField>
                          <TextField
                            select
                            label="Status" 
                            value={task.status}
                            onChange={(e) => {
                              setMockTasks(prev => prev.map(t =>
                                t.id === task.id ? { ...t, status: e.target.value } : t
                              ));
                            }}
                            size="small"
                            SelectProps={{ native: true }}
                            sx={{ minWidth: 120 }}
                          >
                            <option value="todo">To Do</option>
                            <option value="inprogress">In Progress</option>
                            <option value="review">Review</option>
                            <option value="done">Done</option>
                          </TextField>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                ) : (
                  <Alert severity="info">Complete Step 2 first to have tasks to edit.</Alert>
                )}
              </CardContent>
            </Card>
            
            <Button 
              variant="contained" 
              disabled={mockTasks.length === 0 || mockTasks[0]?.assignee === 'Unassigned'}
              onClick={() => advance(4)}
              startIcon={<CheckIcon />}
            >
              Task Edited - Next Step
            </Button>
          </Box>
        );
        
      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ChatIcon color="primary" /> Step 4: Chat Assistant Interaction
            </Typography>
            <Typography variant="body2" paragraph>
              Practice querying the AI assistant and executing commands. Try both actions below.
            </Typography>
            
            <Card variant="outlined" sx={{ mb: 3, bgcolor: alpha('#8B5CF6', 0.02) }}>
              <CardContent>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Query Assistant:</Typography>
                    <Stack direction="row" spacing={1}>
                      <TextField
                        placeholder="Ask about project status, team progress, etc."
                        value={chatQuery}
                        onChange={(e) => setChatQuery(e.target.value)}
                        size="small"
                        fullWidth
                      />
                      <Button 
                        variant="outlined"
                        onClick={() => {
                          if (chatQuery) {
                            setChatResponse(`Based on your query "${chatQuery}", I can see that your project "${mockProject.name || 'Sample Project'}" has ${mockTasks.length} tasks with ${mockTasks.filter(t => t.status === 'done').length} completed.`);
                          }
                        }}
                        disabled={!chatQuery}
                      >
                        Ask
                      </Button>
                    </Stack>
                    {chatResponse && (
                      <Alert severity="info" sx={{ mt: 2 }}>{chatResponse}</Alert>
                    )}
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Execute Command:</Typography>
                    <Stack direction="row" spacing={1}>
                      <Button 
                        variant="outlined"
                        onClick={() => {
                          setShowDialog(true);
                          setDialogType('command');
                        }}
                      >
                        "Create summary report"
                      </Button>
                      <Button 
                        variant="outlined" 
                        onClick={() => {
                          setMockTasks(prev => prev.map(t => ({ ...t, status: 'inprogress' })));
                          setShowDialog(true);
                          setDialogType('bulk');
                        }}
                      >
                        "Move all tasks to In Progress"
                      </Button>
                    </Stack>
                  </Box>
                </Stack>
              </CardContent>
            </Card>
            
            <Button 
              variant="contained"
              disabled={!chatResponse}
              onClick={() => advance(5)}
              startIcon={<CheckIcon />}
            >
              Assistant Used - Next Step
            </Button>
          </Box>
        );
        
      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GroupIcon color="primary" /> Step 5: Manage Project Members
            </Typography>
            <Typography variant="body2" paragraph>
              Practice adding and removing team members from your project.
            </Typography>
            
            <Card variant="outlined" sx={{ mb: 3, bgcolor: alpha('#EF4444', 0.02) }}>
              <CardContent>
                <Stack spacing={2}>
                  <Typography variant="subtitle2">Current Team Members:</Typography>
                  <List dense>
                    {mockMembers.map((member, idx) => (
                      <ListItem key={idx} sx={{ pl: 0 }}>
                        <ListItemText primary={member} />
                        <IconButton
                          size="small"
                          onClick={() => setMockMembers(prev => prev.filter((_, i) => i !== idx))}
                          color="error"
                        >
                          ✕
                        </IconButton>
                      </ListItem>
                    ))}
                  </List>
                  
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      const newMember = `Team Member ${mockMembers.length + 1}`;
                      setMockMembers(prev => [...prev, newMember]);
                    }}
                  >
                    Add Member
                  </Button>
                </Stack>
              </CardContent>
            </Card>
            
            <Button 
              variant="contained"
              disabled={mockMembers.length === 2} // Must have added/removed someone
              onClick={() => complete()}
              startIcon={<CheckIcon />}
            >
              Members Managed - Complete Certification
            </Button>
          </Box>
        );
        
      case 5:
        return (
          <Box textAlign="center">
            <TrophyIcon sx={{ fontSize: 80, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" fontWeight="bold" gutterBottom color="primary">
              Congratulations! 🎉
            </Typography>
            <Typography variant="h6" gutterBottom>
              TaskPilot Product Certification
            </Typography>
            <Typography variant="body1" paragraph>
              You have successfully completed all certification requirements and demonstrated 
              proficiency with TaskPilot's core features.
            </Typography>
            
            {attempt?.serial && (
              <Card sx={{ maxWidth: 400, mx: 'auto', mb: 3, bgcolor: alpha('#10B981', 0.05) }}>
                <CardContent>
                  <Typography variant="h6" gutterBottom>Certificate Details</Typography>
                  <Typography variant="body2" color="text.secondary">Serial Number</Typography>
                  <Typography variant="h6" fontWeight="bold" color="primary">{attempt.serial}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Issued: {new Date().toLocaleDateString()}
                  </Typography>
                </CardContent>
              </Card>
            )}
            
            <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
              <Button
                variant="contained"
                startIcon={<LinkedInIcon />}
                href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent('https://taskpilot.us/certification')}&title=${encodeURIComponent('I just earned my TaskPilot Product Certification!')}&summary=${encodeURIComponent('Certified in project management, task automation, and team collaboration using TaskPilot.')}`}
                target="_blank"
                sx={{ bgcolor: '#0077B5', '&:hover': { bgcolor: '#006699' } }}
              >
                Share on LinkedIn
              </Button>
              <Button
                variant="outlined"
                onClick={() => window.open(route('certification.certificate'), '_blank')}
              >
                View Certificate
              </Button>
              <Button
                variant="outlined"
                onClick={() => router.visit(route('dashboard'))}
              >
                Return to Dashboard
              </Button>
            </Stack>
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

      {/* Mock Dialogs */}
      <Dialog open={showDialog} onClose={() => setShowDialog(false)}>
        <DialogTitle>
          {dialogType === 'command' ? 'Command Executed' : 'Bulk Action Complete'}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {dialogType === 'command' 
              ? 'Summary report has been generated and saved to your dashboard.'
              : 'All tasks have been moved to "In Progress" status successfully.'
            }
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDialog(false)}>OK</Button>
        </DialogActions>
      </Dialog>
    </AuthenticatedLayout>
  );
}
