// resources/js/Pages/Tasks/MembersManagerDialog.jsx
import React from "react";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";

export default function MembersManagerDialog({ open, onClose, project, members }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Project Members — {project?.name}</DialogTitle>
      <DialogContent dividers>
        <List dense>
          {members.map((m) => (
            <ListItem key={m.id} disableGutters>
              <ListItemText primary={m.name} secondary={m.email || "—"} />
            </ListItem>
          ))}
          {members.length === 0 && (
            <ListItem disableGutters>
              <ListItemText primary="No members yet." />
            </ListItem>
          )}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button disabled variant="contained">Invite (soon)</Button>
      </DialogActions>
    </Dialog>
  );
}
