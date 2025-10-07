import React, { useEffect, useState } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import PauseRoundedIcon from '@mui/icons-material/PauseRounded';
import StopRoundedIcon from '@mui/icons-material/StopRounded';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

export default function AutopilotDock({ projectId, onOpen }) {
  const [enabled, setEnabled] = useState(false);
  const [step, setStep] = useState(null);
  const appUrl = (typeof window !== 'undefined' && window.Laravel && window.Laravel.appUrl) || (document.querySelector('meta[name="app-url"]')?.getAttribute('content')) || '';

  useEffect(() => {
    let timer;
    async function poll() {
      try {
        const res = await fetch(`${appUrl}/projects/${projectId}/autopilot/status`, { credentials: 'same-origin' });
        if (res.ok) {
          const data = await res.json();
          // status endpoint may return raw or wrapped; normalize
          const enabledNow = !!(data && (data.enabled || data.autopilot_enabled));
          const s = data.step || (data.status && data.status.step) || null;
          setEnabled(enabledNow);
          setStep(s);
        }
      } catch (e) { /* noop */ }
      timer = setTimeout(poll, 10000);
    }
    if (projectId) poll();
    return () => timer && clearTimeout(timer);
  }, [projectId]);

  if (!enabled) return null;

  const label = step
    ? (step === 'done' ? 'Standby' : step.replace(/_/g, ' '))
    : 'Standby';

  async function stopAutopilot(e){
    e.stopPropagation();
    try{
      const res = await fetch(`${appUrl}/projects/${projectId}/autopilot/stop`, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '',
          'Accept': 'application/json'
        }
      });
      if(res.ok){ setEnabled(false); }
    }catch(err){ /* no-op */ }
  }

  return (
    <Box
      onClick={onOpen}
      role="button"
      aria-label="Open AI Autopilot"
      sx={{
        position: 'fixed',
        left: '50%',
        bottom: 22,
        transform: 'translateX(-50%)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        gap: 1.25,
        px: 2.5,
        py: 1.25,
        borderRadius: 2,
        cursor: 'pointer',
        backdropFilter: 'blur(12px)',
        background: 'rgba(15,23,42,0.55)', // slate-900 55%
        color: '#fff',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 10px 30px rgba(0,0,0,0.35)',
      }}
    >
      <Box
        sx={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(45deg,#FF6B35,#F7931E)',
          boxShadow: '0 0 0 3px rgba(255,255,255,0.08) inset',
        }}
      >
        <AutoAwesomeIcon sx={{ fontSize: 18, color: '#fff' }} />
      </Box>
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        AI Autopilot — {label}
      </Typography>
      <Box sx={{
        ml: 1,
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: '#22c55e',
        boxShadow: '0 0 0 4px rgba(34,197,94,0.18)'
      }} />

      {/* Controls (stop/pause) */}
      <Box sx={{ display: 'flex', ml: 1 }} onClick={(e)=> e.stopPropagation()}>
        {/* Optional: pause wiring could be added later */}
        {/* <Tooltip title="Pause">
          <IconButton size="small" sx={{ color: '#fff', opacity: 0.85 }} onClick={(e)=> e.stopPropagation()}>
            <PauseRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip> */}
        <Tooltip title="Stop Autopilot">
          <IconButton size="small" sx={{ color: '#fff', opacity: 0.9 }} onClick={stopAutopilot}>
            <StopRoundedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}
