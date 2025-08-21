// resources/js/Pages/Tasks/AutomationsDialog.jsx
import React from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    TextField,
    Stack,
} from '@mui/material';

export default function AutomationsDialog({ open, onClose, project }) {
    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>Automations — {project?.name}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <TextField label="Trigger" placeholder="e.g. task moved to Done" size="small" />
                    <TextField
                        label="Action"
                        placeholder="e.g. send email to assignee"
                        size="small"
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
                <Button disabled variant="contained">
                    Save (soon)
                </Button>
            </DialogActions>
        </Dialog>
    );
}
