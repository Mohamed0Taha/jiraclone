import React, { useMemo } from "react";
import { router } from "@inertiajs/react";
import {
    Accordion,
    AccordionDetails,
    AccordionSummary,
    Box,
    Button,
    Chip,
    IconButton,
    Stack,
    Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import DeleteIcon from "@mui/icons-material/Delete";

/**
 * ProjectAccordion
 *
 * Props
 *  ├ project – {
 *  │     id, name, description,
 *  │     tasks: { todo:[], inprogress:[], done:[] }  // OR flat array
 *  │   }
 *  ├ rowSx   – background / hover styles
 *  └ onDelete(event, project)
 */
export default function ProjectAccordion({ project, rowSx, onDelete }) {
    /* ---------- normalise to grouped arrays ---------- */
    const grouped = useMemo(() => {
        const empty = { todo: [], inprogress: [], done: [] };

        /* Case 1: already grouped */
        if (
            project.tasks &&
            Array.isArray(project.tasks.todo) &&
            Array.isArray(project.tasks.inprogress) &&
            Array.isArray(project.tasks.done)
        ) {
            return project.tasks;
        }

        /* Case 2: flat array with status */
        if (Array.isArray(project.tasks)) {
            return project.tasks.reduce(
                (acc, t) => {
                    acc[t.status]?.push(t);
                    return acc;
                },
                { ...empty }
            );
        }

        return empty;
    }, [project.tasks]);

    /* counts for each status */
    const counts = {
        todo: grouped.todo.length,
        inprogress: grouped.inprogress.length,
        done: grouped.done.length,
    };

    /* palette for chips */
    const chipColor = { todo: "warning", inprogress: "info", done: "success" };

    const StatusChip = ({ status, label }) => (
        <Chip
            label={`${label} (${counts[status]})`}
            size="small"
            color={chipColor[status]}
            sx={{ fontWeight: 500 }}
        />
    );

    const renderTaskChips = (arr, status) =>
        arr.map((t) => (
            <Chip
                key={t.id}
                label={t.title}
                color={chipColor[status]}
                size="small"
                sx={{ mr: 0.5, mb: 0.5 }}
            />
        ));

    /* navigate only when clicking the name */
    const gotoBoard = (e) => {
        e.stopPropagation();
        router.visit(`/projects/${project.id}/tasks`);
    };

    return (
        <Accordion disableGutters square sx={{ mb: 1, ...rowSx }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ px: 2 }}>
                <Box display="flex" alignItems="center" width="100%">
                    <Button
                        variant="text"
                        sx={{ px: 0, minWidth: 0, mr: 1, textTransform: "none" }}
                        onClick={gotoBoard}
                    >
                        <Typography fontWeight={600}>{project.name}</Typography>
                    </Button>

                    <Stack direction="row" spacing={1} sx={{ ml: "auto", mr: 1.5 }}>
                        <StatusChip status="todo"       label="To Do" />
                        <StatusChip status="inprogress" label="In Progress" />
                        <StatusChip status="done"       label="Done" />
                    </Stack>

                    <IconButton
                        size="small"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete(e, project);
                        }}
                    >
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Box>
            </AccordionSummary>

            <AccordionDetails sx={{ bgcolor: "background.paper", px: 2, py: 1 }}>
                {project.description && (
                    <Typography variant="body2" color="text.secondary" mb={1}>
                        {project.description}
                    </Typography>
                )}

                <Typography variant="caption" fontWeight={500}>
                    Tasks:
                </Typography>

                <Box sx={{ mt: 0.5 }}>
                    {renderTaskChips(grouped.todo, "todo")}
                    {renderTaskChips(grouped.inprogress, "inprogress")}
                    {renderTaskChips(grouped.done, "done")}
                </Box>
            </AccordionDetails>
        </Accordion>
    );
}
