// resources/js/Pages/Tasks/AutomationsDialog.jsx
import React from 'react';
import { useTranslation } from 'react-i18next';
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
    const { t } = useTranslation();

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{t('automation.title', 'Automations')} — {project?.name}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2}>
                    <TextField
                        label={t('automation.triggerEvent', 'Trigger Event')}
                        placeholder={t('automation.triggerPlaceholder', 'Select a trigger event')}
                        size="small"
                    />
                    <TextField
                        label={t('automation.action', 'Action')}
                        placeholder={t('automation.actionPlaceholder', 'Define the action')}
                        size="small"
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose}>{t('common.close', 'Close')}</Button>
                <Button disabled variant="contained">
                    {t('automation.save', 'Save (soon)')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
