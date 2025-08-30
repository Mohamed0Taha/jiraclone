import React, { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, Stack, Typography, Chip, LinearProgress, MenuItem, IconButton, Tooltip, Select, FormControl, InputLabel, Collapse, Box } from '@mui/material';
import DoneIcon from '@mui/icons-material/Done';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

const priorityColor = (p) => ({ High: 'error', Medium: 'warning', Low: 'success' }[p] || 'default');
const statusColor = (s) => ({ 'Completed': 'success', 'In Progress': 'warning', 'Pending': 'default', 'Cancelled': 'error' }[s] || 'default');

export default function Task({ task, team, onChange, defaultExpanded = false, highlighted = false, highlightColor, collapseVersion }) {
  const [local, setLocal] = useState(task);
  const [expanded, setExpanded] = useState(defaultExpanded);
  // If parent later forces expansion (e.g., walkthrough), respond once
  useEffect(() => {
    if (defaultExpanded) setExpanded(true);
  }, [defaultExpanded]);
  // Collapse when collapseVersion changes (week change) unless onboarding forcing expansion
  useEffect(() => {
    if (!defaultExpanded) setExpanded(false);
  }, [collapseVersion]);

  const handleField = (field, value) => {
    const updated = { ...local, [field]: value };
    setLocal(updated);
    onChange && onChange(updated);
  };

  const toggleStatus = () => {
    const order = ['Pending','In Progress','Completed','Cancelled'];
    const idx = order.indexOf(local.status);
    handleField('status', order[(idx + 1) % order.length]);
  };

  return (
  <Card 
      variant="outlined" 
      sx={{ 
        borderLeft: 4, 
  borderLeftColor: highlighted ? (highlightColor || 'info.main') : (priorityColor(local.priority)+'.main'),
  boxShadow: highlighted ? `0 0 0 2px ${highlightColor || '#0288d1'}` : 'none',
        transition: 'box-shadow 0.25s, border-color 0.25s',
        position: 'relative',
  // Distinct background tint for Task cards (soft warm)
  background: highlighted ? 'linear-gradient(145deg,#fffbe6,#fff3bf)' : 'linear-gradient(145deg,#ffffff,#fafafa)',
  borderColor: highlighted ? 'rgba(255,200,0,0.6)' : 'rgba(0,0,0,0.08)',
    // Maintain consistent dimension & prevent squeezing when many tasks exist
    flexShrink: 0,
    minHeight: expanded ? undefined : 60,
        '::after': highlighted ? {
          content: '""',
          position: 'absolute',
          inset: 0,
          border: '2px solid',
          borderColor: highlightColor || 'info.light',
          borderRadius: 1,
          pointerEvents: 'none'
        } : undefined
      }}
    >
      <CardContent sx={{ py: 0.75, '&:last-child': { pb: 0.75 } }}>
    <Stack direction="row" spacing={1} alignItems="center" sx={{ minHeight: 50 }}>
          <IconButton size="small" onClick={() => setExpanded(e => !e)} aria-label={expanded ? 'collapse' : 'expand'}>
            {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
          </IconButton>
          <Typography 
            variant="body2" 
            fontWeight={600} 
            flex={1} 
            noWrap 
            title={local.title}
            sx={local.status === 'Cancelled' ? { textDecoration: 'line-through', opacity: 0.6 } : undefined}
          >
            {local.title}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="nowrap" sx={{ maxWidth: 360, overflow: 'hidden' }}>
            <Chip size="small" label={local.priority} color={priorityColor(local.priority)} variant="outlined" />
            <Chip size="small" label={`${local.progress}%`} color={statusColor(local.status)} />
            {local.assignee && <Chip size="small" label={local.assignee} color="info" variant="filled" />}
            {local.required_skills && <Chip size="small" label={local.required_skills[0]} />}
          </Stack>
          <Tooltip title="Cycle Status">
            <IconButton size="small" onClick={toggleStatus} aria-label="toggle status">
              {local.status === 'Completed' ? <DoneIcon fontSize="small" /> : <PlayArrowIcon fontSize="small" />}
            </IconButton>
          </Tooltip>
        </Stack>
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box mt={1.25}>
            <Stack direction="row" spacing={1} mb={1}>
              <FormControl size="small" fullWidth>
                <InputLabel id={`assignee-${local.id}`}>Assignee</InputLabel>
                <Select labelId={`assignee-${local.id}`} label="Assignee" value={local.assignee || ''} onChange={e => handleField('assignee', e.target.value)}>
                  <MenuItem value=""><em>Unassigned</em></MenuItem>
                  {team.map(m => <MenuItem key={m.id} value={m.name}>{m.name}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel id={`priority-${local.id}`}>Priority</InputLabel>
                <Select labelId={`priority-${local.id}`} label="Priority" value={local.priority} onChange={e => handleField('priority', e.target.value)}>
                  {['High','Medium','Low'].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            <Stack direction="row" spacing={1} mb={1}>
              <FormControl size="small" fullWidth>
                <InputLabel id={`status-${local.id}`}>Status</InputLabel>
                <Select labelId={`status-${local.id}`} label="Status" value={local.status} onChange={e => handleField('status', e.target.value)}>
                  {['Pending','In Progress','Completed','Cancelled'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
              <FormControl size="small" fullWidth>
                <InputLabel id={`progress-${local.id}`}>Progress %</InputLabel>
                <Select labelId={`progress-${local.id}`} label="Progress %" value={local.progress} onChange={e => handleField('progress', Number(e.target.value))}>
                  {[0,10,20,30,40,50,60,70,80,90,100].map(p => <MenuItem key={p} value={p}>{p}%</MenuItem>)}
                </Select>
              </FormControl>
            </Stack>
            {local.required_skills && <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>Skills: {local.required_skills.join(', ')}</Typography>}
            <Stack spacing={0.25}>
              <LinearProgress variant="determinate" value={local.progress} sx={{ height: 6, borderRadius: 2 }} />
              {local.estimated_hours && <Typography variant="caption" color="text.secondary">Est: {local.estimated_hours}h • Remaining: {local.remaining_hours ?? local.estimated_hours}h</Typography>}
            </Stack>
          </Box>
        </Collapse>
      </CardContent>
    </Card>
  );
}
