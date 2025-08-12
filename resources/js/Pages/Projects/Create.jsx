import React, { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { Head, useForm, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import {
  Alert,
  Box,
  Breadcrumbs,
  Button,
  Chip,
  Container,
  Divider,
  Fade,
  IconButton,
  InputAdornment,
  LinearProgress,
  Link as MuiLink,
  MenuItem,
  Paper,
  Slider,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
  FormControl,
  Select,
  FormHelperText,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import KeyIcon from "@mui/icons-material/Key";
import DescriptionIcon from "@mui/icons-material/Description";
import TitleIcon from "@mui/icons-material/Title";
import EventIcon from "@mui/icons-material/Event";
import PlaceIcon from "@mui/icons-material/Place";
import GroupsIcon from "@mui/icons-material/Groups";
import CategoryIcon from "@mui/icons-material/Category";
import InsightsIcon from "@mui/icons-material/Insights";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";

export default function Create({ auth, projectTypes = [], domains = [] }) {
  const theme = useTheme();
  const steps = ["Basics", "Scope & Team", "Objectives", "Review"];
  const [active, setActive] = useState(0);

  const { data, setData, post, processing, errors, reset } = useForm({
    name: "",
    key: "",
    description: "",
    start_date: "",
    end_date: "",
    meta: {
      project_type: "",
      domain: "",
      area: "",
      location: "",
      team_size: 3,
      budget: "",
      primary_stakeholder: "",
      objectives: "",
      constraints: "",
    },
  });

  // Client-side errors (UX)
  const [localErrors, setLocalErrors] = useState({});
  const eFor = (field) => errors[field] || localErrors[field] || "";

  const KEY_REGEX = /^[A-Z0-9]+$/;
  const NAME_MIN = 3;
  const NAME_MAX = 80;
  const DESC_MAX = 4000;

  // Autofocus first input
  const nameRef = useRef(null);
  useEffect(() => { nameRef.current?.focus(); }, []);

  // Auto-suggest key from name
  useEffect(() => {
    if (!data.name || data.meta.__keyTouched) return;
    const initials = data.name
      .trim()
      .split(/\s+/)
      .slice(0, 3)
      .map(w => (w[0] || ""))
      .join("")
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 6);
    setData("key", initials);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.name]);

  // Basic validators
  const v = {
    name: (v) => {
      if (!v?.trim()) return "Project name is required.";
      if (v.trim().length < NAME_MIN) return `At least ${NAME_MIN} characters.`;
      if (v.length > NAME_MAX) return `Maximum ${NAME_MAX} characters.`;
      return "";
    },
    key: (v) => {
      if (!v?.trim()) return "Key is required.";
      if (!KEY_REGEX.test(v)) return "Uppercase letters & digits only.";
      if (v.length > 12) return "Max 12 characters.";
      return "";
    },
    description: (v) => {
      if ((v || "").length > DESC_MAX) return `Maximum ${DESC_MAX} characters.`;
      return "";
    },
    start_end: (start, end) => {
      if (start && end && new Date(end) < new Date(start)) {
        return "End date must be after or equal to start date.";
      }
      return "";
    },
  };

  const setMeta = (k, val) => setData("meta", { ...data.meta, [k]: val });

  // Per-step validation
  const validateStep = useCallback((idx) => {
    const err = {};
    if (idx === 0) {
      const e1 = v.name(data.name); if (e1) err.name = e1;
      const e2 = v.key(data.key);   if (e2) err.key  = e2;
      const e3 = v.description(data.description); if (e3) err.description = e3;
    }
    if (idx === 1) {
      const e4 = v.start_end(data.start_date, data.end_date);
      if (e4) err.end_date = e4;
      // Soft suggestions; no hard errors here.
    }
    if (idx === 2) {
      // Objectives/constraints optional; no hard errors unless too long handled server-side.
    }
    setLocalErrors(err);
    return Object.keys(err).length === 0;
  }, [data, v]);

  const next = () => {
    if (!validateStep(active)) return;
    setActive((n) => Math.min(steps.length - 1, n + 1));
  };
  const back = () => setActive((n) => Math.max(0, n - 1));

  const submit = (e) => {
    e.preventDefault();
    if (!validateStep(active)) return;
    post("/projects", {
      onSuccess: () => { reset(); },
    });
  };

  // Keyboard shortcut (Ctrl/Cmd + S)
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!processing) {
          if (active < steps.length - 1) next();
          else submit(e);
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [processing, active]);

  const gradient = `linear-gradient(115deg, ${alpha(
    theme.palette.primary.main, 0.85
  )} 0%, ${alpha(theme.palette.secondary.main, 0.8)} 60%, ${alpha(
    theme.palette.primary.dark, 0.85
  )} 100%)`;

  const ReviewLine = ({ label, value }) => (
    <Stack direction="row" spacing={1.5} alignItems="baseline">
      <Typography sx={{ minWidth: 170, color: "text.secondary", fontWeight: 600 }}>{label}</Typography>
      <Typography sx={{ whiteSpace: "pre-line" }}>{value || "—"}</Typography>
    </Stack>
  );

  return (
    <>
      <Head title="Create Project" />
      <AuthenticatedLayout user={auth.user}>
        {/* Hero */}
        <Box
          sx={{
            background: gradient,
            color: "#fff",
            pt: { xs: 7, md: 9 },
            pb: { xs: 8, md: 10 },
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              top: -120,
              left: -80,
              width: 440,
              height: 440,
              borderRadius: "50%",
              background: alpha("#fff", 0.12),
              filter: "blur(90px)",
            }}
          />
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              bottom: -140,
              right: -120,
              width: 500,
              height: 500,
              borderRadius: "50%",
              background: alpha("#fff", 0.14),
              filter: "blur(100px)",
            }}
          />
          <Container maxWidth="md" sx={{ position: "relative" }}>
            <Breadcrumbs
              aria-label="breadcrumb"
              sx={{
                "& a, & .MuiTypography-root": {
                  color: alpha("#fff", 0.9),
                  fontSize: 14,
                },
              }}
            >
              <MuiLink underline="hover" color="inherit" href="/dashboard" sx={{ fontWeight: 500 }}>
                Dashboard
              </MuiLink>
              <MuiLink underline="hover" color="inherit" href="/projects" sx={{ fontWeight: 500 }}>
                Projects
              </MuiLink>
              <Typography color="inherit" sx={{ fontWeight: 600 }}>
                Create
              </Typography>
            </Breadcrumbs>

            <Typography
              variant="h3"
              fontWeight={700}
              sx={{ mt: 3, letterSpacing: "-0.5px", textShadow: "0 4px 22px rgba(0,0,0,0.25)" }}
            >
              Create a New Project
            </Typography>
            <Typography variant="h6" sx={{ mt: 2, maxWidth: 720, color: alpha("#fff", 0.92) }}>
              Step through basics, scope, and goals so AI can generate hyper-relevant suggestions later.
            </Typography>
            <Stack direction="row" spacing={1.5} mt={3} flexWrap="wrap">
              <Chip
                icon={<AutoAwesomeIcon />}
                label="Ctrl/Cmd + S to continue"
                sx={{
                  bgcolor: alpha("#000", 0.25),
                  color: "#fff",
                  "& .MuiChip-icon": { color: "#fff" },
                  backdropFilter: "blur(4px)",
                }}
              />
            </Stack>
          </Container>
        </Box>

        {/* Form Section */}
        <Box sx={{ bgcolor: "background.default", py: { xs: 5, md: 8 }, minHeight: "60vh" }}>
          <Container maxWidth="md">
            <Fade in timeout={500}>
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 3, sm: 5 },
                  borderRadius: 4,
                  position: "relative",
                  border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                  background:
                    theme.palette.mode === "light"
                      ? "linear-gradient(145deg,#ffffff,#f8f9fb)"
                      : alpha(theme.palette.background.paper, 0.7),
                  backdropFilter: "blur(6px)",
                  boxShadow:
                    theme.palette.mode === "light"
                      ? "0 4px 18px -4px rgba(0,0,0,.12)"
                      : "0 4px 18px -6px rgba(0,0,0,.7)",
                  overflow: "hidden",
                }}
              >
                {processing && (
                  <LinearProgress
                    sx={{
                      position: "absolute",
                      left: 0,
                      top: 0,
                      width: "100%",
                      borderTopLeftRadius: 16,
                      borderTopRightRadius: 16,
                    }}
                  />
                )}

                <Stack direction="row" alignItems="center" spacing={1} mb={2} sx={{ flexWrap: "wrap" }}>
                  <IconButton
                    aria-label="Back to projects"
                    size="small"
                    href="/projects"
                    sx={{
                      bgcolor: alpha(theme.palette.primary.main, 0.08),
                      "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.18) },
                    }}
                  >
                    <ArrowBackIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="h5" fontWeight={700}>
                    Project Setup
                  </Typography>
                </Stack>

                <Divider sx={{ mb: 3 }} />

                <Stepper activeStep={active} alternativeLabel sx={{ mb: 3 }}>
                  {steps.map((label) => (
                    <Step key={label}>
                      <StepLabel>{label}</StepLabel>
                    </Step>
                  ))}
                </Stepper>

                <Box component="form" onSubmit={submit} noValidate autoComplete="off">
                  {active === 0 && (
                    <Stack spacing={3}>
                      <TextField
                        inputRef={nameRef}
                        label="Project Name"
                        placeholder="e.g. Product Launch Q4, Hiring Campaign, Facilities Renovation"
                        required
                        value={data.name}
                        onChange={(e) => setData("name", e.target.value)}
                        onBlur={() => setLocalErrors({ ...localErrors, name: v.name(data.name) })}
                        error={!!eFor("name")}
                        helperText={eFor("name") || `${data.name.length}/${NAME_MAX}`}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <TitleIcon fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                      />

                      <TextField
                        label="Project Key"
                        placeholder="ABC"
                        value={data.key}
                        onChange={(e) => {
                          setMeta("__keyTouched", true);
                          setData("key", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 12));
                        }}
                        onBlur={() => setLocalErrors({ ...localErrors, key: v.key(data.key) })}
                        error={!!eFor("key")}
                        helperText={eFor("key") || "Short uppercase identifier (e.g., CRM, LAUNCH, HR01)."}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <KeyIcon fontSize="small" />
                            </InputAdornment>
                          ),
                          inputProps: { style: { letterSpacing: "2px" } },
                        }}
                      />

                      <TextField
                        label="Short Description (optional)"
                        placeholder="Brief purpose, scope or goals…"
                        value={data.description}
                        onChange={(e) => setData("description", e.target.value)}
                        onBlur={() =>
                          setLocalErrors({ ...localErrors, description: v.description(data.description) })
                        }
                        error={!!eFor("description")}
                        helperText={eFor("description") || `${data.description.length}/${DESC_MAX} characters`}
                        multiline
                        minRows={3}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start" sx={{ alignSelf: "flex-start", mt: 1 }}>
                              <DescriptionIcon fontSize="small" sx={{ mt: "2px" }} />
                            </InputAdornment>
                          ),
                        }}
                      />
                    </Stack>
                  )}

                  {active === 1 && (
                    <Stack spacing={3}>
                      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <FormControl fullWidth>
                          <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 700 }}>
                            Project Type
                          </Typography>
                          <Select
                            value={data.meta.project_type}
                            onChange={(e) => setMeta("project_type", e.target.value)}
                            displayEmpty
                            startAdornment={
                              <InputAdornment position="start">
                                <CategoryIcon fontSize="small" />
                              </InputAdornment>
                            }
                          >
                            <MenuItem value="">
                              <em>Choose…</em>
                            </MenuItem>
                            {projectTypes.map((t) => (
                              <MenuItem key={t} value={t}>
                                {t}
                              </MenuItem>
                            ))}
                          </Select>
                          <FormHelperText>Select the closest category (any domain).</FormHelperText>
                        </FormControl>

                        <FormControl fullWidth>
                          <Typography variant="caption" sx={{ mb: 0.5, fontWeight: 700 }}>
                            Domain / Industry
                          </Typography>
                          <Select
                            value={data.meta.domain}
                            onChange={(e) => setMeta("domain", e.target.value)}
                            displayEmpty
                            startAdornment={
                              <InputAdornment position="start">
                                <InsightsIcon fontSize="small" />
                              </InputAdornment>
                            }
                          >
                            <MenuItem value="">
                              <em>Choose…</em>
                            </MenuItem>
                            {domains.map((d) => (
                              <MenuItem key={d} value={d}>
                                {d}
                              </MenuItem>
                            ))}
                          </Select>
                          <FormHelperText>Used to tailor AI suggestions.</FormHelperText>
                        </FormControl>
                      </Stack>

                      <TextField
                        label="Area / Program (optional)"
                        placeholder="e.g., North America Launch, Onboarding Revamp, Vendor Consolidation"
                        value={data.meta.area}
                        onChange={(e) => setMeta("area", e.target.value)}
                        fullWidth
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start">
                              <CategoryIcon fontSize="small" />
                            </InputAdornment>
                          ),
                        }}
                      />

                      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                          label="Location (optional)"
                          placeholder="e.g., Remote, NYC, EMEA"
                          value={data.meta.location}
                          onChange={(e) => setMeta("location", e.target.value)}
                          fullWidth
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <PlaceIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        />
                        <TextField
                          label="Budget (optional)"
                          placeholder="e.g., $25k–$40k"
                          value={data.meta.budget}
                          onChange={(e) => setMeta("budget", e.target.value)}
                          fullWidth
                        />
                      </Stack>

                      <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                        <TextField
                          type="date"
                          label="Start Date"
                          value={data.start_date}
                          onChange={(e) => setData("start_date", e.target.value)}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <EventIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                          error={!!eFor("start_date")}
                          helperText={eFor("start_date") || ""}
                        />
                        <TextField
                          type="date"
                          label="End Date"
                          value={data.end_date}
                          onChange={(e) => setData("end_date", e.target.value)}
                          onBlur={() => {
                            const msg = v.start_end(data.start_date, data.end_date);
                            if (msg) setLocalErrors({ ...localErrors, end_date: msg });
                            else setLocalErrors({ ...localErrors, end_date: "" });
                          }}
                          fullWidth
                          InputLabelProps={{ shrink: true }}
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <EventIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                          error={!!eFor("end_date")}
                          helperText={eFor("end_date") || ""}
                        />
                      </Stack>

                      <Box>
                        <Typography variant="caption" sx={{ mb: 1, display: "block", fontWeight: 700 }}>
                          Team Size
                        </Typography>
                        <Stack direction="row" spacing={2} alignItems="center">
                          <GroupsIcon sx={{ color: "text.secondary" }} />
                          <Slider
                            value={data.meta.team_size}
                            onChange={(_, val) => setMeta("team_size", Number(val))}
                            min={1}
                            max={100}
                            step={1}
                            sx={{ flexGrow: 1 }}
                          />
                          <Chip label={`${data.meta.team_size}`} size="small" />
                        </Stack>
                        <FormHelperText>
                          An estimate helps right-size suggested workflows.
                        </FormHelperText>
                      </Box>

                      <TextField
                        label="Primary Stakeholder (optional)"
                        placeholder="e.g., VP Marketing, Head of Ops, Project Sponsor"
                        value={data.meta.primary_stakeholder}
                        onChange={(e) => setMeta("primary_stakeholder", e.target.value)}
                        fullWidth
                      />
                    </Stack>
                  )}

                  {active === 2 && (
                    <Stack spacing={3}>
                      <TextField
                        label="Objectives (optional)"
                        placeholder="What outcomes define success? List bullets or a short paragraph…"
                        value={data.meta.objectives}
                        onChange={(e) => setMeta("objectives", e.target.value)}
                        fullWidth
                        multiline
                        minRows={4}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start" sx={{ alignSelf: "flex-start", mt: 1 }}>
                              <AutoAwesomeIcon fontSize="small" sx={{ mt: "2px" }} />
                            </InputAdornment>
                          ),
                        }}
                      />

                      <TextField
                        label="Constraints / Risks (optional)"
                        placeholder="Dependencies, compliance, seasonal limits, budget caps, resource constraints…"
                        value={data.meta.constraints}
                        onChange={(e) => setMeta("constraints", e.target.value)}
                        fullWidth
                        multiline
                        minRows={4}
                        InputProps={{
                          startAdornment: (
                            <InputAdornment position="start" sx={{ alignSelf: "flex-start", mt: 1 }}>
                              <WarningAmberIcon fontSize="small" sx={{ mt: "2px" }} />
                            </InputAdornment>
                          ),
                        }}
                      />

                      <Alert
                        severity="info"
                        icon={<AutoAwesomeIcon fontSize="small" />}
                        sx={{
                          borderRadius: 3,
                          bgcolor:
                            theme.palette.mode === "light"
                              ? alpha(theme.palette.info.light, 0.25)
                              : alpha(theme.palette.info.dark, 0.35),
                        }}
                      >
                        These notes are woven into the project context so your AI suggestions and reports are
                        hyper-relevant.
                      </Alert>
                    </Stack>
                  )}

                  {active === 3 && (
                    <Stack spacing={2.5}>
                      <Typography variant="h6" fontWeight={700}>Review</Typography>
                      <Divider />
                      <ReviewLine label="Name" value={data.name} />
                      <ReviewLine label="Key" value={data.key} />
                      <ReviewLine label="Description" value={data.description} />
                      <ReviewLine label="Type" value={data.meta.project_type} />
                      <ReviewLine label="Domain" value={data.meta.domain} />
                      <ReviewLine label="Area" value={data.meta.area} />
                      <ReviewLine label="Location" value={data.meta.location} />
                      <ReviewLine label="Team size" value={String(data.meta.team_size || "")} />
                      <ReviewLine label="Budget" value={data.meta.budget} />
                      <ReviewLine label="Stakeholder" value={data.meta.primary_stakeholder} />
                      <ReviewLine label="Start date" value={data.start_date} />
                      <ReviewLine label="End date" value={data.end_date} />
                      <ReviewLine label="Objectives" value={data.meta.objectives} />
                      <ReviewLine label="Constraints" value={data.meta.constraints} />
                    </Stack>
                  )}

                  <Divider sx={{ my: 3 }} />

                  <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" flexWrap="wrap">
                    <Button type="button" variant="text" color="inherit" onClick={() => router.visit("/projects")}>
                      Cancel
                    </Button>
                    <Stack direction="row" spacing={1.5}>
                      {active > 0 && (
                        <Button type="button" variant="outlined" onClick={back}>
                          Back
                        </Button>
                      )}
                      {active < steps.length - 1 ? (
                        <Button type="button" variant="contained" onClick={next}>
                          Continue
                        </Button>
                      ) : (
                        <Button
                          type="submit"
                          variant="contained"
                          startIcon={<SaveIcon />}
                          disabled={processing}
                          sx={{ textTransform: "none", fontWeight: 600, px: 3 }}
                        >
                          {processing ? "Creating..." : "Create Project"}
                        </Button>
                      )}
                    </Stack>
                  </Stack>
                </Box>
              </Paper>
            </Fade>
          </Container>
        </Box>
      </AuthenticatedLayout>
    </>
  );
}
