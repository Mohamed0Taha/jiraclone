import ApplicationLogo from '@/Components/ApplicationLogo';
import CookieConsent from '@/Components/CookieConsent';
import { Link } from '@inertiajs/react';
import { Box, Container, Paper, Avatar, Typography } from '@mui/material';

export default function GuestLayout({ children }) {
    return (
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
                {/* Brand Header */}
                <Box textAlign="center" mb={4}>
                    <Link href="/">
                        <Box
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            gap={2}
                            mb={2}
                        >
                            <Box
                                component="img"
                                src="/taskpilot-logo.png"
                                alt="TaskPilot Logo"
                                sx={{
                                    width: 48,
                                    height: 48,
                                    borderRadius: '50%',
                                    boxShadow: '0 4px 14px rgba(52, 152, 219, 0.25)',
                                }}
                            />
                            <Typography variant="h5" fontWeight={700} color="primary.main">
                                {import.meta.env.VITE_APP_NAME || 'TaskPilot'}
                            </Typography>
                        </Box>
                    </Link>
                </Box>

                {/* Content Card */}
                <Paper
                    elevation={4}
                    sx={{
                        p: 4,
                        borderRadius: 3,
                        boxShadow: '0 10px 40px rgba(99, 102, 241, 0.1)',
                        border: '1px solid rgba(99, 102, 241, 0.08)',
                        maxWidth: 400,
                        mx: 'auto',
                    }}
                >
                    {children}
                </Paper>
            </Container>

            <CookieConsent />
        </Box>
    );
}
