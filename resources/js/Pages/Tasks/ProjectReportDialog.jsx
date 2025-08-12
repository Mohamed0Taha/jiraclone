import React, { useEffect, useState } from "react";
import {
  Alert, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogTitle,
  Divider, LinearProgress, Stack, Typography, alpha
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import PictureAsPdfRoundedIcon from "@mui/icons-material/PictureAsPdfRounded";
import RefreshRoundedIcon from "@mui/icons-material/RefreshRounded";

/** Read XSRF-TOKEN cookie (Laravel sets this on web routes). */
function getXsrfTokenFromCookie() {
  // cookie is NOT httpOnly by design so JS can read it
  const name = "XSRF-TOKEN=";
  const cookies = document.cookie ? document.cookie.split("; ") : [];
  for (const c of cookies) {
    if (c.startsWith(name)) {
      // cookie is URL-encoded by Laravel; decode it for the header value
      return decodeURIComponent(c.substring(name.length));
    }
  }
  return null;
}

export default function ProjectReportDialog({ open, onClose, project, tasks }) {
  const totals = {
    todo: tasks?.todo?.length || 0,
    inprogress: tasks?.inprogress?.length || 0,
    review: tasks?.review?.length || 0,
    done: tasks?.done?.length || 0,
  };
  const total = totals.todo + totals.inprogress + totals.review + totals.done;
  const pct = total === 0 ? 0 : Math.round(((totals.done || 0) / total) * 100);

  const [loading, setLoading] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setLoading(false);
      setDownloadUrl(null);
      setSummary(null);
      setError(null);
    }
  }, [open]);

  const generate = async () => {
    if (!project?.id) return;
    setLoading(true);
    setError(null);
    setDownloadUrl(null);
    setSummary(null);

    try {
      const xsrf = getXsrfTokenFromCookie();
      if (!xsrf) {
        throw new Error(
          "Missing XSRF-TOKEN cookie. Make sure this route is on the 'web' middleware and you are logged in."
        );
      }

      const res = await fetch(route("projects.report.generate", project.id), {
        method: "POST",
        credentials: "same-origin", // include Laravel session cookie
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "X-Requested-With": "XMLHttpRequest",
          // Laravel accepts either X-CSRF-TOKEN (session) or X-XSRF-TOKEN (cookie)
          "X-XSRF-TOKEN": xsrf,
        },
        body: JSON.stringify({}), // keep body so some proxies don’t drop headers
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setDownloadUrl(json.download_url);
      setSummary(json.summary);
    } catch (e) {
      setError(e.message || "Failed to generate report.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 800 }}>
        Project Report — {project?.name}
      </DialogTitle>

      <DialogContent dividers sx={{ position: "relative", pb: 2.5 }}>
        {loading && (
          <LinearProgress
            sx={{
              position: "absolute",
              left: 0,
              top: 0,
              width: "100%",
              borderTopLeftRadius: 12,
              borderTopRightRadius: 12,
            }}
          />
        )}

        <Stack spacing={1.2} sx={{ mb: 1.5 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap" rowGap={1}>
            <Chip
              label={`${total} Tasks`}
              icon={<AutoAwesomeIcon />}
              sx={{
                fontWeight: 700,
                bgcolor: (t) => alpha(t.palette.primary.main, 0.08),
                border: (t) => `1px solid ${alpha(t.palette.primary.main, 0.25)}`,
              }}
            />
            <Chip
              label={`${pct}% Complete`}
              sx={{
                fontWeight: 700,
                bgcolor: (t) => alpha(t.palette.success.main, 0.12),
                border: (t) => `1px solid ${alpha(t.palette.success.main, 0.35)}`,
              }}
            />
            <Chip label={`To-do: ${totals.todo}`}            sx={{ bgcolor: alpha("#64748B", 0.08) }} />
            <Chip label={`In-progress: ${totals.inprogress}`} sx={{ bgcolor: alpha("#3B82F6", 0.08) }} />
            <Chip label={`Review: ${totals.review}`}         sx={{ bgcolor: alpha("#A855F7", 0.08) }} />
            <Chip label={`Done: ${totals.done}`}             sx={{ bgcolor: alpha("#22C55E", 0.1) }} />
          </Stack>

          {total === 0 && (
            <Alert severity="info">
              No tasks yet. The AI report will still summarise project meta, but
              adding a few tasks makes it richer.
            </Alert>
          )}
        </Stack>

        <Divider sx={{ my: 1.5 }} />

        {summary ? (
          <Box sx={{ mt: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 0.5 }}>
              Executive summary
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
              {summary}
            </Typography>
          </Box>
        ) : (
          <Typography variant="body2" sx={{ opacity: 0.75 }}>
            Generate an AI report that synthesizes project meta (type, domain,
            team size, dates) and task progress into a concise PDF you can share
            with stakeholders.
          </Typography>
        )}

        {error && (
          <Alert sx={{ mt: 1.5 }} severity="error">
            {error}
          </Alert>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 2.5, py: 2 }}>
        <Button onClick={onClose}>Close</Button>
        {!downloadUrl ? (
          <Button
            onClick={generate}
            disabled={loading}
            variant="contained"
            startIcon={<AutoAwesomeIcon />}
            sx={{ textTransform: "none", fontWeight: 800, px: 2.2 }}
          >
            {loading ? "Generating…" : "Generate AI Report"}
          </Button>
        ) : (
          <Stack direction="row" spacing={1}>
            <Button
              component="a"
              href={downloadUrl}
              target="_blank"
              rel="noopener"
              variant="outlined"
              startIcon={<PictureAsPdfRoundedIcon />}
              sx={{ textTransform: "none", fontWeight: 700 }}
            >
              View PDF
            </Button>
            <Button
              onClick={generate}
              startIcon={<RefreshRoundedIcon />}
              variant="text"
              sx={{ textTransform: "none", fontWeight: 600 }}
            >
              Regenerate
            </Button>
          </Stack>
        )}
      </DialogActions>
    </Dialog>
  );
}
