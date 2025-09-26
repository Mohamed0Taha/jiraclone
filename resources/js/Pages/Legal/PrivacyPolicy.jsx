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

export default function PrivacyPolicy() {
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
      <Head title={t('legal.privacyTitle', 'Privacy Policy - TaskPilot')} />
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
                  Privacy Policy
                </Typography>
                <Typography variant="subtitle1" sx={{ color: 'text.secondary', fontSize: '1.1rem' }}>
                  Last updated: September 4, 2025
                </Typography>
              </Stack>

              <Stack spacing={6} sx={{ fontSize: '1.05rem', lineHeight: 1.8 }}>
                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
                    1. Introduction
                  </Typography>
                  <Typography>
                    Welcome to TaskPilot ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This privacy policy explains how we collect, use, and safeguard your information when you use our project management platform.
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
                    2. Information We Collect
                  </Typography>
                  <Stack spacing={2.5}>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                        Personal Information
                      </Typography>
                      <Box {...listStyles}>
                        <Typography component="li">Name and email address (when you register)</Typography>
                        <Typography component="li">Payment information (processed securely through Stripe)</Typography>
                        <Typography component="li">Profile information you choose to provide</Typography>
                        <Typography component="li">Communication preferences</Typography>
                      </Box>
                    </Box>
                    <Box>
                      <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                        Usage Information
                      </Typography>
                      <Box {...listStyles}>
                        <Typography component="li">Projects and tasks you create</Typography>
                        <Typography component="li">Comments and collaboration data</Typography>
                        <Typography component="li">Usage analytics and performance data</Typography>
                        <Typography component="li">Device information and IP address</Typography>
                      </Box>
                    </Box>
                  </Stack>
                </Box>

                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
                    3. How We Use Your Information
                  </Typography>
                  <Box {...listStyles}>
                    <Typography component="li">Provide and maintain our service</Typography>
                    <Typography component="li">Process payments and manage subscriptions</Typography>
                    <Typography component="li">Send important service notifications</Typography>
                    <Typography component="li">Improve our platform and user experience</Typography>
                    <Typography component="li">Provide customer support</Typography>
                    <Typography component="li">Comply with legal obligations</Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
                    4. Information Sharing
                  </Typography>
                  <Typography sx={{ mb: 1.5 }}>
                    We do not sell, rent, or trade your personal information. We may share your information only in these limited circumstances:
                  </Typography>
                  <Box {...listStyles}>
                    <Typography component="li">With service providers who help us operate our platform (like Stripe for payments)</Typography>
                    <Typography component="li">When required by law or to protect our rights</Typography>
                    <Typography component="li">With your explicit consent</Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
                    5. Data Security
                  </Typography>
                  <Typography>
                    We implement administrative, technical, and physical safeguards to protect your data. These include encryption, access controls, audit logging, and regular security reviews. No online platform can guarantee absolute security, but we work diligently to protect your information.
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
                    6. Data Retention
                  </Typography>
                  <Typography>
                    We retain personal data for as long as your account is active or as needed to provide services. You can request deletion of your account and associated data at any time. Some information may be retained to comply with legal obligations or resolve disputes.
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
                    7. Your Rights
                  </Typography>
                  <Box {...listStyles}>
                    <Typography component="li">Access, update, or delete your personal information</Typography>
                    <Typography component="li">Export your data or request portability</Typography>
                    <Typography component="li">Opt out of marketing communications</Typography>
                    <Typography component="li">Revoke integrations or third-party access</Typography>
                    <Typography component="li">Contact us with privacy questions at support@taskpilot.ai</Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
                    8. Third-Party Services
                  </Typography>
                  <Typography>
                    TaskPilot integrates with third-party providers such as Stripe, OpenAI, and Google Workspace. These providers have their own privacy policies. We only share the minimum data necessary to enable requested features, and you can disconnect integrations from your account settings.
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
                    9. International Transfers
                  </Typography>
                  <Typography>
                    Your information may be processed in countries other than your own. We take appropriate measures to ensure transfers comply with applicable data protection laws, including executing Standard Contractual Clauses where required.
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="h5" component="h2" sx={{ fontWeight: 600, mb: 2 }}>
                    10. Changes to This Policy
                  </Typography>
                  <Typography>
                    We may update this policy to reflect changes to our practices or for legal reasons. We will notify you of material updates via email or in-app notices. Continuing to use TaskPilot after the changes take effect constitutes acceptance of the revised policy.
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
