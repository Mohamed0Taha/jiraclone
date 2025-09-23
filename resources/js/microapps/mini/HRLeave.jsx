import React, { useState } from 'react';
import { Box, Typography, Stack, Button, Paper, TextField, MenuItem, Select, FormControl, InputLabel, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import MicroAppWrapper from '../components/MicroAppWrapper';
import InputModal from '../components/InputModal';

export default function HRLeave({ projectId, viewName }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <MicroAppWrapper
      projectId={projectId}
      viewName={viewName}
      appKey="HRLeave"
      defaultValue={{ requests: [] }}
      title="HR Leave"
      enableSharing={true}
      defaultShared={true}
    >
      {({ state, setState }) => {
        const { requests = [] } = state || {};

        const addRequest = () => setModalOpen(true);

        const handleAddRequest = (values) => {
          if (!values.employee || !values.start || !values.end) return;
          const req = {
            id: Date.now(),
            employee: values.employee,
            type: values.type,
            start: values.start,
            end: values.end,
            status: 'Pending'
          };
          setState({ requests: [...requests, req] });
          setModalOpen(false);
        };

        const updateReq = (id, patch) => setState({ requests: requests.map(r => r.id === id ? { ...r, ...patch } : r) });
        
        const removeReq = (id) => setState({ requests: requests.filter(r => r.id !== id) });

        return (
          <Box sx={{ p: 2 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="h6" fontWeight={700}>HR Leave</Typography>
              <Button variant="contained" onClick={addRequest} sx={{ borderRadius: 2 }}>Add Request</Button>
            </Stack>
            <Stack spacing={1}>
              {requests.length === 0 && (
                <Typography variant="body2" color="text.secondary">No leave requests yet.</Typography>
              )}
              {requests.map((r) => (
                <Paper
                  key={r.id}
                  variant="outlined"
                  sx={{
                    p: 1.5,
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
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems="center">
                    <TextField label="Employee" size="small" value={r.employee} onChange={(e) => updateReq(r.id, { employee: e.target.value })} sx={{ minWidth: 180 }}/>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                      <InputLabel>Type</InputLabel>
                      <Select label="Type" value={r.type} onChange={(e) => updateReq(r.id, { type: e.target.value })}>
                        {['Annual','Sick','Unpaid'].map((t) => (<MenuItem key={t} value={t}>{t}</MenuItem>))}
                      </Select>
                    </FormControl>
                    <TextField label="Start" size="small" type="date" value={r.start} onChange={(e) => updateReq(r.id, { start: e.target.value })} InputLabelProps={{ shrink: true }}/>
                    <TextField label="End" size="small" type="date" value={r.end} onChange={(e) => updateReq(r.id, { end: e.target.value })} InputLabelProps={{ shrink: true }}/>
                    <FormControl size="small" sx={{ minWidth: 140 }}>
                      <InputLabel>Status</InputLabel>
                      <Select label="Status" value={r.status} onChange={(e) => updateReq(r.id, { status: e.target.value })}>
                        {['Pending','Approved','Rejected'].map((s) => (<MenuItem key={s} value={s}>{s}</MenuItem>))}
                      </Select>
                    </FormControl>
                    <IconButton 
                      size="small" 
                      onClick={() => removeReq(r.id)}
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
            </Stack>

            <InputModal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Add Leave Request"
              fields={[
                { name: 'employee', label: 'Employee Name', defaultValue: 'John Doe', required: true },
                { name: 'type', label: 'Leave Type', defaultValue: 'Annual', required: true, placeholder: 'Annual/Sick/Unpaid' },
                { name: 'start', label: 'Start Date', type: 'date', defaultValue: new Date().toISOString().slice(0,10), required: true },
                { name: 'end', label: 'End Date', type: 'date', defaultValue: new Date().toISOString().slice(0,10), required: true }
              ]}
              onSubmit={handleAddRequest}
            />
          </Box>
        );
      }}
    </MicroAppWrapper>
  );
}
