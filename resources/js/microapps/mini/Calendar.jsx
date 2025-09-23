import React, { useState, useCallback } from 'react';
import { Box, Typography, Stack, Button, Paper, CircularProgress } from '@mui/material';
import { Calendar as BigCalendar, dateFnsLocalizer, Views } from 'react-big-calendar';
import format from 'date-fns/format';
import parse from 'date-fns/parse';
import startOfWeek from 'date-fns/startOfWeek';
import getDay from 'date-fns/getDay';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import MicroAppWrapper from '../components/MicroAppWrapper';
import InputModal from '../components/InputModal';
// Custom toolbar component with gold text in dark mode and add event button
const CalendarToolbar = ({ label, onNavigate, onView, view, onAddEvent }) => {
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

export default function Calendar({ projectId, viewName }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  
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
      {({ state, setState, isShared, isLoaded }) => {
        const handleSelectSlot = useCallback(({ start, end }) => {
          setSelectedSlot({ start, end });
          setModalOpen(true);
        }, []);
        
        const handleSelectEvent = useCallback((event) => {
          // Optional: Handle event click if needed
          console.log('Event selected:', event);
        }, []);
        
        const handleAddEvent = (values) => {
          if (!values.title || !values.date) return;
          
          const newEvent = {
            id: Date.now(),
            title: values.title,
            start: selectedSlot ? new Date(selectedSlot.start) : new Date(values.date),
            end: selectedSlot ? new Date(values.endDate || selectedSlot.end) : new Date(values.date),
            allDay: selectedSlot ? false : true
          };
          
          const next = { 
            ...state, 
            events: [...(state.events || []), newEvent] 
          };
          
          setState(next);
          setSelectedSlot(null);
        };

        // Format events for react-big-calendar
        const events = (state.events || []).map(event => ({
          ...event,
          start: new Date(event.start),
          end: event.end ? new Date(event.end) : new Date(event.start)
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
              {!isLoaded ? (
                <Box display="flex" alignItems="center" justifyContent="center" height="100%">
                  <CircularProgress />
                </Box>
              ) : (
                <BigCalendar
                  localizer={localizer}
                  events={events}
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
                    toolbar: (props) => <CalendarToolbar {...props} onAddEvent={() => setModalOpen(true)} />,
                    event: ({ event }) => (
                      <div>
                        <strong>{event.title}</strong>
                        {event.desc && (
                          <div style={{ fontSize: '0.8em' }}>{event.desc}</div>
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
      }}
    </MicroAppWrapper>
  );
}
