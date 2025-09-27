import React, { useState, useCallback, useEffect } from 'react';
import { Box, Paper, CircularProgress, Alert } from '@mui/material';
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import MicroAppWrapper from '../components/MicroAppWrapper';
import InputModal from '../components/InputModal';
import { csrfFetch } from '@/utils/csrf';

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
// Custom toolbar component with gold text in dark mode and add event button
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
    color: isDark ? '#FFD700' : 'inherit',
    backgroundColor: 'transparent',
    border: '1px solid transparent',
    margin: '0 3px',
    padding: '4px 10px',
    borderRadius: '4px',
    cursor: 'pointer',
  };
  const activeStyle = {
    ...buttonStyle,
    color: isDark ? '#FFA500' : 'inherit',
    borderColor: isDark ? '#FFA500' : 'inherit',
    fontWeight: 'bold',
  };
  const addButtonStyle = {
    ...buttonStyle,
    backgroundColor: isDark ? '#1976d2' : '#2196f3',
    color: '#ffffff',
    border: '1px solid transparent',
    fontWeight: 'bold',
    padding: '6px 12px',
    marginLeft: '10px',
  };

  const syncButtonStyle = {
    ...buttonStyle,
    borderColor: isDark ? '#60a5fa' : '#1a73e8',
    color: isDark ? '#60a5fa' : '#1a73e8',
    fontWeight: 600,
    padding: '6px 12px',
    marginLeft: '10px',
    backgroundColor: isDark ? 'rgba(96,165,250,0.12)' : 'rgba(26,115,232,0.12)',
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
      marginBottom: '10px',
      color: isDark ? '#FFD700' : 'inherit'
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
      <span style={{ fontWeight: 'bold' }}>{label}</span>
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
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 1 }), // Start week on Monday
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
    console.log('Event selected:', event);
  }, []);

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

    const payload = {
      events: currentEvents.map((event) => sanitizeEventForStorage(event)),
    };

    try {
      const response = await csrfFetch('/integrations/google/calendar/sync', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        if (data?.requires_auth && data?.authorize_url) {
          window.open(data.authorize_url, '_blank', 'width=520,height=620');
          setIsConnected(false);
          setSyncFeedback({
            severity: 'info',
            message: 'Authorize Google Calendar in the new window, then click sync again.',
          });
        } else {
          throw new Error(data?.message || 'Failed to sync with Google Calendar.');
        }
        return;
      }

      const mergedEvents = Array.isArray(data.events) ? data.events.map(sanitizeEventForStorage) : [];
      setState((prev) => {
        const baseline = (prev && typeof prev === 'object') ? prev : {};
        return {
          ...baseline,
          events: mergedEvents,
          lastSyncedAt: data.last_synced_at || new Date().toISOString(),
        };
      });

      setIsConnected(true);

      setSyncFeedback({
        severity: 'success',
        message: data.message || 'Google Calendar synced.',
      });
    } catch (error) {
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
    <Box sx={{ height: 'calc(100vh - 120px)', p: 1 }}>
      <Paper
        variant="outlined"
        sx={{
          height: '100%',
          p: 1.5,
          borderRadius: 2.5,
          border: '1px solid',
          borderColor: 'divider',
          background: (theme) => theme.palette.mode === 'dark'
            ? 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))'
            : 'linear-gradient(180deg, #ffffff, #fbfbfd)',
          boxShadow: (theme) => theme.palette.mode === 'dark' ? 0 : 1,
        }}
      >
        {syncFeedback && (
          <Alert
            severity={syncFeedback.severity}
            onClose={() => setSyncFeedback(null)}
            sx={{ mb: 1 }}
          >
            {syncFeedback.message}
          </Alert>
        )}
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
            onSelectEvent={handleSelectEvent}
            selectable
            popup
            eventPropGetter={(event) => {
              const isDark = document.body.getAttribute('data-theme') === 'dark';
              const gradient = isDark
                ? 'linear-gradient(135deg, #1f2a36, #2d3b4a)'
                : 'linear-gradient(135deg, #1976d2, #42a5f5)';
              return {
                style: {
                  backgroundImage: gradient,
                  borderRadius: 8,
                  opacity: 0.95,
                  color: isDark ? '#f5f7fa' : '#ffffff',
                  border: '1px solid rgba(255,255,255,0.12)',
                  display: 'block',
                  fontWeight: 600,
                  boxShadow: isDark ? '0 2px 6px rgba(0,0,0,0.4)' : '0 2px 6px rgba(0,0,0,0.12)'
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
                <div>
                  <strong>{event.title}</strong>
                  {(event.desc || event.description) && (
                    <div style={{ fontSize: '0.8em' }}>{event.desc || event.description}</div>
                  )}
                </div>
              ),
            }}
            className="calendar-container"
          />
        )}
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
