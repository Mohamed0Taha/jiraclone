import React, { useState } from 'react';
import { Box, Typography, Stack, Button, Paper, TextField, MenuItem, Select, FormControl, InputLabel, Chip, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import MicroAppWrapper from '../components/MicroAppWrapper';
import InputModal from '../components/InputModal';

export default function CRMBoard({ projectId, viewName }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <MicroAppWrapper 
      projectId={projectId}
      viewName={viewName}
      appKey="CRMBoard"
      defaultValue={{ stages: ['Lead', 'Qualified', 'Proposal', 'Won'], items: [] }}
      title="CRM Board"
      enableSharing={true}
      defaultShared={true}
    >
      {({ state, setState }) => {
        const { stages = [], items = [] } = state || {};

        const addCard = () => setModalOpen(true);

        const handleAddDeal = (values) => {
          if (!values.title) return;
          const next = { id: Date.now(), title: values.title, value: Number(values.value)||0, stage: stages[0] };
          setState({ stages, items: [...items, next] });
          setModalOpen(false);
        };

        const updateItem = (id, patch) => setState({ stages, items: items.map(it => it.id === id ? { ...it, ...patch } : it) });
        
        const removeItem = (id) => setState({ stages, items: items.filter(it => it.id !== id) });

        return (
          <Box sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>CRM Board</Typography>
              <Button variant="contained" onClick={addCard} sx={{ borderRadius: 2 }}>Add Deal</Button>
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
                    <Chip size="small" label={`${items.filter(i => i.stage === stage).length}`} sx={{ borderRadius: 1.5 }} />
                  </Stack>
                  <Stack spacing={1}>
                    {items.filter(i => i.stage === stage).map((it) => (
                      <Paper
                        key={it.id}
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
                          value={it.title}
                          onChange={(e) => updateItem(it.id, { title: e.target.value })}
                          sx={{ mb: 1 }}
                        />
                        <TextField
                          fullWidth
                          size="small"
                          label="Value"
                          type="number"
                          value={it.value}
                          onChange={(e) => updateItem(it.id, { value: Number(e.target.value)||0 })}
                          sx={{ mb: 1 }}
                        />
                        <Stack direction="row" spacing={1} alignItems="center">
                          <FormControl fullWidth size="small">
                            <InputLabel>Stage</InputLabel>
                            <Select label="Stage" value={it.stage} onChange={(e) => updateItem(it.id, { stage: e.target.value })}>
                              {stages.map((s) => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
                            </Select>
                          </FormControl>
                          <IconButton 
                            size="small" 
                            onClick={() => removeItem(it.id)}
                            sx={{ 
                              color: 'error.main',
                              '&:hover': { backgroundColor: 'error.light', color: 'error.contrastText' }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Paper>
                    ))}
                    {items.filter(i => i.stage === stage).length === 0 && (
                      <Typography variant="caption" color="text.secondary" sx={{ px: 0.5 }}>No items</Typography>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
            
            <InputModal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Add Deal"
              fields={[
                { name: 'title', label: 'Deal Title', required: true },
                { name: 'value', label: 'Value (USD)', type: 'number', defaultValue: '1000' }
              ]}
              onSubmit={handleAddDeal}
            />
          </Box>
        );
      }}
    </MicroAppWrapper>
  );
}
