import React, { useEffect, useState, useRef, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image, Alert, Animated, Modal, Platform, TextInput, Linking, Dimensions, } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import api from '../src/services/api';
import { AuthContext } from '../src/contexts/AuthContext';
import { Colors, BorderRadius, Spacing } from '../constants/theme';
import { PremiumBlurWrapper } from '../src/components/PremiumBlurWrapper';
function StarRow({ rating }) {
    return (<View style={{ flexDirection: 'row', gap: 2 }}>
      {[1, 2, 3, 4, 5].map(i => (<Text key={i} style={{ color: i <= rating ? '#f59e0b' : 'rgba(255,255,255,0.35)', fontSize: 14 }}>★</Text>))}
    </View>);
}
function getYoutubeEmbedUrl(url) {
    if (!url)
        return '';
    const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/);
    if (m)
        return `https://www.youtube.com/embed/${m[1]}?autoplay=0`;
    const v = url.match(/vimeo\.com\/(\d+)/);
    if (v)
        return `https://player.vimeo.com/video/${v[1]}`;
    return '';
}
// ── PURE-JS CALENDAR PICKER ───────────────────────────────
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];
function CalendarPicker({ value, onChange }) {
    const today = new Date();
    const [viewYear, setViewYear] = useState(value.getFullYear());
    const [viewMonth, setViewMonth] = useState(value.getMonth());
    const [hour, setHour] = useState(value.getHours());
    const [minute, setMinute] = useState(0);
    const [activeTab, setActiveTab] = useState('date');
    const [showTimePicker, setShowTimePicker] = useState(false);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const selectDay = (day) => {
        const d = new Date(viewYear, viewMonth, day, hour, minute);
        onChange(d);
    };
    const onTimeChange = (event, selectedDate) => {
      setShowTimePicker(Platform.OS === 'ios');
      if (selectedDate) {
        setHour(selectedDate.getHours());
        setMinute(selectedDate.getMinutes());
        onChange(new Date(viewYear, viewMonth, value.getDate(), selectedDate.getHours(), selectedDate.getMinutes()));
      }
    };
    const isSelected = (day) => value.getDate() === day && value.getMonth() === viewMonth && value.getFullYear() === viewYear;
    const isToday = (day) => today.getDate() === day && today.getMonth() === viewMonth && today.getFullYear() === viewYear;
    const isPast = (day) => new Date(viewYear, viewMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const prevMonth = () => {
        if (viewMonth === 0) {
            setViewMonth(11);
            setViewYear(y => y - 1);
        }
        else
            setViewMonth(m => m - 1);
    };
    const nextMonth = () => {
        if (viewMonth === 11) {
            setViewMonth(0);
            setViewYear(y => y + 1);
        }
        else
            setViewMonth(m => m + 1);
    };
    const updateTime = (h, m) => {
        const d = new Date(value.getFullYear(), value.getMonth(), value.getDate(), h, m);
        onChange(d);
        setHour(h);
        setMinute(m);
    };
    const cells = [];
    for (let i = 0; i < firstDay; i++)
        cells.push(null);
    for (let d = 1; d <= daysInMonth; d++)
        cells.push(d);
    return (<View style={cal.container}>
      {/* Tabs */}
      <View style={{ flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 12, padding: 4, marginBottom: 16 }}>
        {[{ id: 'date', label: '📅 Date' }, { id: 'time', label: '🕐 Time' }].map(tab => (
          <TouchableOpacity key={tab.id} onPress={() => setActiveTab(tab.id)} activeOpacity={0.8} style={{ flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center', backgroundColor: activeTab === tab.id ? 'rgba(255,255,255,0.1)' : 'transparent' }}>
            <Text style={{ color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.5)', fontWeight: '700', fontSize: 13 }}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {activeTab === 'date' ? (
        <View>
          {/* Month nav */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 4 }}>
            <TouchableOpacity onPress={prevMonth} activeOpacity={0.7} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>‹</Text>
            </TouchableOpacity>
            <Text style={cal.monthLabel}>{MONTHS[viewMonth]} {viewYear}</Text>
            <TouchableOpacity onPress={nextMonth} activeOpacity={0.7} style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.1)', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#fff', fontSize: 18, fontWeight: 'bold' }}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day names */}
          <View style={cal.dayNames}>
            {DAYS.map(d => <Text key={d} style={cal.dayName}>{d}</Text>)}
          </View>

          {/* Grid */}
          <View style={[cal.grid, { marginBottom: 4 }]}>
            {cells.map((day, i) => (<TouchableOpacity key={i} style={[cal.cell, day === null && cal.emptyCell, isSelected(day) && cal.cellSelected, isToday(day) && !isSelected(day) && cal.cellToday, isPast(day) && cal.cellPast]} onPress={() => day && !isPast(day) && selectDay(day)} activeOpacity={day && !isPast(day) ? 0.7 : 1} disabled={!day || isPast(day)}>
                {day !== null ? <Text style={[cal.cellText, isSelected(day) && cal.cellTextSelected, isPast(day) && cal.cellTextPast]}>{day}</Text> : null}
              </TouchableOpacity>))}
          </View>
        </View>
      ) : (
        <View>
          {/* Time picker */}
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
const cal = StyleSheet.create({
    container: { marginBottom: Spacing.md },
    tabs: { flexDirection: 'row', gap: 8, marginBottom: 10 },
    tab: { flex: 1, paddingVertical: 10, borderRadius: BorderRadius.md, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center' },
    tabActive: { backgroundColor: 'rgba(124,111,255,0.15)', borderColor: Colors.primary },
    tabText: { color: Colors.textSecondary, fontWeight: '600', fontSize: 13 },
    tabTextActive: { color: Colors.primary },
    summary: { backgroundColor: 'rgba(124,111,255,0.08)', borderRadius: BorderRadius.md, padding: 10, marginBottom: 12, borderWidth: 1, borderColor: 'rgba(124,111,255,0.18)' },
    summaryText: { color: Colors.primary, fontSize: 13, fontWeight: '600', textAlign: 'center' },
    monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
    navBtn: { width: 34, height: 34, borderRadius: 17, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center' },
    navBtnText: { color: Colors.textPrimary, fontSize: 20, lineHeight: 24 },
    monthLabel: { fontSize: 15, fontWeight: '700', color: Colors.textPrimary },
    dayNames: { flexDirection: 'row', marginBottom: 6 },
    dayName: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: Colors.textMuted },
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    cell: { width: `${100 / 7}%`, height: 36, alignItems: 'center', justifyContent: 'center', borderRadius: 50 },
    emptyCell: {},
    cellSelected: { backgroundColor: Colors.primary },
    cellToday: { borderWidth: 1.5, borderColor: Colors.primary },
    cellPast: { opacity: 0.3 },
    cellText: { fontSize: 13, fontWeight: '500', color: Colors.textPrimary },
    cellTextSelected: { color: '#fff', fontWeight: '700' },
    cellTextPast: { color: Colors.textMuted },
    timeLabel: { fontSize: 12, fontWeight: '600', color: Colors.textMuted, marginBottom: 8, letterSpacing: 0.5 },
    timeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: BorderRadius.md, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', marginRight: 8 },
    timeChipActive: { backgroundColor: 'rgba(124,111,255,0.18)', borderColor: Colors.primary },
    timeChipText: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600' },
    timeChipTextActive: { color: Colors.primary },
});
function BookModal({ visible, tutor, onClose }) {
    const [subject, setSubject] = useState('');
    const [date, setDate] = useState(() => {
        const d = new Date();
        d.setDate(d.getDate() + 1);
        d.setHours(10, 0, 0, 0);
        return d;
    });
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [subjectPopupVisible, setSubjectPopupVisible] = useState(false);
    const handleBook = async () => {
        var _a, _b;
        try {
            setLoading(true);
            await api.post('/bookings', {
                tutorId: tutor.id,
                subject: subject || 'General',
                classFormat: 'Online',
                classType: 'Individual',
                dateTime: date.toISOString(),
                price: tutor.hourlyRate || 0,
            });
            setSuccess(true);
        }
        catch (e) {
            Alert.alert('Booking Failed', ((_b = (_a = e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) || 'Try again.');
        }
        finally {
            setLoading(false);
        }
    };
    const subjectList = (tutor.subjects || []).map(s => typeof s === 'string' ? s : s.subject);
    return (<Modal visible={visible} animationType="slide" transparent>
      <View style={ms.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1}/>
        <View style={ms.sheet}>
          <View style={ms.handle}/>
          {success ? (<View style={{ alignItems: 'center', padding: Spacing.xl }}>
              <Text style={{ fontSize: 50, marginBottom: 16 }}>✅</Text>
              <Text style={ms.title}>Booking Sent!</Text>
              <Text style={ms.sub}>Wait for the tutor to accept. Check My Bookings for status.</Text>
              <TouchableOpacity onPress={() => { setSuccess(false); onClose(); router.push('/bookings'); }} style={{ marginTop: 20 }} activeOpacity={0.85}>
                <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={ms.btnGrad}>
                  <Text style={ms.btnText}>View My Bookings</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>) : (<View style={{ flex: 1 }}>
              {/* Title - compact */}
              <View style={{ paddingVertical: 10, marginBottom: 4 }}>
                <Text style={[ms.title, { marginBottom: 6 }]}>Book Session with {tutor.fullName || tutor.name}</Text>
                {tutor.hourlyRate != null && tutor.hourlyRate > 0 && (<Text style={ms.price}>💰 LKR {tutor.hourlyRate}/hr · 💻 Online Only</Text>)}
              </View>
              {/* Scrollable Content */}
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 10 }}>
              {/* Subject popup trigger */}
              <View style={{ marginBottom: 16 }}>
                <Text style={[ms.label, { color: '#EAEAEA' }]}>Subject</Text>
                <TouchableOpacity onPress={() => setSubjectPopupVisible(true)} activeOpacity={0.7} style={ms.subjectDropdown}>
                  <Text style={{ color: subject || subjectList[0] ? '#fff' : 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: '600', flex: 1 }}>{subject || subjectList[0] || 'Select subject'}</Text>
                  <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>▼</Text>
                </TouchableOpacity>
              </View>
              {/* Calendar */}
              <View style={{ marginBottom: 16 }}>
                <CalendarPicker value={date} onChange={setDate}/>
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
                  <Text style={{ color: '#0EA5E9', fontSize: 16, fontWeight: '800' }}>LKR {(tutor.hourlyRate || 0).toLocaleString()}/hr</Text>
                </View>
                <TouchableOpacity onPress={handleBook} disabled={loading} activeOpacity={0.85}>
                  <LinearGradient colors={['#0EA5E9', '#3B82F6']} style={[ms.confirmBtn, { shadowColor: '#0EA5E9', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 8 }]}>
                    {loading ? <ActivityIndicator color="#fff"/> : <Text style={ms.btnText}>Confirm Request</Text>}
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
                          {(subject || subjectList[0]) === s && <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: '#0EA5E9' }}/>}
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                </View>
              )}
            </View>)}
        </View>
      </View>
    </Modal>);
}
function RatingPopup({ visible, tutor, onClose, onLeaveReview }) {
    const totalReviews = Math.max((Array.isArray(tutor.reviews) ? tutor.reviews.length : 0), tutor.ratingCount || 0);
    const counts = [5, 4, 3, 2, 1].map(star => ({
        star,
        count: Array.isArray(tutor.reviews) ? tutor.reviews.filter(r => r.rating === star).length : 0,
    }));
    return (<Modal visible={visible} animationType="slide" transparent>
      <View style={ms.overlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1}/>
        <View style={ms.sheet}>
          <View style={ms.handle}/>
          <Text style={ms.title}>Rating Details</Text>
          <Text style={[ms.sub, { marginBottom: 18 }]}>Tap outside to close</Text>
          <View style={{ alignItems: 'center', marginBottom: 20 }}>
            <Text style={{ color: '#fff', fontSize: 48, fontWeight: '800' }}>{Number(tutor.avgRating || 0).toFixed(1)}</Text>
            <StarRow rating={Math.round(tutor.avgRating || 0)}/>
            <Text style={{ color: Colors.textSecondary, fontSize: 13, marginTop: 6 }}>{totalReviews} review{totalReviews === 1 ? '' : 's'}</Text>
          </View>
          {totalReviews > 0 ? (<View style={{ gap: 10, marginBottom: 20 }}>
              {counts.map(item => (<View key={item.star} style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                  <Text style={{ width: 40, color: Colors.textSecondary, fontSize: 12 }}>{item.star} star</Text>
                  <View style={{ flex: 1, height: 10, borderRadius: 6, backgroundColor: 'rgba(255,255,255,0.08)', overflow: 'hidden' }}>
                    <View style={{ width: `${totalReviews ? (item.count / totalReviews) * 100 : 0}%`, height: '100%', backgroundColor: Colors.primary }}/>
                  </View>
                  <Text style={{ width: 24, color: Colors.textPrimary, fontSize: 12, textAlign: 'right' }}>{item.count}</Text>
                </View>))}
            </View>) : <Text style={[styles.cardBody, { textAlign: 'center', marginBottom: 20 }]}>No detailed reviews available yet.</Text>}
          <TouchableOpacity onPress={onLeaveReview} activeOpacity={0.85} style={{ marginTop: 'auto' }}>
            <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={ms.btnGrad}>
              <Text style={ms.btnText}>Leave a Review</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>);
}

function ReviewModal({ visible, tutorId, onClose }) {
    const [rating, setRating] = useState(5);
    const [comment, setComment] = useState('');
    const [loading, setLoading] = useState(false);
    const submit = async () => {
        var _a, _b;
        try {
            setLoading(true);
            await api.post(`/tutors/${tutorId}/reviews`, { rating, comment });
            Alert.alert('✅ Review Submitted!', 'Thank you for your feedback.');
            onClose();
        }
        catch (e) {
            Alert.alert('Failed', ((_b = (_a = e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) || 'Try again.');
        }
        finally {
            setLoading(false);
        }
    };
    return (<Modal visible={visible} animationType="slide" transparent>
      <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'center', padding: 24 }}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={onClose} activeOpacity={1}/>
        <View style={{ backgroundColor: '#111218', borderRadius: 24, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', elevation: 24, shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 12, shadowOffset: { width: 0, height: 8 }, zIndex: 2 }}>
          <LinearGradient colors={['#4F46E5', '#3b82f6']} style={{ padding: 20, alignItems: 'center' }}>
            <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700', alignSelf: 'flex-start', marginBottom: 4, opacity: 0.8, letterSpacing: 1 }}>SELECT RATING</Text>
            <Text style={{ color: '#fff', fontSize: 42, fontWeight: '900' }}>{rating} / 5</Text>
          </LinearGradient>
          <View style={{ padding: 24, alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'center', marginBottom: 20 }}>
              {[1, 2, 3, 4, 5].map(i => (<TouchableOpacity key={i} onPress={() => setRating(i)} activeOpacity={0.7} style={{ padding: 2 }}>
                  <Text style={{ fontSize: 38, color: i <= rating ? '#f59e0b' : 'rgba(255,255,255,0.15)' }}>★</Text>
                </TouchableOpacity>))}
            </View>
            <TextInput 
              style={{ width: '100%', borderBottomWidth: 1.5, borderBottomColor: '#4F46E5', fontSize: 15, color: '#fff', paddingVertical: 10, marginBottom: 12 }} 
              value={comment} 
              onChangeText={setComment} 
              placeholder="Add a comment (optional)..." 
              placeholderTextColor="rgba(255,255,255,0.3)" 
            />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 12, padding: 20, paddingTop: 0 }}>
             <TouchableOpacity onPress={onClose} activeOpacity={0.8} style={{ paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' }}>
               <Text style={{ color: '#A0A0A5', fontWeight: '700', fontSize: 13 }}>Cancel</Text>
             </TouchableOpacity>
             <TouchableOpacity onPress={submit} disabled={loading} activeOpacity={0.8} style={{ borderRadius: 12, overflow: 'hidden' }}>
               <LinearGradient colors={['#10b981', '#059669']} style={{ paddingHorizontal: 20, paddingVertical: 10, alignItems: 'center', justifyContent: 'center', minWidth: 80 }}>
                 {loading ? <ActivityIndicator size="small" color="#fff" /> : <Text style={{ color: '#fff', fontWeight: '800', fontSize: 13 }}>Submit</Text>}
               </LinearGradient>
             </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>);
}
function resolveTutorId(tutor) {
    if (!tutor) return null;
    return tutor.id || tutor.userId || tutor.tutorId || tutor.profileId || null;
}
async function sendChatRequest(tutorId) {
    if (!tutorId) {
        throw new Error('Tutor ID missing');
    }
    await api.post('/chat/requests', { tutorId });
}
// Helper: mask raw IDs like "IT24102760" to friendly initials
function maskStudentName(name) {
    if (!name) return 'Student';
    const n = name.trim();
    // If it looks like a raw ID (alphanumeric, no spaces, >6 chars)
    if (/^[A-Z]{2}\d{5,}$/i.test(n) || (!n.includes(' ') && n.length > 6 && /\d{3,}/.test(n))) {
        return `Student ${n.charAt(0).toUpperCase()}`;
    }
    return n;
}
// ── MAIN SCREEN ──────────────────────────────────────
export default function TutorProfileScreen() {
    var _a;
    const params = useLocalSearchParams();
    const tutorId = params.tutorId || params.id || params.tutor || null;
    const context = useContext(AuthContext);
    const [tutor, setTutor] = useState(null);
    const [loading, setLoading] = useState(true);
    const [bookModal, setBookModal] = useState(false);
    const [reviewModal, setReviewModal] = useState(false);
    const [ratingModal, setRatingModal] = useState(false);
    const fadeAnim = useRef(new Animated.Value(0)).current;
    const topBarTranslateY = useRef(new Animated.Value(0)).current;
    const topBarNameOpacity = useRef(new Animated.Value(0)).current;
    const lastScrollY = useRef(0);
    const heroHeight = useRef(220);
    const handleScroll = (event) => {
        const y = event.nativeEvent.contentOffset.y;
        const delta = y - lastScrollY.current;
        // Hide/show top bar
        if (delta > 8 && y > 60) {
            Animated.timing(topBarTranslateY, { toValue: -110, duration: 250, useNativeDriver: true }).start();
        } else if (delta < -8) {
            Animated.timing(topBarTranslateY, { toValue: 0, duration: 250, useNativeDriver: true }).start();
        }
        // Fade tutor name into top bar once hero scrolls out
        if (y > heroHeight.current) {
            Animated.timing(topBarNameOpacity, { toValue: 1, duration: 150, useNativeDriver: true }).start();
        } else {
            Animated.timing(topBarNameOpacity, { toValue: 0, duration: 150, useNativeDriver: true }).start();
        }
        lastScrollY.current = y;
    };
    useEffect(() => {
        if (!tutorId) {
            router.back();
            return;
        }
        api.get(`/tutors/${tutorId}/details`)
            .then(res => { setTutor(res.data.tutor); Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start(); })
            .catch(() => router.back())
            .finally(() => setLoading(false));
    }, [tutorId]);
    if (loading)
        return (<PremiumBlurWrapper>
    <LinearGradient colors={['#06040f', '#0d0920']} style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Colors.primary}/>
    </LinearGradient>
    </PremiumBlurWrapper>);
    if (!tutor)
        return null;
    const subjects = (tutor.subjects || []).map((s) => { var _a; return typeof s === 'object' ? `${s.subject}${((_a = s.mediums) === null || _a === void 0 ? void 0 : _a.length) ? ` (${s.mediums.join(', ')})` : ''}` : s; });
    const videoEmbedUrl = getYoutubeEmbedUrl(tutor.introVideoUrl || '');
    const isStudent = ((_a = context === null || context === void 0 ? void 0 : context.user) === null || _a === void 0 ? void 0 : _a.role) === 'student';
    const handleChat = async () => {
        var _a, _b;
        if (!context?.token || !context?.user) {
            Alert.alert('Login Required', 'You must be logged in to chat with tutors.');
            return;
        }
        if (context.user.role !== 'student') {
            Alert.alert('Not Available', 'Only students can send chat requests.');
            return;
        }
        const targetTutorId = resolveTutorId(tutor);
        if (!targetTutorId) {
            Alert.alert('Failed', 'Unable to find tutor ID for chat request.');
            return;
        }
        try {
            await sendChatRequest(targetTutorId);
            Alert.alert('✅ Request Sent', 'Chat request sent! Go to the Chat tab to see when they accept.');
        }
        catch (e) {
            const msg = ((_b = (_a = e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) || '';
            if (msg.includes('already pending')) {
                Alert.alert('Already Sent', 'You already have a pending chat request. Check the Chat tab.');
            }
            else {
                Alert.alert('Failed', msg || 'Could not send chat request. Try again.');
            }
        }
    };
    const reviewCount = (Array.isArray(tutor.reviews) && tutor.reviews.length > 0) ? Math.max(tutor.reviews.length, tutor.ratingCount || 0) : (tutor.ratingCount || 0);
    return (<PremiumBlurWrapper>
    <View style={[styles.gradient, { flex: 1 }]}>
      {tutor.photoUrl ? (
        <>
          <Image source={{ uri: tutor.photoUrl }} style={[StyleSheet.absoluteFillObject, { width: '100%', height: '100%', position: 'absolute' }]} blurRadius={Platform.OS === 'ios' ? 30 : 15} resizeMode="cover" />
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(6,4,15,0.78)', position: 'absolute' }]} />
        </>
      ) : null}
      <Animated.View style={[styles.topBar, { transform: [{ translateY: topBarTranslateY }] }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.7}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={styles.topBarTitle} numberOfLines={1}>Tutor</Text>
          <Animated.Text style={[styles.topBarTitle, { position: 'absolute', opacity: topBarNameOpacity, fontSize: 14, color: 'rgba(255,255,255,0.9)' }]} numberOfLines={1}>{tutor.fullName || tutor.name}</Animated.Text>
        </View>
        <View style={{ width: 44 }}/>
      </Animated.View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Platform.OS === 'ios' ? 90 : 80 }} onScroll={handleScroll} scrollEventThrottle={16}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {/* Hero */}
          <View style={styles.hero}>
            {tutor.photoUrl ? (<Image source={{ uri: tutor.photoUrl }} style={styles.heroPhoto}/>) : (<LinearGradient colors={['#7C6FFF', '#5B50E8']} style={styles.heroAvatar}>
                <Text style={styles.heroAvatarChar}>{(tutor.fullName || tutor.name || 'T').charAt(0)}</Text>
              </LinearGradient>)}
            <Text style={styles.heroName}>{tutor.fullName || tutor.name}</Text>
            {tutor.location ? <Text style={styles.heroLocation}>📍 {tutor.location}</Text> : null}
            {(() => {
              const inst = tutor.institute || tutor.instituteName || (Array.isArray(tutor.institutes) && tutor.institutes[0]);
              if (!inst) return null;
              const name = typeof inst === 'object' ? inst.name || inst.instituteName : inst;
              if (!name) return null;
              return (
                <View style={{ marginTop: 6, backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.35)', borderWidth: 1, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 }}>
                  <Text style={{ fontSize: 11, color: '#f59e0b', fontWeight: '800' }}>🏫 {String(name)}</Text>
                </View>
              );
            })()}
            {/* Rating Row 1: Stars + count */}
            <TouchableOpacity style={styles.ratingRow} activeOpacity={0.8} onPress={() => setRatingModal(true)}>
              <StarRow rating={Math.round(tutor.avgRating || 0)}/>
              <Text style={styles.ratingText}>
                {Number(tutor.avgRating || 0).toFixed(1)} ({reviewCount} review{reviewCount !== 1 ? 's' : ''})
              </Text>
            </TouchableOpacity>
            {/* Rating Row 2: Price + class type badges */}
            <View style={[styles.badgeRow, { marginTop: 8 }]}>
              {tutor.hourlyRate != null && tutor.hourlyRate > 0 && (<View style={[styles.badge, { borderColor: 'rgba(124,111,255,0.3)', backgroundColor: 'rgba(124,111,255,0.1)' }]}>
                  <Text style={[styles.badgeText, { color: Colors.primary }]}>LKR {tutor.hourlyRate}/hr</Text>
                </View>)}
              {(tutor.classTypes || []).map(ct => <View key={ct} style={styles.badge}><Text style={styles.badgeText}>{ct}</Text></View>)}
            </View>
          </View>

          {/* Contact Card */}
          {tutor.contactPhone ? (<TouchableOpacity onPress={() => Linking.openURL(`tel:${tutor.contactPhone}`)} activeOpacity={0.7} style={styles.contactCard}>
              <View style={styles.contactInner}>
                <View style={styles.contactIcon}><Text style={styles.contactIconText}>📞</Text></View>
                <View style={styles.contactTextWrap}>
                  <Text style={styles.contactTitle}>Contact Tutor</Text>
                  <Text style={styles.contactSubtitle}>Tap to call</Text>
                </View>
              </View>
            </TouchableOpacity>) : null}

          {/* About Section - bio only */}
          {tutor.bio ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>✍️ About</Text>
              <Text style={styles.cardBody}>{tutor.bio}</Text>
            </View>
          ) : null}

          {/* Video Section - native high-quality preview, below About */}
          {tutor.introVideoUrl ? (
            <View style={styles.card}>
              <Text style={styles.sectionTitle}>🎬 Intro Video</Text>
              {(() => {
                const m = (tutor.introVideoUrl || '').match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&?\s]+)/);
                const videoId = m ? m[1] : null;
                const thumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;

                if (thumbUrl) {
                  return (
                    <TouchableOpacity onPress={() => Linking.openURL(tutor.introVideoUrl)} activeOpacity={0.85} style={{ width: '100%', height: 210, borderRadius: 16, overflow: 'hidden', marginTop: 12, backgroundColor: '#000', position: 'relative' }}>
                      <Image source={{ uri: thumbUrl }} style={{ width: '100%', height: '100%', resizeMode: 'cover' }} />
                      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)' }}>
                        <LinearGradient colors={['rgba(108,99,255,0.9)', 'rgba(59,130,246,0.9)']} style={{ width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)' }}>
                          <Text style={{ color: '#fff', fontSize: 24, marginLeft: 4 }}>▶</Text>
                        </LinearGradient>
                      </View>
                    </TouchableOpacity>
                  );
                }

                return (
                  <TouchableOpacity onPress={() => Linking.openURL(tutor.introVideoUrl)} activeOpacity={0.8} style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginTop: 12 }}>
                    <View style={styles.videoThumb}>
                      <View style={styles.videoBadge}><Text style={styles.videoBadgeText}>▶</Text></View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: '#fff', fontSize: 14, fontWeight: '700', marginBottom: 3 }}>Intro Video</Text>
                      <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }}>Watch Video</Text>
                    </View>
                  </TouchableOpacity>
                );
              })()}
            </View>
          ) : null}

          {/* Subjects */}
          {subjects.length > 0 && (<View style={styles.card}>
              <Text style={styles.sectionTitle}>📚 Subjects & Mediums</Text>
              <View style={styles.tagWrap}>
                {subjects.map((s, i) => (<View key={i} style={styles.subjectTag}><Text style={styles.subjectTagText}>{s}</Text></View>))}
              </View>
            </View>)}

          {/* Time Slots */}
          {tutor.timetable ? (<View style={styles.card}>
              <Text style={styles.sectionTitle}>🕐 Available Time Slots</Text>
              <Text style={styles.cardBody}>{tutor.timetable}</Text>
            </View>) : null}

          {/* Qualifications */}
          {Array.isArray(tutor.qualifications) && tutor.qualifications.length > 0 && (<View style={styles.card}>
              <Text style={styles.sectionTitle}>🎓 Qualifications</Text>
              <View style={{ minHeight: 40, justifyContent: 'center' }}>
                {tutor.qualifications.map((q, i) => (<View key={i} style={styles.qualRow}>
                    {q.photo ? <Image source={{ uri: q.photo }} style={styles.qualPhoto}/> : null}
                    <Text style={styles.qualText}>{typeof q === 'string' ? q : (q.title || q.name || JSON.stringify(q))}</Text>
                  </View>))}
              </View>
            </View>)}

          {/* Reviews */}
          {Array.isArray(tutor.reviews) && tutor.reviews.length > 0 && (<View style={styles.card}>
              <Text style={styles.sectionTitle}>⭐ Student Reviews ({reviewCount})</Text>
              {tutor.reviews.map(r => {
                const reviewText = r.comment || r.review || r.text || r.body || '';
                const displayName = maskStudentName(r.studentName);
                return (
                  <View key={r.id || Math.random().toString()} style={styles.reviewRow}>
                    <View style={styles.reviewHeader}>
                      <View style={styles.reviewAvatar}><Text style={styles.reviewAvatarChar}>{displayName.charAt(0)}</Text></View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reviewName}>{displayName}</Text>
                        <StarRow rating={r.rating}/>
                      </View>
                      <Text style={styles.reviewDate}>{new Date(r.createdAt || Date.now()).toLocaleDateString()}</Text>
                    </View>
                    {reviewText ? <Text style={styles.reviewComment}>{reviewText}</Text> : null}
                  </View>
                );
              })}
            </View>)}
        </Animated.View>
      </ScrollView>



      <BookModal visible={bookModal} tutor={tutor} onClose={() => setBookModal(false)}/>
      <RatingPopup visible={ratingModal} tutor={tutor} onClose={() => setRatingModal(false)} onLeaveReview={() => { setRatingModal(false); setReviewModal(true); }}/>
      <ReviewModal visible={reviewModal} tutorId={tutor.id} onClose={() => setReviewModal(false)}/>
    </View>
    </PremiumBlurWrapper>);
}
const styles = StyleSheet.create({
    gradient: { flex: 1 },
    blobTopRight: { position: 'absolute', top: -80, right: -80, width: 280, height: 280, borderRadius: 140, backgroundColor: 'rgba(124,111,255,0.07)' },
    blobMidLeft: { position: 'absolute', top: '40%', left: -100, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(59,130,246,0.05)' },
    blobBottomRight: { position: 'absolute', bottom: -60, right: -60, width: 220, height: 220, borderRadius: 110, backgroundColor: 'rgba(124,111,255,0.06)' },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.md, paddingTop: 52, paddingBottom: 12, backgroundColor: 'transparent', zIndex: 200, position: 'relative' },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.glass, borderWidth: 1, borderColor: Colors.glassBorder, alignItems: 'center', justifyContent: 'center', zIndex: 2 },
    backIcon: { color: Colors.textPrimary, fontSize: 28, lineHeight: 32 },
    topBarTitle: { fontSize: 16, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center' },
    hero: { alignItems: 'center', paddingHorizontal: Spacing.md, paddingVertical: 20 },
    heroPhoto: { width: 90, height: 90, borderRadius: 45, marginBottom: 14, borderWidth: 2.5, borderColor: Colors.primary },
    heroAvatar: { width: 90, height: 90, borderRadius: 45, alignItems: 'center', justifyContent: 'center', marginBottom: 14, shadowColor: '#7C6FFF', shadowOpacity: 0.45, shadowRadius: 18, shadowOffset: { width: 0, height: 0 }, elevation: 12 },
    heroAvatarChar: { color: '#fff', fontSize: 34, fontWeight: '800' },
    heroName: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', letterSpacing: -0.5, marginBottom: 4 },
    heroLocation: { fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 10, fontWeight: '600' },
    ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
    ratingText: { color: 'rgba(255,255,255,0.72)', fontSize: 13 },
    badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'center' },
    badge: { borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5, borderWidth: 1, borderColor: Colors.glassBorder, backgroundColor: Colors.glass },
    badgeText: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600' },
    contactCard: { marginHorizontal: 16, marginBottom: 18, backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16 },
    contactInner: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    contactIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(34,197,94,0.18)', alignItems: 'center', justifyContent: 'center' },
    contactIconText: { fontSize: 16 },
    contactTextWrap: { flex: 1 },
    contactTitle: { color: '#fff', fontSize: 15, fontWeight: '700' },
    contactSubtitle: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
    card: { backgroundColor: 'rgba(255,255,255,0.10)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 16, marginHorizontal: 16, marginBottom: 18, padding: 16 },
    sectionTitle: { fontSize: 16, fontWeight: '800', color: '#fff', marginBottom: 12, letterSpacing: 0.2 },
    cardTitle: { fontSize: 15, fontWeight: '800', color: '#fff', marginBottom: 10, letterSpacing: 0.3 },
    cardBody: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 22 },
    videoThumb: { width: 56, height: 56, backgroundColor: '#0a0a0a', borderRadius: 14, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', alignItems: 'center', justifyContent: 'center' },
    videoBadge: { width: 32, height: 22, backgroundColor: '#FF0000', borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
    videoBadgeText: { color: '#fff', fontSize: 12, fontWeight: '700' },
    tagWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    subjectTag: { backgroundColor: 'rgba(124,111,255,0.16)', borderRadius: BorderRadius.md, paddingHorizontal: 14, paddingVertical: 8, borderWidth: 1, borderColor: 'rgba(124,111,255,0.28)' },
    subjectTagText: { color: Colors.primary, fontSize: 13, fontWeight: '700' },
    qualRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 12 },
    qualPhoto: { width: 48, height: 48, borderRadius: 10 },
    qualText: { color: Colors.textSecondary, fontSize: 14, flex: 1 },
    reviewRow: { marginBottom: 14, paddingBottom: 14, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' },
    reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    reviewAvatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(124,111,255,0.2)', alignItems: 'center', justifyContent: 'center' },
    reviewAvatarChar: { color: Colors.primary, fontWeight: '700', fontSize: 14 },
    reviewName: { color: Colors.textPrimary, fontWeight: '600', fontSize: 13 },
    reviewDate: { color: Colors.textMuted, fontSize: 11 },
    reviewComment: { color: Colors.textSecondary, fontSize: 13, lineHeight: 20, marginLeft: 46 },
    stickyBottom: { position: 'absolute', bottom: Platform.OS === 'ios' ? 28 : 18, left: 16, right: 16, borderRadius: 28, overflow: 'hidden', zIndex: 100 },
    bottomGlowBorder: { position: 'absolute', top: -1, left: -1, right: -1, bottom: -1, borderRadius: 29, borderWidth: 1, borderColor: 'rgba(124,111,255,0.18)', zIndex: 0 },
    bottomInner: { flexDirection: 'row', gap: 10, paddingHorizontal: 12, paddingVertical: 10, alignItems: 'center' },
    chatBtn: { width: 52, height: 48, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    chatBtnText: { fontSize: 18 },
    rateBtn: { width: 52, height: 48, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
    rateBtnText: { fontSize: 18 },
    bookBtn: { flex: 1 },
    bookBtnGrad: { borderRadius: 16, paddingVertical: 14, alignItems: 'center', justifyContent: 'center' },
    bookBtnText: { color: '#fff', fontWeight: '800', fontSize: 15, letterSpacing: 0.5 },
});
const ms = StyleSheet.create({
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.85)', justifyContent: 'center', padding: 20 },
    sheet: { backgroundColor: '#0f0a1e', borderRadius: 24, paddingHorizontal: Spacing.xl, paddingTop: 20, paddingBottom: 20, borderWidth: 1, borderColor: 'rgba(124,111,255,0.15)', maxHeight: '90%', display: 'flex', flexDirection: 'column', elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 16 },
    handle: { display: 'none' },
    title: { fontSize: 20, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: 4 },
    sub: { fontSize: 13, color: Colors.primary, textAlign: 'center', fontWeight: '600', marginBottom: 4 },
    price: { fontSize: 13, fontWeight: '700', color: '#22c55e', textAlign: 'center' },
    label: { color: Colors.textSecondary, fontSize: 12, fontWeight: '600', marginBottom: 6 },
    subjectDropdown: {
        height: 44,
        backgroundColor: Colors.inputBg || 'rgba(255,255,255,0.05)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.inputBorder || 'rgba(255,255,255,0.1)',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 14,
    },
    confirmBtn: { height: 52, borderRadius: BorderRadius.md, alignItems: 'center', justifyContent: 'center' },
    btnGrad: { borderRadius: BorderRadius.md, paddingVertical: 15, alignItems: 'center' },
    btnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
});
