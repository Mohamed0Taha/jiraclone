import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { useTranslation } from 'react-i18next';
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
import { Send as SendIcon, Support as SupportIcon, Email as EmailIcon } from '@mui/icons-material';

export default function ContactUs({ auth, flash }) {
    const { t } = useTranslation();
    const theme = useTheme();

    const contactTopics = [
        { value: 'billing', label: t('contactUs.topics.billing') },
        { value: 'bug', label: t('contactUs.topics.bug') },
        { value: 'feature', label: t('contactUs.topics.feature') },
        { value: 'technical', label: t('contactUs.topics.technical') },
        { value: 'account', label: t('contactUs.topics.account') },
        { value: 'general', label: t('contactUs.topics.general') },
        { value: 'feedback', label: t('contactUs.topics.feedback') },
        { value: 'other', label: t('contactUs.topics.other') },
    ];
    const [formData, setFormData] = useState({
        topic: '',
        message: '',
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [showForm, setShowForm] = useState(true);
    const [submitResult, setSubmitResult] = useState(null); // 'success' or 'error'

    const handleChange = (field) => (event) => {
        setFormData((prev) => ({
            ...prev,
            [field]: event.target.value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.topic || !formData.message.trim() || formData.message.trim().length < 10) {
            return;
        }

        setIsSubmitting(true);

        try {
            router.post(route('contact.send'), formData, {
                onSuccess: (page) => {
                    setFormData({ topic: '', message: '' });
                    setShowForm(false);
                    setSubmitResult('success');
                },
                onError: (errors) => {
                    setShowForm(false);
                    setSubmitResult('error');
                },
                onFinish: () => {
                    setIsSubmitting(false);
                },
            });
        } catch (error) {
            setIsSubmitting(false);
            setShowForm(false);
            setSubmitResult('error');
        }
    };

    const handleSendAnother = () => {
        setShowForm(true);
        setSubmitResult(null);
        setFormData({ topic: '', message: '' });
    };

    const handleTryAgain = () => {
        setShowForm(true);
        setSubmitResult(null);
    };

    const isFormValid =
        formData.topic && formData.message.trim() && formData.message.trim().length >= 10;

    return (
        <>
            <Head title={t('contactUs.title')} />
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
                                    {t('contactUs.title')}
                                </Typography>
                            </Stack>
                            <Typography
                                variant="body1"
                                sx={{
                                    color: alpha(theme.palette.text.primary, 0.78),
                                    maxWidth: 600,
                                }}
                            >
                                {t('contactUs.description')}
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
                                background: theme.palette.mode === 'dark'
                                    ? 'rgba(15,23,42,0.9)'
                                    : 'rgba(255,255,255,0.8)',
                            }}
                        >
                            {showForm ? (
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
                                            <Stack
                                                direction="row"
                                                alignItems="center"
                                                spacing={1}
                                                mb={1}
                                            >
                                                <EmailIcon fontSize="small" color="primary" />
                                                <Typography variant="subtitle2" fontWeight={700}>
                                                    {t('contactUs.yourDetails')}
                                                </Typography>
                                            </Stack>
                                            <Typography variant="body2" color="text.secondary">
                                                <strong>{t('contactUs.name')}:</strong> {auth.user.name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                <strong>{t('contactUs.email')}:</strong> {auth.user.email}
                                            </Typography>
                                        </Box>

                                        {/* Topic Selection */}
                                        <FormControl fullWidth>
                                            <InputLabel>{t('contactUs.topic')} *</InputLabel>
                                            <Select
                                                value={formData.topic}
                                                label={`${t('contactUs.topic')} *`}
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
                                            label={`${t('contactUs.message')} *`}
                                            multiline
                                            rows={6}
                                            value={formData.message}
                                            onChange={handleChange('message')}
                                            placeholder={t('contactUs.messagePlaceholder')}
                                            required
                                            fullWidth
                                            helperText={
                                                formData.message.trim().length > 0 &&
                                                    formData.message.trim().length < 10
                                                    ? `${10 - formData.message.trim().length} ${t('contactUs.moreCharactersNeeded')}`
                                                    : formData.message.trim().length >= 10
                                                        ? `${formData.message.trim().length} ${t('contactUs.characters')}`
                                                        : t('contactUs.minimumCharacters')
                                            }
                                            error={
                                                formData.message.trim().length > 0 &&
                                                formData.message.trim().length < 10
                                            }
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
                                                background:
                                                    'linear-gradient(135deg, #6366F1, #4F46E5)',
                                                boxShadow: '0 8px 20px -8px rgba(79,70,229,.55)',
                                                '&:hover': {
                                                    background:
                                                        'linear-gradient(135deg, #595CEB, #4841D6)',
                                                },
                                                '&:disabled': {
                                                    background: alpha(
                                                        theme.palette.action.disabled,
                                                        0.12
                                                    ),
                                                    color: theme.palette.action.disabled,
                                                },
                                            }}
                                        >
                                            {isSubmitting ? t('contactUs.sending') : t('contactUs.sendMessage')}
                                        </Button>

                                        <Typography
                                            variant="caption"
                                            color="text.secondary"
                                            textAlign="center"
                                        >
                                            {t('contactUs.responseTime')}
                                        </Typography>
                                    </Stack>
                                </form>
                            ) : (
                                <Stack spacing={3} textAlign="center" py={4}>
                                    {submitResult === 'success' ? (
                                        <>
                                            <Box>
                                                <Box
                                                    sx={{
                                                        width: 80,
                                                        height: 80,
                                                        borderRadius: '50%',
                                                        background:
                                                            'linear-gradient(135deg, #10B981, #059669)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        mx: 'auto',
                                                        mb: 2,
                                                        boxShadow:
                                                            '0 10px 25px rgba(16, 185, 129, 0.3)',
                                                    }}
                                                >
                                                    <SendIcon
                                                        sx={{ color: 'white', fontSize: 36 }}
                                                    />
                                                </Box>
                                                <Typography
                                                    variant="h5"
                                                    fontWeight={700}
                                                    color="success.main"
                                                    gutterBottom
                                                >
                                                    {t('contactUs.success.title')}
                                                </Typography>
                                                <Typography
                                                    variant="body1"
                                                    color="text.secondary"
                                                    mb={3}
                                                >
                                                    {t('contactUs.success.message')}
                                                </Typography>
                                            </Box>
                                            <Button
                                                variant="contained"
                                                onClick={handleSendAnother}
                                                sx={{
                                                    textTransform: 'none',
                                                    fontWeight: 700,
                                                    background:
                                                        'linear-gradient(135deg, #6366F1, #4F46E5)',
                                                }}
                                            >
                                                {t('contactUs.sendAnother')}
                                            </Button>
                                        </>
                                    ) : (
                                        <>
                                            <Box>
                                                <Box
                                                    sx={{
                                                        width: 80,
                                                        height: 80,
                                                        borderRadius: '50%',
                                                        background:
                                                            'linear-gradient(135deg, #EF4444, #DC2626)',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center',
                                                        mx: 'auto',
                                                        mb: 2,
                                                        boxShadow:
                                                            '0 10px 25px rgba(239, 68, 68, 0.3)',
                                                    }}
                                                >
                                                    <Typography
                                                        sx={{ color: 'white', fontSize: 36 }}
                                                    >
                                                        ⚠️
                                                    </Typography>
                                                </Box>
                                                <Typography
                                                    variant="h5"
                                                    fontWeight={700}
                                                    color="error.main"
                                                    gutterBottom
                                                >
                                                    {t('contactUs.error.title')}
                                                </Typography>
                                                <Typography
                                                    variant="body1"
                                                    color="text.secondary"
                                                    mb={3}
                                                >
                                                    {t('contactUs.error.message')}
                                                </Typography>
                                            </Box>
                                            <Button
                                                variant="contained"
                                                onClick={handleTryAgain}
                                                sx={{
                                                    textTransform: 'none',
                                                    fontWeight: 700,
                                                    background:
                                                        'linear-gradient(135deg, #6366F1, #4F46E5)',
                                                }}
                                            >
                                                {t('contactUs.tryAgain')}
                                            </Button>
                                        </>
                                    )}
                                </Stack>
                            )}
                        </Card>
                    </Paper>
                </Box>
            </AuthenticatedLayout>
        </>
    );
}
