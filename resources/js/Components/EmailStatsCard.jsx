import React, { useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Avatar,
    Chip,
    List,
    ListItem,
    ListItemText,
    ListItemAvatar,
    CircularProgress,
    Alert,
    useTheme,
    alpha,
} from '@mui/material';
import {
    Email as EmailIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    Send as SendIcon,
    TrendingUp as TrendingUpIcon,
} from '@mui/icons-material';

const EmailStatsCard = () => {
    const theme = useTheme();
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        fetchEmailStats();
    }, []);

    const fetchEmailStats = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetch('/api/email-stats', {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            if (data.success) {
                setStats(data.stats);
            } else {
                setError(data.message || 'Failed to load email statistics');
            }
        } catch (err) {
            setError('Failed to fetch email statistics');
            console.error('Email stats error:', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <Card
                sx={{
                    height: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <CircularProgress />
            </Card>
        );
    }

    if (error) {
        return (
            <Card sx={{ height: '100%' }}>
                <CardContent>
                    <Alert severity="error">{error}</Alert>
                </CardContent>
            </Card>
        );
    }

    if (!stats) {
        return null;
    }

    const getTypeColor = (type) => {
        const colors = {
            Welcome: theme.palette.success.main,
            Verification: theme.palette.primary.main,
            Contact: theme.palette.info.main,
            Invitation: theme.palette.secondary.main,
            Automation: theme.palette.warning.main,
            Password_reset: theme.palette.error.main,
            Failed: theme.palette.error.main,
        };
        return colors[type] || theme.palette.grey[500];
    };

    const formatTimeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));

        if (diffInMinutes < 60) {
            return `${diffInMinutes}m ago`;
        } else if (diffInMinutes < 1440) {
            return `${Math.floor(diffInMinutes / 60)}h ago`;
        } else {
            return `${Math.floor(diffInMinutes / 1440)}d ago`;
        }
    };

    return (
        <Card
            sx={{
                height: '100%',
                background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.05)} 0%, ${alpha(theme.palette.secondary.main, 0.05)} 100%)`,
                border: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
            }}
        >
            <CardContent>
                <Box display="flex" alignItems="center" mb={2}>
                    <Avatar
                        sx={{
                            bgcolor: theme.palette.primary.main,
                            width: 40,
                            height: 40,
                            mr: 2,
                        }}
                    >
                        <EmailIcon />
                    </Avatar>
                    <Box>
                        <Typography variant="h6" component="h3" fontWeight={600}>
                            Email Activity
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            System email statistics
                        </Typography>
                    </Box>
                </Box>

                {/* Stats Grid */}
                <Grid container spacing={2} mb={3}>
                    <Grid size={{ xs: 6 }}>
                        <Box textAlign="center">
                            <Typography variant="h4" color="primary" fontWeight={700}>
                                {stats.total_emails}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Total Sent
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                        <Box textAlign="center">
                            <Typography variant="h4" color="success.main" fontWeight={700}>
                                {stats.success_rate}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Success Rate
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                        <Box textAlign="center">
                            <Typography variant="h4" color="success.main" fontWeight={700}>
                                {stats.successful_emails}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Successful
                            </Typography>
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 6 }}>
                        <Box textAlign="center">
                            <Typography variant="h4" color="error.main" fontWeight={700}>
                                {stats.failed_emails}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Failed
                            </Typography>
                        </Box>
                    </Grid>
                </Grid>

                {/* Email Types */}
                {Object.keys(stats.email_types).length > 0 && (
                    <Box mb={2}>
                        <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                            Email Types
                        </Typography>
                        <Box display="flex" flexWrap="wrap" gap={1}>
                            {Object.entries(stats.email_types).map(([type, count]) => (
                                <Chip
                                    key={type}
                                    size="small"
                                    label={`${type}: ${count}`}
                                    sx={{
                                        bgcolor: alpha(getTypeColor(type), 0.1),
                                        color: getTypeColor(type),
                                        fontWeight: 500,
                                    }}
                                />
                            ))}
                        </Box>
                    </Box>
                )}

                {/* Recent Emails */}
                {stats.recent_emails && stats.recent_emails.length > 0 && (
                    <Box>
                        <Typography variant="subtitle2" gutterBottom fontWeight={600}>
                            Recent Activity (24h)
                        </Typography>
                        <List dense sx={{ maxHeight: 200, overflow: 'auto' }}>
                            {stats.recent_emails.slice(0, 3).map((email) => (
                                <ListItem
                                    key={email.id}
                                    sx={{
                                        px: 0,
                                        py: 0.5,
                                        borderBottom: `1px solid ${alpha(theme.palette.divider, 0.1)}`,
                                    }}
                                >
                                    <ListItemAvatar>
                                        <Avatar
                                            sx={{
                                                width: 24,
                                                height: 24,
                                                bgcolor: email.sent_successfully
                                                    ? theme.palette.success.main
                                                    : theme.palette.error.main,
                                            }}
                                        >
                                            {email.sent_successfully ? (
                                                <CheckCircleIcon sx={{ fontSize: 14 }} />
                                            ) : (
                                                <ErrorIcon sx={{ fontSize: 14 }} />
                                            )}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <ListItemText
                                        primary={
                                            <Typography variant="body2" noWrap>
                                                {email.subject}
                                            </Typography>
                                        }
                                        secondary={
                                            <Box
                                                display="flex"
                                                justifyContent="space-between"
                                                alignItems="center"
                                            >
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    {email.to_email.split('@')[0]}...
                                                </Typography>
                                                <Typography
                                                    variant="caption"
                                                    color="text.secondary"
                                                >
                                                    {formatTimeAgo(email.created_at)}
                                                </Typography>
                                            </Box>
                                        }
                                    />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};

export default EmailStatsCard;
