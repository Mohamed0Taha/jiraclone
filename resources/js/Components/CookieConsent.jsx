import React, { useState, useEffect } from 'react';
import { Box, Button, Card, Stack, Typography, Slide, IconButton, Link } from '@mui/material';
import { Close as CloseIcon, Cookie as CookieIcon } from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

export default function CookieConsent() {
    const [showConsent, setShowConsent] = useState(false);
    const { t } = useTranslation();

    useEffect(() => {
        // Check if user has already given consent
        const consent = localStorage.getItem('cookieConsent');
        if (!consent) {
            // Show consent after a small delay
            const timer = setTimeout(() => {
                setShowConsent(true);
            }, 1000);
            return () => clearTimeout(timer);
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookieConsent', 'accepted');
        setShowConsent(false);
    };

    const handleDecline = () => {
        localStorage.setItem('cookieConsent', 'declined');
        setShowConsent(false);
    };

    const handleClose = () => {
        setShowConsent(false);
    };

    if (!showConsent) return null;

    return (
        <Slide direction="up" in={showConsent}>
            <Card
                elevation={8}
                sx={{
                    position: 'fixed',
                    bottom: 20,
                    left: 20,
                    right: 20,
                    zIndex: 9999,
                    p: 3,
                    maxWidth: 600,
                    mx: 'auto',
                    borderRadius: 3,
                    background:
                        'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    boxShadow: '0 20px 40px -12px rgba(0,0,0,0.25)',
                }}
            >
                <Stack direction="row" spacing={2} alignItems="flex-start">
                    <CookieIcon sx={{ color: 'primary.main', mt: 0.5, flexShrink: 0 }} />

                    <Box flex={1}>
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                            {t('cookies.title')}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            {t('cookies.message')}{' '}
                            <Link
                                href="/privacy"
                                color="primary"
                                sx={{ textDecoration: 'none', fontWeight: 600 }}
                            >
                                {t('cookies.learnMore')}
                            </Link>
                        </Typography>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mt: 2 }}>
                            <Button
                                variant="contained"
                                onClick={handleAccept}
                                size="small"
                                sx={{
                                    textTransform: 'none',
                                    fontWeight: 700,
                                    background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #595CEB, #4841D6)',
                                    },
                                }}
                            >
                                {t('cookies.acceptAll')}
                            </Button>
                            <Button
                                variant="outlined"
                                onClick={handleDecline}
                                size="small"
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                {t('cookies.decline')}
                            </Button>
                        </Stack>
                    </Box>

                    <IconButton
                        size="small"
                        onClick={handleClose}
                        sx={{
                            color: 'text.secondary',
                            '&:hover': { background: 'rgba(0,0,0,0.04)' },
                        }}
                        aria-label={t('cookies.close')}
                    >
                        <CloseIcon fontSize="small" />
                    </IconButton>
                </Stack>
            </Card>
        </Slide>
    );
}
