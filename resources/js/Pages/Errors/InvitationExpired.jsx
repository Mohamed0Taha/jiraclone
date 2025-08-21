import React from 'react';
import { Box, Typography, Button, Container, Card, CardContent } from '@mui/material';
import { ErrorOutline, Home } from '@mui/icons-material';
import { Link } from '@inertiajs/react';

const InvitationExpired = () => {
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
                        Invitation Expired
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>
                        This invitation link has expired. Please ask the project owner to send you a
                        new invitation.
                    </Typography>
                    <Button
                        component={Link}
                        href="/"
                        variant="contained"
                        startIcon={<Home />}
                        size="large"
                    >
                        Go to Homepage
                    </Button>
                </CardContent>
            </Card>
        </Container>
    );
};

export default InvitationExpired;
