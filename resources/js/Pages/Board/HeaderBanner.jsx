// resources/js/Pages/Board/HeaderBanner.jsx
import React from "react";
import {
  alpha,
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Typography,
  Tooltip,
  IconButton,
} from "@mui/material";
import AutoGraphRoundedIcon from "@mui/icons-material/AutoGraphRounded";
import CheckCircleRoundedIcon from "@mui/icons-material/CheckCircleRounded";
import PersonRoundedIcon from "@mui/icons-material/PersonRounded";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import ProCluster from "./ProCluster"; // ✅ relative path (same folder)

export default function HeaderBanner({
  projectName = "Project",
  totalTasks = 0,
  percentDone = 0,
  usersCount = 0,
  onAiTasks,
  isPro = false,
  onOpenMembers,
  onOpenAutomations,
  onOpenReport,
  onOpenDetails,
  onOpenAssistant,
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        mb: 2.5,
        p: { xs: 2.4, md: 3.2 },
        borderRadius: 4,
        position: "relative",
        overflow: "hidden",
        background:
          "linear-gradient(135deg,rgba(255,255,255,0.86),rgba(255,255,255,0.58))",
        backdropFilter: "blur(16px)",
        border: `1px solid ${alpha("#3b82f6", 0.18)}`,
        boxShadow:
          "0 10px 32px -10px rgba(30,50,90,.20), 0 2px 4px rgba(0,0,0,.06)",
        display: "grid",
        gridTemplateColumns: { xs: "1fr", md: "1fr auto" },
        columnGap: { xs: 0, md: 3 },
        rowGap: 2,
        alignItems: "center",
      }}
    >
      <Box
        aria-hidden
        sx={{
          position: "absolute",
          width: 380,
          height: 380,
          top: -160,
          right: -140,
          background:
            "radial-gradient(circle at 60% 40%, rgba(255,255,255,0.65), transparent 65%)",
          pointerEvents: "none",
        }}
      />

      <Stack spacing={1.25}>
        <Typography
          variant="h6"
          fontWeight={900}
          sx={{
            letterSpacing: "-0.4px",
            background:
              "linear-gradient(90deg,#0E1730,#1B2747 40%,#26406E 80%)",
            WebkitBackgroundClip: "text",
            color: "transparent",
          }}
        >
          {projectName} – Task Board
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
          {/* Information Chips - Grouped together */}
          <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
            <Chip
              icon={<AutoGraphRoundedIcon />}
              label={`${totalTasks} Task${totalTasks === 1 ? "" : "s"}`}
              sx={{
                fontWeight: 700,
                background:
                  "linear-gradient(120deg,rgba(99,123,255,0.2),rgba(143,167,255,0.15))",
                border: `1px solid ${alpha("#5B7BFF", 0.35)}`,
                height: 30,
              }}
            />
            <Chip
              icon={<CheckCircleRoundedIcon />}
              label={`${percentDone}% Complete`}
              sx={{
                fontWeight: 700,
                background:
                  "linear-gradient(120deg,rgba(76,201,140,0.20),rgba(76,201,140,0.10))",
                border: `1px solid ${alpha("#31B574", 0.4)}`,
                height: 30,
              }}
            />
            <Chip
              icon={<PersonRoundedIcon />}
              label={`${usersCount} Member${usersCount === 1 ? "" : "s"}`}
              sx={{
                fontWeight: 700,
                background:
                  "linear-gradient(120deg,rgba(64,152,255,0.18),rgba(64,152,255,0.08))",
                border: `1px solid ${alpha("#4098FF", 0.45)}`,
                height: 30,
              }}
            />
          </Stack>

          {/* Action Buttons - Grouped together with consistent styling */}
          <Box sx={{ ml: "auto", display: "flex", gap: 1, alignItems: "center" }}>
            <Tooltip title="AI Assistant Chat">
              <Button
                variant="outlined"
                size="small"
                onClick={onOpenAssistant}
                startIcon={<SmartToyIcon />}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 999,
                  px: 2,
                  py: 0.7,
                  height: 32,
                  borderColor: 'secondary.main',
                  color: 'secondary.main',
                  '&:hover': {
                    borderColor: 'secondary.dark',
                    bgcolor: alpha('#9c27b0', 0.04),
                  },
                }}
              >
                Assistant
              </Button>
            </Tooltip>

            <Tooltip title="View project details">
              <Button
                variant="outlined"
                size="small"
                onClick={onOpenDetails}
                startIcon={<InfoOutlinedIcon />}
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  borderRadius: 999,
                  px: 2,
                  py: 0.7,
                  height: 32,
                }}
              >
                Details
              </Button>
            </Tooltip>

            <Button
              variant="contained"
              size="small"
              onClick={onAiTasks}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderRadius: 999,
                px: 2.1,
                py: 0.7,
                height: 32,
                background:
                  "linear-gradient(135deg,#6366F1,#4F46E5 60%,#4338CA)",
                boxShadow:
                  "0 6px 18px -8px rgba(99,102,241,.55), 0 2px 6px rgba(0,0,0,.18)",
                "&:hover": {
                  background:
                    "linear-gradient(135deg,#575AF0,#463FD7 60%,#3B31B8)",
                },
              }}
            >
              AI Tasks
            </Button>
          </Box>
        </Stack>
      </Stack>

      <ProCluster
        isPro={isPro}
        onOpenMembers={onOpenMembers}
        onOpenAutomations={onOpenAutomations}
        onOpenReport={onOpenReport}
      />
    </Paper>
  );
}
