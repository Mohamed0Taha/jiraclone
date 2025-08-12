// Clean rebuilt component with uniform, compact cards
import React, { useState } from 'react';
import { Box, Button, Typography, Paper, Stack, IconButton, Card, CardContent, Chip, TextField, InputAdornment, ToggleButtonGroup, ToggleButton } from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
  Email as EmailIcon,
  Schedule as ScheduleIcon,
  Notifications as NotificationIcon,
  CalendarMonth as CalendarIcon,
  TrendingUp as TrendingIcon,
  AutoAwesome as AutoAwesomeIcon,
  Speed as SpeedIcon,
  BugReport as BugIcon,
  Group as TeamIcon,
  Storage as BackupIcon,
  Refresh as SyncIcon,
  Warning as AlertIcon,
  Star as ReviewIcon,
  Assignment as AssignmentIcon,
  Timer as TimerIcon,
} from '@mui/icons-material';

// Minimal shape focused for listing (payload built on selection)
const TEMPLATES = [
  { id:'due-date-reminders', name:'Due Date Reminders', desc:'Email 24h before due.', cat:'notifications', icon:<EmailIcon/>, color:'primary', pop:95, trig:'Due Date' },
  { id:'new-task-notifications', name:'New Task Notifications', desc:'Slack on new task.', cat:'notifications', icon:<NotificationIcon/>, color:'success', pop:88, trig:'Task Created' },
  { id:'daily-standup-report', name:'Daily Standup Report', desc:'Daily 09:00 summary.', cat:'reports', icon:<ScheduleIcon/>, color:'info', pop:76, trig:'Schedule' },
  { id:'calendar-sync', name:'Calendar Integration', desc:'Events for high priority.', cat:'productivity', icon:<CalendarIcon/>, color:'secondary', pop:82, trig:'Task Created' },
  { id:'status-change-tracking', name:'Status Change Tracking', desc:'Notify on Done.', cat:'analytics', icon:<TrendingIcon/>, color:'warning', pop:71, trig:'Task Updated' },
  { id:'bug-assignment', name:'Bug Auto-Assignment', desc:'Assign & notify bugs.', cat:'productivity', icon:<BugIcon/>, color:'error', pop:73, trig:'Task Created' },
  { id:'overdue-alerts', name:'Overdue Task Alerts', desc:'Alert overdue tasks.', cat:'notifications', icon:<AlertIcon/>, color:'warning', pop:89, trig:'Due Date Passed' },
  { id:'project-backup', name:'Project Data Backup', desc:'Weekly backup.', cat:'reports', icon:<BackupIcon/>, color:'secondary', pop:58, trig:'Schedule' },
  { id:'time-tracking-sync', name:'Time Tracking Sync', desc:'Sync estimates.', cat:'productivity', icon:<SyncIcon/>, color:'success', pop:79, trig:'Task Updated' },
  { id:'code-review-reminder', name:'Code Review Reminders', desc:'Remind reviewers.', cat:'notifications', icon:<ReviewIcon/>, color:'primary', pop:85, trig:'Task Created' },
  { id:'sprint-completion', name:'Sprint Completion Reports', desc:'Sprint summary.', cat:'reports', icon:<AssignmentIcon/>, color:'info', pop:72, trig:'Sprint Ended' },
  { id:'task-time-limit', name:'Task Time Limit Alerts', desc:'Alert overruns.', cat:'analytics', icon:<TimerIcon/>, color:'warning', pop:66, trig:'Time Exceeded' },
  { id:'team-workload-balance', name:'Team Workload Balance', desc:'Watch workload.', cat:'analytics', icon:<TeamIcon/>, color:'info', pop:67, trig:'Task Assigned' },
];

const CATEGORIES = [
  { id:'all', label:'All', icon:<AutoAwesomeIcon/> },
  { id:'notifications', label:'Notifications', icon:<NotificationIcon/> },
  { id:'reports', label:'Reports', icon:<ScheduleIcon/> },
  { id:'productivity', label:'Productivity', icon:<SpeedIcon/> },
  { id:'analytics', label:'Analytics', icon:<TrendingIcon/> },
];

const DENSITY = {
  compact: {
    cardHeight: 130,
    categoryFont: '0.6rem',
    titleFont: '0.78rem',
    descFont: '0.62rem',
    chipFont: '0.55rem',
    metaFont: '0.55rem',
    buttonFont: '0.6rem',
    lineClamp: 2
  },
  comfortable: {
    cardHeight: 150,
    categoryFont: '0.65rem',
    titleFont: '0.85rem',
    descFont: '0.7rem',
    chipFont: '0.6rem',
    metaFont: '0.6rem',
    buttonFont: '0.65rem',
    lineClamp: 3
  }
};

export default function WorkflowTemplates({ project, onBack, onSelectTemplate }) {
  const theme = useTheme();
  const [category, setCategory] = useState('all');
  const [q, setQ] = useState('');
  const [density, setDensity] = useState('comfortable');

  const d = DENSITY[density];

  const filtered = TEMPLATES.filter(t => (category==='all' || t.cat===category) && (!q || (t.name + ' ' + t.desc).toLowerCase().includes(q.toLowerCase())));

  return (
    <Box sx={{ p:3, maxWidth:1200, mx:'auto' }}>
      <Paper elevation={0} sx={{ mb:2.5, p:2.5, borderRadius:3, border:`1px solid ${alpha(theme.palette.divider,.5)}`, background:theme.palette.background.paper }}>
        <Stack direction='row' spacing={2} alignItems='center' sx={{ mb:2, flexWrap:'wrap', rowGap:1 }}>
          <IconButton onClick={onBack} sx={{ bgcolor:alpha(theme.palette.primary.main,.08), '&:hover':{ bgcolor:alpha(theme.palette.primary.main,.15) } }}>
            <ArrowBackIcon />
          </IconButton>
          <Box sx={{ flex:1, minWidth:0 }}>
            <Typography variant='h5' fontWeight={700} noWrap sx={{ letterSpacing:.25 }}>
              <AutoAwesomeIcon sx={{ mr:1, fontSize:20 }} /> Workflow Templates
            </Typography>
            <Typography variant='body2' color='text.secondary' noWrap>Pick a starting point & customize.</Typography>
          </Box>
          <Chip label={project.name} variant='outlined' sx={{ fontWeight:600 }} />
          <ToggleButtonGroup exclusive size='small' value={density} onChange={(e,val)=> val && setDensity(val)} aria-label='density' sx={{ ml:{ xs:0, md:1 } }}>
            <ToggleButton value='compact' aria-label='compact view'>XS</ToggleButton>
            <ToggleButton value='comfortable' aria-label='comfortable view'>LG</ToggleButton>
          </ToggleButtonGroup>
        </Stack>
        <TextField fullWidth size='small' placeholder='Search templates...' value={q} onChange={e=>setQ(e.target.value)} InputProps={{ startAdornment:<InputAdornment position='start'><SearchIcon fontSize='small' /></InputAdornment> }} sx={{ '& .MuiOutlinedInput-root':{ borderRadius:2, fontSize:d.descFont } }} />
      </Paper>

      <Paper elevation={0} sx={{ mb:2, p:1.5, borderRadius:2, border:`1px solid ${alpha(theme.palette.divider,.5)}` }}>
        <Stack direction='row' spacing={1} flexWrap='wrap'>
          {CATEGORIES.map(c => (
            <Button key={c.id} size='small' startIcon={c.icon} variant={category===c.id?'contained':'outlined'} onClick={()=>setCategory(c.id)} sx={{ textTransform:'none', borderRadius:2, fontWeight:600 }}>
              {c.label}
            </Button>
          ))}
        </Stack>
      </Paper>

      <Box sx={{ 
        display:'grid', 
        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', 
        gap: 1.5,
        '@media (max-width: 600px)': { gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))' },
        '@media (min-width: 900px)': { gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }
      }}>
        {filtered.map(t => (
          <Card key={t.id} sx={{ 
            width:'100%', 
            height:d.cardHeight, 
            display:'flex', 
            flexDirection:'column', 
            borderRadius:2, 
            border:`1px solid ${alpha(theme.palette.divider,.6)}`, 
            background:theme.palette.background.paper, 
            transition:'border-color .15s, transform .15s, box-shadow .15s', 
            '&:hover':{ borderColor:theme.palette[t.color].main, transform:'translateY(-3px)', boxShadow:1 } 
          }}>
            <CardContent sx={{ p:1, display:'flex', flexDirection:'column', gap:.6 }}>
              <Stack direction='row' spacing={0.75} alignItems='center'>
                <Box sx={{ width:22, height:22, borderRadius:1, display:'flex', alignItems:'center', justifyContent:'center', bgcolor:theme.palette[t.color].main, color:'#fff', '& svg':{ fontSize:16 } }}>{t.icon}</Box>
                <Typography variant='caption' sx={{ fontSize:d.categoryFont, fontWeight:600, textTransform:'uppercase', letterSpacing:.6, color:'text.secondary' }}>{t.cat}</Typography>
                <Box sx={{ ml:'auto', width:40, height:5, borderRadius:2, overflow:'hidden', bgcolor:alpha(theme.palette[t.color].main,.2) }}>
                  <Box sx={{ width:`${t.pop}%`, height:'100%', bgcolor:theme.palette[t.color].main }} />
                </Box>
              </Stack>
              <Typography variant='subtitle2' title={t.name} sx={{ fontSize:d.titleFont, fontWeight:700, lineHeight:1.15, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.name}</Typography>
              <Typography variant='caption' sx={{ fontSize:d.descFont, lineHeight:1.2, color:'text.secondary', display:'-webkit-box', WebkitLineClamp:d.lineClamp, WebkitBoxOrient:'vertical', overflow:'hidden', minHeight: d.lineClamp === 2 ? '2.2em':'3.3em' }}>{t.desc}</Typography>
              <Stack direction='row' spacing={0.5} alignItems='center' mt='auto'>
                <Chip label={t.trig} size='small' sx={{ height:18, maxWidth:'65%', bgcolor:alpha(theme.palette[t.color].main,.12), color:theme.palette[t.color].main, '& .MuiChip-label':{ px:.6, fontSize:d.chipFont, fontWeight:600, lineHeight:1.1 } }} />
                <Typography variant='caption' sx={{ fontSize:d.metaFont, color:'text.secondary', ml:'auto' }}>1 act</Typography>
              </Stack>
              <Button size='small' onClick={()=>onSelectTemplate({ name:t.name, description:t.desc, trigger:t.trig, triggerConfig:{}, actions:[] })} variant='contained' sx={{ mt:.45, textTransform:'none', fontSize:d.buttonFont, fontWeight:600, py:0.45, borderRadius:1, background:theme.palette[t.color].main, '&:hover':{ background:theme.palette[t.color].dark } }}>Use</Button>
            </CardContent>
          </Card>
        ))}
      </Box>

      {filtered.length===0 && (
        <Paper elevation={0} sx={{ mt:2, p:6, textAlign:'center', borderRadius:3, bgcolor:alpha(theme.palette.grey[100], .5) }}>
          <AutoAwesomeIcon sx={{ fontSize:56, color:'text.disabled', mb:2 }} />
          <Typography variant='h6' color='text.secondary' sx={{ mb:1 }}>No templates found</Typography>
          <Typography color='text.secondary'>Try another search or category.</Typography>
        </Paper>
      )}

      <Paper elevation={0} sx={{ mt:4, p:3, borderRadius:3, background:alpha(theme.palette.primary.main,.05), border:`1px solid ${alpha(theme.palette.divider,.4)}` }}>
        <Typography variant='h6' fontWeight={700} sx={{ mb:1 }}>Need a custom workflow?</Typography>
        <Typography variant='body2' color='text.secondary' sx={{ mb:2 }}>Templates are starting points. After selecting one you can refine triggers & actions.</Typography>
        <Button variant='outlined' onClick={onBack} sx={{ textTransform:'none', fontWeight:600 }}>Create Custom Workflow</Button>
      </Paper>
    </Box>
  );
}
