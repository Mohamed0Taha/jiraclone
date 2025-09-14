import React from 'react';
import { Box, Typography, Button, Container, Card, CardContent, Alert } from '@mui/material';
import { Warning, Home } from '@mui/icons-material';
import { Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

const InvitationMismatch = ({ invitationEmail, userEmail }) => {
    const { t } = useTranslation();

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Card elevation={3}>
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                    <Warning
                        sx={{
                            fontSize: 80,
                            color: 'warning.main',
                            mb: 2,
                        }}
                    />
                    <Typography variant="h4" gutterBottom color="warning.main">
                        {t('errors.emailMismatch')}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                        {t('errors.emailMismatchMessage', {
                            invitationEmail,
                            userEmail
                        })}
                    </Typography>

                    <Alert severity="info" sx={{ mb: 4, textAlign: 'left' }}>
                        {t('errors.invitationInstructions', {
                            invitationEmail,
                            userEmail
                        })}
                    </Alert>

                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                        <Button component={Link} href="/logout" variant="outlined" size="large">
                            {t('auth.logout')}
                        </Button>
                        <Button
                            component={Link}
                            href="/"
                            variant="contained"
                            startIcon={<Home />}
                            size="large"
                        >
                            {t('common.goToHomepage')}
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
};

export default InvitationMismatch;
