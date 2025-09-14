import React from 'react';
import { Box, Typography, Button, Container, Card, CardContent } from '@mui/material';
import { ErrorOutline, Home } from '@mui/icons-material';
import { Link } from '@inertiajs/react';
import { useTranslation } from 'react-i18next';

const InvitationExpired = () => {
    const { t } = useTranslation();

    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Card elevation={3}>
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                    <ErrorOutline
                        sx={{
                            fontSize: 80,
                            color: 'warning.main',
                            mb: 2,
                        }}
                    />
                    <Typography variant="h4" gutterBottom color="error">
                        {t('errors.invitationExpired')}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                        {t('errors.invitationExpiredMessage')}
                    </Typography>
                    <Button
                        component={Link}
                        href="/"
                        variant="contained"
                        startIcon={<Home />}
                        size="large"
                    >
                        {t('common.goToHomepage')}
                    </Button>
                </CardContent>
            </Card>
        </Container>
    );
};

export default InvitationExpired;
