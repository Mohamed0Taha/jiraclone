import React, { useState, useRef, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  TextField,
  IconButton,
  Stack,
  Avatar,
  Chip,
  Button,
  CircularProgress,
  Alert,
  Divider,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Fab,
  Slide,
} from '@mui/material';
import {
  Send as SendIcon,
  SmartToy as SmartToyIcon,
  Close as CloseIcon,
  Minimize as MinimizeIcon,
  ExpandMore as ExpandMoreIcon,
} from '@mui/icons-material';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

export default function AssistantChat({ project, open, onClose }) {
  const [message, setMessage] = useState('');
  const [conversation, setConversation] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [minimized, setMinimized] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  useEffect(() => {
    if (open && !minimized) {
      setTimeout(() => inputRef.current?.focus(), 100);
      
      // Fetch suggestions when chat opens
      if (suggestions.length === 0) {
        fetchSuggestions();
      }
    }
  }, [open, minimized]);

  const fetchSuggestions = async () => {
    try {
      const response = await fetch(route('projects.assistant.suggestions', project.id));
      const data = await response.json();
      if (data.success) {
        setSuggestions(data.suggestions);
      }
    } catch (err) {
      console.error('Failed to fetch suggestions:', err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim() || isLoading) return;

    const userMessage = message.trim();
    setMessage('');
    setError(null);
    setShowSuggestions(false); // Hide suggestions once user starts chatting
    
    // Add user message to conversation
    const newConversation = [...conversation, { role: 'user', content: userMessage, timestamp: new Date() }];
    setConversation(newConversation);
    setIsLoading(true);

    try {
      const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || '';
      
      const response = await fetch(route('projects.assistant.chat', project.id), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-CSRF-TOKEN': csrfToken,
        },
        body: JSON.stringify({
          message: userMessage,
          conversation_history: conversation.map(msg => ({
            role: msg.role,
            content: msg.content
          }))
        }),
      });

      const data = await response.json();

      if (data.success) {
        setConversation(prev => [...prev, {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(data.timestamp)
        }]);
      } else {
        setError(data.message || 'Failed to get response from assistant');
      }
    } catch (err) {
      setError(err.message || 'Network error. Please check your connection and try again.');
      console.error('Assistant chat error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setMessage(suggestion);
    inputRef.current?.focus();
  };

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const getMessageAvatar = (role) => {
    if (role === 'assistant') {
      return (
        <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
          <SmartToyIcon sx={{ fontSize: 18 }} />
        </Avatar>
      );
    }
    return (
      <Avatar sx={{ bgcolor: 'grey.400', width: 32, height: 32 }}>
        U
      </Avatar>
    );
  };

  if (!open) return null;

  if (minimized) {
    return (
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 20,
          right: 100, // Moved left to avoid overlap with FAB group
          zIndex: 1300,
        }}
        onClick={() => setMinimized(false)}
      >
        <SmartToyIcon />
      </Fab>
    );
  }

  return (
    <Paper
      elevation={8}
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 100, // Moved left to avoid overlap with FAB group
        width: { xs: '90vw', sm: 400 },
        height: { xs: '70vh', sm: 500 },
        zIndex: 1300,
        display: 'flex',
        flexDirection: 'column',
        borderRadius: 2,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <Box
        sx={{
          p: 2,
          bgcolor: 'primary.main',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <SmartToyIcon />
          <Typography variant="h6" sx={{ fontSize: '1rem' }}>
            Project Assistant
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <IconButton
            size="small"
            sx={{ color: 'white' }}
            onClick={() => setMinimized(true)}
          >
            <MinimizeIcon />
          </IconButton>
          <IconButton
            size="small"
            sx={{ color: 'white' }}
            onClick={onClose}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </Box>

      {/* Project Info */}
      <Box sx={{ p: 2, bgcolor: 'grey.50', borderBottom: 1, borderColor: 'grey.200' }}>
        <Typography variant="body2" color="text.secondary">
          Chatting about: <strong>{project.name}</strong>
        </Typography>
      </Box>

      {/* Messages */}
      <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <Box
          sx={{
            flex: 1,
            overflowY: 'auto',
            p: 1,
            '&::-webkit-scrollbar': {
              width: '6px',
            },
            '&::-webkit-scrollbar-track': {
              background: '#f1f1f1',
            },
            '&::-webkit-scrollbar-thumb': {
              background: '#c1c1c1',
              borderRadius: '3px',
            },
          }}
        >
          {conversation.length === 0 && (
            <Box sx={{ p: 3 }}>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <SmartToyIcon sx={{ fontSize: 48, color: 'grey.400', mb: 1 }} />
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Hi! I'm your project assistant. Ask me anything about "{project.name}".
                </Typography>
              </Box>
              
              {/* Suggestions */}
              {showSuggestions && suggestions.length > 0 && (
                <Box>
                  <Typography variant="h6" sx={{ mb: 2, fontSize: '0.9rem', color: 'text.secondary', textAlign: 'center' }}>
                    💡 Suggested Questions
                  </Typography>
                  <Box
                    sx={{
                      maxHeight: 200,
                      overflowY: 'auto',
                      '&::-webkit-scrollbar': {
                        width: '6px',
                      },
                      '&::-webkit-scrollbar-track': {
                        background: '#f1f1f1',
                      },
                      '&::-webkit-scrollbar-thumb': {
                        background: '#c1c1c1',
                        borderRadius: '3px',
                      },
                    }}
                  >
                    <Stack spacing={1}>
                      {suggestions.map((suggestion, index) => (
                        <Button
                          key={index}
                          variant="outlined"
                          size="small"
                          onClick={() => handleSuggestionClick(suggestion)}
                          sx={{
                            justifyContent: 'flex-start',
                            textAlign: 'left',
                            textTransform: 'none',
                            fontSize: '0.8rem',
                            py: 1,
                            px: 1.5,
                            borderColor: 'grey.300',
                            '&:hover': {
                              borderColor: 'primary.main',
                              bgcolor: 'primary.50',
                            },
                          }}
                        >
                          {suggestion}
                        </Button>
                      ))}
                    </Stack>
                  </Box>
                </Box>
              )}
            </Box>
          )}

          <Stack spacing={2}>
            {conversation.map((msg, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex',
                  flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                  gap: 1,
                  alignItems: 'flex-start',
                }}
              >
                {getMessageAvatar(msg.role)}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Paper
                    elevation={1}
                    sx={{
                      p: 1.5,
                      bgcolor: msg.role === 'user' ? 'primary.main' : 'grey.100',
                      color: msg.role === 'user' ? 'white' : 'text.primary',
                      borderRadius: 2,
                      maxWidth: '85%',
                      ml: msg.role === 'user' ? 'auto' : 0,
                      mr: msg.role === 'assistant' ? 'auto' : 0,
                    }}
                  >
                    <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {msg.content}
                    </Typography>
                    <Typography
                      variant="caption"
                      sx={{
                        opacity: 0.7,
                        fontSize: '0.7rem',
                        mt: 0.5,
                        display: 'block',
                      }}
                    >
                      {formatTime(msg.timestamp)}
                    </Typography>
                  </Paper>
                </Box>
              </Box>
            ))}
          </Stack>

          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
              <CircularProgress size={20} />
              <Typography variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                Assistant is thinking...
              </Typography>
            </Box>
          )}

          <div ref={messagesEndRef} />
        </Box>
        {/* End Messages Container */}

        {error && (
          <Alert severity="error" sx={{ m: 1, mb: 0 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}
      </Box>
      {/* End Messages Section */}

      {/* Input */}
      <Box sx={{ p: 2, borderTop: 1, borderColor: 'grey.200' }}>
          <Box
            component="form"
            onSubmit={handleSubmit}
            sx={{ display: 'flex', gap: 1, alignItems: 'flex-end' }}
          >
            <TextField
              ref={inputRef}
              fullWidth
              multiline
              maxRows={3}
              size="small"
              placeholder="Ask about your project..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={isLoading}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                },
              }}
            />
            <IconButton
              type="submit"
              disabled={!message.trim() || isLoading}
              color="primary"
              sx={{
                bgcolor: 'primary.main',
                color: 'white',
                '&:hover': {
                  bgcolor: 'primary.dark',
                },
                '&.Mui-disabled': {
                  bgcolor: 'grey.300',
                  color: 'grey.500',
                },
              }}
            >
              {isLoading ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            </IconButton>
          </Box>
        </Box>
      </Paper>
  );
}
