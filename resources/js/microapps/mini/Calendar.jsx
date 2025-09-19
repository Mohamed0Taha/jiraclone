import React, { useState, useEffect } from 'react';
import { Box, Typography, Stack, Button, Chip, Paper, CircularProgress } from '@mui/material';
import MicroAppWrapper from '../components/MicroAppWrapper';
import InputModal from '../components/InputModal';

export default function Calendar({ projectId, viewName }) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const today = new Date();
    return `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}`;
  });
  const [modalOpen, setModalOpen] = useState(false);
  
  return (
    <MicroAppWrapper 
      projectId={projectId}
      viewName={viewName}
      appKey="Calendar"
      defaultValue={{ events: [] }}
      title="Calendar"
      enableSharing={true}
      defaultShared={true}
    >
      {({ state, setState, isShared, isLoaded }) => {
        const addQuick = () => {
          setModalOpen(true);
        };
        
        const handleAddEvent = (values) => {
          if (!values.title || !values.date) return;
          const next = { ...state, events: [...(state.events||[]), { id: Date.now(), title: values.title, date: values.date }] };
          setState(next);
        };

        return (
          <>
            <Stack direction="row" alignItems="center" justifyContent="flex-end" sx={{ mb: 2 }}>
              <Button variant="contained" onClick={addQuick}>Add Event</Button>
            </Stack>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>Upcoming</Typography>
              <Stack spacing={1}>
                {!isLoaded ? (
                  <Box display="flex" alignItems="center" gap={1}>
                    <CircularProgress size={16} />
                    <Typography variant="body2" color="text.secondary">Loading events...</Typography>
                  </Box>
                ) : (state.events || []).length === 0 ? (
                  <Typography variant="body2" color="text.secondary">No events yet.</Typography>
                ) : (
                  (state.events || []).map(ev => (
                    <Box key={ev.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: '1px solid', borderColor: 'divider', p: 1, borderRadius: 1 }}>
                      <Box>
                        <Typography variant="subtitle2">{ev.title}</Typography>
                        <Typography variant="caption" color="text.secondary">{ev.date}</Typography>
                      </Box>
                    </Box>
                  ))
                )}
              </Stack>
            </Paper>
            
            <InputModal
              open={modalOpen}
              onClose={() => setModalOpen(false)}
              title="Add Event"
              fields={[
                {
                  name: 'title',
                  label: 'Event Title',
                  required: true
                },
                {
                  name: 'date',
                  label: 'Date',
                  type: 'date',
                  defaultValue: new Date().toISOString().slice(0,10),
                  required: true
                }
              ]}
              onSubmit={handleAddEvent}
            />
          </>
        );
      }}
    </MicroAppWrapper>
  );
}
