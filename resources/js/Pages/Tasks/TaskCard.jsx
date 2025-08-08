import React from "react";
import {
    Card,
    CardContent,
    Box,
    Typography,
    IconButton,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

/**
 * Stateless task card (presentation only).
 * Parent component supplies all drag-and-drop props.
 */
export default function TaskCard({ task, onEdit, onDelete }) {
    /* stop clicks on the icons from propagating to the draggable layer */
    const stop = (e) => {
        e.preventDefault();
        e.stopPropagation();
    };

    return (
        <Card variant="outlined" sx={{ borderLeft: "4px solid #3b82f6" }}>
            <CardContent sx={{ p: 1.5, position: "relative" }}>
                <Typography variant="subtitle2" fontWeight={700}>
                    {task.title || "(Untitled)"}
                </Typography>

                {task.description && (
                    <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ mb: 0.5 }}
                    >
                        {task.description}
                    </Typography>
                )}

                <Typography variant="caption" color="text.secondary">
                    Created by {task.creator?.name}
                </Typography>

                {task.assignee && (
                    <Typography
                        variant="caption"
                        color="text.secondary"
                        display="block"
                    >
                        Assigned to {task.assignee.name}
                    </Typography>
                )}

                <Box
                    sx={{
                        position: "absolute",
                        top: 8,
                        right: 8,
                        display: "flex",
                        gap: 1,
                    }}
                >
                    <IconButton size="small" onClick={(e) => { stop(e); onEdit(); }}>
                        <EditIcon fontSize="small" />
                    </IconButton>
                    <IconButton size="small" onClick={(e) => { stop(e); onDelete(); }}>
                        <DeleteIcon fontSize="small" />
                    </IconButton>
                </Box>
            </CardContent>
        </Card>
    );
}
