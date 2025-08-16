// resources/js/Pages/Auth/VerifyEmail.jsx
import * as React from 'react';
import { Head, router } from '@inertiajs/react';
import { route } from 'ziggy-js';

import { Container, Paper, Box, Typography, Button, Alert, Stack } from '@mui/material';

export default function VerifyEmail({ status }) {
  return (
    <>
      <Head title="Verify your email" />
      <Container maxWidth="sm" sx={{ py: 6 }}>
        <Paper elevation={4} sx={{ p: 4, borderRadius: 3 }}>
          <Box display="flex" alignItems="center" gap={1.5} mb={2}>
            <img src="/images/logo-email.png" alt="Logo" width={28} height={28} style={{ borderRadius: 6 }} />
            <Typography variant="subtitle2" fontWeight={800} color="primary">
              {import.meta.env.VITE_APP_NAME || 'App'}
            </Typography>
          </Box>

          <Typography variant="h5" fontWeight={800} gutterBottom color="primary">
            Check your email
          </Typography>
          <Typography color="text.secondary" mb={2}>
            We’ve sent a verification link to your inbox.
          </Typography>

          {status === 'verification-link-sent' && (
            <Alert severity="success" sx={{ mb: 2 }}>
              A new verification link has been sent.
            </Alert>
          )}

          <Stack direction="row" spacing={1.5} mt={1}>
            <Button variant="contained" onClick={() => router.post(route('verification.send'))}>
              Resend link
            </Button>
            <Button variant="outlined" onClick={() => router.visit(route('dashboard'))}>
              Go to dashboard
            </Button>
            <Button color="inherit" onClick={() => router.post(route('logout'))}>
              Log out
            </Button>
          </Stack>
        </Paper>
      </Container>
    </>
  );
}
