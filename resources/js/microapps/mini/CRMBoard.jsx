import React, { useState } from 'react';
import { Box, Typography, Stack, Button, Paper, TextField, MenuItem, Select, FormControl, InputLabel } from '@mui/material';
import useLocalViewData from '../useLocalViewData';
import InputModal from '../components/InputModal';

export default function CRMBoard({ projectId, viewName }) {
  const [state, setState] = useLocalViewData({ projectId, viewName, appKey: 'CRMBoard', defaultValue: { stages: ['Lead', 'Qualified', 'Proposal', 'Won'], items: [] } });
  const { stages = [], items = [] } = state || {};
  const [modalOpen, setModalOpen] = useState(false);

  const addCard = () => {
    setModalOpen(true);
  };
  
  const handleAddDeal = (values) => {
    if (!values.title) return;
    const next = { id: Date.now(), title: values.title, value: Number(values.value)||0, stage: stages[0] };
    setState({ stages, items: [...items, next] });
  };

  const updateItem = (id, patch) => setState({ stages, items: items.map(it => it.id === id ? { ...it, ...patch } : it) });

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h6" fontWeight={600}>CRM Board</Typography>
        <Button variant="contained" onClick={addCard}>Add Deal</Button>
      </Stack>
      <Stack direction="row" spacing={2} alignItems="stretch" sx={{ overflowX: 'auto' }}>
        {stages.map((stage) => (
          <Paper key={stage} variant="outlined" sx={{ p: 1.5, minWidth: 260 }}>
            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 700 }}>{stage}</Typography>
            <Stack spacing={1}>
              {items.filter(i => i.stage === stage).map((it) => (
                <Paper key={it.id} variant="outlined" sx={{ p: 1.25 }}>
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
                  <FormControl fullWidth size="small">
                    <InputLabel>Stage</InputLabel>
                    <Select label="Stage" value={it.stage} onChange={(e) => updateItem(it.id, { stage: e.target.value })}>
                      {stages.map((s) => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
                    </Select>
                  </FormControl>
                </Paper>
              ))}
              {items.filter(i => i.stage === stage).length === 0 && (
                <Typography variant="caption" color="text.secondary">No items</Typography>
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
          {
            name: 'title',
            label: 'Deal Title',
            required: true
          },
          {
            name: 'value',
            label: 'Value (USD)',
            type: 'number',
            defaultValue: '1000'
          }
        ]}
        onSubmit={handleAddDeal}
      />
    </Box>
  );
}
