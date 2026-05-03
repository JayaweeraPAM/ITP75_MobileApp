import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { PremiumBlurWrapper } from '../src/components/PremiumBlurWrapper';
import { aiChatAPI, setApiGuestId } from '../src/services/api';
import { Colors } from '../constants/theme';

const GUEST_KEY = 'tutorhub_guest_id';

async function ensureGuestId() {
  let id = await AsyncStorage.getItem(GUEST_KEY);
  if (!id) {
    id = `guest_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    await AsyncStorage.setItem(GUEST_KEY, id);
  }
  setApiGuestId(id);
}

export default function AiChatScreen() {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [sessionId, setSessionId] = useState('');
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);

  const current = useMemo(() => sessions.find((s) => s.id === sessionId), [sessions, sessionId]);

  const loadSessions = async () => {
    const res = await aiChatAPI.listSessions();
    const next = res.sessions || [];
    setSessions(next);
    if (!sessionId && next[0]?.id) setSessionId(next[0].id);
  };

  const loadMessages = async (sid) => {
    if (!sid) return setMessages([]);
    const res = await aiChatAPI.getMessages(sid);
    setMessages(res.messages || []);
  };

  useEffect(() => {
    const init = async () => {
      try {
        await ensureGuestId();
        await aiChatAPI.health();
        await loadSessions();
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  useEffect(() => {
    loadMessages(sessionId);
  }, [sessionId]);

  const createSession = async () => {
    const res = await aiChatAPI.createSession();
    if (res.session?.id) {
      await loadSessions();
      setSessionId(res.session.id);
    }
  };

  const send = async () => {
    if (!sessionId || !text.trim() || sending) return;
    const draft = text.trim();
    setText('');
    setSending(true);
    try {
      const res = await aiChatAPI.sendMessage(sessionId, draft);
      const userMessage = res.userMessage;
      const assistantMessage = res.assistantMessage;
      setMessages((prev) => [...prev, userMessage, assistantMessage].filter(Boolean));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator color={Colors.primary} size="large" />
      </View>
    );
  }

  return (
    <PremiumBlurWrapper>
      <LinearGradient colors={['#06040f', '#0d0920', '#06040f']} style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>AI Study Assistant</Text>
          <TouchableOpacity style={styles.newBtn} onPress={createSession}>
            <Text style={styles.newText}>New Session</Text>
          </TouchableOpacity>
        </View>

        <FlatList
          horizontal
          data={sessions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ gap: 8, paddingBottom: 8 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setSessionId(item.id)}
              style={[styles.sessionChip, item.id === sessionId && styles.sessionChipActive]}
            >
              <Text style={styles.sessionChipText} numberOfLines={1}>
                {item.title || item.id.slice(0, 8)}
              </Text>
            </TouchableOpacity>
          )}
        />

        <Text style={styles.sub}>Active: {current?.title || 'None'}</Text>

        <FlatList
          data={messages}
          keyExtractor={(item, idx) => String(item?.id || idx)}
          contentContainerStyle={{ paddingVertical: 8, gap: 8, paddingBottom: 20 }}
          renderItem={({ item }) => (
            <View style={[styles.msg, item.role === 'assistant' ? styles.assistant : styles.user]}>
              <Text style={styles.msgText}>{item.content}</Text>
            </View>
          )}
        />

        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Ask a question..."
            placeholderTextColor="rgba(255,255,255,0.45)"
          />
          <TouchableOpacity style={styles.send} onPress={send} disabled={sending}>
            <Text style={styles.sendText}>{sending ? '...' : 'Send'}</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </PremiumBlurWrapper>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 56, paddingHorizontal: 16 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#06040f' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { color: '#fff', fontSize: 24, fontWeight: '800' },
  newBtn: { borderWidth: 1, borderColor: 'rgba(124,111,255,0.4)', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8 },
  newText: { color: '#fff', fontWeight: '700' },
  sessionChip: { maxWidth: 180, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  sessionChipActive: { borderColor: 'rgba(124,111,255,0.7)', backgroundColor: 'rgba(124,111,255,0.2)' },
  sessionChipText: { color: '#fff', fontSize: 12 },
  sub: { color: Colors.textMuted, fontSize: 12, marginBottom: 6 },
  msg: { borderRadius: 12, padding: 10, maxWidth: '90%' },
  user: { backgroundColor: 'rgba(59,130,246,0.25)', alignSelf: 'flex-end' },
  assistant: { backgroundColor: 'rgba(124,111,255,0.2)', alignSelf: 'flex-start' },
  msgText: { color: '#fff' },
  inputRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: 10,
    color: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  send: { borderRadius: 10, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(124,111,255,0.6)' },
  sendText: { color: '#fff', fontWeight: '700' },
});
