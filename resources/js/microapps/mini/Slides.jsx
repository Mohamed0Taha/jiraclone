import React, { useState, useEffect } from 'react';
import { Box, Typography, Stack, Button, Paper, TextField, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import useLocalViewData from '../useLocalViewData';

export default function Slides({ projectId, viewName }) {
  const [state, setState] = useLocalViewData({ projectId, viewName, appKey: 'Slides', defaultValue: { slides: [{ id: 1, title: 'Slide 1', content: 'Welcome!' }], current: 0 } });
  const { slides = [], current = 0 } = state || {};
  const [draftTitle, setDraftTitle] = useState(slides[current]?.title || '');
  const [draftContent, setDraftContent] = useState(slides[current]?.content || '');

  useEffect(() => {
    setDraftTitle(slides[current]?.title || '');
    setDraftContent(slides[current]?.content || '');
  }, [current, slides]);

  const addSlide = () => {
    const id = Date.now();
    const slide = { id, title: `Slide ${slides.length + 1}`, content: '' };
    setState({ slides: [...slides, slide], current: slides.length });
  };

  const save = () => {
    const updated = slides.map((s, idx) => idx === current ? { ...s, title: draftTitle, content: draftContent } : s);
    setState({ slides: updated, current });
  };

  const delSlide = (idx) => {
    const nextSlides = slides.filter((_, i) => i !== idx);
    const nextIndex = Math.max(0, Math.min(idx, nextSlides.length - 1));
    setState({ slides: nextSlides, current: nextIndex });
  };

  const goto = (idx) => setState({ ...state, current: Math.max(0, Math.min(idx, slides.length - 1)) });

  const slide = slides[current];

  return (
    <Box sx={{ p: 2, display: 'flex', gap: 2 }}>
      <Paper variant="outlined" sx={{ width: 240, p: 1.25 }}>
        <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" fontWeight={700}>Slides</Typography>
          <Button size="small" onClick={addSlide}>Add</Button>
        </Stack>
        <Stack spacing={1}>
          {slides.map((s, idx) => (
            <Box key={s.id} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Button variant={idx === current ? 'contained' : 'outlined'} size="small" fullWidth onClick={() => goto(idx)}>{s.title}</Button>
              <IconButton size="small" onClick={() => delSlide(idx)}><DeleteIcon fontSize="small"/></IconButton>
            </Box>
          ))}
        </Stack>
      </Paper>
      <Paper variant="outlined" sx={{ flex: 1, p: 2, minHeight: 360 }}>
        {slide ? (
          <>
            <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
              <TextField label="Title" size="small" value={draftTitle} onChange={(e) => setDraftTitle(e.target.value)} sx={{ flex: 1 }}/>
              <Button variant="contained" onClick={save}>Save</Button>
            </Stack>
            <TextField multiline minRows={12} fullWidth placeholder="Slide content..." value={draftContent} onChange={(e) => setDraftContent(e.target.value)} />
          </>
        ) : (
          <Typography variant="body2" color="text.secondary">No slide selected.</Typography>
        )}
      </Paper>
    </Box>
  );
}
