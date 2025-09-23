import React, { useState } from 'react';
import { Box, Typography, Stack, Button, Paper, LinearProgress, IconButton, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import MicroAppWrapper from '../components/MicroAppWrapper';
import InputModal from '../components/InputModal';

export default function OKRTracker({ projectId, viewName }) {
  const [objectiveModalOpen, setObjectiveModalOpen] = useState(false);
  const [krModalOpen, setKrModalOpen] = useState(false);
  const [selectedObjId, setSelectedObjId] = useState(null);

  return (
    <MicroAppWrapper
      projectId={projectId}
      viewName={viewName}
      appKey="OKRTracker"
      defaultValue={{ objectives: [] }}
      title="OKR Tracker"
      enableSharing={true}
      defaultShared={true}
    >
      {({ state, setState }) => {
        const { objectives = [] } = state || {};

        const addObjective = () => setObjectiveModalOpen(true);

        const handleAddObjective = (values) => {
          if (!values.title) return;
          const obj = { id: Date.now(), title: values.title, krs: [] };
          setState({ objectives: [...objectives, obj] });
          setObjectiveModalOpen(false);
        };

        const addKR = (objId) => { setSelectedObjId(objId); setKrModalOpen(true); };

        const handleAddKR = (values) => {
          if (!values.title || !selectedObjId) return;
          const kr = { id: Date.now(), title: values.title, current: 0, target: Number(values.target) || 100 };
          setState({ objectives: objectives.map(o => o.id === selectedObjId ? { ...o, krs: [...o.krs, kr] } : o) });
          setSelectedObjId(null);
          setKrModalOpen(false);
        };

        const updateKR = (objId, krId, patch) => {
          setState({ objectives: objectives.map(o => o.id === objId ? { ...o, krs: o.krs.map(k => k.id === krId ? { ...k, ...patch } : k) } : o) });
        };

        const delObjective = (objId) => setState({ objectives: objectives.filter(o => o.id !== objId) });
        const delKR = (objId, krId) => setState({ objectives: objectives.map(o => o.id === objId ? { ...o, krs: o.krs.filter(k => k.id !== krId) } : o) });

        return (
          <Box sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>OKR Tracker</Typography>
              <Button variant="contained" onClick={addObjective} sx={{ borderRadius: 2 }}>Add Objective</Button>
            </Stack>
            <Stack spacing={2}>
              {objectives.length === 0 && (
                <Typography variant="body2" color="text.secondary">No objectives yet.</Typography>
              )}
              {objectives.map((o) => (
                <Paper 
                  key={o.id} 
                  variant="outlined" 
                  sx={{ 
                    p: 2,
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    background: (theme) => theme.palette.mode === 'dark'
                      ? 'linear-gradient(180deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))'
                      : 'linear-gradient(180deg, #ffffff, #fbfbfd)',
                    boxShadow: (theme) => theme.palette.mode === 'dark' ? 0 : 1,
                    transition: 'box-shadow .2s ease, transform .2s ease',
                    '&:hover': { boxShadow: 3, transform: 'translateY(-1px)' }
                  }}
                >
                  <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight={700}>{o.title}</Typography>
                    <Stack direction="row" spacing={1}>
                      <Button size="small" onClick={() => addKR(o.id)}>Add KR</Button>
                      <IconButton size="small" onClick={() => delObjective(o.id)}><DeleteIcon fontSize="small"/></IconButton>
                    </Stack>
                  </Stack>
                  <Stack spacing={1}>
                    {o.krs.length === 0 && <Typography variant="caption" color="text.secondary">No key results yet.</Typography>}
                    {o.krs.map((k) => (
                      <Paper 
                        key={k.id} 
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
                        <Typography variant="body2" sx={{ mb: .5 }}>{k.title}</Typography>
                        <Stack direction="row" spacing={1} alignItems="center">
                          <TextField size="small" type="number" label="Current" value={k.current} onChange={(e) => updateKR(o.id, k.id, { current: Number(e.target.value)||0 })} sx={{ width: 120 }}/>
                          <TextField size="small" type="number" label="Target" value={k.target} onChange={(e) => updateKR(o.id, k.id, { target: Number(e.target.value)||0 })} sx={{ width: 120 }}/>
                          <IconButton size="small" onClick={() => delKR(o.id, k.id)}><DeleteIcon fontSize="small"/></IconButton>
                        </Stack>
                        <LinearProgress variant="determinate" value={Math.max(0, Math.min(100, (k.current / (k.target || 1)) * 100))} sx={{ mt: 1 }}/>
                      </Paper>
                    ))}
                  </Stack>
                </Paper>
              ))}
            </Stack>

            <InputModal
              open={objectiveModalOpen}
              onClose={() => setObjectiveModalOpen(false)}
              title="Add Objective"
              fields={[{ name: 'title', label: 'Objective', required: true }]}
              onSubmit={handleAddObjective}
            />

            <InputModal
              open={krModalOpen}
              onClose={() => { setKrModalOpen(false); setSelectedObjId(null); }}
              title="Add Key Result"
              fields={[
                { name: 'title', label: 'Key Result', required: true },
                { name: 'target', label: 'Target (number)', type: 'number', defaultValue: '100', required: true }
              ]}
              onSubmit={handleAddKR}
            />
          </Box>
        );
      }}
    </MicroAppWrapper>
  );
}
