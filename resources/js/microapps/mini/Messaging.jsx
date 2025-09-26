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
  Snackbar,
  Stack,
  TextField,
  Typography,
  Alert,
  Button,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import { useTheme, alpha } from '@mui/material/styles';
import { format } from 'date-fns';

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
        {!isOwn && (
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, opacity: 0.9 }}>
            {message.senderName || 'Unknown'}
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
        border: active ? `1px solid ${alpha(theme.palette.primary.main, 0.35)}` : `1px solid ${alpha(theme.palette.divider, 0.4)}`,
        backgroundColor: active
          ? alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.2 : 0.08)
          : alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.2 : 0.5),
        transition: 'all 0.2s ease',
        '&:hover': {
          backgroundColor: alpha(theme.palette.primary.main, theme.palette.mode === 'dark' ? 0.25 : 0.12),
          transform: 'translateY(-1px)',
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
        <Badge color="primary" badgeContent={unread} sx={{ mr: 1 }} />
      )}
    </ListItemButton>
  );
}

function MessagingApp({ projectId, viewName }) {
  const [memberState, setMemberState] = useState({ loading: true, members: [], error: null });
  const [selectedRoomId, setSelectedRoomId] = useState(GENERAL_ROOM_ID);
  const [messageDraft, setMessageDraft] = useState('');
  const [notification, setNotification] = useState(null);
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
          setMemberState({ loading: false, members: [], error: data?.error || 'Failed to load members.' });
        }
      } catch (error) {
        if (!isMounted) return;
        setMemberState({ loading: false, members: [], error: error.message || 'Unable to load members.' });
      }
    };

    fetchMembers();

    return () => {
      isMounted = false;
    };
  }, [projectId]);

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
        const roomsFromState = ensureGeneralRoom(state?.rooms || {});
        const lastRead = state?.lastRead || {};

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

        const otherMembers = useMemo(() => {
          return memberState.members.filter((member) => {
            const memberId = normalizeId(member?.id);
            if (currentUserId && memberId && memberId === currentUserId) return false;
            const memberEmail = member?.email ? String(member.email).toLowerCase() : null;
            if (currentUserEmail && memberEmail && memberEmail === currentUserEmail) return false;
            return true;
          });
        }, [memberState.members, currentUserId, currentUserEmail]);

        const selectedRoom = useMemo(() => {
          if (selectedRoomId === GENERAL_ROOM_ID) return roomsFromState[GENERAL_ROOM_ID];
          return roomsFromState[selectedRoomId] || null;
        }, [roomsFromState, selectedRoomId]);

        const selectedDirectParticipant = useMemo(() => {
          if (!selectedRoomId.startsWith('dm:')) return null;
          const [idA, idB] = parseDirectRoom(selectedRoomId);
          const normalizedA = normalizeId(idA);
          const normalizedB = normalizeId(idB);
          const otherId = normalizedA === currentUserId ? normalizedB : normalizedA;
          return otherId ? (membersById.get(otherId) || null) : null;
        }, [selectedRoomId, membersById, currentUserId]);

        const messages = selectedRoom?.messages || [];

        const generalSubtitle = (() => {
          const generalMessages = roomsFromState[GENERAL_ROOM_ID].messages || [];
          if (!generalMessages.length) return 'No messages yet';
          const last = generalMessages[generalMessages.length - 1];
          return `${last.senderName || 'Unknown'}: ${last.content.slice(0, 32)}${last.content.length > 32 ? '…' : ''}`;
        })();

        const directRoomsMeta = useMemo(() => {
          if (!currentUserId) return [];
          return otherMembers
            .map((member) => {
              const memberId = normalizeId(member?.id);
              const roomId = buildDirectRoomId(currentUserId, memberId);
              const storedRoom = roomsFromState[roomId];
              const roomMessages = storedRoom?.messages || [];
              const lastMsg = roomMessages[roomMessages.length - 1];
              const lastReadAt = lastRead?.[roomId];
              const unread = roomMessages.filter((msg) => {
                if (normalizeId(msg.senderId) === currentUserId) return false;
                if (!lastReadAt) return true;
                return new Date(msg.createdAt) > new Date(lastReadAt);
              }).length;
              return {
                roomId,
                member,
                unread,
                lastMessageSnippet: lastMsg
                  ? `${normalizeId(lastMsg.senderId) === currentUserId ? 'You' : lastMsg.senderName || 'Unknown'}: ${lastMsg.content.slice(0, 32)}${lastMsg.content.length > 32 ? '…' : ''}`
                  : 'No messages yet',
              };
            });
        }, [otherMembers, roomsFromState, currentUserId, lastRead]);

        const unreadGeneral = useMemo(() => {
          const generalMessages = roomsFromState[GENERAL_ROOM_ID].messages || [];
          const lastReadAt = lastRead?.[GENERAL_ROOM_ID];
          return generalMessages.filter((msg) => {
            if (normalizeId(msg.senderId) === currentUserId) return false;
            if (!lastReadAt) return generalMessages.length > 0;
            return new Date(msg.createdAt) > new Date(lastReadAt);
          }).length;
        }, [roomsFromState, lastRead, currentUserId]);

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
            const targetMember = latest.roomId === GENERAL_ROOM_ID
              ? null
              : (() => {
                  const ids = parseDirectRoom(latest.roomId);
                  const otherId = ids.find((id) => normalizeId(id) !== currentUserId);
                  return otherId ? membersById.get(normalizeId(otherId)) : null;
                })();
            setNotification({
              open: !isActiveRoom,
              roomId: latest.roomId,
              message: latest.content,
              sender: latest.senderName || 'Someone',
              directTarget: targetMember?.name || null,
            });
            if (isActiveRoom) {
              const updatedLastRead = {
                ...(state?.lastRead || {}),
                [latest.roomId]: latest.createdAt,
              };
              setState({
                ...(state || {}),
                rooms: roomsFromState,
                lastRead: updatedLastRead,
                updatedAt: new Date().toISOString(),
              }, { immediate: true });
            }
          }
        }, [roomsFromState, currentUser, membersById, selectedRoomId, setState, state]);

        useEffect(() => {
          if (!isLoaded) return;
          const generalMessages = roomsFromState[GENERAL_ROOM_ID]?.messages || [];
          if (selectedRoomId !== GENERAL_ROOM_ID || generalMessages.length === 0) return;
          const latest = generalMessages[generalMessages.length - 1].createdAt;
          const lastReadAt = lastRead?.[GENERAL_ROOM_ID];
          if (lastReadAt && new Date(lastReadAt) >= new Date(latest)) return;

          const nextState = {
            ...(state || {}),
            rooms: roomsFromState,
            lastRead: {
              ...(state?.lastRead || {}),
              [GENERAL_ROOM_ID]: latest,
            },
            updatedAt: new Date().toISOString(),
          };

          setState(nextState, { immediate: true });
        }, [isLoaded, selectedRoomId, roomsFromState, lastRead, setState, state]);

        const markRoomRead = (roomId) => {
          const roomMessages = roomsFromState[roomId]?.messages || [];
          if (!roomMessages.length) {
            setSelectedRoomId(roomId);
            return;
          }
          const latest = roomMessages[roomMessages.length - 1].createdAt;
          const nextState = {
            ...(state || {}),
            rooms: roomsFromState,
            lastRead: {
              ...(state?.lastRead || {}),
              [roomId]: latest,
            },
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

          const roomName = activeRoomId === GENERAL_ROOM_ID
            ? 'General'
            : recipient?.name || existingRoom?.name || 'Direct Message';

          const newMessage = {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            roomId: activeRoomId,
            senderId: currentUserId,
            senderName: currentUser.name || currentUser.email || 'You',
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

          const nextState = {
            ...(state || {}),
            rooms: nextRooms,
            lastRead: {
              ...(state?.lastRead || {}),
              [activeRoomId]: now,
            },
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

        const notificationAction = notification?.roomId
          ? (
              <Button
                color="inherit"
                size="small"
                onClick={() => {
                  setNotification(null);
                  markRoomRead(notification.roomId);
                }}
              >
                Open
              </Button>
            )
          : null;

        return (
          <Box sx={{ display: 'flex', height: '100%', minHeight: 'calc(100vh - 160px)', gap: 2, p: 2 }}>
            <Paper
              variant="outlined"
              sx={{
                width: 280,
                flex: '0 0 280px',
                borderRadius: 3,
                border: `1px solid ${alpha(theme.palette.divider, theme.palette.mode === 'dark' ? 0.4 : 0.7)}`,
                background: alpha(theme.palette.background.paper, theme.palette.mode === 'dark' ? 0.3 : 0.85),
                backdropFilter: 'blur(10px)',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Box sx={{ px: 2.5, py: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  Conversations
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Chat with your team or send private messages.
                </Typography>
              </Box>
              <Divider sx={{ borderColor: alpha(theme.palette.divider, 0.4) }} />
              <Box sx={{ flex: 1, overflowY: 'auto', px: 1.5, py: 1.5 }}>
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
                    highlight={unreadGeneral > 0 ? `${unreadGeneral} new message${unreadGeneral > 1 ? 's' : ''}` : null}
                  />
                  <Divider textAlign="left" sx={{ my: 2, color: 'text.secondary', fontSize: 12 }}>Direct Messages</Divider>
                  {memberState.loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
                      <CircularProgress size={24} />
                    </Box>
                  ) : memberState.error ? (
                    <Typography variant="body2" color="error" sx={{ px: 2 }}>
                      {memberState.error}
                    </Typography>
                  ) : otherMembers.length === 0 ? (
                    <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
                      No other members yet.
                    </Typography>
                  ) : (
                    directRoomsMeta.map(({ roomId, member, unread, lastMessageSnippet }) => (
                      <ConversationListItem
                        key={roomId}
                        active={selectedRoomId === roomId}
                        unread={unread}
                        title={member.name || member.email}
                        subtitle={lastMessageSnippet}
                        avatar={
                          <Avatar src={member.profile_photo_url || undefined} sx={{ bgcolor: theme.palette.secondary.main }}>
                            {(member.name || member.email || '?').slice(0, 1).toUpperCase()}
                          </Avatar>
                        }
                        onClick={() => markRoomRead(roomId)}
                        highlight={unread > 0 ? `${unread} new message${unread > 1 ? 's' : ''}` : null}
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
                <Typography variant="h6" sx={{ fontWeight: 700 }}>
                  {selectedRoomId === GENERAL_ROOM_ID ? 'General Chat' : (selectedDirectParticipant?.name || selectedRoom?.name || 'Direct Message')}
                </Typography>
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

            <Snackbar
              open={Boolean(notification?.open)}
              autoHideDuration={5000}
              onClose={() => setNotification(null)}
              anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            >
              <Alert
                severity="info"
                onClose={() => setNotification(null)}
                action={notificationAction}
                sx={{ alignItems: 'center' }}
              >
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  {notification?.sender || 'New message'}
                  {notification?.directTarget ? ` → ${notification.directTarget}` : ''}
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.5, maxWidth: 280 }}>
                  {notification?.message}
                </Typography>
              </Alert>
            </Snackbar>
          </Box>
        );
      }}
    </MicroAppWrapper>
  );
}

export default MessagingApp;
