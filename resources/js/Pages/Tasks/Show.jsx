import React, { useState } from 'react';
import { Head, router } from '@inertiajs/react';
import { route } from 'ziggy-js';
import { alpha } from '@mui/material/styles';
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
    Tooltip,
} from '@mui/material';
import {
    ArrowBack,
    Edit as EditIcon,
    Comment as CommentIcon,
    Reply as ReplyIcon,
    Delete as DeleteIcon,
    PriorityHigh as PriorityHighIcon,
    AccountTree as AccountTreeIcon,
    CloseRounded as CloseRoundedIcon,
    CalendarMonth as CalendarMonthRoundedIcon,
    Person as PersonRoundedIcon,
    Flag as FlagRoundedIcon,
    ContentCopy as ContentCopyIcon,
    DeleteOutline as DeleteOutlineIcon,
} from '@mui/icons-material';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import ImageModal from '@/Components/ImageModal';
import {
    METHODOLOGIES,
    DEFAULT_METHOD,
    getStatusMeta,
    getStatusOrder,
    mapLegacyStatusToMethod,
} from '../Board/meta.jsx';

// Mapping from local methodology phases to canonical server statuses (duplicated from Board)
const METHOD_TO_SERVER = {
    [METHODOLOGIES.KANBAN]: {
        todo: 'todo',
        inprogress: 'inprogress',
        review: 'review',
        done: 'done',
    },
    [METHODOLOGIES.SCRUM]: {
        backlog: 'todo',
        todo: 'todo',
        inprogress: 'inprogress',
        testing: 'review',
        review: 'review',
        done: 'done',
    },
    [METHODOLOGIES.AGILE]: {
        backlog: 'todo',
        todo: 'todo',
        inprogress: 'inprogress',
        testing: 'review',
        review: 'review',
        done: 'done',
    },
    [METHODOLOGIES.WATERFALL]: {
        requirements: 'todo',
        design: 'inprogress',
        implementation: 'inprogress',
        verification: 'review',
        maintenance: 'done',
    },
    [METHODOLOGIES.LEAN]: {
        backlog: 'todo',
        todo: 'inprogress',
        testing: 'review',
        review: 'review',
        done: 'done',
    },
};

export default function TaskShow({
    auth,
    project,
    taskData,
    users,
    priorities,
    allTasks,
    methodology,
}) {
    // Design tokens (align view + modals)
    const palette = {
        gradientSurface: 'linear-gradient(155deg,#FFFFFF 0%,#F5F7FB 65%,#EEF2F9 100%)',
        gradientHeader: 'linear-gradient(120deg,#6366F1 0%,#5850EC 45%,#4338CA 100%)',
        gradientPrimary: 'linear-gradient(120deg,#6366F1,#4F46E5)',
        gradientPrimaryHover: 'linear-gradient(120deg,#4F46E5,#4338CA)',
        accentBorder: 'rgba(99,102,241,0.28)',
        thumb: 'rgba(99,102,241,0.40)',
        thumbHover: 'rgba(99,102,241,0.65)',
        subtlePanel: 'linear-gradient(145deg,#FFFFFF,#F3F5FB)',
        badge: 'linear-gradient(135deg,#EEF2FF,#E0E7FF)',
    };

    const [localTask, setLocalTask] = useState(taskData);
    const [creatingSubTask, setCreatingSubTask] = useState(false);
    // Create modal state
    const [createOpen, setCreateOpen] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [processing, setProcessing] = useState(false);
    const [errors, setErrors] = useState({});
    const [formImageUploading, setFormImageUploading] = useState(false);
    const baseMethodology = (() => {
        const allowed = Object.values(METHODOLOGIES);
        const fromMeta = project?.meta?.methodology;
        if (allowed.includes(fromMeta)) return fromMeta;
        let fromLocal = null;
        try {
            if (project?.id) {
                fromLocal = localStorage.getItem(`project:${project.id}:methodology`);
            }
        } catch {}
        if (allowed.includes(fromLocal)) return fromLocal;
        return DEFAULT_METHOD;
    })();
    const createStatusOrder = getStatusOrder(baseMethodology);
    const [createForm, setCreateForm] = useState({
        title: '',
        description: '',
        start_date: '',
        end_date: '',
        assignee_id: '',
        status: createStatusOrder[0] || 'todo',
        priority: 'medium',
        milestone: false,
        duplicate_of: '',
        parent_id: localTask.id,
    });

    const showAddSubTask = (parentTask) => {
        setEditMode(false);
        setEditingId(null);
        setCreateForm({
            title: '',
            description: '',
            start_date: '',
            end_date: '',
            assignee_id: '',
            status: createStatusOrder[0] || 'todo',
            priority: 'medium',
            milestone: false,
            duplicate_of: '',
            parent_id: parentTask.id, // Set the parent task
        });
        setCreateOpen(true);
    };

    const submitCreate = (e) => {
        e.preventDefault();

        setCreateOpen(false);

        const routeName = route('tasks.store', project.id);
        const serverStatus = METHOD_TO_SERVER[currentMethodology][createForm.status] || 'todo';
        const payload = { ...createForm, status: serverStatus };

        // Use fetch to get JSON payload (controller updated to return JSON when wantsJson())
        fetch(routeName, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'X-CSRF-TOKEN': document
                    .querySelector('meta[name="csrf-token"]')
                    .getAttribute('content'),
            },
            body: JSON.stringify(payload),
        })
            .then(async (res) => {
                if (!res.ok) throw await res.json().catch(() => ({}));
                return res.json();
            })
            .then((json) => {
                const newTask = json?.task;
                if (newTask) {
                    setLocalTask((prev) => ({
                        ...prev,
                        children: [
                            ...(prev.children || []),
                            { id: newTask.id, title: newTask.title },
                        ],
                        has_sub_tasks: true,
                    }));
                }
                setCreateForm({
                    title: '',
                    description: '',
                    start_date: '',
                    end_date: '',
                    assignee_id: '',
                    status: createStatusOrder[0] || 'todo',
                    priority: 'medium',
                    milestone: false,
                    duplicate_of: '',
                    parent_id: localTask.id,
                });
            })
            .catch((err) => {
                console.error('Create task failed', err);
            });
    };

    const createField = (name, value) => setCreateForm((f) => ({ ...f, [name]: value }));

    // Create a setData function to mimic useForm behavior for the sub-task creation
    const setData = (name, value) => setCreateForm((f) => ({ ...f, [name]: value }));

    // Determine methodology using the same logic as Board component
    const currentMethodology = (() => {
        const allowed = Object.values(METHODOLOGIES);
        const fromMeta = project?.meta?.methodology;
        if (allowed.includes(fromMeta)) return fromMeta;
        let fromLocal = null;
        try {
            if (project?.id) {
                fromLocal = localStorage.getItem(`project:${project.id}:methodology`);
            }
        } catch {
            fromLocal = null;
        }
        if (allowed.includes(fromLocal)) return fromLocal;
        return DEFAULT_METHOD;
    })();

    // Get status options based on methodology
    const statusOrder = getStatusOrder(currentMethodology);
    const statusMeta = getStatusMeta(currentMethodology);

    // Create constants that match Board.jsx naming
    const STATUS_ORDER = statusOrder;
    const STATUS_META = statusMeta;

    // Create filteredTaskState for compatibility with Board.jsx modal structure
    const filteredTaskState = { [localTask.status]: allTasks || [] };

    // Helper function to get status label - uses 'title' property like the Board
    const getStatusLabel = (status) => {
        return statusMeta[status]?.title || status.charAt(0).toUpperCase() + status.slice(1);
    };
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
        status: mapLegacyStatusToMethod(taskData.status, currentMethodology),
        priority: taskData.priority,
        milestone: taskData.milestone,
        duplicate_of: taskData.duplicate_of?.id || '',
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
                                sx={{
                                    borderRadius: 2,
                                    px: 2,
                                    fontSize: 12,
                                    lineHeight: 1.1,
                                    fontWeight: 600,
                                    letterSpacing: 0.3,
                                    height: 36,
                                }}
                            >
                                {coverUploading ? 'Uploading...' : 'Add Image'}
                                <input
                                    hidden
                                    type="file"
                                    accept="image/*"
                                    onChange={handleCoverUpload}
                                />
                            </Button>
                            <Button
                                variant="contained"
                                size="small"
                                startIcon={<EditIcon sx={{ fontSize: 16 }} />}
                                onClick={() => setEditDialogOpen(true)}
                                sx={{
                                    borderRadius: 2,
                                    px: 2.2,
                                    fontSize: 12,
                                    lineHeight: 1.1,
                                    letterSpacing: 0.3,
                                    fontWeight: 600,
                                    height: 36,
                                    background: 'linear-gradient(120deg,#6366F1,#4F46E5)',
                                    boxShadow: '0 3px 10px -2px rgba(79,70,229,0.45)',
                                    '&:hover': {
                                        background: 'linear-gradient(120deg,#4F46E5,#4338CA)',
                                    },
                                }}
                            >
                                Edit Task
                            </Button>
                            <Button
                                variant="outlined"
                                size="small"
                                startIcon={<AccountTreeIcon sx={{ fontSize: 16 }} />}
                                onClick={() => showAddSubTask(localTask)}
                                disabled={creatingSubTask}
                                sx={{
                                    borderRadius: 2,
                                    px: 2.2,
                                    fontSize: 12,
                                    lineHeight: 1.1,
                                    letterSpacing: 0.3,
                                    fontWeight: 600,
                                    height: 36,
                                    color: 'primary.main',
                                    borderColor: 'rgba(99,102,241,0.55)',
                                    '&:hover': {
                                        borderColor: 'primary.main',
                                        background: 'rgba(99,102,241,0.08)',
                                    },
                                    // Removed opacity fade; keep interaction consistent with Board.jsx
                                    pointerEvents: creatingSubTask ? 'none' : 'auto',
                                }}
                            >
                                Add Sub Task
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
                            label={getStatusLabel(taskData.status)}
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
                        {taskData.is_duplicate && (
                            <Chip
                                label={`Duplicate of: #${taskData.duplicate_of?.id || 'Unknown'}`}
                                color="warning"
                                variant="outlined"
                                clickable
                                onClick={() => {
                                    if (taskData.duplicate_of?.id) {
                                        router.get(
                                            route('tasks.show', [
                                                project.id,
                                                taskData.duplicate_of.id,
                                            ])
                                        );
                                    }
                                }}
                                sx={{
                                    fontWeight: 'medium',
                                    fontSize: '0.875rem',
                                    height: 32,
                                    backgroundColor: 'rgba(237, 108, 2, 0.05)',
                                    cursor: 'pointer',
                                    '&:hover': {
                                        backgroundColor: 'rgba(237, 108, 2, 0.15)',
                                    },
                                }}
                            />
                        )}
                        {taskData.has_duplicates && (
                            <Chip
                                label={`Has ${taskData.duplicates?.length || 0} duplicate(s)`}
                                color="info"
                                variant="outlined"
                                sx={{
                                    fontWeight: 'medium',
                                    fontSize: '0.875rem',
                                    height: 32,
                                    backgroundColor: 'rgba(2, 136, 209, 0.05)',
                                }}
                            />
                        )}
                        {taskData.is_sub_task && (
                            <Chip
                                label={`Child of: #${taskData.parent?.id || 'Unknown'}`}
                                color="primary"
                                variant="outlined"
                                clickable
                                icon={<AccountTreeIcon />}
                                onClick={() => {
                                    if (taskData.parent?.id) {
                                        router.get(
                                            route('tasks.show', [project.id, taskData.parent.id])
                                        );
                                    }
                                }}
                                sx={{
                                    fontWeight: 'medium',
                                    fontSize: '0.875rem',
                                    height: 32,
                                    backgroundColor: 'rgba(25, 118, 210, 0.05)',
                                    cursor: 'pointer',
                                    '&:hover': {
                                        backgroundColor: 'rgba(25, 118, 210, 0.15)',
                                    },
                                }}
                            />
                        )}
                        {taskData.has_sub_tasks && (
                            <Chip
                                label={`Has ${taskData.children?.length || 0} sub-task(s)`}
                                color="success"
                                variant="outlined"
                                icon={<AccountTreeIcon />}
                                sx={{
                                    fontWeight: 'medium',
                                    fontSize: '0.875rem',
                                    height: 32,
                                    backgroundColor: 'rgba(46, 125, 50, 0.05)',
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

            {/* Edit Task Dialog (Board style) */}
            <Dialog
                open={editDialogOpen}
                onClose={() => setEditDialogOpen(false)}
                maxWidth="md"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        backgroundColor: (t) => t.palette.background.paper,
                        border: (t) => `1px solid ${alpha(t.palette.divider, 0.6)}`,
                        boxShadow: '0 8px 28px -6px rgba(0,0,0,0.35)',
                    },
                }}
            >
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleUpdateTask();
                    }}
                >
                    <DialogTitle
                        sx={{
                            fontWeight: 700,
                            pr: 6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                        }}
                    >
                        Edit Task
                        <Chip
                            size="small"
                            label="Editing"
                            sx={{
                                fontWeight: 700,
                                height: 22,
                                bgcolor: '#ffc107',
                                color: '#212529',
                                border: 'none',
                                fontSize: '0.75rem',
                                '& .MuiChip-label': {
                                    fontWeight: 700,
                                    color: '#212529',
                                    px: 1,
                                },
                            }}
                        />
                        <IconButton
                            size="small"
                            aria-label="Close"
                            onClick={() => setEditDialogOpen(false)}
                            sx={{ ml: 'auto' }}
                        >
                            <CloseRoundedIcon fontSize="small" />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent
                        dividers
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1.5,
                            pt: 2,
                            maxHeight: '60vh',
                            overflowY: 'auto',
                        }}
                    >
                        <TextField
                            label="Title"
                            required
                            fullWidth
                            value={editForm.title}
                            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                            placeholder="Concise task name"
                            variant="outlined"
                            size="small"
                        />
                        <TextField
                            label="Description"
                            multiline
                            minRows={3}
                            fullWidth
                            value={editForm.description}
                            onChange={(e) =>
                                setEditForm({ ...editForm, description: e.target.value })
                            }
                            placeholder="Add more context..."
                            size="small"
                        />
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <TextField
                                label="Start Date"
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={editForm.start_date}
                                onChange={(e) =>
                                    setEditForm({ ...editForm, start_date: e.target.value })
                                }
                                size="small"
                                InputProps={{
                                    startAdornment: (
                                        <CalendarMonthRoundedIcon
                                            fontSize="small"
                                            sx={{ mr: 1, color: 'text.disabled' }}
                                        />
                                    ),
                                }}
                            />
                            <TextField
                                label="Due / Execution Date"
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={editForm.end_date}
                                onChange={(e) =>
                                    setEditForm({ ...editForm, end_date: e.target.value })
                                }
                                size="small"
                                InputProps={{
                                    startAdornment: (
                                        <CalendarMonthRoundedIcon
                                            fontSize="small"
                                            sx={{ mr: 1, color: 'text.disabled' }}
                                        />
                                    ),
                                }}
                            />
                            <TextField
                                select
                                label="Assign To"
                                fullWidth
                                value={editForm.assignee_id}
                                onChange={(e) =>
                                    setEditForm({ ...editForm, assignee_id: e.target.value })
                                }
                                size="small"
                                InputProps={{
                                    startAdornment: (
                                        <PersonRoundedIcon
                                            fontSize="small"
                                            sx={{ mr: 1, color: 'text.disabled' }}
                                        />
                                    ),
                                }}
                            >
                                <MenuItem value="">— Unassigned —</MenuItem>
                                {Array.isArray(users) &&
                                    users.map((u) => (
                                        <MenuItem key={u.id} value={u.id}>
                                            {u.name}
                                        </MenuItem>
                                    ))}
                            </TextField>
                        </Stack>
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <TextField
                                select
                                label="Priority"
                                fullWidth
                                value={editForm.priority}
                                onChange={(e) =>
                                    setEditForm({ ...editForm, priority: e.target.value })
                                }
                                helperText="Task priority level"
                                size="small"
                            >
                                <MenuItem value="low">Low</MenuItem>
                                <MenuItem value="medium">Medium</MenuItem>
                                <MenuItem value="high">High</MenuItem>
                                <MenuItem value="urgent">Urgent</MenuItem>
                            </TextField>
                            <TextField
                                select
                                label="Milestone"
                                fullWidth
                                value={String(editForm.milestone)}
                                onChange={(e) =>
                                    setEditForm({
                                        ...editForm,
                                        milestone: e.target.value === 'true',
                                    })
                                }
                                helperText="Mark as project milestone"
                                size="small"
                                InputProps={{
                                    startAdornment: (
                                        <FlagRoundedIcon
                                            fontSize="small"
                                            sx={{ mr: 1, color: 'text.disabled' }}
                                        />
                                    ),
                                }}
                            >
                                <MenuItem value={'false'}>Regular Task</MenuItem>
                                <MenuItem value={'true'}>Milestone</MenuItem>
                            </TextField>
                        </Stack>
                        <TextField
                            select
                            label="Duplicate Of"
                            fullWidth
                            value={editForm.duplicate_of}
                            onChange={(e) =>
                                setEditForm({ ...editForm, duplicate_of: e.target.value })
                            }
                            helperText="Mark this task as a duplicate of another task"
                            size="small"
                            InputProps={{
                                startAdornment: (
                                    <ContentCopyIcon
                                        fontSize="small"
                                        sx={{ mr: 1, color: 'text.disabled' }}
                                    />
                                ),
                            }}
                        >
                            <MenuItem value="">Not a duplicate</MenuItem>
                            {allTasks
                                .filter((t) => t.id !== localTask.id)
                                .map((task) => (
                                    <MenuItem key={task.id} value={task.id}>
                                        {task.title}
                                    </MenuItem>
                                ))}
                        </TextField>
                        <TextField
                            select
                            label="Status"
                            fullWidth
                            value={editForm.status}
                            onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                            helperText="Choose where it should appear on the board."
                            size="small"
                        >
                            {STATUS_ORDER.map((s) => (
                                <MenuItem key={s} value={s}>
                                    {STATUS_META[s]?.title || s}
                                </MenuItem>
                            ))}
                        </TextField>
                        <Box
                            sx={{
                                p: 2,
                                border: '1px dashed',
                                borderColor: 'divider',
                                borderRadius: 2,
                                backgroundColor: 'rgba(0,0,0,0.02)',
                            }}
                        >
                            <Typography
                                variant="subtitle2"
                                sx={{ mb: 1, fontWeight: 600, fontSize: '0.875rem' }}
                            >
                                Task Images
                            </Typography>
                            <Button
                                variant="outlined"
                                component="label"
                                size="small"
                                disabled={coverUploading}
                                sx={{ mb: 1 }}
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
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    sx={{ display: 'block' }}
                                >
                                    {taskData.attachments.length} image
                                    {taskData.attachments.length !== 1 ? 's' : ''} attached
                                </Typography>
                            )}
                        </Box>
                    </DialogContent>
                    <DialogActions sx={{ px: 2, py: 1.5 }}>
                        <Button onClick={() => setEditDialogOpen(false)}>Cancel</Button>
                        <Button
                            type="submit"
                            variant="contained"
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                px: 2.2,
                                py: 0.6,
                                background: 'primary.main',
                                boxShadow: '0 6px 16px -8px rgba(0,0,0,.28)',
                                '&:hover': { opacity: 0.95 },
                            }}
                        >
                            Update Task
                        </Button>
                    </DialogActions>
                </form>
            </Dialog>

            {/* Sub-task Create Modal */}
            <Dialog
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                fullWidth
                maxWidth="sm"
                PaperProps={{
                    sx: {
                        borderRadius: 4,
                        backgroundColor: (t) => t.palette.background.paper,
                        border: (t) => `1px solid ${alpha(t.palette.divider, 0.6)}`,
                        boxShadow: '0 8px 28px -6px rgba(0,0,0,0.35)',
                    },
                }}
            >
                <form onSubmit={submitCreate}>
                    <DialogTitle
                        sx={{
                            fontWeight: 700,
                            pr: 6,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 1,
                        }}
                    >
                        {editMode
                            ? 'Edit Task'
                            : createForm.parent_id
                              ? 'Create Sub-Task'
                              : 'Create Task'}
                        <Chip
                            size="small"
                            label={editMode ? 'Editing' : createForm.parent_id ? 'Sub-Task' : 'New'}
                            sx={{
                                fontWeight: 700,
                                height: 22,
                                bgcolor: editMode ? '#ffc107' : '#17a2b8',
                                color: editMode ? '#212529' : '#ffffff',
                                border: 'none',
                                fontSize: '0.75rem',
                                '& .MuiChip-label': {
                                    fontWeight: 700,
                                    color: editMode ? '#212529' : '#ffffff',
                                    px: 1,
                                },
                            }}
                        />
                        <IconButton
                            size="small"
                            aria-label="Close"
                            onClick={() => setCreateOpen(false)}
                            sx={{ ml: 'auto' }}
                        >
                            <CloseRoundedIcon fontSize="small" />
                        </IconButton>
                    </DialogTitle>

                    <DialogContent
                        dividers
                        sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 1.5,
                            pt: 2,
                            maxHeight: '60vh',
                            overflowY: 'auto',
                        }}
                    >
                        {/* Parent Task Indicator for Sub-Tasks */}
                        {!editMode && createForm.parent_id && (
                            <Box
                                sx={{
                                    p: 2,
                                    borderRadius: 2,
                                    bgcolor: 'rgba(25, 118, 210, 0.08)',
                                    border: '1px solid rgba(25, 118, 210, 0.2)',
                                    mb: 1,
                                }}
                            >
                                <Stack direction="row" alignItems="center" spacing={1}>
                                    <AccountTreeIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                        Creating sub-task for:{' '}
                                        {Object.values(filteredTaskState)
                                            .flat()
                                            .find((t) => t.id === parseInt(createForm.parent_id))
                                            ?.title ||
                                            localTask.title ||
                                            `Task #${createForm.parent_id}`}
                                    </Typography>
                                </Stack>
                            </Box>
                        )}
                        <TextField
                            label="Title"
                            required
                            fullWidth
                            value={createForm.title}
                            onChange={(e) => setData('title', e.target.value)}
                            error={!!errors.title}
                            helperText={errors.title}
                            placeholder="Concise task name"
                            variant="outlined"
                            size="small"
                        />
                        <TextField
                            label="Description"
                            multiline
                            minRows={3}
                            fullWidth
                            value={createForm.description}
                            onChange={(e) => setData('description', e.target.value)}
                            error={!!errors.description}
                            helperText={
                                errors.description ||
                                'Add optional context, acceptance criteria, etc.'
                            }
                            placeholder="Add more context..."
                            size="small"
                        />

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <TextField
                                label="Start Date"
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={createForm.start_date}
                                onChange={(e) => setData('start_date', e.target.value)}
                                error={!!errors.start_date}
                                helperText={errors.start_date || 'Optional'}
                                size="small"
                                InputProps={{
                                    startAdornment: (
                                        <CalendarMonthRoundedIcon
                                            fontSize="small"
                                            sx={{ mr: 1, color: 'text.disabled' }}
                                        />
                                    ),
                                }}
                            />
                            <TextField
                                label="Due / Execution Date"
                                type="date"
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                value={createForm.end_date}
                                onChange={(e) => setData('end_date', e.target.value)}
                                error={!!errors.end_date}
                                helperText={errors.end_date || 'Optional'}
                                size="small"
                                InputProps={{
                                    startAdornment: (
                                        <CalendarMonthRoundedIcon
                                            fontSize="small"
                                            sx={{ mr: 1, color: 'text.disabled' }}
                                        />
                                    ),
                                }}
                            />
                            <TextField
                                select
                                label="Assign To"
                                fullWidth
                                value={createForm.assignee_id}
                                onChange={(e) => setData('assignee_id', e.target.value)}
                                error={!!errors.assignee_id}
                                helperText={errors.assignee_id || 'Optional'}
                                size="small"
                                InputProps={{
                                    startAdornment: (
                                        <PersonRoundedIcon
                                            fontSize="small"
                                            sx={{ mr: 1, color: 'text.disabled' }}
                                        />
                                    ),
                                }}
                            >
                                <MenuItem value="">— Unassigned —</MenuItem>
                                {Array.isArray(users) &&
                                    users.map((u) => (
                                        <MenuItem key={u.id} value={u.id}>
                                            {u.name}
                                        </MenuItem>
                                    ))}
                            </TextField>
                        </Stack>

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
                            <TextField
                                select
                                label="Priority"
                                fullWidth
                                value={createForm.priority}
                                onChange={(e) => setData('priority', e.target.value)}
                                error={!!errors.priority}
                                helperText={errors.priority || 'Task priority level'}
                                size="small"
                            >
                                <MenuItem value="low">Low</MenuItem>
                                <MenuItem value="medium">Medium</MenuItem>
                                <MenuItem value="high">High</MenuItem>
                                <MenuItem value="urgent">Urgent</MenuItem>
                            </TextField>

                            <TextField
                                select
                                label="Milestone"
                                fullWidth
                                value={String(createForm.milestone)}
                                onChange={(e) => setData('milestone', e.target.value === 'true')}
                                error={!!errors.milestone}
                                helperText={errors.milestone || 'Mark as project milestone'}
                                size="small"
                                InputProps={{
                                    startAdornment: (
                                        <FlagRoundedIcon
                                            fontSize="small"
                                            sx={{ mr: 1, color: 'text.disabled' }}
                                        />
                                    ),
                                }}
                            >
                                <MenuItem value={'false'}>Regular Task</MenuItem>
                                <MenuItem value={'true'}>Milestone</MenuItem>
                            </TextField>
                        </Stack>

                        <TextField
                            select
                            label="Duplicate Of"
                            fullWidth
                            value={createForm.duplicate_of}
                            onChange={(e) => setData('duplicate_of', e.target.value)}
                            error={!!errors.duplicate_of}
                            helperText={
                                errors.duplicate_of ||
                                'Mark this task as a duplicate of another task'
                            }
                            size="small"
                            InputProps={{
                                startAdornment: (
                                    <ContentCopyIcon
                                        fontSize="small"
                                        sx={{ mr: 1, color: 'text.disabled' }}
                                    />
                                ),
                            }}
                        >
                            <MenuItem value="">Not a duplicate</MenuItem>
                            {Object.values(filteredTaskState)
                                .flat()
                                .filter((task) => task.id !== editingId) // Don't allow self-reference
                                .map((task) => (
                                    <MenuItem key={task.id} value={task.id}>
                                        {task.title}
                                    </MenuItem>
                                ))}
                        </TextField>

                        <TextField
                            select
                            label="Status"
                            fullWidth
                            value={createForm.status}
                            onChange={(e) => setData('status', e.target.value)}
                            helperText="Choose where it should appear on the board."
                            size="small"
                        >
                            {STATUS_ORDER.map((s) => (
                                <MenuItem key={s} value={s}>
                                    {STATUS_META[s]?.title || s}
                                </MenuItem>
                            ))}
                        </TextField>
                    </DialogContent>

                    <DialogActions sx={{ px: 2, py: 1.5 }}>
                        <Button onClick={() => setCreateOpen(false)} disabled={processing}>
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="contained"
                            disabled={processing}
                            sx={{
                                textTransform: 'none',
                                fontWeight: 700,
                                px: 2.2,
                                py: 0.6,
                                background: 'primary.main',
                                boxShadow: '0 6px 16px -8px rgba(0,0,0,.28)',
                                '&:hover': { opacity: 0.95 },
                            }}
                        >
                            {processing
                                ? editMode
                                    ? 'Updating…'
                                    : 'Creating…'
                                : editMode
                                  ? 'Update Task'
                                  : 'Create Task'}
                        </Button>
                    </DialogActions>
                </form>
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
