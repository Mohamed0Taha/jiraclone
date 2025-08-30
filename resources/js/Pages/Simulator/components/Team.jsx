import React from 'react';
import { Box, Typography, Card, CardContent, Avatar, Stack, LinearProgress, Chip, Tooltip, IconButton } from '@mui/material';
import ThumbUpAltOutlinedIcon from '@mui/icons-material/ThumbUpAltOutlined';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';

// Fallback mock data
const MOCK_TEAM = [
	{ id: 1, name: 'Placeholder Member', role: 'PM', workload: 50, status: 'Active', skills: ['General'] },
];

const statusColor = (s) => ({
	Active: 'success',
	Busy: 'warning',
	Available: 'info',
    Unavailable: 'error'
}[s] || 'default');

export default function Team({ members, onPraise, onRemove, praiseBursts = [] }) {
	const data = (members && members.length) ? members : MOCK_TEAM;
	// Adaptive density: only compact when >6 to keep cards readable
	const compact = data.length > 6;
	return (
		<Box p={1.5} sx={{ height: '100%', display: 'flex', flexDirection: 'column', position:'relative' }}>
			<Stack direction="row" alignItems="center" mb={1.25} flexShrink={0}>
				<Typography variant="h6" fontWeight={700} sx={{ fontSize: compact ? 15 : 16 }}>Team</Typography>
			</Stack>
			<Stack spacing={compact ? 0.75 : 1.25} sx={{ flex:1, overflowY: 'auto', pr:0.5 }}>
				{data.map(m => (
					<Card key={m.id} variant="outlined" sx={{
						borderLeft: 4,
						borderLeftColor: 'primary.main',
						position:'relative',
						width:'100%',
						display:'flex',
						flexDirection:'column',
						fontSize: compact ? '0.74rem' : '0.87rem',
						overflow:'visible',
						boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
						// Distinct cool green/teal gradient for Team cards
						background: 'linear-gradient(145deg,#e6fbf7,#d2f5ef)',
						borderColor: 'rgba(0,150,136,0.35)',
						'&:hover': { boxShadow:'0 4px 14px -2px rgba(0,0,0,0.15)' }
					}}>
						<CardContent sx={{ py: compact ? 0.9 : 1.05, pb: 0.8, '&:last-child': { pb: 0.8 }, display:'flex', flexDirection:'column', height:'100%' }}>
							<Box flexGrow={1} minHeight={compact ? 90 : 100}>
							<Stack direction="row" spacing={1.5} alignItems="center" mb={1}>
								<Avatar sx={{ bgcolor: 'grey.300', color: 'text.primary', fontSize: 14, width: compact ? 40 : 48, height: compact ? 40 : 48 }}>
									{m.name.split(' ').map(p=>p[0]).join('').slice(0,2)}
								</Avatar>
								<Box flex={1} minWidth={0}>
									<Typography variant="subtitle2" noWrap>{m.name}</Typography>
									<Typography variant="caption" color="text.secondary">{m.role}</Typography>
								</Box>
								<Chip size="small" label={m.status} color={statusColor(m.status)} variant="outlined" />
							</Stack>
							<Stack spacing={0.5}>
								<Stack direction="row" justifyContent="space-between">
									<Typography variant="caption" color="text.secondary">Workload</Typography>
									<Typography variant="caption" color="text.secondary">{m.workload}%</Typography>
								</Stack>
								<LinearProgress variant="determinate" value={m.workload} sx={{ height: 6, borderRadius: 2 }} />
								<Stack direction="row" justifyContent="space-between" mt={0.4}>
									<Typography variant="caption" color="text.secondary">Morale</Typography>
									<Typography variant="caption" color={ (m.morale||0) > 80 ? 'success.main' : (m.morale||0) < 50 ? 'error.main' : 'text.secondary' }>{m.morale ?? 70}%</Typography>
								</Stack>
								<LinearProgress variant="determinate" value={m.morale ?? 70} sx={{ height: 5, borderRadius: 2, backgroundColor:'rgba(0,0,0,0.08)', '& .MuiLinearProgress-bar': { backgroundColor: (m.morale||0) > 80 ? '#2e7d32' : (m.morale||0) < 50 ? '#ed6c02' : '#1976d2' } }} />
								{m.skills && <Typography variant="caption" color="text.secondary" display="block" sx={{ whiteSpace:'normal', lineHeight:1.2 }}>Skills: {m.skills.join(', ')}</Typography>}
							</Stack>
							</Box>
							<Box mt={0.6} pt={0.5} display="flex" gap={1} borderTop="1px solid #eee">
								<Tooltip title="Give Positive Feedback">
									<IconButton size="small" onClick={()=>onPraise && onPraise(m.id)} aria-label="praise member" sx={{ backgroundColor:'rgba(0,0,0,0.04)' }}>
										<ThumbUpAltOutlinedIcon fontSize="inherit" />
									</IconButton>
								</Tooltip>
								<Tooltip title="Remove From Team">
									<IconButton size="small" color="error" onClick={(e)=>onRemove && onRemove(m.id, e)} aria-label="remove member" sx={{ backgroundColor:'rgba(0,0,0,0.04)' }}>
										<DeleteOutlineIcon fontSize="inherit" />
									</IconButton>
								</Tooltip>
							</Box>
						</CardContent>
						{/* Praise burst overlay */}
						{praiseBursts.filter(p=>p.memberId===m.id).map(p=> (
							<Box key={p.id} sx={{ position:'absolute', top:4, right:8, fontSize:12, fontWeight:700, color:'#66bb6a', animation:'coin-pop 1.4s ease-out forwards' }}>+Morale</Box>
						))}
					</Card>
				))}
			</Stack>
		</Box>
	);
}

