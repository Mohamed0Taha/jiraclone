import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import {
    Container,
    Paper,
    Typography,
    Box,
    Button,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Chip,
    Stack,
    Card,
    CardContent,
    IconButton,
    Divider,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
} from '@mui/material';
import {
    ArrowBack,
    Edit as EditIcon,
    Comment as CommentIcon,
    Reply as ReplyIcon,
    Delete as DeleteIcon,
    PriorityHigh as PriorityHighIcon,
} from '@mui/icons-material';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ImageModal from '@/Components/ImageModal';

export default function TaskShow({ auth, project, taskData, users, priorities }) {
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [commentText, setCommentText] = useState('');
    const [replyTo, setReplyTo] = useState(null);
    const [editingComment, setEditingComment] = useState(null);
    const [editCommentText, setEditCommentText] = useState('');
    const [coverUploading, setCoverUploading] = useState(false);
    const [commentImage, setCommentImage] = useState(null);
    const [imageModalOpen, setImageModalOpen] = useState(false);
    const [modalImage, setModalImage] = useState({
        src: '',
        alt: '',
        title: '',
        canDelete: false,
        deleteHandler: null,
    });

    const [editForm, setEditForm] = useState({
        title: taskData.title,
        description: taskData.description || '',
        start_date: taskData.start_date || '',
        end_date: taskData.end_date || '',
        assignee_id: taskData.assignee?.id || '',
        status: taskData.status,
        priority: taskData.priority,
        milestone: taskData.milestone,
    });

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'urgent':
                return '#f44336';
            case 'high':
                return '#ff9800';
            case 'medium':
                return '#2196f3';
            case 'low':
                return '#4caf50';
            default:
                return '#2196f3';
        }
    };

    const getPriorityLabel = (priority) => {
        switch (priority) {
            case 'urgent':
                return 'Urgent';
            case 'high':
                return 'High';
            case 'medium':
                return 'Medium';
            case 'low':
                return 'Low';
            default:
                return 'Medium';
        }
    };

    const handleUpdateTask = () => {
        router.patch(route('tasks.update', [project.id, taskData.id]), editForm, {
            onSuccess: () => {
                setEditDialogOpen(false);
            },
        });
    };

    const handleAddComment = () => {
        const formData = new FormData();
        if (commentText) formData.append('content', commentText);
        if (replyTo?.id) formData.append('parent_id', replyTo.id);
        if (commentImage) formData.append('image', commentImage);

        router.post(route('comments.store', [project.id, taskData.id]), formData, {
            forceFormData: true,
            onSuccess: () => {
                setCommentText('');
                setReplyTo(null);
                setCommentImage(null);
            },
        });
    };

    const handleEditComment = (comment) => {
        setEditingComment(comment);
        setEditCommentText(comment.content);
    };

    const handleUpdateComment = () => {
        router.patch(
            route('comments.update', [project.id, taskData.id, editingComment.id]),
            {
                content: editCommentText,
            },
            {
                onSuccess: () => {
                    setEditingComment(null);
                    setEditCommentText('');
                },
            }
        );
    };

    const handleDeleteComment = (comment) => {
        if (confirm('Are you sure you want to delete this comment?')) {
            router.delete(route('comments.destroy', [project.id, taskData.id, comment.id]));
        }
    };

    const handleCoverUpload = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const fd = new FormData();
        fd.append('image', file);
        setCoverUploading(true);
        router.post(route('tasks.attachments.store', [project.id, taskData.id]), fd, {
            forceFormData: true,
            onSuccess: () => {
                // Refresh the page to show the new image
                router.reload({ only: ['taskData'] });
            },
            onFinish: () => setCoverUploading(false),
            onError: (errors) => {
                console.error('Image upload failed:', errors);
                alert('Image upload failed: ' + (errors.image?.[0] || 'Unknown error'));
            },
        });
    };

    const openImageModal = (src, alt, title, canDelete = false, deleteHandler = null) => {
        setModalImage({ src, alt, title, canDelete, deleteHandler });
        setImageModalOpen(true);
    };

    const renderComment = (comment, isReply = false) => (
        <Card
            key={comment.id}
            variant="outlined"
            sx={{
                ml: isReply ? 4 : 0,
                mb: 2,
                backgroundColor: isReply ? 'rgba(25, 118, 210, 0.03)' : 'background.paper',
                borderRadius: 2,
                border: isReply
                    ? '1px solid rgba(25, 118, 210, 0.2)'
                    : '1px solid rgba(0,0,0,0.12)',
                boxShadow: isReply
                    ? '0 2px 8px rgba(25, 118, 210, 0.1)'
                    : '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                    boxShadow: isReply
                        ? '0 4px 16px rgba(25, 118, 210, 0.15)'
                        : '0 4px 16px rgba(0,0,0,0.15)',
                    transform: 'translateY(-1px)',
                },
            }}
        >
            <CardContent sx={{ py: 2, px: 3 }}>
                <Stack
                    direction="row"
                    justifyContent="space-between"
                    alignItems="flex-start"
                    sx={{ mb: 1.5 }}
                >
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Box
                            sx={{
                                width: 32,
                                height: 32,
                                borderRadius: '50%',
                                backgroundColor: 'primary.main',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '0.875rem',
                            }}
                        >
                            {comment.user.name.charAt(0).toUpperCase()}
                        </Box>
                        <Box>
                            <Typography
                                variant="subtitle2"
                                fontWeight="bold"
                                sx={{ color: 'text.primary' }}
                            >
                                {comment.user.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {new Date(comment.created_at).toLocaleString()}
                            </Typography>
                        </Box>
                    </Stack>
                    {comment.user.id === auth.user.id && (
                        <Stack direction="row" spacing={0.5}>
                            <IconButton
                                size="small"
                                onClick={() => handleEditComment(comment)}
                                sx={{
                                    backgroundColor: 'rgba(25, 118, 210, 0.1)',
                                    '&:hover': { backgroundColor: 'rgba(25, 118, 210, 0.2)' },
                                }}
                            >
                                <EditIcon fontSize="small" sx={{ color: 'primary.main' }} />
                            </IconButton>
                            <IconButton
                                size="small"
                                onClick={() => handleDeleteComment(comment)}
                                sx={{
                                    backgroundColor: 'rgba(244, 67, 54, 0.1)',
                                    '&:hover': { backgroundColor: 'rgba(244, 67, 54, 0.2)' },
                                }}
                            >
                                <DeleteIcon fontSize="small" sx={{ color: 'error.main' }} />
                            </IconButton>
                        </Stack>
                    )}
                </Stack>

                {editingComment?.id === comment.id ? (
                    <Stack spacing={2}>
                        <TextField
                            multiline
                            rows={3}
                            value={editCommentText}
                            onChange={(e) => setEditCommentText(e.target.value)}
                            variant="outlined"
                            size="small"
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    backgroundColor: 'rgba(0,0,0,0.02)',
                                },
                            }}
                        />
                        <Stack direction="row" spacing={1}>
                            <Button
                                size="small"
                                variant="contained"
                                onClick={handleUpdateComment}
                                disabled={!editCommentText.trim()}
                                sx={{
                                    borderRadius: 2,
                                    px: 2,
                                    background: 'linear-gradient(45deg, #4caf50, #66bb6a)',
                                    '&:hover': {
                                        background: 'linear-gradient(45deg, #388e3c, #4caf50)',
                                    },
                                }}
                            >
                                Update
                            </Button>
                            <Button
                                size="small"
                                variant="outlined"
                                onClick={() => {
                                    setEditingComment(null);
                                    setEditCommentText('');
                                }}
                                sx={{ borderRadius: 2, px: 2 }}
                            >
                                Cancel
                            </Button>
                        </Stack>
                    </Stack>
                ) : (
                    <>
                        <Typography
                            variant="body2"
                            sx={{
                                mb: 2,
                                whiteSpace: 'pre-wrap',
                                lineHeight: 1.6,
                                backgroundColor: 'rgba(0,0,0,0.02)',
                                p: 2,
                                borderRadius: 2,
                                border: '1px solid rgba(0,0,0,0.08)',
                            }}
                        >
                            {comment.content}
                        </Typography>
                        {comment.attachments && comment.attachments.length > 0 && (
                            <Box
                                sx={{
                                    display: 'grid',
                                    gap: 1,
                                    gridTemplateColumns: 'repeat(auto-fill,minmax(120px,1fr))',
                                    mb: 2,
                                }}
                            >
                                {comment.attachments.map((attachment) => (
                                    <Box
                                        key={attachment.id}
                                        sx={{
                                            position: 'relative',
                                            borderRadius: 1,
                                            overflow: 'hidden',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            aspectRatio: '4/3',
                                            cursor: 'pointer',
                                            '&:hover': {
                                                '&::after': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    backgroundColor: 'rgba(0,0,0,0.1)',
                                                },
                                            },
                                        }}
                                        onClick={() =>
                                            openImageModal(
                                                attachment.url,
                                                attachment.original_name,
                                                `Comment by ${comment.user.name}: ${attachment.original_name}`,
                                                false
                                            )
                                        }
                                    >
                                        <img
                                            src={attachment.url}
                                            alt={attachment.original_name}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                display: 'block',
                                            }}
                                            loading="lazy"
                                        />
                                    </Box>
                                ))}
                            </Box>
                        )}
                        {!isReply && (
                            <Button
                                size="small"
                                startIcon={<ReplyIcon />}
                                onClick={() => setReplyTo(comment)}
                                sx={{
                                    textTransform: 'none',
                                    borderRadius: 2,
                                    px: 2,
                                    backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                    color: 'primary.main',
                                    '&:hover': {
                                        backgroundColor: 'rgba(25, 118, 210, 0.15)',
                                    },
                                }}
                            >
                                Reply
                            </Button>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );

    return (
        <AuthenticatedLayout
            user={auth.user}
            header={
                <Box sx={{ width: '100%', overflow: 'hidden' }}>
                    <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                        <Button
                            variant="outlined"
                            startIcon={<ArrowBack />}
                            onClick={() => router.visit(route('tasks.index', project.id))}
                            sx={{
                                flexShrink: 0,
                                minWidth: 'auto',
                                px: 2,
                                py: 1,
                                borderRadius: 2,
                                whiteSpace: 'nowrap',
                                '&:hover': {
                                    backgroundColor: 'primary.light',
                                    color: 'white',
                                    borderColor: 'primary.main',
                                },
                            }}
                        >
                            Back to Board
                        </Button>
                        <Typography
                            variant="h4"
                            component="h2"
                            sx={{
                                flexGrow: 1,
                                fontWeight: 'bold',
                                background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                                backgroundClip: 'text',
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                minWidth: 0,
                            }}
                        >
                            {taskData.title}
                        </Typography>
                    </Stack>
                    <Typography
                        variant="subtitle1"
                        color="text.secondary"
                        sx={{
                            ml: 0.5,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                        }}
                    >
                        {project.name}
                    </Typography>
                </Box>
            }
        >
            <Head title={`${taskData.title} - ${project.name}`} />

            <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
                {/* Task Details */}
                <Paper
                    elevation={3}
                    sx={{
                        p: 3,
                        mb: 3,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                        border: '1px solid rgba(0,0,0,0.1)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    }}
                >
                    {/* Cover Images */}
                    <Box sx={{ mb: 3 }}>
                        <Stack direction="row" alignItems="center" spacing={2} sx={{ mb: 1 }}>
                            <Typography variant="h6" sx={{ flex: 1 }}>
                                Task Images
                            </Typography>
                            <Button
                                variant="outlined"
                                component="label"
                                size="small"
                                disabled={coverUploading}
                            >
                                {coverUploading ? 'Uploading...' : 'Add Image'}
                                <input
                                    hidden
                                    type="file"
                                    accept="image/*"
                                    onChange={handleCoverUpload}
                                />
                            </Button>
                        </Stack>
                        {taskData.attachments && taskData.attachments.length > 0 ? (
                            <Box
                                sx={{
                                    display: 'grid',
                                    gap: 2,
                                    gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))',
                                }}
                            >
                                {taskData.attachments.map((a) => (
                                    <Box
                                        key={a.id}
                                        sx={{
                                            position: 'relative',
                                            borderRadius: 1,
                                            overflow: 'hidden',
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            aspectRatio: '16/10',
                                            cursor: 'pointer',
                                            '&:hover': {
                                                '&::after': {
                                                    content: '""',
                                                    position: 'absolute',
                                                    top: 0,
                                                    left: 0,
                                                    right: 0,
                                                    bottom: 0,
                                                    backgroundColor: 'rgba(0,0,0,0.1)',
                                                },
                                            },
                                        }}
                                        onClick={() =>
                                            openImageModal(
                                                a.url,
                                                a.original_name,
                                                `Task #${taskData.id}: ${a.original_name}`,
                                                true,
                                                () =>
                                                    router.delete(
                                                        route('tasks.attachments.destroy', [
                                                            project.id,
                                                            taskData.id,
                                                            a.id,
                                                        ])
                                                    )
                                            )
                                        }
                                    >
                                        <img
                                            src={a.url}
                                            alt={a.original_name}
                                            style={{
                                                width: '100%',
                                                height: '100%',
                                                objectFit: 'cover',
                                                display: 'block',
                                            }}
                                            loading="lazy"
                                        />
                                        <IconButton
                                            size="small"
                                            sx={{
                                                position: 'absolute',
                                                top: 4,
                                                right: 4,
                                                backgroundColor: 'rgba(244, 67, 54, 0.8)',
                                                color: 'white',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(244, 67, 54, 0.9)',
                                                },
                                            }}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                if (confirm('Delete this image?')) {
                                                    router.delete(
                                                        route('tasks.attachments.destroy', [
                                                            project.id,
                                                            taskData.id,
                                                            a.id,
                                                        ])
                                                    );
                                                }
                                            }}
                                        >
                                            <DeleteIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                ))}
                            </Box>
                        ) : (
                            <Typography variant="body2" color="text.secondary">
                                No images yet.
                            </Typography>
                        )}
                    </Box>

                    <Stack
                        direction="row"
                        justifyContent="space-between"
                        alignItems="flex-start"
                        sx={{ mb: 3 }}
                    >
                        <Box sx={{ flexGrow: 1, mr: 2, minWidth: 0 }}>
                            <Typography
                                variant="h4"
                                component="h1"
                                sx={{
                                    fontWeight: 'bold',
                                    mb: 1,
                                    color: 'text.primary',
                                    lineHeight: 1.2,
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {taskData.title}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Created by {taskData.creator?.name} on{' '}
                                {new Date(taskData.created_at).toLocaleDateString()}
                            </Typography>
                        </Box>
                        <Button
                            variant="contained"
                            startIcon={<EditIcon />}
                            onClick={() => setEditDialogOpen(true)}
                            sx={{
                                flexShrink: 0,
                                borderRadius: 2,
                                px: 3,
                                py: 1.5,
                                minWidth: 'auto',
                                whiteSpace: 'nowrap',
                                background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                                boxShadow: '0 3px 10px rgba(25, 118, 210, 0.3)',
                                '&:hover': {
                                    background: 'linear-gradient(45deg, #1565c0, #1976d2)',
                                    boxShadow: '0 4px 15px rgba(25, 118, 210, 0.4)',
                                },
                            }}
                        >
                            Edit Task
                        </Button>
                    </Stack>

                    {/* Priority and Status badges */}
                    <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
                        <Chip
                            label={getPriorityLabel(taskData.priority)}
                            icon={taskData.priority === 'urgent' ? <PriorityHighIcon /> : undefined}
                            sx={{
                                backgroundColor: getPriorityColor(taskData.priority),
                                color: 'white',
                                fontWeight: 'bold',
                                fontSize: '0.875rem',
                                height: 32,
                                '& .MuiChip-icon': { color: 'white' },
                                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                            }}
                        />
                        <Chip
                            label={
                                taskData.status.charAt(0).toUpperCase() + taskData.status.slice(1)
                            }
                            variant="outlined"
                            sx={{
                                borderColor: 'primary.main',
                                color: 'primary.main',
                                fontWeight: 'medium',
                                fontSize: '0.875rem',
                                height: 32,
                                backgroundColor: 'rgba(25, 118, 210, 0.05)',
                            }}
                        />
                        {taskData.milestone && (
                            <Chip
                                label="Milestone"
                                color="warning"
                                variant="outlined"
                                sx={{
                                    fontWeight: 'medium',
                                    fontSize: '0.875rem',
                                    height: 32,
                                    backgroundColor: 'rgba(237, 108, 2, 0.05)',
                                }}
                            />
                        )}
                    </Stack>

                    {/* Description */}
                    {taskData.description && (
                        <Box
                            sx={{
                                mb: 3,
                                p: 2,
                                backgroundColor: 'rgba(0,0,0,0.02)',
                                borderRadius: 2,
                                border: '1px solid rgba(0,0,0,0.08)',
                            }}
                        >
                            <Typography
                                variant="body1"
                                sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
                            >
                                {taskData.description}
                            </Typography>
                        </Box>
                    )}

                    {/* Dates and Assignment */}
                    <Box
                        sx={{
                            p: 2,
                            backgroundColor: 'rgba(25, 118, 210, 0.03)',
                            borderRadius: 2,
                            border: '1px solid rgba(25, 118, 210, 0.1)',
                        }}
                    >
                        <Typography
                            variant="subtitle2"
                            sx={{ mb: 1.5, fontWeight: 'bold', color: 'primary.main' }}
                        >
                            Task Details
                        </Typography>
                        <Stack spacing={1}>
                            {taskData.start_date && (
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 'medium', minWidth: 100 }}
                                    >
                                        Start Date:
                                    </Typography>
                                    <Typography variant="body2">
                                        {new Date(taskData.start_date).toLocaleDateString()}
                                    </Typography>
                                </Stack>
                            )}
                            {taskData.end_date && (
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 'medium', minWidth: 100 }}
                                    >
                                        End Date:
                                    </Typography>
                                    <Typography variant="body2">
                                        {new Date(taskData.end_date).toLocaleDateString()}
                                    </Typography>
                                </Stack>
                            )}
                            {taskData.assignee && (
                                <Stack direction="row" spacing={1} alignItems="center">
                                    <Typography
                                        variant="body2"
                                        sx={{ fontWeight: 'medium', minWidth: 100 }}
                                    >
                                        Assigned to:
                                    </Typography>
                                    <Chip
                                        label={taskData.assignee.name}
                                        size="small"
                                        variant="outlined"
                                        sx={{
                                            backgroundColor: 'rgba(76, 175, 80, 0.1)',
                                            borderColor: 'success.main',
                                            color: 'success.main',
                                        }}
                                    />
                                </Stack>
                            )}
                        </Stack>
                    </Box>
                </Paper>

                {/* Comments Section */}
                <Paper
                    elevation={3}
                    sx={{
                        p: 3,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                        border: '1px solid rgba(0,0,0,0.1)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                    }}
                >
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
                        <Box
                            sx={{
                                p: 1,
                                borderRadius: 2,
                                backgroundColor: 'primary.light',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            <CommentIcon sx={{ color: 'white' }} />
                        </Box>
                        <Typography variant="h5" sx={{ fontWeight: 'bold' }}>
                            Comments ({taskData.comments.length})
                        </Typography>
                    </Stack>

                    {/* Add Comment Form */}
                    <Box sx={{ mb: 4 }}>
                        {replyTo && (
                            <Box
                                sx={{
                                    mb: 2,
                                    p: 2,
                                    backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                    borderRadius: 2,
                                    border: '1px solid rgba(25, 118, 210, 0.2)',
                                }}
                            >
                                <Stack
                                    direction="row"
                                    alignItems="center"
                                    justifyContent="space-between"
                                >
                                    <Typography
                                        variant="body2"
                                        color="primary.main"
                                        sx={{ fontWeight: 'medium' }}
                                    >
                                        Replying to {replyTo.user.name}
                                    </Typography>
                                    <IconButton
                                        size="small"
                                        onClick={() => setReplyTo(null)}
                                        sx={{
                                            backgroundColor: 'rgba(0,0,0,0.1)',
                                            '&:hover': { backgroundColor: 'rgba(0,0,0,0.2)' },
                                        }}
                                    >
                                        ✕
                                    </IconButton>
                                </Stack>
                            </Box>
                        )}
                        <TextField
                            multiline
                            rows={3}
                            placeholder={replyTo ? 'Write a reply...' : 'Add a comment...'}
                            value={commentText}
                            onChange={(e) => setCommentText(e.target.value)}
                            variant="outlined"
                            fullWidth
                            sx={{
                                mb: 2,
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                    backgroundColor: 'rgba(0,0,0,0.02)',
                                    '&:hover fieldset': {
                                        borderColor: 'primary.main',
                                    },
                                    '&.Mui-focused fieldset': {
                                        borderColor: 'primary.main',
                                        borderWidth: 2,
                                    },
                                },
                            }}
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                            <Button variant="outlined" component="label" size="small">
                                {commentImage ? 'Change Image' : 'Attach Image'}
                                <input
                                    hidden
                                    type="file"
                                    accept="image/*"
                                    onChange={(e) => setCommentImage(e.target.files?.[0] || null)}
                                />
                            </Button>
                            {commentImage && (
                                <Typography variant="caption" color="text.secondary">
                                    {commentImage.name}
                                </Typography>
                            )}
                        </Box>
                        <Button
                            variant="contained"
                            onClick={handleAddComment}
                            disabled={!commentText.trim() && !commentImage}
                            sx={{
                                borderRadius: 2,
                                px: 3,
                                py: 1,
                                background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                                boxShadow: '0 3px 10px rgba(25, 118, 210, 0.3)',
                                '&:hover': {
                                    background: 'linear-gradient(45deg, #1565c0, #1976d2)',
                                    boxShadow: '0 4px 15px rgba(25, 118, 210, 0.4)',
                                },
                                '&:disabled': {
                                    background: 'rgba(0,0,0,0.12)',
                                    boxShadow: 'none',
                                },
                            }}
                        >
                            {replyTo ? 'Reply' : 'Comment'}
                        </Button>
                    </Box>

                    <Divider sx={{ mb: 3, opacity: 0.6 }} />

                    {/* Comments List */}
                    {taskData.comments.length === 0 ? (
                        <Box
                            sx={{
                                textAlign: 'center',
                                py: 6,
                                backgroundColor: 'rgba(0,0,0,0.02)',
                                borderRadius: 2,
                                border: '1px dashed rgba(0,0,0,0.2)',
                            }}
                        >
                            <CommentIcon sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
                            <Typography color="text.secondary" variant="h6" sx={{ mb: 1 }}>
                                No comments yet
                            </Typography>
                            <Typography color="text.secondary" variant="body2">
                                Be the first to comment on this task!
                            </Typography>
                        </Box>
                    ) : (
                        <Stack spacing={2}>
                            {taskData.comments.map((comment) => (
                                <Box key={comment.id}>
                                    {renderComment(comment)}
                                    {comment.replies.length > 0 && (
                                        <Stack spacing={1} sx={{ ml: 2 }}>
                                            {comment.replies.map((reply) =>
                                                renderComment(reply, true)
                                            )}
                                        </Stack>
                                    )}
                                </Box>
                            ))}
                        </Stack>
                    )}
                </Paper>
            </Container>

            {/* Edit Task Dialog */}
            <Dialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 3,
                        boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
                    },
                }}
            >
                <DialogTitle
                    sx={{
                        background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '1.25rem',
                    }}
                >
                    Edit Task
                </DialogTitle>
                <DialogContent
                    sx={{
                        maxHeight: '60vh',
                        overflowY: 'auto',
                        backgroundColor: 'rgba(0,0,0,0.01)',
                        '&::-webkit-scrollbar': {
                            width: '8px',
                        },
                        '&::-webkit-scrollbar-track': {
                            background: 'rgba(0,0,0,0.05)',
                            borderRadius: '4px',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            background: 'rgba(25, 118, 210, 0.3)',
                            borderRadius: '4px',
                            '&:hover': {
                                background: 'rgba(25, 118, 210, 0.5)',
                            },
                        },
                    }}
                >
                    <Stack spacing={3} sx={{ mt: 2 }}>
                        <TextField
                            label="Title"
                            value={editForm.title}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            fullWidth
                            required
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                },
                            }}
                        />
                        <TextField
                            label="Description"
                            value={editForm.description}
                            onChange={(e) =>
                                setEditForm({ ...editForm, description: e.target.value })
                            }
                            multiline
                            rows={4}
                            fullWidth
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    borderRadius: 2,
                                },
                            }}
                        />
                        <Stack direction="row" spacing={2}>
                            <TextField
                                label="Start Date"
                                type="date"
                                value={editForm.start_date}
                                onChange={(e) =>
                                    setEditForm({ ...editForm, start_date: e.target.value })
                                }
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                    },
                                }}
                            />
                            <TextField
                                label="End Date"
                                type="date"
                                value={editForm.end_date}
                                onChange={(e) =>
                                    setEditForm({ ...editForm, end_date: e.target.value })
                                }
                                InputLabelProps={{ shrink: true }}
                                fullWidth
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                    },
                                }}
                            />
                        </Stack>
                        <Stack direction="row" spacing={2}>
                            <FormControl fullWidth>
                                <InputLabel>Assignee</InputLabel>
                                <Select
                                    value={editForm.assignee_id}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, assignee_id: e.target.value })
                                    }
                                    label="Assignee"
                                    sx={{
                                        borderRadius: 2,
                                    }}
                                >
                                    <MenuItem value="">Unassigned</MenuItem>
                                    {users.map((user) => (
                                        <MenuItem key={user.id} value={user.id}>
                                            {user.name}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth>
                                <InputLabel>Status</InputLabel>
                                <Select
                                    value={editForm.status}
                                    onChange={(e) =>
                                        setEditForm({ ...editForm, status: e.target.value })
                                    }
                                    label="Status"
                                    sx={{
                                        borderRadius: 2,
                                    }}
                                >
                                    <MenuItem value="todo">To Do</MenuItem>
                                    <MenuItem value="inprogress">In Progress</MenuItem>
                                    <MenuItem value="review">Review</MenuItem>
                                    <MenuItem value="done">Done</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>
                        <FormControl fullWidth>
                            <InputLabel>Priority</InputLabel>
                            <Select
                                value={editForm.priority}
                                onChange={(e) =>
                                    setEditForm({ ...editForm, priority: e.target.value })
                                }
                                label="Priority"
                                sx={{
                                    borderRadius: 2,
                                }}
                            >
                                {priorities.map((priority) => (
                                    <MenuItem key={priority} value={priority}>
                                        {getPriorityLabel(priority)}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Image Upload Section */}
                        <Box
                            sx={{
                                p: 2,
                                border: '1px dashed',
                                borderColor: 'divider',
                                borderRadius: 2,
                                backgroundColor: 'rgba(0,0,0,0.02)',
                            }}
                        >
                            <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
                                Task Images
                            </Typography>
                            <Button
                                variant="outlined"
                                component="label"
                                size="small"
                                disabled={coverUploading}
                                sx={{ mb: 2 }}
                            >
                                {coverUploading ? 'Uploading...' : 'Add Image'}
                                <input
                                    hidden
                                    type="file"
                                    accept="image/*"
                                    onChange={handleCoverUpload}
                                />
                            </Button>
                            {taskData.attachments && taskData.attachments.length > 0 && (
                                <Box
                                    sx={{
                                        display: 'grid',
                                        gap: 1,
                                        gridTemplateColumns: 'repeat(auto-fill,minmax(80px,1fr))',
                                        maxHeight: 120,
                                        overflowY: 'auto',
                                    }}
                                >
                                    {taskData.attachments.slice(0, 4).map((a) => (
                                        <Box
                                            key={a.id}
                                            sx={{
                                                position: 'relative',
                                                borderRadius: 1,
                                                overflow: 'hidden',
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                aspectRatio: '1',
                                                cursor: 'pointer',
                                            }}
                                            onClick={() =>
                                                openImageModal(
                                                    a.url,
                                                    a.original_name,
                                                    `Task #${taskData.id}: ${a.original_name}`,
                                                    true,
                                                    () =>
                                                        router.delete(
                                                            route('tasks.attachments.destroy', [
                                                                project.id,
                                                                taskData.id,
                                                                a.id,
                                                            ])
                                                        )
                                                )
                                            }
                                        >
                                            <img
                                                src={a.url}
                                                alt={a.original_name}
                                                style={{
                                                    width: '100%',
                                                    height: '100%',
                                                    objectFit: 'cover',
                                                }}
                                            />
                                        </Box>
                                    ))}
                                    {taskData.attachments.length > 4 && (
                                        <Box
                                            sx={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                backgroundColor: 'rgba(0,0,0,0.1)',
                                                borderRadius: 1,
                                                aspectRatio: '1',
                                            }}
                                        >
                                            <Typography variant="caption">
                                                +{taskData.attachments.length - 4}
                                            </Typography>
                                        </Box>
                                    )}
                                </Box>
                            )}
                        </Box>
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ p: 3, backgroundColor: 'rgba(0,0,0,0.02)' }}>
                    <Button
                        onClick={() => setEditDialogOpen(false)}
                        sx={{ borderRadius: 2, px: 3 }}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleUpdateTask}
                        variant="contained"
                        sx={{
                            borderRadius: 2,
                            px: 3,
                            background: 'linear-gradient(45deg, #1976d2, #42a5f5)',
                            boxShadow: '0 3px 10px rgba(25, 118, 210, 0.3)',
                            '&:hover': {
                                background: 'linear-gradient(45deg, #1565c0, #1976d2)',
                                boxShadow: '0 4px 15px rgba(25, 118, 210, 0.4)',
                            },
                        }}
                    >
                        Update Task
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Image Modal */}
            <ImageModal
                open={imageModalOpen}
                onClose={() => setImageModalOpen(false)}
                src={modalImage.src}
                alt={modalImage.alt}
                title={modalImage.title}
                canDelete={modalImage.canDelete}
                onDelete={modalImage.deleteHandler}
                downloadUrl={modalImage.src}
            />
        </AuthenticatedLayout>
    );
}
