import React, { useEffect, useState, useRef } from 'react';
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
  BackHandler,
  StatusBar,
  ScrollView,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useNavigation } from 'expo-router';
import { PremiumBlurWrapper } from '../../src/components/PremiumBlurWrapper';
import api, { aiChatAPI, setApiGuestId } from '../../src/services/api';
import { Colors, Spacing } from '../../constants/theme';
import { Sparkles, Trash2, Plus, ArrowLeft, Send } from 'lucide-react-native';
import { useContext } from 'react';
import { AuthContext } from '../../src/contexts/AuthContext';

const GUEST_KEY = 'tutorhub_guest_id';

async function ensureGuestId() {
  let id = await AsyncStorage.getItem(GUEST_KEY);
  if (!id) {
    id = `guest_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    await AsyncStorage.setItem(GUEST_KEY, id);
  }
  setApiGuestId(id);
}

function AnimatedTypingDot({ delay }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
        Animated.timing(anim, { toValue: 0, duration: 400, useNativeDriver: true }),
      ])
    ).start();
  }, []);
  return (
    <Animated.View
      style={{
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#7C6FFF',
        opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.3, 1] }),
        transform: [
          {
            translateY: anim.interpolate({
              inputRange: [0, 1],
              outputRange: [0, -4],
            }),
          },
        ],
      }}
    />
  );
}

// ── INDIVIDUAL AI CHAT SCREEN ───────────────────────────────
function AiChatScreen({ sessionId, onBack }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const listRef = useRef(null);

  const fetchMessages = async () => {
    try {
      const res = await aiChatAPI.getMessages(sessionId);
      setMessages(res.messages || []);
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: false }), 80);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchMessages();
  }, [sessionId]);

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
    const optimisticUser = { id: `user-${Date.now()}`, role: 'user', content: msg };
    setMessages((prev) => [...prev, optimisticUser]);
    setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 50);

    try {
      setSending(true);
      const res = await aiChatAPI.sendMessage(sessionId, msg);
      if (res.assistantMessage) {
        setMessages((prev) => [...prev, res.assistantMessage]);
      } else {
        fetchMessages();
      }
      setTimeout(() => listRef.current?.scrollToEnd?.({ animated: true }), 60);
    } catch {
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSending(false);
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
          <View style={{ flex: 1 }}>
            <Text style={cs.headerName} numberOfLines={1}>
              AI Assistant
            </Text>
            <Text style={cs.headerRole}>Online & ready to help</Text>
          </View>
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
              keyExtractor={(m, index) => `msg-${m.id || index}`}
              contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 16, paddingBottom: 16 }}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={() => listRef.current?.scrollToEnd?.({ animated: false })}
              ListEmptyComponent={
                <View style={{ alignItems: 'center', paddingTop: 80 }}>
                  <Sparkles size={48} color="#7C6FFF" style={{ marginBottom: 12 }} />
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Ask me anything!</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 }}>
                    Start typing to chat with your AI assistant
                  </Text>
                </View>
              }
              renderItem={({ item }) => {
                const mine = item.role === 'user';
                return (
                  <View style={[cs.msgRow, mine && cs.msgRowMine]}>
                    <View style={[cs.bubble, mine ? cs.bubbleMine : cs.bubbleTheirs]}>
                      <Text style={[cs.bubbleText, mine && cs.bubbleTextMine]}>{item.content}</Text>
                    </View>
                  </View>
                );
              }}
              ListFooterComponent={
                sending ? (
                  <View style={[cs.msgRow, { alignItems: 'flex-start', marginTop: 6 }]}>
                    <View style={[cs.bubble, cs.bubbleTheirs, { width: 140 }]}>
                      <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 11, marginBottom: 8, fontWeight: '600' }}>AI is typing</Text>
                      <View style={{ flexDirection: 'row', gap: 6, paddingLeft: 2 }}>
                        <AnimatedTypingDot delay={0} />
                        <AnimatedTypingDot delay={150} />
                        <AnimatedTypingDot delay={300} />
                      </View>
                    </View>
                  </View>
                ) : null
              }
            />
          )}

          {/* Input */}
          <View style={cs.inputBar}>
            <TextInput
              style={cs.input}
              value={text}
              onChangeText={setText}
              placeholder="Type a message..."
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
                  <Send size={18} color="#fff" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </LinearGradient>
    </PremiumBlurWrapper>
  );
}

function InstituteJoinRequestsScreen({ user }) {
  const [joinRequests, setJoinRequests] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.get('/institutes/my-institute').catch(() => null);
      if (res && res.data && res.data.joinRequests) {
        setJoinRequests(res.data.joinRequests);
      }
    } catch (err) {
      console.warn('Failed to load join requests', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      loadData();
    }, [])
  );

  const handleApproveJoin = async (id) => {
    try {
      await api.post(`/institutes/join-requests/${id}/approve`);
      Alert.alert('Approved', 'Tutor join request has been approved.');
      loadData();
    } catch (e) {
      Alert.alert('Error', 'Failed to approve join request');
    }
  };

  const handleRejectJoin = async (id) => {
    try {
      await api.post(`/institutes/join-requests/${id}/reject`);
      Alert.alert('Rejected', 'Tutor join request has been rejected.');
      loadData();
    } catch (e) {
      Alert.alert('Error', 'Failed to reject join request');
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#06040f' }}>
        <ActivityIndicator color="#10B981" size="large" />
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, marginTop: 12 }}>Loading join requests...</Text>
      </View>
    );
  }

  return (
    <PremiumBlurWrapper>
      <View style={{ flex: 1, backgroundColor: '#06040f', paddingTop: Platform.OS === 'ios' ? 60 : 44 }}>
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>⚠️ Join Requests</Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Manage pending tutor affiliation requests</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                loadData();
              }}
              tintColor="#10B981"
            />
          }
        >
          <View style={{ gap: 12, marginTop: 4 }}>
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>⚠️ Pending Requests ({joinRequests.length})</Text>
            {joinRequests.length === 0 ? (
              <View style={{ padding: 32, alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)', marginTop: 8 }}>
                <Text style={{ fontSize: 48, marginBottom: 8 }}>✨</Text>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>All Caught Up!</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                  No pending tutor requests at the moment.
                </Text>
              </View>
            ) : (
              joinRequests.map((r) => (
                <View key={r.id} style={{ padding: 16, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)', gap: 14 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 14, backgroundColor: 'rgba(245,158,11,0.18)', alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontSize: 18, fontWeight: '800', color: '#F59E0B' }}>{(r.tutorName || 'T')[0].toUpperCase()}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{r.tutorName || 'Tutor'}</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>{r.tutorEmail}</Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', gap: 10, marginTop: 4 }}>
                    <TouchableOpacity
                      onPress={() => handleRejectJoin(r.id)}
                      style={{ flex: 1, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: '#ef4444', alignItems: 'center' }}
                      activeOpacity={0.8}
                    >
                      <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 13 }}>✕ Reject</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleApproveJoin(r.id)}
                      style={{ flex: 1.5, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: '#10B981', backgroundColor: 'rgba(16,185,129,0.08)', alignItems: 'center' }}
                      activeOpacity={0.8}
                    >
                      <Text style={{ color: '#10B981', fontWeight: '700', fontSize: 13, textAlign: 'center' }}>✓ Approve</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      </View>
    </PremiumBlurWrapper>
  );
}

// ── MAIN HISTORY LIST SCREEN ───────────────────────────────
export default function AiChatTabScreen() {
  const context = useContext(AuthContext);
  const role = String(context?.user?.role ?? '').trim().toLowerCase();
  if (role === 'institute_manager') {
    return <InstituteJoinRequestsScreen user={context?.user} />;
  }

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [openSessionId, setOpenSessionId] = useState(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const h = BackHandler.addEventListener('hardwareBackPress', () => {
      if (openSessionId) {
        setOpenSessionId(null);
        return true;
      }
      return false;
    });
    return () => h.remove();
  }, [openSessionId]);

  const navigation = useNavigation();
  useEffect(() => {
    navigation.setOptions({
      tabBarStyle: openSessionId ? { display: 'none' } : { display: 'flex' },
    });
  }, [openSessionId, navigation]);

  const fetchSessions = async () => {
    try {
      await ensureGuestId();
      await aiChatAPI.health().catch(() => null);
      const res = await aiChatAPI.listSessions();
      setSessions(res.sessions || []);

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
      fetchSessions();
    }, [])
  );

  const onRefresh = () => {
    setRefreshing(true);
    fetchSessions();
  };

  const createSession = async () => {
    try {
      const res = await aiChatAPI.createSession();
      if (res.session?.id) {
        setSessions((prev) => [res.session, ...prev]);
        setOpenSessionId(res.session.id);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to create new AI chat session.');
    }
  };

  const clearAllHistory = () => {
    Alert.alert(
      'Clear All Chat History',
      'Are you sure you want to permanently delete all your previous AI conversations?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete All',
          style: 'destructive',
          onPress: async () => {
            try {
              await aiChatAPI.clearSessions();
              setSessions([]);
              setOpenSessionId(null);
              Alert.alert('Deleted', 'All AI chat history has been cleared.');
            } catch {
              Alert.alert('Error', 'Failed to clear chat history.');
            }
          },
        },
      ]
    );
  };

  const deleteSingleSession = async (sid) => {
    try {
      await aiChatAPI.deleteSession(sid);
      setSessions((prev) => prev.filter((s) => s.id !== sid));
    } catch {
      Alert.alert('Error', 'Failed to delete session.');
    }
  };

  if (openSessionId) {
    return <AiChatScreen sessionId={openSessionId} onBack={() => setOpenSessionId(null)} />;
  }

  return (
    <PremiumBlurWrapper>
      <LinearGradient colors={['#06040f', '#100a22', '#06040f']} style={styles.gradient}>
        <StatusBar barStyle="light-content" />
        <View style={styles.blob1} />
        <View style={styles.blob2} />

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>AI Assistant</Text>
            <Text style={styles.subtitle}>Your AI Study Partner</Text>
          </View>
          {sessions.length > 0 && (
            <TouchableOpacity onPress={clearAllHistory} style={styles.clearBtn}>
              <Trash2 size={18} color="#FF4D4D" />
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <Animated.View style={{ opacity: fadeAnim, flex: 1 }}>
            <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
              <TouchableOpacity onPress={createSession} style={styles.createSessionBtn} activeOpacity={0.82}>
                <Plus size={20} color="#fff" />
                <Text style={styles.createSessionBtnText}>New AI Chat</Text>
              </TouchableOpacity>
            </View>

            <FlatList
              data={sessions}
              keyExtractor={(t, index) => `session-${t.id}-${index}`}
              contentContainerStyle={styles.list}
              showsVerticalScrollIndicator={false}
              refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
              ListHeaderComponent={
                sessions.length > 0 ? (
                  <Text style={styles.sectionLabel}>Previous Chats</Text>
                ) : null
              }
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Sparkles size={64} color="#7C6FFF" style={{ marginBottom: 16 }} />
                  <Text style={styles.emptyTitle}>No AI Chats Yet</Text>
                  <Text style={styles.emptySub}>Tap New AI Chat to start a conversation</Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.threadCard}>
                  <TouchableOpacity
                    style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}
                    onPress={() => setOpenSessionId(item.id)}
                    activeOpacity={0.82}
                  >
                    <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={styles.threadAvatar}>
                      <Sparkles size={20} color="#fff" />
                    </LinearGradient>
                    <View style={styles.threadInfo}>
                      <Text style={styles.threadName} numberOfLines={1}>
                        {item.title || `Chat ${item.id.slice(0, 8)}`}
                      </Text>
                      <Text style={styles.threadLastMsg} numberOfLines={1}>
                        Session ID: {item.id.slice(0, 8)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteSingleSession(item.id)} style={{ padding: 8 }}>
                    <Trash2 size={16} color="rgba(255, 77, 77, 0.65)" />
                  </TouchableOpacity>
                </View>
              )}
            />
          </Animated.View>
        )}
      </LinearGradient>
    </PremiumBlurWrapper>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  blob1: { position: 'absolute', top: -60, right: -80, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(124,111,255,0.12)' },
  blob2: { position: 'absolute', bottom: 100, left: -60, width: 200, height: 200, borderRadius: 100, backgroundColor: 'rgba(59,130,246,0.06)' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 56 : 48,
    paddingBottom: Spacing.md,
  },
  title: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
  clearBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 77, 77, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 77, 77, 0.22)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 40 },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: 1, marginBottom: 8, textTransform: 'uppercase' },
  createSessionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#7C6FFF',
    borderRadius: 16,
    paddingVertical: 14,
    shadowColor: '#7C6FFF',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 14,
    elevation: 8,
  },
  createSessionBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  emptyState: { alignItems: 'center', paddingTop: 80, paddingHorizontal: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: '#fff', marginBottom: 10 },
  emptySub: { color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', lineHeight: 21 },
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
  threadAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  threadInfo: { flex: 1 },
  threadName: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 2 },
  threadLastMsg: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 2 },
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
  headerName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  headerRole: { fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 1 },
  msgRow: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end' },
  msgRowMine: { justifyContent: 'flex-end' },
  bubble: { maxWidth: '75%', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 10 },
  bubbleMine: { backgroundColor: '#7C6FFF', borderBottomRightRadius: 6 },
  bubbleTheirs: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    borderBottomLeftRadius: 6,
  },
  bubbleText: { color: '#fff', fontSize: 15, lineHeight: 21 },
  bubbleTextMine: { color: '#fff' },
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
    color: '#fff',
    minHeight: 54,
    maxHeight: 150,
  },
  sendBtn: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
});
