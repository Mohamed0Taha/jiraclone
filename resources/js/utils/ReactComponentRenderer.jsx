import React from 'react';
import { Calendar as RBCalendar, Views as RBViews, dateFnsLocalizer as rbDateFnsLocalizer } from 'react-big-calendar';
import { format as dfFormat, parse as dfParse, startOfWeek as dfStartOfWeek, getDay as dfGetDay } from 'date-fns';
import enUSLocale from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import * as Recharts from 'recharts';
import * as MuiMaterial from '@mui/material';
import * as MuiIcons from '@mui/icons-material';
import * as MuiDataGrid from '@mui/x-data-grid';

const DESIGN_TOKENS = {
  colors: {
    primary: {
      50: '#f0f9ff',
      100: '#e0f2fe',
      200: '#bae6fd',
      300: '#7dd3fc',
      400: '#38bdf8',
      500: '#0ea5e9',
      600: '#0284c7',
      700: '#0369a1',
      800: '#075985',
      900: '#0c4a6e'
    },
    success: {
      50: '#f0fdf4',
      100: '#dcfce7',
      200: '#bbf7d0',
      300: '#86efac',
      400: '#4ade80',
      500: '#22c55e',
      600: '#16a34a',
      700: '#15803d',
      800: '#166534',
      900: '#14532d'
    },
    warning: {
      50: '#fffbeb',
      100: '#fef3c7',
      200: '#fde68a',
      300: '#fcd34d',
      400: '#fbbf24',
      500: '#f59e0b',
      600: '#d97706',
      700: '#b45309',
      800: '#92400e',
      900: '#78350f'
    },
    danger: {
      50: '#fef2f2',
      100: '#fee2e2',
      200: '#fecaca',
      300: '#fca5a5',
      400: '#f87171',
      500: '#ef4444',
      600: '#dc2626',
      700: '#b91c1c',
      800: '#991b1b',
      900: '#7f1d1d'
    },
    neutral: {
      50: '#fafafa',
      100: '#f4f4f5',
      200: '#e4e4e7',
      300: '#d4d4d8',
      400: '#a1a1aa',
      500: '#71717a',
      600: '#52525b',
      700: '#3f3f46',
      800: '#27272a',
      900: '#18181b'
    }
  },
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '3rem',
    '3xl': '4rem'
  },
  shadows: {
    sm: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
    md: '0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -2px rgba(15, 23, 42, 0.1)',
    lg: '0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -4px rgba(15, 23, 42, 0.1)',
    xl: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 10px 10px -5px rgba(15, 23, 42, 0.04)'
  },
  borderRadius: {
    sm: '0.25rem',
    md: '0.375rem',
    lg: '0.5rem',
    xl: '0.75rem',
    '2xl': '1rem'
  }
};

const STYLE_UTILS_SNIPPET = String.raw`
const styleUtils = {
  spacing: (size) => ({
    margin: designTokens.spacing[size] || size,
    padding: designTokens.spacing[size] || size,
  }),
  elevation: (level) => ({
    boxShadow: designTokens.shadows[level] || level,
    borderRadius: designTokens.borderRadius.lg,
  }),
  colorVariant: (color, shade = 500) => {
    const swatch = (designTokens.colors[color] || {})[shade];
    return {
      backgroundColor: swatch,
      color: shade >= 500 ? '#ffffff' : designTokens.colors.neutral[800],
    };
  },
  flexCenter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  flexBetween: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gradients: {
    primary: 'linear-gradient(135deg, ' + designTokens.colors.primary[400] + ' 0%, ' + designTokens.colors.primary[600] + ' 100%)',
    success: 'linear-gradient(135deg, ' + designTokens.colors.success[400] + ' 0%, ' + designTokens.colors.success[600] + ' 100%)',
    warm: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    cool: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  },
};
`;

const STYLED_COMPONENTS_SNIPPET = String.raw`
const StyledComponents = {
  BeautifulCard: (props) => React.createElement(MuiMaterial.Card, {
    ...props,
    sx: {
      borderRadius: designTokens.borderRadius.lg,
      boxShadow: 'none',
      border: '1px solid',
      borderColor: 'divider',
      overflow: 'hidden',
      transition: 'border-color 120ms ease',
      '&:hover': { borderColor: 'divider' },
      ...props.sx,
    },
  }),
  FormContainer: (props) => React.createElement(MuiMaterial.Box, {
    ...props,
    sx: {
      padding: designTokens.spacing.md,
      backgroundColor: 'transparent',
      borderRadius: designTokens.borderRadius.lg,
      boxShadow: 'none',
      border: 'none',
      '& .MuiTextField-root': {
        marginBottom: designTokens.spacing.sm,
      },
      ...props.sx,
    },
  }),
  PrimaryButton: (props) => React.createElement(MuiMaterial.Button, {
    variant: 'contained',
    size: 'small',
    disableElevation: true,
    ...props,
    sx: {
      borderRadius: designTokens.borderRadius.md,
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '0.85rem',
      padding: '3px 8px',
      minHeight: '22px',
      minWidth: '40px',
      lineHeight: 1.2,
      whiteSpace: 'nowrap',
      '& .MuiButton-startIcon': { marginRight: 6 },
      boxShadow: 'none',
      ...props.sx,
    },
  }),
  SuccessButton: (props) => React.createElement(MuiMaterial.Button, {
    variant: 'contained',
    color: 'success',
    size: 'small',
    disableElevation: true,
    ...props,
    sx: {
      borderRadius: designTokens.borderRadius.md,
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '0.85rem',
      padding: '3px 8px',
      minHeight: '22px',
      minWidth: '40px',
      lineHeight: 1.2,
      whiteSpace: 'nowrap',
      '& .MuiButton-startIcon': { marginRight: 6 },
      boxShadow: 'none',
      ...props.sx,
    },
  }),
  DangerButton: (props) => React.createElement(MuiMaterial.Button, {
    variant: 'contained',
    color: 'error',
    size: 'small',
    disableElevation: true,
    ...props,
    sx: {
      borderRadius: designTokens.borderRadius.md,
      textTransform: 'none',
      fontWeight: 600,
      fontSize: '0.85rem',
      padding: '3px 8px',
      minHeight: '22px',
      minWidth: '40px',
      lineHeight: 1.2,
      whiteSpace: 'nowrap',
      '& .MuiButton-startIcon': { marginRight: 6 },
      boxShadow: 'none',
      ...props.sx,
    },
  }),
  FloatingAction: (props) => React.createElement(MuiMaterial.Fab, {
    color: 'primary',
    size: 'small',
    ...props,
    sx: {
      position: 'fixed',
      right: 16,
      bottom: 16,
      boxShadow: 'none',
      ...props.sx,
    },
  }),
  ContentContainer: (props) => React.createElement(MuiMaterial.Box, {
    ...props,
    sx: {
      padding: designTokens.spacing.md,
      backgroundColor: 'transparent',
      minHeight: 'auto',
      '& > *:not(:last-child)': {
        marginBottom: designTokens.spacing.md,
      },
      ...props.sx,
    },
  }),
  SectionHeader: (props) => React.createElement(MuiMaterial.Typography, {
    variant: 'subtitle2',
    ...props,
    sx: {
      fontWeight: 500,
      fontSize: '0.89rem',
      letterSpacing: '0.04em',
      textTransform: 'uppercase',
      color: 'text.secondary',
      marginBottom: designTokens.spacing.xs,
      paddingBottom: '4px',
      position: 'relative',
      borderBottom: '1px solid',
      borderBottomColor: 'divider',
      display: 'inline-block',
      '&::after': {
        content: '""',
        position: 'absolute',
        left: 0,
        bottom: -1,
        width: '40px',
        height: '2px',
        background: 'linear-gradient(90deg, ' + designTokens.colors.primary[400] + ', rgba(14,165,233,0))',
        borderRadius: '1px',
      },
      ...props.sx,
    },
  }),
};
`;

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
    const [data] = useEmbeddedData(persistKey, { rows, columns });
    const safeCols = (data?.columns?.length ? data.columns : columns).map((c, i) => ({ flex: 1, minWidth: 120, ...c, field: c.field || c.key || ('c' + i) }));
    const safeRows = (data?.rows?.length ? data.rows : rows).map((r, i) => ({ id: r.id ?? i+1, ...r }));
    return (
      React.createElement(Paper, { sx: { p: 1 } },
        React.createElement(DataGrid, { autoHeight: true, density: 'compact', rows: safeRows, columns: safeCols, disableRowSelectionOnClick: true })
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
      onUpdate,
      onDelete,
      onCreate,
      onMove,
      colors = ['#ffeb3b', '#ff9800', '#f44336', '#e91e63', '#9c27b0', '#673ab7'],
      allowResize = true,
      allowDrag = true,
      persistKey = 'sticky-notes',
      sessionKey = 'default-session',
      containerWidth = '100%',
      containerHeight = '500px',
      noteWidth = 200,
      noteHeight = 150,
      footer = true,
      ...otherProps
    } = props;

    // Load the external sticky notes component
    const stickyNotesFactory = useExternalFactory('@react-latest-ui/react-sticky-notes');
    
    if (!stickyNotesFactory?.ReactStickyNotes) {
      return React.createElement(Box, {
        sx: { 
          p: 3, 
          textAlign: 'center',
          border: '2px dashed #ccc',
          borderRadius: '8px',
          backgroundColor: '#f9f9f9'
        }
      }, [
        React.createElement(Typography, { key: 'loading', variant: 'body1' }, 'Loading Sticky Notes...'),
        React.createElement(Typography, { key: 'subtitle', variant: 'body2', color: 'text.secondary' }, 
          'Please wait while the sticky notes component loads.')
      ]);
    }

    const ReactStickyNotes = stickyNotesFactory.ReactStickyNotes;
    
    // Default notes if none provided
    const defaultNotes = React.useMemo(() => {
      if (Array.isArray(notes) && notes.length) {
        return notes.map(note => ({
          color: note.color || colors[0],
          text: note.text || note.content || 'New Note'
        }));
      }
      return [
        {
          color: colors[0],
          text: 'Welcome to Sticky Notes!\n\nDouble-click to edit this note.'
        },
        {
          color: colors[1] || colors[0],
          text: 'You can drag and resize notes!\n\nTry it out.'
        }
      ];
    }, [notes, colors]);

    const [notesData, setNotesData] = useEmbeddedData(persistKey, { notes: defaultNotes });
    const currentNotes = notesData?.notes || defaultNotes;

    // Handle note changes
    const handleBeforeChange = React.useCallback((type, payload, allNotes) => {
      // This fires before any change happens
      return payload;
    }, []);

    const handleChange = React.useCallback((type, payload, allNotes) => {
      // Update our embedded data
      setNotesData({ ...notesData, notes: allNotes });
      
      // Call appropriate callback based on action type
      if (type === 'add' && onCreate) {
        onCreate(payload);
      } else if (type === 'delete' && onDelete) {
        onDelete(payload.id);
      } else if (type === 'edit' && onUpdate) {
        onUpdate(payload.id, payload);
      } else if (type === 'move' && onMove) {
        onMove(payload.id, { x: payload.x, y: payload.y });
      }
    }, [notesData, setNotesData, onCreate, onDelete, onUpdate, onMove]);

    return React.createElement(Box, {
      sx: { 
        width: '100%',
        minHeight: '500px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        padding: '20px',
        '& .react-sticky-notes': {
          width: '100%',
          height: '100%'
        }
      },
      ...otherProps
    }, [
      React.createElement(ReactStickyNotes, {
        key: 'sticky-notes',
        sessionKey,
        colors,
        notes: currentNotes,
        containerWidth,
        containerHeight,
        noteWidth,
        noteHeight,
        footer,
        onBeforeChange: handleBeforeChange,
        onChange: handleChange
      })
    ]);
  },
            sx: { py: 1, px: 2, height: 'calc(100% - 64px)', overflow: 'hidden' }
          },
            React.createElement('textarea', {
              value: note.text || '',
              onChange: (e) => {
                e.stopPropagation();
                handleNoteUpdate(note.id, { text: e.target.value });
              },
              onFocus: (e) => {
                e.stopPropagation();
                setSelectedNote(note.id);
              },
              onClick: (e) => e.stopPropagation(),
              placeholder: 'Type your note here...',
              style: {
                width: '100%',
                height: '100%',
                border: 'none',
                outline: 'none',
                backgroundColor: 'transparent',
                resize: 'none',
                fontFamily: 'inherit',
                fontSize: '14px',
                color: '#333',
                padding: 0
              }
            })
          )
        ])
      ))
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
    const [data] = useEmbeddedData(persistKey, { objectives });
    const rows = (Array.isArray(data?.objectives) && data.objectives.length ? data.objectives : objectives).map((r, i) => ({ id: r.id ?? i+1, ...r }));
    const columns = [
      { field: 'objective', headerName: 'Objective', flex: 2, minWidth: 160 },
      { field: 'key_result', headerName: 'Key Result', flex: 2, minWidth: 160 },
      { field: 'owner', headerName: 'Owner', flex: 1, minWidth: 120 },
      { field: 'progress', headerName: 'Progress %', flex: 1, minWidth: 120, type: 'number' },
    ];
    return (
      React.createElement(Paper, { sx: { p: 1 } },
        React.createElement(DataGrid, { autoHeight: true, density: 'compact', rows, columns, disableRowSelectionOnClick: true })
      )
    );
  },

  // HR leave requests manager
  HRLeave: (props) => {
    const { requests = [], persistKey = 'hr-leave' } = props || {};
    const [data] = useEmbeddedData(persistKey, { requests });
    const rows = (Array.isArray(data?.requests) && data.requests.length ? data.requests : requests).map((r, i) => ({ id: r.id ?? i+1, ...r }));
    const columns = [
      { field: 'employee', headerName: 'Employee', flex: 1.2, minWidth: 140 },
      { field: 'type', headerName: 'Type', flex: 1, minWidth: 120 },
      { field: 'start', headerName: 'Start', flex: 1, minWidth: 120 },
      { field: 'end', headerName: 'End', flex: 1, minWidth: 120 },
      { field: 'status', headerName: 'Status', flex: 1, minWidth: 120 },
    ];
    return (
      React.createElement(Paper, { sx: { p: 1 } },
        React.createElement(DataGrid, { autoHeight: true, density: 'compact', rows, columns, disableRowSelectionOnClick: true })
      )
    );
  },
};
`;

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

  extractFirstFence = (text) => {
    const fence = /```(?:tsx|jsx|typescript|javascript|ts|js)?\s*([\s\S]*?)```/i.exec(text || '');
    if (fence && fence[1]) {
      return fence[1];
    }
    let cleaned = String(text || '').trim();
    cleaned = cleaned.replace(/^```[a-zA-Z]*\n/, '').replace(/\n```$/, '');
    return cleaned;
  };

  looksLikeReactComponent = (src) => {
    if (!src) return false;
    const hasExportDefault = /export\s+default\s+/.test(src);
    const looksLikeJSX = /<\w[\s\S]*>/.test(src) || /React\.createElement\(/.test(src);
    const explicitComponent = /(function\s+\w+\s*\(|const\s+\w+\s*=\s*(?:\([^)]*\)\s*=>|function\s*\()|class\s+\w+\s+extends\s+React\.Component)/.test(src);
    return hasExportDefault || explicitComponent || looksLikeJSX;
  };

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
    let src = this.extractFirstFence(raw);
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

    src = src.replace(/(^|\n)\s*import[^;]+;?/g, '\n');
    src = src.replace(/(^|\n)\s*export\s+(?!default)[^;]+;?/g, '\n');

    // Fix common icon usage issues - replace bare icon names with proper icon names
    src = src.replace(/\b(Add|Edit|Delete|Save|Close|Search|Refresh|Warning|Error|Info|CheckCircle|MoreVert|Settings|Send|FilterList)\b(?!\w)/g, '$1Icon');

    // Fix JSX usage of icons without Icon suffix
    src = src.replace(/<(Add|Edit|Delete|Save|Close|Search|Refresh|Warning|Error|Info|CheckCircle|MoreVert|Settings|Send|FilterList)\s*\/>/g, '<$1Icon />');
    src = src.replace(/<(Add|Edit|Delete|Save|Close|Search|Refresh|Warning|Error|Info|CheckCircle|MoreVert|Settings|Send|FilterList)\s*>/g, '<$1Icon>');
    src = src.replace(/<\/(Add|Edit|Delete|Save|Close|Search|Refresh|Warning|Error|Info|CheckCircle|MoreVert|Settings|Send|FilterList)>/g, '</$1Icon>');

    // Remove raw icon-name text used as labels (e.g., >SaveIcon< → >Save<)
    // This avoids buttons rendering literal strings like "SaveIcon" while keeping readable labels.
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

    if (!this.looksLikeReactComponent(src)) {
      const safeText = String(src || '').slice(0, 20000);
      src = `export default function GeneratedComponent(){\n  const __text = ${JSON.stringify(safeText)};\n  return <pre style={{whiteSpace:'pre-wrap', fontFamily:'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace', fontSize: 12, lineHeight: 1.5, padding: 12, background: '#fafafa', border: '1px solid #eee', borderRadius: 8}}>{__text}</pre>;\n}`;
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

    // Remove React imports BEFORE Babel transformation since React is provided by factory function
    console.log('[ReactComponentRenderer] Original source before React import removal:', src.substring(0, 300));
    src = src.replace(/import\s+React[^;]*;?\s*/gi, '');
    src = src.replace(/import\s*{[^}]*}\s*from\s*['"]react['"];?\s*/gi, '');
    console.log('[ReactComponentRenderer] Source after React import removal:', src.substring(0, 300));

    src = src.replace(/(^|\n)\s*export\s+default\s+/g, '\n');

    const BabelStandalone = await import('@babel/standalone');
    const babel = BabelStandalone?.default || BabelStandalone;

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

    let transformed = result.code || '';
    
    // Debug log to see transformed code after Babel
    console.log('[ReactComponentRenderer] Code after Babel transformation:', transformed.substring(0, 300));
    
    transformed = transformed.replace(/(^|\n)\s*export\s+[^;\n]*;?/g, '');

    const designTokensLiteral = JSON.stringify(DESIGN_TOKENS, null, 2);

    const factoryCode = `
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
  '@react-latest-ui/react-sticky-notes': async () => {
    if (externalFactoryCache['@react-latest-ui/react-sticky-notes']) return externalFactoryCache['@react-latest-ui/react-sticky-notes'];
    
    // Import the @react-latest-ui/react-sticky-notes package
    const module = await import('@react-latest-ui/react-sticky-notes');
    
    // This package is self-contained and doesn't require external stylesheets
    
    const ReactStickyNotesComponent = module.default || module.ReactStickyNotes || module;
    const factory = { ReactStickyNotes: ReactStickyNotesComponent, StickyNotes: ReactStickyNotesComponent, module };
    externalFactoryCache['@react-latest-ui/react-sticky-notes'] = factory;
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
    const loader = externalFactoryLoaders[name];
    if (!loader) {
      console.warn('No external factory loader registered for', name);
      return () => { active = false; };
    }
    loader()
      .then((mod) => {
        if (!active) return;
        externalFactoryCache[name] = mod;
        setFactory(mod);
      })
      .catch((error) => {
        console.error('Failed to load external factory', name, error);
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
        styleOverrides: { root: { boxShadow: 'none', backgroundImage: 'none', backgroundColor: surface.paper, color: textColors.primary, border: '1px solid ' + (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)') } },
      },
      MuiCard: {
        defaultProps: { elevation: 0 },
        styleOverrides: { root: { boxShadow: 'none', backgroundImage: 'none', backgroundColor: surface.paper, color: textColors.primary, border: '1px solid ' + (isDarkMode ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)') } },
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

    const factory = new Function(
      'React',
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

    return factory(
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
