import { Head } from '@inertiajs/react';
import {
  Box,
  Paper,
  Typography,
  Stack,
  Link as MuiLink,
  Divider,
} from '@mui/material';
import { useTheme, alpha } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

const listStyles = {
  component: 'ul',
  sx: {
    pl: 3,
    display: 'grid',
    gap: 0.75,
    m: 0,
    listStyle: 'disc',
    color: 'text.secondary',
  },
};

export default function TermsOfService() {
  const { t } = useTranslation();
  const theme = useTheme();

  const surfaceColor = theme.palette.mode === 'dark'
    ? alpha(theme.palette.background.paper, 0.92)
    : theme.palette.background.paper;

  const frameBackground = theme.palette.mode === 'dark'
    ? `radial-gradient(circle at top, ${alpha(theme.palette.primary.main, 0.32)} 0%, ${theme.palette.background.default} 55%)`
    : `linear-gradient(180deg, ${alpha(theme.palette.primary.light, 0.28)} 0%, ${theme.palette.background.default} 75%)`;

  return (
    <>
      <Head title={t('legal.termsTitle', 'Terms of Service - TaskPilot')} />
      <Box
        component="main"
        sx={{
          minHeight: '100vh',
          background: frameBackground,
          py: { xs: 8, md: 12 },
          px: { xs: 2.5, md: 4 },
        }}
      >
        <Box sx={{ maxWidth: 1200, mx: 'auto' }}>
          <Paper
            elevation={theme.palette.mode === 'dark' ? 0 : 6}
            sx={{
              px: { xs: 3, md: 6, lg: 8 },
              py: { xs: 4, md: 6 },
              borderRadius: 4,
              backgroundColor: surfaceColor,
              border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.4 : 0.7)}`,
              boxShadow: theme.palette.mode === 'dark' ? `0 24px 60px ${alpha('#000', 0.45)}` : undefined,
              backdropFilter: theme.palette.mode === 'dark' ? 'blur(12px)' : 'none',
              color: 'text.primary',
            }}
          >
            <Stack spacing={7}>
              <Stack spacing={1.5}>
                <Typography variant="h2" sx={{ fontWeight: 700, fontSize: { xs: '2.5rem', md: '3rem' }, letterSpacing: '-0.03em' }}>
                  Terms of Service
                </Typography>
                <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontSize: '1.1rem' }}>
                  Last updated: September 4, 2025
                </Typography>
              </Stack>

              <Stack spacing={6} sx={{ fontSize: '1.05rem', lineHeight: 1.8 }}>
                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
                    1. Acceptance of Terms
                  </Typography>
                  <Typography>
                    By accessing and using TaskPilot ("the Service"), you accept and agree to be bound by these Terms. If you do not agree to abide by them, do not use the Service.
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
                    2. Description of Service
                  </Typography>
                  <Typography>
                    TaskPilot is a project management platform that helps individuals and teams organize, track, and complete projects and tasks. The Service includes tools for planning, collaboration, automation, and productivity.
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
                    3. User Accounts
                  </Typography>
                  <Typography sx={{ mb: 1.5 }}>
                    To use certain features, you must register for an account. You agree to:
                  </Typography>
                  <Box {...listStyles}>
                    <Typography component="li">Provide accurate and complete information</Typography>
                    <Typography component="li">Maintain the security of your password and account</Typography>
                    <Typography component="li">Notify us of any unauthorized use</Typography>
                    <Typography component="li">Be responsible for all activities under your account</Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
                    4. Acceptable Use
                  </Typography>
                  <Typography sx={{ mb: 1.5 }}>
                    You agree not to use the Service to:
                  </Typography>
                  <Box {...listStyles}>
                    <Typography component="li">Violate laws or regulations</Typography>
                    <Typography component="li">Infringe intellectual property or privacy rights</Typography>
                    <Typography component="li">Upload harmful, abusive, or illegal content</Typography>
                    <Typography component="li">Attempt unauthorized access to systems</Typography>
                    <Typography component="li">Interfere with or disrupt the Service</Typography>
                    <Typography component="li">Use the Service for unlawful purposes</Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
                    5. Subscription and Payment
                  </Typography>
                  <Typography sx={{ mb: 1.5 }}>
                    Some features require a paid subscription. By subscribing you agree to:
                  </Typography>
                  <Box {...listStyles}>
                    <Typography component="li">Pay applicable fees and taxes</Typography>
                    <Typography component="li">Automatic renewal unless you cancel</Typography>
                    <Typography component="li">Our refund policy (where applicable)</Typography>
                    <Typography component="li">Potential price changes with notice</Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
                    6. Intellectual Property
                  </Typography>
                  <Typography>
                    TaskPilot and its original content, features, and functionality are owned by TaskPilot and are protected by international copyright, trademark, patent, trade secret, and other intellectual property laws.
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
                    7. Termination
                  </Typography>
                  <Typography>
                    We may suspend or terminate your access to the Service if you fail to comply with these Terms. You may also terminate your account at any time from the account settings page. Upon termination, your right to use the Service will cease immediately.
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
                    8. Disclaimer of Warranties
                  </Typography>
                  <Typography>
                    The Service is provided on an "as-is" and "as-available" basis. TaskPilot makes no warranties, expressed or implied, regarding the Service, including but not limited to implied warranties of merchantability or fitness for a particular purpose.
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
                    9. Limitation of Liability
                  </Typography>
                  <Typography>
                    To the maximum extent permitted by law, TaskPilot shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly.
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
                    10. Governing Law
                  </Typography>
                  <Typography>
                    These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which TaskPilot operates, without regard to its conflict of law provisions.
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
                    11. Changes to Terms
                  </Typography>
                  <Typography>
                    We may modify these Terms at any time. We will notify you of significant changes via email or in-app notice. Continued use of the Service after changes take effect constitutes acceptance of the revised Terms.
                  </Typography>
                </Box>

                <Divider sx={{ borderColor: alpha(theme.palette.divider, 0.4) }} />

                <Box
                  sx={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    rowGap: 2,
                    columnGap: 3,
                    alignItems: { xs: 'flex-start', sm: 'center' },
                    justifyContent: 'space-between',
                    color: 'text.secondary',
                    fontSize: '0.9rem',
                  }}
                >
                  <Typography component="span">
                    © {new Date().getFullYear()} TaskPilot. All rights reserved.
                  </Typography>
                  <MuiLink
                    href="/"
                    underline="none"
                    sx={{
                      fontWeight: 600,
                      color: theme.palette.mode === 'dark' ? theme.palette.primary.light : theme.palette.primary.main,
                      transition: 'color 0.2s ease',
                      '&:hover': {
                        color: theme.palette.mode === 'dark' ? theme.palette.primary.main : theme.palette.primary.dark,
                      },
                    }}
                  >
                    ← Back to TaskPilot
                  </MuiLink>
                </Box>
              </Stack>
            </Stack>
          </Paper>
        </Box>
      </Box>
    </>
  );
}
