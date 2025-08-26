import React, { useEffect, useState, useRef } from 'react';
import {
    Alert,
    Box,
    Button,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    LinearProgress,
    Stack,
    Typography,
    alpha,
} from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PictureAsPdfRoundedIcon from '@mui/icons-material/PictureAsPdfRounded';
import RefreshRoundedIcon from '@mui/icons-material/RefreshRounded';

/** Read XSRF-TOKEN cookie (Laravel sets this on web routes). */
function getXsrfTokenFromCookie() {
    const name = 'XSRF-TOKEN=';
    const cookies = document.cookie ? document.cookie.split('; ') : [];
    for (const c of cookies) {
        if (c.startsWith(name)) {
            return decodeURIComponent(c.substring(name.length));
        }
    }
    return null;
}

/** Cryptographically strong nonce to bust any caching & signal regeneration intention. */
function makeNonce(bytes = 16) {
    const arr = new Uint8Array(bytes);
    window.crypto.getRandomValues(arr);
    return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
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
    const [quota, setQuota] = useState(null); // { used, limit, remaining }

    // Keep a ref of the latest in-flight controller to cancel when re-generating.
    const controllerRef = useRef(null);

    useEffect(() => {
        if (open) {
            setLoading(false);
            setDownloadUrl(null);
            setSummary(null);
            setError(null);
            // Fetch initial quota when dialog opens
            fetchQuota();
        }
        // Cleanup on unmount: abort any in-flight request.
        return () => {
            if (controllerRef.current) {
                controllerRef.current.abort();
                controllerRef.current = null;
            }
        };
    }, [open]);

    const fetchQuota = async () => {
        try {
            const response = await fetch(route('api.usage-summary'), {
                method: 'GET',
                credentials: 'same-origin',
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
            });
            
            if (response.ok) {
                const data = await response.json();
                setQuota(data.reports);
            }
        } catch (e) {
            // Silently fail quota fetch - user can still generate reports
        }
    };

    const generate = async () => {
        if (!project?.id || loading) return;

        // Abort any previous in-flight request just in case.
        if (controllerRef.current) {
            try {
                controllerRef.current.abort();
            } catch (_) {
                // ignore
            }
            controllerRef.current = null;
        }

        setLoading(true);
        setError(null);
        setDownloadUrl(null);
        setSummary(null);

        // New controller + a manual timeout to avoid "loading forever"
        const controller = new AbortController();
        controllerRef.current = controller;
        const timeoutMs = 90000; // 90s safety timeout; adjust as appropriate
        const timeoutId = setTimeout(() => {
            try {
                controller.abort();
            } catch (_) {
                // ignore
            }
        }, timeoutMs);

        try {
            const xsrf = getXsrfTokenFromCookie();
            if (!xsrf) {
                throw new Error(
                    "Missing XSRF-TOKEN cookie. Make sure this route is on the 'web' middleware and you are logged in."
                );
            }

            const nonce = makeNonce();
            const baseUrl = route('projects.report.generate', project.id);
            const url = `${baseUrl}?force=1&nonce=${nonce}&t=${Date.now()}`;

            const res = await fetch(url, {
                method: 'POST',
                credentials: 'same-origin',
                cache: 'no-store',
                signal: controller.signal,
                headers: {
                    Accept: 'application/json',
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-XSRF-TOKEN': xsrf,
                    'Cache-Control': 'no-store, no-cache, must-revalidate',
                    Pragma: 'no-cache',
                },
                body: JSON.stringify({
                    force: true,
                    nonce,
                    totals: { ...totals, total, pct },
                    generated_at: new Date().toISOString(),
                }),
            });

            if (!res.ok) {
                // try to read error body for better context
                let serverMsg = '';
                try {
                    const maybeJson = await res.json();
                    serverMsg =
                        typeof maybeJson?.message === 'string' ? ` — ${maybeJson.message}` : '';
                } catch (_) {
                    // ignore parse errors
                }
                throw new Error(`HTTP ${res.status}${serverMsg}`);
            }

            const json = await res.json();

            const stampedUrl =
                json.download_url != null
                    ? `${json.download_url}${json.download_url.includes('?') ? '&' : '?'}t=${Date.now()}&nonce=${nonce}`
                    : null;

            setDownloadUrl(stampedUrl);
            setSummary(json.summary ?? '');
            if (json.reports) {
                setQuota(json.reports);
            }
        } catch (e) {
            if (e?.name === 'AbortError') {
                setError('The report generation took too long and was canceled. Please try again.');
            } else {
                setError(e?.message || 'Failed to generate report.');
            }
        } finally {
            clearTimeout(timeoutId);
            // Always stop loading; previous version gated this which could leave the spinner on forever.
            setLoading(false);
            // Clear controllerRef if this request is the one we created
            if (controllerRef.current === controller) {
                controllerRef.current = null;
            }
        }
    };

    const remaining = quota?.remaining;
    const limit = quota?.limit;
    const used = quota?.used;
    const noRemaining = typeof remaining === 'number' && remaining <= 0;

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle sx={{ fontWeight: 800 }}>Project Report — {project?.name}</DialogTitle>

            <DialogContent dividers sx={{ position: 'relative', pb: 2.5 }}>
                {loading && (
                    <LinearProgress
                        sx={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            width: '100%',
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
                        <Chip
                            label={`To-do: ${totals.todo}`}
                            sx={{ bgcolor: alpha('#64748B', 0.08) }}
                        />
                        <Chip
                            label={`In-progress: ${totals.inprogress}`}
                            sx={{ bgcolor: alpha('#3B82F6', 0.08) }}
                        />
                        <Chip
                            label={`Review: ${totals.review}`}
                            sx={{ bgcolor: alpha('#A855F7', 0.08) }}
                        />
                        <Chip
                            label={`Done: ${totals.done}`}
                            sx={{ bgcolor: alpha('#22C55E', 0.1) }}
                        />
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
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
                            {summary}
                        </Typography>
                    </Box>
                ) : (
                    <Typography variant="body2" sx={{ opacity: 0.75 }}>
                        Generate an AI report that synthesizes project meta (type, domain, team
                        size, dates) and task progress into a concise PDF you can share with
                        stakeholders.
                    </Typography>
                )}

                {error && (
                    <Alert sx={{ mt: 1.5 }} severity="error">
                        {error}
                    </Alert>
                )}

                {quota && (
                    <Box sx={{ mt: 1.5 }}>
                        <Alert severity={noRemaining ? 'warning' : 'info'} sx={{ alignItems: 'center' }}>
                            {noRemaining ? (
                                <><strong>Report quota reached.</strong> You've used {used} of {limit} this period. Upgrade your plan to unlock more reports.</>
                            ) : (
                                <>Reports remaining this period: <strong>{remaining}</strong> (used {used} of {limit}).</>
                            )}
                        </Alert>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 2.5, py: 2 }}>
                <Button onClick={onClose}>Close</Button>
                {!downloadUrl ? (
                    <Button
                        onClick={generate}
                        disabled={loading || noRemaining}
                        variant="contained"
                        startIcon={<AutoAwesomeIcon />}
                        sx={{ textTransform: 'none', fontWeight: 800, px: 2.2 }}
                    >
                        {loading ? 'Generating…' : noRemaining ? 'Quota Reached' : 'Generate AI Report'}
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
                            sx={{ textTransform: 'none', fontWeight: 700 }}
                        >
                            View PDF
                        </Button>
                        <Button
                            onClick={generate}
                            startIcon={<RefreshRoundedIcon />}
                            variant="text"
                            disabled={loading || noRemaining}
                            sx={{ textTransform: 'none', fontWeight: 600 }}
                        >
                            {noRemaining ? 'Quota Reached' : 'Regenerate'}
                        </Button>
                    </Stack>
                )}
            </DialogActions>
        </Dialog>
    );
}
