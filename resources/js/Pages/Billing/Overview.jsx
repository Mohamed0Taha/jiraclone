// resources/js/Pages/Billing/Overview.jsx
import React, { useState } from 'react';
import { Head, router, usePage } from '@inertiajs/react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import {
    alpha,
    Box,
    Button,
    Chip,
    Dialog,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    FormControlLabel,
    Grid,
    IconButton,
    Paper,
    Radio,
    RadioGroup,
    Stack,
    Typography,
    useTheme,
} from '@mui/material';
import CheckCircleRoundedIcon from '@mui/icons-material/CheckCircleRounded';
import CancelScheduleSendRoundedIcon from '@mui/icons-material/CancelScheduleSendRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import WorkspacePremiumRoundedIcon from '@mui/icons-material/WorkspacePremiumRounded';
import TrendingUpRoundedIcon from '@mui/icons-material/TrendingUpRounded';
import CloseIcon from '@mui/icons-material/Close';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';

/**
 * NOTE:
 * This file is self-contained and intentionally does NOT import Task/Board-related components.
 * It fixes the Vite error by removing incorrect imports and only rendering billing UI.
 */

// Cancellation reasons
const CANCELLATION_REASONS = [
    { value: 'too_expensive', label: 'Too expensive' },
    { value: 'not_using_enough', label: 'Not using it enough' },
    { value: 'missing_features', label: 'Missing features I need' },
    { value: 'technical_issues', label: 'Technical issues' },
    { value: 'switching_service', label: 'Switching to another service' },
    { value: 'temporary_pause', label: 'Taking a temporary break' },
    { value: 'other', label: 'Other reason' },
];

// Cancellation confirmation dialog
function CancellationDialog({ open, onClose, onConfirm, planName }) {
    const [step, setStep] = useState(1); // 1: confirmation, 2: reason selection
    const [selectedReason, setSelectedReason] = useState('');
    const theme = useTheme();

    const handleClose = () => {
        setStep(1);
        setSelectedReason('');
        onClose();
    };

    const handleConfirmStep1 = () => {
        setStep(2);
    };

    const handleFinalCancel = () => {
        onConfirm(selectedReason);
        handleClose();
    };

    return (
        <Dialog
            open={open}
            onClose={handleClose}
            maxWidth="sm"
            fullWidth
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    background:
                        'linear-gradient(145deg, rgba(255,255,255,0.95), rgba(255,255,255,0.85))',
                    backdropFilter: 'blur(10px)',
                },
            }}
        >
            <DialogTitle
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    pb: 1,
                }}
            >
                <Stack direction="row" alignItems="center" spacing={1}>
                    <WarningAmberIcon color="warning" />
                    <Typography variant="h6" fontWeight={700}>
                        {step === 1 ? 'Cancel Subscription?' : 'Why are you canceling?'}
                    </Typography>
                </Stack>
                <IconButton onClick={handleClose} size="small">
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent sx={{ pb: 3 }}>
                {step === 1 && (
                    <Stack spacing={3}>
                        <Typography
                            variant="body1"
                            sx={{ color: alpha(theme.palette.text.primary, 0.8) }}
                        >
                            Are you sure you want to cancel your <strong>{planName}</strong>{' '}
                            subscription? You'll lose access to premium features at the end of your
                            current billing period.
                        </Typography>

                        <Stack direction="row" spacing={2} justifyContent="flex-end">
                            <Button
                                variant="outlined"
                                onClick={handleClose}
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                Keep Subscription
                            </Button>
                            <Button
                                variant="contained"
                                color="warning"
                                onClick={handleConfirmStep1}
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                Yes, Continue
                            </Button>
                        </Stack>
                    </Stack>
                )}

                {step === 2 && (
                    <Stack spacing={3}>
                        <Typography
                            variant="body1"
                            sx={{ color: alpha(theme.palette.text.primary, 0.8) }}
                        >
                            Help us improve by letting us know why you're canceling:
                        </Typography>

                        <FormControl component="fieldset">
                            <RadioGroup
                                value={selectedReason}
                                onChange={(e) => setSelectedReason(e.target.value)}
                            >
                                {CANCELLATION_REASONS.map((reason) => (
                                    <FormControlLabel
                                        key={reason.value}
                                        value={reason.value}
                                        control={<Radio />}
                                        label={reason.label}
                                        sx={{ mb: 0.5 }}
                                    />
                                ))}
                            </RadioGroup>
                        </FormControl>

                        <Stack direction="row" spacing={2} justifyContent="flex-end">
                            <Button
                                variant="outlined"
                                onClick={() => setStep(1)}
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                Back
                            </Button>
                            <Button
                                variant="contained"
                                color="error"
                                onClick={handleFinalCancel}
                                disabled={!selectedReason}
                                sx={{ textTransform: 'none', fontWeight: 600 }}
                            >
                                Cancel Subscription
                            </Button>
                        </Stack>
                    </Stack>
                )}
            </DialogContent>
        </Dialog>
    );
}

function PlanCard({
    plan,
    isCurrent,
    subscribed,
    onTrial,
    onGrace,
    onSubscribe,
    onCancel,
    onResume,
    hasUsedTrial,
}) {
    const theme = useTheme();
    const isBusiness = /business/i.test(plan.name); // highlights the business plan
    const canUseTrial = plan.trial_days > 0 && !hasUsedTrial;

    return (
        <Paper
            elevation={0}
            sx={{
                p: 3,
                height: '100%',
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                background: 'linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,255,255,0.6))',
                backdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column',
                gap: 2,
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 12px 30px -18px rgba(30,50,90,.35), 0 2px 6px rgba(0,0,0,.08)',
            }}
        >
            {/* subtle light flare */}
            <Box
                aria-hidden
                sx={{
                    position: 'absolute',
                    top: -120,
                    right: -120,
                    width: 260,
                    height: 260,
                    background:
                        'radial-gradient(circle at 60% 40%, rgba(255,255,255,0.7), transparent 65%)',
                    pointerEvents: 'none',
                }}
            />

            {/* Header row: name + price + chips */}
            <Stack
                direction="row"
                alignItems="flex-start"
                justifyContent="space-between"
                spacing={2}
            >
                <Stack direction="column" spacing={0} sx={{ flex: 1 }}>
                    <Typography variant="h6" fontWeight={800}>
                        {plan.name}
                    </Typography>
                    {plan.price !== undefined && plan.price > 0 ? (
                        <Typography
                            variant="h5"
                            fontWeight={700}
                            sx={{
                                color: theme.palette.primary.main,
                                lineHeight: 1.2,
                            }}
                        >
                            ${plan.price}
                            <Typography
                                component="span"
                                variant="body2"
                                sx={{
                                    color: alpha(theme.palette.text.primary, 0.6),
                                    ml: 0.5,
                                    fontWeight: 500,
                                }}
                            >
                                /{plan.interval}
                            </Typography>
                        </Typography>
                    ) : (
                        <Typography
                            variant="body2"
                            sx={{
                                color: alpha(theme.palette.text.primary, 0.6),
                                fontStyle: 'italic',
                            }}
                        >
                            Price loading...
                        </Typography>
                    )}
                </Stack>

                <Stack direction="column" spacing={1} alignItems="flex-end">
                    {isBusiness && (
                        <Chip
                            size="small"
                            icon={<TrendingUpRoundedIcon />}
                            label="Most Popular"
                            sx={{
                                height: 22,
                                fontWeight: 700,
                                background: alpha(theme.palette.warning.main, 0.12),
                                border: `1px solid ${alpha(theme.palette.warning.main, 0.35)}`,
                            }}
                        />
                    )}
                    {canUseTrial && !subscribed && !onTrial && (
                        <Chip
                            size="small"
                            label={`${plan.trial_days} day trial`}
                            sx={{
                                height: 22,
                                fontWeight: 700,
                                background: alpha(theme.palette.success.main, 0.12),
                                border: `1px solid ${alpha(theme.palette.success.main, 0.35)}`,
                                color: theme.palette.success.main,
                            }}
                        />
                    )}
                </Stack>

                {/* Current plan status chips */}
                <Stack direction="row" spacing={1}>
                    {isCurrent && subscribed && !onTrial && (
                        <Chip
                            size="small"
                            color="success"
                            icon={<CheckCircleRoundedIcon />}
                            label="Current Plan"
                            sx={{ fontWeight: 700, height: 24 }}
                        />
                    )}
                    {isCurrent && onTrial && (
                        <Chip
                            size="small"
                            color="success"
                            icon={<CheckCircleRoundedIcon />}
                            label="On Trial"
                            sx={{ fontWeight: 700, height: 24 }}
                        />
                    )}
                </Stack>
            </Stack>

            {/* Features */}
            <Stack spacing={0.85} sx={{ mt: 0.5 }}>
                {plan.features.map((f, idx) => (
                    <Stack key={idx} direction="row" spacing={1} alignItems="center">
                        <CheckCircleRoundedIcon
                            fontSize="small"
                            sx={{ color: theme.palette.success.main }}
                        />
                        <Typography
                            variant="body2"
                            sx={{ color: alpha(theme.palette.text.primary, 0.85) }}
                        >
                            {f}
                        </Typography>
                    </Stack>
                ))}
            </Stack>

            {/* CTA */}
            <Box sx={{ mt: 'auto' }}>
                {!subscribed && !onTrial && (
                    <Button
                        fullWidth
                        variant="contained"
                        onClick={() => onSubscribe(plan.price_id)}
                        startIcon={<WorkspacePremiumRoundedIcon />}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 800,
                            background: 'linear-gradient(135deg,#6366F1,#4F46E5 55%,#4338CA)',
                            boxShadow:
                                '0 8px 20px -8px rgba(79,70,229,.55), 0 2px 6px rgba(0,0,0,.25)',
                            '&:hover': {
                                background: 'linear-gradient(135deg,#595CEB,#4841D6 55%,#3B32B8)',
                            },
                        }}
                    >
                        Start {canUseTrial ? `${plan.trial_days}-Day Trial` : plan.name}
                    </Button>
                )}

                {(subscribed || onTrial) && isCurrent && !onGrace && (
                    <Button
                        fullWidth
                        variant="text"
                        color="error"
                        onClick={() => onCancel(plan.name)}
                        sx={{ textTransform: 'none', fontWeight: 700 }}
                    >
                        Cancel Subscription
                    </Button>
                )}

                {(subscribed || onTrial) && isCurrent && onGrace && (
                    <Button
                        fullWidth
                        variant="contained"
                        color="success"
                        onClick={onResume}
                        sx={{ textTransform: 'none', fontWeight: 800 }}
                    >
                        Resume Subscription
                    </Button>
                )}

                {/* Allow upgrading to different tiers when user has active subscription */}
                {(subscribed || onTrial) && !isCurrent && (
                    <Button
                        fullWidth
                        variant="outlined"
                        onClick={() => onSubscribe(plan.price_id)}
                        startIcon={<TrendingUpRoundedIcon />}
                        sx={{
                            textTransform: 'none',
                            fontWeight: 700,
                            borderColor: theme.palette.primary.main,
                            color: theme.palette.primary.main,
                            '&:hover': {
                                borderColor: theme.palette.primary.dark,
                                backgroundColor: alpha(theme.palette.primary.main, 0.04),
                            },
                        }}
                    >
                        Upgrade to {plan.name}
                    </Button>
                )}
            </Box>
        </Paper>
    );
}

export default function BillingOverview({
    auth,
    user,
    plans,
    current,
    trial_eligibility,
    stripe_key,
}) {
    const theme = useTheme();
    const { flash } = usePage().props;

    // Cancellation dialog state
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const [cancellingPlanName, setCancellingPlanName] = useState('');

    const subscribed = !!current?.subscribed;
    const onTrial = !!current?.on_trial;
    const onGrace = !!current?.on_grace;
    const endsAt = current?.ends_at ? new Date(current.ends_at) : null;
    const trialEndsAt = current?.trial_ends_at ? new Date(current.trial_ends_at) : null;
    const hasUsedTrial = !!trial_eligibility?.has_used_trial;

    const subscribe = (priceId) => {
        router.post(route('billing.checkout'), { price_id: priceId });
    };

    const handleCancelClick = (planName) => {
        setCancellingPlanName(planName);
        setCancelDialogOpen(true);
    };

    const handleCancelConfirm = (reason) => {
        router.post(route('billing.cancel'), {
            cancellation_reason: reason,
        });
    };

    const resume = () => {
        router.post(route('billing.resume'));
    };

    return (
        <>
            <Head title="Billing" />
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
                            maxWidth: 1100,
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
                        {/* decorative glow */}
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
                        <Stack spacing={1.25} mb={2.5}>
                            <Typography
                                variant="h5"
                                fontWeight={900}
                                sx={{
                                    letterSpacing: '-0.5px',
                                    background:
                                        'linear-gradient(90deg,#101E40,#2F4370 55%,#456092 90%)',
                                    WebkitBackgroundClip: 'text',
                                    color: 'transparent',
                                }}
                            >
                                Billing & Subscription
                            </Typography>
                            <Typography
                                variant="body2"
                                sx={{
                                    color: alpha(theme.palette.text.primary, 0.78),
                                    maxWidth: 720,
                                }}
                            >
                                Choose your plan and start with a free trial. Access premium
                                features like AI task generation, team collaboration, and advanced
                                reporting.
                            </Typography>

                            <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
                                <Chip
                                    icon={<AutoAwesomeIcon />}
                                    label={
                                        onTrial
                                            ? 'On Trial'
                                            : subscribed
                                              ? 'Active Subscriber'
                                              : 'Free Tier'
                                    }
                                    color={onTrial || subscribed ? 'success' : 'default'}
                                    variant={subscribed || onTrial ? 'filled' : 'outlined'}
                                    sx={{ fontWeight: 700, height: 32 }}
                                />
                                {onTrial && trialEndsAt && (
                                    <Chip
                                        icon={<CancelScheduleSendRoundedIcon />}
                                        color="success"
                                        label={`Trial ends ${trialEndsAt.toLocaleDateString()}`}
                                        sx={{ fontWeight: 700, height: 32 }}
                                    />
                                )}
                                {onGrace && endsAt && (
                                    <Chip
                                        icon={<CancelScheduleSendRoundedIcon />}
                                        color="warning"
                                        label={`Cancels on ${endsAt.toLocaleDateString()}`}
                                        size="small"
                                        sx={{ fontWeight: 700 }}
                                    />
                                )}
                            </Stack>

                            {flash?.error && (
                                <Typography color="error" variant="body2">
                                    {flash.error}
                                </Typography>
                            )}
                            {flash?.success && (
                                <Typography color="success.main" variant="body2">
                                    {flash.success}
                                </Typography>
                            )}
                            {flash?.info && (
                                <Typography color="info.main" variant="body2">
                                    {flash.info}
                                </Typography>
                            )}
                        </Stack>

                        <Divider sx={{ mb: 3 }} />

                        {/* Plans grid */}
                        <Grid container spacing={2.5}>
                            {Array.isArray(plans) &&
                                plans.map((plan) => {
                                    const isCurrent =
                                        (subscribed || onTrial) && plan.key === current?.plan_name;

                                    return (
                                        <Grid item xs={12} md={4} key={plan.price_id}>
                                            <PlanCard
                                                plan={plan}
                                                isCurrent={isCurrent}
                                                subscribed={subscribed}
                                                onTrial={onTrial}
                                                onGrace={onGrace}
                                                onSubscribe={subscribe}
                                                onCancel={handleCancelClick}
                                                onResume={resume}
                                                hasUsedTrial={hasUsedTrial}
                                            />
                                        </Grid>
                                    );
                                })}
                        </Grid>

                        <Divider sx={{ my: 4 }} />

                        <Stack direction="row" spacing={1} alignItems="center">
                            <WorkspacePremiumRoundedIcon
                                fontSize="small"
                                sx={{ color: alpha(theme.palette.text.primary, 0.65) }}
                            />
                            <Typography
                                variant="caption"
                                sx={{ color: alpha(theme.palette.text.primary, 0.65) }}
                            >
                                All payments securely processed by Stripe. Start your free trial
                                with any valid credit card.
                            </Typography>
                        </Stack>
                    </Paper>
                </Box>

                {/* Cancellation Dialog */}
                <CancellationDialog
                    open={cancelDialogOpen}
                    onClose={() => setCancelDialogOpen(false)}
                    onConfirm={handleCancelConfirm}
                    planName={cancellingPlanName}
                />
            </AuthenticatedLayout>
        </>
    );
}
