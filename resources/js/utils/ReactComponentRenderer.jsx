import React from 'react';
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
      borderRadius: designTokens.borderRadius.xl,
      boxShadow: designTokens.shadows.md,
      border: '1px solid ' + designTokens.colors.neutral[200],
      overflow: 'hidden',
      transition: 'all 0.2s ease-in-out',
      '&:hover': {
        boxShadow: designTokens.shadows.lg,
        transform: 'translateY(-2px)',
      },
      ...props.sx,
    },
  }),
  FormContainer: (props) => React.createElement(MuiMaterial.Box, {
    ...props,
    sx: {
      padding: designTokens.spacing.xl,
      backgroundColor: '#ffffff',
      borderRadius: designTokens.borderRadius.xl,
      boxShadow: designTokens.shadows.md,
      border: '1px solid ' + designTokens.colors.neutral[200],
      '& .MuiTextField-root': {
        marginBottom: designTokens.spacing.md,
      },
      ...props.sx,
    },
  }),
  PrimaryButton: (props) => React.createElement(MuiMaterial.Button, {
    variant: 'contained',
    ...props,
    sx: {
      borderRadius: designTokens.borderRadius.lg,
      textTransform: 'none',
      fontWeight: 600,
      padding: designTokens.spacing.sm + ' ' + designTokens.spacing.lg,
      boxShadow: designTokens.shadows.sm,
      '&:hover': {
        boxShadow: designTokens.shadows.md,
        transform: 'translateY(-1px)',
      },
      ...props.sx,
    },
  }),
  SuccessButton: (props) => React.createElement(MuiMaterial.Button, {
    variant: 'contained',
    color: 'success',
    ...props,
    sx: {
      borderRadius: designTokens.borderRadius.lg,
      textTransform: 'none',
      fontWeight: 600,
      padding: designTokens.spacing.sm + ' ' + designTokens.spacing.lg,
      boxShadow: designTokens.shadows.sm,
      '&:hover': {
        boxShadow: designTokens.shadows.md,
        transform: 'translateY(-1px)',
      },
      ...props.sx,
    },
  }),
  DangerButton: (props) => React.createElement(MuiMaterial.Button, {
    variant: 'contained',
    color: 'error',
    ...props,
    sx: {
      borderRadius: designTokens.borderRadius.lg,
      textTransform: 'none',
      fontWeight: 600,
      padding: designTokens.spacing.sm + ' ' + designTokens.spacing.lg,
      boxShadow: designTokens.shadows.sm,
      '&:hover': {
        boxShadow: designTokens.shadows.md,
        transform: 'translateY(-1px)',
      },
      ...props.sx,
    },
  }),
  ContentContainer: (props) => React.createElement(MuiMaterial.Box, {
    ...props,
    sx: {
      padding: designTokens.spacing.xl,
      backgroundColor: designTokens.colors.neutral[50],
      minHeight: '100vh',
      '& > *:not(:last-child)': {
        marginBottom: designTokens.spacing.lg,
      },
      ...props.sx,
    },
  }),
  SectionHeader: (props) => React.createElement(MuiMaterial.Typography, {
    variant: 'h5',
    ...props,
    sx: {
      fontWeight: 600,
      color: designTokens.colors.neutral[800],
      marginBottom: designTokens.spacing.md,
      borderBottom: '3px solid ' + designTokens.colors.primary[500],
      paddingBottom: designTokens.spacing.xs,
      display: 'inline-block',
      ...props.sx,
    },
  }),
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
    transformed = transformed.replace(/(^|\n)\s*export\s+[^;\n]*;?/g, '');

    const designTokensLiteral = JSON.stringify(DESIGN_TOKENS, null, 2);

    const factoryCode = `
const { useState, useEffect, useMemo, useCallback, useRef, useReducer, useLayoutEffect } = React;
const designTokens = ${designTokensLiteral};
${STYLE_UTILS_SNIPPET}
${STYLED_COMPONENTS_SNIPPET}

const {
  Box,
  Paper,
  Typography,
  Button,
  TextField,
  IconButton,
  Chip,
  Card,
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

const authUser = auth;
const projectData = project;
const methodologyDataFromProps = methodology;
const usersDataFromProps = users;

const professionalTheme = createTheme({
  palette: {
    primary: {
      light: designTokens.colors.primary[400],
      main: designTokens.colors.primary[600],
      dark: designTokens.colors.primary[800],
    },
    success: {
      main: designTokens.colors.success[600],
    },
    warning: {
      main: designTokens.colors.warning[600],
    },
    error: {
      main: designTokens.colors.danger[600],
    },
  },
  shape: {
    borderRadius: 8,
  },
});

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

return ${componentName};
`;

    const factory = new Function(
      'React',
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

    return factory(
      React,
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
