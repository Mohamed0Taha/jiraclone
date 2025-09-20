import React, { useState } from 'react';
import { Box, Typography, Stack, Button, List, ListItemButton, ListItemText, Paper, TextField, IconButton, Divider, Divider as NewDivider } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import useLocalViewData from '../useLocalViewData';
import InputModal from '../components/InputModal';

export default function WikiPage({ projectId, viewName }) {
  const [state, setState] = useLocalViewData({ projectId, viewName, appKey: 'WikiPage', defaultValue: { pages: [], selected: null } });
  const { pages = [], selected } = state || {};
  const [modalOpen, setModalOpen] = useState(false);
  const current = pages.find(p => p.id === selected) || pages[0];
  const [draft, setDraft] = useState(current?.content || '');

  const selectPage = (id) => {
    const page = pages.find(p => p.id === id);
    setDraft(page?.content || '');
    setState({ ...state, selected: id });
  };

  const addPage = () => {
    setModalOpen(true);
  };
  
  const handleAddPage = (values) => {
    if (!values.title) return;
    const page = { id: Date.now(), title: values.title, content: '' };
    setState({ pages: [...pages, page], selected: page.id });
  };

  const save = () => {
    setState({ pages: pages.map(p => p.id === (current?.id) ? { ...p, content: draft } : p), selected: current?.id });
  };

  return (
    <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
      <Paper variant="outlined" sx={{ width: 240, flex: '0 0 240px', p: 1 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1, px: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>Pages</Typography>
          <Button size="small" onClick={addPage}>Add</Button>
        </Stack>
        <NewDivider/>
        <List dense>
          {pages.map((p) => (
            <ListItemButton key={p.id} selected={p.id === (current?.id)} onClick={() => selectPage(p.id)}>
              <ListItemText primaryTypographyProps={{ noWrap: true }} primary={p.title} />
            </ListItemButton>
          ))}
        </List>
      </Paper>
      <Paper variant="outlined" sx={{ flex: 1, p: 2 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="h6" fontWeight={600}>{current?.title || 'Untitled'}</Typography>
          <Button variant="contained" onClick={save}>Save</Button>
        </Stack>
        <TextField
          multiline
          minRows={12}
          fullWidth
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Write your content here..."
        />
      </Paper>
      <InputModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Add Page"
        fields={[
          {
            name: 'title',
            label: 'Page Title',
            required: true
          }
        ]}
        onSubmit={handleAddPage}
      />
    </Box>
  );
}
