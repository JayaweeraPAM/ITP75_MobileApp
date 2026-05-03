import React, { useContext, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Animated,
  TouchableOpacity,
  Image,
  RefreshControl,
  StatusBar,
  Platform,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { AuthContext } from '../../src/contexts/AuthContext';
import { Colors, BorderRadius, Spacing } from '../../constants/theme';
import api, { bookingAPI, chatAPI, subscriptionAPI, tutorAPI, usersAPI, instituteAPI } from '../../src/services/api';
import { PremiumBlurWrapper } from '../../src/components/PremiumBlurWrapper';

// ── STAT CARD ─────────────────────────────────────────
function StatCard({ icon, label, value, color, glow }) {
  return (
    <View style={[sc.card, { borderColor: glow ? `${glow}30` : Colors.glassBorder }]}>
      <LinearGradient
        colors={glow ? [`${glow}20`, 'transparent'] : ['rgba(255,255,255,0.03)', 'transparent']}
        style={sc.cardGrad}
      >
        <View style={[sc.iconBox, { backgroundColor: `${color}18` }]}>
          <Text style={{ fontSize: 22 }}>{icon}</Text>
        </View>
        <Text style={[sc.value, { color }]}>{value}</Text>
        <Text style={sc.label}>{label}</Text>
      </LinearGradient>
    </View>
  );
}
const sc = StyleSheet.create({
  card: { flex: 1, minWidth: '44%', borderRadius: 20, borderWidth: 1, overflow: 'hidden' },
  cardGrad: { padding: 16, alignItems: 'center', gap: 6 },
  iconBox: { width: 50, height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  value: { fontSize: 22, fontWeight: '800', letterSpacing: -0.5 },
  label: { fontSize: 11, color: Colors.textMuted, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
});

// ── QUICK ACTION CARD ──────────────────────────────────
function QuickAction({ icon, label, color, onPress }) {
  return (
    <TouchableOpacity style={qa.card} onPress={onPress} activeOpacity={0.78}>
      <View style={[qa.grad, { backgroundColor: `${color}10` }]}>
        <Text style={{ fontSize: 28 }}>{icon}</Text>
        <Text style={[qa.label, { color }]}>{label}</Text>
      </View>
    </TouchableOpacity>
  );
}
const qa = StyleSheet.create({
  card: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  grad: { paddingVertical: 20, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', gap: 10 }, // Slightly more padding
  label: { fontSize: 13, fontWeight: '800', textAlign: 'center', letterSpacing: 0.3 }, // Larger, bolder text
});

// ── BOOKING CARD ──────────────────────────────────────
function BookingCard({ booking, isStudent, onAccept, onDecline }) {
  const isPaid = booking.paymentStatus === 'PAID';
  const isAccepted = booking.status === 'ACCEPTED';
  const isPending = booking.status === 'PENDING';
  return (
    <View style={bk.card}>
      <View style={[bk.grad, { backgroundColor: 'rgba(124,111,255,0.04)' }]}>
        <View style={bk.row}>
          <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={bk.avatar}>
            <Text style={bk.avatarChar}>
              {(isStudent ? booking.tutorName || 'T' : booking.studentName || 'S').charAt(0)}
            </Text>
          </LinearGradient>
          <View style={{ flex: 1 }}>
            <Text style={bk.name}>{isStudent ? booking.tutorName || 'Tutor' : booking.studentName || 'Student'}</Text>
            <Text style={bk.sub}>{booking.subject}</Text>
          </View>
          <View
            style={[
              bk.badge,
              {
                borderColor: isAccepted ? '#22c55e40' : '#f59e0b40',
                backgroundColor: isAccepted ? '#22c55e12' : '#f59e0b10',
              },
            ]}
          >
            <Text style={{ color: isAccepted ? '#22c55e' : '#f59e0b', fontSize: 10, fontWeight: '800' }}>
              {isAccepted ? 'CONFIRMED' : 'PENDING'}
            </Text>
          </View>
        </View>
        <View style={bk.meta}>
          <Text style={bk.metaText}>
            📅{' '}
            {new Date(booking.dateTime).toLocaleString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {!isStudent && isPaid ? (
            <Text style={{ color: '#22c55e', fontSize: 11, fontWeight: '700' }}>✅ Paid</Text>
          ) : !isStudent && !isPaid ? (
            <Text style={{ color: '#f59e0b', fontSize: 11, fontWeight: '600' }}>⏳ Awaiting Payment</Text>
          ) : null}
        </View>
        {!isStudent && isPending && onAccept && onDecline && (
          <View style={bk.actionRow}>
            <TouchableOpacity style={bk.declineBtn} onPress={() => onDecline(booking.id)} activeOpacity={0.85}>
              <Text style={{ color: '#ef4444', fontWeight: '700', fontSize: 13 }}>✕ Decline</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => onAccept(booking.id)} activeOpacity={0.85}>
              <View style={[bk.acceptBtn, { backgroundColor: '#16a34a' }]}>
                <Text style={{ color: '#fff', fontWeight: '700', fontSize: 13 }}>✓ Accept</Text>
              </View>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}
const bk = StyleSheet.create({
  card: { borderRadius: 20, borderWidth: 1, borderColor: 'rgba(124,111,255,0.15)', overflow: 'hidden', marginBottom: 10 },
  grad: { padding: 16 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatar: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarChar: { color: '#fff', fontWeight: '800', fontSize: 18 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
  sub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, borderWidth: 1 },
  meta: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  metaText: { fontSize: 12, color: Colors.textSecondary },
  actionRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  declineBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.3)',
    backgroundColor: 'rgba(239,68,68,0.06)',
    borderRadius: 12,
    paddingVertical: 11,
    alignItems: 'center',
  },
  acceptBtn: { borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
});

// ── TUTOR HOME ────────────────────────────────────────
function TutorHome({ user }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [earnings, setEarnings] = useState(null);
  const [pending, setPending] = useState([]);
  const [accepted, setAccepted] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [subscription, setSubscription] = useState(null);
  const [chatRequests, setChatRequests] = useState([]);

  const load = async () => {
    try {
      const [earningsRes, bookingsRes, profileRes, subscriptionRes, chatRequestsRes] = await Promise.all([
        bookingAPI.earnings().catch(() => ({ totalEarnings: 0, completedCount: 0, paidBookings: [] })),
        bookingAPI.getTutorBookings().catch(() => ({ bookings: [] })),
        tutorAPI.getMyProfile().catch(() => null),
        subscriptionAPI.getByTutorId(user?.id || user?._id).catch(() => null),
        chatAPI.getTutorPendingRequests().catch(() => ({ requests: [] })),
      ]);
      setEarnings(earningsRes);
      const all = bookingsRes.bookings || [];
      setPending(all.filter((b) => b.status === 'PENDING'));
      setAccepted(all.filter((b) => b.status === 'ACCEPTED'));
      const p = profileRes?.profile?.photoUrl;
      if (p) setPhoto(p);
      setSubscription(subscriptionRes?.subscription || null);
      setChatRequests(chatRequestsRes?.requests || []);
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
      ]).start();
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

  const handleAccept = async (id) => {
    try {
      await bookingAPI.accept(id);
      load();
    } catch { }
  };
  const handleDecline = async (id) => {
    try {
      await bookingAPI.reject(id);
      load();
    } catch { }
  };

  return (
    <PremiumBlurWrapper>
      <View style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        {/* Ambient blobs */}
        <View style={styles.blob1} />
        <View style={styles.blob2} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={Colors.primary}
            />
          }
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.greeting}>Welcome back,</Text>
                <Text style={styles.name}>{user?.name || 'Tutor'} 👋</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.85}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.avatar} />
                ) : (
                  <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={styles.avatar}>
                    <Text style={styles.avatarChar}>{(user?.name || 'T').charAt(0).toUpperCase()}</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>

            {/* Earnings Hero Card */}
            <View style={styles.section}>
              <LinearGradient
                colors={['rgba(124,111,255,0.18)', 'rgba(91,80,232,0.08)', 'rgba(124,111,255,0.04)']}
                style={styles.heroCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.heroLabel}>TOTAL EARNINGS</Text>
                <Text style={styles.heroValue}>LKR {(earnings?.totalEarnings || 0).toLocaleString()}</Text>
                <View style={styles.heroRow}>
                  <View style={styles.heroStat}>
                    <Text style={styles.heroStatVal}>{earnings?.completedCount || 0}</Text>
                    <Text style={styles.heroStatLabel}>Completed</Text>
                  </View>
                  <View style={styles.heroDivider} />
                  <View style={styles.heroStat}>
                    <Text style={[styles.heroStatVal, { color: '#f59e0b' }]}>{pending.length}</Text>
                    <Text style={styles.heroStatLabel}>Pending</Text>
                  </View>
                  <View style={styles.heroDivider} />
                  <View style={styles.heroStat}>
                    <Text style={[styles.heroStatVal, { color: '#3b82f6' }]}>{accepted.length}</Text>
                    <Text style={styles.heroStatLabel}>Upcoming</Text>
                  </View>
                </View>
              </LinearGradient>
            </View>

            {!!subscription && (
              <View style={[styles.section, styles.sectionSpacing]}>
                <LinearGradient colors={['rgba(34,197,94,0.16)', 'rgba(34,197,94,0.06)']} style={styles.subscriptionCard}>
                  <Text style={styles.subscriptionTitle}>Subscription Status</Text>
                  <Text
                    style={[
                      styles.subscriptionStatus,
                      { color: subscription?.status === 'active' ? '#86efac' : '#facc15' },
                    ]}
                  >
                    {(subscription?.status || 'inactive').toUpperCase()}
                  </Text>
                  <Text style={styles.subscriptionSub}>
                    Plan: {subscription?.planName || subscription?.plan || 'Standard'} | Expires:{' '}
                    {subscription?.expiresAt ? new Date(subscription.expiresAt).toLocaleDateString() : 'N/A'}
                  </Text>
                </LinearGradient>
              </View>
            )}

            {/* Quick Actions */}
            <Text style={styles.sectionLabel}>Quick Actions</Text>
            <View style={styles.quickGrid}>
              <QuickAction icon="📊" label="Bookings" color="#7C6FFF" onPress={() => router.push('/bookings')} />
              <QuickAction icon="💬" label="Messages" color="#3b82f6" onPress={() => router.push('/live-chat')} />
              <QuickAction icon="👤" label="My Profile" color="#22c55e" onPress={() => router.push('/(tabs)/profile')} />
              <QuickAction icon="💳" label="Subscription" color="#a78bfa" onPress={() => router.push('/subscription')} />
              <QuickAction icon="💵" label="Earnings" color="#34d399" onPress={() => router.push('/earnings')} />
              <QuickAction icon="🕘" label="Booking History" color="#f59e0b" onPress={() => router.push('/bookings')} />
            </View>

            {chatRequests.length > 0 && (
              <View style={styles.section}>
                <TouchableOpacity onPress={() => router.push('/live-chat')} activeOpacity={0.85} style={styles.chatReqBanner}>
                  <Text style={styles.chatReqText}>💬 {chatRequests.length} new chat request(s) from students</Text>
                  <Text style={styles.chatReqArrow}>→</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Pending Requests */}
            {pending.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>🔔 Booking Requests</Text>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>{pending.length}</Text>
                  </View>
                </View>
                {pending.slice(0, 3).map((b) => (
                  <BookingCard key={b.id} booking={b} onAccept={handleAccept} onDecline={handleDecline} />
                ))}
                {pending.length > 3 && (
                  <TouchableOpacity onPress={() => router.push('/bookings')} style={styles.viewAll}>
                    <Text style={styles.viewAllText}>View all {pending.length} requests →</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Upcoming Sessions */}
            {accepted.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>📅 Upcoming Sessions</Text>
                {accepted.slice(0, 2).map((b) => (
                  <BookingCard key={b.id} booking={b} />
                ))}
              </View>
            )}

            {pending.length === 0 && accepted.length === 0 && (
              <View style={styles.emptyState}>
                <Text style={{ fontSize: 60, marginBottom: 16 }}>🚀</Text>
                <Text style={styles.emptyTitle}>Ready to Teach?</Text>
                <Text style={styles.emptySub}>
                  Students will send booking requests here once your profile is live and subscription is active.
                </Text>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </View>
    </PremiumBlurWrapper>
  );
}

// ── STUDENT HOME ──────────────────────────────────────
function StudentHome({ user }) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const [bookings, setBookings] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [topTutors, setTopTutors] = useState([]);

  const load = async () => {
    try {
      const [bookingsRes, meRes, tutorsRes] = await Promise.all([
        bookingAPI.getStudentBookings().catch(() => ({ bookings: [] })),
        usersAPI.getMe().catch(() => null),
        tutorAPI.search({}).catch(() => null)
      ]);
      const upcoming = (bookingsRes.bookings || []).filter(
        (b) => ['PENDING', 'ACCEPTED'].includes(b.status) && new Date(b.dateTime) >= new Date()
      );
      setBookings(upcoming.slice(0, 4));
      if (tutorsRes && tutorsRes.tutors) {
        setTopTutors(tutorsRes.tutors.slice(0, 5));
      }
      const p = meRes?.photoUrl || meRes?.user?.photoUrl;
      if (p) setPhoto(p);
      fadeAnim.setValue(0);
      slideAnim.setValue(30);
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 500, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 420, useNativeDriver: true }),
      ]).start();
    } catch {
      // ignore
    } finally {
      setRefreshing(false);
    }
  };

  useFocusEffect(
    React.useCallback(() => {
      load();
    }, [])
  );

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <PremiumBlurWrapper>
      <View style={{ flex: 1 }}>
        <StatusBar barStyle="light-content" />
        <View style={styles.blob1} />
        <View style={styles.blob2} />

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={Colors.primary}
            />
          }
        >
          <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
            {/* Header */}
            <View style={styles.header}>
              <View style={{ flex: 1 }}>
                <Text style={styles.greeting}>{greeting} ✨</Text>
                <Text style={styles.name}>{user?.name || 'Student'}</Text>
              </View>
              <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.85}>
                {photo ? (
                  <Image source={{ uri: photo }} style={styles.avatar} />
                ) : (
                  <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={styles.avatar}>
                    <Text style={styles.avatarChar}>{(user?.name || 'S').charAt(0).toUpperCase()}</Text>
                  </LinearGradient>
                )}
              </TouchableOpacity>
            </View>

            {/* Hero Banner */}
            <View style={styles.section}>
              <LinearGradient
                colors={['rgba(124,111,255,0.22)', 'rgba(59,130,246,0.1)', 'rgba(124,111,255,0.04)']}
                style={styles.heroBanner}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.bannerTitle}>Find the Perfect Tutor</Text>
                <Text style={styles.bannerSub}>
                  Connect with verified expert tutors and unlock your learning potential
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/search')}
                  activeOpacity={0.85}
                  style={{ marginTop: 16, alignSelf: 'flex-start' }}
                >
                  <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={styles.bannerBtn}>
                    <Text style={styles.bannerBtnText}>🔍 Browse Tutors</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </LinearGradient>
            </View>

            {/* Quick Actions */}
            <Text style={styles.sectionLabel}>Quick Actions</Text>
            <View style={styles.quickGrid}>
              <QuickAction icon="🔍" label="Find Tutors" color="#7C6FFF" onPress={() => router.push('/(tabs)/search')} />
              <QuickAction icon="📋" label="My Bookings" color="#3b82f6" onPress={() => router.push('/bookings')} />
              <QuickAction icon="💬" label="Messages" color="#22c55e" onPress={() => router.push('/live-chat')} />
              <QuickAction icon="🧠" label="Quizzes" color="#eab308" onPress={() => router.push('/quizzes')} />
            </View>

            {/* Upcoming Sessions */}
            {bookings.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Text style={styles.sectionLabel}>📅 Upcoming Sessions</Text>
                  <TouchableOpacity onPress={() => router.push('/bookings')} activeOpacity={0.8}>
                    <Text style={styles.viewAllText}>View all →</Text>
                  </TouchableOpacity>
                </View>
                {bookings.map((b) => (
                  <BookingCard key={b.id} booking={b} isStudent />
                ))}
              </View>
            )}

            {bookings.length === 0 && (
              <View style={[styles.emptyState, { paddingTop: 5 }]}>
                <Text style={{ fontSize: 60, marginBottom: 16 }}>🎓</Text>
                <Text style={styles.emptyTitle}>Start Learning Today</Text>
                <Text style={[styles.emptySub, { marginBottom: 16 }]}>Browse our expert tutors and book your first session in minutes!</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/search')} style={{ marginTop: 12 }} activeOpacity={0.85}>
                  <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={styles.ctaBtn}>
                    <Text style={styles.ctaBtnText}>Find a Tutor →</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}

            {topTutors.length > 0 && (
              <View style={[styles.section, { marginTop: bookings.length === 0 ? 0 : 16 }]}>
                <View style={[styles.sectionHeader, { justifyContent: 'space-between', paddingHorizontal: 16, marginBottom: 12 }]}>
                  <Text style={[styles.sectionLabel, { paddingHorizontal: 0, marginTop: 0, marginBottom: 0 }]}>🔥 Featured Tutors</Text>
                  <TouchableOpacity onPress={() => router.push('/(tabs)/search')} activeOpacity={0.8}>
                    <Text style={styles.viewAllText}>See all →</Text>
                  </TouchableOpacity>
                </View>
                <View style={{ paddingHorizontal: 16, gap: 12 }}>
                  {topTutors.map((t) => (
                    <TouchableOpacity key={t.id} onPress={() => router.push(`/tutor-profile?id=${t.id}`)} activeOpacity={0.8} style={styles.miniTutorCard}>
                      <View style={[styles.miniTutorGrad, { backgroundColor: 'rgba(255,255,255,0.03)' }]}>
                        <View style={{ marginRight: 16 }}>
                          {t.photoUrl ? (
                            <Image source={{ uri: t.photoUrl }} style={styles.miniTutorAvatar} />
                          ) : (
                            <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={styles.miniTutorAvatar}>
                              <Text style={styles.avatarChar}>{(t.fullName || t.name || 'T').charAt(0).toUpperCase()}</Text>
                            </LinearGradient>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.miniTutorName} numberOfLines={1}>{t.fullName || t.name}</Text>
                          <Text style={styles.miniTutorSubject} numberOfLines={1}>{(t.subjects && t.subjects[0]) ? (typeof t.subjects[0] === 'string' ? t.subjects[0] : t.subjects[0].subject) : 'General'}</Text>
                          <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 8, gap: 4, alignSelf: 'flex-start', backgroundColor: 'rgba(0,0,0,0.2)', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 8 }}>
                            <Text style={{ fontSize: 10 }}>⭐</Text>
                            <Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>{Number(t.avgRating || 0).toFixed(1)}</Text>
                          </View>
                        </View>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </Animated.View>
        </ScrollView>
      </View>
    </PremiumBlurWrapper>
  );
}

// ── INSTITUTE MANAGER HOME ─────────────────────────────
function InstituteManagerHome({ user }) {
  const [institute, setInstitute] = useState(null);
  const [joinRequests, setJoinRequests] = useState([]);
  const [tutors, setTutors] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.get('/institutes/my-institute').catch(err => {
        console.warn('Error fetching my-institute:', err?.message || err);
        return null;
      });
      if (res && res.data && res.data.institute) {
        setInstitute(res.data.institute);
        setJoinRequests(res.data.joinRequests || []);

        // Load tutors
        const tRes = await api.get(`/institutes/${res.data.institute.id}`).catch(err => {
          console.warn('Error fetching institute tutors:', err?.message || err);
          return null;
        });
        if (tRes && tRes.data && tRes.data.tutors) {
          setTutors(tRes.data.tutors);
        }
      }
    } catch (err) {
      console.warn('Failed to load institute data', err);
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

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#06040f' }}>
        <ActivityIndicator color="#10B981" size="large" />
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, marginTop: 12 }}>Loading your institute...</Text>
      </View>
    );
  }

  return (
    <PremiumBlurWrapper>
      <View style={{ flex: 1, backgroundColor: '#06040f' }}>
        {/* Ambient blobs */}
        <View style={instStyle.blob1} />
        <View style={instStyle.blob2} />

        {/* Top Header */}
        <View style={instStyle.header}>
          <View style={{ flex: 1 }}>
            <Text style={instStyle.greeting}>Welcome back,</Text>
            <Text style={instStyle.name}>{user?.name || 'Manager'} 🏫</Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(tabs)/profile')} activeOpacity={0.85}>
            <LinearGradient colors={['#10B981', '#059669']} style={instStyle.avatar}>
              <Text style={instStyle.avatarChar}>{(user?.name || 'I').charAt(0).toUpperCase()}</Text>
            </LinearGradient>
          </TouchableOpacity>
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
          {!institute && (
            <View style={{ padding: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderRadius: 16, borderWith: 1, borderColor: 'rgba(255,255,255,0.05)', marginTop: 12 }}>
              <Text style={{ color: '#fff', fontSize: 16, marginBottom: 8, fontWeight: '700' }}>No Institute Profile Found</Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', lineHeight: 20 }}>Tap refresh or edit your settings to get started.</Text>
            </View>
          )}
          {institute && (
            <View style={{ gap: 16, marginTop: 12 }}>
              {/* Institute Card */}
              <LinearGradient
                colors={['rgba(16,185,129,0.18)', 'rgba(5,150,105,0.06)']}
                style={instStyle.heroCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
                  <View style={instStyle.instAvatar}>
                    <Text style={instStyle.instAvatarChar}>🏫</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={instStyle.heroLabel}>YOUR INSTITUTE</Text>
                    <Text style={instStyle.instName} numberOfLines={1}>{institute.name}</Text>
                    {institute.location && (
                      <Text style={instStyle.instLoc} numberOfLines={1}>📍 {institute.location}</Text>
                    )}
                    {institute.registrationNo && (
                      <Text style={instStyle.instReg} numberOfLines={1}># Reg: {institute.registrationNo}</Text>
                    )}
                  </View>
                </View>
              </LinearGradient>

              {/* Stats row */}
              <View style={instStyle.statsRow}>
                <View style={instStyle.statBox}>
                  <View style={instStyle.statIconBox}>
                    <Text style={{ fontSize: 18 }}>👥</Text>
                  </View>
                  <Text style={instStyle.statValue}>{tutors.length}</Text>
                  <Text style={instStyle.statLabel}>TUTORS</Text>
                </View>
                <View style={instStyle.statBox}>
                  <View style={[instStyle.statIconBox, { backgroundColor: 'rgba(245,158,11,0.18)' }]}>
                    <Text style={{ fontSize: 18 }}>⚠️</Text>
                  </View>
                  <Text style={[instStyle.statValue, { color: '#F59E0B' }]}>{joinRequests.length}</Text>
                  <Text style={instStyle.statLabel}>JOIN REQUESTS</Text>
                </View>
                <View style={instStyle.statBox}>
                  <View style={[instStyle.statIconBox, { backgroundColor: 'rgba(16,185,129,0.18)' }]}>
                    <Text style={{ fontSize: 18 }}>✅</Text>
                  </View>
                  <Text style={[instStyle.statValue, { color: '#10B981' }]}>Active</Text>
                  <Text style={instStyle.statLabel}>STATUS</Text>
                </View>
              </View>

              {/* General Details Card */}
              <View style={instStyle.detailCard}>
                <Text style={instStyle.cardTitle}>🏫 About the Institute</Text>
                <Text style={instStyle.infoHeading}>Description</Text>
                <Text style={instStyle.infoText}>{institute.description || 'Not set'}</Text>
              </View>
            </View>
          )}
        </ScrollView>
      </View>
    </PremiumBlurWrapper>
  );
}

export default function HomeScreen() {
  const context = useContext(AuthContext);
  const user = context?.user;
  const role = String(user?.role ?? '').trim().toLowerCase();
  if (role === 'tutor') return <TutorHome user={user} />;
  if (role === 'institute_manager') return <InstituteManagerHome user={user} />;
  // Students AND any other logged-in role see student home (safe default)
  return <StudentHome user={user} />;
}

const styles = StyleSheet.create({
  blob1: { position: 'absolute', top: -80, right: -100, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(124,111,255,0.12)' },
  blob2: { position: 'absolute', bottom: 200, left: -80, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(59,130,246,0.07)' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingTop: Platform.OS === 'ios' ? 60 : 52,
    paddingBottom: Spacing.md,
  },
  greeting: { fontSize: 14, color: Colors.textMuted, fontWeight: '500' },
  name: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.6, marginTop: 2 },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
    borderColor: Colors.primary,
    overflow: 'hidden',
  },
  avatarChar: { color: '#fff', fontWeight: '800', fontSize: 18 },
  section: { paddingHorizontal: Spacing.md, marginBottom: 4 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: Colors.textMuted,
    paddingHorizontal: Spacing.lg,
    marginBottom: 12,
    marginTop: Spacing.lg,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, paddingHorizontal: Spacing.md, marginBottom: 4 },
  badge: { backgroundColor: '#7C6FFF', borderRadius: 12, paddingHorizontal: 8, paddingVertical: 3 },
  badgeText: { color: '#fff', fontWeight: '800', fontSize: 11 },
  viewAll: { alignItems: 'center', marginTop: 4 },
  viewAllText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
  heroCard: { borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(124,111,255,0.2)' },
  sectionSpacing: { marginTop: 16 },
  heroLabel: {
    fontSize: 11,
    color: 'rgba(124,111,255,0.7)',
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  heroValue: { fontSize: 36, fontWeight: '900', color: Colors.textPrimary, letterSpacing: -1, marginBottom: 20 },
  heroRow: { flexDirection: 'row', justifyContent: 'space-around' },
  heroStat: { alignItems: 'center' },
  heroStatVal: { fontSize: 22, fontWeight: '800', color: '#22c55e' },
  heroStatLabel: { fontSize: 11, color: Colors.textMuted, fontWeight: '600', marginTop: 2 },
  heroDivider: { width: 1, height: 40, backgroundColor: 'rgba(255,255,255,0.08)' },
  subscriptionCard: { borderRadius: 18, padding: 16, borderWidth: 1, borderColor: 'rgba(34,197,94,0.3)' },
  subscriptionTitle: { color: Colors.textMuted, textTransform: 'uppercase', fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  subscriptionStatus: { fontSize: 20, fontWeight: '800', marginTop: 6 },
  subscriptionSub: { color: Colors.textSecondary, fontSize: 12, marginTop: 6 },
  chatReqBanner: {
    borderWidth: 1,
    borderColor: 'rgba(59,130,246,0.35)',
    borderRadius: BorderRadius.md,
    backgroundColor: 'rgba(59,130,246,0.10)',
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  chatReqText: { color: '#93c5fd', fontWeight: '600', fontSize: 13 },
  chatReqArrow: { color: '#93c5fd', fontSize: 18, fontWeight: '700' },
  heroBanner: { borderRadius: 24, padding: 24, borderWidth: 1, borderColor: 'rgba(124,111,255,0.2)' },
  bannerTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.4, marginBottom: 8 },
  bannerSub: { fontSize: 13, color: Colors.textSecondary, lineHeight: 20 },
  bannerBtn: { borderRadius: 14, paddingVertical: 12, paddingHorizontal: 20 },
  bannerBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  emptyState: { alignItems: 'center', paddingTop: 32, paddingHorizontal: Spacing.xl, paddingBottom: 40 },
  emptyTitle: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, marginBottom: 10 },
  emptySub: { color: Colors.textSecondary, fontSize: 13, textAlign: 'center', lineHeight: 21 },
  ctaBtn: { borderRadius: 16, paddingVertical: 15, paddingHorizontal: 36 },
  ctaBtnText: { color: '#fff', fontWeight: '800', fontSize: 15 },
  miniTutorCard: { width: '100%', borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', backgroundColor: 'rgba(255,255,255,0.03)' },
  miniTutorGrad: { padding: 16, flexDirection: 'row', alignItems: 'center' },
  miniTutorAvatar: { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(124,111,255,0.3)', alignItems: 'center', justifyContent: 'center' },
  miniTutorName: { color: '#fff', fontSize: 16, fontWeight: '800', marginBottom: 2 },
  miniTutorSubject: { color: Colors.textMuted, fontSize: 13 },
});

const instStyle = StyleSheet.create({
  blob1: { position: 'absolute', top: -80, right: -100, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(16,185,129,0.12)' },
  blob2: { position: 'absolute', bottom: 200, left: -80, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(5,150,105,0.07)' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 52,
    paddingBottom: 16,
  },
  greeting: { fontSize: 14, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
  name: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.6, marginTop: 2 },
  avatar: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  avatarChar: { color: '#fff', fontWeight: '800', fontSize: 16 },
  tabBarContainer: { paddingHorizontal: 16, marginBottom: 6 },
  tabItem: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.03)',
    overflow: 'hidden',
    minWidth: 100,
    alignItems: 'center',
  },
  activeTabItem: {
    borderColor: 'rgba(16,185,129,0.35)',
    backgroundColor: 'rgba(16,185,129,0.1)',
  },
  tabLabel: { fontSize: 13, color: 'rgba(255,255,255,0.5)', fontWeight: '600' },
  activeTabLabel: { color: '#fff', fontWeight: '700' },
  badgeText: { color: '#10B981', fontSize: 12, fontWeight: '700' },
  heroCard: { borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(16,185,129,0.25)', backgroundColor: 'rgba(255,255,255,0.03)' },
  instAvatar: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(16,185,129,0.18)', alignItems: 'center', justifyContent: 'center' },
  instAvatarChar: { fontSize: 24 },
  heroLabel: { fontSize: 10, color: 'rgba(16,185,129,0.7)', fontWeight: '800', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 4 },
  instName: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: -0.4 },
  instLoc: { fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 },
  instReg: { fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 },
  editBtn: { alignSelf: 'center', marginLeft: 6 },
  editBtnGrad: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, elevation: 4 },
  editBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' },
  statBox: { flex: 1, minWidth: '28%', borderRadius: 18, padding: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)', alignItems: 'center', gap: 4 },
  statIconBox: { width: 36, height: 36, borderRadius: 12, backgroundColor: 'rgba(16,185,129,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: '600', letterSpacing: 0.2 },
  detailCard: { borderRadius: 22, padding: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)', gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: '800', color: '#fff', letterSpacing: -0.2, marginBottom: 2 },
  infoHeading: { fontSize: 11, color: 'rgba(16,185,129,0.8)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },
  infoText: { fontSize: 13, color: 'rgba(255,255,255,0.7)', lineHeight: 18 },
  emptyWrap: { padding: 32, alignItems: 'center', borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)', backgroundColor: 'rgba(255,255,255,0.02)' },
  tutorCard: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', backgroundColor: 'rgba(255,255,255,0.04)' },
  tutorAvatar: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tutorAvatarChar: { fontSize: 18, fontWeight: '800', color: '#fff' },
  requestCard: { padding: 16, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(245,158,11,0.25)', backgroundColor: 'rgba(245,158,11,0.04)' },
  actionBtn: { flex: 1, paddingVertical: 10, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  inputGroup: { gap: 6 },
  inputLabel: { fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: '700', marginLeft: 2 },
  input: { paddingHorizontal: 14, paddingVertical: 12, borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', backgroundColor: 'rgba(255,255,255,0.05)', color: '#fff', fontSize: 14 },
  saveBtn: { paddingVertical: 14, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});

