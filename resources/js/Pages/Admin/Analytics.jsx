import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import {
    Box,
    Container,
    Typography,
    Card,
    CardContent,
    Grid,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    LinearProgress,
    CircularProgress,
} from '@mui/material';
import {
    BarChart,
    Bar,
    LineChart,
    Line,
    PieChart,
    Pie,
    Cell,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend,
} from 'recharts';
import {
    TrendingUp,
    People,
    Visibility,
    Schedule,
    DevicesOther,
    Public,
    Traffic,
    Analytics as AnalyticsIcon,
} from '@mui/icons-material';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Analytics({
    timeframe,
    stats,
    countries,
    cities,
    trafficSources,
    referrers,
    devices,
    browsers,
    hourlyData,
}) {
    const [selectedTimeframe, setSelectedTimeframe] = useState(timeframe);

    const handleTimeframeChange = (event) => {
        setSelectedTimeframe(event.target.value);
        // You can use Inertia to reload with new timeframe
        window.location.href = `/admin/analytics?timeframe=${event.target.value}`;
    };

    const StatCard = ({ title, value, subtitle, icon: Icon, color = 'primary' }) => (
        <Card sx={{ height: '100%' }}>
            <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Icon sx={{ color: `${color}.main`, mr: 1 }} />
                    <Typography variant="h6" component="h2">
                        {title}
                    </Typography>
                </Box>
                <Typography variant="h3" component="p" sx={{ mb: 1 }}>
                    {typeof value === 'number' ? value.toLocaleString() : value}
                </Typography>
                {subtitle && (
                    <Typography variant="body2" color="text.secondary">
                        {subtitle}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );

    const TopLocationsList = ({ title, data, showFlag = false }) => (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    {title}
                </Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Location</TableCell>
                                <TableCell align="right">Visits</TableCell>
                                <TableCell align="right">%</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data?.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                            {showFlag && item.country_code && (
                                                <img
                                                    src={`https://flagcdn.com/w20/${item.country_code.toLowerCase()}.png`}
                                                    alt={item.country_code}
                                                    style={{ marginRight: 8, width: 20 }}
                                                />
                                            )}
                                            {item.city ? `${item.city}, ${item.region}` : item.country}
                                        </Box>
                                    </TableCell>
                                    <TableCell align="right">{item.visits}</TableCell>
                                    <TableCell align="right">
                                        {Math.round((item.visits / stats.total_visits) * 100)}%
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );

    const TrafficSourcesList = ({ title, data, keyField, nameField = null }) => (
        <Card>
            <CardContent>
                <Typography variant="h6" gutterBottom>
                    {title}
                </Typography>
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Source</TableCell>
                                <TableCell align="right">Visits</TableCell>
                                <TableCell align="right">%</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data?.map((item, index) => (
                                <TableRow key={index}>
                                    <TableCell>
                                        <Typography variant="body2" noWrap>
                                            {nameField ? item[nameField] : item[keyField]}
                                        </Typography>
                                    </TableCell>
                                    <TableCell align="right">{item.visits}</TableCell>
                                    <TableCell align="right">
                                        {Math.round((item.visits / stats.total_visits) * 100)}%
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );

    // Format hourly data for chart
    const formatHourlyData = (data) => {
        return data?.map(item => ({
            hour: `${item.hour}:00`,
            visits: item.visits,
        })) || [];
    };

    // Format device data for pie chart
    const formatDeviceData = (data) => {
        return data?.map(item => ({
            name: item.device_type.charAt(0).toUpperCase() + item.device_type.slice(1),
            value: item.visits,
        })) || [];
    };

    return (
        <>
            <Head title="Analytics Dashboard - TaskPilot Admin" />
            
            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
                    <Typography variant="h4" component="h1">
                        📊 Analytics Dashboard
                    </Typography>
                    <FormControl sx={{ minWidth: 200 }}>
                        <InputLabel>Time Period</InputLabel>
                        <Select
                            value={selectedTimeframe}
                            label="Time Period"
                            onChange={handleTimeframeChange}
                        >
                            <MenuItem value="day">Today</MenuItem>
                            <MenuItem value="week">This Week</MenuItem>
                            <MenuItem value="month">This Month</MenuItem>
                            <MenuItem value="year">This Year</MenuItem>
                        </Select>
                    </FormControl>
                </Box>

                {/* Overview Stats */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Total Visits"
                            value={stats.total_visits}
                            subtitle="Page views"
                            icon={Visibility}
                            color="primary"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Unique Visitors"
                            value={stats.unique_visitors}
                            subtitle="Individual users"
                            icon={People}
                            color="secondary"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Landing Page Views"
                            value={stats.page_views}
                            subtitle="Homepage visits"
                            icon={TrendingUp}
                            color="success"
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <StatCard
                            title="Mobile Traffic"
                            value={`${Math.round(stats.mobile_percentage)}%`}
                            subtitle="Mobile visitors"
                            icon={DevicesOther}
                            color="warning"
                        />
                    </Grid>
                </Grid>

                {/* Additional Stats */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} sm={4}>
                        <StatCard
                            title="Bounce Rate"
                            value={`${stats.bounce_rate}%`}
                            subtitle="Single page visits"
                            icon={Schedule}
                            color="error"
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <StatCard
                            title="Avg. Time on Page"
                            value={stats.avg_time_on_page ? `${Math.round(stats.avg_time_on_page)}s` : 'N/A'}
                            subtitle="Time spent"
                            icon={AnalyticsIcon}
                            color="info"
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <StatCard
                            title="Total Countries"
                            value={countries?.length || 0}
                            subtitle="Geographic reach"
                            icon={Public}
                            color="success"
                        />
                    </Grid>
                </Grid>

                {/* Hourly Traffic Chart */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Traffic by Hour
                                </Typography>
                                <Box sx={{ height: 300 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={formatHourlyData(hourlyData)}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="hour" />
                                            <YAxis />
                                            <Tooltip />
                                            <Bar dataKey="visits" fill="#8884d8" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {/* Device Types Pie Chart */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Device Types
                                </Typography>
                                <Box sx={{ height: 300 }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={formatDeviceData(devices)}
                                                cx="50%"
                                                cy="50%"
                                                labelLine={false}
                                                label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                                                outerRadius={80}
                                                fill="#8884d8"
                                                dataKey="value"
                                            >
                                                {formatDeviceData(devices).map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                    
                    {/* Browser Distribution */}
                    <Grid item xs={12} md={6}>
                        <TrafficSourcesList
                            title="Top Browsers"
                            data={browsers}
                            keyField="browser"
                        />
                    </Grid>
                </Grid>

                {/* Geographic Data */}
                <Grid container spacing={3} sx={{ mb: 4 }}>
                    <Grid item xs={12} md={6}>
                        <TopLocationsList
                            title="Top Countries"
                            data={countries}
                            showFlag={true}
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TopLocationsList
                            title="Top Cities"
                            data={cities}
                        />
                    </Grid>
                </Grid>

                {/* Traffic Sources */}
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <TrafficSourcesList
                            title="UTM Sources"
                            data={trafficSources}
                            keyField="utm_source"
                        />
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <TrafficSourcesList
                            title="Top Referrers"
                            data={referrers}
                            keyField="referrer_url"
                        />
                    </Grid>
                </Grid>
            </Container>
        </>
    );
}
