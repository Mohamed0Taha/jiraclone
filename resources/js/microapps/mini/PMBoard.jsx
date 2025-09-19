import React, { useState } from 'react';
import { Box, Typography, Stack, Button, Paper, Chip, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import useLocalViewData from '../useLocalViewData';
import InputModal from '../components/InputModal';

export default function PMBoard({ projectId, viewName }) {
  const [state, setState] = useLocalViewData({ projectId, viewName, appKey: 'PMBoard', defaultValue: { stages: ['Backlog', 'In Progress', 'Review', 'Done'], tasks: [] } });
  const { stages = [], tasks = [] } = state || {};
  const [modalOpen, setModalOpen] = useState(false);

  const addTask = () => {
    setModalOpen(true);
  };
  
  const handleAddTask = (values) => {
    if (!values.title) return;
    const task = { id: Date.now(), title: values.title, stage: stages[0] };
    setState({ stages, tasks: [...tasks, task] });
  };

  const updateTask = (id, patch) => setState({ stages, tasks: tasks.map(t => t.id === id ? { ...t, ...patch } : t) });

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>PM Board</Typography>
        <Button variant="contained" onClick={addTask}>Add Task</Button>
      </Stack>
      <Stack direction="row" spacing={2} alignItems="stretch" sx={{ overflowX: 'auto' }}>
        {stages.map((stage) => (
          <Paper key={stage} variant="outlined" sx={{ p: 1.5, minWidth: 260 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>{stage}</Typography>
            <Stack spacing={1}>
              {tasks.filter(t => t.stage === stage).map((t) => (
                <Paper key={t.id} variant="outlined" sx={{ p: 1.25 }}>
                  <TextField
                    fullWidth
                    size="small"
                    label="Title"
                    value={t.title}
                    onChange={(e) => updateTask(t.id, { title: e.target.value })}
                    sx={{ mb: 1 }}
                  />
                  <FormControl fullWidth size="small">
                    <InputLabel>Stage</InputLabel>
                    <Select label="Stage" value={t.stage} onChange={(e) => updateTask(t.id, { stage: e.target.value })}>
                      {stages.map((s) => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
                    </Select>
                  </FormControl>
                </Paper>
              ))}
              {tasks.filter(t => t.stage === stage).length === 0 && (
                <Typography variant="caption" color="text.secondary">No tasks</Typography>
              )}
            </Stack>
          </Paper>
        ))}
      </Stack>
      
      <InputModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Task"
        fields={[
          {
            name: 'title',
            label: 'Task Title',
            required: true
          }
        ]}
        onSubmit={handleAddTask}
      />
    </Box>
  );
}
