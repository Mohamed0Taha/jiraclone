// resources/js/Components/Board/UpgradeDialog.jsx
import React from 'react';
import {
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import { router } from '@inertiajs/react';

export default function UpgradeDialog({ open, onClose }) {
    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="xs"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 4,
                    background:
                        'linear-gradient(150deg,rgba(255,255,255,0.94),rgba(255,255,255,0.78))',
                    backdropFilter: 'blur(10px)',
                },
            }}
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    fontWeight: 800,
                }}
            >
                <WorkspacePremiumRoundedIcon color="warning" />
                Pro Feature
            </DialogTitle>
            <DialogContent>
                <DialogContentText>
                    Project members, automations, and reports are available on the Pro plan. Upgrade
                    to unlock these features.
                </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                    Not now
                </Button>
                <Button
                    variant="contained"
                    onClick={() => router.visit(route('billing.show'))}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                    View Plans
                </Button>
            </DialogActions>
        </Dialog>
    );
}
