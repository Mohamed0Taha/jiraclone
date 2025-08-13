import React, { useEffect, useMemo, useState, useRef } from "react";
import { Head, router, usePage } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import {
  alpha,
  Box,
  Button,
  Chip,
  CircularProgress,
  Container,
  Divider,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import RemoveRoundedIcon from "@mui/icons-material/RemoveRounded";
import RestartAltRoundedIcon from "@mui/icons-material/RestartAltRounded";
import HelpRoundedIcon from "@mui/icons-material/HelpRounded";
import TipsAndUpdatesRoundedIcon from "@mui/icons-material/TipsAndUpdatesRounded";
import AutoAwesomeRoundedIcon from "@mui/icons-material/AutoAwesomeRounded";
import AutorenewRoundedIcon from "@mui/icons-material/AutorenewRounded";
import { getCsrfToken } from "@/csrf";

/** GET suggestions (no CSRF). `max` is clamped 3..10 for backend service. */
async function loadAISuggestions(projectId, max = 8) {
  const clamped = Math.max(3, Math.min(10, max || 8));
  const url = route("tasks.ai.suggestions", projectId) + `?max=${encodeURIComponent(clamped)}`;
  const res = await fetch(url, {
    // Explicitly tell server we want JSON and we're NOT doing an Inertia visit
    headers: { Accept: "application/json" },
    credentials: "same-origin",
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return Array.isArray(data?.suggestions)
    ? data.suggestions.filter((s) => typeof s === "string" && s.trim() !== "")
    : [];
}

/** Case-insensitive contains */
function includesLine(haystack, needle) {
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

export default function AITasksGenerator({ auth, project, prefill = {} }) {
  const theme = useTheme();
  const { processing, errors = {} } = usePage().props;
  const [count, setCount] = useState(Number(prefill.count) || 5);
  const [prompt, setPrompt] = useState(prefill.prompt || "");
  const [chips, setChips] = useState([]);
  const [loadingChips, setLoadingChips] = useState(false);
  const [chipError, setChipError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const debounceRef = useRef(null);

  /** Helper: fetch & set suggestions; filters out ones already in the prompt */
  const fetchSuggestions = async (qty = count) => {
    try {
      setLoadingChips(true);
      setChipError("");
      const list = await loadAISuggestions(project.id, qty);
      // Filter out suggestions already used in the prompt
      const filtered = list.filter((s) => !includesLine(prompt, s));
      setChips(filtered);
    } catch (e) {
      console.error("AI suggestions error:", e);
      setChipError("Could not load AI suggestions. You can still type your own instructions.");
      setChips([
        "Add unit & integration tests",
        "Improve onboarding & first-run UX",
        "Performance profiling & caching",
        "Write developer documentation",
        "Security & hardening review",
      ]);
    } finally {
      setLoadingChips(false);
    }
  };

  /** Initial + reactive load (debounced) — reload when count changes */
  useEffect(() => {
    if (!project?.id) return;
    // debounce to avoid spamming while user is clicking +/- fast
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(count);
    }, 350);
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project?.id, count]);

  /** When selecting a chip: append to prompt & remove from list */
  const appendChip = (text) => {
    setPrompt((prev) => {
      if (!prev) return text;
      if (includesLine(prev, text)) return prev;
      return `${prev.trim()}\n- ${text}`;
    });
    // remove the clicked chip
    setChips((prev) => prev.filter((c) => c !== text));
  };

  // Track processing state changes to show loading
  useEffect(() => {
    if (processing) {
      setIsGenerating(true);
    }
  }, [processing]);

  const inc = () => setCount((n) => Math.min(50, Math.max(1, n + 1)));
  const dec = () => setCount((n) => Math.min(50, Math.max(1, n - 1)));
  const reset = () => {
    setCount(5);
    setPrompt("");
    fetchSuggestions(5);
  };

  const generate = () => {
    setIsGenerating(true);
    const token = getCsrfToken() || "";
    router.post(
      route("tasks.ai.preview", project.id),
      { count, prompt },
      {
        preserveScroll: true,
        headers: {
          // Ensure Laravel's VerifyCsrfToken sees the token for fetch/Inertia
          "X-XSRF-TOKEN": token,
          // Make it crystal clear we expect an Inertia page back
          Accept: "text/html, application/xhtml+xml",
        },
        onFinish: () => setIsGenerating(false),
        onError: () => setIsGenerating(false),
      }
    );
  };

  const cancel = () => {
    router.visit(route("tasks.index", project.id), { preserveScroll: true });
  };

  const meterPct = useMemo(
    () => Math.max(0, Math.min(100, Math.round((count / 50) * 100))),
    [count]
  );

  /** Pretty palettes for suggestion chips (rotating) */
  const chipPalettes = useMemo(() => {
    const p = theme.palette;
    return [
      { bg: alpha(p.info.main, 0.12), brd: alpha(p.info.main, 0.35) },
      { bg: alpha(p.success.main, 0.12), brd: alpha(p.success.main, 0.35) },
      { bg: alpha(p.warning.main, 0.12), brd: alpha(p.warning.main, 0.35) },
      { bg: alpha(p.secondary.main, 0.12), brd: alpha(p.secondary.main, 0.35) },
      { bg: alpha(p.primary.main, 0.12), brd: alpha(p.primary.main, 0.35) },
      { bg: alpha(p.error.main, 0.10), brd: alpha(p.error.main, 0.30) },
    ];
  }, [theme.palette]);

  return (
    <>
      <Head title="AI Task Generator" />
      <AuthenticatedLayout user={auth?.user}>
        <Box
          sx={{
            minHeight: "100vh",
            background:
              theme.palette.mode === "light"
                ? "linear-gradient(140deg,#F6F9FC 0%,#F1F6FD 55%,#E9F1FB 100%)"
                : "linear-gradient(140deg,#0F1823,#101B27)",
            display: "flex",
            py: { xs: 3, md: 6 },
          }}
        >
          <Container maxWidth="md">
            <Paper
              elevation={0}
              sx={{
                p: { xs: 2.5, md: 3.5 },
                borderRadius: 4,
                background:
                  "linear-gradient(145deg,rgba(255,255,255,0.95),rgba(255,255,255,0.74))",
                border: `1px solid ${alpha(theme.palette.primary.main, 0.18)}`,
                boxShadow:
                  "0 14px 34px -18px rgba(30,50,90,.28), 0 2px 6px rgba(0,0,0,.06)",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <Box
                aria-hidden
                sx={{
                  position: "absolute",
                  width: 300,
                  height: 300,
                  top: -130,
                  right: -110,
                  background:
                    "radial-gradient(circle at 60% 40%, rgba(255,255,255,0.7), transparent 70%)",
                }}
              />

              {/* Header */}
              <Stack direction="row" spacing={1.2} alignItems="center" mb={1}>
                <AutoAwesomeRoundedIcon
                  sx={{ color: alpha(theme.palette.primary.main, 0.9) }}
                />
                <Typography variant="h6" fontWeight={900} letterSpacing={-0.2}>
                  AI Task Generator
                </Typography>
                <Chip
                  size="small"
                  label={`${count} Task${count === 1 ? "" : "s"}`}
                  sx={{
                    ml: "auto",
                    fontWeight: 800,
                    height: 26,
                    borderRadius: 999,
                    background:
                      "linear-gradient(135deg,#22c55e22,#22c55e14 60%,#16a34a22)",
                    border: `1px solid ${alpha("#22c55e", 0.35)}`,
                  }}
                />
              </Stack>
              <Typography
                variant="body2"
                sx={{ color: alpha(theme.palette.text.primary, 0.7), mb: 2 }}
              >
                Project: <strong>{project?.name}</strong>
              </Typography>

              {errors?.ai && (
                <Box
                  sx={{
                    mb: 2,
                    p: 1.5,
                    borderRadius: 2,
                    border: `1px solid ${alpha(theme.palette.error.main, 0.35)}`,
                    backgroundColor: alpha(theme.palette.error.main, 0.06),
                  }}
                >
                  <Typography color="error" fontWeight={700}>
                    {errors.ai}
                  </Typography>
                </Box>
              )}

              <Divider sx={{ mb: 2.5 }} />

              {/* Count control */}
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 900,
                  letterSpacing: 0.3,
                  mb: 1,
                  color: alpha(theme.palette.text.primary, 0.85),
                }}
              >
                NUMBER OF TASKS
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center">
                <TextField
                  type="number"
                  size="small"
                  value={count}
                  onChange={(e) =>
                    setCount(() =>
                      Math.min(50, Math.max(1, Number(e.target.value) || 1))
                    )
                  }
                  disabled={isGenerating || processing}
                  inputProps={{ min: 1, max: 50 }}
                  sx={{ width: 120 }}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Tooltip title="Decrease">
                          <span>
                            <IconButton
                              size="small"
                              onClick={dec}
                              disabled={count <= 1 || isGenerating || processing}
                            >
                              <RemoveRoundedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </InputAdornment>
                    ),
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip title="Increase">
                          <span>
                            <IconButton
                              size="small"
                              onClick={inc}
                              disabled={count >= 50 || isGenerating || processing}
                            >
                              <AddRoundedIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                />

                <Box
                  aria-label="count meter"
                  sx={{
                    flexGrow: 1,
                    height: 10,
                    mt: 1,
                    borderRadius: 999,
                    background: alpha(theme.palette.primary.main, 0.1),
                    overflow: "hidden",
                    position: "relative",
                  }}
                >
                  <Box
                    sx={{
                      width: `${meterPct}%`,
                      height: "100%",
                      background:
                        "linear-gradient(90deg,#34D399,#10B981 55%,#059669)",
                      transition: "width .25s ease",
                    }}
                  />
                  <Typography
                    variant="caption"
                    sx={{
                      position: "absolute",
                      right: 8,
                      top: -18,
                      color: alpha(theme.palette.text.primary, 0.55),
                      fontWeight: 600,
                    }}
                  >
                    {count}/50 requested
                  </Typography>
                </Box>
              </Stack>

              {/* Prompt */}
              <Typography
                variant="subtitle2"
                sx={{
                  fontWeight: 900,
                  letterSpacing: 0.3,
                  mt: 3,
                  mb: 1,
                  color: alpha(theme.palette.text.primary, 0.85),
                }}
              >
                EXTRA INSTRUCTIONS (OPTIONAL)
              </Typography>

              <TextField
                multiline
                minRows={5}
                fullWidth
                placeholder="e.g. Include tasks for safety checks specific to Khartoum site, local permitting, and budget tracking cadence…"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isGenerating || processing}
              />

              {/* AI chips */}
              <Stack spacing={0.8} mt={1.4}>
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{ mb: 0.3 }}
                >
                  <Typography
                    variant="caption"
                    sx={{ color: alpha(theme.palette.text.primary, 0.6) }}
                  >
                    Add context to guide the AI
                  </Typography>
                  <Chip
                    size="small"
                    label={`${chips.length} suggestion${chips.length === 1 ? "" : "s"}`}
                    sx={{
                      height: 22,
                      fontWeight: 700,
                      background: alpha(theme.palette.primary.main, 0.08),
                      border: `1px solid ${alpha(theme.palette.primary.main, 0.25)}`,
                    }}
                  />
                  <Box sx={{ flexGrow: 1 }} />
                  <Tooltip title="Regenerate suggestions">
                    <span>
                      <Button
                        size="small"
                        variant="text"
                        onClick={() => fetchSuggestions(count)}
                        startIcon={<AutorenewRoundedIcon />}
                        disabled={loadingChips}
                        sx={{ textTransform: "none", fontWeight: 700 }}
                      >
                        Refresh
                      </Button>
                    </span>
                  </Tooltip>
                </Stack>

                {chipError && (
                  <Typography variant="caption" color="error" sx={{ mb: 0.5 }}>
                    {chipError}
                  </Typography>
                )}

                <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1.2}>
                  {loadingChips
                    ? Array.from({ length: Math.max(6, Math.min(10, count)) }).map((_, i) => (
                        <Chip
                          key={`skeleton-${i}`}
                          label="Loading…"
                          icon={<TipsAndUpdatesRoundedIcon />}
                          sx={{
                            opacity: 0.65,
                            fontWeight: 700,
                            background: alpha(theme.palette.info.main, 0.12),
                            border: `1px solid ${alpha(theme.palette.info.main, 0.35)}`,
                          }}
                        />
                      ))
                    : chips.map((s, idx) => {
                        const palettes = [
                          { bg: alpha(theme.palette.info.main, 0.12), brd: alpha(theme.palette.info.main, 0.35) },
                          { bg: alpha(theme.palette.success.main, 0.12), brd: alpha(theme.palette.success.main, 0.35) },
                          { bg: alpha(theme.palette.warning.main, 0.12), brd: alpha(theme.palette.warning.main, 0.35) },
                          { bg: alpha(theme.palette.secondary.main, 0.12), brd: alpha(theme.palette.secondary.main, 0.35) },
                          { bg: alpha(theme.palette.primary.main, 0.12), brd: alpha(theme.palette.primary.main, 0.35) },
                          { bg: alpha(theme.palette.error.main, 0.10), brd: alpha(theme.palette.error.main, 0.30) },
                        ];
                        const pal = palettes[idx % palettes.length];
                        return (
                          <Chip
                            key={`${idx}-${s}`}
                            onClick={() => appendChip(s)}
                            icon={<TipsAndUpdatesRoundedIcon />}
                            label={s}
                            sx={{
                              cursor: "pointer",
                              fontWeight: 700,
                              background: pal.bg,
                              border: `1px solid ${pal.brd}`,
                              transition: "transform .15s, box-shadow .15s, background .15s",
                              "&:hover": {
                                background: alpha(pal.brd, 0.18),
                                transform: "translateY(-1px)",
                                boxShadow: `0 6px 16px -8px ${alpha(pal.brd, 0.55)}`,
                              },
                            }}
                          />
                        );
                      })}
                </Stack>
              </Stack>

              {/* Actions */}
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={1.2}
                justifyContent="flex-end"
                mt={3}
              >
                <Button
                  variant="text"
                  startIcon={<RestartAltRoundedIcon />}
                  onClick={reset}
                  disabled={isGenerating || processing}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Reset
                </Button>
                <Button
                  variant="outlined"
                  onClick={cancel}
                  disabled={isGenerating || processing}
                  sx={{ textTransform: "none", fontWeight: 700 }}
                >
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  onClick={generate}
                  disabled={isGenerating || processing}
                  startIcon={
                    isGenerating || processing ? (
                      <CircularProgress size={16} color="inherit" />
                    ) : (
                      <AutoAwesomeRoundedIcon />
                    )
                  }
                  sx={{
                    textTransform: "none",
                    fontWeight: 900,
                    px: 2.6,
                    background: isGenerating || processing
                      ? "linear-gradient(135deg,#9CA3AF,#6B7280)"
                      : "linear-gradient(135deg,#6366F1,#4F46E5 55%,#4338CA)",
                    boxShadow:
                      "0 8px 20px -8px rgba(79,70,229,.55), 0 2px 6px rgba(0,0,0,.25)",
                    "&:hover": {
                      background: isGenerating || processing
                        ? "linear-gradient(135deg,#9CA3AF,#6B7280)"
                        : "linear-gradient(135deg,#595CEB,#4841D6 55%,#3B32B8)",
                    },
                    "&:disabled": {
                      background: "linear-gradient(135deg,#9CA3AF,#6B7280)",
                      color: "rgba(255,255,255,0.7)",
                    },
                  }}
                >
                  {isGenerating || processing ? `Generating ${count} Tasks...` : "Generate Tasks"}
                </Button>
              </Stack>

              <Divider sx={{ my: 2.5 }} />

              <Stack direction="row" spacing={1} alignItems="center">
                <HelpRoundedIcon sx={{ color: "text.secondary" }} />
                <Typography variant="caption" color="text.secondary">
                  Suggestions adapt to your project description & meta. Click any chip to
                  add it to the prompt—selected chips disappear so you can keep picking fresh ones.
                </Typography>
              </Stack>
            </Paper>
          </Container>
        </Box>
      </AuthenticatedLayout>
    </>
  );
}
