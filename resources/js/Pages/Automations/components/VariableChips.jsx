// resources/js/Pages/Automations/components/VariableChips.jsx
import React, { useState, useRef } from 'react';
import {
    Box,
    Chip,
    TextField,
    Typography,
    Collapse,
    IconButton,
    Stack,
    Paper,
    Divider,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon,
    ExpandLess as ExpandLessIcon,
    Add as AddIcon,
} from '@mui/icons-material';
import { alpha, useTheme } from '@mui/material/styles';

// Available template variables organized by category
const TEMPLATE_VARIABLES = {
    'Task Variables': [
        { key: 'task.title', label: 'Task Title', example: 'Fix login bug' },
        {
            key: 'task.description',
            label: 'Task Description',
            example: 'Debug authentication issue',
        },
        { key: 'task.status', label: 'Task Status', example: 'in_progress' },
        { key: 'task.priority', label: 'Task Priority', example: 'high' },
        { key: 'task.due_date', label: 'Due Date', example: '2025-08-30' },
        { key: 'task.due_date_formatted', label: 'Due Date (Formatted)', example: 'Aug 30, 2025' },
        {
            key: 'task.created_at_formatted',
            label: 'Created Date',
            example: 'Aug 25, 2025 at 11:33 PM',
        },
        {
            key: 'task.updated_at_formatted',
            label: 'Updated Date',
            example: 'Aug 25, 2025 at 11:33 PM',
        },
        { key: 'task.assignee.name', label: 'Assignee Name', example: 'John Doe' },
        { key: 'task.assignee.email', label: 'Assignee Email', example: 'john@example.com' },
    ],
    'Project Variables': [
        { key: 'project.name', label: 'Project Name', example: 'TaskPilot Development' },
        {
            key: 'project.description',
            label: 'Project Description',
            example: 'Building the best task manager',
        },
        { key: 'project.status', label: 'Project Status', example: 'active' },
        { key: 'project.tasks_count', label: 'Total Tasks', example: '25' },
        { key: 'project.completed_tasks_count', label: 'Completed Tasks', example: '18' },
    ],
    'User Variables': [
        { key: 'user.name', label: 'User Full Name', example: 'Mohamed Taha' },
        { key: 'user.email', label: 'User Email', example: 'mohamed@taskpilot.us' },
        { key: 'user.first_name', label: 'First Name', example: 'Mohamed' },
        { key: 'user.last_name', label: 'Last Name', example: 'Taha' },
    ],
    'Date Variables': [
        { key: 'date.today', label: "Today's Date", example: '2025-08-25' },
        { key: 'date.time', label: 'Current Time', example: '23:33:45' },
        {
            key: 'date.formatted',
            label: 'Date & Time (Formatted)',
            example: 'Aug 25, 2025 at 11:33 PM',
        },
        { key: 'date.now', label: 'Full Timestamp', example: '2025-08-25 23:33:45' },
    ],
    'Automation Variables': [
        { key: 'automation.name', label: 'Automation Name', example: 'Task Assignment Alert' },
        {
            key: 'automation.description',
            label: 'Automation Description',
            example: 'Notify when tasks are assigned',
        },
    ],
};

const VariableChips = ({
    value = '',
    onChange,
    label,
    placeholder,
    fullWidth = true,
    multiline = false,
    rows = 3,
    size = 'small',
}) => {
    const theme = useTheme();
    const [showVariables, setShowVariables] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState(new Set());
    const textFieldRef = useRef(null);

    const handleVariableClick = (variableKey) => {
        const cursorPosition = textFieldRef.current?.selectionStart || value.length;
        const textBefore = value.substring(0, cursorPosition);
        const textAfter = value.substring(cursorPosition);
        const newValue = textBefore + `{{${variableKey}}}` + textAfter;

        onChange(newValue);

        // Focus back to text field
        setTimeout(() => {
            if (textFieldRef.current) {
                const newCursorPosition = cursorPosition + `{{${variableKey}}}`.length;
                textFieldRef.current.focus();
                textFieldRef.current.setSelectionRange(newCursorPosition, newCursorPosition);
            }
        }, 10);
    };

    const toggleCategory = (category) => {
        const newExpanded = new Set(expandedCategories);
        if (newExpanded.has(category)) {
            newExpanded.delete(category);
        } else {
            newExpanded.add(category);
        }
        setExpandedCategories(newExpanded);
    };

    return (
        <Box>
            <TextField
                ref={textFieldRef}
                fullWidth={fullWidth}
                size={size}
                multiline={multiline}
                rows={multiline ? rows : undefined}
                label={label}
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                InputProps={{
                    endAdornment: (
                        <IconButton
                            size="small"
                            onClick={() => setShowVariables(!showVariables)}
                            sx={{
                                color: showVariables ? theme.palette.primary.main : 'inherit',
                                '&:hover': {
                                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                },
                            }}
                        >
                            <AddIcon />
                        </IconButton>
                    ),
                }}
            />

            <Collapse in={showVariables}>
                <Paper
                    elevation={1}
                    sx={{
                        mt: 1,
                        p: 2,
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                        borderRadius: 2,
                        backgroundColor: alpha(theme.palette.primary.main, 0.02),
                    }}
                >
                    <Typography variant="subtitle2" gutterBottom color="primary">
                        📝 Click any variable to add it to your message:
                    </Typography>

                    {Object.entries(TEMPLATE_VARIABLES).map(([category, variables]) => (
                        <Box key={category} sx={{ mb: 1 }}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    py: 0.5,
                                    '&:hover': {
                                        backgroundColor: alpha(theme.palette.action.hover, 0.5),
                                    },
                                    borderRadius: 1,
                                }}
                                onClick={() => toggleCategory(category)}
                            >
                                <IconButton size="small" sx={{ mr: 1 }}>
                                    {expandedCategories.has(category) ? (
                                        <ExpandLessIcon />
                                    ) : (
                                        <ExpandMoreIcon />
                                    )}
                                </IconButton>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                    {category}
                                </Typography>
                            </Box>

                            <Collapse in={expandedCategories.has(category)}>
                                <Box sx={{ ml: 3, mb: 1 }}>
                                    <Stack
                                        direction="row"
                                        spacing={1}
                                        sx={{ flexWrap: 'wrap', gap: 1 }}
                                    >
                                        {variables.map((variable) => (
                                            <Chip
                                                key={variable.key}
                                                label={variable.label}
                                                size="small"
                                                variant="outlined"
                                                clickable
                                                onClick={() => handleVariableClick(variable.key)}
                                                sx={{
                                                    '&:hover': {
                                                        backgroundColor: alpha(
                                                            theme.palette.primary.main,
                                                            0.1
                                                        ),
                                                        borderColor: theme.palette.primary.main,
                                                    },
                                                    cursor: 'pointer',
                                                    mb: 0.5,
                                                }}
                                                title={`Click to add {{${variable.key}}} - Example: ${variable.example}`}
                                            />
                                        ))}
                                    </Stack>
                                </Box>
                            </Collapse>

                            {category !==
                                Object.keys(TEMPLATE_VARIABLES)[
                                    Object.keys(TEMPLATE_VARIABLES).length - 1
                                ] && <Divider sx={{ my: 1 }} />}
                        </Box>
                    ))}

                    <Box
                        sx={{
                            mt: 2,
                            p: 1.5,
                            backgroundColor: alpha(theme.palette.info.main, 0.1),
                            borderRadius: 1,
                        }}
                    >
                        <Typography variant="caption" color="textSecondary">
                            💡 <strong>How to use:</strong> Variables like{' '}
                            <code>{'{{task.title}}'}</code> will be replaced with actual values when
                            the automation runs. You can also type them manually!
                        </Typography>
                    </Box>
                </Paper>
            </Collapse>
        </Box>
    );
};

export default VariableChips;
