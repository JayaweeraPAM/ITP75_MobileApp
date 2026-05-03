import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  TextInput,
  RefreshControl,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  BackHandler,
  Image,
  StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation, router } from 'expo-router';
import { PremiumBlurWrapper } from '../src/components/PremiumBlurWrapper';
import api, { chatAPI, tutorAPI, usersAPI } from '../src/services/api';
import { AuthContext } from '../src/contexts/AuthContext';
import { Colors, BorderRadius, Spacing } from '../constants/theme';
import { getSocket } from '../src/services/socket';
import { ArrowLeft } from 'lucide-react-native';

// ── INDIVIDUAL CHAT SCREEN ───────────────────────────────
function ChatScreen({ thread, myId, onBack }) {
  const context = useContext(AuthContext);
  const threadId = thread.threadId || thread.id;
  const otherName = thread.otherUser?.name || 'Chat';
  const otherPhoto = thread.otherUser?.photoUrl;

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const listRef = useRef(null);
  const socketSubRef = useRef(null);
  const typingStopTimerRef = useRef(null);
  const isTypingSentRef = useRef(false);
  const hasLoadedRef = useRef(false);

  const fetchMessages = async () => {
    try {
      const res = await api.get(`/chat/threads/${threadId}/messages`);
      const serverMsgs = (res.data.messages || []).map((m) => ({
        id: m.id,
        senderId: m.senderId,
        content: m.content,
        sentAt: m.sentAt,
        isEdited: m.isEdited,
      }));
      setMessages((prev) => {
        const serverIds = new Set(serverMsgs.map((m) => m.id));
        const pendingOptimistic = prev.filter((opt) => {
          if (!opt.id.startsWith('opt-')) return false;
          const hasServerEquivalent = serverMsgs.some(
            (sm) => sm.content === opt.content && sm.senderId === opt.senderId
          );
          return !hasServerEquivalent;
        });
        return [...serverMsgs, ...pendingOptimistic].sort(
          (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
        );
      });
      if (!hasLoadedRef.current) {
        setTimeout(() => listRef.current?.scrollToEnd?.({ animated: false }), 80);
        hasLoadedRef.current = true;
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const [editingMsgId, setEditingMsgId] = useState(null);
  const [selectedMsg, setSelectedMsg] = useState(null);

  useEffect(() => {
    setLoading(true);
    hasLoadedRef.current = false;
    fetchMessages();

    // Regular WhatsApp-style background poll as a fallback for 100% reliable real-time updates
    const pollInterval = setInterval(() => {
      fetchMessages();
    }, 3000);

    const token = context?.token || null;
    const socket = getSocket(token);
    if (!socket) {
      return () => clearInterval(pollInterval);
    }

    const onNewMessage = (payload) => {
      const msg = payload?.message;
      if (!msg || msg.threadId !== threadId) return;
      const incoming = {
        id: msg.id,
        senderId: msg.senderId,
        content: msg.content,
        sentAt: msg.sentAt,
        isEdited: msg.isEdited,
      };
      setMessages((prev) => {
        if (prev.some((m) => m.id === incoming.id)) return prev;
        const pendingOptimistic = prev.filter((opt) => {
          if (!opt.id.startsWith('opt-')) return true;
          return opt.content !== incoming.content || opt.senderId !== incoming.senderId;
        });
        return [...pendingOptimistic, incoming].sort(
          (a, b) => new Date(a.sentAt).getTime() - new Date(b.sentAt).getTime()
        );
      });
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 60);
    };

    const onMessageEdited = (payload) => {
      const msg = payload?.message;
      if (!msg || msg.threadId !== threadId) return;
      setMessages((prev) =>
        prev.map((m) => (m.id === msg.id ? { ...m, content: msg.content, isEdited: true } : m))
      );
    };

    const onMessageDeleted = (payload) => {
      const deletedId = payload?.messageId;
      if (!deletedId) return;
      setMessages((prev) => prev.filter((m) => m.id !== deletedId));
    };

    const onTypingStart = (payload) => {
      if (!payload || payload.threadId !== threadId) return;
      if (payload.userId === myId) return;
      setIsOtherTyping(true);
    };

    const onTypingStop = (payload) => {
      if (!payload || payload.threadId !== threadId) return;
      if (payload.userId === myId) return;
      setIsOtherTyping(false);
    };

    socket.emit('joinThread', { threadId });
    socket.on('newMessage', onNewMessage);
    socket.on('messageEdited', onMessageEdited);
    socket.on('messageDeleted', onMessageDeleted);
    socket.on('typingStart', onTypingStart);
    socket.on('typingStop', onTypingStop);

    socketSubRef.current = {
      off: () => {
        try {
          socket.off('newMessage', onNewMessage);
          socket.off('messageEdited', onMessageEdited);
          socket.off('messageDeleted', onMessageDeleted);
          socket.off('typingStart', onTypingStart);
          socket.off('typingStop', onTypingStop);
        } catch {}
      },
    };

    return () => {
      clearInterval(pollInterval);
      socketSubRef.current?.off?.();
      socketSubRef.current = null;
    };
  }, [threadId]);

  useEffect(() => {
    const token = context?.token || null;
    const socket = getSocket(token);
    if (!socket) return;

    if (text.trim().length > 0) {
      if (!isTypingSentRef.current) {
        socket.emit('typingStart', { threadId });
        isTypingSentRef.current = true;
      }
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
      typingStopTimerRef.current = setTimeout(() => {
        socket.emit('typingStop', { threadId });
        isTypingSentRef.current = false;
      }, 1200);
    } else if (isTypingSentRef.current) {
      socket.emit('typingStop', { threadId });
      isTypingSentRef.current = false;
    }

    return () => {
      if (typingStopTimerRef.current) clearTimeout(typingStopTimerRef.current);
    };
  }, [text, threadId, context?.token]);

  useEffect(() => {
    const h = BackHandler.addEventListener('hardwareBackPress', () => {
      onBack();
      return true;
    });
    return () => h.remove();
  }, []);

  const handleSend = async () => {
    if (!text.trim() || sending) return;
    const msg = text.trim();
    setText('');
    const token = context?.token || null;
    const socket = getSocket(token);
    if (!socket) return;

    if (editingMsgId) {
      setMessages((prev) =>
        prev.map((m) => (m.id === editingMsgId ? { ...m, content: msg, isEdited: true } : m))
      );
      try {
        setSending(true);
        socket.emit('editMessage', { threadId, messageId: editingMsgId, content: msg });
        setTimeout(() => fetchMessages(), 400);
      } catch (err) {
        // ignore
      } finally {
        setSending(false);
        setEditingMsgId(null);
      }
    } else {
      const optId = `opt-${Date.now()}`;
      const optimistic = { id: optId, senderId: myId, content: msg, sentAt: new Date().toISOString() };
      setMessages((prev) => [...prev, optimistic]);
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 50);
      try {
        setSending(true);
        socket.emit('typingStop', { threadId });
        isTypingSentRef.current = false;
        socket.emit('sendMessage', { threadId, content: msg });
        setTimeout(() => fetchMessages(), 400);
      } catch {
        setMessages((prev) => prev.filter((m) => m.id !== optId));
        setText(msg);
      } finally {
        setSending(false);
      }
    }
  };

  return (
    <PremiumBlurWrapper>
      <LinearGradient colors={['#06040f', '#0d0920']} style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        {/* Header */}
        <View style={cs.header}>
          <TouchableOpacity onPress={onBack} style={cs.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          {otherPhoto ? (
            <Image source={{ uri: otherPhoto }} style={cs.avatarImg} />
          ) : (
            <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={cs.avatar}>
              <Text style={cs.avatarChar}>{(otherName || '?').charAt(0).toUpperCase()}</Text>
            </LinearGradient>
          )}
          <View style={{ flex: 1 }}>
            <Text style={cs.headerName} numberOfLines={1}>
              {otherName}
            </Text>
            <Text style={cs.headerRole}>{thread.otherUser?.role === 'tutor' ? '🎓 Tutor' : '📚 Student'}</Text>
          </View>
          <View style={cs.onlineDot} />
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
        >
          {loading ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <ActivityIndicator color={Colors.primary} size="large" />
            </View>
          ) : (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={(m, index) => `msg-${m.id}-${index}`}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: false })}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingTop: 80 }}>
                  <Text style={{ fontSize: 48, marginBottom: 12 }}>💬</Text>
                  <Text style={{ color: Colors.textSecondary, fontSize: 15, fontWeight: '500' }}>Say hello!</Text>
                  <Text style={{ color: Colors.textMuted, fontSize: 13, marginTop: 4 }}>
                    Be the first to send a message
                  </Text>
                </View>
              }
              ListFooterComponent={
                isOtherTyping ? (
                  <View style={cs.typingRow}>
                    <View style={cs.msgAvatar}>
                      <Text style={cs.msgAvatarChar}>{(otherName || '?').charAt(0)}</Text>
                    </View>
                    <View style={cs.typingBubble}>
                      <Text style={cs.typingDots}>Typing...</Text>
                    </View>
                  </View>
                ) : null
              }
              renderItem={({ item }) => {
                const mine = item.senderId === myId || (context?.user && (item.senderId === context.user.id || item.senderId === context.user._id));
                return (
                  <View style={[cs.msgRow, mine && cs.msgRowMine]}>
                    {!mine && (
                      <View style={cs.msgAvatar}>
                        <Text style={cs.msgAvatarChar}>{(otherName || '?').charAt(0)}</Text>
                      </View>
                    )}
                    <TouchableOpacity
                      activeOpacity={0.85}
                      style={{ maxWidth: '80%', flexShrink: 1 }}
                      onLongPress={() => {
                        if (mine) {
                          setSelectedMsg(item);
                        }
                      }}
                    >
                      <View style={[cs.bubble, mine ? cs.bubbleMine : cs.bubbleTheirs, { width: '100%' }]}>
                        <Text style={[cs.bubbleText, mine && cs.bubbleTextMine]}>{item.content}</Text>
                        <Text style={[cs.bubbleTime, mine && { color: 'rgba(200,196,255,0.6)' }]}>
                          {item.isEdited ? 'Edited • ' : ''}
                          {new Date(item.sentAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                );
              }}
            />
          )}

          {editingMsgId && (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingTop: 6, paddingBottom: 2 }}>
              <Text style={{ color: Colors.primary, fontSize: 13, fontWeight: '600' }}>Editing message...</Text>
              <TouchableOpacity onPress={() => { setEditingMsgId(null); setText(''); }}>
                <Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Input */}
          <View style={cs.inputBar}>
            <TextInput
              style={cs.input}
              value={text}
              onChangeText={setText}
              placeholder={editingMsgId ? "Edit your message..." : "Type a message..."}
              placeholderTextColor="rgba(140,140,190,0.45)"
              multiline
              maxLength={1000}
            />
            <TouchableOpacity onPress={handleSend} disabled={sending || !text.trim()} activeOpacity={0.85}>
              <LinearGradient
                colors={
                  text.trim()
                    ? ['#7C6FFF', '#5B50E8']
                    : ['rgba(50,50,70,0.5)', 'rgba(50,50,70,0.5)']
                }
                style={cs.sendBtn}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Text style={cs.sendIcon}>➤</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        <Modal
          animationType="fade"
          transparent={true}
          visible={selectedMsg !== null}
          onRequestClose={() => setSelectedMsg(null)}
        >
          <TouchableOpacity
            style={cs.modalOverlay}
            activeOpacity={1}
            onPress={() => setSelectedMsg(null)}
          >
            <View style={cs.modalSheet}>
              <View style={cs.modalHandle} />
              <Text style={cs.modalTitle}>Message Options</Text>
              
              <TouchableOpacity
                style={cs.modalOption}
                activeOpacity={0.75}
                onPress={() => {
                  if (selectedMsg) {
                    setEditingMsgId(selectedMsg.id);
                    setText(selectedMsg.content);
                    setSelectedMsg(null);
                  }
                }}
              >
                <View style={[cs.modalOptionIcon, { backgroundColor: 'rgba(124,111,255,0.15)' }]}>
                  <Text style={cs.modalEmoji}>✏️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={cs.modalOptionLabel}>Edit Message</Text>
                  <Text style={cs.modalOptionDesc}>Modify the content of this message</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={[cs.modalOption, { borderBottomWidth: 0 }]}
                activeOpacity={0.75}
                onPress={() => {
                  if (selectedMsg) {
                    const socket = getSocket(context?.token);
                    if (socket) {
                      socket.emit('deleteMessage', { threadId, messageId: selectedMsg.id });
                    }
                    setMessages((prev) => prev.filter((m) => m.id !== selectedMsg.id));
                    setSelectedMsg(null);
                  }
                }}
              >
                <View style={[cs.modalOptionIcon, { backgroundColor: 'rgba(239,68,68,0.15)' }]}>
                  <Text style={cs.modalEmoji}>🗑️</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[cs.modalOptionLabel, { color: '#ff4d4d' }]}>Delete Message</Text>
                  <Text style={cs.modalOptionDesc}>This action cannot be undone</Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                style={cs.modalCancelBtn}
                activeOpacity={0.8}
                onPress={() => setSelectedMsg(null)}
              >
                <Text style={cs.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </LinearGradient>
    </PremiumBlurWrapper>
  );
}

// ── THREAD LIST ──────────────────────────────────────────
const ThreadItem = ({ item, setOpenThread }) => {
  const otherId = item.otherUser?.id || item.otherUser?._id;
  const isTutor = item.otherUser?.role === 'tutor' || String(item.otherUser?.role).includes('tutor');

  const photo = item.otherUser?.photoUrl;
  return (
    <TouchableOpacity
      style={styles.threadCard}
      onPress={() => setOpenThread(item)}
      activeOpacity={0.82}
    >
      {photo ? (
        <Image source={{ uri: photo }} style={styles.threadAvatarImg} />
      ) : (
        <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={styles.threadAvatar}>
          <Text style={styles.threadAvatarChar}>
            {(item.otherUser.name || '?').charAt(0).toUpperCase()}
          </Text>
        </LinearGradient>
      )}
      <View style={styles.threadInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.threadName}>{item.otherUser.name}</Text>
        </View>
        <Text style={styles.threadRole}>{isTutor ? '🎓 Tutor' : '📚 Student'}</Text>
        {item.lastMessage ? (
          <Text style={styles.threadLastMsg} numberOfLines={1}>
            {item.lastMessage}
          </Text>
        ) : null}
      </View>
      <View style={{ alignItems: 'flex-end' }}>
        <Text style={styles.threadTime}>
          {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </Text>
        <Text style={{ color: Colors.primary, fontSize: 18, marginTop: 4 }}>›</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function ChatTabScreen() {
  const context = useContext(AuthContext);
  const user = context?.user;
  const myId = user ? user.id || user._id || '' : '';
  const role = user?.role || 'student';

  const [threads, setThreads] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [myPendingSent, setMyPendingSent] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openThread, setOpenThread] = useState(null);
  const [myPhoto, setMyPhoto] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const requestSubRef = useRef(null);

  useEffect(() => {
    const h = BackHandler.addEventListener('hardwareBackPress', () => {
      if (openThread) {
        setOpenThread(null);
        return true;
      }
      return false;
    });
    return () => h.remove();
  }, [openThread]);

  const fetchData = async () => {
    try {
      const threadsRes = await chatAPI.getThreads();
      setThreads(threadsRes.threads || []);

      if (role === 'tutor') {
        const reqRes = await chatAPI.getTutorPendingRequests().catch(() => ({ requests: [] }));
        setPendingRequests(reqRes.requests || []);
      } else {
        setMyPendingSent([]);
      }

      const meRes =
        role === 'tutor' ? await tutorAPI.getMyProfile().catch(() => null) : await usersAPI.getMe().catch(() => null);
      const photo = meRes?.profile?.photoUrl || meRes?.photoUrl || meRes?.user?.photoUrl || null;
      if (photo) setMyPhoto(photo);

      fadeAnim.setValue(0);
      Animated.timing(fadeAnim, { toValue: 1, duration: 350, useNativeDriver: true }).start();
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      setLoading(true);
      fetchData();
      const token = context?.token || null;
      const socket = getSocket(token);
      if (!socket) return;

      const onRequestUpdated = () => {
        fetchData();
      };
      socket.on('requestUpdated', onRequestUpdated);
      requestSubRef.current = {
        off: () => {
          try {
            socket.off('requestUpdated', onRequestUpdated);
          } catch {}
        },
      };

      return () => {
        requestSubRef.current?.off?.();
        requestSubRef.current = null;
      };
    }, [role])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const acceptRequest = async (reqId) => {
    try {
      await chatAPI.acceptRequest(reqId);
      Alert.alert('✅ Accepted', 'Chat request accepted! They can now message you.');
      fetchData();
    } catch (e) {
      Alert.alert('Failed', e?.response?.data?.error || 'Try again.');
    }
  };

  const rejectRequest = async (reqId) => {
    try {
      await chatAPI.rejectRequest(reqId);
      fetchData();
    } catch {}
  };

  if (openThread) {
    return <ChatScreen thread={openThread} myId={myId} onBack={() => setOpenThread(null)} />;
  }

  return (
    <PremiumBlurWrapper>
      <LinearGradient colors={['#06040f', '#100a22', '#06040f']} style={styles.gradient}>
        <StatusBar barStyle="light-content" />
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={{ marginRight: 16 }} activeOpacity={0.7}>
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Messages</Text>
            <Text style={styles.subtitle}>
              {threads.length} conversation{threads.length !== 1 ? 's' : ''}
            </Text>
          </View>
          {myPhoto ? (
            <Image source={{ uri: myPhoto }} style={styles.myAvatar} />
          ) : (
            <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={styles.myAvatar}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>
                {(user?.name || '?').charAt(0).toUpperCase()}
              </Text>
            </LinearGradient>
          )}
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
            <FlatList
              data={threads}
              keyExtractor={(t, index) => `thread-${t.id}-${index}`}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
              ListHeaderComponent={
                <>
                  {/* Tutor: pending student requests */}
                  {role === 'tutor' && pendingRequests.length > 0 && (
                    <View style={styles.section}>
                      <Text style={styles.sectionLabel}>📨 Chat Requests</Text>
                      {pendingRequests.map((req, index) => (
                        <View key={`req-${req.id}-${index}`} style={styles.requestCard}>
                          <LinearGradient colors={['#f59e0b', '#d97706']} style={styles.reqAvatar}>
                            <Text style={styles.reqAvatarChar}>{(req.student?.fullName || 'S').charAt(0)}</Text>
                          </LinearGradient>
                          <View style={{ flex: 1 }}>
                            <Text style={styles.reqName}>{req.student?.fullName || 'Student'}</Text>
                            <Text style={styles.reqSub}>Wants to chat with you</Text>
                          </View>
                          <View style={{ flexDirection: 'row', gap: 8 }}>
                            <TouchableOpacity
                              onPress={() => rejectRequest(req.id)}
                              style={styles.rejectBtn}
                              activeOpacity={0.8}
                            >
                              <Text style={{ color: '#ef4444', fontSize: 12, fontWeight: '700' }}>✕</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() => acceptRequest(req.id)}
                              style={styles.acceptBtn}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.acceptBtnText}>✓ Accept</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      ))}
                    </View>
                  )}

                  {threads.length > 0 && <Text style={[styles.sectionLabel, { marginBottom: 10 }]}>💬 Conversations</Text>}
                </>
              }
              ListEmptyComponent={
                pendingRequests.length === 0 && myPendingSent.length === 0 ? (
                  <View style={styles.emptyState}>
                    <Text style={{ fontSize: 64, marginBottom: 16 }}>💬</Text>
                    <Text style={styles.emptyTitle}>No Conversations Yet</Text>
                    <Text style={styles.emptySub}>
                      {role === 'student'
                        ? 'Find a tutor and tap 💬 Chat to start a conversation'
                        : 'Accept student chat requests to start exchanging messages'}
                    </Text>
                  </View>
                ) : null
              }
              renderItem={({ item }) => <ThreadItem item={item} setOpenThread={setOpenThread} />}
            />
          </Animated.View>
        )}
      </LinearGradient>
    </PremiumBlurWrapper>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: Spacing.md,
  },
  title: { fontSize: 28, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: Colors.textMuted, marginTop: 2 },
  myAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: Spacing.md, paddingBottom: 40 },
  section: { marginBottom: Spacing.md },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: 'rgba(245,158,11,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
  },
  reqAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  reqAvatarChar: { color: '#fff', fontWeight: '800', fontSize: 17 },
  reqName: { fontSize: 14, fontWeight: '700', color: Colors.textPrimary },
  reqSub: { fontSize: 11, color: Colors.textMuted, marginTop: 2 },
  rejectBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    backgroundColor: 'rgba(239,68,68,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtn: {
    paddingHorizontal: 14,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#22c55e',
    borderWidth: 1,
    borderColor: 'rgba(34,197,94,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: { color: '#ffffff', fontSize: 12, fontWeight: '800', letterSpacing: 0.2 },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: Spacing.xl },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 10 },
  emptySub: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 21 },
  threadCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
    borderRadius: 18,
    padding: 14,
    marginBottom: 10,
  },
  threadAvatar: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  threadAvatarImg: { width: 52, height: 52, borderRadius: 26, marginRight: 14, borderWidth: 2, borderColor: Colors.primary },
  threadAvatarChar: { color: '#fff', fontWeight: '800', fontSize: 20 },
  threadInfo: { flex: 1 },
  threadName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, marginBottom: 2 },
  threadRole: { fontSize: 12, color: Colors.textMuted },
  threadLastMsg: { fontSize: 12, color: Colors.textSecondary, marginTop: 3 },
  threadTime: { fontSize: 11, color: Colors.textMuted },
});

const cs = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 44,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(124,111,255,0.12)',
    backgroundColor: 'rgba(6,4,15,0.95)',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(124,111,255,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(124,111,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  avatarImg: { width: 42, height: 42, borderRadius: 21, marginRight: 12, borderWidth: 2, borderColor: Colors.primary },
  avatarChar: { color: '#fff', fontWeight: '800', fontSize: 17 },
  headerName: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary },
  headerRole: { fontSize: 11, color: Colors.textMuted, marginTop: 1 },
  onlineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e', borderWidth: 2, borderColor: '#06040f' },
  msgRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
  msgRowMine: { justifyContent: 'flex-end' },
  msgAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(124,111,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 4,
  },
  msgAvatarChar: { color: Colors.primary, fontSize: 12, fontWeight: '700' },
  bubble: { minWidth: 80, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10, flexShrink: 1 },
  bubbleMine: { backgroundColor: '#7C6FFF', borderBottomRightRadius: 6 },
  bubbleTheirs: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 6,
  },
  bubbleText: { color: Colors.textPrimary, fontSize: 15, lineHeight: 21 },
  bubbleTextMine: { color: '#fff' },
  bubbleTime: { color: 'rgba(150,150,180,0.7)', fontSize: 10, marginTop: 3, alignSelf: 'flex-end' },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124,111,255,0.12)',
    backgroundColor: 'rgba(6,4,15,0.97)',
    gap: 10,
    paddingBottom: Platform.OS === 'ios' ? 42 : 10,
  },
  input: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(124,111,255,0.2)',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 14,
    fontSize: 15,
    color: Colors.textPrimary,
    minHeight: 54,
    maxHeight: 150,
  },
  sendBtn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  sendIcon: { color: '#fff', fontSize: 16, fontWeight: '700' },
  typingRow: { flexDirection: 'row', marginTop: 4, marginBottom: 6, alignItems: 'flex-end' },
  typingBubble: {
    maxWidth: '68%',
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 18,
    borderBottomLeftRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  typingDots: { color: 'rgba(220,220,255,0.85)', fontSize: 13, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24 },
  modalSheet: {
    backgroundColor: '#0d0920',
    width: '100%',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: 'rgba(124,111,255,0.2)',
    padding: 24,
    paddingBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 20,
  },
  modalHandle: { display: 'none' },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 16, textAlign: 'center' },
  modalOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
  modalOptionIcon: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center', marginRight: 16 },
  modalEmoji: { fontSize: 18 },
  modalOptionLabel: { fontSize: 16, fontWeight: '700', color: '#fff' },
  modalOptionDesc: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  modalCancelBtn: { backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 16, paddingVertical: 15, alignItems: 'center', marginTop: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.04)' },
  modalCancelText: { color: 'rgba(255,255,255,0.85)', fontSize: 15, fontWeight: '700' },
});
