import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    Box,
    Button,
    Card,
    FormControl,
    InputLabel,
    MenuItem,
    Paper,
    Select,
    Stack,
    TextField,
    Typography,
    useTheme,
    alpha,
    Alert,
} from '@mui/material';
import {
    Send as SendIcon,
    Support as SupportIcon,
    Email as EmailIcon,
} from '@mui/icons-material';

const contactTopics = [
    { value: 'billing', label: 'Billing Issue' },
    { value: 'bug', label: 'Bug Report' },
    { value: 'feature', label: 'Feature Request' },
    { value: 'technical', label: 'Technical Support' },
    { value: 'account', label: 'Account Issue' },
    { value: 'general', label: 'General Inquiry' },
    { value: 'feedback', label: 'Feedback' },
    { value: 'other', label: 'Other' },
];

export default function ContactUs({ auth, flash }) {
    const theme = useTheme();
    const [formData, setFormData] = useState({
        topic: '',
        message: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (field) => (event) => {
        setFormData(prev => ({
            ...prev,
            [field]: event.target.value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.topic || !formData.message.trim()) {
            return;
        }

        setIsSubmitting(true);

        try {
            router.post(route('contact.send'), formData, {
                onSuccess: () => {
                    setFormData({ topic: '', message: '' });
                },
                onFinish: () => {
                    setIsSubmitting(false);
                }
            });
        } catch (error) {
            setIsSubmitting(false);
        }
    };

    const isFormValid = formData.topic && formData.message.trim();

    return (
        <>
            <Head title="Contact Us" />
            <AuthenticatedLayout user={auth?.user}>
                <Box
                    sx={{
                        minHeight: '100vh',
                        p: { xs: 2, md: 4 },
                        background:
                            theme.palette.mode === 'light'
                                ? 'linear-gradient(140deg,#F6F9FC 0%,#EEF3F9 55%,#E5ECF5 100%)'
                                : 'linear-gradient(140deg,#0F1823,#101B27)',
                    }}
                >
                    <Paper
                        elevation={0}
                        sx={{
                            maxWidth: 800,
                            mx: 'auto',
                            p: { xs: 3, md: 4 },
                            borderRadius: 4,
                            background:
                                'linear-gradient(145deg,rgba(255,255,255,0.92),rgba(255,255,255,0.62))',
                            backdropFilter: 'blur(16px)',
                            border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
                            boxShadow:
                                '0 10px 34px -12px rgba(30,50,90,.25), 0 2px 4px rgba(0,0,0,.05)',
                            position: 'relative',
                            overflow: 'hidden',
                        }}
                    >
                        {/* Decorative glow */}
                        <Box
                            aria-hidden
                            sx={{
                                position: 'absolute',
                                width: 320,
                                height: 320,
                                top: -130,
                                right: -110,
                                background:
                                    'radial-gradient(circle at 60% 40%, rgba(255,255,255,0.7), transparent 70%)',
                                pointerEvents: 'none',
                            }}
                        />

                        {/* Header */}
                        <Stack spacing={2} mb={4}>
                            <Stack direction="row" alignItems="center" spacing={2}>
                                <SupportIcon 
                                    sx={{ 
                                        fontSize: 32, 
                                        color: 'primary.main',
                                    }} 
                                />
                                <Typography
                                    variant="h4"
                                    fontWeight={900}
                                    sx={{
                                        letterSpacing: '-0.5px',
                                        background:
                                            'linear-gradient(90deg,#101E40,#2F4370 55%,#456092 90%)',
                                        WebkitBackgroundClip: 'text',
                                        color: 'transparent',
                                    }}
                                >
                                    Contact Us
                                </Typography>
                            </Stack>
                            <Typography
                                variant="body1"
                                sx={{
                                    color: alpha(theme.palette.text.primary, 0.78),
                                    maxWidth: 600,
                                }}
                            >
                                Need help or have questions? We're here to assist you. Send us a message 
                                and we'll get back to you as soon as possible.
                            </Typography>
                        </Stack>

                        {/* Flash Messages */}
                        {flash?.success && (
                            <Alert severity="success" sx={{ mb: 3 }}>
                                {flash.success}
                            </Alert>
                        )}
                        {flash?.error && (
                            <Alert severity="error" sx={{ mb: 3 }}>
                                {flash.error}
                            </Alert>
                        )}

                        {/* Contact Form */}
                        <Card
                            elevation={0}
                            sx={{
                                p: 3,
                                borderRadius: 3,
                                border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                                background: 'rgba(255,255,255,0.8)',
                            }}
                        >
                            <form onSubmit={handleSubmit}>
                                <Stack spacing={3}>
                                    {/* User Info Display */}
                                    <Box
                                        sx={{
                                            p: 2,
                                            borderRadius: 2,
                                            background: alpha(theme.palette.primary.main, 0.04),
                                            border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                                        }}
                                    >
                                        <Stack direction="row" alignItems="center" spacing={1} mb={1}>
                                            <EmailIcon fontSize="small" color="primary" />
                                            <Typography variant="subtitle2" fontWeight={700}>
                                                Your Details
                                            </Typography>
                                        </Stack>
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>Name:</strong> {auth.user.name}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            <strong>Email:</strong> {auth.user.email}
                                        </Typography>
                                    </Box>

                                    {/* Topic Selection */}
                                    <FormControl fullWidth>
                                        <InputLabel>Topic *</InputLabel>
                                        <Select
                                            value={formData.topic}
                                            label="Topic *"
                                            onChange={handleChange('topic')}
                                            required
                                        >
                                            {contactTopics.map((topic) => (
                                                <MenuItem key={topic.value} value={topic.value}>
                                                    {topic.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>

                                    {/* Message */}
                                    <TextField
                                        label="Message *"
                                        multiline
                                        rows={6}
                                        value={formData.message}
                                        onChange={handleChange('message')}
                                        placeholder="Please describe your issue or question in detail..."
                                        required
                                        fullWidth
                                    />

                                    {/* Submit Button */}
                                    <Button
                                        type="submit"
                                        variant="contained"
                                        size="large"
                                        disabled={!isFormValid || isSubmitting}
                                        startIcon={<SendIcon />}
                                        sx={{
                                            textTransform: 'none',
                                            fontWeight: 700,
                                            py: 1.5,
                                            background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                                            boxShadow: '0 8px 20px -8px rgba(79,70,229,.55)',
                                            '&:hover': {
                                                background: 'linear-gradient(135deg, #595CEB, #4841D6)',
                                            },
                                            '&:disabled': {
                                                background: alpha(theme.palette.action.disabled, 0.12),
                                                color: theme.palette.action.disabled,
                                            },
                                        }}
                                    >
                                        {isSubmitting ? 'Sending...' : 'Send Message'}
                                    </Button>

                                    <Typography variant="caption" color="text.secondary" textAlign="center">
                                        We typically respond within 24 hours during business days.
                                    </Typography>
                                </Stack>
                            </form>
                        </Card>
                    </Paper>
                </Box>
            </AuthenticatedLayout>
        </>
    );
}
