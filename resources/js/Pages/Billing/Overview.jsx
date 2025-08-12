// resources/js/Pages/Billing/Overview.jsx
import React from "react";
import { Head, router, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import {
  alpha,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Stack,
  Typography,
  useTheme,
} from "@mui/material";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import CancelScheduleSendRoundedIcon from "@mui/icons-material/CancelScheduleSendRounded";
import ManageAccountsRoundedIcon from "@mui/icons-material/ManageAccountsRounded";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import TrendingUpRoundedIcon from "@mui/icons-material/TrendingUpRounded";

/**
 * NOTE:
 * This file is self-contained and intentionally does NOT import Task/Board-related components.
 * It fixes the Vite error by removing incorrect imports and only rendering billing UI.
 */

function PlanCard({
  plan,
  isCurrent,
  subscribed,
  onGrace,
  onSubscribe,
  onPortal,
  onCancel,
  onResume,
}) {
  const theme = useTheme();
  const isSixMonth = /six|semi/i.test(plan.name); // highlights the 6-month plan if present

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: "100%",
        borderRadius: 3,
        border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
        background:
          "linear-gradient(135deg,rgba(255,255,255,0.92),rgba(255,255,255,0.6))",
        backdropFilter: "blur(10px)",
        display: "flex",
        flexDirection: "column",
        gap: 2,
        position: "relative",
        overflow: "hidden",
        boxShadow:
          "0 12px 30px -18px rgba(30,50,90,.35), 0 2px 6px rgba(0,0,0,.08)",
      }}
    >
      {/* subtle light flare */}
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          top: -120,
          right: -120,
          width: 260,
          height: 260,
          background:
            "radial-gradient(circle at 60% 40%, rgba(255,255,255,0.7), transparent 65%)",
          pointerEvents: "none",
        }}
      />

      {/* Header row: name + chips (no overlay) */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        spacing={1}
      >
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="h6" fontWeight={800}>
            {plan.name}
          </Typography>
          {isSixMonth && (
            <Chip
              size="small"
              icon={<TrendingUpRoundedIcon />}
              label="6-Month"
              sx={{
                height: 22,
                fontWeight: 700,
                background: alpha(theme.palette.warning.main, 0.12),
                border: `1px solid ${alpha(theme.palette.warning.main, 0.35)}`,
              }}
            />
          )}
        </Stack>

        <Stack direction="row" spacing={1}>
          {isCurrent && subscribed && (
            <Chip
              size="small"
              color="success"
              icon={<CheckCircleRoundedIcon />}
              label="Current Plan"
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
      <Box sx={{ mt: "auto" }}>
        {!subscribed && (
          <Button
            fullWidth
            variant="contained"
            onClick={() => onSubscribe(plan.price_id)}
            startIcon={<WorkspacePremiumRoundedIcon />}
            sx={{
              textTransform: "none",
              fontWeight: 800,
              background:
                "linear-gradient(135deg,#6366F1,#4F46E5 55%,#4338CA)",
              boxShadow:
                "0 8px 20px -8px rgba(79,70,229,.55), 0 2px 6px rgba(0,0,0,.25)",
              "&:hover": {
                background:
                  "linear-gradient(135deg,#595CEB,#4841D6 55%,#3B32B8)",
              },
            }}
          >
            Choose {plan.name}
          </Button>
        )}

        {subscribed && isCurrent && !onGrace && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              fullWidth
              variant="outlined"
              onClick={onPortal}
              startIcon={<ManageAccountsRoundedIcon />}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Manage
            </Button>
            <Button
              fullWidth
              variant="text"
              color="error"
              onClick={onCancel}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Cancel
            </Button>
          </Stack>
        )}

        {subscribed && isCurrent && onGrace && (
          <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
            <Button
              fullWidth
              variant="contained"
              color="success"
              onClick={onResume}
              sx={{ textTransform: "none", fontWeight: 800 }}
            >
              Resume
            </Button>
            <Button
              fullWidth
              variant="outlined"
              onClick={onPortal}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              Portal
            </Button>
          </Stack>
        )}
      </Box>
    </Paper>
  );
}

export default function BillingOverview({ auth, user, plans, current, stripe_key }) {
  const theme = useTheme();
  const { flash } = usePage().props;

  const subscribed = !!current?.subscribed;
  const onGrace = !!current?.on_grace;
  const endsAt = current?.ends_at ? new Date(current.ends_at) : null;

  const subscribe = (priceId) => {
    router.post(route("billing.checkout"), { price_id: priceId });
  };

  const portal = () => {
    router.post(route("billing.portal"));
  };

  const cancel = () => {
    router.post(route("billing.cancel"));
  };

  const resume = () => {
    router.post(route("billing.resume"));
  };

  return (
    <>
      <Head title="Billing" />
      <AuthenticatedLayout user={auth?.user}>
        <Box
          sx={{
            minHeight: "100vh",
            p: { xs: 2, md: 4 },
            background:
              theme.palette.mode === "light"
                ? "linear-gradient(140deg,#F6F9FC 0%,#EEF3F9 55%,#E5ECF5 100%)"
                : "linear-gradient(140deg,#0F1823,#101B27)",
          }}
        >
          <Paper
            elevation={0}
            sx={{
              maxWidth: 1100,
              mx: "auto",
              p: { xs: 3, md: 4 },
              borderRadius: 4,
              background:
                "linear-gradient(145deg,rgba(255,255,255,0.92),rgba(255,255,255,0.62))",
              backdropFilter: "blur(16px)",
              border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
              boxShadow:
                "0 10px 34px -12px rgba(30,50,90,.25), 0 2px 4px rgba(0,0,0,.05)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* decorative glow */}
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                width: 320,
                height: 320,
                top: -130,
                right: -110,
                background:
                  "radial-gradient(circle at 60% 40%, rgba(255,255,255,0.7), transparent 70%)",
                pointerEvents: "none",
              }}
            />

            {/* Header */}
            <Stack spacing={1.25} mb={2.5}>
              <Typography
                variant="h5"
                fontWeight={900}
                sx={{
                  letterSpacing: "-0.5px",
                  background:
                    "linear-gradient(90deg,#101E40,#2F4370 55%,#456092 90%)",
                  WebkitBackgroundClip: "text",
                  color: "transparent",
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
                Unlock premium features like AI task generation, project members, automations,
                and detailed reports.
              </Typography>

              <Stack direction="row" spacing={1} flexWrap="wrap">
                <Chip
                  icon={<AutoAwesomeIcon />}
                  label={subscribed ? "Active Subscriber" : "Free Tier"}
                  color={subscribed ? "success" : "default"}
                  variant={subscribed ? "filled" : "outlined"}
                  sx={{ fontWeight: 700 }}
                />
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

            {/* Plans grid (supports Monthly, 6-Month, Yearly) */}
            <Grid container spacing={2.5}>
              {Array.isArray(plans) &&
                plans.map((plan) => {
                  const isCurrent =
                    subscribed && plan.price_id === current?.plan_price_id;

                  return (
                    <Grid item xs={12} md={4} key={plan.price_id}>
                      <PlanCard
                        plan={plan}
                        isCurrent={isCurrent}
                        subscribed={subscribed}
                        onGrace={onGrace}
                        onSubscribe={subscribe}
                        onPortal={portal}
                        onCancel={cancel}
                        onResume={resume}
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
                All payments securely processed by Stripe. Test cards accepted in test
                mode (e.g. 4242 4242 4242 4242).
              </Typography>
            </Stack>
          </Paper>
        </Box>
      </AuthenticatedLayout>
    </>
  );
}
