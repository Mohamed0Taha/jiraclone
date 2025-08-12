import React from "react";
import { alpha, Box, Chip, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import { keyframes } from "@mui/system";
import GroupAddRoundedIcon from "@mui/icons-material/GroupAddRounded";
import BoltRoundedIcon from "@mui/icons-material/BoltRounded";
import DescriptionRoundedIcon from "@mui/icons-material/DescriptionRounded";
import WorkspacePremiumRoundedIcon from "@mui/icons-material/WorkspacePremiumRounded";
import LockRoundedIcon from "@mui/icons-material/LockRounded";

const gradientPan = keyframes`
  0%   { background-position:   0% 50%; }
  50%  { background-position: 100% 50%; }
  100% { background-position:   0% 50%; }
`;
const pulseGlow = keyframes`
  0%   { box-shadow: 0 0 0 0 rgba(249,115,22,.28), 0 6px 12px rgba(0,0,0,.14); }
  50%  { box-shadow: 0 0 12px 4px rgba(249,115,22,.22), 0 10px 16px rgba(0,0,0,.18); }
  100% { box-shadow: 0 0 0 0 rgba(249,115,22,.28), 0 6px 12px rgba(0,0,0,.14); }
`;

export default function ProCluster({
  isPro,
  onOpenMembers,
  onOpenAutomations,
  onOpenReport,
  busyReport = false,
}) {
  const iconBg = "#BFE8FF";
  const iconFg = "#1380D8";

  const ActionItem = ({ label, icon, onClick, disabled }) => (
    <Tooltip title={disabled ? `${label} — Pro feature` : label}>
      <Box
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          if (!disabled && onClick) {
            onClick();
          }
        }}
        aria-label={label}
        sx={{
          cursor: disabled ? "not-allowed" : "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 0.8,
          minWidth: 92,
        }}
      >
        <Box sx={{ position: "relative", lineHeight: 0 }}>
          <IconButton
            disabled={disabled}
            sx={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              backgroundColor: iconBg,
              color: iconFg,
              border: `1px solid ${alpha("#000", 0.06)}`,
              boxShadow: `0 10px 24px -12px ${alpha("#000", 0.35)}, 0 0 0 3px ${alpha("#fff", 0.9)} inset`,
              transition: "transform .15s ease, box-shadow .15s ease, opacity .15s ease",
              opacity: disabled ? 0.7 : 1,
              "&.Mui-disabled": { opacity: 0.55, color: alpha(iconFg, 0.9) },
            }}
          >
            {icon}
          </IconButton>

          {disabled && (
            <Box
              aria-hidden
              sx={{
                position: "absolute",
                right: -2,
                bottom: -2,
                width: 20,
                height: 20,
                borderRadius: "50%",
                display: "grid",
                placeItems: "center",
                background: "linear-gradient(135deg,#0EA5E9,#2563EB)",
                color: "#fff",
                border: `2px solid #fff`,
              }}
            >
              <LockRoundedIcon sx={{ fontSize: 14 }} />
            </Box>
          )}
        </Box>

        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            letterSpacing: 0.3,
            color: alpha("#0B2545", 0.85),
            px: 0.75,
            py: 0.35,
            borderRadius: 999,
            background: alpha("#0EA5E9", 0.08),
            border: `1px solid ${alpha("#0EA5E9", 0.25)}`,
            backdropFilter: "blur(4px)",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </Typography>
      </Box>
    </Tooltip>
  );

  return (
    <Box sx={{ width: "100%", maxWidth: 360, justifySelf: "end" }}>
      <Box
        sx={{
          p: "2px",
          borderRadius: 4,
          background: "linear-gradient(90deg, #ff7a18, #af1eff, #18d2ff, #27e499, #ff7a18)",
          backgroundSize: "300% 300%",
          animation: `${gradientPan} 22s ease-in-out infinite`,
        }}
      >
        <Paper
          elevation={0}
          sx={{
            position: "relative",
            overflow: "visible",
            borderRadius: 4,
            p: 1.4,
            px: 1.6,
            background: "linear-gradient(180deg, rgba(255,255,255,0.97) 0%, rgba(255,255,255,0.92) 100%)",
            border: `1px solid ${alpha("#0B2545", 0.06)}`,
            boxShadow: `0 20px 40px -22px ${alpha("#000", 0.35)}, 0 2px 8px ${alpha("#000", 0.06)}`,
          }}
        >
          <Chip
            size="small"
            label="Pro features"
            icon={isPro ? <WorkspacePremiumRoundedIcon /> : <LockRoundedIcon />}
            sx={{
              position: "absolute",
              top: -12,
              right: -12,
              fontWeight: 800,
              height: 20,
              fontSize: 10.5,
              borderRadius: "999px",
              px: 0.85,
              color: "#fff",
              background: `linear-gradient(135deg, #F97316 0%, #EA580C 100%)`,
              animation: `${pulseGlow} 3.2s ease-in-out infinite`,
              "& .MuiChip-icon": { color: "#fff", mr: 0.4, "& svg": { fontSize: "0.95rem" } },
              "& .MuiChip-label": { pt: "1px" },
            }}
          />

          <Stack direction="row" spacing={1.4} alignItems="center" justifyContent="space-between" sx={{ px: 0.4 }}>
            <ActionItem label="Members"     icon={<GroupAddRoundedIcon />}     onClick={onOpenMembers}     disabled={!isPro} />
            <ActionItem label="Automations" icon={<BoltRoundedIcon />}         onClick={onOpenAutomations} disabled={false} />
            <ActionItem label="Report"      icon={<DescriptionRoundedIcon />}  onClick={onOpenReport}      disabled={!isPro || busyReport} />
          </Stack>
        </Paper>
      </Box>
    </Box>
  );
}
