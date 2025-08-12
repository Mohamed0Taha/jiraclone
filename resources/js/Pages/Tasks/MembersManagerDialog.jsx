// resources/js/Pages/Tasks/MembersManagerDialog.jsx
import React, { useMemo, useState } from "react";
import {
  alpha,
  Avatar,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import PersonAddAltRoundedIcon from "@mui/icons-material/PersonAddAltRounded";
import DeleteOutlineRoundedIcon from "@mui/icons-material/DeleteOutlineRounded";
import EmailRoundedIcon from "@mui/icons-material/EmailRounded";

export default function MembersManagerDialog({ open, onClose, project, members }) {
  const theme = useTheme();
  const [email, setEmail] = useState("");
  const [localMembers, setLocalMembers] = useState(members || []);

  const initials = (name = "") => {
    const parts = name.trim().split(/\s+/);
    const a = parts[0]?.[0] || "";
    const b = parts[1]?.[0] || "";
    return (a + b).toUpperCase();
  };

  const addLocal = () => {
    if (!email.trim()) return;
    const fake = {
      id: Date.now(),
      name: email,
      email: email,
    };
    setLocalMembers((prev) => [...prev, fake]);
    setEmail("");
  };

  const removeLocal = (id) => {
    setLocalMembers((prev) => prev.filter((m) => m.id !== id));
  };

  const empty = useMemo(() => (localMembers || []).length === 0, [localMembers]);

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
      <DialogTitle sx={{ fontWeight: 800 }}>{project.name}: Members</DialogTitle>
      <DialogContent sx={{ pt: 1.5 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={1.2}>
          <TextField
            fullWidth
            size="small"
            label="Invite by email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            InputProps={{
              startAdornment: <EmailRoundedIcon fontSize="small" sx={{ mr: 1, color: "text.disabled" }} />,
            }}
            placeholder="user@example.com"
          />
          <Button
            variant="contained"
            startIcon={<PersonAddAltRoundedIcon />}
            onClick={addLocal}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Invite
          </Button>
        </Stack>

        <Divider sx={{ my: 2 }} />

        {empty ? (
          <Box
            sx={{
              border: `1.5px dashed ${alpha(theme.palette.primary.main, 0.35)}`,
              borderRadius: 3,
              p: 2,
              textAlign: "center",
              color: alpha(theme.palette.text.primary, 0.7),
            }}
          >
            No members yet.
          </Box>
        ) : (
          <List dense disablePadding>
            {localMembers.map((m) => (
              <ListItem
                key={m.id}
                secondaryAction={
                  <Tooltip title="Remove">
                    <IconButton edge="end" onClick={() => removeLocal(m.id)}>
                      <DeleteOutlineRoundedIcon />
                    </IconButton>
                  </Tooltip>
                }
              >
                <ListItemAvatar>
                  <Avatar>{initials(m.name || m.email)}</Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={<Typography fontWeight={700}>{m.name || m.email}</Typography>}
                  secondary={<Typography variant="caption">{m.email}</Typography>}
                />
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
