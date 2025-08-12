import React, { useState } from 'react';
import {
  Box,
  Fab,
  Tooltip,
  Zoom,
  Stack,
} from '@mui/material';
import {
  Add as AddIcon,
  SmartToy as SmartToyIcon,
  MoreVert as MoreVertIcon,
  Close as CloseIcon,
} from '@mui/icons-material';

export default function FloatingActionGroup({ 
  onAddTask, 
  onOpenAssistant, 
  methodStyles,
  assistantOpen 
}) {
  const [expanded, setExpanded] = useState(false);

  const handleToggle = () => {
    setExpanded(!expanded);
  };

  const handleAddTask = () => {
    setExpanded(false);
    onAddTask();
  };

  const handleOpenAssistant = () => {
    setExpanded(false);
    onOpenAssistant();
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1200,
      }}
    >
      <Stack spacing={2} alignItems="center">
        {/* Assistant Button */}
        <Zoom in={expanded} timeout={200} style={{ transitionDelay: expanded ? '100ms' : '0ms' }}>
          <Tooltip title="AI Assistant" placement="left">
            <Fab
              size="medium"
              onClick={handleOpenAssistant}
              sx={{
                bgcolor: 'secondary.main',
                color: 'white',
                boxShadow: "0 8px 16px -8px rgba(0,0,0,.3)",
                '&:hover': { 
                  bgcolor: 'secondary.dark',
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <SmartToyIcon />
            </Fab>
          </Tooltip>
        </Zoom>

        {/* Add Task Button */}
        <Zoom in={expanded} timeout={200} style={{ transitionDelay: expanded ? '0ms' : '0ms' }}>
          <Tooltip title="Create task (c)" placement="left">
            <Fab
              size="medium"
              onClick={handleAddTask}
              sx={{
                background: methodStyles.accent,
                color: 'white',
                boxShadow: "0 8px 16px -8px rgba(0,0,0,.3)",
                '&:hover': { 
                  opacity: 0.9,
                  transform: 'scale(1.05)',
                },
                transition: 'all 0.2s ease',
              }}
            >
              <AddIcon />
            </Fab>
          </Tooltip>
        </Zoom>

        {/* Main Toggle Button */}
        <Tooltip title={expanded ? "Close menu" : "Quick actions"}>
          <Fab
            color="primary"
            onClick={handleToggle}
            sx={{
              background: expanded 
                ? 'linear-gradient(45deg, #f44336 30%, #ff5722 90%)'
                : `linear-gradient(45deg, ${methodStyles.accent} 30%, #1976d2 90%)`,
              boxShadow: "0 10px 20px -12px rgba(0,0,0,.4)",
              '&:hover': { 
                transform: 'scale(1.05)',
                boxShadow: "0 12px 24px -10px rgba(0,0,0,.5)",
              },
              transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
              transform: expanded ? 'rotate(45deg)' : 'rotate(0deg)',
            }}
          >
            {expanded ? <CloseIcon /> : <MoreVertIcon />}
          </Fab>
        </Tooltip>
      </Stack>
    </Box>
  );
}
