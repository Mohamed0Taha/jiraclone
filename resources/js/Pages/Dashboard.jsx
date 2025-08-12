// resources/js/Pages/Dashboard.jsx
import React, { useMemo, useState } from "react";
import { Head, router } from "@inertiajs/react";
import AuthenticatedLayout from "@/Layouts/AuthenticatedLayout";
import {
  alpha,
  Box,
  Button,
  Chip,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  IconButton,
  InputAdornment,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import SortIcon from "@mui/icons-material/Sort";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import ProjectAccordion from "./ProjectAccordion";

const useRowColor = () => {
  const theme = useTheme();
  const basePalette = [
    theme.palette.primary.light,
    theme.palette.secondary.light,
    theme.palette.success.light,
    theme.palette.info.light,
    theme.palette.warning.light,
    theme.palette.error.light,
  ];
  return (index) => {
    const c = basePalette[index % basePalette.length];
    return {
      bgcolor: alpha(c, 0.16),
      transition: "background-color .25s, transform .25s",
      "&:hover": { bgcolor: alpha(c, 0.30) },
      "&:focus-within": {
        outline: `2px solid ${alpha(c, 0.7)}`,
        outlineOffset: 2,
      },
    };
  };
};

export default function Dashboard({ auth, projects }) {
  const theme = useTheme();
  const rowSx = useRowColor();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  const askDelete = (e, project) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    setProjectToDelete(project);
    setConfirmOpen(true);
  };
  const confirmDelete = () => {
    if (projectToDelete) {
      router.delete(`/projects/${projectToDelete.id}`, { preserveScroll: true });
    }
    setConfirmOpen(false);
    setProjectToDelete(null);
  };

  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("recent");

  const filtered = useMemo(() => {
    let list = Array.isArray(projects) ? [...projects] : [];

    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.key || "").toLowerCase().includes(q) ||
          (p.description || "").toLowerCase().includes(q)
      );
    }

    switch (sort) {
      case "name_asc":
        list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
        break;
      case "name_desc":
        list.sort((a, b) => (b.name || "").localeCompare(a.name || ""));
        break;
      case "recent":
      default:
        list.sort((a, b) => {
          if (a.created_at && b.created_at) {
            return new Date(b.created_at) - new Date(a.created_at);
          }
          return (b.id || 0) - (a.id || 0);
        });
    }
    return list;
  }, [projects, query, sort]);

  const projectCount = Array.isArray(projects) ? projects.length : 0;
  const filteredCount = filtered.length;

  return (
    <>
      <Head title="Dashboard" />

      <AuthenticatedLayout user={auth.user}>
        {/* Hero header */}
        <Box
          sx={{
            background: `linear-gradient(115deg, ${alpha(
              theme.palette.primary.main,
              0.85
            )} 0%, ${alpha(theme.palette.secondary.main, 0.85)} 60%, ${alpha(
              theme.palette.primary.dark,
              0.9
            )} 100%)`,
            color: "#fff",
            pt: { xs: 6, md: 8 },
            pb: { xs: 6, md: 9 },
            position: "relative",
            overflow: "hidden",
          }}
        >
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              width: 420,
              height: 420,
              top: -120,
              right: -80,
              borderRadius: "50%",
              filter: "blur(80px)",
              background: alpha("#ffffff", 0.15),
            }}
          />
          <Box
            aria-hidden
            sx={{
              position: "absolute",
              width: 300,
              height: 300,
              bottom: -100,
              left: -60,
              borderRadius: "50%",
              filter: "blur(70px)",
              background: alpha("#ffffff", 0.12),
            }}
          />
          <Container maxWidth="lg" sx={{ position: "relative" }}>
            <Stack
              direction={{ xs: "column", md: "row" }}
              spacing={4}
              alignItems={{ xs: "flex-start", md: "center" }}
              justifyContent="space-between"
            >
              <Box maxWidth={720}>
                <Typography
                  variant="h3"
                  component="h1"
                  fontWeight={700}
                  sx={{
                    letterSpacing: "-0.5px",
                    textShadow: "0 4px 22px rgba(0,0,0,0.25)",
                  }}
                >
                  Welcome back, {auth.user?.name || "Explorer"}!
                </Typography>
                <Typography
                  variant="h6"
                  sx={{
                    mt: 2,
                    fontWeight: 400,
                    color: alpha("#fff", 0.92),
                    maxWidth: 640,
                  }}
                >
                  Track, explore and grow your projects. Everything you need is a
                  glance away. Let&apos;s build something remarkable today.
                </Typography>
                <Stack direction="row" spacing={1.5} mt={3} flexWrap="wrap">
                  <Chip
                    icon={<AutoAwesomeIcon />}
                    label={`${projectCount} Project${projectCount === 1 ? "" : "s"}`}
                    sx={{
                      bgcolor: alpha("#fff", 0.15),
                      color: "#fff",
                      "& .MuiChip-icon": { color: "#fff" },
                      backdropFilter: "blur(4px)",
                    }}
                  />
                  <Chip
                    label={query ? `Showing ${filteredCount}` : `All ${projectCount}`}
                    sx={{
                      bgcolor: alpha("#000", 0.25),
                      color: "#fff",
                      backdropFilter: "blur(4px)",
                    }}
                  />
                </Stack>
              </Box>

              <Stack direction="row" spacing={2}>
                <Button
                  variant="contained"
                  color="secondary"
                  startIcon={<AddIcon />}
                  href="/projects/create"
                  size="large"
                  sx={{
                    textTransform: "none",
                    fontWeight: 600,
                    boxShadow: "0 8px 24px -6px rgba(0,0,0,.35)",
                  }}
                >
                  New Project
                </Button>
              </Stack>
            </Stack>
          </Container>
        </Box>

        {/* Main content */}
        <Box sx={{ py: { xs: 4, md: 6 }, bgcolor: "background.default", minHeight: "60vh" }}>
          <Container maxWidth="lg">
            <Stack spacing={4}>
              {/* Filter + Sort Bar */}
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2, md: 3 },
                  border: `1px solid ${alpha(theme.palette.divider, 0.7)}`,
                  borderRadius: 4,
                  background:
                    theme.palette.mode === "light"
                      ? "linear-gradient(180deg,#fff, #fcfcfd)"
                      : alpha(theme.palette.background.paper, 0.6),
                  backdropFilter: "blur(6px)",
                }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2.5}
                  alignItems={{ xs: "stretch", md: "center" }}
                  justifyContent="space-between"
                >
                  <TextField
                    fullWidth
                    label="Search projects"
                    placeholder="Search by name, key or description..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    }}
                    sx={{ maxWidth: 480 }}
                  />

                  <Stack
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    justifyContent={{ xs: "space-between", md: "flex-end" }}
                  >
                    <Box display="flex" alignItems="center" gap={1.2}>
                      <SortIcon fontSize="small" color="action" />
                      <Select
                        size="small"
                        value={sort}
                        onChange={(e) => setSort(e.target.value)}
                        sx={{ minWidth: 180 }}
                        displayEmpty
                        aria-label="Sort projects"
                      >
                        <MenuItem value="recent">Most Recent</MenuItem>
                        <MenuItem value="name_asc">Name (A → Z)</MenuItem>
                        <MenuItem value="name_desc">Name (Z → A)</MenuItem>
                      </Select>
                    </Box>
                    <Divider flexItem orientation="vertical" sx={{ display: { xs: "none", md: "block" } }} />
                    <Tooltip title="Create a new project">
                      <Button variant="outlined" startIcon={<AddIcon />} href="/projects/create" sx={{ textTransform: "none" }}>
                        Add
                      </Button>
                    </Tooltip>
                  </Stack>
                </Stack>
              </Paper>

              {/* Projects Section */}
              <Paper
                elevation={0}
                sx={{
                  p: { xs: 2.5, md: 4 },
                  border: `1px solid ${alpha(theme.palette.divider, 0.8)}`,
                  borderRadius: 4,
                  background:
                    theme.palette.mode === "light"
                      ? "linear-gradient(180deg,#ffffff,#f8f9fb)"
                      : alpha(theme.palette.background.paper, 0.75),
                  backdropFilter: "blur(4px)",
                }}
              >
                <Stack
                  direction={{ xs: "column", sm: "row" }}
                  spacing={2}
                  justifyContent="space-between"
                  alignItems={{ xs: "flex-start", sm: "center" }}
                  mb={3}
                >
                  <Box>
                    <Typography variant="h5" fontWeight={600} sx={{ letterSpacing: "-0.5px" }}>
                      Your Projects
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                      {filteredCount === 0
                        ? "No projects match your current filters."
                        : `Showing ${filteredCount} project${filteredCount === 1 ? "" : "s"}`}
                    </Typography>
                  </Box>
                  {query && (
                    <Button size="small" variant="text" onClick={() => setQuery("")} sx={{ textTransform: "none" }}>
                      Clear search
                    </Button>
                  )}
                </Stack>

                {projectCount === 0 ? (
                  <EmptyState />
                ) : filteredCount === 0 ? (
                  <FilteredEmptyState reset={() => setQuery("")} />
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 1.5,
                      "& > *": {
                        opacity: 0,
                        transform: "translateY(8px)",
                        animation: "fadeSlide 0.55s ease forwards",
                      },
                      "& > *:nth-of-type(1)": { animationDelay: "0.02s" },
                      "& > *:nth-of-type(2)": { animationDelay: "0.04s" },
                      "& > *:nth-of-type(3)": { animationDelay: "0.06s" },
                      "& > *:nth-of-type(4)": { animationDelay: "0.08s" },
                      "@keyframes fadeSlide": {
                        to: { opacity: 1, transform: "translateY(0)" },
                      },
                    }}
                  >
                    {filtered.map((p, idx) => (
                      <ProjectAccordion
                        key={p.id}
                        project={p}
                        rowSx={rowSx(idx)}
                        onDelete={askDelete}
                        endActions={
                          <Stack direction="row" spacing={0.5}>
                            <Tooltip title="Edit project">
                              <IconButton
                                size="small"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  router.visit(`/projects/${p.id}/edit`);
                                }}
                                aria-label={`Edit project ${p.name}`}
                                sx={{
                                  color: "rgba(36,58,99,0.75)",
                                  "&:hover": { color: "rgba(36,58,99,0.95)" },
                                }}
                              >
                                <EditRoundedIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>

                            <Tooltip title="Delete project">
                              <IconButton
                                size="small"
                                color="error"
                                aria-label={`Delete project ${p.name}`}
                                onClick={(e) => askDelete(e, p)}
                                sx={{
                                  opacity: 0.8,
                                  transition: "opacity .2s",
                                  "&:hover": { opacity: 1 },
                                }}
                              >
                                <DeleteForeverIcon fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          </Stack>
                        }
                      />
                    ))}
                  </Box>
                )}
              </Paper>
            </Stack>
          </Container>
        </Box>
      </AuthenticatedLayout>

      {/* Delete confirmation dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} aria-labelledby="delete-project-title">
        <DialogTitle id="delete-project-title" sx={{ fontWeight: 600 }}>
          Delete Project
        </DialogTitle>
        <DialogContent dividers>
          <DialogContentText component="div" sx={{ lineHeight: 1.6 }}>
            {projectToDelete ? (
              <>
                Are you sure you want to permanently delete <strong>{projectToDelete.name}</strong>? This action cannot be
                undone and may impact related issues or references.
              </>
            ) : (
              "Are you sure?"
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} sx={{ textTransform: "none" }}>
            Cancel
          </Button>
          <Button variant="contained" color="error" onClick={confirmDelete} sx={{ textTransform: "none" }}>
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

function EmptyState() {
  return (
    <Box sx={{ py: 8, px: 2, textAlign: "center", color: "text.secondary" }}>
      <Box
        sx={{
          mx: "auto",
          width: 120,
          height: 120,
          mb: 3,
          borderRadius: "50%",
          background: "radial-gradient(circle at 30% 30%, rgba(0,0,0,0.05), transparent 60%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 46,
          opacity: 0.7,
        }}
        aria-hidden
      >
        🧭
      </Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        You have no projects yet
      </Typography>
      <Typography variant="body2" sx={{ maxWidth: 480, mx: "auto" }}>
        Get started by creating your first project. Organize work, track issues, and collaborate efficiently.
      </Typography>
      <Button href="/projects/create" variant="contained" startIcon={<AddIcon />} sx={{ mt: 4, textTransform: "none", fontWeight: 600 }}>
        Create your first project
      </Button>
    </Box>
  );
}

function FilteredEmptyState({ reset }) {
  return (
    <Box sx={{ py: 7, px: 2, textAlign: "center", color: "text.secondary" }}>
      <Box
        sx={{
          mx: "auto",
          width: 110,
          height: 110,
          mb: 3,
          borderRadius: "24px",
          background: "linear-gradient(145deg, rgba(0,0,0,0.05), transparent 70%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 40,
          opacity: 0.75,
        }}
        aria-hidden
      >
        🔍
      </Box>
      <Typography variant="h6" fontWeight={600} gutterBottom>
        No matching projects
      </Typography>
      <Typography variant="body2" sx={{ maxWidth: 480, mx: "auto" }}>
        Try adjusting your search terms or reset the filters to view all projects again.
      </Typography>
      <Button onClick={reset} variant="outlined" sx={{ mt: 3, textTransform: "none" }}>
        Reset filters
      </Button>
    </Box>
  );
}
