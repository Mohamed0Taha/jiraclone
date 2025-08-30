import React from 'react';
import { Box, Typography, Card, CardContent, Chip, Stack, LinearProgress, Button, Grid, Divider } from '@mui/material';
import Task from './Task';

const MOCK_TASKS = [
	{ id: 1, title: 'Placeholder Task', status: 'Pending', priority: 'Medium', assignee: null, progress: 0 },
];

const priorityColor = (p) => ({ High: 'error', Medium: 'warning', Low: 'success' }[p] || 'default');
const statusColor = (s) => ({ 'Completed': 'success', 'In Progress': 'warning', 'Pending': 'default' }[s] || 'default');

export default function Tasks({ tasks, team, week, onTaskChange, highlightedTaskIds = [], highlightColorMap = {}, onClearHighlights, forceExpandTaskId, collapseVersion, canAddTask=false, onShowAddTask }) {
	const data = (tasks && tasks.length) ? tasks : MOCK_TASKS;
	const summary = {
		total: data.length,
		completed: data.filter(t=>t.status==='Completed').length,
		inProgress: data.filter(t=>t.status==='In Progress').length,
		pending: data.filter(t=>t.status==='Pending').length,
		cancelled: data.filter(t=>t.status==='Cancelled').length,
	};

	return (
		<Box p={1.5} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
			<Stack direction="row" justifyContent="space-between" alignItems="center" mb={1.25}>
				<Typography variant="h6" fontWeight={700}>Tasks {highlightedTaskIds.length > 0 && <Chip size="small" color="info" label={`Highlighted: ${highlightedTaskIds.length}`} sx={{ ml:1 }} />}</Typography>
				<Stack direction="row" spacing={1}>
                    {highlightedTaskIds.length > 0 && <Button size="small" variant="outlined" color="info" onClick={onClearHighlights}>Clear Highlights</Button>}
					<Button size="small" variant="contained" disabled={!canAddTask} onClick={canAddTask ? onShowAddTask : undefined}>New Task</Button>
				</Stack>
			</Stack>


			<Stack spacing={1.25} sx={{ overflowY: 'auto', pr: 0.5, alignItems: 'stretch' }}>
				{data.map(t => (
					<Task 
							key={t.id} 
							task={t} 
							team={team || []} 
							onChange={onTaskChange} 
							highlighted={highlightedTaskIds.includes(t.id)}
							highlightColor={highlightColorMap[t.id]}
							defaultExpanded={forceExpandTaskId === t.id}
							collapseVersion={collapseVersion}
						/>
				))}
				{data.length === 0 && (
					<Card variant="outlined"><CardContent><Typography variant="body2" color="text.secondary">No tasks.</Typography></CardContent></Card>
				)}
			</Stack>
		</Box>
	);
}

function StatCard({ label, value, color }) {
	return (
		<Card variant="outlined" sx={{ height: '100%' }}>
			<CardContent sx={{ py: 1.5, px: 1.5 }}>
				<Typography variant="h6" fontWeight={700} color={color || 'text.primary'} lineHeight={1}>{value}</Typography>
				<Typography variant="caption" color="text.secondary">{label}</Typography>
			</CardContent>
		</Card>
	);
}

