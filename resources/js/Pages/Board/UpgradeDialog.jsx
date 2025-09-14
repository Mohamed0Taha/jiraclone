// resources/js/Components/Board/UpgradeDialog.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();

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
                {t('upgrade.proFeature', 'Pro Feature')}
            </DialogTitle>
            <DialogContent>
                <DialogContentText>
                    {t('upgrade.proFeatureDescription', 'Project members, automations, and reports are available on the Pro plan. Upgrade to unlock these features.')}
                </DialogContentText>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                    {t('common.notNow', 'Not now')}
                </Button>
                <Button
                    variant="contained"
                    onClick={() => router.visit(route('billing.show'))}
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                    {t('upgrade.viewPlans', 'View Plans')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
