import React, { useState, useCallback, useEffect } from 'react';
import {
    Box,
    Typography,
    Button,
    Card,
    CardContent,
    Stack,
    alpha,
    useTheme,
    Alert,
    LinearProgress,
    Chip,
} from '@mui/material';
import {
    CloudUpload as CloudUploadIcon,
    Create as CreateIcon,
    Description as DescriptionIcon,
    CheckCircle as CheckCircleIcon,
    Error as ErrorIcon,
    AutoAwesome as AutoAwesomeIcon,
} from '@mui/icons-material';
import { router } from '@inertiajs/react';
import { getCsrfToken } from '@/utils/csrf';

const DocumentUploadStep = ({ onDocumentAnalyzed, onManualCreate }) => {
    const theme = useTheme();
    const [dragOver, setDragOver] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [error, setError] = useState('');
    const [aiWarning, setAiWarning] = useState('');

    // Listen for AI empty event
    useEffect(() => {
        const handler = (e) => {
            if (e.detail?.reason === 'missing_core_fields') {
                setAiWarning(
                    'AI could not reliably extract the project name or description. You can retry with a clearer document or proceed with manual creation.'
                );
            }
        };
        window.addEventListener('project-ai-empty', handler);
        return () => window.removeEventListener('project-ai-empty', handler);
    }, []);

    const handleFileUpload = useCallback(
        async (file) => {
            if (!file) return;

            // Validate file type
            const allowedTypes = [
                'text/plain',
                'application/pdf',
                'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/rtf',
                'text/markdown',
                'text/x-markdown',
                'text/csv',
                'application/csv',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            ];

            const name = file.name.toLowerCase();
            const extAllowed = [
                '.txt',
                '.pdf',
                '.doc',
                '.docx',
                '.rtf',
                '.md',
                '.markdown',
                '.csv',
                '.xls',
                '.xlsx',
            ].some((ext) => name.endsWith(ext));
            if (!allowedTypes.includes(file.type) && !extAllowed) {
                setError('Allowed types: TXT, PDF, DOC, DOCX, RTF, MD, CSV, XLS, XLSX (max 5MB).');
                return;
            }

            // Validate file size (5MB)
            if (file.size > 5 * 1024 * 1024) {
                setError('File size must be less than 5MB.');
                return;
            }

            setUploading(true);
            setError('');

            const formData = new FormData();
            formData.append('document', file);

            try {
                const response = await fetch(route('projects.analyze-document'), {
                    method: 'POST',
                    body: formData,
                    headers: {
                        'X-CSRF-TOKEN': getCsrfToken() || '',
                        Accept: 'application/json',
                    },
                    credentials: 'same-origin',
                });

                const result = await response.json();
                console.log('Full API response:', result); // Debug log

                if (result.success) {
                    console.log('AI Analysis Result:', result.data); // Debug log
                    console.log('Available result.data keys:', Object.keys(result.data)); // Debug log
                    console.log('Full result structure:', result); // Debug log
                    onDocumentAnalyzed(result.data);
                } else {
                    console.error('API Error:', result.message); // Debug log
                    setError(result.message || 'Failed to analyze document');
                }
            } catch (err) {
                console.error('Document upload error:', err);
                setError('Failed to upload and analyze document. Please try again.');
            } finally {
                setUploading(false);
            }
        },
        [onDocumentAnalyzed]
    );

    const handleDrop = useCallback(
        (e) => {
            e.preventDefault();
            setDragOver(false);

            const files = Array.from(e.dataTransfer.files);
            if (files.length > 0) {
                handleFileUpload(files[0]);
            }
        },
        [handleFileUpload]
    );

    const handleDragOver = useCallback((e) => {
        e.preventDefault();
        setDragOver(true);
    }, []);

    const handleDragLeave = useCallback((e) => {
        e.preventDefault();
        setDragOver(false);
    }, []);

    const handleFileInputChange = useCallback(
        (e) => {
            const file = e.target.files?.[0];
            if (file) {
                handleFileUpload(file);
            }
        },
        [handleFileUpload]
    );

    return (
        <Box sx={{ py: 2 }}>
            <Typography
                variant="h5"
                sx={{
                    mb: 2,
                    fontWeight: 700,
                    color: theme.palette.text.primary,
                    textAlign: 'center',
                }}
            >
                How would you like to create your project?
            </Typography>

            <Typography
                variant="body1"
                sx={{
                    mb: 4,
                    color: theme.palette.text.secondary,
                    textAlign: 'center',
                    maxWidth: 600,
                    mx: 'auto',
                }}
            >
                Choose to upload a project requirements document for AI analysis, or create your
                project manually step by step.
            </Typography>

            <Stack spacing={3} sx={{ maxWidth: 800, mx: 'auto' }}>
                {/* AI Document Analysis Option */}
                <Card
                    elevation={0}
                    sx={{
                        border: `2px solid ${
                            dragOver
                                ? theme.palette.primary.main
                                : alpha(theme.palette.primary.main, 0.2)
                        }`,
                        borderRadius: 3,
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden',
                        '&:hover': {
                            borderColor: theme.palette.primary.main,
                            boxShadow: `0 8px 30px ${alpha(theme.palette.primary.main, 0.15)}`,
                            transform: 'translateY(-2px)',
                        },
                    }}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                >
                    {uploading && (
                        <LinearProgress
                            sx={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                zIndex: 1,
                            }}
                        />
                    )}

                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                mb: 2,
                                gap: 1,
                            }}
                        >
                            <AutoAwesomeIcon
                                sx={{
                                    fontSize: 32,
                                    color: theme.palette.primary.main,
                                }}
                            />
                            <Chip
                                label="AI Powered"
                                size="small"
                                sx={{
                                    bgcolor: alpha(theme.palette.primary.main, 0.1),
                                    color: theme.palette.primary.main,
                                    fontWeight: 600,
                                }}
                            />
                        </Box>

                        <Typography
                            variant="h6"
                            sx={{
                                mb: 2,
                                fontWeight: 600,
                                color: theme.palette.text.primary,
                            }}
                        >
                            Upload Project Requirements Document
                        </Typography>

                        <Typography
                            variant="body2"
                            sx={{
                                mb: 3,
                                color: theme.palette.text.secondary,
                                maxWidth: 400,
                                mx: 'auto',
                            }}
                        >
                            Upload a document and let AI extract project details, timeline,
                            objectives, and constraints automatically.
                        </Typography>

                        <Box
                            sx={{
                                border: `2px dashed ${
                                    dragOver
                                        ? theme.palette.primary.main
                                        : alpha(theme.palette.grey[400], 0.5)
                                }`,
                                borderRadius: 2,
                                p: 3,
                                mb: 3,
                                bgcolor: dragOver
                                    ? alpha(theme.palette.primary.main, 0.05)
                                    : alpha(theme.palette.grey[50], 0.5),
                                cursor: 'pointer',
                                transition: 'all 0.3s ease',
                            }}
                            onClick={() => document.getElementById('document-input')?.click()}
                        >
                            <CloudUploadIcon
                                sx={{
                                    fontSize: 48,
                                    color: theme.palette.primary.main,
                                    mb: 2,
                                }}
                            />
                            <Typography variant="body2" sx={{ mb: 1, fontWeight: 500 }}>
                                {dragOver
                                    ? 'Drop your document here'
                                    : 'Click to browse or drag & drop your document'}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                Supports: PDF, Word (.doc/.docx), Text (.txt), RTF • Max 5MB
                            </Typography>
                        </Box>

                        <input
                            id="document-input"
                            type="file"
                            accept=".txt,.pdf,.doc,.docx,.rtf,.md,.markdown,.csv,.xls,.xlsx"
                            style={{ display: 'none' }}
                            onChange={handleFileInputChange}
                            disabled={uploading}
                        />

                        {error && (
                            <Alert
                                severity="error"
                                sx={{ mb: 2, textAlign: 'left' }}
                                icon={<ErrorIcon />}
                            >
                                {error}
                            </Alert>
                        )}

                        {aiWarning && !error && (
                            <Alert
                                severity="warning"
                                sx={{ mb: 2, textAlign: 'left' }}
                                icon={<ErrorIcon />}
                            >
                                {aiWarning}
                            </Alert>
                        )}

                        {uploading && (
                            <Alert
                                severity="info"
                                sx={{ mb: 2, textAlign: 'left' }}
                                icon={<AutoAwesomeIcon />}
                            >
                                Analyzing your document with AI... This may take a few moments.
                            </Alert>
                        )}
                    </CardContent>
                </Card>

                {/* Manual Creation Option */}
                <Card
                    elevation={0}
                    sx={{
                        border: `2px solid ${alpha(theme.palette.grey[400], 0.2)}`,
                        borderRadius: 3,
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                            borderColor: alpha(theme.palette.secondary.main, 0.5),
                            boxShadow: `0 8px 30px ${alpha(theme.palette.secondary.main, 0.1)}`,
                            transform: 'translateY(-2px)',
                        },
                    }}
                    onClick={onManualCreate}
                >
                    <CardContent sx={{ p: 4, textAlign: 'center' }}>
                        <CreateIcon
                            sx={{
                                fontSize: 32,
                                color: theme.palette.secondary.main,
                                mb: 2,
                            }}
                        />

                        <Typography
                            variant="h6"
                            sx={{
                                mb: 2,
                                fontWeight: 600,
                                color: theme.palette.text.primary,
                            }}
                        >
                            Create Project Manually
                        </Typography>

                        <Typography
                            variant="body2"
                            sx={{
                                mb: 3,
                                color: theme.palette.text.secondary,
                                maxWidth: 400,
                                mx: 'auto',
                            }}
                        >
                            Fill out the project details step by step using our guided form with
                            basics, scope, and objectives.
                        </Typography>

                        <Button variant="outlined" color="secondary" sx={{ mt: 2 }}>
                            Start Manual Creation
                        </Button>
                    </CardContent>
                </Card>
            </Stack>
        </Box>
    );
};

export default DocumentUploadStep;
