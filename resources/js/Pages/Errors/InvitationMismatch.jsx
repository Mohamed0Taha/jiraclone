import React from 'react';
import { Box, Typography, Button, Container, Card, CardContent, Alert } from '@mui/material';
import { Warning, Home } from '@mui/icons-material';
import { Link } from '@inertiajs/react';

const InvitationMismatch = ({ invitationEmail, userEmail }) => {
    return (
        <Container maxWidth="sm" sx={{ py: 8 }}>
            <Card elevation={3}>
                <CardContent sx={{ textAlign: 'center', py: 6 }}>
                    <Warning 
                        sx={{ 
                            fontSize: 80, 
                            color: 'warning.main', 
                            mb: 2 
                        }} 
                    />
                    <Typography variant="h4" gutterBottom color="warning.main">
                        Email Mismatch
                    </Typography>
                    <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
                        This invitation was sent to {invitationEmail}, but you're logged in as {userEmail}.
                    </Typography>
                    
                    <Alert severity="info" sx={{ mb: 4, textAlign: 'left' }}>
                        To accept this invitation, please:
                        <br />• Log out and log in with {invitationEmail}
                        <br />• Or ask the project owner to send an invitation to {userEmail}
                    </Alert>

                    <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                        <Button
                            component={Link}
                            href="/logout"
                            variant="outlined"
                            size="large"
                        >
                            Logout
                        </Button>
                        <Button
                            component={Link}
                            href="/"
                            variant="contained"
                            startIcon={<Home />}
                            size="large"
                        >
                            Go to Homepage
                        </Button>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
};

export default InvitationMismatch;
