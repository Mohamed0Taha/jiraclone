import React, { useState } from 'react';
import { Box, Typography, Stack, Button, Paper, TextField, MenuItem, Select, FormControl, InputLabel, Chip as MuiChip } from '@mui/material';
import MicroAppWrapper from '../components/MicroAppWrapper';
import InputModal from '../components/InputModal';

export default function PMBoard({ projectId, viewName }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <MicroAppWrapper
      projectId={projectId}
      viewName={viewName}
      appKey="PMBoard"
      defaultValue={{ stages: ['Backlog', 'In Progress', 'Review', 'Done'], tasks: [] }}
      title="PM Board"
      enableSharing={true}
      defaultShared={true}
    >
      {({ state, setState }) => {
        const { stages = [], tasks = [] } = state || {};

        const addTask = () => setModalOpen(true);

        const handleAddTask = (values) => {
          if (!values.title) return;
          const task = { id: Date.now(), title: values.title, stage: stages[0] };
          setState({ stages, tasks: [...tasks, task] });
          setModalOpen(false);
        };

        const updateTask = (id, patch) => setState({ stages, tasks: tasks.map(t => t.id === id ? { ...t, ...patch } : t) });

        return (
          <Box sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>PM Board</Typography>
              <Button variant="contained" onClick={addTask} sx={{ borderRadius: 2 }}>Add Task</Button>
            </Stack>
            <Stack direction="row" spacing={2} alignItems="stretch" sx={{ overflowX: 'auto', pb: 1 }}>
              {stages.map((stage) => (
                <Paper
                  key={stage}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    minWidth: 280,
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    background: (theme) => theme.palette.mode === 'dark'
                      ? 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))'
                      : 'linear-gradient(180deg, #ffffff, #fbfbfd)',
                    boxShadow: (theme) => theme.palette.mode === 'dark' ? 0 : 1,
                    transition: 'box-shadow .2s ease, transform .2s ease',
                    '&:hover': { boxShadow: 3, transform: 'translateY(-1px)' }
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>{stage}</Typography>
                    <MuiChip size="small" label={`${tasks.filter(t => t.stage === stage).length}`} sx={{ borderRadius: 1.5 }} />
                  </Stack>
                  <Stack spacing={1}>
                    {tasks.filter(t => t.stage === stage).map((t) => (
                      <Paper
                        key={t.id}
                        variant="outlined"
                        sx={{
                          p: 1.25,
                          borderRadius: 2,
                          border: '1px solid',
                          borderColor: 'divider',
                          backgroundColor: 'background.paper',
                          transition: 'box-shadow .2s ease, transform .2s ease',
                          boxShadow: (theme) => theme.palette.mode === 'dark' ? 0 : 1,
                          '&:hover': { boxShadow: 3, transform: 'translateY(-2px)' }
                        }}
                      >
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
                      <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>No tasks</Typography>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>

            <InputModal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Add Task"
              fields={[{ name: 'title', label: 'Task Title', required: true }]}
              onSubmit={handleAddTask}
            />
          </Box>
        );
      }}
    </MicroAppWrapper>
  );
}
