// resources/js/Pages/Tasks/AutomationsDialog.jsx
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    alpha,
    Box,
    Button,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    Stack,
    TextField,
    Typography,
    useTheme,
} from '@mui/material';
import AccessTimeRoundedIcon from '@mui/icons-material/AccessTimeRounded';
import EmailRoundedIcon from '@mui/icons-material/EmailRounded';
import NotificationsActiveRoundedIcon from '@mui/icons-material/NotificationsActiveRounded';

export default function AutomationsDialog({ open, onClose, project }) {
    const { t } = useTranslation();
    const theme = useTheme();
    const [dailySummary, setDailySummary] = useState(true);
    const [dueReminders, setDueReminders] = useState(true);
    const [slackWebhook, setSlackWebhook] = useState('');

    const save = () => {
        onClose();
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 4,
                    background:
                        'linear-gradient(140deg,rgba(255,255,255,0.94),rgba(255,255,255,0.78))',
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                },
            }}
        >
            <DialogTitle sx={{ fontWeight: 800 }}>{t('automation.title', { projectName: project.name })}</DialogTitle>
            <DialogContent sx={{ pt: 1 }}>
                <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <AccessTimeRoundedIcon color="primary" />
                        <Typography fontWeight={700}>{t('automation.dailySummary')}</Typography>
                    </Box>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={dailySummary}
                                onChange={(e) => setDailySummary(e.target.checked)}
                            />
                        }
                        label={t('automation.dailySummaryDescription')}
                    />

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <NotificationsActiveRoundedIcon color="primary" />
                        <Typography fontWeight={700}>{t('automation.dueDateReminders')}</Typography>
                    </Box>
                    <FormControlLabel
                        control={
                            <Checkbox
                                checked={dueReminders}
                                onChange={(e) => setDueReminders(e.target.checked)}
                            />
                        }
                        label={t('automation.dueDateRemindersDescription')}
                    />

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                        <EmailRoundedIcon color="primary" />
                        <Typography fontWeight={700}>{t('automation.slackWebhook')}</Typography>
                    </Box>
                    <TextField
                        size="small"
                        placeholder={t('automation.slackWebhookPlaceholder')}
                        value={slackWebhook}
                        onChange={(e) => setSlackWebhook(e.target.value)}
                        fullWidth
                    />
                </Stack>
            </DialogContent>
            <DialogActions sx={{ px: 3, pb: 2 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none' }}>
                    {t('common.cancel')}
                </Button>
                <Button
                    onClick={save}
                    variant="contained"
                    sx={{ textTransform: 'none', fontWeight: 700 }}
                >
                    {t('common.save')}
                </Button>
            </DialogActions>
        </Dialog>
    );
}
