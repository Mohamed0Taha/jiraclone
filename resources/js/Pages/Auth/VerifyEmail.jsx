// resources/js/Pages/Auth/VerifyEmail.jsx
import * as React from 'react';
import { Head, router } from '@inertiajs/react';
import { route } from 'ziggy-js';

import { 
  Container, 
  Paper, 
  Box, 
  Typography, 
  Button, 
  Alert, 
  Stack, 
  Avatar,
  Divider 
} from '@mui/material';
import { 
  Email as EmailIcon, 
  Refresh as RefreshIcon, 
  Dashboard as DashboardIcon,
  Logout as LogoutIcon 
} from '@mui/icons-material';

export default function VerifyEmail({ status }) {
  return (
    <>
      <Head title="Verify your email" />
      <Box
        sx={{
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #F0F4FF 0%, #E0E7FF 50%, #F0F9FF 100%)',
          p: 2,
        }}
      >
        <Container maxWidth="sm">
          <Paper 
            elevation={4} 
            sx={{ 
              p: 5, 
              borderRadius: 3,
              boxShadow: '0 10px 40px rgba(99, 102, 241, 0.1)',
              border: '1px solid rgba(99, 102, 241, 0.08)'
            }}
          >
            {/* Header with brand */}
            <Box display="flex" alignItems="center" gap={2} mb={4}>
              <Avatar
                sx={{ 
                  width: 32, 
                  height: 32, 
                  bgcolor: 'primary.main', 
                  fontSize: 16, 
                  fontWeight: 700,
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.25)'
                }}
                aria-label="brand-avatar"
              >
                {(import.meta.env.VITE_APP_NAME || 'Dominus').slice(0, 1)}
              </Avatar>
              <Typography variant="h6" fontWeight={600} color="primary.main">
                {import.meta.env.VITE_APP_NAME || 'Dominus'}
              </Typography>
            </Box>

            {/* Main content */}
            <Box textAlign="center" mb={4}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  bgcolor: 'primary.light',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 3,
                }}
              >
                <EmailIcon sx={{ fontSize: 32, color: 'primary.main' }} />
              </Box>
              
              <Typography variant="h4" fontWeight={700} gutterBottom color="text.primary">
                Check your email
              </Typography>
              <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 400, mx: 'auto' }}>
                We've sent a verification link to your inbox. Click the link in the email to verify your account.
              </Typography>
            </Box>

            {status === 'verification-link-sent' && (
              <Alert 
                severity="success" 
                sx={{ 
                  mb: 3,
                  borderRadius: 2,
                  '& .MuiAlert-icon': {
                    fontSize: 20
                  }
                }}
              >
                ✨ A fresh verification link has been sent to your email!
              </Alert>
            )}

            <Divider sx={{ my: 3 }} />

            {/* Action buttons */}
            <Stack spacing={2}>
              <Button 
                variant="contained" 
                size="large"
                startIcon={<RefreshIcon />}
                onClick={() => router.post(route('verification.send'))}
                sx={{ 
                  py: 1.5,
                  fontWeight: 600,
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.25)',
                  '&:hover': {
                    boxShadow: '0 6px 20px rgba(99, 102, 241, 0.35)',
                  }
                }}
              >
                Resend verification link
              </Button>
              
              <Stack direction="row" spacing={2}>
                <Button 
                  variant="outlined" 
                  size="large"
                  startIcon={<DashboardIcon />}
                  onClick={() => router.visit(route('dashboard'))}
                  sx={{ 
                    flex: 1,
                    py: 1.5,
                    fontWeight: 600,
                  }}
                >
                  Dashboard
                </Button>
                <Button 
                  variant="text"
                  size="large" 
                  startIcon={<LogoutIcon />}
                  onClick={() => router.post(route('logout'))}
                  sx={{ 
                    flex: 1,
                    py: 1.5,
                    fontWeight: 600,
                    color: 'text.secondary',
                    '&:hover': {
                      bgcolor: 'grey.50',
                    }
                  }}
                >
                  Log out
                </Button>
              </Stack>
            </Stack>
          </Paper>
        </Container>
      </Box>
    </>
  );
}
