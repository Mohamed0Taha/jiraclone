import React from 'react';
import { 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, 
  Stack, MenuItem, alpha, IconButton 
} from '@mui/material';
import { Close as CloseIcon } from '@mui/icons-material';

export default function TaskFormDialog({ 
  open, 
  onClose, 
  task = null, 
  onSubmit, 
  users = [] 
}) {
  const [formData, setFormData] = React.useState({
    title: task?.title || '',
    description: task?.description || '',
    assignee_id: task?.assignee_id || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    start_date: task?.start_date || '',
    end_date: task?.end_date || '',
  });

  React.useEffect(() => {
    if (task) {
      setFormData({
        title: task.title || '',
        description: task.description || '',
        assignee_id: task.assignee_id || '',
        status: task.status || 'todo',
        priority: task.priority || 'medium',
        start_date: task.start_date || '',
        end_date: task.end_date || '',
      });
    }
  }, [task]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    onClose();
  };

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog 
      open={open} 
      onClose={onClose} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          background: 'linear-gradient(140deg,rgba(255,255,255,0.95),rgba(255,255,255,0.8))',
        }
      }}
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle sx={{ fontWeight: 700, pr: 6 }}>
          {task ? 'Edit Task' : 'Create Task'}
          <IconButton
            size="small"
            onClick={onClose}
            sx={{ position: 'absolute', right: 8, top: 8 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>
        
        <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Title"
            required
            fullWidth
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            placeholder="Task title"
            size="small"
          />
          
          <TextField
            label="Description"
            multiline
            rows={3}
            fullWidth
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="Task description"
            size="small"
          />
          
          <Stack direction="row" spacing={2}>
            <TextField
              label="Start Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={formData.start_date}
              onChange={(e) => handleChange('start_date', e.target.value)}
              size="small"
            />
            <TextField
              label="End Date"
              type="date"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={formData.end_date}
              onChange={(e) => handleChange('end_date', e.target.value)}
              size="small"
            />
          </Stack>
          
          <Stack direction="row" spacing={2}>
            <TextField
              select
              label="Assign To"
              fullWidth
              value={formData.assignee_id}
              onChange={(e) => handleChange('assignee_id', e.target.value)}
              size="small"
            >
              <MenuItem value="">— Unassigned —</MenuItem>
              {users.map((u) => (
                <MenuItem key={u.id} value={u.id}>
                  {u.name}
                </MenuItem>
              ))}
            </TextField>
            
            <TextField
              select
              label="Status"
              fullWidth
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              size="small"
            >
              <MenuItem value="todo">To Do</MenuItem>
              <MenuItem value="inprogress">In Progress</MenuItem>
              <MenuItem value="review">Review</MenuItem>
              <MenuItem value="done">Done</MenuItem>
            </TextField>
            
            <TextField
              select
              label="Priority"
              fullWidth
              value={formData.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
              size="small"
            >
              <MenuItem value="low">Low</MenuItem>
              <MenuItem value="medium">Medium</MenuItem>
              <MenuItem value="high">High</MenuItem>
              <MenuItem value="urgent">Urgent</MenuItem>
            </TextField>
          </Stack>
        </DialogContent>
        
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={onClose} variant="outlined">
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={!formData.title}>
            {task ? 'Update' : 'Create'} Task
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
