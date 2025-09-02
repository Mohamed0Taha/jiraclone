import React from 'react';
import { Head } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Box,
    Container,
    Typography,
    Grid,
    Card,
    CardContent,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
} from '@mui/material';
import {
    People,
    Visibility,
    TrendingUp,
} from '@mui/icons-material';

export default function Analytics({ visitors = [], stats = {} }) {
    const dashboardTiles = [
        {
            title: 'Total Visitors',
            value: stats.total_visitors || 0,
            icon: <People sx={{ fontSize: 48, color: '#4ECDC4' }} />,
            color: '#4ECDC4',
        },
        {
            title: 'Unique Visitors',
            value: stats.unique_visitors || 0,
            icon: <Visibility sx={{ fontSize: 48, color: '#45B7D1' }} />,
            color: '#45B7D1',
        },
        {
            title: 'Page Views',
            value: stats.page_views || 0,
            icon: <TrendingUp sx={{ fontSize: 48, color: '#96CEB4' }} />,
            color: '#96CEB4',
        },
    ];

    return (
        <AuthenticatedLayout
            header={
                <h2 className="font-semibold text-xl text-gray-800 leading-tight">
                    Analytics Dashboard
                </h2>
            }
        >
            <Head title="Analytics - TaskPilot Admin" />
            
            <Box sx={{ bgcolor: '#f5f5f5', minHeight: '100vh', py: 4 }}>
                <Container maxWidth="lg">
                    <Typography
                        variant="h4"
                        sx={{ mb: 4, fontWeight: 700, color: '#1a1a1a' }}
                    >
                        Analytics Dashboard
                    </Typography>

                    {/* Dashboard Tiles */}
                    <Grid container spacing={3} sx={{ mb: 6 }}>
                        {dashboardTiles.map((tile, index) => (
                            <Grid item xs={12} md={4} key={index}>
                                <Card
                                    sx={{
                                        p: 3,
                                        borderRadius: 3,
                                        background: `linear-gradient(135deg, ${tile.color}15 0%, ${tile.color}08 100%)`,
                                        border: `1px solid ${tile.color}30`,
                                        transition: 'all 0.3s ease',
                                        '&:hover': {
                                            transform: 'translateY(-4px)',
                                            boxShadow: `0 8px 25px ${tile.color}20`,
                                        },
                                    }}
                                >
                                    <CardContent sx={{ p: 0 }}>
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                            }}
                                        >
                                            <Box>
                                                <Typography
                                                    variant="h3"
                                                    sx={{
                                                        fontWeight: 700,
                                                        color: '#1a1a1a',
                                                        mb: 1,
                                                    }}
                                                >
                                                    {tile.value.toLocaleString()}
                                                </Typography>
                                                <Typography
                                                    variant="body1"
                                                    sx={{ color: 'grey.700', fontWeight: 500 }}
                                                >
                                                    {tile.title}
                                                </Typography>
                                            </Box>
                                            <Box
                                                sx={{
                                                    p: 2,
                                                    borderRadius: '50%',
                                                    background: `linear-gradient(135deg, ${tile.color}20 0%, ${tile.color}10 100%)`,
                                                }}
                                            >
                                                {tile.icon}
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Unique Visitors Table */}
                    <Card sx={{ borderRadius: 3, overflow: 'hidden' }}>
                        <Box
                            sx={{
                                p: 3,
                                bgcolor: 'white',
                                borderBottom: '1px solid',
                                borderColor: 'grey.200',
                            }}
                        >
                            <Typography
                                variant="h5"
                                sx={{ fontWeight: 600, color: '#1a1a1a' }}
                            >
                                Unique Visitors by Location
                            </Typography>
                            <Typography variant="body2" sx={{ color: 'grey.600', mt: 1 }}>
                                Recent visitor IP addresses and their locations
                            </Typography>
                        </Box>
                        
                        <TableContainer>
                            <Table>
                                <TableHead>
                                    <TableRow sx={{ bgcolor: '#f8f9fa' }}>
                                        <TableCell sx={{ fontWeight: 600 }}>IP Address</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Location</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Country</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Last Visit</TableCell>
                                        <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {visitors.length > 0 ? (
                                        visitors.map((visitor, index) => (
                                            <TableRow
                                                key={index}
                                                sx={{
                                                    '&:hover': { bgcolor: '#f8f9fa' },
                                                    '&:nth-of-type(odd)': { bgcolor: '#fbfbfb' },
                                                }}
                                            >
                                                <TableCell>
                                                    <Typography
                                                        variant="body2"
                                                        sx={{ fontFamily: 'monospace', fontWeight: 500 }}
                                                    >
                                                        {visitor.ip}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2">
                                                        {visitor.city}, {visitor.region}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <span>{visitor.country_flag}</span>
                                                        <Typography variant="body2">
                                                            {visitor.country}
                                                        </Typography>
                                                    </Box>
                                                </TableCell>
                                                <TableCell>
                                                    <Typography variant="body2" sx={{ color: 'grey.600' }}>
                                                        {new Date(visitor.last_visit).toLocaleDateString()}
                                                    </Typography>
                                                </TableCell>
                                                <TableCell>
                                                    <Chip
                                                        size="small"
                                                        label={visitor.is_unique ? 'New' : 'Return'}
                                                        color={visitor.is_unique ? 'success' : 'default'}
                                                        variant="outlined"
                                                    />
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={5} align="center">
                                                <Typography
                                                    variant="body2"
                                                    sx={{ color: 'grey.500', py: 4 }}
                                                >
                                                    No visitor data available yet
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Card>
                </Container>
            </Box>
        </AuthenticatedLayout>
    );
}
