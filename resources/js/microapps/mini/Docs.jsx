import React, { useState, useEffect } from 'react';
import { Box, Typography, Stack, Button, Paper, TextField, IconButton, List, ListItemButton, ListItemText, Divider } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import MicroAppWrapper from '../components/MicroAppWrapper';

export default function Docs({ projectId, viewName }) {
  return (
    <MicroAppWrapper
      projectId={projectId}
      viewName={viewName}
      appKey="Docs"
      defaultValue={{ docs: [{ id: 1, title: 'Untitled', body: '' }], selected: 1 }}
      title="Docs"
      enableSharing={true}
      defaultShared={true}
    >
      {({ state, setState }) => {
        const { docs = [], selected = 1 } = state || {};
        const current = docs.find(d => d.id === selected) || docs[0];
        const [title, setTitle] = useState(current?.title || '');
        const [body, setBody] = useState(current?.body || '');

        useEffect(() => {
          setTitle(current?.title || '');
          setBody(current?.body || '');
        }, [selected, current?.title, current?.body]);

        const addDoc = () => {
          const id = Date.now();
          const doc = { id, title: 'Untitled', body: '' };
          setState({ docs: [...docs, doc], selected: id });
        };

        const removeDoc = (id) => {
          const next = docs.filter(d => d.id !== id);
          const nextSelected = next.length ? next[0].id : null;
          setState({ docs: next, selected: nextSelected });
        };

        const save = () => {
          setState({
            docs: docs.map(d => d.id === (current?.id) ? { ...d, title, body } : d),
            selected: current?.id,
          }, { force: true, immediate: true });
        };

        return (
          <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
            <Paper 
              variant="outlined" 
              sx={{ 
                width: 260, 
                flex: '0 0 260px', 
                p: 1,
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                background: (theme) => theme.palette.mode === 'dark'
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))'
                  : 'linear-gradient(180deg, #ffffff, #fbfbfd)',
                boxShadow: (theme) => theme.palette.mode === 'dark' ? 0 : 1,
              }}
            >
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1, px: 1 }}>
                <Typography variant="subtitle2" fontWeight={700}>Documents</Typography>
                <Button size="small" onClick={addDoc} sx={{ borderRadius: 2 }}>New</Button>
              </Stack>
              <Divider/>
              <List dense>
                {docs.map((d) => (
                  <ListItemButton key={d.id} selected={d.id === selected} onClick={() => setState({ ...state, selected: d.id })}>
                    <ListItemText primaryTypographyProps={{ noWrap: true }} primary={d.title} />
                    <IconButton edge="end" size="small" onClick={(e) => { e.stopPropagation(); removeDoc(d.id); }}><DeleteIcon fontSize="small"/></IconButton>
                  </ListItemButton>
                ))}
              </List>
            </Paper>
            <Paper 
              variant="outlined" 
              sx={{ 
                flex: 1, 
                p: 2,
                borderRadius: 2.5,
                border: '1px solid',
                borderColor: 'divider',
                background: (theme) => theme.palette.mode === 'dark'
                  ? 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))'
                  : 'linear-gradient(180deg, #ffffff, #fbfbfd)',
                boxShadow: (theme) => theme.palette.mode === 'dark' ? 0 : 1,
              }}
            >
              {current ? (
                <>
                  <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                    <TextField label="Title" size="small" value={title} onChange={(e) => setTitle(e.target.value)} sx={{ flex: 1 }}/>
                    <Button variant="contained" onClick={save} sx={{ borderRadius: 2 }}>Save</Button>
                  </Stack>
                  <TextField
                    multiline
                    minRows={14}
                    fullWidth
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Start typing..."
                  />
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">No document selected.</Typography>
              )}
            </Paper>
          </Box>
        );
      }}
    </MicroAppWrapper>
  );
}
