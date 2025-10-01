import React, { useState, useCallback, useEffect } from 'react';
import { Box, Paper, CircularProgress, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Button, Typography } from '@mui/material';
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import MicroAppWrapper from '../components/MicroAppWrapper';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import InputModal from '../components/InputModal';
import { csrfFetch, withCsrf } from '@/utils/csrf';

// Enhanced calendar styles
const calendarStyles = `
  .calendar-container .rbc-month-view {
    border-radius: 8px;
    overflow: hidden;
  }
  
  .calendar-container .rbc-header {
    padding: 12px 8px;
    font-weight: 600;
    font-size: 0.875rem;
    border-bottom: 2px solid;
  }
  
  [data-theme="dark"] .calendar-container .rbc-header {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.15) 0%, rgba(118, 75, 162, 0.15) 100%);
    border-color: rgba(255, 255, 255, 0.1);
    color: #e0e0e0;
  }
  
  [data-theme="light"] .calendar-container .rbc-header {
    background: linear-gradient(135deg, rgba(102, 126, 234, 0.08) 0%, rgba(118, 75, 162, 0.08) 100%);
    border-color: rgba(0, 0, 0, 0.08);
    color: #424242;
  }
  
  .calendar-container .rbc-today {
    background-color: rgba(102, 126, 234, 0.08);
  }
  
  [data-theme="dark"] .calendar-container .rbc-today {
    background-color: rgba(102, 126, 234, 0.12);
  }
  
  .calendar-container .rbc-off-range-bg {
    opacity: 0.3;
  }
  
  .calendar-container .rbc-event {
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .calendar-container .rbc-event:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25) !important;
  }
  
  .calendar-container .rbc-day-bg:hover {
    background-color: rgba(102, 126, 234, 0.05);
  }
  
  [data-theme="dark"] .calendar-container .rbc-day-bg:hover {
    background-color: rgba(102, 126, 234, 0.08);
  }
  
  .calendar-container .rbc-date-cell {
    padding: 6px;
    font-weight: 500;
  }
  
  .calendar-container .rbc-current {
    color: #667eea;
    font-weight: 700;
  }
  
  .calendar-container .rbc-agenda-view {
    border-radius: 8px;
    overflow: hidden;
  }
  
  .calendar-container .rbc-agenda-table {
    border-radius: 8px;
  }
  
  [data-theme="dark"] .calendar-container .rbc-agenda-date-cell,
  [data-theme="dark"] .calendar-container .rbc-agenda-time-cell {
    background: rgba(255, 255, 255, 0.05);
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleId = 'calendar-enhanced-styles';
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = calendarStyles;
    document.head.appendChild(style);
  }
}

const toIsoString = (value) => {
  try {
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) {
      throw new Error('Invalid date');
    }
    return date.toISOString();
  } catch (error) {
    return new Date().toISOString();
  }
};

// Generate a stable color from event identity for distinct coloring
const getEventColor = (event, isDark) => {
  try {
    const key = String(event?.google_event_id ?? event?.id ?? event?.title ?? 'event');
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      hash = ((hash << 5) - hash) + key.charCodeAt(i);
      hash |= 0; // Convert to 32bit int
    }
    const hue = Math.abs(hash) % 360;
    const sat = isDark ? 65 : 75; // More vibrant
    const light = isDark ? 45 : 50; // Better contrast
    return `hsl(${hue}, ${sat}%, ${light}%)`;
  } catch (_) {
    return isDark ? '#394b59' : '#1976d2';
  }
};

const sanitizeEventForStorage = (event) => {
  const startIso = toIsoString(event?.start ?? Date.now());
  const endIso = toIsoString(event?.end ?? event?.start ?? Date.now());

  const description = event?.description ?? event?.desc ?? null;
  const desc = event?.desc ?? event?.description ?? null;

  return {
    ...event,
    start: startIso,
    end: endIso,
    allDay: Boolean(event?.allDay),
    source: event?.source ?? 'local',
    google_event_id: event?.google_event_id ?? null,
    description,
    desc,
  };
};
// Custom toolbar component with modern styling
const CalendarToolbar = ({
  label,
  onNavigate,
  onView,
  view,
  onAddEvent,
  onSync,
  syncing,
  onConnect,
  isConnected,
  checkingConnection,
}) => {
  const isDark = document.body.getAttribute('data-theme') === 'dark';
  const buttonStyle = {
    color: isDark ? '#e0e0e0' : '#424242',
    backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
    border: '1px solid',
    borderColor: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
    margin: '0 4px',
    padding: '6px 14px',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: 500,
    fontSize: '0.875rem',
    transition: 'all 0.2s ease',
  };
  const activeStyle = {
    ...buttonStyle,
    background: isDark 
      ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
      : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    color: '#ffffff',
    borderColor: 'transparent',
    fontWeight: 600,
    boxShadow: isDark
      ? '0 4px 12px rgba(102, 126, 234, 0.4)'
      : '0 4px 12px rgba(102, 126, 234, 0.3)',
  };
  const addButtonStyle = {
    ...buttonStyle,
    background: isDark
      ? 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)'
      : 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
    color: '#ffffff',
    borderColor: 'transparent',
    fontWeight: 600,
    padding: '8px 16px',
    marginLeft: '12px',
    boxShadow: isDark
      ? '0 4px 12px rgba(17, 153, 142, 0.4)'
      : '0 4px 12px rgba(17, 153, 142, 0.3)',
  };

  const syncButtonStyle = {
    ...buttonStyle,
    background: isDark
      ? 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)'
      : 'linear-gradient(135deg, #4285f4 0%, #34a853 100%)',
    color: '#ffffff',
    borderColor: 'transparent',
    fontWeight: 600,
    padding: '8px 16px',
    marginLeft: '12px',
    boxShadow: isDark
      ? '0 4px 12px rgba(66, 133, 244, 0.4)'
      : '0 4px 12px rgba(66, 133, 244, 0.3)',
  };

  const resolvedConnected = isConnected === true;
  const syncHandler = resolvedConnected ? () => onSync(true) : onConnect;
  const hasSyncAction = typeof syncHandler === 'function';
  const disabled = checkingConnection || (resolvedConnected && syncing);
  const syncLabel = checkingConnection
    ? 'Checking…'
    : resolvedConnected
      ? (syncing ? 'Syncing…' : 'Sync Google')
      : 'Connect Google';

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px',
      padding: '12px 16px',
      background: isDark 
        ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
        : 'linear-gradient(135deg, rgba(0,0,0,0.02) 0%, rgba(0,0,0,0.01) 100%)',
      borderRadius: '12px',
      border: '1px solid',
      borderColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <button type="button" onClick={() => onNavigate('TODAY')} style={buttonStyle}>
          Today
        </button>
        <button type="button" onClick={() => onNavigate('PREV')} style={buttonStyle}>
          ❮
        </button>
        <button type="button" onClick={() => onNavigate('NEXT')} style={buttonStyle}>
          ❯
        </button>
        <button type="button" onClick={onAddEvent} style={addButtonStyle}>
          + Add Event
        </button>
        {hasSyncAction && (
          <button
            type="button"
            onClick={syncHandler}
            disabled={disabled}
            style={{
              ...syncButtonStyle,
              opacity: disabled ? 0.6 : 1,
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            {syncLabel}
          </button>
        )}
      </div>
      <span style={{ 
        fontWeight: 700,
        fontSize: '1.125rem',
        background: isDark
          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
          : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
      }}>{label}</span>
      <div>
        {['month', 'week', 'day', 'agenda'].map((name) => (
          <button
            key={name}
            type="button"
            style={view === name ? activeStyle : buttonStyle}
            onClick={() => onView(name)}
          >
            {name.charAt(0).toUpperCase() + name.slice(1)}
          </button>
        ))}
      </div>
    </div>
  );
};

// Import the required locale
import enUS from 'date-fns/locale/en-US';

// Setup the localizer by providing the date-fns functions
const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }),
  getDay,
  locales,
});

function CalendarBody({
  state,
  setState,
  isLoaded,
  modalOpen,
  setModalOpen,
  selectedSlot,
  setSelectedSlot,
  syncing,
  setSyncing,
  syncFeedback,
  setSyncFeedback,
  isConnected,
  setIsConnected,
  checkingConnection,
}) {
  const currentEvents = Array.isArray(state?.events) ? state.events : [];
  const [detailsEvent, setDetailsEvent] = useState(null);

  useEffect(() => {
    if (!isLoaded) return;
    const needsNormalization = currentEvents.some((event) => {
      const hasDateObjects = event?.start instanceof Date || event?.end instanceof Date;
      const missingGoogleField = typeof event?.google_event_id === 'undefined';
      const hasOnlyDescription = event?.description && typeof event?.desc === 'undefined';
      const hasOnlyDesc = event?.desc && typeof event?.description === 'undefined';
      return hasDateObjects || missingGoogleField || hasOnlyDescription || hasOnlyDesc;
    });

    if (!needsNormalization) {
      return;
    }

    setState((prev) => {
      const baseline = (prev && typeof prev === 'object') ? prev : {};
      const normalizedEvents = currentEvents.map((event) => sanitizeEventForStorage(event));
      return {
        ...baseline,
        events: normalizedEvents,
      };
    });
  }, [isLoaded, currentEvents, setState]);

  const handleSelectSlot = useCallback(({ start, end }) => {
    setSelectedSlot({ start, end });
    setModalOpen(true);
  }, [setModalOpen, setSelectedSlot]);

  const handleSelectEvent = useCallback((event) => {
    // Open a centered dialog with event details
    setDetailsEvent(event);
  }, []);

  const handleCloseDetails = useCallback(() => {
    setDetailsEvent(null);
  }, []);

  const handleDeleteEvent = useCallback(() => {
    if (!detailsEvent) return;
    const idToRemove = detailsEvent.id ?? detailsEvent.google_event_id;
    
    // Track if this was a Google event for deletion sync
    const isGoogleEvent = detailsEvent.source === 'google' && detailsEvent.google_event_id;
    
    setState((prev) => {
      const baseline = (prev && typeof prev === 'object') ? prev : {};
      const prevEvents = Array.isArray(baseline.events) ? baseline.events : [];
      const nextEvents = prevEvents.filter((e) => (e.id ?? e.google_event_id) !== idToRemove);
      
      // Track deleted Google events for sync
      const deletedGoogleEvents = baseline.deletedGoogleEvents || [];
      if (isGoogleEvent) {
        deletedGoogleEvents.push(detailsEvent.google_event_id);
      }
      
      return { 
        ...baseline, 
        events: nextEvents,
        deletedGoogleEvents: isGoogleEvent ? deletedGoogleEvents : baseline.deletedGoogleEvents,
      };
    });
    setDetailsEvent(null);
    setSyncFeedback({ severity: 'success', message: 'Event removed. Sync to update Google Calendar.' });
  }, [detailsEvent, setState, setSyncFeedback]);

  const handleAddEvent = useCallback((values) => {
    if (!values.title || !values.date) return;

    const startDate = selectedSlot ? new Date(selectedSlot.start) : new Date(values.date);
    const endDate = selectedSlot ? new Date(values.endDate || selectedSlot.end) : new Date(values.date);
    const sanitized = sanitizeEventForStorage({
      id: Date.now(),
      title: values.title,
      start: startDate,
      end: endDate,
      allDay: selectedSlot ? false : true,
      source: 'local',
      google_event_id: null,
      synced_at: null,
    });

    setState((prev) => {
      const baseline = (prev && typeof prev === 'object') ? prev : {};
      const previousEvents = Array.isArray(baseline.events) ? baseline.events : [];
      return {
        ...baseline,
        events: [...previousEvents, sanitized],
      };
    });

    setSelectedSlot(null);
  }, [selectedSlot, setState, setSelectedSlot]);

  const handleConnectGoogle = useCallback(() => {
    setIsConnected(false);
    setSyncFeedback((prev) => {
      if (prev && prev.severity === 'error') {
        return prev;
      }

      return {
        severity: 'info',
        message: 'Authorize Google Calendar in the new window, then click sync again.',
      };
    });

    const width = 520;
    const height = 620;
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2);
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2);

    window.open(
      '/integrations/google/calendar/connect',
      '_blank',
      `width=${width},height=${height},left=${left},top=${top}`
    );
  }, [setIsConnected, setSyncFeedback]);

  const handleGoogleSync = useCallback(async (isUserInitiated = false) => {
    // Prevent automatic sync calls - only allow user-initiated syncs
    if (!isUserInitiated) {
      console.warn('[Calendar] Automatic sync prevented. Sync must be user-initiated.', new Error().stack);
      setSyncFeedback({
        severity: 'info',
        message: 'Click the "Sync Google" button to sync your calendar events.',
      });
      return;
    }
    
    if (syncing) return;
    if (isConnected === false) {
      setSyncFeedback({
        severity: 'info',
        message: 'Please connect your Google account first.',
      });
      return;
    }
    if (checkingConnection) {
      setSyncFeedback({
        severity: 'info',
        message: 'Checking connection status...',
      });
      return;
    }
    setSyncing(true);
    setSyncFeedback(null);

    // Pre-open an auth window on the user gesture to avoid popup blockers.
    // We'll only navigate it if auth is required.
    let authWin = null;
    try {
      authWin = window.open('', '_blank', 'width=520,height=620');
      if (authWin) {
        // Keep a global reference so we can close it from the postMessage handler.
        try { window.__googleAuthWin = authWin; } catch (_) {}
        // Write a tiny placeholder so the window is visible quickly.
        authWin.document.write('<p style="font-family:sans-serif;padding:12px;">Preparing Google authorization…</p>');
      }
    } catch (_) {
      // Ignore if blocked; we'll fallback to normal window.open later.
    }

    const payload = {
      events: currentEvents.map((event) => sanitizeEventForStorage(event)),
      deletedGoogleEvents: state?.deletedGoogleEvents || [],
    };

    try {
      // Use withCsrf + fetch directly to avoid throwing on non-2xx so we can
      // inspect the JSON body for requires_auth and open the OAuth popup.
      const fetchOptions = withCsrf({
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Initiated': 'true',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const response = await fetch('/integrations/google/calendar/sync', fetchOptions);
      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data?.requires_auth && data?.authorize_url) {
          // If we were able to pre-open a window, reuse it. Otherwise, open a new one.
          try {
            if (authWin && !authWin.closed) {
              authWin.location.href = data.authorize_url;
            } else {
              window.open(data.authorize_url, '_blank', 'width=520,height=620');
            }
          } catch (_) {
            // If reusing the pre-opened window failed, close it and open a fresh one
            try { if (authWin && !authWin.closed) authWin.close(); } catch (_) {}
            try { if (window.__googleAuthWin && !window.__googleAuthWin.closed) window.__googleAuthWin.close(); } catch (_) {}
            window.open(data.authorize_url, '_blank', 'width=520,height=620');
          }
          setIsConnected(false);
          setSyncFeedback({
            severity: 'info',
            message: 'Authorize Google Calendar in the new window, then click sync again.',
          });
        } else {
          // Close any pre-opened window if not needed.
          try { if (authWin && !authWin.closed) authWin.close(); } catch (_) {}
          try { if (window.__googleAuthWin && !window.__googleAuthWin.closed) window.__googleAuthWin.close(); } catch (_) {}
          throw new Error(data?.message || 'Failed to sync with Google Calendar.');
        }
        return;
      }

      // Success path: close any placeholder auth window since auth was not required.
      try { if (authWin && !authWin.closed) authWin.close(); } catch (_) {}
      try { if (window.__googleAuthWin && !window.__googleAuthWin.closed) window.__googleAuthWin.close(); } catch (_) {}

      const mergedEvents = Array.isArray(data.events) ? data.events.map(sanitizeEventForStorage) : [];
      setState((prev) => {
        const baseline = (prev && typeof prev === 'object') ? prev : {};
        return {
          ...baseline,
          events: mergedEvents,
          lastSyncedAt: data.last_synced_at || new Date().toISOString(),
          deletedGoogleEvents: [], // Clear deleted events after successful sync
        };
      });

      setIsConnected(true);

      setSyncFeedback({
        severity: 'success',
        message: data.message || 'Google Calendar synced.',
      });
    } catch (error) {
      // Close any pre-opened window on error (not needed)
      try { if (authWin && !authWin.closed) authWin.close(); } catch (_) {}
      try { if (window.__googleAuthWin && !window.__googleAuthWin.closed) window.__googleAuthWin.close(); } catch (_) {}
      setSyncFeedback({
        severity: 'error',
        message: error.message || 'Failed to sync Google Calendar.',
      });
    } finally {
      setSyncing(false);
    }
  }, [currentEvents, syncing, setSyncing, setState, setSyncFeedback, setIsConnected, isConnected, checkingConnection]);

  const eventsForCalendar = currentEvents.map((event) => ({
    ...event,
    start: new Date(event.start),
    end: event.end ? new Date(event.end) : new Date(event.start),
  }));

  return (
    <Box sx={{ height: 'calc(100vh - 120px)', p: 2 }}>
      <Paper
        variant="outlined"
        sx={{
          height: '100%',
          p: 2.5,
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'divider',
          background: (theme) => theme.palette.mode === 'dark'
            ? 'linear-gradient(135deg, rgba(30,30,50,0.95) 0%, rgba(20,20,35,0.95) 100%)'
            : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
          boxShadow: (theme) => theme.palette.mode === 'dark' 
            ? '0 8px 32px rgba(0,0,0,0.4)'
            : '0 8px 32px rgba(0,0,0,0.08)',
          overflow: 'hidden',
        }}
      >
        {/* Inline alert removed to prevent layout shift. We use a Snackbar instead. */}
        {!isLoaded ? (
          <Box display="flex" alignItems="center" justifyContent="center" height="100%">
            <CircularProgress />
          </Box>
        ) : (
          <BigCalendar
            localizer={localizer}
            events={eventsForCalendar}
            startAccessor="start"
            endAccessor="end"
            style={{ height: '100%' }}
            defaultView={Views.MONTH}
            views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
            onSelectSlot={handleSelectSlot}
            selectable
            popup
            eventPropGetter={(event) => {
              const isDark = document.body.getAttribute('data-theme') === 'dark';
              const bg = getEventColor(event, isDark);
              return {
                style: {
                  background: bg,
                  border: 'none',
                  borderRadius: '6px',
                  borderLeft: `3px solid ${isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.3)'}`,
                  color: '#ffffff',
                  display: 'block',
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  lineHeight: 1.3,
                  padding: '3px 8px',
                  margin: '2px 3px',
                  boxShadow: isDark
                    ? '0 2px 8px rgba(0,0,0,0.3)'
                    : '0 2px 8px rgba(0,0,0,0.15)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s ease',
                },
              };
            }}
            components={{
              toolbar: (props) => (
                <CalendarToolbar
                  {...props}
                  onAddEvent={() => setModalOpen(true)}
                  onSync={handleGoogleSync}
                  syncing={syncing}
                  onConnect={handleConnectGoogle}
                  isConnected={isConnected}
                  checkingConnection={checkingConnection}
                />
              ),
              event: ({ event }) => (
                <div onClick={(e) => handleSelectEvent(event, e)} style={{ cursor: 'pointer' }}>
                  <strong>{event.title}</strong>
                </div>
              ),
            }}
            className="calendar-container"
          />
        )}

        {/* Event details dialog (centered) */}
        <Dialog open={Boolean(detailsEvent)} onClose={handleCloseDetails} maxWidth="xs" fullWidth>
          <DialogTitle>
            {detailsEvent?.title || 'Event'}
          </DialogTitle>
          <DialogContent dividers>
            <Box sx={{ display: 'grid', rowGap: 0.75 }}>
              <Typography variant="body2" color="text.secondary">
                {(() => {
                  try {
                    const start = detailsEvent?.start ? new Date(detailsEvent.start) : null;
                    const end = detailsEvent?.end ? new Date(detailsEvent.end) : null;
                    if (!start) return '';
                    const range = end ? `${format(start, 'EEE, MMM d, p')} – ${format(end, 'p')}` : `${format(start, 'EEE, MMM d, p')}`;
                    return detailsEvent?.allDay ? `${format(start, 'EEE, MMM d')} · All day` : range;
                  } catch (_) {
                    return '';
                  }
                })()}
              </Typography>

              <Typography variant="caption" color="text.secondary">Start</Typography>
              <Typography variant="body2">{(() => { try { return detailsEvent?.start ? format(new Date(detailsEvent.start), 'EEE, MMM d, p') : '-'; } catch(_) { return '-'; } })()}</Typography>

              <Typography variant="caption" color="text.secondary">End</Typography>
              <Typography variant="body2">{(() => { try { return detailsEvent?.end ? format(new Date(detailsEvent.end), 'EEE, MMM d, p') : '-'; } catch(_) { return '-'; } })()}</Typography>

              <Typography variant="caption" color="text.secondary">All day</Typography>
              <Typography variant="body2">{detailsEvent?.allDay ? 'Yes' : 'No'}</Typography>

              {(detailsEvent?.desc || detailsEvent?.description) && (
                <>
                  <Typography variant="caption" color="text.secondary">Description</Typography>
                  <Typography variant="body2">{detailsEvent?.desc || detailsEvent?.description}</Typography>
                </>
              )}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleDeleteEvent} color="error" startIcon={<DeleteOutlineIcon />}>Delete</Button>
            <Button onClick={handleCloseDetails}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Bottom-right snackbar for success/error messages */}
        <Snackbar
          open={Boolean(syncFeedback)}
          autoHideDuration={4000}
          onClose={() => setSyncFeedback(null)}
          anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        >
          {syncFeedback ? (
            <Alert
              onClose={() => setSyncFeedback(null)}
              severity={syncFeedback.severity}
              variant="filled"
              sx={{ width: '100%' }}
            >
              {syncFeedback.message}
            </Alert>
          ) : null}
        </Snackbar>
      </Paper>

      <InputModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setSelectedSlot(null);
        }}
        title="Add Event"
        fields={[
          {
            name: 'title',
            label: 'Event Title',
            required: true
          },
          {
            name: 'date',
            label: selectedSlot ? 'Start Date' : 'Date',
            type: 'datetime-local',
            defaultValue: selectedSlot
              ? format(selectedSlot.start, "yyyy-MM-dd'T'HH:mm")
              : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
            required: true
          },
          selectedSlot && {
            name: 'endDate',
            label: 'End Date',
            type: 'datetime-local',
            defaultValue: selectedSlot ? format(selectedSlot.end, "yyyy-MM-dd'T'HH:mm") : '',
            required: true
          }
        ].filter(Boolean)}
        onSubmit={(values) => {
          handleAddEvent({
            ...values,
            date: values.date,
            endDate: values.endDate || values.date
          });
          setModalOpen(false);
        }}
      />
    </Box>
  );
}

export default function Calendar({ projectId, viewName }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState(null);
  const [isConnected, setIsConnected] = useState(null);
  const [checkingConnection, setCheckingConnection] = useState(true);

  useEffect(() => {
    const handleMessage = (event) => {
      if (event?.data?.type === 'google-calendar-connected') {
        setIsConnected(true);
        setSyncFeedback({
          severity: 'success',
          message: 'Google account connected. Click sync to import calendar events.',
        });
        // Close any pre-opened auth window and refocus the app
        try { if (window.__googleAuthWin && !window.__googleAuthWin.closed) window.__googleAuthWin.close(); } catch (_) {}
        try { window.__googleAuthWin = null; } catch (_) {}
        try { window.focus(); } catch (_) {}
      }
    };

    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const fetchStatus = async () => {
      try {
        const response = await csrfFetch('/integrations/google/calendar/status', {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });

        const data = await response.json().catch(() => ({}));

        if (!isMounted) return;

        if (response.ok) {
          setIsConnected(Boolean(data?.connected));
        } else {
          setIsConnected(false);
        }
      } catch (error) {
        if (isMounted) {
          setIsConnected(false);
        }
      } finally {
        if (isMounted) {
          setCheckingConnection(false);
        }
      }
    };

    fetchStatus();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (checkingConnection) {
      return;
    }

    if (isConnected) {
      setSyncFeedback((prev) => {
        if (prev && prev.severity === 'success') {
          return prev;
        }
        return null;
      });
    } else {
      setSyncFeedback((prev) => prev ?? {
        severity: 'info',
        message: 'Connect your Google account to sync calendar events. If Google blocks access, add your email as a test user in the Google Cloud console or ask an admin to enable calendar access on login.',
      });
    }
  }, [checkingConnection, isConnected, setSyncFeedback]);
  
  return (
    <MicroAppWrapper 
      projectId={projectId}
      viewName={viewName}
      appKey="Calendar"
      defaultValue={{ events: [] }}
      title="Calendar"
      enableSharing={true}
      defaultShared={true}
    >
      {({ state, setState, isLoaded }) => (
        <CalendarBody
          state={state}
          setState={setState}
          isLoaded={isLoaded}
          modalOpen={modalOpen}
          setModalOpen={setModalOpen}
          selectedSlot={selectedSlot}
          setSelectedSlot={setSelectedSlot}
          syncing={syncing}
          setSyncing={setSyncing}
          syncFeedback={syncFeedback}
          setSyncFeedback={setSyncFeedback}
          isConnected={isConnected}
          setIsConnected={setIsConnected}
          checkingConnection={checkingConnection}
        />
      )}
    </MicroAppWrapper>
  );
}
