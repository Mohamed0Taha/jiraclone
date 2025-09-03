import React, { useState, useMemo, useCallback } from 'react';
import { Box, Typography, Card, CardContent, Chip, Stack, IconButton, Tooltip, Collapse, Button, Divider } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

// Fallback when no events provided - removed to avoid showing placeholders
const FALLBACK_EVENTS = [];

const typeColor = (t) => ({
	'Milestone': 'success',
	'Meeting': 'info',
	'Review': 'warning',
	'Capacity Crisis': 'error',
	'Resource Crisis': 'error',
	'Budget Crisis': 'warning',
	'Technical Crisis': 'error',
	'Quality Risk': 'warning',
	'Dependency Crisis': 'warning',
	'Information': 'info'
}[t] || 'default');

const actionTypeStyle = (actionType) => {
	switch(actionType){
		case 'standup': return { chipLabel: 'Standup', color: 'info', tone: 'rgba(37,99,235,0.08)' };
		case 'team_event': return { chipLabel: 'Team Event', color: 'secondary', tone: 'rgba(124,58,237,0.10)' };
		case 'attrition': return { chipLabel: 'Attrition', color: 'error', tone: 'rgba(220,38,38,0.10)' };
		case 'team_conflict': return { chipLabel: 'Conflict', color: 'warning', tone: 'rgba(249,115,22,0.12)' };
		case 'budget_request': return { chipLabel: 'Budget Req', color: 'warning', tone: 'rgba(245,158,11,0.10)' };
		case 'funding_injection': return { chipLabel: 'Funding', color: 'success', tone: 'rgba(5,150,105,0.12)' };
		case 'scope_creep': return { chipLabel: 'Scope', color: 'warning', tone: 'rgba(245,158,11,0.10)' };
		case 'quality_issue': return { chipLabel: 'Quality', color: 'default', tone: 'rgba(107,114,128,0.12)' };
		case 'vendor_delay': return { chipLabel: 'Vendor', color: 'error', tone: 'rgba(220,38,38,0.10)' };
		case 'morale_slump': return { chipLabel: 'Morale', color: 'secondary', tone: 'rgba(99,102,241,0.12)' };
		case 'technical_debt': return { chipLabel: 'Tech Debt', color: 'error', tone: 'rgba(185,28,28,0.12)' };
		default: return null;
	}
};

function EventsComponent({
	events,
	week,
	onSelect,
	highlightColorMap = {},
	selectedEventId,
	resolvedEventIds = [],
	onResolve,
	onResolveOption
}) {
	const [dismissed, setDismissed] = useState([]);

	const visibleEvents = useMemo(() => {
		const list = (events && events.length) ? events : FALLBACK_EVENTS;
		return list
			.filter(e => !dismissed.includes(e.id) && !resolvedEventIds.includes(e.id))
			.sort((a,b) => (b.trigger_week || 0) - (a.trigger_week || 0) || (b.id > a.id ? 1 : -1));
	}, [events, dismissed, resolvedEventIds]);

	const handleDismiss = useCallback((id) => {
		setDismissed(prev => prev.includes(id) ? prev : [...prev, id]);
	}, []);

	const handleSelect = useCallback((e) => {
		onSelect && onSelect(e);
	}, [onSelect]);

	const handleResolve = async (event, optionKey) => {
		if (!onResolveOption) return;
		const res = await onResolveOption(event, optionKey);
		if (res?.success) {
			onResolve && onResolve(event.id);
		}
	};

	return (
		<Box>
			<Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
				<Typography variant="h6">Events</Typography>
				{visibleEvents.some(e => (e.requiresAction || e.effects?.resolution_requires_action || e.resolution_requires_action)) && (
					<Chip label="Action Required" color="warning" size="small" />
				)}
				{visibleEvents.some(e => e.severity === 'high') && (
					<Chip label="High Impact" color="error" size="small" />
				)}
			</Stack>

			{visibleEvents.length === 0 && (
				<Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
					No current events
				</Typography>
			)}

			<Stack spacing={1.25}>
				{visibleEvents.map(e => {
					const occurred = (e.trigger_week ?? 0) <= (week ?? 0);
					const actionable = e.requiresAction === true || e.effects?.resolution_requires_action === true || e.resolution_requires_action === true;
					const selected = selectedEventId === e.id;
					const highlight = highlightColorMap[e.id];

					return (
						<Card
							key={e.id}
							variant={actionable ? 'outlined' : 'elevation'}
							onClick={() => handleSelect(e)}
							sx={{
								cursor: 'pointer',
								position: 'relative',
								borderColor: actionable ? 'warning.light' : undefined,
											background: (() => {
												const style = actionTypeStyle(e.action_type);
												if (selected) return 'rgba(25,118,210,0.08)';
												if (actionable && style) return style.tone;
												if (actionable) return 'linear-gradient(90deg, rgba(255,165,0,0.15), transparent)';
												return 'transparent';
											})(),
								'&:hover': { backgroundColor: actionable ? 'rgba(255,165,0,0.2)' : 'action.hover' },
								overflow: 'hidden'
							}}
						>
							{highlight && (
								<Box sx={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, bgcolor: highlight, borderTopLeftRadius: 4, borderBottomLeftRadius: 4 }} />
							)}
								<CardContent sx={{ py: 1.1, '&:last-child': { pb: 1.1 } }}>
									<Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={1}>
										{/* Left content: enforce a reasonable min width so long chip groups don't collapse the title */}
										<Box sx={{ flex: 1, minWidth: 190, pr: 0.5 }}>
											<Stack direction="row" spacing={0.75} alignItems="center" sx={{ mb: 0.25, flexWrap: 'wrap' }}>
												<Typography
													variant="subtitle2"
													fontWeight={600}
													lineHeight={1.2}
													sx={{ pr: 1, overflowWrap: 'break-word', wordBreak: 'normal' }}
												>
													{e.title || e.name}
												</Typography>
											{e.severity && (
												<Chip
													size="small"
													label={e.severity.toUpperCase()}
													color={e.severity === 'high' ? 'error' : e.severity === 'medium' ? 'warning' : 'default'}
												/>
											)}
											{actionable && (
												<Chip size="small" label="Resolve via Task Card" color="warning" />
											)}
										</Stack>
										<Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 0.25 }}>
											W{e.trigger_week ?? '—'}{occurred ? '' : ' (upcoming)'}
										</Typography>
										<Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-line' }}>
											{e.description || e.desc}
										</Typography>
										{/* Defensive: avoid pathological vertical letter stacking if container shrinks */}
										<style>{`
											@media (max-width: 640px) {
												.sim-event-card-title { word-break: normal !important; }
											}
										`}</style>
										{(e.member_ids?.length || e.task_ids?.length) && (
											<Box mt={0.5}>
												{e.member_ids?.length > 0 && (
													<Typography variant="caption" color="text.secondary" display="block">
														Members: {e.member_ids.join(', ')}
													</Typography>
												)}
												{e.task_ids?.length > 0 && (
													<Typography variant="caption" color="text.secondary" display="block">
														Tasks: {e.task_ids.join(', ')}
													</Typography>
												)}
											</Box>
										)}
									</Box>
									<Stack
										direction="row"
										spacing={0.5}
										alignItems="center"
										flexWrap="wrap"
										useFlexGap
										sx={{ maxWidth: 220, justifyContent: 'flex-end' }}
									>
										{e.type && <Chip size="small" label={e.type} color={typeColor(e.type)} variant="outlined" />}
										{e.action_type && (()=>{ const st = actionTypeStyle(e.action_type); return st ? <Chip size="small" label={st.chipLabel} color={st.color} variant="filled" /> : null; })()}
										{occurred && <Chip size="small" label="Occurred" color="success" />}
										{!occurred && <Chip size="small" label="Upcoming" color="default" />}
										{actionable && <Chip size="small" label="Action" color="warning" variant="outlined" />}
										{!actionable && (
											<Tooltip title="Dismiss informational event">
												<span>
													<IconButton
														size="small"
														onClick={(evt) => { evt.stopPropagation(); handleDismiss(e.id); }}
														aria-label="dismiss event"
													>
														<CloseIcon fontSize="inherit" />
													</IconButton>
												</span>
											</Tooltip>
										)}
									</Stack>
								</Stack>
								<Collapse in={selected && actionable && (e.resolution_options?.length>0)} unmountOnExit>
									<Divider sx={{ my: 1 }} />
									<Stack spacing={1}>
										{(e.resolution_options || []).map(opt => (
											<Box key={opt.key||opt.id} sx={{ p:0.75, border:'1px solid', borderColor:'divider', borderRadius:1, background:'rgba(0,0,0,0.02)' }}>
												<Typography variant="subtitle2" fontWeight={600}>{opt.title}</Typography>
												<Typography variant="caption" color="text.secondary" sx={{ whiteSpace:'pre-line' }}>{opt.description}</Typography>
												<Button size="small" variant="contained" sx={{ mt:0.5 }} onClick={(evt)=>{ evt.stopPropagation(); handleResolve(e, opt.key||opt.id); }}>Apply</Button>
											</Box>
										))}
									</Stack>
								</Collapse>
							</CardContent>
						</Card>
					);
				})}
			</Stack>
		</Box>
	);
}

const Events = React.memo(EventsComponent, (prev, next) => (
	prev.events === next.events &&
	prev.week === next.week &&
	prev.selectedEventId === next.selectedEventId &&
	prev.resolvedEventIds === next.resolvedEventIds
));

export default Events;

