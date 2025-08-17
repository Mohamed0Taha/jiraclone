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
} from '@mui/material';
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
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('member');
    const [members, setMembers] = useState([]);
    const [invitations, setInvitations] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

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
        const val = candidates.find(v => v !== undefined && v !== null);
        return val === undefined ? null : val;
    };

    const extractMemberId = (member) => {
        if (!member) return null;
        const candidates = [
            member.id,
            member.user_id,
            member.userId,
            member.user?.id,
        ];
        const val = candidates.find(v => v !== undefined && v !== null);
        return val === undefined ? null : val;
    };

    // Normalize once for this render
    const normalizedOwnerId = project ? (extractProjectOwnerId(project) != null ? String(extractProjectOwnerId(project)) : null) : null;

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
        } catch (err) {
            setError('Failed to load members: ' + err.message);
            console.error('Error loading members:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleInviteMember = async (e) => {
        e.preventDefault();
        if (!email.trim()) return;

        try {
            setLoading(true);
            setError('');
            setSuccess('');

            const response = await fetch(`/projects/${project.id}/members/invite`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
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
                setMembers(prev => [...prev, {
                    id: data.user.id,
                    name: data.user.name,
                    email: data.user.email,
                    pivot: { role, joined_at: new Date().toISOString() }
                }]);
            } else {
                setSuccess(`Invitation sent to ${email}!`);
                setInvitations(prev => [...prev, data.invitation]);
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
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
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
            setMembers(prev => prev.filter(member => String(extractMemberId(member)) !== String(userId)));
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
                    'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.getAttribute('content'),
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
            setInvitations(prev => prev.filter(inv => String(inv.id) !== String(invitationId)));
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
                isOwner: true
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
            isOwner: false
        };
    };

    const AuthorizationChips = ({ member, isOwnerFlag }) => {
        const auth = getAuthorizationSummary(member, isOwnerFlag);
        const permissions = [
            { key: 'viewProject', label: 'View Project', icon: <Visibility />, enabled: auth.canViewProject },
            { key: 'viewTasks', label: 'View Tasks', icon: <Task />, enabled: auth.canViewTasks },
            { key: 'editTasks', label: 'Edit Tasks', icon: <Edit />, enabled: auth.canEditTasks },
            { key: 'editProject', label: 'Edit Project', icon: <Settings />, enabled: auth.canEditProject },
            { key: 'manageMembers', label: 'Manage Members', icon: <Group />, enabled: auth.canManageMembers },
        ];

        return (
            <Box sx={{ mt: 1 }}>
                <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
                    <Security sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                    Permissions {auth.isOwner ? '(Full Access - Owner)' : '(Member Access)'}:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {permissions.map((perm) => (
                        <Tooltip key={perm.key} title={perm.enabled ? `Can ${perm.label}` : `Cannot ${perm.label}`}>
                            <Chip
                                icon={perm.icon}
                                label={perm.label}
                                size="small"
                                variant={perm.enabled ? "filled" : "outlined"}
                                color={perm.enabled ? "success" : "default"}
                                sx={{ 
                                    fontSize: '0.7rem',
                                    height: 24,
                                    opacity: perm.enabled ? 1 : 0.6,
                                    '& .MuiChip-icon': { fontSize: 14 }
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
                <Typography variant="caption" color="warning.main" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>
                    <Security sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                    Will have permissions:
                </Typography>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {permissions.map((perm) => (
                        <Tooltip key={perm.key} title={perm.enabled ? `Will be able to ${perm.label}` : `Won't be able to ${perm.label}`}>
                            <Chip
                                icon={perm.icon}
                                label={perm.label}
                                size="small"
                                variant="outlined"
                                color={perm.enabled ? "warning" : "default"}
                                sx={{ 
                                    fontSize: '0.7rem',
                                    height: 24,
                                    opacity: perm.enabled ? 1 : 0.5,
                                    '& .MuiChip-icon': { fontSize: 14 }
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

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle>
                <Box display="flex" alignItems="center" gap={1}>
                    <Person />
                    Manage Project Members
                </Box>
            </DialogTitle>
            
            <DialogContent>
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

                {/* Invite new member form */}
                <Box component="form" onSubmit={handleInviteMember} sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Invite New Member
                    </Typography>
                    <Box display="flex" gap={2} alignItems="end">
                        <TextField
                            label="Email Address"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            fullWidth
                            disabled={loading}
                        />
                        <FormControl sx={{ minWidth: 120 }}>
                            <InputLabel>Role</InputLabel>
                            <Select
                                value={role}
                                label="Role"
                                onChange={(e) => setRole(e.target.value)}
                                disabled={loading}
                            >
                                <MenuItem value="member">Member</MenuItem>
                                <MenuItem value="admin">Admin</MenuItem>
                            </Select>
                        </FormControl>
                        <Button
                            type="submit"
                            variant="contained"
                            startIcon={loading ? <CircularProgress size={20} /> : <PersonAdd />}
                            disabled={loading || !email.trim()}
                        >
                            {loading ? 'Inviting...' : 'Invite'}
                        </Button>
                    </Box>
                </Box>

                <Divider sx={{ my: 2 }} />

                {/* Current members */}
                <Typography variant="h6" gutterBottom>
                    Current Members ({members.length})
                </Typography>
                {members.length === 0 ? (
                    <Typography color="text.secondary" sx={{ py: 2 }}>
                        No members yet
                    </Typography>
                ) : (
                    <List>
                        {members.map((member) => {
                            const memberId = extractMemberId(member);
                            const isOwnerFlag =
                                (normalizedOwnerId != null && memberId != null && isOwnerByIds(normalizedOwnerId, memberId))
                                || (member?.pivot?.role === 'owner'); // safety net

                            return (
                                <ListItem key={String(memberId ?? Math.random())} sx={{ flexDirection: 'column', alignItems: 'stretch', py: 2 }}>
                                    <Box sx={{ display: 'flex', width: '100%', alignItems: 'flex-start' }}>
                                        <Avatar sx={{ mr: 2, bgcolor: 'success.main', mt: 0.5 }}>
                                            {member.name?.charAt(0) || member.email?.charAt(0) || 'U'}
                                        </Avatar>
                                        <Box sx={{ flex: 1 }}>
                                            <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                    {member.name || member.email}
                                                </Typography>
                                                <Chip
                                                    label={member?.pivot?.role || 'member'}
                                                    size="small"
                                                    color={getRoleColor(member?.pivot?.role)}
                                                />
                                                {isOwnerFlag && (
                                                    <Chip label="owner" size="small" color="warning" />
                                                )}
                                                <Chip 
                                                    label="Active" 
                                                    size="small" 
                                                    color="success" 
                                                    variant="outlined"
                                                />
                                            </Box>
                                            
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                                {member.email}
                                            </Typography>
                                            
                                            {member?.pivot?.joined_at && (
                                                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                                                    Joined {formatDate(member.pivot.joined_at)}
                                                </Typography>
                                            )}
                                            
                                            <AuthorizationChips member={member} isOwnerFlag={isOwnerFlag} />
                                        </Box>
                                        
                                        <Box sx={{ ml: 2 }}>
                                            {!isOwnerFlag && (
                                                <IconButton
                                                    onClick={() => handleRemoveMember(memberId)}
                                                    color="error"
                                                    disabled={loading}
                                                    size="small"
                                                >
                                                    <Delete />
                                                </IconButton>
                                            )}
                                        </Box>
                                    </Box>
                                </ListItem>
                            );
                        })}
                    </List>
                )}

                {/* Pending invitations */}
                {invitations.length > 0 && (
                    <>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" gutterBottom>
                            Pending Invitations ({invitations.length})
                        </Typography>
                        <List>
                            {invitations.map((invitation) => (
                                <ListItem key={invitation.id} sx={{ flexDirection: 'column', alignItems: 'stretch', py: 2 }}>
                                    <Box sx={{ display: 'flex', width: '100%', alignItems: 'flex-start' }}>
                                        <Avatar sx={{ mr: 2, bgcolor: 'warning.main', mt: 0.5 }}>
                                            <Email />
                                        </Avatar>
                                        <Box sx={{ flex: 1 }}>
                                            <Box display="flex" alignItems="center" gap={1} sx={{ mb: 1 }}>
                                                <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                                    {invitation.email}
                                                </Typography>
                                                <Chip
                                                    icon={<Pending />}
                                                    label="Pending Invitation"
                                                    size="small"
                                                    color="warning"
                                                    sx={{ 
                                                        animation: 'pulse 2s infinite',
                                                        '@keyframes pulse': {
                                                            '0%': { opacity: 1 },
                                                            '50%': { opacity: 0.7 },
                                                            '100%': { opacity: 1 },
                                                        }
                                                    }}
                                                />
                                                {invitation.role && (
                                                    <Chip
                                                        label={invitation.role}
                                                        size="small"
                                                        color="default"
                                                        variant="outlined"
                                                    />
                                                )}
                                            </Box>
                                            
                                            <Typography variant="caption" color="warning.main" sx={{ fontWeight: 500, mb: 1, display: 'block' }}>
                                                📧 Invitation sent {formatDate(invitation.created_at)} • 
                                                ⏰ Expires {formatDate(invitation.expires_at)}
                                            </Typography>
                                            
                                            <InvitationPermissionPreview invitation={invitation} />
                                        </Box>
                                        
                                        <Box sx={{ ml: 2 }}>
                                            <IconButton
                                                onClick={() => handleCancelInvitation(invitation.id)}
                                                color="error"
                                                disabled={loading}
                                                title="Cancel invitation"
                                                size="small"
                                            >
                                                <Cancel />
                                            </IconButton>
                                        </Box>
                                    </Box>
                                </ListItem>
                            ))}
                        </List>
                    </>
                )}
            </DialogContent>
            
            <DialogActions>
                <Button onClick={onClose}>Close</Button>
            </DialogActions>
        </Dialog>
    );
};

export default MembersManagerDialog;
