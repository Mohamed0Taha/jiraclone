import React from 'react';
import { Calendar as RBCalendar, Views as RBViews, dateFnsLocalizer as rbDateFnsLocalizer } from 'react-big-calendar';
import { format as dfFormat, parse as dfParse, startOfWeek as dfStartOfWeek, getDay as dfGetDay } from 'date-fns';
import enUSLocale from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import * as Recharts from 'recharts';
import * as MuiMaterial from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import * as MuiDataGrid from '@mui/x-data-grid';
import { DESIGN_TOKENS } from './react-renderer/constants';
import { STYLE_UTILS_SNIPPET } from './react-renderer/snippets/styleUtils';
import { STYLED_COMPONENTS_SNIPPET } from './react-renderer/snippets/styledComponents';

// DESIGN_TOKENS, STYLE_UTILS_SNIPPET and STYLED_COMPONENTS_SNIPPET are imported above

const TEMPLATES_SNIPPET = String.raw`
// Lightweight Templates exposed to generated components
const Templates = {
  Docs: (props) => {
    const { pages = [], defaultPage = null, persistKey = 'docs' } = props || {};
    const [state] = useEmbeddedData(persistKey, { pages, defaultPage });
    const docs = Array.isArray(state?.pages) && state.pages.length ? state.pages : pages;
    const [current, setCurrent] = React.useState(defaultPage || (docs[0]?.id ?? 0));
    const active = docs.find(p => (p.id ?? p.title) === current) || docs[0] || { title: 'Untitled', body: '' };
    return (
      React.createElement(Box, null,
        React.createElement(Stack, { direction: 'row', spacing: 2 },
          React.createElement(Paper, { sx: { p: 1, width: 220, flexShrink: 0 } },
            React.createElement(Stack, { spacing: 0.5 },
              ...docs.map((p, i) => React.createElement(Button, {
                key: i,
                variant: (p.id ?? p.title) === current ? 'contained' : 'text',
                color: (p.id ?? p.title) === current ? 'primary' : 'inherit',
                onClick: () => setCurrent(p.id ?? p.title),
                sx: { justifyContent: 'flex-start' }
              }, p.title || ('Page ' + (i+1))))
            )
          ),
          React.createElement(Paper, { sx: { p: 2, flex: 1 } },
            React.createElement(Typography, { variant: 'h6' }, active.title || 'Untitled'),
            React.createElement(Divider, null),
            React.createElement(Typography, { variant: 'body2', sx: { whiteSpace: 'pre-wrap' } }, active.body || '')
          )
        )
      )
    );
  },
  WikiPage: (props) => {
    const { title = 'Wiki', sections = [], persistKey = 'wiki-page' } = props || {};
    const [state] = useEmbeddedData(persistKey, { sections });
    const content = Array.isArray(state?.sections) && state.sections.length ? state.sections : sections;
    return (
      React.createElement(Paper, { sx: { p: 2 } },
        React.createElement(Stack, { spacing: 2 },
          React.createElement(Typography, { variant: 'h6', color: 'text.secondary' }, title),
          React.createElement(Divider, null),
          ...content.map((s, i) => React.createElement(Box, { key: i },
            React.createElement(Typography, { variant: 'subtitle2', sx: { mb: 0.5, color: 'text.secondary' } }, s?.heading || ('Section ' + (i+1))),
            React.createElement(Typography, { variant: 'body2', sx: { whiteSpace: 'pre-wrap' } }, s?.body || '')
          ))
        )
      )
    );
  },

  Slides: (props) => {
    const { slides = [], persistKey = 'slides-deck' } = props || {};
    const [idx, setIdx] = React.useState(0);
    const [state] = useEmbeddedData(persistKey, { slides });
    const deck = Array.isArray(state?.slides) && state.slides.length ? state.slides : slides;
    const go = (d) => setIdx((p) => (p + d + (deck.length || 1)) % (deck.length || 1));
    React.useEffect(() => {
      const onKey = (e) => { if (e.key === 'ArrowRight') go(1); if (e.key === 'ArrowLeft') go(-1); };
      window.addEventListener('keydown', onKey); return () => window.removeEventListener('keydown', onKey);
    }, [deck.length]);
    const s = deck[idx] || { title: 'Slide', content: '' };
    return (
      React.createElement(Paper, { sx: { p: 2 } },
        React.createElement(Stack, { spacing: 1 },
          React.createElement(Stack, { direction: 'row', alignItems: 'center', justifyContent: 'space-between' },
            React.createElement(Typography, { variant: 'subtitle2', color: 'text.secondary' }, 'Slide ' + (idx+1) + '/' + (deck.length || 1)),
            React.createElement(Stack, { direction: 'row', spacing: 1 },
              React.createElement(Button, { variant: 'outlined', onClick: () => go(-1), startIcon: React.createElement(ArrowBackIcon, null) }, 'Prev'),
              React.createElement(Button, { variant: 'outlined', onClick: () => go(1), endIcon: React.createElement(ArrowForwardIcon, null) }, 'Next')
            )
          ),
          React.createElement(Typography, { variant: 'h6' }, s.title || 'Untitled'),
          React.createElement(Divider, null),
          React.createElement(Typography, { variant: 'body2', sx: { whiteSpace: 'pre-wrap' } }, s.content || '')
        )
      )
    );
  },

  Spreadsheet: (props) => {
    const { columns = [], rows = [], persistKey = 'sheet' } = props || {};
    const [data, setData] = useEmbeddedData(persistKey, { rows, columns });
    const sourceCols = (Array.isArray(data?.columns) && data.columns.length ? data.columns : columns);
    const safeCols = sourceCols.map((c, i) => ({ flex: 1, minWidth: 120, ...c, field: c.field || c.key || ('c' + i) }));
    const sourceRows = (Array.isArray(data?.rows) && data.rows.length ? data.rows : rows);
    const safeRows = sourceRows.map((r, i) => ({ id: r.id ?? 'row-' + (i + 1), ...r }));

    const addRow = () => {
      const nextId = 'row-' + Date.now();
      const empty = safeCols.reduce((acc, c) => { acc[c.field] = rDefault(acc[c.field]); return acc; }, {});
      function rDefault(v){ return typeof v === 'number' ? 0 : '' }
      const nextRows = [...sourceRows, { id: nextId, ...empty }];
      setData({ ...(data || {}), rows: nextRows, columns: sourceCols });
    };

    return (
      React.createElement(Paper, { sx: { p: 1 } },
        React.createElement(Stack, { spacing: 1 },
          React.createElement(Stack, { direction: 'row', justifyContent: 'flex-end' },
            React.createElement(Button, { variant: 'contained', size: 'small', startIcon: React.createElement(AddIcon, null), onClick: addRow }, 'Add Row')
          ),
          React.createElement(DataGrid, { autoHeight: true, density: 'compact', rows: safeRows, columns: safeCols, disableRowSelectionOnClick: true })
        )
      )
    );
  },

  Calculator: (props) => {
    const {
      persistKey = 'scientific-calculator',
      title = 'Scientific Calculator',
      maxHistory = 6,
    } = props || {};
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [state, setState] = useEmbeddedData(persistKey, {
      expression: '',
      display: '',
      angleMode: 'Rad',
      lastAnswer: 0,
      history: [],
      justEvaluated: false,
      error: null,
    });

    const formatValue = React.useCallback((value) => {
      if (!Number.isFinite(value)) return 'Error';
      if (Math.abs(value) >= 1e9 || (Math.abs(value) > 0 && Math.abs(value) < 1e-6)) {
        return Number(value).toExponential(6);
      }
      const rounded = Number.parseFloat(Number(value).toFixed(8));
      return String(rounded);
    }, []);

    const evaluateExpression = React.useCallback((expr) => {
      const source = (expr || '').trim();
      if (!source) return 0;
      const sanitized = source.replace(/[^0-9+\-*/().\s]/g, '');
      if (!sanitized.trim()) return 0;
      try {
        const result = Function('"use strict";return (' + sanitized + ')')();
        return Number(result);
      } catch (error) {
        return NaN;
      }
    }, []);

    const pushHistory = React.useCallback((prev, expressionLabel, numericValue) => {
      const entry = {
        expression: expressionLabel,
        result: formatValue(numericValue),
        timestamp: new Date().toISOString(),
      };
      return [entry, ...(Array.isArray(prev.history) ? prev.history : [])].slice(0, maxHistory);
    }, [formatValue, maxHistory]);

    const appendToken = React.useCallback((token, displayToken, options = {}) => {
      setState((prev) => {
        const preserve = options.preserve === true;
        const isOperator = options.type === 'operator';
        let expression = prev.expression || '';
        let display = prev.display || '';
        if (prev.justEvaluated && !isOperator && !preserve) {
          expression = '';
          display = '';
        }
        return {
          ...prev,
          expression: expression + token,
          display: display + (displayToken ?? token),
          justEvaluated: false,
          error: null,
        };
      });
    }, [setState]);

    const appendOperator = React.useCallback((symbol, actual) => {
      setState((prev) => {
        let expression = prev.expression || '';
        let display = prev.display || '';
        if (!expression.trim()) {
          const seed = prev.lastAnswer ?? 0;
          expression = String(seed);
          display = formatValue(seed);
        }
        if (prev.justEvaluated) {
          expression = prev.expression || String(prev.lastAnswer ?? 0);
          display = prev.display || formatValue(prev.lastAnswer ?? 0);
        }
        return {
          ...prev,
          expression: expression + (actual ?? symbol),
          display: display + symbol,
          justEvaluated: false,
          error: null,
        };
      });
    }, [setState, formatValue]);

    const resetAll = React.useCallback(() => {
      setState((prev) => ({
        ...prev,
        expression: '',
        display: '',
        error: null,
        justEvaluated: false,
      }));
    }, [setState]);

    const handleEquals = React.useCallback(() => {
      setState((prev) => {
        const baseExpr = prev.expression && prev.expression.trim().length
          ? prev.expression
          : String(prev.lastAnswer ?? 0);
        const expressionLabel = prev.display && prev.display.trim().length
          ? prev.display
          : formatValue(prev.lastAnswer ?? 0);
        const value = evaluateExpression(baseExpr);
        if (!Number.isFinite(value)) {
          return { ...prev, error: 'Math error', justEvaluated: true };
        }
        const formatted = formatValue(value);
        return {
          ...prev,
          expression: String(value),
          display: formatted,
          lastAnswer: value,
          history: pushHistory(prev, expressionLabel + ' =', value),
          justEvaluated: true,
          error: null,
        };
      });
    }, [setState, evaluateExpression, formatValue, pushHistory]);

    const factorial = React.useCallback((input) => {
      if (input < 0 || !Number.isInteger(input) || input > 170) return NaN;
      let result = 1;
      for (let i = 2; i <= input; i += 1) {
        result *= i;
      }
      return result;
    }, []);

    const applyUnary = React.useCallback((label, fn) => {
      setState((prev) => {
        const baseExpr = prev.expression && prev.expression.trim().length
          ? prev.expression
          : String(prev.lastAnswer ?? 0);
        const baseDisplay = prev.display && prev.display.trim().length
          ? prev.display
          : formatValue(prev.lastAnswer ?? 0);
        const value = evaluateExpression(baseExpr);
        if (!Number.isFinite(value)) {
          return { ...prev, error: 'Math error', justEvaluated: true };
        }
        const result = fn(value, prev);
        if (!Number.isFinite(result)) {
          return { ...prev, error: 'Out of range', justEvaluated: true };
        }
        const formatted = formatValue(result);
        const historyLabel = label.replace('%value%', baseDisplay);
        return {
          ...prev,
          expression: String(result),
          display: formatted,
          lastAnswer: result,
          history: pushHistory(prev, historyLabel + ' =', result),
          justEvaluated: true,
          error: null,
        };
      });
    }, [setState, evaluateExpression, formatValue, pushHistory]);

    const handlePercent = React.useCallback(() => {
      applyUnary('(%value%) ÷ 100', (value) => value / 100);
    }, [applyUnary]);

    const handleInsertConstant = React.useCallback((numericValue, displayToken) => {
      appendToken(String(numericValue), displayToken, { preserve: true });
    }, [appendToken]);

    const handleInsertAnswer = React.useCallback(() => {
      appendToken(String(state.lastAnswer ?? 0), 'Ans', { preserve: true });
    }, [appendToken, state.lastAnswer]);

    const buttons = [
      ['Rad', 'Deg', 'x!', '(', ')', '%', 'AC'],
      ['Inv', 'sin', 'ln', '7', '8', '9', '÷'],
      ['π', 'cos', 'log', '4', '5', '6', '×'],
      ['e', 'tan', '√', '1', '2', '3', '−'],
      ['Ans', 'EXP', 'x^y', '0', '.', '=', '+'],
    ];

    const handleButton = React.useCallback((label) => {
      switch (label) {
        case 'Rad':
        case 'Deg':
          setState((prev) => ({ ...prev, angleMode: label, justEvaluated: false }));
          return;
        case 'x!':
          applyUnary('fact(%value%)', (value) => factorial(Math.round(value)));
          return;
        case '(':
          appendToken('(', '(', { preserve: true });
          return;
        case ')':
          appendToken(')', ')', { preserve: true });
          return;
        case '%':
          handlePercent();
          return;
        case 'AC':
          resetAll();
          return;
        case 'Inv':
          applyUnary('1 ÷ %value%', (value) => (value === 0 ? NaN : 1 / value));
          return;
        case 'sin':
          applyUnary('sin(%value%)', (value, prev) => {
            const radians = prev.angleMode === 'Deg' ? (value * Math.PI) / 180 : value;
            return Math.sin(radians);
          });
          return;
        case 'cos':
          applyUnary('cos(%value%)', (value, prev) => {
            const radians = prev.angleMode === 'Deg' ? (value * Math.PI) / 180 : value;
            return Math.cos(radians);
          });
          return;
        case 'tan':
          applyUnary('tan(%value%)', (value, prev) => {
            const radians = prev.angleMode === 'Deg' ? (value * Math.PI) / 180 : value;
            return Math.tan(radians);
          });
          return;
        case 'ln':
          applyUnary('ln(%value%)', (value) => (value <= 0 ? NaN : Math.log(value)));
          return;
        case 'log':
          applyUnary('log₁₀(%value%)', (value) => (value <= 0 ? NaN : Math.log(value) / Math.LN10));
          return;
        case '√':
          applyUnary('√(%value%)', (value) => (value < 0 ? NaN : Math.sqrt(value)));
          return;
        case 'EXP':
          applyUnary('exp(%value%)', (value) => Math.exp(value));
          return;
        case 'π':
          handleInsertConstant(Math.PI, 'π');
          return;
        case 'e':
          handleInsertConstant(Math.E, 'e');
          return;
        case 'Ans':
          handleInsertAnswer();
          return;
        case 'x^y':
          appendOperator('^', '**');
          return;
        case '÷':
          appendOperator('÷', '/');
          return;
        case '×':
          appendOperator('×', '*');
          return;
        case '−':
          appendOperator('−', '-');
          return;
        case '+':
          appendOperator('+', '+');
          return;
        case '=':
          handleEquals();
          return;
        case '.':
          appendToken('.', '.', { preserve: true });
          return;
        default:
          if (/^\d$/.test(label)) {
            appendToken(label, label);
          }
      }
    }, [appendOperator, appendToken, applyUnary, factorial, handleEquals, handleInsertAnswer, handleInsertConstant, handlePercent, resetAll, setState]);

    const expressionText = state.display && state.display.trim().length ? state.display : formatValue(state.lastAnswer ?? 0);
    const livePreview = (() => {
      if (state.error) return state.error;
      if (state.justEvaluated) {
        return formatValue(state.lastAnswer ?? evaluateExpression(state.expression));
      }
      if (!state.expression.trim()) {
        return formatValue(state.lastAnswer ?? 0);
      }
      const value = evaluateExpression(state.expression);
      if (!Number.isFinite(value)) {
        return 'Math error';
      }
      return formatValue(value);
    })();

    const palette = isDark ? '#1f2937' : '#f8fafc';
    const keypadBg = isDark ? '#111827' : '#e5e7eb';

    return (
      React.createElement(Paper, {
        sx: {
          p: 3,
          borderRadius: 4,
          width: '100%',
          maxWidth: 640,
          mx: 'auto',
          background: palette,
        }
      },
        React.createElement(Stack, { spacing: 3 },
          React.createElement(Stack, { direction: 'row', justifyContent: 'space-between', alignItems: 'center' },
            React.createElement(Typography, { variant: 'h6', fontWeight: 600 }, title),
            React.createElement(Chip, {
              label: state.angleMode === 'Deg' ? 'Degrees' : 'Radians',
              color: 'primary',
              variant: 'outlined',
              size: 'small'
            })
          ),
          React.createElement(Box, {
            sx: {
              borderRadius: 3,
              p: 3,
              background: isDark ? '#0f172a' : '#ffffff',
              boxShadow: theme.shadows[isDark ? 6 : 3],
              minHeight: 120,
            }
          },
            React.createElement(Stack, { spacing: 1, alignItems: 'flex-end' },
              React.createElement(Typography, {
                variant: 'body1',
                color: theme.palette.text.secondary,
                sx: { wordBreak: 'break-all', minHeight: 24 }
              }, expressionText),
              React.createElement(Typography, {
                variant: 'h3',
                fontWeight: 700,
                sx: { wordBreak: 'break-all' }
              }, livePreview)
            )
          ),
          React.createElement(Box, {
            sx: {
              display: 'grid',
              gap: 1,
              gridTemplateColumns: 'repeat(7, minmax(56px, 1fr))',
              background: keypadBg,
              borderRadius: 3,
              p: 2,
            }
          },
            ...buttons.flatMap((row, rowIdx) =>
              row.map((label) => {
                const isMode = label === 'Rad' || label === 'Deg';
                const isPrimary = ['=', '+', '−', '×', '÷'].includes(label);
                const isDestructive = label === 'AC';
                const span = label === '0' ? { gridColumn: 'span 2' } : null;
                const activeMode = isMode && state.angleMode === label;
                return React.createElement(Button, {
                  key: rowIdx + '-' + label,
                  variant: activeMode || label === '=' ? 'contained' : 'outlined',
                  color: isDestructive ? 'error' : (isPrimary || activeMode ? 'primary' : 'inherit'),
                  onClick: () => handleButton(label),
                  sx: Object.assign({
                    py: 1.5,
                    fontWeight: 600,
                    fontSize: '0.95rem',
                    borderRadius: 2,
                    backgroundColor: activeMode ? theme.palette.primary.main : undefined,
                    color: activeMode ? '#fff' : undefined,
                  }, span)
                }, label === 'x^y' ? 'xʸ' : label);
              })
            )
          ),
          React.createElement(Box, null,
            React.createElement(Typography, { variant: 'subtitle2', color: 'text.secondary', gutterBottom: true }, 'Recent Calculations'),
            React.createElement(Stack, { spacing: 1.2 },
              ...(Array.isArray(state.history) ? state.history : []).map((entry, idx) =>
                React.createElement(Paper, {
                  key: entry.timestamp + '-' + idx,
                  variant: 'outlined',
                  sx: {
                    p: 1.5,
                    borderRadius: 2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: isDark ? '#0b1220' : '#fdfdfd',
                  }
                },
                  React.createElement(Box, null,
                    React.createElement(Typography, { variant: 'caption', color: 'text.secondary' }, new Date(entry.timestamp).toLocaleString()),
                    React.createElement(Typography, { variant: 'body2' }, entry.expression)
                  ),
                  React.createElement(Typography, { variant: 'body1', fontWeight: 600 }, entry.result)
                )
              )
            )
          )
        )
      )
    );
  },

  Calendar: (props) => {
    const {
      persistKey = 'team-calendar',
      title = 'Team Calendar',
      initialEvents = [],
      events = [], // Allow direct events prop
      onEventUpdate = null, // Expose event update callback
      onEventDelete = null, // Expose event delete callback
      onEventCreate = null, // Expose event create callback
      onDateClick = null, // Expose date click callback
      onEventSelect = null, // Expose event select callback
      renderEvent = null, // Custom event renderer
      views = null, // Custom views
      defaultView = 'month', // Default view
      showCreateDialog = true, // Show create event dialog
      showEventDetails = true, // Show event details panel
      showUpcoming = true, // Show upcoming events panel
      selectable = true, // Allow date selection
      editable = true, // Allow event editing
    } = props || {};
    const theme = useTheme();
    const factory = useExternalFactory('react-big-calendar', [persistKey]);

    const sampleEvents = React.useMemo(() => {
      // Use provided events first, then initialEvents, then samples
      if (Array.isArray(events) && events.length) return events;
      if (Array.isArray(initialEvents) && initialEvents.length) return initialEvents;
      const today = new Date();
      const span = (days, hour, duration = 1, color) => {
        const start = new Date(today);
        start.setDate(start.getDate() + days);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start);
        end.setHours(hour + duration, 0, 0, 0);
        return { start: start.toISOString(), end: end.toISOString(), color };
      };
      return [
        Object.assign({ id: 'ev-1', title: 'Sprint Planning', description: 'Plan backlog and velocity.' }, span(1, 10, 2, '#1A73E8')),
        Object.assign({ id: 'ev-2', title: 'Design Critique', description: 'Review dashboard refresh.' }, span(2, 14, 1, '#34A853')),
        Object.assign({ id: 'ev-3', title: 'Customer Demo', description: 'Showcase latest workflow.' }, span(4, 16, 1, '#F9AB00')),
        Object.assign({ id: 'ev-4', title: 'Retrospective', description: 'Celebrate wins and learnings.' }, span(6, 12, 1, '#A142F4')),
      ];
    }, [events, initialEvents]);

    const [data, setData] = useEmbeddedData(persistKey, { events: sampleEvents });
    const persistedEvents = Array.isArray(data?.events) && data.events.length ? data.events : sampleEvents;

    const normalizeEvent = React.useCallback((event, index) => ({
      ...event,
      id: event.id ?? ('event-' + index),
      start: event.start instanceof Date ? event.start : new Date(event.start),
      end: event.end instanceof Date ? event.end : new Date(event.end),
    }), []);

    const normalizedEvents = React.useMemo(() => persistedEvents.map(normalizeEvent), [persistedEvents, normalizeEvent]);

    const persistEvents = React.useCallback((events) => events.map((event, index) => ({
      ...event,
      id: event.id ?? ('event-' + index),
      start: event.start instanceof Date ? event.start.toISOString() : event.start,
      end: event.end instanceof Date ? event.end.toISOString() : event.end,
    })), []);

    const { Calendar, Views, localizer } = factory || {};
    const monthView = Views?.MONTH || 'month';
    const weekView = Views?.WEEK || 'week';
    const dayView = Views?.DAY || 'day';
    const availableViews = views || [monthView, weekView, dayView];

    const [view, setView] = React.useState(defaultView === 'week' ? weekView : defaultView === 'day' ? dayView : monthView);
    const [currentDate, setCurrentDate] = React.useState(new Date());
    const [draftEvent, setDraftEvent] = React.useState(null);
    const [formValues, setFormValues] = React.useState({ title: '', location: '', description: '' });
    const [selectedEvent, setSelectedEvent] = React.useState(null);

    const customEventRenderer = React.useMemo(() => {
      if (typeof renderEvent !== 'function') return null;
      return (eventProps) => renderEvent({
        event: eventProps.event,
        title: eventProps.title,
        isAllDay: eventProps.isAllDay,
        continuesPrior: eventProps.continuesPrior,
        continuesAfter: eventProps.continuesAfter,
        localizer,
      });
    }, [renderEvent, localizer]);

    const calendarComponents = React.useMemo(() => {
      const base = { toolbar: () => null };
      if (customEventRenderer) {
        base.event = customEventRenderer;
      }
      return base;
    }, [customEventRenderer]);

    const upcomingEvents = React.useMemo(() => {
      if (!showUpcoming) return [];
      const now = new Date();
      return [...normalizedEvents]
        .filter((event) => event.end >= now)
        .sort((a, b) => a.start - b.start)
        .slice(0, 6);
    }, [normalizedEvents, showUpcoming]);

    const handleCreateEvent = React.useCallback(() => {
      if (!draftEvent) return;
      const start = draftEvent.start instanceof Date ? draftEvent.start : new Date(draftEvent.start);
      const end = draftEvent.end instanceof Date ? draftEvent.end : new Date(draftEvent.end);
      const newEvent = {
        id: 'event-' + Date.now(),
        title: formValues.title || 'Untitled Event',
        location: formValues.location,
        description: formValues.description,
        start: start.toISOString(),
        end: end.toISOString(),
        color: '#34A853',
      };
      
      // Call external callback if provided
      if (typeof onEventCreate === 'function') {
        onEventCreate(newEvent);
      }
      
      setData((prev) => {
        const existing = Array.isArray(prev?.events) ? prev.events : [];
        return {
          ...prev,
          events: persistEvents([...existing, newEvent]),
        };
      });
      setDraftEvent(null);
      setFormValues({ title: '', location: '', description: '' });
    }, [draftEvent, formValues, persistEvents, setData, onEventCreate]);

    const handleUpdateEvent = React.useCallback((eventId, updates) => {
      // Call external callback if provided
      if (typeof onEventUpdate === 'function') {
        onEventUpdate(eventId, updates);
      }
      
      setData((prev) => {
        const existing = Array.isArray(prev?.events) ? prev.events : [];
        const updated = existing.map(event => 
          (event.id ?? event.title) === eventId 
            ? { ...event, ...updates }
            : event
        );
        return {
          ...prev,
          events: persistEvents(updated),
        };
      });
    }, [persistEvents, setData, onEventUpdate]);

    const handleDeleteEvent = React.useCallback((eventId) => {
      // Call external callback if provided
      if (typeof onEventDelete === 'function') {
        onEventDelete(eventId);
      }
      
      setData((prev) => {
        const existing = Array.isArray(prev?.events) ? prev.events : [];
        return {
          ...prev,
          events: persistEvents(existing.filter((event) => (event.id ?? event.title) !== eventId)),
        };
      });
      setSelectedEvent(null);
    }, [persistEvents, setData, onEventDelete]);

    const eventPropGetter = React.useCallback((event) => {
      const backgroundColor = event.color || theme.palette.primary.main;
      return {
        style: {
          backgroundColor,
          borderRadius: 12,
          border: 'none',
          padding: '2px 8px',
          color: theme.palette.getContrastText(backgroundColor),
        },
      };
    }, [theme.palette]);

    const handleSlotSelect = React.useCallback((slotInfo) => {
      if (typeof onDateClick === 'function') {
        onDateClick(slotInfo);
      }
      if (showCreateDialog) {
        setDraftEvent(slotInfo);
        setFormValues({ title: '', location: '', description: '' });
      }
    }, [onDateClick, showCreateDialog]);

    const handleEventSelect = React.useCallback((event) => {
      setSelectedEvent(event);
      if (typeof onEventSelect === 'function') {
        onEventSelect(event);
      }
    }, [onEventSelect]);

    // Expose calendar API for advanced users
    const calendarAPI = React.useMemo(() => ({
      // Event management
      createEvent: (event) => {
        const newEvent = {
          id: 'event-' + Date.now(),
          title: event.title || 'New Event',
          start: event.start || new Date(),
          end: event.end || new Date(),
          ...event,
        };
        setData((prev) => {
          const existing = Array.isArray(prev?.events) ? prev.events : [];
          return {
            ...prev,
            events: persistEvents([...existing, newEvent]),
          };
        });
        return newEvent;
      },
      updateEvent: handleUpdateEvent,
      deleteEvent: handleDeleteEvent,
      
      // Navigation
      navigate: (date) => setCurrentDate(date),
      setView: (viewName) => setView(viewName),
      goToToday: () => setCurrentDate(new Date()),
      
      // State access
      getCurrentDate: () => currentDate,
      getCurrentView: () => view,
      getEvents: () => normalizedEvents,
      getSelectedEvent: () => selectedEvent,
      
      // Utilities
      localizer,
      Views,
      theme,
    }), [handleUpdateEvent, handleDeleteEvent, currentDate, view, normalizedEvents, selectedEvent, localizer, Views, theme, setData, persistEvents]);

    // Expose API to parent component
    React.useEffect(() => {
      if (typeof props.onApiReady === 'function') {
        props.onApiReady(calendarAPI);
      }
    }, [props.onApiReady, calendarAPI]);

    if (!Calendar || !localizer) {
      return React.createElement(Paper, { sx: { p: 3, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 2 } },
        React.createElement(CircularProgress, { size: 20 }),
        React.createElement(Typography, { variant: 'body2' }, 'Loading interactive calendar...')
      );
    }

    return (
      React.createElement(Paper, { sx: { p: 3, borderRadius: 4 } },
        React.createElement(Stack, { spacing: 3 },
          React.createElement(Stack, { direction: { xs: 'column', md: 'row' }, spacing: 2, justifyContent: 'space-between', alignItems: { xs: 'flex-start', md: 'center' } },
            React.createElement(Box, null,
              React.createElement(Typography, { variant: 'h6', fontWeight: 600 }, title),
              React.createElement(Typography, { variant: 'body2', color: 'text.secondary' }, 'Interactive calendar with full API access for customization.')
            ),
            React.createElement(Stack, { direction: 'row', spacing: 1 },
              React.createElement(Button, { variant: 'outlined', onClick: () => setCurrentDate(new Date()) }, 'Today'),
              React.createElement(ButtonGroup, { variant: 'outlined' },
                availableViews.map((name) => React.createElement(Button, {
                  key: name,
                  variant: view === name ? 'contained' : 'outlined',
                  onClick: () => setView(name)
                }, name.charAt(0).toUpperCase() + name.slice(1)))
              )
            )
          ),
          React.createElement(Stack, { direction: { xs: 'column', xl: 'row' }, spacing: 3, alignItems: 'stretch' },
            React.createElement(Box, { sx: { flex: 1.8, minWidth: 0 } },
              React.createElement(Calendar, {
                localizer,
                events: normalizedEvents,
                view,
                date: currentDate,
                onView: (nextView) => setView(nextView),
                onNavigate: (nextDate) => setCurrentDate(nextDate),
                selectable: selectable,
                style: { minHeight: 540 },
                popup: true,
                eventPropGetter,
                views: availableViews,
                onSelectSlot: handleSlotSelect,
                onSelectEvent: handleEventSelect,
                components: calendarComponents
              })
            ),
            (showUpcoming || showEventDetails) && React.createElement(Stack, { spacing: 2, sx: { width: { xs: '100%', xl: 320 } } },
              showUpcoming && React.createElement(Paper, { variant: 'outlined', sx: { p: 2, borderRadius: 3 } },
                React.createElement(Typography, { variant: 'subtitle2', color: 'text.secondary', gutterBottom: true }, 'Upcoming events'),
                upcomingEvents.length === 0
                  ? React.createElement(Typography, { variant: 'body2', color: 'text.secondary' }, 'No upcoming events scheduled.')
                  : React.createElement(Stack, { spacing: 1.5 },
                      ...upcomingEvents.map((event) => React.createElement(Paper, {
                        key: event.id,
                        sx: {
                          p: 1.5,
                          borderRadius: 2,
                          backgroundColor: (event.color || theme.palette.background.paper) + '22',
                          cursor: 'pointer',
                        },
                        onClick: () => setSelectedEvent(event)
                      },
                        React.createElement(Typography, { variant: 'subtitle2', fontWeight: 600 }, event.title),
                        React.createElement(Typography, { variant: 'body2', color: 'text.secondary' }, event.location || '—'),
                        React.createElement(Typography, { variant: 'caption', color: 'text.secondary' }, event.start.toLocaleString())
                      ))
                    )
              ),
              showEventDetails && selectedEvent && React.createElement(Paper, { variant: 'outlined', sx: { p: 2, borderRadius: 3 } },
                React.createElement(Stack, { spacing: 1.2 },
                  React.createElement(Typography, { variant: 'subtitle1', fontWeight: 600 }, selectedEvent.title),
                  selectedEvent.description && React.createElement(Typography, { variant: 'body2' }, selectedEvent.description),
                  selectedEvent.location && React.createElement(Typography, { variant: 'body2', color: 'text.secondary' }, selectedEvent.location),
                  React.createElement(Typography, { variant: 'caption', color: 'text.secondary' }, selectedEvent.start.toLocaleString() + ' – ' + selectedEvent.end.toLocaleString()),
                  editable && React.createElement(Stack, { direction: 'row', spacing: 1 },
                    React.createElement(Button, {
                      variant: 'outlined',
                      size: 'small',
                      onClick: () => {
                        const newTitle = prompt('New title:', selectedEvent.title);
                        if (newTitle && newTitle !== selectedEvent.title) {
                          handleUpdateEvent(selectedEvent.id, { title: newTitle });
                        }
                      }
                    }, 'Edit'),
                    React.createElement(Button, {
                      variant: 'outlined',
                      color: 'error',
                      size: 'small',
                      onClick: () => handleDeleteEvent(selectedEvent.id)
                    }, 'Delete')
                  )
                )
              )
            )
          ),
          showCreateDialog && React.createElement(Dialog, { open: Boolean(draftEvent), onClose: () => setDraftEvent(null) },
            React.createElement(DialogTitle, null, 'Create Event'),
            React.createElement(DialogContent, { sx: { minWidth: { xs: 'auto', sm: 420 } } },
              React.createElement(Stack, { spacing: 2 },
                React.createElement(TextField, {
                  label: 'Title',
                  value: formValues.title,
                  onChange: (event) => setFormValues((prev) => ({ ...prev, title: event.target.value })),
                  autoFocus: true,
                  fullWidth: true
                }),
                React.createElement(TextField, {
                  label: 'Location',
                  value: formValues.location,
                  onChange: (event) => setFormValues((prev) => ({ ...prev, location: event.target.value })),
                  fullWidth: true
                }),
                React.createElement(TextField, {
                  label: 'Notes',
                  multiline: true,
                  minRows: 3,
                  value: formValues.description,
                  onChange: (event) => setFormValues((prev) => ({ ...prev, description: event.target.value })),
                  fullWidth: true
                })
              )
            ),
            React.createElement(DialogActions, null,
              React.createElement(Button, { onClick: () => setDraftEvent(null) }, 'Cancel'),
              React.createElement(Button, { variant: 'contained', onClick: handleCreateEvent }, 'Save Event')
            )
          )
        )
      )
    );
  },

  StickyNotes: (props) => {
    const {
      notes = [],
      onChange,
      sessionKey = 'sticky-notes-session',
      persistKey = 'sticky-notes',
      containerHeight = '500px',
      ...otherProps
    } = props || {};

    // Predefined colors that work well in both light and dark mode
    const colorPalette = [
      { bg: '#FFE066', text: '#2A2A2A' }, // Yellow
      { bg: '#B4E7CE', text: '#2A2A2A' }, // Green
      { bg: '#B794F6', text: '#2A2A2A' }, // Purple
      { bg: '#FBB6CE', text: '#2A2A2A' }, // Pink
      { bg: '#93C5FD', text: '#2A2A2A' }, // Blue
      { bg: '#FED7AA', text: '#2A2A2A' }, // Orange
      { bg: '#F87171', text: '#FFFFFF' }, // Red
      { bg: '#34D399', text: '#2A2A2A' }, // Emerald
    ];

    // Get theme for responsive design
    const theme = (typeof useTheme === 'function') ? useTheme() : { palette: { mode: 'light' } };
    const isDark = theme?.palette?.mode === 'dark';

    // Initialize notes with default positions
    const [stickyNotes, setStickyNotes] = useState(() => {
      if (notes && notes.length > 0) {
        return notes.map((note, index) => ({
          id: note.id || ('note-' + Date.now() + '-' + index),
          text: note.text || note.content || 'Add your notes...',
          color: note.color || colorPalette[index % colorPalette.length],
          x: note.x || 20 + (index % 4) * 220,
          y: note.y || 20 + Math.floor(index / 4) * 180,
          width: note.width || 200,
          height: note.height || 160,
        }));
      }
      return [];
    });

    // Track dragging state
    const [dragging, setDragging] = useState(null);
    const dragRef = useRef(null);

    // Persist changes
    const persistChanges = useCallback((newNotes) => {
      setStickyNotes(newNotes);
      if (onChange) {
        onChange(newNotes);
      }
    }, [onChange]);

    // Add new note
    const addNote = useCallback(() => {
      const colorIndex = stickyNotes.length % colorPalette.length;
      const newNote = {
        id: `note-${Date.now()}`,
        text: 'Add your notes...',
        color: colorPalette[colorIndex],
        x: 20 + (stickyNotes.length % 4) * 220,
        y: 20 + Math.floor(stickyNotes.length / 4) * 180,
        width: 200,
        height: 160,
      };
      const updatedNotes = [...stickyNotes, newNote];
      persistChanges(updatedNotes);
    }, [stickyNotes, persistChanges]);

    // Delete note
    const deleteNote = useCallback((noteId) => {
      const updatedNotes = stickyNotes.filter(note => note.id !== noteId);
      persistChanges(updatedNotes);
    }, [stickyNotes, persistChanges]);

    // Update note text
    const updateNoteText = useCallback((noteId, newText) => {
      const updatedNotes = stickyNotes.map(note =>
        note.id === noteId ? { ...note, text: newText } : note
      );
      persistChanges(updatedNotes);
    }, [stickyNotes, persistChanges]);

    // Handle drag start
    const handleMouseDown = useCallback((e, note) => {
      e.preventDefault();
      const rect = e.currentTarget.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const offsetY = e.clientY - rect.top;
      
      setDragging({
        id: note.id,
        offsetX,
        offsetY,
        startX: e.clientX,
        startY: e.clientY,
      });
    }, []);

    // Handle drag
    const handleMouseMove = useCallback((e) => {
      if (!dragging) return;

      const deltaX = e.clientX - dragging.startX;
      const deltaY = e.clientY - dragging.startY;

      const updatedNotes = stickyNotes.map(note =>
        note.id === dragging.id
          ? {
              ...note,
              x: Math.max(0, note.x + deltaX),
              y: Math.max(0, note.y + deltaY),
            }
          : note
      );

      setStickyNotes(updatedNotes);
      setDragging(prev => ({
        ...prev,
        startX: e.clientX,
        startY: e.clientY,
      }));
    }, [dragging, stickyNotes]);

    // Handle drag end
    const handleMouseUp = useCallback(() => {
      if (dragging) {
        setDragging(null);
        // Persist final position
        if (onChange) {
          onChange(stickyNotes);
        }
      }
    }, [dragging, stickyNotes, onChange]);

    // Add event listeners for drag
    useEffect(() => {
      if (dragging) {
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
          document.removeEventListener('mousemove', handleMouseMove);
          document.removeEventListener('mouseup', handleMouseUp);
        };
      }
    }, [dragging, handleMouseMove, handleMouseUp]);

    return React.createElement(Box, {
      sx: {
        position: 'relative',
        width: '100%',
        height: containerHeight,
        backgroundColor: isDark ? '#1a1a1a' : '#f5f5f5',
        borderRadius: 2,
        overflow: 'hidden',
        userSelect: 'none',
      },
      ...otherProps
    }, [
      // Add button in top right
      React.createElement(IconButton, {
        key: 'add-btn',
        onClick: addNote,
        sx: {
          position: 'absolute',
          top: 16,
          right: 16,
          zIndex: 1000,
          backgroundColor: isDark ? '#333' : '#fff',
          color: isDark ? '#fff' : '#333',
          boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
          '&:hover': {
            backgroundColor: isDark ? '#444' : '#f0f0f0',
          },
        }
      }, React.createElement(AddIcon)),

      // Render all sticky notes
      ...stickyNotes.map((note) => React.createElement(Paper, {
        key: note.id,
        sx: {
          position: 'absolute',
          left: note.x,
          top: note.y,
          width: note.width,
          height: note.height,
          backgroundColor: note.color.bg,
          cursor: dragging?.id === note.id ? 'grabbing' : 'grab',
          userSelect: 'none',
          borderRadius: 2,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          overflow: 'hidden',
          border: '1px solid rgba(0,0,0,0.1)',
          transition: dragging?.id === note.id ? 'none' : 'box-shadow 0.2s',
          '&:hover': {
            boxShadow: '0 6px 16px rgba(0,0,0,0.2)',
          },
        },
        elevation: 0,
        onMouseDown: (e) => handleMouseDown(e, note)
      }, [
        // Delete button in top right of note
        React.createElement(IconButton, {
          key: 'delete-btn',
          onClick: (e) => {
            e.stopPropagation();
            deleteNote(note.id);
          },
          sx: {
            position: 'absolute',
            top: 4,
            right: 4,
            zIndex: 10,
            width: 24,
            height: 24,
            backgroundColor: 'rgba(0,0,0,0.1)',
            color: note.color.text,
            '&:hover': {
              backgroundColor: 'rgba(0,0,0,0.2)',
            },
          }
        }, React.createElement(CloseIcon, { sx: { fontSize: 16 } })),

        // Note content textarea
        React.createElement('textarea', {
          key: 'content',
          value: note.text,
          onChange: (e) => updateNoteText(note.id, e.target.value),
          onClick: (e) => e.stopPropagation(),
          onMouseDown: (e) => e.stopPropagation(),
          style: {
            width: '100%',
            height: '100%',
            border: 'none',
            outline: 'none',
            resize: 'none',
            backgroundColor: 'transparent',
            color: note.color.text,
            padding: '12px',
            fontSize: '14px',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
            lineHeight: '1.4',
          },
          placeholder: 'Add your notes...'
        })
      ]))
    ]);
  },
            cursor: 'move',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            px: 1,
            height: 28,
            bgcolor: 'rgba(0,0,0,0.06)',
          }
        }, [
          React.createElement(Typography, { key: 't', variant: 'caption', sx: { fontWeight: 600 } }, 'Sticky'),
          React.createElement(IconButton, { key: 'x', size: 'small', onClick: () => deleteNote(note.id) }, React.createElement(CloseIcon, null))
        ]),
        React.createElement(Box, { key: 'body', sx: { flex: 1, p: 1 } },
          React.createElement('textarea', {
            value: note.text || '',
            onChange: (e) => updateNote(note.id, { text: e.target.value }),
            style: {
              width: '100%',
              height: '100%',
              border: 'none',
              outline: 'none',
              resize: 'none',
              background: 'transparent',
              font: '14px/1.4 ui-sans-serif, system-ui, -apple-system',
              color: '#111',
            }
          })
        )
      ])),
    ]);
  },

  CRMBoard: (props) => {
    const { stages = ['Todo','In Progress','Done'], items = [], persistKey = 'crm-board' } = props || {};
    const [data] = useEmbeddedData(persistKey, { stages, items });
    const s = Array.isArray(data?.stages) && data.stages.length ? data.stages : stages;
    const its = Array.isArray(data?.items) && data.items.length ? data.items : items;
    return (
      React.createElement(Stack, { direction: 'row', spacing: 2 },
        ...s.map((stage, i) => (
          React.createElement(Paper, { key: i, sx: { p: 1, flex: 1 } },
            React.createElement(Typography, { variant: 'subtitle2', color: 'text.secondary' }, stage),
            ...its.filter(it => (it.status || s[0]) === stage).map((it, k) => (
              React.createElement(Card, { key: k, sx: { mb: 1 } },
                React.createElement(CardContent, null,
                  React.createElement(Typography, { variant: 'body2', fontWeight: 600 }, it.title || it.name || ('Item ' + (k+1))),
                  React.createElement(Typography, { variant: 'caption', color: 'text.secondary' }, it.description || it.summary || '')
                )
              )
            ))
          )
        ))
      )
    );
  },

  // Alias for project management kanban
  PMBoard: (props) => Templates.CRMBoard(props),

  // Executive OKR tracker (objectives and key results)
  OKRTracker: (props) => {
    const { objectives = [], persistKey = 'okr-tracker' } = props || {};
    const [data, setData] = useEmbeddedData(persistKey, { objectives });
    const source = Array.isArray(data?.objectives) && data.objectives.length ? data.objectives : objectives;
    const rows = source.map((r, i) => ({ id: r.id ?? 'okr-' + (i+1), ...r }));
    const columns = [
      { field: 'objective', headerName: 'Objective', flex: 2, minWidth: 160 },
      { field: 'key_result', headerName: 'Key Result', flex: 2, minWidth: 160 },
      { field: 'owner', headerName: 'Owner', flex: 1, minWidth: 120 },
      { field: 'progress', headerName: 'Progress %', flex: 1, minWidth: 120, type: 'number' },
    ];
    const addRow = () => {
      const next = [...source, { id: 'okr-' + Date.now(), objective: '', key_result: '', owner: '', progress: 0 }];
      setData({ ...(data || {}), objectives: next });
    };
    return (
      React.createElement(Paper, { sx: { p: 1 } },
        React.createElement(Stack, { spacing: 1 },
          React.createElement(Stack, { direction: 'row', justifyContent: 'flex-end' },
            React.createElement(Button, { variant: 'contained', size: 'small', startIcon: React.createElement(AddIcon, null), onClick: addRow }, 'Add Row')
          ),
          React.createElement(DataGrid, { autoHeight: true, density: 'compact', rows, columns, disableRowSelectionOnClick: true })
        )
      )
    );
  },

  // HR leave requests manager
  HRLeave: (props) => {
    const { requests = [], persistKey = 'hr-leave' } = props || {};
    const [data, setData] = useEmbeddedData(persistKey, { requests });
    const source = Array.isArray(data?.requests) && data.requests.length ? data.requests : requests;
    const rows = source.map((r, i) => ({ id: r.id ?? 'leave-' + (i+1), ...r }));
    const columns = [
      { field: 'employee', headerName: 'Employee', flex: 1.2, minWidth: 140 },
      { field: 'type', headerName: 'Type', flex: 1, minWidth: 120 },
      { field: 'start', headerName: 'Start', flex: 1, minWidth: 120 },
      { field: 'end', headerName: 'End', flex: 1, minWidth: 120 },
      { field: 'status', headerName: 'Status', flex: 1, minWidth: 120 },
    ];
    const addRow = () => {
      const next = [...source, { id: 'leave-' + Date.now(), employee: '', type: '', start: '', end: '', status: '' }];
      setData({ ...(data || {}), requests: next });
    };
    return (
      React.createElement(Paper, { sx: { p: 1 } },
        React.createElement(Stack, { spacing: 1 },
          React.createElement(Stack, { direction: 'row', justifyContent: 'flex-end' },
            React.createElement(Button, { variant: 'contained', size: 'small', startIcon: React.createElement(AddIcon, null), onClick: addRow }, 'Add Row')
          ),
          React.createElement(DataGrid, { autoHeight: true, density: 'compact', rows, columns, disableRowSelectionOnClick: true })
        )
      )
    );
  },
};
`;

import { extractFirstFence, looksLikeReactComponent, cleanupReactDeclarations } from './react-renderer/utils';

class ReactComponentRenderer extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      Component: null,
      error: null,
      loading: true,
    };
    this._lastNotifiedError = null;
  }

  componentDidMount() {
    this.renderComponent();
  }

  componentDidUpdate(prevProps) {
    if (prevProps.componentCode !== this.props.componentCode) {
      this.renderComponent();
    }
  }

  notifyErrorOnce = (msg) => {
    const message = typeof msg === 'string' ? msg : (msg?.message || String(msg));
    if (this._lastNotifiedError === message) return;
    this._lastNotifiedError = message;
    if (typeof this.props.onError === 'function') {
      this.props.onError(message);
    }
  };

  // helpers imported from ./react-renderer/utils

  renderComponent = async () => {
    const { componentCode, project, viewName } = this.props;

    if (!componentCode || !componentCode.trim()) {
      this.setState({ Component: null, error: null, loading: false });
      return;
    }

    try {
      this.setState({ loading: true, error: null });
      const Component = await this.createComponentFromCode(componentCode, project?.id, viewName);
      this.setState({ Component, error: null, loading: false });
    } catch (error) {
      const message = error?.message || String(error);
      console.error('Error rendering AI-generated component:', error);
      this.setState({ error: message, Component: null, loading: false }, () => {
        this.notifyErrorOnce(message);
      });
    }
  };

  createComponentFromCode = async (raw, projectId, viewName) => {
    let src = extractFirstFence(raw);

    // Simple cache to avoid re-transforming the same code repeatedly (prevents OOM)
    const globalCache = (typeof window !== 'undefined')
      ? (window.__aiMicroAppCache || (window.__aiMicroAppCache = new Map()))
      : null;
    const cacheKey = 'v3:' + (src || '');
    if (globalCache && globalCache.has(cacheKey)) {
      return globalCache.get(cacheKey);
    }
    let extractedEmbeddedData = {};

    // More robust regex to capture the complete embedded data object
    const embeddedMatch = /\/\*\s*EMBEDDED_DATA_START\s*\*\/\s*const\s+__EMBEDDED_DATA__\s*=\s*(\{[\s\S]*?\});?\s*\/\*\s*EMBEDDED_DATA_END\s*\*\//.exec(src);
    if (embeddedMatch) {
      try {
        extractedEmbeddedData = JSON.parse(embeddedMatch[1]);
      } catch (error) {
        console.warn('[ReactComponentRenderer] Failed to parse embedded data:', error);
        console.warn('[ReactComponentRenderer] Embedded data content:', embeddedMatch[1].substring(0, 500) + '...');

        // Try to fix common JSON issues
        try {
          let fixedJson = embeddedMatch[1]
            .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
            .replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:/g, '$1"$2":'); // Quote unquoted keys

          extractedEmbeddedData = JSON.parse(fixedJson);
          console.log('[ReactComponentRenderer] Successfully parsed fixed JSON');
        } catch (fixError) {
          console.error('[ReactComponentRenderer] Could not fix embedded data JSON:', fixError);
          // Continue without embedded data
        }
      }
      // Always remove the embedded data block, even if parsing failed
      src = src.replace(embeddedMatch[0], '');
    }

    // FIX: Clean up React declarations BEFORE Babel and other processing
    src = cleanupReactDeclarations(src);

    src = src.replace(/(^|\n)\s*import[^;]+;?/g, '\n');
    src = src.replace(/(^|\n)\s*export\s+(?!default)[^;]+;?/g, '\n');

    // Fix common icon usage issues - replace bare icon names with proper icon names
    src = src.replace(/\b(Add|Edit|Delete|Save|Close|Search|Refresh|Warning|Error|Info|CheckCircle|MoreVert|Settings|Send|FilterList)\b(?!\w)/g, '$1Icon');

    // Fix JSX usage of icons without Icon suffix
    src = src.replace(/<(Add|Edit|Delete|Save|Close|Search|Refresh|Warning|Error|Info|CheckCircle|MoreVert|Settings|Send|FilterList)\s*\/>/g, '<$1Icon />');
    src = src.replace(/<(Add|Edit|Delete|Save|Close|Search|Refresh|Warning|Error|Info|CheckCircle|MoreVert|Settings|Send|FilterList)\s*>/g, '<$1Icon>');
    src = src.replace(/<\/(Add|Edit|Delete|Save|Close|Search|Refresh|Warning|Error|Info|CheckCircle|MoreVert|Settings|Send|FilterList)>/g, '</$1Icon>');

    // Remove raw icon-name text used as labels (e.g., >SaveIcon< → >Save<)
    src = src.replace(/>(\s*)(Add|Edit|Delete|Save|Close|Search|Refresh|Warning|Error|Info|CheckCircle|MoreVert|Settings|Send|FilterList)Icon(\s*)</g, '>$1$2$3<');

    // Map string placeholders like startIcon="add icon" or startIcon="Add icn" to actual icon components
    const mapStringIconToComponent = (label) => {
      const v = String(label || '').toLowerCase().trim();
      const has = (kw) => v.includes(kw);
      if (has('add') || has('plus') || has('create') || v === '+') return 'AddIcon';
      if (has('delete') || has('trash') || has('remove')) return 'DeleteIcon';
      if (has('edit') || has('pencil')) return 'EditIcon';
      if (has('save') || has('disk')) return 'SaveIcon';
      if (has('close') || v === 'x') return 'CloseIcon';
      if (has('search') || has('find') || has('magnify')) return 'SearchIcon';
      if (has('refresh') || has('reload')) return 'RefreshIcon';
      if (has('warning') || has('warn') || has('alert')) return 'WarningIcon';
      if (has('error') || has('danger')) return 'ErrorIcon';
      if (has('info') || has('information')) return 'InfoIcon';
      if (has('check') || has('done') || has('ok') || has('success')) return 'CheckCircleIcon';
      if (has('more') || has('kebab') || has('menu')) return 'MoreVertIcon';
      if (has('settings') || has('gear') || has('preferences')) return 'SettingsIcon';
      if (has('send') || has('submit')) return 'SendIcon';
      if (has('filter')) return 'FilterListIcon';
      if (has('back') || has('previous')) return 'ArrowBackIcon';
      if (has('forward') || has('next')) return 'ArrowForwardIcon';
      return null;
    };

    src = src.replace(/\b(startIcon|endIcon)\s*=\s*{?\s*(["'`])([^"'`]+)\2\s*}?/gi, (m, prop, q, val) => {
      const comp = mapStringIconToComponent(val.replace(/\bicn\b/gi, 'icon'));
      return comp ? `${prop}={<${comp} />}` : m;
    });

    // Final safety: if icon names leaked into text content (e.g., "AddIcon Task"), collapse "Icon" suffix in text nodes only
    try {
      const ICON_WORDS = ['Add', 'Edit', 'Delete', 'Save', 'Close', 'Search', 'Refresh', 'Warning', 'Error', 'Info', 'CheckCircle', 'MoreVert', 'Settings', 'Send', 'FilterList'];
      const iconWordRegex = new RegExp('\\b(' + ICON_WORDS.join('|') + ')Icon\\b', 'g');
      src = src.replace(/>([^<]+)</g, (match, inner) => {
        const replaced = inner.replace(iconWordRegex, (w) => w.replace('Icon', ''));
        return '>' + replaced + '<';
      });
    } catch (_) { /* noop */ }

    // Ensure StyledComponents destructuring exists when components are referenced
    const styledNames = ['ContentContainer', 'BeautifulCard', 'SectionHeader', 'FormContainer', 'PrimaryButton', 'SuccessButton', 'DangerButton'];
    const usesStyled = styledNames.some(n => new RegExp('(^|[^.\\w])' + n + '\\b').test(src));
    const hasDestructure = /const\s*\{\s*ContentContainer\s*,/m.test(src) || /StyledComponents\./.test(src);
    if (usesStyled && !hasDestructure) {
      const destructureLine = 'const { ContentContainer, BeautifulCard, SectionHeader, FormContainer, PrimaryButton, SuccessButton, DangerButton } = StyledComponents;\n';
      src = destructureLine + src;
    }

    const hasExportDefault = /export\s+default\s+/.test(src);
    const looksLikeJSX = /<\w[\s\S]*>/.test(src) || /React\.createElement\(/.test(src);
    const hasNamedComponent = /(function\s+\w+\s*\(|const\s+\w+\s*=\s*(?:\([^)]*\)\s*=>|function\s*\()|class\s+\w+\s+extends\s+React\.Component)/.test(src);

    const sanitizeHtml = (html) => {
      let safe = String(html);
      safe = safe.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '');
      safe = safe.replace(/ on[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
      safe = safe.replace(/javascript:/gi, '');
      return safe;
    };

    if (!hasExportDefault && !hasNamedComponent && looksLikeJSX) {
      const safe = sanitizeHtml(src);
      src = `export default function GeneratedComponent(){\n  const __html = ${JSON.stringify(safe)};\n  return <div style={{ width: '100%' }} dangerouslySetInnerHTML={{ __html }} />;\n}`;
    }

    if (!looksLikeReactComponent(src)) {
      const safeText = String(src || '').slice(0, 20000);
      src = `export default function GeneratedComponent(){\n  const __text = ${JSON.stringify(safeText)};\n  return <pre style={{whiteSpace:'pre-wrap', fontFamily:'ui-monospace, SFMono-Regular, Menlo, monospace'}}>{__text}</pre>;\n}`;
    }

    let componentName = 'GeneratedComponent';

    const defaultFnMatch = src.match(/export\s+default\s+function\s*(\w+)?/);
    if (defaultFnMatch) {
      componentName = defaultFnMatch[1] || 'GeneratedComponent';
      src = src.replace(/export\s+default\s+function\s*(\w+)?/, (full, name) => {
        return `function ${name || componentName}`;
      });
    }

    const defaultClassMatch = src.match(/export\s+default\s+class\s*(\w+)?/);
    if (defaultClassMatch) {
      componentName = defaultClassMatch[1] || 'GeneratedComponent';
      src = src.replace(/export\s+default\s+class\s*(\w+)?/, (full, name) => {
        return `class ${name || componentName}`;
      });
    }

    const defaultExprMatch = src.match(/export\s+default\s+([A-Za-z_$][\w$]*)/);
    if (defaultExprMatch) {
      componentName = defaultExprMatch[1];
      src = src.replace(/export\s+default\s+([A-Za-z_$][\w$]*)\s*;?/, '$1;');
    }

    if (/export\s+default\s*\(/.test(src) || /export\s+default\s+\(/.test(src)) {
      src = src.replace(/export\s+default\s*\(/, `const ${componentName} = (`);
      src += `\nexport default ${componentName};`;
    }

    if (!/export\s+default\s+/.test(src)) {
      const namedFn = src.match(/function\s+([A-Za-z_$][\w$]*)\s*\(/);
      const constComp = src.match(/const\s+([A-Za-z_$][\w$]*)\s*=\s*(?:\([^)]*\)\s*=>|function\s*\()/);
      const classComp = src.match(/class\s+([A-Za-z_$][\w$]*)\s+extends\s+React\.Component/);
      componentName = (namedFn && namedFn[1]) || (constComp && constComp[1]) || (classComp && classComp[1]) || componentName;
      src += `\nexport default ${componentName};`;
    }

    // console.log('[ReactComponentRenderer] Original source before React import removal:', src.substring(0, 300));
    src = cleanupReactDeclarations(src);
    // console.log('[ReactComponentRenderer] Source after React import removal:', src.substring(0, 300));

    src = src.replace(/(^|\n)\s*export\s+default\s+/g, '\n');

    // Load Babel in a way that works across bundlers (UMD/ESM)
    // Use a singleton so we don't re-import / re-inject Babel repeatedly
    let babel = (typeof window !== 'undefined' ? (window.__BabelSingleton || window.Babel) : null);
    if (!babel || typeof babel.transform !== 'function') {
      try {
        if (typeof window !== 'undefined' && window.__BabelPromise) {
          await window.__BabelPromise;
        } else {
          const p = import('@babel/standalone').then((B) => {
            const inst = B?.default || B?.Babel || B || (typeof window !== 'undefined' ? window.Babel : null);
            if (typeof window !== 'undefined') window.__BabelSingleton = inst;
            return inst;
          }).catch(() => (typeof window !== 'undefined' ? window.Babel : null));
          if (typeof window !== 'undefined') window.__BabelPromise = p;
          babel = await p;
        }
      } catch (_) {
        babel = (typeof window !== 'undefined' ? window.Babel : null);
      }
    }

    if (!babel || typeof babel.transform !== 'function') {
      // As a last resort, inject from CDN so JSX can be compiled client-side
      if (typeof document !== 'undefined') {
        await (window.__BabelCdnPromise ||= new Promise((resolve) => {
          if (window.Babel && typeof window.Babel.transform === 'function') return resolve();
          const existing = document.querySelector('script[data-babel-standalone]');
          if (existing) { existing.addEventListener('load', () => resolve()); return; }
          const s = document.createElement('script');
          s.src = 'https://unpkg.com/@babel/standalone/babel.min.js';
          s.async = true; s.dataset.babelStandalone = '1';
          s.onload = resolve; s.onerror = resolve; document.head.appendChild(s);
        }));
        babel = window.Babel; if (typeof window !== 'undefined') window.__BabelSingleton = babel;
      }
    }

    let transformed = '';
    const needsJSXTransform = /<\w|react\.createelement\(/i.test(src);
    if (babel && typeof babel.transform === 'function') {
      const result = babel.transform(src, {
        filename: 'file.tsx',
        presets: [
          ['react', { runtime: 'classic', development: false }],
          'typescript',
        ],
        sourceType: 'module',
        comments: false,
        compact: false,
      });
      transformed = (result && result.code) || src;
    } else {
      // If Babel couldn't be loaded, only proceed without transform for code that doesn't use JSX
      transformed = needsJSXTransform ? '' : src;
      if (!transformed) {
        throw new Error('Babel unavailable to transform JSX');
      }
    }

    // console.log('[ReactComponentRenderer] Code after Babel transformation:', transformed.substring(0, 300));

    // FIX: CRITICAL - Clean up React declarations AFTER Babel transformation
    transformed = cleanupReactDeclarations(transformed);

    // console.log('[ReactComponentRenderer] Code after final React cleanup:', transformed.substring(0, 300));

    transformed = transformed.replace(/(^|\n)\s*export\s+[^;\n]*;?/g, '');

    const designTokensLiteral = JSON.stringify(DESIGN_TOKENS, null, 2);

    let factoryCode = `
// Bind React from the injected argument without polluting globals
const React = __React || (typeof window !== 'undefined' ? window.React : undefined);
const { useState, useEffect, useMemo, useCallback, useRef, useReducer, useLayoutEffect } = React;
const designTokens = ${designTokensLiteral};
${STYLE_UTILS_SNIPPET}
${STYLED_COMPONENTS_SNIPPET}
${TEMPLATES_SNIPPET}

const {
  Box,
  Paper,
  Typography,
  Button,
  ButtonGroup,
  TextField,
  IconButton,
  Chip,
  Card,
  CardHeader,
  CardContent,
  CardActions,
  Grid,
  Stack,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TableSortLabel,
  Toolbar,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  Checkbox,
  Radio,
  RadioGroup,
  FormControlLabel,
  Tabs,
  Tab,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemButton,
  Avatar,
  Badge,
  Tooltip,
  CircularProgress,
  LinearProgress,
  Container,
  AppBar,
  Fab,
  Backdrop,
  Modal,
  Drawer,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  InputAdornment,
  OutlinedInput,
  FilledInput,
  Input,
  FormHelperText,
  FormLabel,
  FormGroup,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Breadcrumbs,
  Link,
  Popover,
  Menu,
  Skeleton,
  ThemeProvider,
  createTheme,
  styled,
  alpha,
  CssBaseline,
  useTheme,
} = MuiMaterial;

const {
  DataGrid,
  GridToolbar,
  GridActionsCellItem,
} = MuiDataGrid;

const {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip: RechartsTooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area,
} = Recharts;

const {
  Add: AddIcon,
  Edit: EditIcon,
  Delete: DeleteIcon,
  Save: SaveIcon,
  Close: CloseIcon,
  Search: SearchIcon,
  Refresh: RefreshIcon,
  ArrowBack: ArrowBackIcon,
  ArrowForward: ArrowForwardIcon,
  Warning: WarningIcon,
  Error: ErrorIcon,
  Info: InfoIcon,
  CheckCircle: CheckCircleIcon,
  MoreVert: MoreVertIcon,
  Settings: SettingsIcon,
  Send: SendIcon,
  FilterList: FilterListIcon,
} = MuiIcons;

const embeddedData = extractedEmbeddedData || {};
const sharedProjectId = projectId || (project && project.id) || null;
const sharedViewName = viewName || 'default';

// Provide stable task arrays usable by AI-generated code
const flatTasks = Array.isArray(allTasks)
  ? allTasks
  : Array.isArray(tasks)
    ? tasks
    : (tasks && typeof tasks === 'object'
        ? Object.values(tasks).reduce((acc, value) => {
            if (Array.isArray(value)) acc.push(...value);
            return acc;
          }, [])
        : []);

// Synonyms and safe aliases expected by generated components
const authUser = auth;
const projectData = project;
const methodologyDataFromProps = methodology;
const usersDataFromProps = users;
// Always provide array-based task lists to match prompt examples
const __flatTasks = flatTasks;
const tasksDataFromProps = Array.isArray(tasks)
  ? tasks
  : (Array.isArray(allTasks) ? allTasks : __flatTasks);
const allTasksDataFromProps = Array.isArray(allTasks) ? allTasks : __flatTasks;
const __users = users;
const __project = project;


const ensureExternalStylesheet = (href) => {
  if (typeof document === 'undefined') return;
  if (document.querySelector('link[data-external-style="' + href + '"]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  link.dataset.externalStyle = href;
  document.head.appendChild(link);
};

const calendarLocalizerInstance = calendarLocalizer;

const externalFactoryCache = window.__externalFactoryCache || (window.__externalFactoryCache = {});
// Provide a host-managed dynamic import helper so evaluated code can load
// heavy optional libs (Vite will rewrite this import correctly).
// Removed external sticky-notes package loader; we use local implementation instead
// Loader for react-rnd (drag + resize)
if (typeof window !== 'undefined' && typeof window.__loadReactRnd !== 'function') {
  window.__loadReactRnd = async () => {
    try {
      return await import('react-rnd');
    } catch (e) {
      return null;
    }
  };
}

const externalFactoryLoaders = {
  'react-big-calendar': async () => {
    if (!externalFactoryCache['react-big-calendar']) {
      externalFactoryCache['react-big-calendar'] = {
        Calendar: RBCalendar,
        Views: RBViews,
        localizer: calendarLocalizerInstance,
      };
    }
    return externalFactoryCache['react-big-calendar'];
  },
  'react-rnd': async () => {
    if (externalFactoryCache['react-rnd']) return externalFactoryCache['react-rnd'];
    let module = null;
    if (typeof window !== 'undefined' && typeof window.__loadReactRnd === 'function') {
      module = await window.__loadReactRnd();
    }
    if (module) {
      const Rnd = module.Rnd || module.default || null;
      const factory = { Rnd, module };
      externalFactoryCache['react-rnd'] = factory;
      return factory;
    }
    externalFactoryCache['react-rnd'] = { Rnd: null };
    return externalFactoryCache['react-rnd'];
  },
  'local-sticky-notes': async () => {
    if (externalFactoryCache['local-sticky-notes']) return externalFactoryCache['local-sticky-notes'];
    let module = null;
    if (typeof window !== 'undefined' && typeof window.__loadLocalStickyNotes === 'function') {
      module = await window.__loadLocalStickyNotes();
    }
    const StickyNotesBoard = module?.default || null;
    const factory = { StickyNotesBoard };
    externalFactoryCache['local-sticky-notes'] = factory;
    return factory;
  },
};

const useExternalFactory = (name, deps = []) => {
  const [factory, setFactory] = React.useState(() => externalFactoryCache[name] || null);

  React.useEffect(() => {
    let active = true;
    if (externalFactoryCache[name]) {
      setFactory(externalFactoryCache[name]);
      return () => { active = false; };
    }
    let key = name;
    const loader = externalFactoryLoaders[key];
    if (!loader) {
      // Graceful fallback for any unknown sticky packages
      if (/sticky/i.test(key)) {
        const ReactStickyNotes = (props) => React.createElement(Templates.StickyNotes, props);
        const shim = { ReactStickyNotes, StickyNotes: ReactStickyNotes };
        externalFactoryCache[key] = shim;
        setFactory(shim);
      } else {
        console.warn('No external factory loader registered for', key);
      }
      return () => { active = false; };
    }
    loader()
      .then((mod) => {
        if (!active) return;
        externalFactoryCache[key] = mod;
        setFactory(mod);
      })
      .catch((error) => {
        // On failure, downgrade sticky packages to the built-in implementation
        if (/sticky/i.test(key)) {
          const ReactStickyNotes = (props) => React.createElement(Templates.StickyNotes, props);
          const shim = { ReactStickyNotes, StickyNotes: ReactStickyNotes };
          externalFactoryCache[key] = shim;
          setFactory(shim);
          console.warn('Using built-in StickyNotes shim for', key, 'due to load error.');
        } else {
          console.error('Failed to load external factory', key, error);
        }
      });
    return () => { active = false; };
  }, [name, ...deps]);

  return factory;
};



const ProfessionalThemeWrapper = ({ children }) => {
  const outer = (typeof useTheme === 'function') ? useTheme() : null;
  const [mode, setMode] = React.useState(outer?.palette?.mode || (typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'));

  React.useEffect(() => {
    if (typeof document === 'undefined') return;
    const root = document.documentElement;
    const update = () => setMode(root.classList.contains('dark') ? 'dark' : 'light');
    update();
    const obs = new MutationObserver(update);
    obs.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  const isDarkMode = mode === 'dark';
  const surface = { default: isDarkMode ? '#0f172a' : '#ffffff', paper: isDarkMode ? '#111827' : '#ffffff' };



  const textColors = { primary: isDarkMode ? '#e5e7eb' : '#111827', secondary: isDarkMode ? 'rgba(229,231,235,0.7)' : '#4b5563' };

  const theme = React.useMemo(() => createTheme({
    palette: {
      mode,
      background: { default: surface.default, paper: surface.paper },
      text: { primary: textColors.primary, secondary: textColors.secondary },
      primary: {
        light: outer?.palette?.primary?.light || designTokens.colors.primary[400],
        main: outer?.palette?.primary?.main || designTokens.colors.primary[600],
        dark: outer?.palette?.primary?.dark || designTokens.colors.primary[800],
      },
      success: { main: outer?.palette?.success?.main || designTokens.colors.success[600] },
      warning: { main: outer?.palette?.warning?.main || designTokens.colors.warning[600] },
      error: { main: outer?.palette?.error?.main || designTokens.colors.danger[600] },
    },
    shape: { borderRadius: 10 },
    components: {
      MuiCssBaseline: {
        styleOverrides: {
          body: { backgroundImage: 'none', backgroundColor: surface.default, color: textColors.primary },
          '.MuiDataGrid-root .MuiDataGrid-columnHeaders': { minHeight: 40, maxHeight: 40 },
          '.MuiDataGrid-root .MuiDataGrid-row': { minHeight: 36, maxHeight: 36 },
          '.MuiDataGrid-root .MuiDataGrid-cell': { padding: '0 8px' },
        },
      },
      MuiPaper: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { boxShadow: 'none', backgroundImage: 'none', backgroundColor: surface.paper, color: textColors.primary, border: '1px solid ' + (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)') } },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { boxShadow: 'none', backgroundImage: 'none', backgroundColor: surface.paper, color: textColors.primary, border: '1px solid ' + (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)') } },
      },
      MuiButton: {
        defaultProps: { size: 'small', disableElevation: true },
        styleOverrides: {
          root: { textTransform: 'none', borderRadius: 8, padding: '3px 8px', minHeight: 22, minWidth: 40, fontSize: '0.85rem', lineHeight: 1.2, '& .MuiButton-startIcon': { marginRight: 6 } },
          contained: { boxShadow: 'none' },
          // Let MUI use palette colors so generator matches app theme
          containedPrimary: {},
          containedSuccess: {},
          containedError: {},
          outlined: { borderColor: isDarkMode ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.22)' },
        },
      },
      MuiTextField: {
        defaultProps: { size: 'small', margin: 'dense' },
        styleOverrides: { root: { '& .MuiOutlinedInput-root': { minHeight: 28, '& input.MuiInputBase-input': { padding: '6px 8px', fontSize: '0.9rem' } } } },
      },
      MuiFormControl: { defaultProps: { size: 'small', margin: 'dense' } },
      MuiFab: { defaultProps: { size: 'small', color: 'primary' }, styleOverrides: { root: { boxShadow: 'none' } } },
      MuiIconButton: { defaultProps: { size: 'small' } },
      MuiChip: { defaultProps: { size: 'small' } },
      MuiListItem: { defaultProps: { dense: true } },
      MuiDivider: { styleOverrides: { root: { borderColor: isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)' } } },
    },
  }), [mode]);

  return React.createElement(ThemeProvider, { theme }, React.createElement(CssBaseline, null), children);
};

async function saveViewData(dataKey, data) {
  if (!sharedProjectId) {
    return { success: false, message: 'Missing project id' };
  }

  try {
    const response = await csrfFetch('/projects/' + sharedProjectId + '/custom-views/save-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        view_name: sharedViewName,
        data_key: String(dataKey || 'default'),
        data,
      }),
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      return { success: false, status: response.status, ...payload };
    }

    return payload || { success: true };
  } catch (error) {
    console.error('saveViewData error:', error);
    return { success: false, error: error.message };
  }
}

async function loadViewData(dataKey) {
  if (!sharedProjectId) {
    return null;
  }

  try {
    const response = await csrfFetch('/projects/' + sharedProjectId + '/custom-views/load-data?view_name=' + encodeURIComponent(sharedViewName) + '&data_key=' + encodeURIComponent(String(dataKey || 'default')), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
      },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return null;
    }

    if (payload && payload.success && payload.data && Object.prototype.hasOwnProperty.call(payload.data, 'data')) {
      return payload.data.data;
    }

    if (payload && Object.prototype.hasOwnProperty.call(payload, 'data')) {
      return payload.data;
    }

    return null;
  } catch (error) {
    console.warn('loadViewData error:', error);
    return null;
  }
}

function useEmbeddedData(dataKey, defaultValue = null) {
  const [state, setState] = useState(() => {
    if (embeddedData && Object.prototype.hasOwnProperty.call(embeddedData, dataKey)) {
      return embeddedData[dataKey];
    }
    return defaultValue;
  });
  const [isLoaded, setIsLoaded] = useState(false);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    let active = true;
    (async () => {
      const latest = await loadViewData(dataKey);
      if (!active) return;
      if (latest !== null && latest !== undefined) {
        stateRef.current = latest;
        setState(latest);
      }
      setIsLoaded(true);
    })();
    return () => {
      active = false;
    };
  }, [dataKey]);

  const persist = useCallback(async (value) => {
    const next = typeof value === 'function' ? value(stateRef.current) : value;
    stateRef.current = next;
    setState(next);
    await saveViewData(dataKey, next);
    return next;
  }, [dataKey]);

  return [state, persist, isLoaded];
}

${transformed}

// Allow EMBEDDED_DATA to request a Template render without requiring the model to write boilerplate
let FinalComponent = ${componentName};
    try {
      const tplName = (embeddedData && (embeddedData.template || embeddedData.Template || embeddedData.template_name)) || null;
      if (tplName && Templates && typeof Templates[tplName] === 'function') {
        const cfg = embeddedData.config || embeddedData.templateConfig || {};
        FinalComponent = (props) => React.createElement(Templates[tplName], { ...cfg, ...props });
      }
    } catch (e) { /* ignore template wiring errors */ }

const __Themed = (props) => (
  React.createElement(ProfessionalThemeWrapper, null,
    React.createElement(FinalComponent, props)
  )
);

    return __Themed;
`;

    try {
      const occurrences = (factoryCode.match(/\bconst\s+React\s*=/g) || []).length + (factoryCode.match(/\bvar\s+React\s*=/g) || []).length + (factoryCode.match(/\blet\s+React\s*=/g) || []).length;
      // Log only a small head to avoid console noise
      // Clean factory code of any React redeclarations
    } catch (_) { /* noop */ }

    const factory = new Function(
      '__React',
      'RBCalendar',
      'RBViews',
      'calendarLocalizer',
      'Recharts',
      'MuiDataGrid',
      'MuiMaterial',
      'MuiIcons',
      'csrfFetch',
      'project',
      'tasks',
      'allTasks',
      'users',
      'methodology',
      'auth',
      'viewName',
      'projectId',
      'extractedEmbeddedData',
      factoryCode,
    );

    const csrfFetch = async (input, init = {}) => {
      const token = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content') || '';
      const options = { ...init };
      const headers = {
        Accept: 'application/json',
        ...(options.headers || {}),
      };
      if (!headers['X-CSRF-TOKEN']) {
        headers['X-CSRF-TOKEN'] = token;
      }
      if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
      }
      options.headers = headers;
      options.credentials = options.credentials || 'same-origin';
      const url = (() => {
        try {
          return new URL(input, window.location.origin).toString();
        } catch (error) {
          return input;
        }
      })();
      return fetch(url, options);
    };

    // Create calendar localizer instance
    const calendarLocalizer = rbDateFnsLocalizer({
      format: dfFormat,
      parse: dfParse,
      startOfWeek: dfStartOfWeek,
      getDay: dfGetDay,
      locales: { 'en-US': enUSLocale }
    });

    const __ThemedFromFactory = factory(
      React,
      RBCalendar,
      RBViews,
      calendarLocalizer,
      Recharts,
      MuiDataGrid,
      MuiMaterial,
      MuiIcons,
      csrfFetch,
      this.props.project,
      this.props.tasks,
      this.props.allTasks,
      this.props.users,
      this.props.methodology,
      this.props.auth,
      viewName,
      projectId,
      extractedEmbeddedData,
    );
    if (globalCache && !globalCache.has(cacheKey)) {
      try { globalCache.set(cacheKey, __ThemedFromFactory); } catch (_) {}
    }
    return __ThemedFromFactory;
  };

  render() {
    const { Component, error, loading } = this.state;
    const { project, auth, tasks, allTasks, users, methodology } = this.props;

    if (loading) {
      return (
        <div className="flex items-center justify-center p-8 text-gray-700 dark:text-gray-200">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
          <span className="ml-3">Loading micro-application...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 m-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error Loading Component</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                <p>{error}</p>
                <p className="mt-2">
                  Please regenerate your component. The renderer only accepts valid TSX/JSX with <code>export default</code>.
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    if (!Component) {
      return (
        <div className="text-center p-8 text-gray-600 dark:text-gray-300">
          <p>No micro-application available.</p>
          <p className="text-sm mt-2">Use the assistant to create a custom application.</p>
        </div>
      );
    }

    return (
      <ErrorBoundary onErrorOnce={this.notifyErrorOnce}>
        <div className="micro-app-wrapper text-gray-900 dark:text-gray-100">
          <Component
            project={project}
            auth={auth}
            tasks={tasks}
            allTasks={allTasks}
            users={users}
            methodology={methodology}
          />
        </div>
      </ErrorBoundary>
    );
  }
}

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('AI Component Error:', error, errorInfo);
    if (typeof this.props.onErrorOnce === 'function') {
      this.props.onErrorOnce(error?.message || String(error));
    }
  }

  render() {
    if (this.state.hasError) {
      const error = this.state.error;
      const errorMessage = error?.message || String(error);

      return (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6 m-4">
          <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Component crashed</h3>
          <p className="mt-2 text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ReactComponentRenderer;
