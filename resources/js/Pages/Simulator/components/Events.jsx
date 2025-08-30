import React, { useState, useMemo, useCallback } from 'react';
import { Box, Typography, Card, CardContent, Chip, Stack, IconButton, Tooltip } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
// All event actions now executed ONLY through global controls (standup, team event, praise, remove)

const MOCK_EVENTS = [
	{ id: 1, title: 'Simulation Ready', type: 'Info', date: new Date().toISOString().slice(0,10), desc: 'Generated placeholder' },
];

const typeColor = (t) => ({ Milestone: 'success', Meeting: 'info', Review: 'warning' }[t] || 'default');

export default function Events({ events, week, onSelect, highlightColorMap = {}, selectedEventId, resolvedEventIds = [], onResolve }) {
	const [dismissed, setDismissed] = useState([]);
	const data = useMemo(() => {
		const base = (events && events.length) ? events : MOCK_EVENTS;
		// show newest (higher trigger_week or id) first
		return [...base]
			.filter(e => !dismissed.includes(e.id) && !resolvedEventIds.includes(e.id))
			.sort((a,b) => (b.trigger_week || 0) - (a.trigger_week || 0) || b.id - a.id);
	}, [events, dismissed, resolvedEventIds]);

	const handleDismiss = useCallback((id) => {
		setDismissed(prev => prev.includes(id) ? prev : [...prev, id]);
	}, []);
	return (
		<Box p={1.5} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
			<Stack direction="row" alignItems="center" mb={1.25}>
				<Typography variant="h6" fontWeight={700}>Events</Typography>
			</Stack>
			<Stack spacing={1.25} sx={{ overflowY: 'auto', pr: 0.5 }}>
				{data.map(e => {
					const occurred = (e.trigger_week || 0) <= week;
					// derive a representative color if tasks share highlight colors
					let eventHighlightColor = undefined;
					if (e.task_ids && e.task_ids.length) {
						const colors = e.task_ids.map(tid => highlightColorMap[tid]).filter(Boolean);
						if (colors.length === 1) eventHighlightColor = colors[0];
					}
					// No inline actions; user must use global controls. For update_task, clicking selects to highlight tasks.
					return (
						<Card 
							key={e.id} 
							variant="outlined" 
							onClick={() => onSelect && onSelect(e)}
							sx={{ 
	                                borderLeft: 4, 
								opacity: occurred ? 1 : 0.65, 
	                                borderLeftColor: eventHighlightColor || typeColor(e.type)+'.main', 
				position: 'relative', 
				cursor: 'pointer',
				'&:hover': { boxShadow: 3 },
		                                boxShadow: selectedEventId === e.id ? '0 0 0 2px #1976d2' : undefined,
										animation: (e.trigger_week === week) ? 'fadeInSlide 0.5s ease both' : undefined,
								// Distinct background tint for Events cards
								background: 'linear-gradient(145deg,#eef4ff,#e3ebff)',
								// Slightly stronger border color to separate from other card types
								borderColor: 'rgba(100,130,255,0.35)',
				// Prevent vertical squeezing when many events accumulate
				minHeight: 86,
				display: 'flex',
				flexDirection: 'column',
				justifyContent: 'flex-start',
				flexShrink: 0
							}}
						>
							<CardContent sx={{ pb: 1.1, pt: 1.1, '&:last-child': { pb: 1.2 }, display: 'flex', flexDirection: 'column', height: '100%' }}>
								<Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={0.75}>
									<Box sx={{ pr: 2, flex: 1, minWidth: 0 }}>
										<Typography variant="subtitle2" fontWeight={600} lineHeight={1.2}>{e.title}</Typography>
										<Typography variant="caption" color="text.secondary">W{e.trigger_week ?? '—'}</Typography>
									</Box>
									<Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
										<Chip size="small" label={e.type} color={typeColor(e.type)} variant="outlined" />
										{occurred ? <Chip size="small" label="Occurred" color="success" /> : <Chip size="small" label="Upcoming" color="warning" />}
										<Tooltip title="Dismiss">
											<IconButton size="small" onClick={() => handleDismiss(e.id)} aria-label="dismiss event">
												<CloseIcon fontSize="inherit" />
											</IconButton>
										</Tooltip>
									</Stack>
								</Stack>
								<Typography variant="body2" color="text.secondary" mb={0.5} sx={{ flexGrow: 1 }}>{e.desc}</Typography>
								{e.impact && <Typography variant="caption" color="text.secondary" display="block">Impact: {e.impact}</Typography>}
								{(e.member_ids?.length || e.task_ids?.length) && (
									<Box mt={0.5}>
										{e.member_ids?.length > 0 && <Typography variant="caption" color="text.secondary" display="block">Members: {e.member_ids.join(', ')}</Typography>}
										{e.task_ids?.length > 0 && <Typography variant="caption" color="text.secondary" display="block">Tasks: {e.task_ids.join(', ')}</Typography>}
									</Box>
								)}
								{/* Inline action buttons removed intentionally */}
							</CardContent>
						</Card>
					);
				})}
			</Stack>
		</Box>
	);
}

