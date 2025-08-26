import React, { useState, useCallback, lazy, Suspense } from 'react';
import { Head, router, useForm } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { 
  Box, Stepper, Step, StepLabel, Button, Typography, Paper, Stack, Alert, 
  TextField, Card, CardContent, Chip, Dialog, DialogTitle, DialogContent, 
  DialogActions, List, ListItem, ListItemText, IconButton, alpha, CircularProgress
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

// Import real components from the main app
const CreateStepBasics = lazy(() => import('../Projects/CreateStepBasics'));
const TaskFormDialog = lazy(() => import('./components/TaskFormDialog')); 
const MembersManagerDialog = lazy(() => import('../Tasks/MembersManagerDialog'));
const AssistantChat = lazy(() => import('../Tasks/AssistantChat'));

const StepLoader = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
    <CircularProgress size={24} />
  </Box>
);

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
  
  // Mock data that mimics real app state but doesn't persist
  const [mockProject, setMockProject] = useState({ 
    name: 'E-commerce Platform Redesign', 
    description: 'Complete redesign of our online store with modern UX/UI',
    key: 'ECOM-001',
    start_date: '2025-09-01',
    end_date: '2025-12-31',
    meta: {
      project_type: 'Web Development',
      domain: 'E-commerce',
      team_size: 5,
      budget: '$50,000'
    }
  });
  
  const [mockTasks, setMockTasks] = useState([
    { id: 1, title: 'User Research & Analysis', status: 'todo', assignee_id: '2', priority: 'high' },
    { id: 2, title: 'UI/UX Design Mockups', status: 'inprogress', assignee_id: '1', priority: 'medium' },
    { id: 3, title: 'Frontend Development', status: 'todo', assignee_id: '', priority: 'medium' }
  ]);
  
  const [mockUsers] = useState([
    { id: '1', name: 'Sarah Chen' },
    { id: '2', name: 'John Doe' },
    { id: '3', name: 'Alex Johnson' }
  ]);
  
  const [mockMembers, setMockMembers] = useState([
    { id: '2', name: 'John Doe', email: 'john@example.com', role: 'member' },
    { id: '3', name: 'Alex Johnson', email: 'alex@example.com', role: 'member' }
  ]);
  
  const [chatQuery, setChatQuery] = useState('');
  const [chatResponse, setChatResponse] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [dialogType, setDialogType] = useState('');
  const [taskFormOpen, setTaskFormOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [membersDialogOpen, setMembersDialogOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);

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
              Experience our project creation workflow using real components from the main application.
            </Typography>
            
            <Suspense fallback={<StepLoader />}>
              <Card variant="outlined" sx={{ mb: 3, bgcolor: alpha('#4F46E5', 0.02) }}>
                <CardContent>
                  <CreateStepBasics
                    data={mockProject}
                    setData={(field, value) => setMockProject(prev => ({ ...prev, [field]: value }))}
                    setMeta={(field, value) => setMockProject(prev => ({ 
                      ...prev, 
                      meta: { ...prev.meta, [field]: value }
                    }))}
                    errors={{}}
                    localErrors={{}}
                    projectTypes={['Web Development', 'Mobile App', 'Data Analysis']}
                    domains={['E-commerce', 'Healthcare', 'Finance', 'Education']}
                  />
                </CardContent>
              </Card>
            </Suspense>
            
            <Button 
              variant="contained" 
              disabled={!mockProject.name}
              onClick={() => advance(2)}
              startIcon={<CheckIcon />}
            >
              Project Details Completed - Next Step
            </Button>
          </Box>
        );
        
      case 1:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AddIcon color="primary" /> Step 2: Generate and Manage Tasks
            </Typography>
            <Typography variant="body2" paragraph>
              Use our task creation system to add and organize project tasks.
            </Typography>
            
            <Card variant="outlined" sx={{ mb: 3, bgcolor: alpha('#10B981', 0.02) }}>
              <CardContent>
                <Stack spacing={2}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle2">Current Tasks:</Typography>
                    <Button 
                      variant="outlined" 
                      size="small"
                      startIcon={<AddIcon />}
                      onClick={() => {
                        setEditingTask(null);
                        setTaskFormOpen(true);
                      }}
                    >
                      Add Task
                    </Button>
                  </Stack>
                  
                  <Stack spacing={1}>
                    {mockTasks.map(task => {
                      const assignedUser = mockUsers.find(u => u.id === task.assignee_id);
                      return (
                        <Paper key={task.id} sx={{ p: 2, border: '1px solid', borderColor: 'divider' }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Box>
                              <Typography variant="subtitle2">{task.title}</Typography>
                              <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                                <Chip label={task.status} size="small" color="primary" />
                                <Chip label={task.priority} size="small" />
                                {assignedUser && (
                                  <Chip label={`Assigned: ${assignedUser.name}`} size="small" variant="outlined" />
                                )}
                              </Stack>
                            </Box>
                            <Button 
                              size="small" 
                              onClick={() => {
                                setEditingTask(task);
                                setTaskFormOpen(true);
                              }}
                            >
                              Edit
                            </Button>
                          </Stack>
                        </Paper>
                      );
                    })}
                  </Stack>
                </Stack>
              </CardContent>
            </Card>
            
            <Button 
              variant="contained" 
              disabled={mockTasks.length < 2}
              onClick={() => advance(3)}
              startIcon={<CheckIcon />}
            >
              Tasks Created - Next Step
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
              Practice editing task assignments, priorities, and status using our task management interface.
            </Typography>
            
            <Card variant="outlined" sx={{ mb: 3, bgcolor: alpha('#F59E0B', 0.02) }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>Try editing any task:</Typography>
                <Stack spacing={1}>
                  {mockTasks.map(task => {
                    const assignedUser = mockUsers.find(u => u.id === task.assignee_id);
                    const hasAssignee = !!assignedUser;
                    return (
                      <Paper 
                        key={task.id} 
                        sx={{ 
                          p: 2, 
                          border: '1px solid', 
                          borderColor: hasAssignee ? 'success.main' : 'divider',
                          bgcolor: hasAssignee ? alpha('#4CAF50', 0.05) : 'background.paper'
                        }}
                      >
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                          <Box>
                            <Typography variant="subtitle2">{task.title}</Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
                              <Chip label={task.status} size="small" color="primary" />
                              <Chip label={task.priority} size="small" />
                              <Chip 
                                label={hasAssignee ? `Assigned: ${assignedUser.name}` : 'Unassigned'} 
                                size="small" 
                                variant="outlined"
                                color={hasAssignee ? 'success' : 'default'}
                              />
                            </Stack>
                          </Box>
                          <Button 
                            size="small" 
                            variant="outlined"
                            onClick={() => {
                              setEditingTask(task);
                              setTaskFormOpen(true);
                            }}
                          >
                            Edit
                          </Button>
                        </Stack>
                      </Paper>
                    );
                  })}
                </Stack>
              </CardContent>
            </Card>
            
            <Button 
              variant="contained"
              disabled={mockTasks.some(t => !t.assignee_id)}
              onClick={() => advance(4)}
              startIcon={<CheckIcon />}
            >
              All Tasks Assigned - Next Step
            </Button>
          </Box>
        );
        
      case 3:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <ChatIcon color="primary" /> Step 4: AI Assistant Interaction
            </Typography>
            <Typography variant="body2" paragraph>
              Experience our AI assistant feature that helps with project insights and automation.
            </Typography>
            
            <Card variant="outlined" sx={{ mb: 3, bgcolor: alpha('#8B5CF6', 0.02) }}>
              <CardContent>
                <Stack spacing={3}>
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>Query Project Status:</Typography>
                    <Stack direction="row" spacing={1}>
                      <TextField
                        placeholder="Ask about project progress, team workload, etc."
                        value={chatQuery}
                        onChange={(e) => setChatQuery(e.target.value)}
                        size="small"
                        fullWidth
                      />
                      <Button 
                        variant="outlined"
                        onClick={() => {
                          if (chatQuery) {
                            const completedTasks = mockTasks.filter(t => t.status === 'done').length;
                            const totalTasks = mockTasks.length;
                            const progress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
                            setChatResponse(`Project "${mockProject.name}" is ${progress}% complete. ${completedTasks}/${totalTasks} tasks finished. Team has ${mockMembers.length} active members.`);
                          }
                        }}
                        disabled={!chatQuery}
                      >
                        Ask AI
                      </Button>
                    </Stack>
                    {chatResponse && (
                      <Alert severity="info" sx={{ mt: 2 }}>{chatResponse}</Alert>
                    )}
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" gutterBottom>AI Assistant Actions:</Typography>
                    <Button 
                      variant="outlined"
                      startIcon={<ChatIcon />}
                      onClick={() => setAssistantOpen(true)}
                    >
                      Open Assistant Chat
                    </Button>
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
              Assistant Queried - Next Step
            </Button>
          </Box>
        );
        
      case 4:
        return (
          <Box>
            <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <GroupIcon color="primary" /> Step 5: Team Member Management
            </Typography>
            <Typography variant="body2" paragraph>
              Learn to manage project team members using our member management interface.
            </Typography>
            
            <Card variant="outlined" sx={{ mb: 3, bgcolor: alpha('#EF4444', 0.02) }}>
              <CardContent>
                <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                  <Typography variant="subtitle2">Project Team:</Typography>
                  <Button
                    variant="outlined"
                    startIcon={<GroupIcon />}
                    onClick={() => setMembersDialogOpen(true)}
                  >
                    Manage Members
                  </Button>
                </Stack>
                
                <Stack spacing={1}>
                  <Paper sx={{ p: 2, bgcolor: alpha('#4CAF50', 0.1) }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                      <Box>
                        <Typography variant="subtitle2">{auth?.user?.name} (You)</Typography>
                        <Typography variant="caption" color="text.secondary">Project Owner</Typography>
                      </Box>
                      <Chip label="Owner" size="small" color="primary" />
                    </Stack>
                  </Paper>
                  
                  {mockMembers.map(member => (
                    <Paper key={member.id} sx={{ p: 2 }}>
                      <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Box>
                          <Typography variant="subtitle2">{member.name}</Typography>
                          <Typography variant="caption" color="text.secondary">{member.email}</Typography>
                        </Box>
                        <Chip label={member.role} size="small" variant="outlined" />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              </CardContent>
            </Card>
            
            <Button 
              variant="contained"
              onClick={() => complete()}
              startIcon={<CheckIcon />}
            >
              Team Management Complete
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
              You have successfully completed all certification requirements and gained hands-on 
              experience with TaskPilot's core features using our real application components.
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

      {/* Real Task Creation Dialog */}
      <Suspense fallback={null}>
        <TaskFormDialog
          open={taskFormOpen}
          onClose={() => setTaskFormOpen(false)}
          task={editingTask}
          users={mockUsers}
          onSubmit={(taskData) => {
            if (editingTask) {
              // Edit existing task
              setMockTasks(prev => prev.map(t => 
                t.id === editingTask.id 
                  ? { ...t, ...taskData }
                  : t
              ));
            } else {
              // Create new task
              const newTask = {
                id: Date.now(),
                ...taskData
              };
              setMockTasks(prev => [...prev, newTask]);
            }
          }}
        />
      </Suspense>

      {/* Real Members Management Dialog */}
      <Suspense fallback={null}>
        <MembersManagerDialog
          open={membersDialogOpen}
          onClose={() => setMembersDialogOpen(false)}
          project={{
            ...mockProject,
            id: 'cert-demo',
            user_id: auth?.user?.id,
            members: mockMembers
          }}
        />
      </Suspense>

      {/* Real Assistant Chat */}
      <Suspense fallback={null}>
        <AssistantChat
          open={assistantOpen}
          onClose={() => setAssistantOpen(false)}
          projectId="cert-demo"
          project={mockProject}
          onAddTask={() => setTaskFormOpen(true)}
        />
      </Suspense>

      {/* Mock Action Confirmation Dialogs */}
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
