// resources/js/Pages/Tasks/AutomationsDialog.jsx
import React, { useState } from "react";
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
} from "@mui/material";
import AccessTimeRoundedIcon from "@mui/icons-material/AccessTimeRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";
import NotificationsActiveRoundedIcon from "@mui/icons-material/NotificationsActiveRounded";

export default function AutomationsDialog({ open, onClose, project }) {
  const theme = useTheme();
  const [dailySummary, setDailySummary] = useState(true);
  const [dueReminders, setDueReminders] = useState(true);
  const [slackWebhook, setSlackWebhook] = useState("");

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
          background: "linear-gradient(140deg,rgba(255,255,255,0.94),rgba(255,255,255,0.78))",
          backdropFilter: "blur(12px)",
          border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
        },
      }}
    >
      <DialogTitle sx={{ fontWeight: 800 }}>{project.name}: Automations</DialogTitle>
      <DialogContent sx={{ pt: 1 }}>
        <Stack spacing={2}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <AccessTimeRoundedIcon color="primary" />
            <Typography fontWeight={700}>Daily Summary</Typography>
          </Box>
          <FormControlLabel
            control={<Checkbox checked={dailySummary} onChange={(e) => setDailySummary(e.target.checked)} />}
            label="Email me a daily summary of activity"
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
            <NotificationsActiveRoundedIcon color="primary" />
            <Typography fontWeight={700}>Due Date Reminders</Typography>
          </Box>
          <FormControlLabel
            control={<Checkbox checked={dueReminders} onChange={(e) => setDueReminders(e.target.checked)} />}
            label="Send reminders 24h before task due dates"
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1 }}>
            <EmailRoundedIcon color="primary" />
            <Typography fontWeight={700}>Slack Webhook (optional)</Typography>
          </Box>
          <TextField
            size="small"
            placeholder="https://hooks.slack.com/services/…"
            value={slackWebhook}
            onChange={(e) => setSlackWebhook(e.target.value)}
            fullWidth
          />
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Cancel
        </Button>
        <Button onClick={save} variant="contained" sx={{ textTransform: "none", fontWeight: 700 }}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
