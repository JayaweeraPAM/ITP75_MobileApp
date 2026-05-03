import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, TouchableOpacity, TextInput, Animated, Modal, ScrollView, Alert, Platform, Image, StatusBar, Linking, RefreshControl } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { PremiumBlurWrapper } from '../../src/components/PremiumBlurWrapper';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import api, { chatAPI } from '../../src/services/api';
import { Colors } from '../../constants/theme';
import { useContext } from 'react';
import { AuthContext } from '../../src/contexts/AuthContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
const MIN_REVIEWS_FOR_CONFIDENT_RATING = 5;
function pluralize(count, singular, plural = `${singular}s`) {
  return count === 1 ? singular : plural;
}
function getTutorDisplayName(t) {
  const name = String(t?.fullName || t?.name || '').trim();
  return name.length ? name : 'Unknown Tutor';
}
// ── MINI CALENDAR ────────────────────────────────────────
const MONTHS_S = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const CDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const CHOURS = Array.from({ length: 24 }, (_, i) => i);
const CMINS = [0, 15, 30, 45];
const BOOKING_ACCENT = '#7C6FFF';
function MiniCalendar({ value, onChange }) {
  const today = new Date();
  const [vy, setVy] = useState(value.getFullYear());
  const [vm, setVm] = useState(value.getMonth());
  const [hr, setHr] = useState(value.getHours());
  const [mn, setMn] = useState(0);
  const [tab, setTab] = useState('d');
  const [showTimePicker, setShowTimePicker] = useState(false);
  const dCount = new Date(vy, vm + 1, 0).getDate();
  const fDay = new Date(vy, vm, 1).getDay();
  const past = (d) => new Date(vy, vm, d) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const sel = (d) => value.getDate() === d && value.getMonth() === vm && value.getFullYear() === vy;
  const tod = (d) => today.getDate() === d && today.getMonth() === vm && today.getFullYear() === vy;
  const cells = [];
  for (let i = 0; i < fDay; i++)
    cells.push(null);
  for (let d = 1; d <= dCount; d++)
    cells.push(d);
  const pick = (d) => onChange(new Date(vy, vm, d, hr, mn));
  const setT = (h, m) => { setHr(h); setMn(m); onChange(new Date(value.getFullYear(), value.getMonth(), value.getDate(), h, m)); };
  const onTimeChange = (event, selectedDate) => {
    setShowTimePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setHr(selectedDate.getHours());
      setMn(selectedDate.getMinutes());
      onChange(new Date(value.getFullYear(), value.getMonth(), value.getDate(), selectedDate.getHours(), selectedDate.getMinutes()));
    }
  };
  const prev = () => { if (vm === 0) { setVm(11); setVy(y => y - 1); } else setVm(m => m - 1); };
  const next = () => { if (vm === 11) { setVm(0); setVy(y => y + 1); } else setVm(m => m + 1); };
  return (<View style={{ marginBottom: 2 }}>
    {/* Tabs */}
    <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, marginBottom: 16 }}>
      {[{ id: 'd', label: '📅 Date' }, { id: 't', label: '🕐 Time' }].map(t => (
        <TouchableOpacity key={t.id} onPress={() => setTab(t.id)} activeOpacity={0.8} style={{ flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: tab === t.id ? 'rgba(255,255,255,0.1)' : 'transparent' }}>
          <Text style={{ color: tab === t.id ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: '700', fontSize: 13 }}>{t.label}</Text>
        </TouchableOpacity>
      ))}
    </View>

    {tab === 'd' ? (
      <View>
        {/* Date Grid */}
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 4 }}>
          <TouchableOpacity onPress={prev} activeOpacity={0.7} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>‹</Text></TouchableOpacity>
          <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>{MONTHS_S[vm]} {vy}</Text>
          <TouchableOpacity onPress={next} activeOpacity={0.7} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>›</Text></TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row', marginBottom: 6 }}>{CDAYS.map(d => <Text key={d} style={{ flex: 1, textAlign: 'center', fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: '700' }}>{d}</Text>)}</View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 4 }}>
          {cells.map((day, i) => (<TouchableOpacity key={i} disabled={!day || past(day)} onPress={() => day && !past(day) && pick(day)} activeOpacity={0.7} style={{
            width: `${100 / 7}%`, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 18,
            backgroundColor: day && sel(day) ? BOOKING_ACCENT : 'transparent',
            borderWidth: day && tod(day) && !sel(day) ? 1.5 : 0, borderColor: 'rgba(255,255,255,0.2)', opacity: day && past(day) ? 0.3 : 1
          }}>
            {day ? <Text style={{ fontSize: 13, fontWeight: sel(day) ? '800' : '600', color: sel(day) ? '#FFFFFF' : '#EAEAEA' }}>{day}</Text> : null}
          </TouchableOpacity>))}
        </View>
      </View>
    ) : (
      <View>
        {/* Time Picker */}
        <View style={{ alignItems: 'center', marginTop: 10 }}>
          <Text style={{ color: '#EAEAEA', fontSize: 13, fontWeight: '700', marginBottom: 12 }}>Start Time</Text>
          <TouchableOpacity onPress={() => setShowTimePicker(true)} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }}>
            <Text style={{ color: '#fff', fontSize: 24, fontWeight: '600', letterSpacing: 2, marginRight: 16 }}>
              {value.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </Text>
            <Text style={{ fontSize: 20 }}>🕒</Text>
          </TouchableOpacity>
          {showTimePicker && (
            <DateTimePicker
              value={value}
              mode="time"
              is24Hour={false}
              display="default"
              onChange={onTimeChange}
              themeVariant="dark"
            />
          )}
        </View>
      </View>
    )}
  </View>);
}
function BookModal({ visible, tutor, onClose, onBooked }) {
  const [subject, setSubject] = useState('');
  const [date, setDate] = useState(() => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(10, 0, 0, 0); return d; });
  const [loading, setLoading] = useState(false);
  const [subjectPopupVisible, setSubjectPopupVisible] = useState(false);
  if (!tutor)
    return null;
  const subjectList = (tutor.subjects || []).map(s => typeof s === 'string' ? s : s.subject);
  const selectedSubject = subject.trim() || subjectList[0] || 'General';
  const totalPrice = tutor.hourlyRate || 0;
  const handleBook = async () => {
    var _a, _b;
    try {
      setLoading(true);
      await api.post('/bookings', {
        tutorId: tutor.id, subject: selectedSubject,
        classFormat: 'Online', classType: 'Individual',
        dateTime: date.toISOString(), price: totalPrice, durationMinutes: 60,
      });
      Alert.alert('✅ Booking Sent!', 'Your booking request has been sent to the tutor.');
      onBooked();
      onClose();
    }
    catch (e) {
      Alert.alert('Booking Failed', ((_b = (_a = e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) || 'Please try again.');
    }
    finally {
      setLoading(false);
    }
  };
  return (<Modal visible={visible} animationType="slide" transparent>
    <View style={modalStyles.overlay}>
      <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1} />
      <View style={modalStyles.sheet}>
        <BlurView intensity={80} experimentalBlurMethod="dimezisBlurView" tint="dark" style={StyleSheet.absoluteFill} />
        <View style={modalStyles.handle} />
        {/* Title - compact */}
        <View style={{ paddingVertical: 12, marginBottom: 4 }}>
          <Text style={[modalStyles.title, { marginBottom: 6 }]}>Book Session with {tutor.fullName || tutor.name}</Text>
          {tutor.hourlyRate ? <View style={modalStyles.rateBadge}><Text style={modalStyles.rateText}>💰 LKR {tutor.hourlyRate}/hr · 💻 Online Only</Text></View> : null}
        </View>
        {/* Scrollable Content */}
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
          {/* Subject - popup trigger */}
          <View style={{ marginBottom: 16 }}>
            <Text style={[modalStyles.label, { color: '#EAEAEA' }]}>Subject</Text>
            <TouchableOpacity onPress={() => setSubjectPopupVisible(true)} activeOpacity={0.7} style={modalStyles.subjectDropdown}>
              <Text style={{ color: subject || subjectList[0] ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: '600', flex: 1 }}>{subject || subjectList[0] || 'Select subject'}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>▼</Text>
            </TouchableOpacity>
          </View>
          {/* Calendar */}
          <View style={{ marginBottom: 16 }}>
            <View style={modalStyles.calendarWrap}>
              <MiniCalendar value={date} onChange={setDate} />
            </View>
          </View>
          {/* Online Notice */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', marginBottom: 16 }}>
            <View style={{ backgroundColor: 'rgba(59,130,246,0.2)', padding: 8, borderRadius: 8 }}>
              <Text style={{ fontSize: 16 }}>💻</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ color: '#93c5fd', fontSize: 13, fontWeight: '700', marginBottom: 2 }}>Online Individual Class</Text>
              <Text style={{ color: '#60a5fa', fontSize: 12 }}>1 hour session · Link provided after payment</Text>
            </View>
          </View>
        </ScrollView>
        {/* Estimated Cost & Confirm */}
        <View style={{ paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.08)', paddingBottom: Platform.OS === 'ios' ? 20 : 8 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12, paddingHorizontal: 4 }}>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 14, fontWeight: '500' }}>Estimated Cost</Text>
            <Text style={{ color: '#0EA5E9', fontSize: 16, fontWeight: '800' }}>LKR {totalPrice.toLocaleString()}/hr</Text>
          </View>
          <TouchableOpacity onPress={handleBook} disabled={loading} activeOpacity={0.85}>
            <LinearGradient colors={['#0EA5E9', '#3B82F6']} style={[modalStyles.confirmBtn, { shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 }]}>
              {loading ? <ActivityIndicator color="#fff" /> : <Text style={modalStyles.bookBtnText}>Confirm Request</Text>}
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Subject Popup Overlay */}
        {subjectPopupVisible && (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 24, zIndex: 999 }]}>
            <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setSubjectPopupVisible(false)} />
            <View style={{ backgroundColor: '#0D0D0D', borderRadius: 24, padding: 24, maxHeight: '80%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 16 }}>
              <Text style={{ fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 24 }}>Select Subject</Text>
              <ScrollView showsVerticalScrollIndicator={false}>
                {subjectList.map((s, idx) => (
                  <TouchableOpacity key={idx} onPress={() => { setSubject(s); setSubjectPopupVisible(false); }} style={{ paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: idx < subjectList.length - 1 ? 1 : 0, borderBottomColor: 'rgba(255,255,255,0.04)' }}>
                    <Text style={{ color: '#fff', fontSize: 16, fontWeight: '500' }}>{s}</Text>
                    {(subject || subjectList[0]) === s && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#0EA5E9' }} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </View>
    </View>
  </Modal>);
}
const TutorCard = ({ item, index, onBook, onRate, institutes = [] }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 320, delay: index * 40, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 320, delay: index * 40, useNativeDriver: true }),
    ]).start();
  }, [item.id]);

  const handleChatRequest = async () => {
    try {
      setChatLoading(true);
      // 1. Check local sent requests via AsyncStorage
      const sentKeys = await AsyncStorage.getItem('sent_chat_requests');
      const sentList = sentKeys ? JSON.parse(sentKeys) : [];
      if (sentList.includes(item.id)) {
        Alert.alert('Info', 'You have already sent a chat request to this tutor.');
        router.push('/live-chat');
        return;
      }

      // 2. Check active conversation threads
      const threadsRes = await chatAPI.getThreads().catch(() => ({ threads: [] }));
      const threadExists = (threadsRes.threads || []).some(
        (t) => t.otherUser?.id === item.id || t.otherUser?.id === item._id || t.id === item.id
      );
      if (threadExists) {
        Alert.alert('Info', 'You already have an active conversation with this tutor.');
        router.push('/live-chat');
        return;
      }

      const res = await chatAPI.createRequest(item.id);
      if (res?.request) {
        // Record into AsyncStorage
        sentList.push(item.id);
        await AsyncStorage.setItem('sent_chat_requests', JSON.stringify(sentList));

        Alert.alert('✅ Success', 'Chat request sent successfully!');
        router.push('/live-chat');
      } else {
        Alert.alert('Info', 'Chat request is already sent or pending.');
        router.push('/live-chat');
      }
    } catch (err) {
      Alert.alert('Error', err.message || 'Failed to send chat request.');
    } finally {
      setChatLoading(false);
    }
  };

  const subjects = (item.subjects || []).map((s) => typeof s === 'object' ? s.subject : String(s)).filter(Boolean);
  const avgRating = item.avgRating || 0;
  const ratingCount = item.ratingCount || 0;
  const tooFewReviews = ratingCount > 0 && ratingCount < MIN_REVIEWS_FOR_CONFIDENT_RATING;
  const photoUrl = item.photoUrl;
  const displayName = getTutorDisplayName(item);
  return (<Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
    <View style={styles.cardInner}>
      <TouchableOpacity activeOpacity={0.85} onPress={() => router.push({ pathname: '/tutor-profile', params: { tutorId: item.id } })}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 }}>
          {/* Avatar */}
          {photoUrl ? (
            <Image source={{ uri: photoUrl }} style={[styles.avatar, { width: 56, height: 56, borderRadius: 28 }]} />
          ) : (
            <LinearGradient colors={['#6C63FF', '#3B82F6']} style={[styles.avatar, { width: 56, height: 56, borderRadius: 28 }]}>
              <Text style={styles.avatarChar}>{displayName.charAt(0).toUpperCase()}</Text>
            </LinearGradient>
          )}

          {/* Identity details */}
          <View style={{ flex: 1 }}>
            {/* Name + Rating */}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800', flex: 1 }} numberOfLines={1}>{displayName}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Text style={{ color: '#fbbf24', fontSize: 13 }}>★</Text>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '700' }}>
                  {avgRating > 0 ? avgRating.toFixed(1) : 'New'}
                </Text>
                {ratingCount > 0 && (
                  <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11 }}>
                    ({ratingCount})
                  </Text>
                )}
              </View>
            </View>

            {/* Subjects / Categories */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
              {subjects.length > 0 ? (
                <Text style={{ color: '#f1f5f9', fontSize: 13, fontWeight: '500' }} numberOfLines={1}>
                  {subjects.slice(0, 3).join(' • ')}
                </Text>
              ) : (
                <Text style={{ color: 'rgba(255,255,255,0.7)', fontSize: 12 }}>No specific subjects listed</Text>
              )}
            </View>

            {/* Location • Institute Name */}
            {(() => {
              let inst = item.institute || item.instituteName || (Array.isArray(item.institutes) && item.institutes[0]);
              if (!inst && item.instituteId && item.instituteId !== 'none') {
                const found = (institutes || []).find(i => i.id === item.instituteId);
                if (found) inst = found.name;
              }
              const instName = typeof inst === 'object' ? inst.name || inst.instituteName : inst;
              const parts = [
                item.location ? `📍 ${item.location}` : null,
                instName ? `🏫 ${instName}` : null,
              ].filter(Boolean);

              if (parts.length === 0) return null;
              return (
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  <Text style={{ color: '#e2e8f0', fontSize: 12, fontWeight: '500' }} numberOfLines={1}>
                    {parts.join(' • ')}
                  </Text>
                </View>
              );
            })()}
          </View>
        </View>

        {/* Price Row */}
        <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 6, marginTop: 4, marginBottom: 16 }}>
          <Text style={{ color: '#fff', fontSize: 22, fontWeight: '900' }}>LKR {item.hourlyRate || 0}</Text>
          <Text style={{ color: '#cbd5e1', fontSize: 13, fontWeight: '600' }}>/ hour</Text>
        </View>
      </TouchableOpacity>

      {/* Action Row */}
      <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
        <TouchableOpacity style={{ flex: 1, height: 48 }} onPress={onBook}>
          <LinearGradient colors={['#6C63FF', '#3B82F6']} style={[styles.bookBtnGrad, { height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700' }}>Book Session</Text>
          </LinearGradient>
        </TouchableOpacity>

        {item.contactPhone ? (
          <TouchableOpacity onPress={() => Linking.openURL(`tel:${item.contactPhone}`)} activeOpacity={0.7} style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(16,185,129,0.28)', borderWidth: 1.5, borderColor: '#10b981', justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ fontSize: 18 }}>📞</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' }} onPress={handleChatRequest} disabled={chatLoading} activeOpacity={0.85}>
          {chatLoading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ fontSize: 18 }}>💬</Text>}
        </TouchableOpacity>

        <TouchableOpacity style={{ width: 48, height: 48, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', justifyContent: 'center', alignItems: 'center' }} onPress={onRate} activeOpacity={0.85}>
          <Text style={{ fontSize: 18 }}>⭐</Text>
        </TouchableOpacity>
      </View>
    </View>
  </Animated.View>);
};
function InstituteTutorsScreen({ user }) {
  const [tutors, setTutors] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.get('/institutes/my-institute').catch(() => null);
      if (res && res.data && res.data.institute) {
        const tRes = await api.get(`/institutes/${res.data.institute.id}`).catch(() => null);
        if (tRes && tRes.data && tRes.data.tutors) {
          setTutors(tRes.data.tutors);
        }
      }
    } catch (err) {
      console.warn('Failed to load institute tutors', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#06040f' }}>
        <ActivityIndicator color="#10B981" size="large" />
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, marginTop: 12 }}>Loading tutors...</Text>
      </View>
    );
  }

  return (
    <PremiumBlurWrapper>
      <View style={{ flex: 1, backgroundColor: '#06040f', paddingTop: Platform.OS === 'ios' ? 60 : 44 }}>
        <View style={{ paddingHorizontal: 16, marginBottom: 16 }}>
          <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>👥 Tutors</Text>
          <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Manage your approved institute tutors</Text>
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
            <Text style={{ fontSize: 14, fontWeight: '700', color: '#fff' }}>👥 Institute Tutors ({tutors.length})</Text>
            {tutors.length === 0 ? (
              <View style={{ padding: 32, alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)', marginTop: 8 }}>
                <Text style={{ fontSize: 48, marginBottom: 8 }}>🎓</Text>
                <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>No Approved Tutors</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12, textAlign: 'center', marginTop: 4 }}>
                  Approved tutor requests will be listed here.
                </Text>
              </View>
            ) : (
              tutors.map((t) => (
                <View key={t.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)' }}>
                  <LinearGradient colors={['#10B981', '#059669']} style={{ width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ fontSize: 18, fontWeight: '800', color: '#fff' }}>{(t.fullName || t.name || 'T')[0].toUpperCase()}</Text>
                  </LinearGradient>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>{t.fullName || t.name}</Text>
                    <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 1 }}>{t.email}</Text>
                    {t.instituteTimetable && (
                      <Text style={{ color: '#10B981', fontSize: 11, fontWeight: '600', marginTop: 4 }}>
                        🕒 {t.instituteTimetable}
                      </Text>
                    )}
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

// ── MAIN EXPORT ──────────────────────────────────────
export default function SearchScreen() {
  const context = useContext(AuthContext);
  const role = String(context?.user?.role ?? '').trim().toLowerCase();
  if (role === 'institute_manager') {
    return <InstituteTutorsScreen user={context?.user} />;
  }

  var _a;
  const params = useLocalSearchParams();
  const bookingTutorId = params.bookingTutorId || params.tutorId || null;
  const [openedBookingTutorId, setOpenedBookingTutorId] = useState(null);
  const [tutors, setTutors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [selectedTutor, setSelectedTutor] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [filtersVisible, setFiltersVisible] = useState(false);
  // Filter States
  const [institutes, setInstitutes] = useState([]);
  const [category, setCategory] = useState('all');
  const [subject, setSubject] = useState('all');
  const [medium, setMedium] = useState('all');
  const [classType, setType] = useState('all');
  const [format, setFormat] = useState('all');
  const [minRating, setMinRating] = useState('all');
  // Subjects data
  const [subjectData, setSubjectData] = useState(null);
  const [categoriesList, setCategoriesList] = useState([]);
  const filterAnim = useRef(new Animated.Value(0)).current;
  const searchBarAnim = useRef(new Animated.Value(1)).current;
  const searchBarVisible = useRef(true);
  const lastOffsetY = useRef(0);
  const searchSeqRef = useRef(0);

  useEffect(() => {
    Animated.timing(filterAnim, {
      toValue: filtersVisible ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [filtersVisible]);

  useEffect(() => {
    let cancelled = false;
    const fetchMeta = async () => {
      try {
        const res = await api.get('/subjects');
        if (cancelled) return;
        const cats = Array.isArray(res.data?.categories) ? res.data.categories : [];
        setSubjectData(res.data || null);
        setCategoriesList([{ value: 'all', label: 'All Categories' }, ...cats]);
      }
      catch (e) {
        console.error('Failed to load subjects', e);
      }
    };
    const fetchInstitutes = async () => {
      try {
        const res = await api.get('/institutes');
        if (cancelled) return;
        setInstitutes(res.data?.institutes || []);
      }
      catch (e) {
        console.error('Failed to load institutes', e);
      }
    };
    fetchMeta();
    fetchInstitutes();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSearch = useCallback(async () => {
    const seq = ++searchSeqRef.current;
    setLoading(true);
    try {
      const p = (v) => v === 'all' ? '' : v;
      const res = await api.get('/tutors/search', {
        params: {
          category: p(category),
          subject: p(subject),
          medium: p(medium),
          classType: p(classType),
          classFormat: p(format),
        }
      });
      let found = (res.data?.tutors ?? []).map((t) => {
        const fullName = String(t?.fullName || t?.name || '').trim();
        return {
          ...t,
          fullName: fullName.length ? fullName : undefined,
          name: t?.name || t?.fullName,
          subjects: Array.isArray(t?.subjects) ? t.subjects : [],
        };
      });
      const mr = parseInt(minRating, 10);
      if (!isNaN(mr)) {
        found = found.filter((t) => (t.avgRating || 0) >= mr);
      }
      if (seq === searchSeqRef.current) {
        setTutors(found);
      }
    }
    catch (e) {
      console.error('Search failed', e);
      const msg =
        typeof e?.message === 'string' ? e.message : '';
      const isLikelyCanceled = msg.includes('canceled') || msg.includes('abort');
      if (seq === searchSeqRef.current && !isLikelyCanceled) {
        Alert.alert('Unable to load tutors', msg.trim() ? msg : 'Check your internet connection or try again in a moment.');
      }
      if (seq === searchSeqRef.current) {
        setTutors([]);
      }
    }
    finally {
      if (seq === searchSeqRef.current) {
        setLoading(false);
      }
    }
  }, [category, subject, medium, classType, format, minRating]);

  useFocusEffect(
    useCallback(() => {
      handleSearch();
      return undefined;
    }, [handleSearch])
  );

  useEffect(() => {
    if (!bookingTutorId || openedBookingTutorId === bookingTutorId || tutors.length === 0)
      return;
    const match = tutors.find((t) => {
      const id = String(t.id || t.userId || t.tutorId || '');
      return id === String(bookingTutorId);
    });
    if (match) {
      setSelectedTutor(match);
      setModalVisible(true);
      setOpenedBookingTutorId(bookingTutorId);
    }
  }, [bookingTutorId, tutors, openedBookingTutorId]);
  const handleClearFilters = () => {
    setCategory('all');
    setSubject('all');
    setMedium('all');
    setType('all');
    setFormat('all');
    setMinRating('all');
    setQuery('');
    handleSearch();
  };
  const availableSubjects = ['all'];
  if (subjectData && subjectData.subjectsByCategory) {
    if (category && category !== 'all') {
      const subs = subjectData.subjectsByCategory[category] || [];
      subs.forEach(s => { if (!availableSubjects.includes(s)) availableSubjects.push(s); });
    } else {
      Object.values(subjectData.subjectsByCategory).forEach(subs => {
        if (Array.isArray(subs)) {
          subs.forEach(s => { if (!availableSubjects.includes(s)) availableSubjects.push(s); });
        }
      });
    }
  }
  // ── RATING MODAL ──────────────────────────────────────
  const [ratingModal, setRatingModal] = useState(null);
  const [ratingStars, setRatingStars] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const handleSubmitRating = async () => {
    var _a, _b;
    if (!ratingModal || ratingStars < 1) {
      Alert.alert('Error', 'Please select rating');
      return;
    }
    setSubmittingRating(true);
    try {
      const tutorId = ratingModal?.id || ratingModal?.tutorId;
      if (!tutorId) throw new Error('Tutor ID missing');
      await api.post(`/tutors/${tutorId}/reviews`, {
        rating: ratingStars,
        comment: ratingComment
      });
      Alert.alert('Success', 'Review submitted! ⭐');
      setRatingModal(null);
      setRatingStars(0);
      setRatingComment('');
      handleSearch();
    }
    catch (err) {
      Alert.alert('Error', ((_b = (_a = err.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) || 'Failed to submit review');
    }
    finally {
      setSubmittingRating(false);
    }
  };
  // ── FILTER MODAL ──────────────────────────────────────
  const [selectorVisible, setSelectorVisible] = useState(false);
  const [selectorTitle, setSelectorTitle] = useState('');
  const [selectorOptions, setSelectorOptions] = useState([]);
  const [onSelect, setOnSelect] = useState(() => { });
  const openSelector = (title, options, setter) => {
    setSelectorTitle(title);
    setSelectorOptions(options);
    setOnSelect(() => (val) => {
      const v = typeof val === 'object' ? val.value : val;
      setter(v);
      setSelectorVisible(false);
    });
    setSelectorVisible(true);
  };
  const mediumsList = ['all', 'English', 'Sinhala', 'Tamil'];
  const typesList = ['all', 'Individual', 'Group', 'Both'];
  const formatsList = ['all', 'Online', 'Physical', 'Both'];
  const ratingsList = ['all', '4', '3', '2', '1'];
  const filtered = tutors.filter(t => {
    if (!query)
      return true;
    const q = query.toLowerCase();
    const name = t.fullName || t.name || '';
    const subList = (t.subjects || []).map(s => typeof s === 'object' ? s.subject : String(s));
    return name.toLowerCase().includes(q) || subList.some(s => s.toLowerCase().includes(q));
  });
  const FilterDropdown = ({ label, value, onOpen }) => (<View style={styles.filterCol}>
    <Text style={styles.filterLabel}>{label}</Text>
    <TouchableOpacity style={styles.filterDropdown} activeOpacity={0.7} onPress={onOpen}>
      <Text style={styles.filterValue} numberOfLines={1}>{value === 'all' ? 'All' : value}</Text>
      <Text style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>▼</Text>
    </TouchableOpacity>
  </View>);
  return (<View style={{ flex: 1, backgroundColor: '#06040f' }}>
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      <LinearGradient colors={['#06040f', '#0d0920', '#06040f']} style={StyleSheet.absoluteFill} />
      {/* blob removed */}
      {/* blob removed */}

      {/* ── CUSTOM HEADER ── */}
      <Animated.View style={[styles.header, {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 10,
        backgroundColor: '#06040f',
        opacity: searchBarAnim,
        transform: [
          {
            translateY: searchBarAnim.interpolate({
              inputRange: [0, 1],
              outputRange: [-180, 0],
            }),
          },
        ],
      }]}>

        <View style={{ paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 50 : 32, paddingBottom: 12 }}>
          <View style={styles.headerTitleRow}>
            <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backIcon}>←</Text>
            </TouchableOpacity>
            <View style={styles.titleWithSearch}>
              <Text style={styles.headerTitle}>Find a Tutor</Text>
            </View>
            <TouchableOpacity onPress={() => setFiltersVisible(!filtersVisible)} style={[styles.filtersToggle, filtersVisible && styles.filtersToggleActive]}>
              <Text style={[styles.filtersToggleText, filtersVisible && { color: '#fff' }]}>▿ Filters</Text>
            </TouchableOpacity>
          </View>

          {/* ── EXPANDABLE FILTER PANEL ── */}
          <Animated.View style={[styles.filterPanel, {
            maxHeight: filterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 520] }),
            opacity: filterAnim,
            marginTop: filterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 20] }),
            paddingVertical: filterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 24] }),
            borderWidth: filterAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
          }]}>

            <View style={{ paddingHorizontal: 16 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <Text style={styles.panelTitle}>Filter Options</Text>
                <TouchableOpacity onPress={handleClearFilters}><Text style={{ color: '#ef4444', fontSize: 13, fontWeight: '800', paddingVertical: 4 }}>Clear all</Text></TouchableOpacity>
              </View>

              <View style={styles.filterGrid}>
                <View style={styles.filterRow}>
                  <FilterDropdown label="CATEGORY" value={((_a = categoriesList.find(c => c.value === category)) === null || _a === void 0 ? void 0 : _a.label) || category} onOpen={() => openSelector('Select Category', categoriesList, setCategory)} />
                  <FilterDropdown label="SUBJECT" value={subject} onOpen={() => openSelector('Select Subject', availableSubjects, setSubject)} />
                </View>
                <View style={styles.filterRow}>
                  <FilterDropdown label="MEDIUM" value={medium} onOpen={() => openSelector('Select Medium', mediumsList, setMedium)} />
                  <FilterDropdown label="CLASS TYPE" value={classType} onOpen={() => openSelector('Select Type', typesList, setType)} />
                </View>
                <View style={styles.filterRow}>
                  <FilterDropdown label="FORMAT" value={format} onOpen={() => openSelector('Select Format', formatsList, setFormat)} />
                  <FilterDropdown label="MIN RATING" value={minRating === 'all' ? 'Any' : `${minRating}+ Stars`} onOpen={() => openSelector('Min Rating', ratingsList, setMinRating)} />
                </View>
              </View>

              <TouchableOpacity style={[styles.searchTutorsBtn, { marginBottom: 12 }]} activeOpacity={0.8} onPress={() => { setFiltersVisible(false); handleSearch(); }}>
                <LinearGradient colors={['#6C63FF', '#3B82F6']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.searchBtnInner}>
                  <Text style={styles.searchBtnText}>Search Tutors</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Animated.View>

          {/* ── SEARCH BAR ── */}
          {!filtersVisible && (<Animated.View style={[styles.searchWrap, {
            opacity: searchBarAnim,
            height: searchBarAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 44] }),
            overflow: 'hidden',
            marginTop: searchBarAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 4] }),
            borderWidth: searchBarAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] }),
          }]}>
            <Text style={{ marginRight: 6, fontSize: 14, lineHeight: 18 }}>🔍</Text>
            <TextInput style={styles.searchInput} placeholder="Search by name or subject..." placeholderTextColor="rgba(255,255,255,0.40)" value={query} onChangeText={setQuery} />
          </Animated.View>)}
        </View>
      </Animated.View>

      {/* ── SELECTOR MODAL ── */}
      <Modal visible={selectorVisible} transparent animationType="slide">
        <View style={styles.selectorOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setSelectorVisible(false)} />
          <View style={styles.selectorSheet}>

            <View style={{ paddingHorizontal: 24, paddingBottom: 24, paddingTop: 10, flexShrink: 1 }}>
              <View style={styles.selectorHandle} />
              <Text style={styles.selectorTitle}>{selectorTitle}</Text>
              <FlatList data={selectorOptions} keyExtractor={(item, index) => {
                if (typeof item === 'object' && item !== null)
                  return item.value || String(index);
                return String(item) + index;
              }} renderItem={({ item }) => {
                const label = typeof item === 'object' && item !== null ? item.label : (String(item) === 'all' ? 'All' : String(item));
                return (<TouchableOpacity style={styles.selectorItem} onPress={() => onSelect(item)}>
                  <Text style={styles.selectorItemText}>{label}</Text>
                  <View style={styles.selectorCircle} />
                </TouchableOpacity>);
              }} ItemSeparatorComponent={() => <View style={styles.selectorDivider} />} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }} />
            </View>
          </View>
        </View>
      </Modal>

      {/* ── RESULTS ── */}
      {loading ? (<View style={styles.loader}>
        <ActivityIndicator size="large" color="#6C63FF" />
        <Text style={{ color: 'rgba(255,255,255,0.4)', marginTop: 12, fontSize: 12, fontWeight: '600' }}>SEARCHING TUTORHUB...</Text>
      </View>) : (<FlatList data={filtered} keyExtractor={item => item.id} contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} onScroll={(event) => {
        const currentOffsetY = event.nativeEvent.contentOffset.y;
        const diff = currentOffsetY - lastOffsetY.current;
        if (diff > 5 && currentOffsetY > 30 && searchBarVisible.current) {
          searchBarVisible.current = false;
          Animated.timing(searchBarAnim, { toValue: 0, duration: 220, useNativeDriver: false }).start();
        } else if ((diff < -50 || currentOffsetY <= 15) && !searchBarVisible.current) {
          searchBarVisible.current = true;
          Animated.timing(searchBarAnim, { toValue: 1, duration: 220, useNativeDriver: false }).start();
        }
        lastOffsetY.current = currentOffsetY;
      }} scrollEventThrottle={16} ListHeaderComponent={<View style={{ marginBottom: 16 }}>
        <Text style={styles.resultsCount}>
          {filtered.length} {pluralize(filtered.length, 'TUTOR').toUpperCase()} FOUND
        </Text>
        {filtered.length > 0 && filtered.length < 3 ? (<Text style={styles.lowResultsHint}>Try broadening your search or clearing filters to see more tutors.</Text>) : null}
        <View style={styles.divider} />
      </View>} ListEmptyComponent={<View style={styles.emptyState}>
        <Text style={styles.emptyIcon}>🎓</Text>
        <Text style={styles.emptyTitle}>No Matching Tutors</Text>
        <Text style={styles.emptyText}>
          {tutors.length === 0
            ? 'There are currently no tutors matching these filters.'
            : 'Try adjusting your filters to find more instructors.'}
        </Text>
        <TouchableOpacity onPress={handleClearFilters} style={{ marginTop: 20 }}>
          <Text style={{ color: '#6C63FF', fontWeight: '700' }}>Clear filters and try again</Text>
        </TouchableOpacity>
      </View>} renderItem={({ item, index }) => (<TutorCard item={item} index={index} onBook={() => { setSelectedTutor(item); setModalVisible(true); }} onRate={() => setRatingModal(item)} institutes={institutes} />)} />)}

      {/* ── RATING MODAL ── */}
      <Modal visible={!!ratingModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 24 }}>
          <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setRatingModal(null)} />
          <View style={{ backgroundColor: '#111218', borderRadius: 28, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', elevation: 24, shadowColor: '#3B82F6', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.15, shadowRadius: 24, padding: 24 }}>
            {/* ── TUTOR IDENTITY HEADER (NO BLUE PROGRESS BAR) ── */}
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 20, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)', paddingBottom: 16 }}>
              <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: '#3B82F6', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>
                  {(ratingModal?.fullName || ratingModal?.name || 'T').charAt(0).toUpperCase()}
                </Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '800', letterSpacing: 1 }}>LEAVE A REVIEW FOR</Text>
                <Text style={{ color: '#fff', fontSize: 18, fontWeight: '800' }}>{ratingModal?.fullName || ratingModal?.name}</Text>
              </View>
            </View>

            {/* ── STAR RATING SELECTOR (OUTLINE STYLE FOR CLEAR INTERACTION) ── */}
            <View style={{ alignItems: 'center', marginBottom: 20 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 14 }}>
                {[1, 2, 3, 4, 5].map(n => (
                  <TouchableOpacity key={n} onPress={() => setRatingStars(n)} activeOpacity={0.7} style={{ padding: 4 }}>
                    <Text style={{ fontSize: 44, color: n <= ratingStars ? '#FBBF24' : 'rgba(255,255,255,0.2)' }}>
                      {n <= ratingStars ? '★' : '☆'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* ── EXPERIENCE TEXTAREA ── */}
            <TextInput 
              placeholder="How was your experience with this tutor?" 
              placeholderTextColor="rgba(255,255,255,0.4)" 
              style={{ height: 100, textAlignVertical: 'top', paddingTop: 14, paddingHorizontal: 16, backgroundColor: 'rgba(59,130,246,0.06)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.25)', color: '#fff', width: '100%', borderRadius: 16, fontSize: 14, marginBottom: 24 }} 
              multiline 
              value={ratingComment} 
              onChangeText={setRatingComment} 
            />

            {/* ── FOOTER ACTIONS (EQUAL WIDTH BUTTONS) ── */}
            <View style={{ flexDirection: 'row', gap: 12, width: '100%' }}>
              <TouchableOpacity onPress={() => setRatingModal(null)} activeOpacity={0.8} style={{ flex: 1, paddingVertical: 14, borderRadius: 16, backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 1, borderColor: 'rgba(59,130,246,0.3)', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 14 }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleSubmitRating} disabled={submittingRating || ratingStars === 0} activeOpacity={0.8} style={{ flex: 1, borderRadius: 16, overflow: 'hidden' }}>
                <LinearGradient colors={['#10b981', '#059669']} style={{ flex: 1, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' }}>
                  {submittingRating ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontSize: 14, fontWeight: '800' }}>Submit</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <BookModal visible={modalVisible} tutor={selectedTutor} onClose={() => setModalVisible(false)} onBooked={() => { }} />
    </View>
  </View>);
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: 'transparent' },
  blobTop: { position: 'absolute', top: -100, right: -100, width: 300, height: 300, borderRadius: 150, backgroundColor: 'rgba(124,111,255,0.06)' },
  blobBottom: { position: 'absolute', bottom: -50, left: -100, width: 250, height: 250, borderRadius: 125, backgroundColor: 'rgba(59,130,246,0.04)' },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 20,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.05)'
  },
  headerTitleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.08)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.10)', alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: '#fff', fontSize: 22, fontWeight: '300' },
  titleWithSearch: { flex: 1, marginLeft: 14 },
  headerTitle: { fontSize: 24, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  filtersToggle: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: 'rgba(99,102,241,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(99,102,241,0.30)',
    minWidth: 90,
    alignItems: 'center',
  },
  filtersToggleActive: { backgroundColor: 'rgba(99,102,241,0.35)', borderColor: 'rgba(99,102,241,0.55)' },
  filtersToggleText: { color: 'rgba(255,255,255,0.85)', fontSize: 13, fontWeight: '800' },
  filterPanel: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 24,
    borderColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 16,
    overflow: 'hidden'
  },
  panelTitle: { color: '#fff', fontSize: 18, fontWeight: '800' },
  filterGrid: { gap: 16, marginBottom: 24 },
  filterRow: { flexDirection: 'row', gap: 16 },
  filterCol: { flex: 1 },
  filterLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '900', marginBottom: 6, letterSpacing: 1 },
  filterDropdown: {
    height: 52,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16
  },
  filterValue: { color: '#fff', fontSize: 13, fontWeight: '600' },
  searchTutorsBtn: { width: '100%', borderRadius: 16, overflow: 'hidden' },
  searchBtnInner: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  searchBtnText: { color: '#fff', fontSize: 16, fontWeight: '800' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44
  },
  searchInput: { flex: 1, color: '#fff', fontSize: 14, fontWeight: '500' },
  list: { paddingHorizontal: 20, paddingBottom: 140, paddingTop: Platform.OS === 'ios' ? 260 : 240 },
  resultsCount: { color: '#E2E8F0', fontSize: 14, fontWeight: '800', letterSpacing: 1.2, marginBottom: 12 },
  lowResultsHint: { color: 'rgba(255,255,255,0.45)', fontSize: 12, fontWeight: '600', marginTop: -2, marginBottom: 10 },
  divider: { height: 1, backgroundColor: 'rgba(255,255,255,0.05)', width: '100%' },
  card: {
    borderRadius: 24,
    marginBottom: 16,
    overflow: 'hidden',
    backgroundColor: 'transparent',
  },
  cardInner: {
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.06)'
  },
  cardTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  cardLeft: { position: 'relative', marginRight: 16 },
  avatar: { width: 56, height: 56, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  avatarChar: { color: '#fff', fontSize: 24, fontWeight: '900' },
  onlineDot: { position: 'absolute', bottom: -2, right: -2, width: 16, height: 16, borderRadius: 8, backgroundColor: '#22c55e', borderWidth: 3, borderColor: '#000' },
  cardInfo: { flex: 1 },
  tutorName: { fontSize: 18, fontWeight: '800', color: '#fff', marginBottom: 4 },
  tooFewReviews: { color: 'rgba(255,255,255,0.32)', fontSize: 10, fontWeight: '700', marginLeft: 6 },
  subjects: { fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: '500' },
  rateBadge: { backgroundColor: 'rgba(99,102,241,0.08)', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 6 },
  rateText: { color: '#818CF8', fontSize: 11, fontWeight: '800' },
  bio: { fontSize: 14, color: 'rgba(255,255,255,0.45)', lineHeight: 22, marginBottom: 20 },
  bookBtnGrad: { height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  bookBtnText: { color: '#fff', fontSize: 14, fontWeight: '800' },
  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: 80 },
  emptyIcon: { fontSize: 60, marginBottom: 20 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 10 },
  emptyText: { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', lineHeight: 22, paddingHorizontal: 40 },
  loader: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  // Selector Modal Styles
  selectorOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  selectorSheet: { backgroundColor: '#0D0D0D', borderRadius: 24, maxHeight: '80%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 16, overflow: 'hidden' },
  selectorHandle: { display: 'none' },
  selectorTitle: { fontSize: 20, fontWeight: '800', color: '#fff', textAlign: 'center', marginBottom: 24 },
  selectorItem: { paddingVertical: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  selectorItemText: { color: '#fff', fontSize: 16, fontWeight: '500' },
  selectorCircle: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: 'rgba(255,255,255,0.05)' },
  selectorDivider: { height: 1, backgroundColor: 'rgba(255,255,255,0.04)' },
  secondaryIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryIconBtnActive: {
    backgroundColor: 'rgba(251,191,36,0.16)',
    borderColor: 'rgba(251,191,36,0.40)',
  },
  secondaryIcon: { fontSize: 18, color: 'rgba(255,255,255,0.92)' },
  secondaryIconActive: { color: '#FDE68A' },
  subjectTag: {
    backgroundColor: 'rgba(124,111,255,0.16)',
    borderWidth: 1,
    borderColor: 'rgba(124,111,255,0.32)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
  },
  subjectTagText: { color: '#E9E7FF', fontSize: 10, fontWeight: '800' },
});
const modalStyles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
  sheet: {
    backgroundColor: '#0A0A0A',
    borderRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(124,111,255,0.2)',
    maxHeight: '90%',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 16
  },
  handle: { display: 'none' },
  title: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 4, letterSpacing: -0.4 },
  tutor: { fontSize: 15, color: '#8A84FF', textAlign: 'center', fontWeight: '800', marginBottom: 8 },
  rateBadge: {
    backgroundColor: 'rgba(99,102,241,0.14)',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 6,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: 'rgba(129,140,248,0.32)',
  },
  rateText: { color: '#818CF8', fontWeight: '800', fontSize: 12 },
  label: { color: 'rgba(255,255,255,0.72)', fontSize: 11, fontWeight: '900', marginBottom: 6, letterSpacing: 0.8 },
  subjectDropdown: {
    height: 44,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
  },
  calendarWrap: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 8,
    flex: 1,
  },
  durationRow: { flexDirection: 'row', gap: 6, marginBottom: 4 },
  durationChip: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  durationChipActive: {
    backgroundColor: 'rgba(124,111,255,0.22)',
    borderColor: BOOKING_ACCENT,
  },
  durationChipText: { color: 'rgba(255,255,255,0.72)', fontSize: 12, fontWeight: '700' },
  durationChipTextActive: { color: '#D6D1FF' },
  confirmBtn: { height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  bookBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
});
