import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Avatar,
  Badge,
  Box,
  Divider,
  IconButton,
  InputAdornment,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
  Alert,
  Button,
  CircularProgress,
  Tooltip,
  Chip,
} from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import ChatBubbleOutlineIcon from '@mui/icons-material/ChatBubbleOutline';
import { useTheme, alpha } from '@mui/material/styles';
import { format } from 'date-fns';
import { usePage } from '@inertiajs/react';

import MicroAppWrapper from '../components/MicroAppWrapper';
import { csrfFetch } from '@/utils/csrf';

const GENERAL_ROOM_ID = 'general';

const defaultGeneralRoom = {
  id: GENERAL_ROOM_ID,
  name: 'General',
  type: 'channel',
  messages: [],
};

const normalizeId = (value) => {
  if (value === undefined || value === null) return null;
  return String(value);
};

const buildDirectRoomId = (a, b) => {
  const ids = [normalizeId(a) ?? '', normalizeId(b) ?? ''].sort();
  return `dm:${ids[0]}-${ids[1]}`;
};

const parseDirectRoom = (roomId) => {
  const raw = roomId.replace('dm:', '').split('-');
  if (raw.length >= 2) {
    return raw.map((value) => value || null);
  }
  return [];
};

const ensureGeneralRoom = (rooms) => {
  const currentGeneral = rooms?.[GENERAL_ROOM_ID] || {};
  return {
    ...rooms,
    [GENERAL_ROOM_ID]: {
      ...defaultGeneralRoom,
      ...currentGeneral,
      messages: currentGeneral?.messages || [],
    },
  };
};

const initialState = {
  rooms: {
    [GENERAL_ROOM_ID]: defaultGeneralRoom,
  },
  lastRead: {},
};

const getCurrentUser = () => {
  const laravelUser = window?.Laravel?.user;
  if (laravelUser) return laravelUser;
  return window?.App?.user || null;
};

const MessageBubble = ({ message, isOwn }) => {
  const theme = useTheme();
  const alignment = isOwn ? 'flex-end' : 'flex-start';
  const bubbleColor = isOwn
    ? (theme.palette.mode === 'dark' ? theme.palette.primary.dark : theme.palette.primary.main)
    : (theme.palette.mode === 'dark'
      ? alpha(theme.palette.background.paper, 0.8)
      : alpha(theme.palette.background.paper, 0.95));

  const textColor = isOwn ? theme.palette.primary.contrastText : theme.palette.text.primary;

  return (
    <Stack direction="row" justifyContent={alignment} sx={{ width: '100%' }}>
      <Box
        sx={{
          maxWidth: '72%',
          px: 2,
          py: 1.2,
          borderRadius: 3,
          backgroundColor: bubbleColor,
          color: textColor,
          boxShadow: isOwn ? `0 10px 24px ${alpha(theme.palette.primary.main, 0.3)}` : `0 6px 16px ${alpha('#000', theme.palette.mode === 'dark' ? 0.45 : 0.1)}`,
          border: `1px solid ${alpha(isOwn ? theme.palette.primary.light : theme.palette.divider, 0.4)}`,
        }}
      >
        {!isOwn && message.displayName && (
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, opacity: 0.9 }}>
            {message.displayName}
          </Typography>
        )}
        <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
          {message.content}
        </Typography>
        <Typography
          variant="caption"
          sx={{
            display: 'block',
            mt: 0.75,
            textAlign: 'right',
            opacity: 0.7,
            letterSpacing: 0.2,
          }}
        >
          {(() => {
            const date = new Date(message.createdAt);
            if (Number.isNaN(date.getTime())) return '';
            return format(date, 'MMM d, yyyy • h:mm a');
          })()}
        </Typography>
      </Box>
    </Stack>
  );
};

function ConversationListItem({
  active,
  unread,
  title,
  subtitle,
  avatar,
  onClick,
  highlight,
}) {
  const theme = useTheme();
  return (
    <ListItemButton
      selected={active}
      onClick={onClick}
      sx={{
        borderRadius: 2,
        mb: 0.5,
        alignItems: 'center',
        position: 'relative',
        border: active
          ? `1px solid ${alpha(theme.palette.primary.main, 0.4)}`
          : highlight
            ? `1px solid ${alpha(theme.palette.secondary.main, 0.5)}`
            : `1px solid ${alpha(theme.palette.divider, 0.4)}`,
        boxShadow: highlight
          ? `0 0 0 2px ${alpha(theme.palette.secondary.main, 0.2)}`
          : active
            ? `0 0 0 2px ${alpha(theme.palette.primary.main, 0.12)}`
            : 'none',
        backgroundColor: active
          ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.08)
          : alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.2 : 0.5),
        transition: 'all 0.22s ease',
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.25 : 0.12),
          transform: 'translateY(-1px)',
          boxShadow: highlight
            ? `0 0 0 3px ${alpha(theme.palette.secondary.main, 0.25)}`
            : `0 4px 16px ${alpha(theme.palette.common.black, 0.08)}`,
        },
      }}
    >
      <ListItemAvatar>
        {avatar}
      </ListItemAvatar>
      <ListItemText
        primary={
          <Typography variant="subtitle2" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {title}
            {highlight ? (
              <Tooltip title={highlight}>
                <Badge variant="dot" color="secondary" sx={{ '& .MuiBadge-badge': { height: 10, minWidth: 10 } }} />
              </Tooltip>
            ) : null}
          </Typography>
        }
        secondary={subtitle}
        secondaryTypographyProps={{
          sx: {
            color: 'text.secondary',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            display: '-webkit-box',
            WebkitLineClamp: 1,
            WebkitBoxOrient: 'vertical',
          },
        }}
      />
      {unread > 0 && (
        <Badge
          color="error"
          badgeContent={unread}
          sx={{
            mr: 1,
            '& .MuiBadge-badge': {
              fontWeight: 700,
              minWidth: 22,
              height: 22,
              borderRadius: '999px',
            },
          }}
        />
      )}
    </ListItemButton>
  );
}

function MessagingApp({ projectId, viewName }) {
  const { props } = usePage();
  const initialMembers = useMemo(() => (Array.isArray(props?.users) ? props.users : []), [props?.users]);

  const [memberState, setMemberState] = useState({ loading: false, members: initialMembers, error: null });
  const [selectedRoomId, setSelectedRoomId] = useState(GENERAL_ROOM_ID);
  const [messageDraft, setMessageDraft] = useState('');
  const seenMessagesRef = useRef(new Set());
  const initialisedRef = useRef(false);
  const messageListRef = useRef(null);

  const currentUser = useMemo(() => getCurrentUser(), []);
  const currentUserId = normalizeId(currentUser?.id);
  const currentUserEmail = currentUser?.email ? String(currentUser.email).toLowerCase() : null;
  const theme = useTheme();

  useEffect(() => {
    let isMounted = true;

    const fetchMembers = async () => {
      if (!projectId) return;
      setMemberState((prev) => ({ ...prev, loading: true }));
      try {
        const response = await csrfFetch(`/projects/${projectId}/members`, {
          method: 'GET',
          headers: { Accept: 'application/json' },
        });
        const data = await response.json();
        if (!isMounted) return;
        if (response.ok) {
          const members = Array.isArray(data?.members) ? data.members : [];
          setMemberState({ loading: false, members, error: null });
        } else {
          setMemberState((prev) => ({
            loading: false,
            members: prev.members?.length ? prev.members : initialMembers,
            error: data?.error || 'Unable to load project members. Showing cached roster instead.',
          }));
        }
      } catch (error) {
        if (!isMounted) return;
        setMemberState((prev) => ({
          loading: false,
          members: prev.members?.length ? prev.members : initialMembers,
          error: error.message || 'Unable to load project members. Showing cached roster instead.',
        }));
      }
    };

    fetchMembers();

    return () => {
      isMounted = false;
    };
  }, [projectId, initialMembers]);

  return (
    <MicroAppWrapper
      projectId={projectId}
      viewName={viewName}
      appKey="Messaging"
      title="Messaging"
      defaultValue={initialState}
      enableSharing
      defaultShared
    >
      {({ state, setState, isLoaded }) => {
        const roomsFromState = useMemo(
          () => ensureGeneralRoom(state?.rooms || {}),
          [state?.rooms]
        );

        const userKey = useMemo(() => {
          if (currentUserId) return `id:${currentUserId}`;
          if (currentUserEmail) return `email:${currentUserEmail}`;
          return 'anonymous';
        }, [currentUserId, currentUserEmail]);

        const { lastReadByUser, isLegacyLastRead } = useMemo(() => {
          const safeKey = userKey || 'anonymous';
          const raw = state?.lastRead;
          if (!raw || typeof raw !== 'object') {
            return { lastReadByUser: { [safeKey]: {} }, isLegacyLastRead: Boolean(raw && Object.keys(raw).length) };
          }

          const entries = Object.entries(raw);
          const isNested = entries.some(([, value]) => value && typeof value === 'object' && !Array.isArray(value));

          if (isNested) {
            const normalized = entries.reduce((acc, [key, value]) => {
              if (value && typeof value === 'object' && !Array.isArray(value)) {
                acc[key] = { ...value };
              }
              return acc;
            }, {});
            if (!normalized[safeKey]) {
              normalized[safeKey] = {};
            }
            return { lastReadByUser: normalized, isLegacyLastRead: false };
          }

          return { lastReadByUser: { [safeKey]: { ...raw } }, isLegacyLastRead: true };
        }, [state?.lastRead, userKey]);

        const userLastRead = useMemo(() => ({ ...lastReadByUser[userKey] }), [lastReadByUser, userKey]);

        useEffect(() => {
          if (!isLoaded) return;
          if (!state) return;
          if (!isLegacyLastRead) return;
          // Upgrade legacy shared lastRead structure (flat map) to per-user map once
          const migrated = Object.keys(lastReadByUser).reduce((acc, key) => {
            acc[key] = { ...lastReadByUser[key] };
            return acc;
          }, {});

          setState({
            ...(state || {}),
            lastRead: migrated,
          }, { force: true, immediate: true });
        }, [isLoaded, state, isLegacyLastRead, lastReadByUser, setState]);

        const membersById = useMemo(() => {
          const map = new Map();
          memberState.members.forEach((member) => {
            const memberId = normalizeId(member?.id);
            if (memberId) {
              map.set(memberId, member);
            }
          });
          if (currentUserId && !map.has(currentUserId)) {
            map.set(currentUserId, currentUser);
          }
          return map;
        }, [memberState.members, currentUser, currentUserId]);

        const membersByEmail = useMemo(() => {
          const map = new Map();
          memberState.members.forEach((member) => {
            if (member?.email) {
              map.set(String(member.email).toLowerCase(), member);
            }
          });
          if (currentUserEmail && !map.has(currentUserEmail)) {
            map.set(currentUserEmail, currentUser);
          }
          return map;
        }, [memberState.members, currentUser, currentUserEmail]);

        const resolveDisplayName = useMemo(() => {
          return (message) => {
            const normalizedSenderId = normalizeId(message?.senderId);
            if (normalizedSenderId) {
              const member = membersById.get(normalizedSenderId);
              if (member?.name) return member.name;
              if (member?.email) return member.email;
            }
            if (message?.senderEmail) {
              const member = membersByEmail.get(String(message.senderEmail).toLowerCase());
              if (member?.name) return member.name;
              if (member?.email) return member.email;
            }
            if (message?.senderName) return message.senderName;
            if (normalizedSenderId === currentUserId) {
              return currentUser?.name || currentUser?.email || 'You';
            }
            return 'Unknown';
          };
        }, [membersById, membersByEmail, currentUserId, currentUser]);

        const selectedRoom = useMemo(() => {
          if (selectedRoomId === GENERAL_ROOM_ID) return roomsFromState[GENERAL_ROOM_ID];
          return roomsFromState[selectedRoomId] || null;
        }, [roomsFromState, selectedRoomId]);

        const directRoomsMeta = useMemo(() => {
          const entries = [];
          Object.entries(roomsFromState).forEach(([roomId, room]) => {
            if (!roomId.startsWith('dm:')) return;

            const roomMessages = room?.messages || [];
            const lastMsg = roomMessages[roomMessages.length - 1];

            const participantsRaw = Array.isArray(room?.participants) && room.participants.length
              ? room.participants
              : parseDirectRoom(roomId);
            const normalizedParticipants = participantsRaw
              .map((value) => normalizeId(value))
              .filter(Boolean);

            let counterpartId = normalizedParticipants.find((id) => id !== currentUserId) || null;
            if (!counterpartId && lastMsg) {
              const senderId = normalizeId(lastMsg.senderId);
              if (senderId && senderId !== currentUserId) {
                counterpartId = senderId;
              }
            }

            const counterpartMember = counterpartId ? membersById.get(counterpartId) || null : null;

            const fallbackName = (() => {
              if (counterpartMember?.name) return counterpartMember.name;
              if (counterpartMember?.email) return counterpartMember.email;
              if (lastMsg && normalizeId(lastMsg.senderId) !== currentUserId) {
                return lastMsg.displayName || lastMsg.senderName || lastMsg.senderEmail || 'Teammate';
              }
              const participantCandidate = normalizedParticipants.find((id) => id && id !== currentUserId);
              const participantMember = participantCandidate ? membersById.get(participantCandidate) : null;
              if (participantMember?.name) return participantMember.name;
              if (participantMember?.email) return participantMember.email;
              if (room?.name && room.name !== 'Direct Message') return room.name;
              return 'Direct Message';
            })();

            const unread = roomMessages.filter((msg) => {
              if (normalizeId(msg.senderId) === currentUserId) return false;
              const lastReadAt = userLastRead?.[roomId];
              if (!lastReadAt) return true;
              return new Date(msg.createdAt) > new Date(lastReadAt);
            }).length;

            const lastMessageSnippet = lastMsg
              ? `${normalizeId(lastMsg.senderId) === currentUserId ? 'You' : (resolveDisplayName(lastMsg) || fallbackName)}: ${lastMsg.content.slice(0, 32)}${lastMsg.content.length > 32 ? '…' : ''}`
              : 'No messages yet';

            entries.push({
              roomId,
              unread,
              lastMessageSnippet,
              counterpartId,
              member: counterpartMember || (counterpartId ? {
                id: counterpartId,
                name: fallbackName,
                email: null,
                profile_photo_url: null,
              } : null),
              displayName: fallbackName,
              avatarUrl: counterpartMember?.profile_photo_url || null,
            });
          });

          if (currentUserId) {
            const existingCounterparts = new Set(entries.map((entry) => entry.counterpartId).filter(Boolean));
            memberState.members.forEach((member) => {
              const memberId = normalizeId(member?.id);
              if (!memberId || memberId === currentUserId) return;
              if (existingCounterparts.has(memberId)) return;
              const memberEmail = member?.email ? String(member.email).toLowerCase() : null;
              if (currentUserEmail && memberEmail && memberEmail === currentUserEmail) return;

              const roomId = buildDirectRoomId(currentUserId, memberId);
              entries.push({
                roomId,
                unread: 0,
                lastMessageSnippet: 'No messages yet',
                counterpartId: memberId,
                member,
                displayName: member?.name || member?.email || 'Team member',
                avatarUrl: member?.profile_photo_url || null,
              });
            });
          }

          entries.sort((a, b) => {
            const labelA = (a.displayName || '').toLowerCase();
            const labelB = (b.displayName || '').toLowerCase();
            return labelA.localeCompare(labelB);
          });

          return entries;
        }, [roomsFromState, currentUserId, userLastRead, membersById, resolveDisplayName, memberState.members, currentUserEmail]);

        const directRoomMap = useMemo(() => {
          const map = new Map();
          directRoomsMeta.forEach((meta) => {
            map.set(meta.roomId, meta);
          });
          return map;
        }, [directRoomsMeta]);

        const selectedDirectMeta = useMemo(() => {
          if (!selectedRoomId.startsWith('dm:')) return null;
          return directRoomMap.get(selectedRoomId) || null;
        }, [selectedRoomId, directRoomMap]);

        const selectedDirectParticipant = selectedDirectMeta?.member || null;

        const messages = useMemo(() => {
          return (selectedRoom?.messages || []).map((message) => ({
            ...message,
            displayName: resolveDisplayName(message),
          }));
        }, [selectedRoom?.messages, resolveDisplayName]);

        const generalSubtitle = useMemo(() => {
          const generalMessages = roomsFromState[GENERAL_ROOM_ID].messages || [];
          if (!generalMessages.length) return 'No messages yet';
          const last = generalMessages[generalMessages.length - 1];
          const displayName = resolveDisplayName(last);
          return `${displayName}: ${last.content.slice(0, 32)}${last.content.length > 32 ? '…' : ''}`;
        }, [roomsFromState, resolveDisplayName]);

        const unreadGeneral = useMemo(() => {
          const generalMessages = roomsFromState[GENERAL_ROOM_ID].messages || [];
          const lastReadAt = userLastRead?.[GENERAL_ROOM_ID];
          return generalMessages.filter((msg) => {
            if (normalizeId(msg.senderId) === currentUserId) return false;
            if (!lastReadAt) return generalMessages.length > 0;
            return new Date(msg.createdAt) > new Date(lastReadAt);
          }).length;
        }, [roomsFromState, userLastRead, currentUserId]);

        const totalUnread = useMemo(() => {
          const directUnread = directRoomsMeta.reduce((sum, room) => sum + room.unread, 0);
          return unreadGeneral + directUnread;
        }, [unreadGeneral, directRoomsMeta]);

        useEffect(() => {
          if (!messageListRef.current) return;
          messageListRef.current.scrollTop = messageListRef.current.scrollHeight;
        }, [selectedRoomId, messages.length]);

        useEffect(() => {
          const newMessages = [];
          Object.values(roomsFromState).forEach((room) => {
            (room?.messages || []).forEach((msg) => {
              if (!seenMessagesRef.current.has(msg.id)) {
                seenMessagesRef.current.add(msg.id);
                newMessages.push(msg);
              }
            });
          });

          if (!initialisedRef.current) {
            initialisedRef.current = true;
            return;
          }

          const incoming = newMessages.filter((msg) => normalizeId(msg.senderId) !== currentUserId);
          if (incoming.length) {
            const latest = incoming[incoming.length - 1];
            const isActiveRoom = latest.roomId === selectedRoomId;
          if (isActiveRoom) {
            const mergedLastRead = {
                ...lastReadByUser,
                [userKey]: {
                  ...userLastRead,
                  [latest.roomId]: latest.createdAt,
                },
              };

              setState({
                ...(state || {}),
                rooms: roomsFromState,
                lastRead: mergedLastRead,
                updatedAt: new Date().toISOString(),
              }, { immediate: true });
            }
          }
        }, [roomsFromState, selectedRoomId, setState, state, lastReadByUser, userLastRead, userKey, currentUserId]);

        useEffect(() => {
          if (!isLoaded) return;
          const generalMessages = roomsFromState[GENERAL_ROOM_ID]?.messages || [];
          if (selectedRoomId !== GENERAL_ROOM_ID || generalMessages.length === 0) return;
          const latest = generalMessages[generalMessages.length - 1].createdAt;
          const lastReadAt = userLastRead?.[GENERAL_ROOM_ID];
          if (lastReadAt && new Date(lastReadAt) >= new Date(latest)) return;

          const mergedLastRead = {
            ...lastReadByUser,
            [userKey]: {
              ...userLastRead,
              [GENERAL_ROOM_ID]: latest,
            },
          };

          setState({
            ...(state || {}),
            rooms: roomsFromState,
            lastRead: mergedLastRead,
            updatedAt: new Date().toISOString(),
          }, { immediate: true });
        }, [isLoaded, selectedRoomId, roomsFromState, lastReadByUser, userLastRead, userKey, setState, state]);

        const markRoomRead = (roomId) => {
          const roomMessages = roomsFromState[roomId]?.messages || [];
          if (!roomMessages.length) {
            setSelectedRoomId(roomId);
            return;
          }
          const latest = roomMessages[roomMessages.length - 1].createdAt;
          const mergedLastRead = {
            ...lastReadByUser,
            [userKey]: {
              ...userLastRead,
              [roomId]: latest,
            },
          };
          const nextState = {
            ...(state || {}),
            rooms: roomsFromState,
            lastRead: mergedLastRead,
            updatedAt: new Date().toISOString(),
          };
          setSelectedRoomId(roomId);
          setState(nextState, { immediate: true });
        };

        const handleSendMessage = () => {
          if (!messageDraft.trim() || !currentUser) return;
          const trimmed = messageDraft.trim();
          const now = new Date().toISOString();
          const activeRoomId = selectedRoomId || GENERAL_ROOM_ID;
          const existingRoom = roomsFromState[activeRoomId];

          const participants = activeRoomId === GENERAL_ROOM_ID
            ? []
            : parseDirectRoom(activeRoomId);

          const recipient = activeRoomId === GENERAL_ROOM_ID ? null : selectedDirectParticipant;
          const recipientDisplayName = activeRoomId === GENERAL_ROOM_ID ? null : selectedDirectMeta?.displayName;

          const roomName = activeRoomId === GENERAL_ROOM_ID
            ? 'General'
            : recipientDisplayName
              || recipient?.name
              || recipient?.email
              || existingRoom?.name
              || 'Direct Message';

          const newMessage = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            roomId: activeRoomId,
            senderId: currentUserId,
            senderName: currentUser.name || currentUser.email || 'You',
            senderEmail: currentUser?.email || null,
            content: trimmed,
            createdAt: now,
            participants,
          };

          const updatedRoom = {
            ...(existingRoom || {
              id: activeRoomId,
              name: roomName,
              type: activeRoomId === GENERAL_ROOM_ID ? 'channel' : 'direct',
              participants,
              messages: [],
            }),
            messages: [...(existingRoom?.messages || []), newMessage],
            name: roomName,
          };

          const nextRooms = ensureGeneralRoom({
            ...(state?.rooms || {}),
            [activeRoomId]: updatedRoom,
          });

          const mergedLastRead = {
            ...lastReadByUser,
            [userKey]: {
              ...userLastRead,
              [activeRoomId]: now,
            },
          };

          const nextState = {
            ...(state || {}),
            rooms: nextRooms,
            lastRead: mergedLastRead,
            updatedAt: now,
          };

          setMessageDraft('');
          setState(nextState, { force: true, immediate: true });
        };

        const handleKeyDown = (event) => {
          if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            handleSendMessage();
          }
        };

        return (
          <Box sx={{ display: 'flex', height: '100%', minHeight: 'calc(100vh - 160px)', gap: 2, p: 2 }}>
            <Paper
              variant="outlined"
              sx={{
                width: 280,
                flex: '0 0 280px',
                maxHeight: 'calc(100vh - 220px)',
                overflow: 'hidden',
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.4 : 0.7)}`,
                background: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.3 : 0.85),
                backdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box sx={{ px: 2.5, py: 2 }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    Conversations
                  </Typography>
                  {totalUnread > 0 && (
                    <Chip
                      color="secondary"
                      size="small"
                      label={`${totalUnread} new`}
                      sx={{
                        fontWeight: 600,
                        letterSpacing: 0.3,
                        px: 1,
                        height: 24,
                        borderRadius: 2,
                      }}
                    />
                  )}
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  Chat with your team or send private messages.
                </Typography>
              </Box>
              <Divider sx={{ borderColor: alpha(theme.palette.divider, 0.4) }} />
              <Box
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  px: 1.5,
                  py: 1.5,
                  pr: 1.2,
                  '&::-webkit-scrollbar': { width: 6 },
                  '&::-webkit-scrollbar-thumb': {
                    backgroundColor: alpha(theme.palette.text.primary, 0.25),
                    borderRadius: 999,
                  },
                }}
              >
                <List disablePadding>
                  <ConversationListItem
                    active={selectedRoomId === GENERAL_ROOM_ID}
                    unread={unreadGeneral}
                    title="General"
                    subtitle={generalSubtitle}
                    avatar={
                      <Avatar sx={{ bgcolor: theme.palette.primary.main }}>
                        <ForumOutlinedIcon fontSize="small" />
                      </Avatar>
                    }
                    onClick={() => markRoomRead(GENERAL_ROOM_ID)}
                    highlight={unreadGeneral > 0 ? `${unreadGeneral} unread message${unreadGeneral > 1 ? 's' : ''}` : null}
                  />
              <Divider textAlign="left" sx={{ my: 2, color: 'text.secondary', fontSize: 12 }}>Direct Messages</Divider>
              {memberState.error && (
                <Alert severity="warning" variant="outlined" sx={{ mx: 1.5, mb: 1.5 }}>
                  {memberState.error}
                </Alert>
              )}
              {memberState.loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : directRoomsMeta.length === 0 ? (
                <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
                  No direct conversations yet.
                </Typography>
              ) : (
                    directRoomsMeta.map(({ roomId, member, unread, lastMessageSnippet, displayName, avatarUrl }) => (
                      <ConversationListItem
                        key={roomId}
                        active={selectedRoomId === roomId}
                        unread={unread}
                        title={displayName || member?.name || member?.email || 'Direct Message'}
                        subtitle={lastMessageSnippet}
                        avatar={
                          <Avatar src={avatarUrl || member?.profile_photo_url || undefined} sx={{ bgcolor: theme.palette.secondary.main }}>
                            {(displayName || member?.name || member?.email || '?').slice(0, 1).toUpperCase()}
                          </Avatar>
                        }
                        onClick={() => markRoomRead(roomId)}
                        highlight={unread > 0 ? `${unread} unread message${unread > 1 ? 's' : ''}` : null}
                      />
                    ))
                  )}
                </List>
              </Box>
            </Paper>

            <Paper
              variant="outlined"
              sx={{
                flex: 1,
                borderRadius: 3,
                display: 'flex',
                flexDirection: 'column',
                border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.4 : 0.65)}`,
                background: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.25 : 0.95),
                backdropFilter: 'blur(14px)',
              }}
            >
              <Box sx={{ px: 3, py: 2.5, borderBottom: `1px solid ${alpha(theme.palette.divider, 0.4)}` }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Avatar
                    src={selectedRoomId === GENERAL_ROOM_ID ? undefined : selectedDirectMeta?.avatarUrl || selectedDirectParticipant?.profile_photo_url || undefined}
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: selectedRoomId === GENERAL_ROOM_ID
                        ? theme.palette.primary.main
                        : theme.palette.secondary.main,
                    }}
                  >
                    {selectedRoomId === GENERAL_ROOM_ID ? (
                      <ForumOutlinedIcon fontSize="small" />
                    ) : (
                      (selectedDirectMeta?.displayName || selectedDirectParticipant?.name || selectedDirectParticipant?.email || '?').slice(0, 1).toUpperCase()
                    )}
                  </Avatar>
                  <Typography variant="h6" sx={{ fontWeight: 700 }}>
                    {selectedRoomId === GENERAL_ROOM_ID
                      ? 'General Chat'
                      : selectedDirectMeta?.displayName || selectedDirectParticipant?.name || selectedDirectParticipant?.email || 'Direct Message'}
                  </Typography>
                </Stack>
                <Typography variant="body2" color="text.secondary">
                  {selectedRoomId === GENERAL_ROOM_ID
                    ? 'Messages are visible to everyone on this project.'
                    : 'Private conversation between you and this teammate.'}
                </Typography>
              </Box>

              <Box
                ref={messageListRef}
                sx={{
                  flex: 1,
                  overflowY: 'auto',
                  px: { xs: 2, md: 4 },
                  py: 3,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 2.5,
                  background: alpha(theme.palette.background.default, theme.palette.mode === 'dark' ? 0.35 : 0.4),
                }}
              >
                {messages.length === 0 ? (
                  <Box sx={{
                    mt: 6,
                    textAlign: 'center',
                    color: 'text.secondary',
                  }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                      No messages yet
                    </Typography>
                    <Typography variant="body2">
                      Start the conversation by sending the first message.
                    </Typography>
                  </Box>
                ) : (
                  messages.map((msg) => (
                    <MessageBubble
                      key={msg.id}
                      message={msg}
                      isOwn={Number(msg.senderId) === Number(currentUser?.id)}
                    />
                  ))
                )}
              </Box>

              <Box sx={{ px: { xs: 2, md: 3 }, py: 2.5, borderTop: `1px solid ${alpha(theme.palette.divider, 0.35)}` }}>
                <TextField
                  fullWidth
                  multiline
                  minRows={1}
                  maxRows={4}
                  placeholder={selectedRoomId === GENERAL_ROOM_ID
                    ? 'Message the whole team…'
                    : `Message ${selectedDirectParticipant?.name || 'your teammate'}…`
                  }
                  value={messageDraft}
                  onChange={(event) => setMessageDraft(event.target.value)}
                  onKeyDown={handleKeyDown}
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">
                        <IconButton
                          color="primary"
                          onClick={handleSendMessage}
                          disabled={!messageDraft.trim() || !currentUser}
                          sx={{
                            bgcolor: theme.palette.mode === 'dark'
                              ? alpha(theme.palette.primary.main, 0.2)
                              : alpha(theme.palette.primary.main, 0.1),
                            '&:hover': {
                              bgcolor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.35 : 0.2),
                            },
                            transition: 'all 0.2s ease',
                          }}
                        >
                          <SendRoundedIcon />
                        </IconButton>
                      </InputAdornment>
                    ),
                  }}
                />
              </Box>
            </Paper>
          </Box>
        );
      }}
    </MicroAppWrapper>
  );
}

export default MessagingApp;
