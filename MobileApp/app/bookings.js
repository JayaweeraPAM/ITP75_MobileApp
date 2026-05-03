import React, { useEffect, useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Animated,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import DateTimePicker from '@react-native-community/datetimepicker';
import api from '../src/services/api';
import { AuthContext } from '../src/contexts/AuthContext';
import { Colors, BorderRadius, Spacing } from '../constants/theme';
import { PremiumBlurWrapper } from '../src/components/PremiumBlurWrapper';

const STATUS_COLORS = {
  PENDING: '#f59e0b',
  ACCEPTED: '#22c55e',
  REJECTED: '#ef4444',
  COMPLETED: '#7C6FFF',
};

// ── CARD PAYMENT MODAL ────────────────────────────────────
function PaymentModal({ visible, booking, onClose, onPaid }) {
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [loading, setLoading] = useState(false);

  if (!booking) return null;

  const formatCard = (v) => v.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim();
  const formatExpiry = (v) => {
    const d = v.replace(/\D/g, '').slice(0, 4);
    return d.length >= 3 ? d.slice(0, 2) + '/' + d.slice(2) : d;
  };

  const handlePay = async () => {
    if (!cardName.trim()) {
      Alert.alert('Required', 'Please enter cardholder name.');
      return;
    }
    if (cardNumber.replace(/\s/g, '').length < 16) {
      Alert.alert('Invalid', 'Please enter a valid 16-digit card number.');
      return;
    }
    if (expiry.length < 5) {
      Alert.alert('Invalid', 'Please enter a valid expiry (MM/YY).');
      return;
    }
    if (cvv.length < 3) {
      Alert.alert('Invalid', 'Please enter a 3 or 4 digit CVV.');
      return;
    }
    try {
      setLoading(true);
      await api.post(`/bookings/${booking.id}/pay`, {});
      onPaid();
      onClose();
      Alert.alert('✅ Payment Successful!', `LKR ${booking.price.toLocaleString()} charged. Your session is confirmed!`);
    } catch (e) {
      Alert.alert('Payment Failed', e?.response?.data?.error || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const maskedCardDisplay = cardNumber || '•••• •••• •••• ••••';

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={pm.overlay} onPress={onClose}>
        <View style={{ width: '100%', paddingHorizontal: 4 }}>
          <Pressable style={[pm.sheet, { minHeight: 760, paddingBottom: Platform.OS === 'ios' ? 60 : 50 }]} onPress={(e) => e.stopPropagation()}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={pm.handle} />
            <Text style={pm.title}>💳 Secure Payment</Text>
            <Text style={pm.amountText}>LKR {booking.price.toLocaleString()}</Text>
            <Text style={pm.subText}>{booking.subject}</Text>

            <View style={{ flex: 1 }}>
              {/* Card preview */}
              <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={pm.cardPreview}>
                <Text style={pm.cardChip}>⬛⬛</Text>
                <Text style={pm.cardNumDisplay}>{maskedCardDisplay}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 }}>
                  <Text style={pm.cardInfoText}>{cardName.toUpperCase() || 'CARDHOLDER NAME'}</Text>
                  <Text style={pm.cardInfoText}>{expiry || 'MM/YY'}</Text>
                </View>
              </LinearGradient>

              <Text style={pm.label}>Cardholder Name</Text>
              <TextInput
                style={pm.input}
                value={cardName}
                onChangeText={setCardName}
                placeholder="Name on card"
                placeholderTextColor="rgba(140,140,190,0.4)"
                autoCapitalize="words"
              />

              <Text style={pm.label}>Card Number</Text>
              <TextInput
                style={pm.input}
                value={cardNumber}
                onChangeText={(v) => setCardNumber(formatCard(v))}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor="rgba(140,140,190,0.4)"
                keyboardType="numeric"
                maxLength={19}
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={pm.label}>Expiry</Text>
                  <TextInput
                    style={pm.input}
                    value={expiry}
                    onChangeText={(v) => setExpiry(formatExpiry(v))}
                    placeholder="MM/YY"
                    placeholderTextColor="rgba(140,140,190,0.4)"
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={pm.label}>CVV</Text>
                  <TextInput
                    style={pm.input}
                    value={cvv}
                    onChangeText={(v) => setCvv(v.replace(/\D/g, '').slice(0, 4))}
                    placeholder="•••"
                    placeholderTextColor="rgba(140,140,190,0.4)"
                    keyboardType="numeric"
                    secureTextEntry
                    maxLength={4}
                  />
                </View>
              </View>

              <View style={pm.secureNote}>
                <Text style={pm.secureNoteText}>🔒 256-bit encrypted · Secure payment</Text>
              </View>

              <TouchableOpacity
                onPress={handlePay}
                disabled={loading}
                activeOpacity={0.85}
                style={{ marginTop: 8, marginBottom: 8 }}
              >
                <LinearGradient colors={loading ? ['#444', '#333'] : ['#22c55e', '#16a34a']} style={pm.payBtn}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={pm.payBtnText}>Pay LKR {booking.price.toLocaleString()}</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

// ── EDIT BOOKING MODAL ────────────────────────────────────
function EditBookingModal({ visible, booking, onClose, onUpdated }) {
  const [date, setDate] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [mode, setMode] = useState('date');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (booking?.dateTime) setDate(new Date(booking.dateTime));
  }, [booking]);

  if (!booking) return null;

  const handleUpdate = async () => {
    try {
      setLoading(true);
      await api.put(`/bookings/${booking.id}`, { dateTime: date.toISOString() });
      onUpdated();
      onClose();
      Alert.alert('✅ Updated', 'Your booking request has been updated.');
    } catch (e) {
      Alert.alert('Update Failed', e?.response?.data?.error || 'Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const onChange = (event, selectedDate) => {
    setShowPicker(Platform.OS === 'ios');
    if (selectedDate) setDate(selectedDate);
  };

  const openPicker = (m) => {
    setMode(m);
    setShowPicker(true);
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable style={pm.overlay} onPress={onClose}>
        <View style={{ width: '100%', paddingHorizontal: 10 }}>
          <Pressable style={[pm.sheet, { minHeight: 380, paddingBottom: Platform.OS === 'ios' ? 48 : 40 }]} onPress={(e) => e.stopPropagation()}>
            <BlurView intensity={90} tint="dark" style={StyleSheet.absoluteFill} />
            <View style={pm.handle} />
            <Text style={pm.title}>✏️ Edit Request</Text>
            <Text style={pm.subText}>Update date and time for {booking.subject}</Text>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
              <Text style={{ color: '#EAEAEA', fontSize: 13, fontWeight: '700', marginBottom: 8 }}>Selected Date & Time</Text>
              <TouchableOpacity onPress={() => openPicker('date')} activeOpacity={0.8} style={em.pickerBtn}>
                <Text style={em.pickerBtnText}>{date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</Text>
                <Text>📅</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => openPicker('time')} activeOpacity={0.8} style={em.pickerBtn}>
                <Text style={em.pickerBtnText}>{date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                <Text>🕒</Text>
              </TouchableOpacity>

              {showPicker && (
                <DateTimePicker
                  value={date}
                  mode={mode}
                  is24Hour={false}
                  display="default"
                  onChange={onChange}
                  themeVariant="dark"
                  minimumDate={new Date()}
                />
              )}

              <TouchableOpacity
                onPress={handleUpdate}
                disabled={loading}
                activeOpacity={0.85}
                style={{ marginTop: 24, marginBottom: 12 }}
              >
                <LinearGradient colors={loading ? ['#444', '#333'] : ['#7C6FFF', '#5B50E8']} style={pm.payBtn}>
                  {loading ? <ActivityIndicator color="#fff" /> : <Text style={pm.payBtnText}>Update Request</Text>}
                </LinearGradient>
              </TouchableOpacity>
            </ScrollView>
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const em = StyleSheet.create({
  pickerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255,255,255,0.08)',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.15)',
    marginBottom: 12,
  },
  pickerBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' }
});

// ── BOOKING CARD ──────────────────────────────────────────
function BookingCard({ item, role, onAction, index }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const [payModal, setPayModal] = useState(false);
  const [editModal, setEditModal] = useState(false);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 300, delay: index * 60, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, delay: index * 60, useNativeDriver: true }),
    ]).start();
  }, []);

  const statusColor = STATUS_COLORS[item.status] || '#888';
  const displayName = role === 'tutor' ? item.studentName : item.tutorName;

  const handleJoin = () => {
    if (!item.meetingLink) {
      Alert.alert('No Link Yet', 'Meeting link not available. Contact your tutor.');
      return;
    }
    Linking.openURL(item.meetingLink).catch(() => Alert.alert('Error', 'Could not open meeting link.'));
  };

  return (
    <Animated.View style={[styles.card, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
      <View style={styles.cardHeader}>
        <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={styles.cardAvatar}>
          <Text style={styles.cardAvatarChar}>{(displayName || 'T').charAt(0).toUpperCase()}</Text>
        </LinearGradient>
        <View style={styles.cardHeaderText}>
          <Text style={styles.cardName}>{displayName || 'Unknown'}</Text>
          <Text style={styles.cardSubject}>{item.subject}</Text>
        </View>
        <View style={[styles.statusBadge, { borderColor: statusColor, backgroundColor: statusColor + '20' }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.cardDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>📅</Text>
          <Text style={styles.detailText}>
            {new Date(item.dateTime).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>🕐</Text>
          <Text style={styles.detailText}>
            {new Date(item.dateTime).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailIcon}>💻</Text>
          <Text style={styles.detailText}>{item.classFormat || 'Online'}</Text>
        </View>
        {item.price > 0 && (
          <View style={styles.detailRow}>
            <Text style={styles.detailIcon}>💰</Text>
            <Text style={styles.detailText}>LKR {item.price.toLocaleString()}</Text>
          </View>
        )}
      </View>

      {role === 'student' && item.status === 'PENDING' && (
        <TouchableOpacity onPress={() => setEditModal(true)} style={[styles.actionBtn, { marginTop: 12 }]} activeOpacity={0.85}>
          <LinearGradient colors={['rgba(255,255,255,0.05)', 'rgba(255,255,255,0.1)']} style={[styles.actionBtnGrad, { borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)' }]}>
            <Text style={[styles.actionBtnText, { color: '#fff' }]}>✏️ Edit Date & Time</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}

      {role === 'student' && item.status === 'ACCEPTED' && item.paymentStatus !== 'PAID' && (
        <TouchableOpacity onPress={() => setPayModal(true)} style={styles.actionBtn} activeOpacity={0.85}>
          <LinearGradient colors={['#22c55e', '#16a34a']} style={styles.actionBtnGrad}>
            <Text style={styles.actionBtnText}>💳 Pay Now — LKR {item.price.toLocaleString()}</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
      {role === 'student' && item.status === 'ACCEPTED' && item.paymentStatus === 'PAID' && (
        <TouchableOpacity onPress={handleJoin} style={styles.actionBtn} activeOpacity={0.85}>
          <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={styles.actionBtnGrad}>
            <Text style={styles.actionBtnText}>🎥 Join Online Class</Text>
          </LinearGradient>
        </TouchableOpacity>
      )}
      {item.paymentStatus === 'PAID' && (
        <View style={styles.paidBadge}>
          <Text style={styles.paidText}>✅ Payment Confirmed</Text>
        </View>
      )}

      <PaymentModal visible={payModal} booking={item} onClose={() => setPayModal(false)} onPaid={onAction} />
      <EditBookingModal visible={editModal} booking={item} onClose={() => setEditModal(false)} onUpdated={onAction} />
    </Animated.View>
  );
}

// ── MAIN SCREEN ──────────────────────────────────────────
export default function BookingsScreen() {
  const context = useContext(AuthContext);
  const role = context?.user?.role || 'student';
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchBookings = async () => {
    try {
      const endpoint = role === 'tutor' ? '/bookings/tutor' : '/bookings/student';
      const res = await api.get(endpoint);
      setBookings(res.data.bookings || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);
  const onRefresh = () => {
    setRefreshing(true);
    fetchBookings();
  };

  return (
    <PremiumBlurWrapper>
      <LinearGradient colors={['#06040f', '#0d0920', '#06040f']} style={styles.gradient}>
        <StatusBar style="light" backgroundColor="#06040f" />
        <View style={styles.blobTop} />
        <View style={styles.pageHeader}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
            <Text style={styles.backIcon}>‹</Text>
          </TouchableOpacity>
          <Text style={styles.pageTitle}>My Bookings</Text>
          <View style={{ width: 40 }} />
        </View>

        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : (
          <FlatList
            data={bookings}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyTitle}>No Bookings Yet</Text>
                <Text style={styles.emptyText}>
                  {role === 'tutor'
                    ? 'No tutoring sessions or requests found.'
                    : 'Find a tutor and book your first session'}
                </Text>
                {role === 'student' && (
                  <TouchableOpacity onPress={() => router.push('/(tabs)/search')} style={styles.emptyBtn} activeOpacity={0.85}>
                    <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={styles.emptyBtnGrad}>
                      <Text style={styles.emptyBtnText}>Browse Tutors</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}
              </View>
            }
            renderItem={({ item, index }) => <BookingCard item={item} role={role} onAction={fetchBookings} index={index} />}
          />
        )}
      </LinearGradient>
    </PremiumBlurWrapper>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  blobTop: { position: 'absolute', top: -60, right: -80, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(100,60,220,0.1)' },
  pageHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingTop: 56, paddingBottom: Spacing.md },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
  backIcon: { color: Colors.textPrimary, fontSize: 28, fontWeight: '300', lineHeight: 32 },
  pageTitle: { fontSize: 18, fontWeight: '700', color: Colors.textPrimary },
  loader: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  list: { padding: Spacing.md, paddingBottom: 40 },
  card: { backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, borderRadius: BorderRadius.lg, marginBottom: Spacing.md, overflow: 'hidden' },
  cardHeader: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md, borderBottomWidth: 1, borderBottomColor: Colors.glassBorder },
  cardAvatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  cardAvatarChar: { color: '#fff', fontSize: 16, fontWeight: '700' },
  cardHeaderText: { flex: 1 },
  cardName: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  cardSubject: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  statusBadge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5 },
  cardDetails: { padding: Spacing.md, gap: 8 },
  detailRow: { flexDirection: 'row', alignItems: 'center' },
  detailIcon: { fontSize: 14, width: 24 },
  detailText: { fontSize: 13, color: Colors.textSecondary, flex: 1 },
  actionBtn: { margin: Spacing.md, marginTop: 0 },
  actionBtnGrad: { borderRadius: BorderRadius.md, paddingVertical: 13, alignItems: 'center' },
  actionBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  paidBadge: { margin: Spacing.md, marginTop: 0, backgroundColor: 'rgba(34,197,94,0.08)', borderRadius: BorderRadius.md, padding: 10, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)' },
  paidText: { color: '#22c55e', fontWeight: '600', fontSize: 13 },
  emptyState: { alignItems: 'center', paddingTop: 60, paddingHorizontal: Spacing.xl },
  emptyIcon: { fontSize: 52, marginBottom: 16 },
  emptyTitle: { fontSize: 20, fontWeight: '700', color: Colors.textPrimary, marginBottom: 8 },
  emptyText: { color: Colors.textSecondary, fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  emptyBtn: { width: '100%' },
  emptyBtnGrad: { borderRadius: BorderRadius.md, paddingVertical: 14, alignItems: 'center' },
  emptyBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});

const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: '#0f0a1e', borderRadius: 24, padding: Spacing.xl, paddingBottom: Spacing.xl, borderWidth: 1, borderColor: 'rgba(124,111,255,0.15)', maxHeight: '90%', elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 16, overflow: 'hidden' },
  handle: { display: 'none' },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 4 },
  amountText: { fontSize: 28, fontWeight: '800', color: '#22c55e', textAlign: 'center', marginBottom: 2 },
  subText: { fontSize: 13, color: Colors.textMuted, textAlign: 'center', marginBottom: Spacing.lg },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 20 },
  sheet: {
    backgroundColor: 'rgba(11,12,18,0.98)',
    borderRadius: 32,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 14,
    borderWidth: 1,
    borderColor: 'rgba(124,111,255,0.18)',
    maxHeight: '100%',
    overflow: 'hidden',
    elevation: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.35,
    shadowRadius: 18,
  },
  handle: { width: 44, height: 4, borderRadius: 999, backgroundColor: 'rgba(255,255,255,0.18)', alignSelf: 'center', marginBottom: 18 },
  title: { fontSize: 22, fontWeight: '900', color: '#fff', textAlign: 'center', marginBottom: 4, letterSpacing: -0.4 },
  amountText: { color: '#38bdf8', fontSize: 20, fontWeight: '900', textAlign: 'center', marginBottom: 4 },
  subText: { color: 'rgba(255,255,255,0.68)', textAlign: 'center', marginBottom: 18, fontSize: 13 },
  cardPreview: { borderRadius: 18, padding: 22, marginBottom: Spacing.lg, shadowColor: '#7C6FFF', shadowOpacity: 0.5, shadowRadius: 20, shadowOffset: { width: 0, height: 8 }, elevation: 12 },
  cardChip: { color: 'rgba(255,255,255,0.7)', fontSize: 22, marginBottom: 22 },
  cardNumDisplay: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: 2 },
  cardInfoText: { color: 'rgba(255,255,255,0.8)', fontSize: 12, fontWeight: '600', letterSpacing: 0.5 },
  label: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6 },
  input: {
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
    fontSize: 15,
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  secureNote: { backgroundColor: 'rgba(34,197,94,0.06)', borderRadius: BorderRadius.md, padding: 10, borderWidth: 1, borderColor: 'rgba(34,197,94,0.15)', alignItems: 'center', marginBottom: Spacing.md },
  secureNoteText: { color: '#86efac', fontSize: 12, fontWeight: '600' },
  payBtn: { borderRadius: BorderRadius.md, paddingVertical: 16, alignItems: 'center' },
  payBtnText: { color: '#fff', fontWeight: '800', fontSize: 17 },
});

