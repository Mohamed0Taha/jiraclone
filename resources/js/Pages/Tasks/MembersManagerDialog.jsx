import React, { useState, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    List,
    ListItem,
    IconButton,
    Typography,
    Box,
    Chip,
    Avatar,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Alert,
    CircularProgress,
    Divider,
    Tooltip,
    LinearProgress,
    Stack,
    Paper,
} from '@mui/material';
import { alpha, useTheme } from '@mui/material/styles';
import {
    PersonAdd,
    Delete,
    Email,
    Person,
    Cancel,
    Pending,
    Security,
    Visibility,
    Edit,
    Task,
    Settings,
    Group,
} from '@mui/icons-material';
import { router } from '@inertiajs/react';

const MembersManagerDialog = ({ open, onClose, project }) => {
    const theme = useTheme();
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('member');
    const [members, setMembers] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [memberLimit, setMemberLimit] = useState(null);
    const [memberUsed, setMemberUsed] = useState(null);
    const [memberPlan, setMemberPlan] = useState(null);

    // ---------- Robust ID helpers ----------
    const extractProjectOwnerId = (proj) => {
        if (!proj) return null;
        const candidates = [
            proj.user_id,
            proj.owner_id,
            proj.ownerId,
            proj.created_by,
            proj.createdBy,
            proj.user?.id,
            proj.owner?.id,
        ];
        const val = candidates.find((v) => v !== undefined && v !== null);
        return val === undefined ? null : val;
    };

    const extractMemberId = (member) => {
        if (!member) return null;
        const candidates = [member.id, member.user_id, member.userId, member.user?.id];
        const val = candidates.find((v) => v !== undefined && v !== null);
        return val === undefined ? null : val;
    };

    // Normalize once for this render
    const normalizedOwnerId = project
        ? extractProjectOwnerId(project) != null
            ? String(extractProjectOwnerId(project))
            : null
        : null;

    const isOwnerByIds = (ownerId, memberId) => {
        if (ownerId == null || memberId == null) return false;
        return String(ownerId) === String(memberId);
    };
    // ---------------------------------------

    // Load members and invitations when dialog opens
    useEffect(() => {
        if (open && project?.id) {
            loadMembersAndInvitations();
        }
    }, [open, project?.id]);

    const loadMembersAndInvitations = async () => {
        try {
            setLoading(true);
            const response = await fetch(`/projects/${project.id}/members`, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            setMembers(data.members || []);
            setInvitations(data.invitations || []);
            if (typeof data.limit !== 'undefined') setMemberLimit(data.limit);
            if (typeof data.used !== 'undefined') setMemberUsed(data.used);
            if (typeof data.plan !== 'undefined') setMemberPlan(data.plan);
        } catch (err) {
            setError('Failed to load members: ' + err.message);
            console.error('Error loading members:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInviteMember = async (e) => {
        e.preventDefault();
        if (!email.trim()) {
            setError('Please enter an email address');
            return;
        }
        if (memberLimit != null && memberUsed != null && memberUsed >= memberLimit) {
            setError(
                `You have reached your member limit (${memberUsed}/${memberLimit}). Upgrade your plan to add more team members.`
            );
            return;
        }
        if (!project?.id) {
            setError('Project ID is missing');
            return;
        }

        try {
            setLoading(true);
            setError('');
            setSuccess('');

            const response = await fetch(`/projects/${project.id}/members/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute('content'),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ email: email.trim(), role }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            const data = await response.json();

            if (data.type === 'direct_add') {
                setSuccess(`${data.user.name} has been added to the project!`);
                setMembers((prev) => [
                    ...prev,
                    {
                        id: data.user.id,
                        name: data.user.name,
                        email: data.user.email,
                        pivot: { role, joined_at: new Date().toISOString() },
                    },
                ]);
                if (memberUsed != null) setMemberUsed((u) => (u != null ? u + 1 : u));
            } else {
                setSuccess(`Invitation sent to ${email}!`);
                setInvitations((prev) => [...prev, data.invitation]);
            }
            setEmail('');
            setRole('member');
        } catch (err) {
            setError('Failed to invite member: ' + err.message);
            console.error('Error inviting member:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveMember = async (userId) => {
        try {
            setLoading(true);
            setError('');

            const response = await fetch(`/projects/${project.id}/members/remove`, {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute('content'),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ user_id: userId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            await response.json();
            setMembers((prev) =>
                prev.filter((member) => String(extractMemberId(member)) !== String(userId))
            );
            setSuccess('Member removed successfully');
        } catch (err) {
            setError('Failed to remove member: ' + err.message);
            console.error('Error removing member:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleCancelInvitation = async (invitationId) => {
        try {
            setLoading(true);
            setError('');

            const response = await fetch(`/projects/${project.id}/members/cancel-invitation`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document
                        .querySelector('meta[name="csrf-token"]')
                        ?.getAttribute('content'),
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ invitation_id: invitationId }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }

            await response.json();
            setInvitations((prev) => prev.filter((inv) => String(inv.id) !== String(invitationId)));
            setSuccess('Invitation cancelled successfully');
        } catch (err) {
            setError('Failed to cancel invitation: ' + err.message);
            console.error('Error cancelling invitation:', err);
        } finally {
            setLoading(false);
        }
    };

    const getRoleColor = (role) => {
        return role === 'admin' ? 'primary' : 'default';
    };

    // ---------- Authorization summary uses the isOwner flag PASSED-IN ----------
    const getAuthorizationSummary = (member, isOwnerFlag) => {
        const roleFromPivot = member?.pivot?.role || 'member';

        if (isOwnerFlag) {
            return {
                canViewProject: true,
                canViewTasks: true,
                canCreateTasks: true,
                canEditTasks: true,
                canEditProject: true,
                canManageMembers: true,
                canDeleteProject: true,
                role: 'owner',
                isOwner: true,
            };
        }

        return {
            canViewProject: true,
            canViewTasks: true,
            canCreateTasks: true,
            canEditTasks: true,
            canEditProject: false,
            canManageMembers: false,
            canDeleteProject: false,
            role: roleFromPivot,
            isOwner: false,
        };
    };

    const AuthorizationChips = ({ member, isOwnerFlag }) => {
        const auth = getAuthorizationSummary(member, isOwnerFlag);
        const permissions = [
            {
                key: 'viewProject',
                label: 'View Project',
                icon: <Visibility />,
                enabled: auth.canViewProject,
            },
            { key: 'viewTasks', label: 'View Tasks', icon: <Task />, enabled: auth.canViewTasks },
            { key: 'editTasks', label: 'Edit Tasks', icon: <Edit />, enabled: auth.canEditTasks },
            {
                key: 'editProject',
                label: 'Edit Project',
                icon: <Settings />,
                enabled: auth.canEditProject,
            },
            {
                key: 'manageMembers',
                label: 'Manage Members',
                icon: <Group />,
                enabled: auth.canManageMembers,
            },
        ];

        return (
            <Box sx={{ mt: 1 }}>
                <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}
                >
                    <Security sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                    Permissions {auth.isOwner ? '(Full Access - Owner)' : '(Member Access)'}:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {permissions.map((perm) => (
                        <Tooltip
                            key={perm.key}
                            title={perm.enabled ? `Can ${perm.label}` : `Cannot ${perm.label}`}
                        >
                            <Chip
                                icon={perm.icon}
                                label={perm.label}
                                size="small"
                                variant={perm.enabled ? 'filled' : 'outlined'}
                                color={perm.enabled ? 'success' : 'default'}
                                sx={{
                                    fontSize: '0.7rem',
                                    height: 24,
                                    opacity: perm.enabled ? 1 : 0.6,
                                    '& .MuiChip-icon': { fontSize: 14 },
                                }}
                            />
                        </Tooltip>
                    ))}
                </Box>
            </Box>
        );
    };
    // --------------------------------------------------------------------------

    const InvitationPermissionPreview = ({ invitation }) => {
        const permissions = [
            { key: 'viewProject', label: 'View Project', icon: <Visibility />, enabled: true },
            { key: 'viewTasks', label: 'View Tasks', icon: <Task />, enabled: true },
            { key: 'editTasks', label: 'Edit Tasks', icon: <Edit />, enabled: true },
            { key: 'editProject', label: 'Edit Project', icon: <Settings />, enabled: false },
            { key: 'manageMembers', label: 'Manage Members', icon: <Group />, enabled: false },
        ];

        return (
            <Box sx={{ mt: 1 }}>
                <Typography
                    variant="caption"
                    color="warning.main"
                    sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}
                >
                    <Security sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                    Will have permissions:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {permissions.map((perm) => (
                        <Tooltip
                            key={perm.key}
                            title={
                                perm.enabled
                                    ? `Will be able to ${perm.label}`
                                    : `Won't be able to ${perm.label}`
                            }
                        >
                            <Chip
                                icon={perm.icon}
                                label={perm.label}
                                size="small"
                                variant="outlined"
                                color={perm.enabled ? 'warning' : 'default'}
                                sx={{
                                    fontSize: '0.7rem',
                                    height: 24,
                                    opacity: perm.enabled ? 1 : 0.5,
                                    '& .MuiChip-icon': { fontSize: 14 },
                                }}
                            />
                        </Tooltip>
                    ))}
                </Box>
            </Box>
        );
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString();
    };

    const atLimit = memberLimit != null && memberUsed != null && memberUsed >= memberLimit;
    const [designVariant, setDesignVariant] = useState('compact'); // 'compact' | 'enhanced'

    // Shared small header styles
    const header = (
        <Box
            sx={{
                px: 2.5,
                py: 1.75,
                background:
                    designVariant === 'compact'
                        ? alpha(theme.palette.primary.main, 0.07)
                        : `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark})`,
                color: designVariant === 'compact' ? 'inherit' : 'white',
                display: 'flex',
                alignItems: 'center',
                gap: 1.5,
                borderBottom: `1px solid ${alpha(theme.palette.divider, 0.6)}`,
            }}
        >
            <Avatar
                sx={{
                    bgcolor:
                        designVariant === 'compact'
                            ? alpha(theme.palette.primary.main, 0.15)
                            : 'rgba(255,255,255,0.15)',
                    width: 40,
                    height: 40,
                }}
            >
                <Person />
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography
                    variant="subtitle1"
                    fontWeight={800}
                    sx={{ lineHeight: 1.1 }}
                    noWrap
                >
                    Team Members
                </Typography>
                <Typography
                    variant="caption"
                    sx={{ opacity: designVariant === 'compact' ? 0.75 : 0.85 }}
                    noWrap
                >
                    Manage project collaborators
                </Typography>
            </Box>
            <Stack direction="row" spacing={1} alignItems="center">
                {memberPlan && (
                    <Chip
                        label={memberPlan}
                        size="small"
                        sx={{
                            fontWeight: 600,
                            bgcolor:
                                designVariant === 'compact'
                                    ? alpha(theme.palette.primary.main, 0.1)
                                    : 'rgba(255,255,255,0.15)',
                            color: designVariant === 'compact' ? 'inherit' : 'white',
                            textTransform: 'uppercase',
                        }}
                    />
                )}
                <Tooltip
                    title={
                        designVariant === 'compact'
                            ? 'Switch to enhanced design'
                            : 'Switch to compact design'
                    }
                >
                    <IconButton
                        size="small"
                        onClick={() =>
                            setDesignVariant((v) => (v === 'compact' ? 'enhanced' : 'compact'))
                        }
                        sx={{
                            color:
                                designVariant === 'compact'
                                    ? theme.palette.primary.main
                                    : 'white',
                            '&:hover': {
                                bgcolor:
                                    designVariant === 'compact'
                                        ? alpha(theme.palette.primary.main, 0.1)
                                        : 'rgba(255,255,255,0.15)',
                            },
                        }}
                    >
                        {designVariant === 'compact' ? <Settings /> : <Visibility />}
                    </IconButton>
                </Tooltip>
            </Stack>
        </Box>
    );

    return (
        <Dialog
            open={open}
            onClose={onClose}
            maxWidth={designVariant === 'compact' ? 'sm' : 'md'}
            fullWidth
            scroll="body"
            PaperProps={{
                sx: {
                    borderRadius: 3,
                    width: designVariant === 'compact' ? 560 : 'auto',
                    maxWidth: '100%',
                },
            }}
        >
            <DialogTitle sx={{ p: 0 }}>{header}</DialogTitle>

            <DialogContent
                sx={{
                    px: designVariant === 'compact' ? 2.5 : 3,
                    pt: 2.5,
                    pb: 1,
                }}
            >
                {error && (
                    <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                        {error}
                    </Alert>
                )}

                {success && (
                    <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
                        {success}
                    </Alert>
                )}

                {memberLimit != null && memberUsed != null && (
                    <Stack spacing={1.2} sx={{ mb: 3 }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" fontWeight={700} sx={{ textTransform: 'uppercase', letterSpacing: 0.5 }}>
                                Usage
                            </Typography>
                            <Chip
                                size="small"
                                label={`${memberUsed}/${memberLimit}`}
                                color={atLimit ? 'warning' : 'primary'}
                                sx={{ fontWeight: 600, height: 22 }}
                            />
                        </Stack>
                        <LinearProgress
                            variant="determinate"
                            value={(memberUsed / memberLimit) * 100}
                            sx={{ height: 6, borderRadius: 3 }}
                        />
                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                            <Typography variant="caption" sx={{ opacity: 0.8 }}>
                                {atLimit
                                    ? `Limit reached for ${memberPlan} plan`
                                    : `${memberLimit - memberUsed} slot${memberLimit - memberUsed === 1 ? '' : 's'} left`}
                            </Typography>
                            {atLimit && (
                                <Button
                                    size="small"
                                    variant="contained"
                                    onClick={() => (window.location.href = '/billing')}
                                    sx={{ textTransform: 'none', fontWeight: 600 }}
                                >
                                    Upgrade
                                </Button>
                            )}
                        </Stack>
                    </Stack>
                )}

                {/* Invite new member form */}
                <Box
                    component="form"
                    onSubmit={handleInviteMember}
                    sx={{
                        mb: 3,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 1.5,
                        background: alpha(theme.palette.primary.main, 0.03),
                        border: `1px solid ${alpha(theme.palette.primary.main, 0.12)}`,
                        borderRadius: 2.5,
                        p: 2,
                    }}
                >
                    <Stack direction="row" justifyContent="space-between" alignItems="center">
                        <Typography variant="subtitle2" fontWeight={700}>
                            Invite New Member
                        </Typography>
                        {atLimit && (
                            <Chip
                                label="Limit Reached"
                                size="small"
                                color="warning"
                                sx={{ fontWeight: 600 }}
                            />
                        )}
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5}>
                        <TextField
                            label="Email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            fullWidth
                            size="small"
                            disabled={loading || atLimit}
                        />
                        <FormControl sx={{ minWidth: 140 }} size="small" disabled={loading || atLimit}>
                            <InputLabel>Role</InputLabel>
                            <Select
                                value={role}
                                label="Role"
                                onChange={(e) => setRole(e.target.value)}
                            >
                                <MenuItem value="member">Member</MenuItem>
                                <MenuItem value="admin">Admin</MenuItem>
                            </Select>
                        </FormControl>
                        <Button
                            type="submit"
                            variant="contained"
                            startIcon={loading ? <CircularProgress size={18} /> : <PersonAdd />}
                            disabled={loading || !email.trim() || atLimit}
                            title={atLimit ? 'Member limit reached – upgrade to add more' : ''}
                            sx={{
                                px: 3,
                                fontWeight: 600,
                                textTransform: 'none',
                                whiteSpace: 'nowrap',
                                height: 40,
                            }}
                        >
                            {atLimit ? 'Limit' : loading ? 'Inviting' : 'Invite'}
                        </Button>
                    </Stack>
                    {atLimit && (
                        <Typography variant="caption" color="warning.main" sx={{ mt: 0.5 }}>
                            Remove an existing member or upgrade to increase your limit.
                        </Typography>
                    )}
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Current members */}
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                    <Typography variant="subtitle1" fontWeight={700}>
                        Current Members
                    </Typography>
                    <Chip label={members.length} size="small" variant="outlined" sx={{ fontWeight: 600, height: 22 }} />
                </Stack>
                {members.length === 0 ? (
                    <Paper
                        variant="outlined"
                        sx={{ p: 4, textAlign: 'center', borderRadius: 4, background: alpha(theme.palette.primary.light, 0.04) }}
                    >
                        <Avatar
                            sx={{
                                width: 64,
                                height: 64,
                                mx: 'auto',
                                mb: 2,
                                bgcolor: alpha(theme.palette.primary.main, 0.15),
                                color: theme.palette.primary.main,
                            }}
                        >
                            <Group />
                        </Avatar>
                        <Typography fontWeight={600}>No members yet</Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                            Invite your first collaborator using the form above.
                        </Typography>
                    </Paper>
                ) : (
                    <List>
                        {members.map((member) => {
                            const memberId = extractMemberId(member);
                            const isOwnerFlag =
                                (normalizedOwnerId != null &&
                                    memberId != null &&
                                    isOwnerByIds(normalizedOwnerId, memberId)) ||
                                member?.pivot?.role === 'owner'; // safety net

                            return (
                                <ListItem key={String(memberId ?? Math.random())} sx={{ px: 0 }}>
                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            p: 2.25,
                                            borderRadius: 3,
                                            width: '100%',
                                            display: 'flex',
                                            gap: 2,
                                            alignItems: 'flex-start',
                                            background: alpha(theme.palette.background.paper, 0.9),
                                            position: 'relative',
                                            overflow: 'hidden',
                                            '&:hover': {
                                                borderColor: theme.palette.primary.main,
                                                boxShadow: `0 4px 14px -4px ${alpha(theme.palette.primary.main, 0.3)}`,
                                            },
                                        }}
                                    >
                                        <Avatar
                                            sx={{
                                                bgcolor: isOwnerFlag
                                                    ? theme.palette.warning.main
                                                    : theme.palette.success.main,
                                                boxShadow: 1,
                                                width: 46,
                                                height: 46,
                                            }}
                                        >
                                            {member.name?.charAt(0) || member.email?.charAt(0) || 'U'}
                                        </Avatar>
                                        <Box sx={{ flex: 1, minWidth: 0 }}>
                                            <Stack
                                                direction="row"
                                                spacing={1}
                                                alignItems="center"
                                                sx={{ mb: 0.5, flexWrap: 'wrap' }}
                                            >
                                                <Typography
                                                    variant="subtitle1"
                                                    fontWeight={700}
                                                    sx={{ lineHeight: 1.1, mr: 0.5 }}
                                                    noWrap
                                                >
                                                    {member.name || member.email}
                                                </Typography>
                                                <Chip
                                                    label={member?.pivot?.role || 'member'}
                                                    size="small"
                                                    color={getRoleColor(member?.pivot?.role)}
                                                    sx={{ fontWeight: 600 }}
                                                />
                                                {isOwnerFlag && (
                                                    <Chip label="owner" size="small" color="warning" sx={{ fontWeight: 600 }} />
                                                )}
                                                <Chip label="Active" size="small" color="success" variant="outlined" />
                                            </Stack>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }} noWrap>
                                                {member.email}
                                            </Typography>
                                            {member?.pivot?.joined_at && (
                                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                                    Joined {formatDate(member.pivot.joined_at)}
                                                </Typography>
                                            )}
                                            <AuthorizationChips member={member} isOwnerFlag={isOwnerFlag} />
                                        </Box>
                                        <Box>
                                            {!isOwnerFlag && (
                                                <Tooltip title="Remove member">
                                                    <IconButton
                                                        onClick={() => handleRemoveMember(memberId)}
                                                        color="error"
                                                        disabled={loading}
                                                        size="small"
                                                    >
                                                        <Delete />
                                                    </IconButton>
                                                </Tooltip>
                                            )}
                                        </Box>
                                    </Paper>
                                </ListItem>
                            );
                        })}
                    </List>
                )}

                {/* Pending invitations */}
                {invitations.length > 0 && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                            <Typography variant="subtitle1" fontWeight={700}>
                                Pending Invitations
                            </Typography>
                            <Chip label={invitations.length} size="small" variant="outlined" color="warning" sx={{ fontWeight: 600, height: 22 }} />
                        </Stack>
                        <List>
                            {invitations.map((invitation) => (
                                <ListItem key={invitation.id} sx={{ px: 0 }}>
                                    <Paper
                                        variant="outlined"
                                        sx={{
                                            p: 2.25,
                                            borderRadius: 3,
                                            width: '100%',
                                            display: 'flex',
                                            gap: 2,
                                            alignItems: 'flex-start',
                                            background: alpha(theme.palette.warning.light, 0.08),
                                            position: 'relative',
                                        }}
                                    >
                                        <Avatar sx={{ bgcolor: theme.palette.warning.main, width: 46, height: 46 }}>
                                            <Email />
                                        </Avatar>
                                        <Box sx={{ flex: 1 }}>
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, flexWrap: 'wrap' }}>
                                                <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1.1 }}>
                                                    {invitation.email}
                                                </Typography>
                                                <Chip
                                                    icon={<Pending />}
                                                    label="Pending"
                                                    size="small"
                                                    color="warning"
                                                    sx={{ fontWeight: 600, animation: 'pulse 2s infinite', '@keyframes pulse': { '0%': { opacity: 1 }, '50%': { opacity: 0.65 }, '100%': { opacity: 1 } } }}
                                                />
                                                {invitation.role && (
                                                    <Chip label={invitation.role} size="small" variant="outlined" />
                                                )}
                                            </Stack>
                                            <Typography variant="caption" color="warning.main" sx={{ fontWeight: 500, mb: 1, display: 'block' }}>
                                                📧 Sent {formatDate(invitation.created_at)} • ⏰ Expires {formatDate(invitation.expires_at)}
                                            </Typography>
                                            <InvitationPermissionPreview invitation={invitation} />
                                        </Box>
                                        <Box>
                                            <Tooltip title="Cancel invitation">
                                                <IconButton
                                                    onClick={() => handleCancelInvitation(invitation.id)}
                                                    color="error"
                                                    disabled={loading}
                                                    size="small"
                                                >
                                                    <Cancel />
                                                </IconButton>
                                            </Tooltip>
                                        </Box>
                                    </Paper>
                                </ListItem>
                            ))}
                        </List>
                    </>
                )}
            </DialogContent>

            <DialogActions sx={{ px: 2.5, pb: 1.5 }}>
                <Button onClick={onClose} sx={{ textTransform: 'none', fontWeight: 600 }} size="small">
                    Close
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default MembersManagerDialog;
