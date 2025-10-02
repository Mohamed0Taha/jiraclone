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
    Divider,
    alpha,
} from '@mui/material';
import {
    Email as EmailIcon,
    Refresh as RefreshIcon,
    Dashboard as DashboardIcon,
    Logout as LogoutIcon,
} from '@mui/icons-material';


import { useTranslation } from 'react-i18next';// Landing page color scheme
const colors = {
    primary: '#FF6B6B',
    secondary: '#4ECDC4',
    accent: '#45B7D1',
    support: '#96CEB4',
    warm: '#FFEAA7',
    purple: '#DDA0DD',
    gradient: 'linear-gradient(135deg, #FF6B6B 0%, #4ECDC4 50%, #45B7D1 100%)',
};

export default function VerifyEmail({ status }) {
  const { t } = useTranslation();
  
  // Load Google Ads tracking on mount
  React.useEffect(() => {
    // Load gtag.js script
    const script1 = document.createElement('script');
    script1.async = true;
    script1.src = 'https://www.googletagmanager.com/gtag/js?id=AW-978034290';
    document.head.appendChild(script1);
    
    // Initialize gtag
    const script2 = document.createElement('script');
    script2.innerHTML = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'AW-978034290');
    `;
    document.head.appendChild(script2);
    
    // Fire conversion event after gtag is loaded
    script1.onload = () => {
      // Wait a bit for gtag to initialize
      setTimeout(() => {
        if (window.gtag) {
          window.gtag('event', 'conversion', {'send_to': 'AW-978034290/Vn0OCJzWjqYbEPK8rtID'});
          console.log('Google Ads Sign-up conversion tracked');
        }
      }, 500);
    };
    
    return () => {
      // Cleanup on unmount
      if (document.head.contains(script1)) {
        document.head.removeChild(script1);
      }
      if (document.head.contains(script2)) {
        document.head.removeChild(script2);
      }
    };
  }, []);
  
    return (
        <>
            <Head title={t('head.auth.verifyEmail')} />
            <Box
                sx={{
                    minHeight: '100vh',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: colors.gradient,
                    p: 2,
                }}
            >
                <Container maxWidth="sm">
                    <Paper
                        elevation={20}
                        sx={{
                            p: 5,
                            borderRadius: 3,
                            background: (theme) =>
                                theme.palette.mode === 'dark'
                                    ? 'rgba(15,23,42,0.95)'
                                    : 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(20px)',
                            border: `1px solid ${alpha(colors.primary, 0.1)}`,
                            boxShadow: `0 20px 60px ${alpha(colors.primary, 0.2)}`,
                        }}
                    >
                        {/* Header with brand */}
                        <Box display="flex" alignItems="center" gap={2} mb={4}>
                            <Avatar
                                sx={{
                                    width: 60,
                                    height: 60,
                                    background: colors.gradient,
                                    boxShadow: `0 8px 25px ${alpha(colors.primary, 0.3)}`,
                                }}
                            >
                                <EmailIcon sx={{ fontSize: 30, color: 'white' }} />
                            </Avatar>
                            <Box>
                                <Typography
                                    variant="h4"
                                    sx={{
                                        fontWeight: 700,
                                        background: colors.gradient,
                                        backgroundClip: 'text',
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                    }}
                                >
                                    TaskPilot
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Project Management Platform
                                </Typography>
                            </Box>
                        </Box>

                        <Divider sx={{ mb: 4 }} />

                        {/* Main Content */}
                        <Stack spacing={3} alignItems="center">
                            <Box
                                sx={{
                                    width: 100,
                                    height: 100,
                                    borderRadius: '50%',
                                    background: `linear-gradient(135deg, ${alpha(colors.secondary, 0.1)} 0%, ${alpha(colors.accent, 0.1)} 100%)`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    border: `3px solid ${alpha(colors.secondary, 0.2)}`,
                                }}
                            >
                                <EmailIcon sx={{ fontSize: 50, color: colors.secondary }} />
                            </Box>

                            <Typography
                                variant="h5"
                                align="center"
                                sx={{
                                    fontWeight: 600,
                                    color: colors.accent,
                                }}
                            >
                                Verify Your Email
                            </Typography>

                            <Typography
                                variant="body1"
                                align="center"
                                color="text.secondary"
                                sx={{ maxWidth: 400 }}
                            >
                                We've sent a verification email to your inbox. Please click the link
                                in the email to verify your account and start using TaskPilot.
                            </Typography>

                            {status === 'verification-link-sent' && (
                                <Alert
                                    severity="success"
                                    sx={{
                                        borderRadius: 2,
                                        backgroundColor: alpha(colors.support, 0.1),
                                        borderLeft: `4px solid ${colors.support}`,
                                        '& .MuiAlert-icon': {
                                            color: colors.support,
                                        },
                                    }}
                                >
                                    A new verification link has been sent to your email address.
                                </Alert>
                            )}

                            {/* Action Buttons */}
                            <Stack
                                direction={{ xs: 'column', sm: 'row' }}
                                spacing={2}
                                sx={{ mt: 3, width: '100%' }}
                            >
                                <Button
                                    fullWidth
                                    variant="contained"
                                    startIcon={<RefreshIcon />}
                                    onClick={() => router.post(route('verification.send'))}
                                    sx={{
                                        py: 1.5,
                                        borderRadius: 2,
                                        background: `linear-gradient(135deg, ${colors.secondary} 0%, ${colors.accent} 100%)`,
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        boxShadow: `0 8px 25px ${alpha(colors.secondary, 0.3)}`,
                                        '&:hover': {
                                            background: `linear-gradient(135deg, ${colors.accent} 0%, ${colors.secondary} 100%)`,
                                            boxShadow: `0 12px 35px ${alpha(colors.secondary, 0.4)}`,
                                            transform: 'translateY(-2px)',
                                        },
                                        transition: 'all 0.3s ease',
                                    }}
                                >
                                    Resend Email
                                </Button>

                                <Button
                                    fullWidth
                                    variant="outlined"
                                    startIcon={<DashboardIcon />}
                                    href={route('dashboard')}
                                    sx={{
                                        py: 1.5,
                                        borderRadius: 2,
                                        borderColor: colors.support,
                                        color: colors.support,
                                        fontWeight: 600,
                                        textTransform: 'none',
                                        '&:hover': {
                                            borderColor: colors.warm,
                                            backgroundColor: alpha(colors.warm, 0.1),
                                            color: colors.warm,
                                        },
                                    }}
                                >
                                    Go to Dashboard
                                </Button>
                            </Stack>

                            <Divider sx={{ width: '100%', my: 2 }} />

                            {/* Logout Option */}
                            <Button
                                variant="text"
                                startIcon={<LogoutIcon />}
                                onClick={() => router.post(route('logout'))}
                                sx={{
                                    color: colors.purple,
                                    textTransform: 'none',
                                    '&:hover': {
                                        backgroundColor: alpha(colors.purple, 0.1),
                                    },
                                }}
                            >
                                Sign out
                            </Button>
                        </Stack>
                    </Paper>
                </Container>
            </Box>
        </>
    );
}
