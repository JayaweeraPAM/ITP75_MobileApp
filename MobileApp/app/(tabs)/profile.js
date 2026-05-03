import React, { useContext, useRef, useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated, Alert, TextInput, Image, ActivityIndicator, Modal, Pressable, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { BlurView } from 'expo-blur';
import { AuthContext } from '../../src/contexts/AuthContext';
import { Colors, BorderRadius, Spacing } from '../../constants/theme';
import { PremiumBlurWrapper } from '../../src/components/PremiumBlurWrapper';
import api from '../../src/services/api';
// Student-side profile (full editor with gallery photo)
function FrostedPanel({ children, style }) {
  return (<View style={[styles.frostedPanel, style]}>
    <BlurView intensity={100} experimentalBlurMethod="dimezisBlurView" tint="dark" style={StyleSheet.absoluteFill} />
    <View style={styles.frostedOverlay} />
    <View style={styles.frostedTopLine} />
    {children}
  </View>);
}
function StudentProfile({ user, profileData, setProfileData }) {
  var _a;
  const roleLabel = String((_a = user === null || user === void 0 ? void 0 : user.role) !== null && _a !== void 0 ? _a : 'student').trim().toUpperCase() || 'STUDENT';
  const context = useContext(AuthContext);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [photoUrl, setPhotoUrl] = useState((profileData === null || profileData === void 0 ? void 0 : profileData.photoUrl) || '');
  const [fullName, setFullName] = useState((profileData === null || profileData === void 0 ? void 0 : profileData.fullName) || '');
  const [contactNumber, setContactNumber] = useState((profileData === null || profileData === void 0 ? void 0 : profileData.contactNumber) || '');
  const [grade, setGrade] = useState((profileData === null || profileData === void 0 ? void 0 : profileData.grade) || '');
  const [age, setAge] = useState((profileData === null || profileData === void 0 ? void 0 : profileData.age) ? String(profileData.age) : '');
  const [parentName, setParentName] = useState((profileData === null || profileData === void 0 ? void 0 : profileData.parentName) || '');
  const [parentContact, setParentContact] = useState((profileData === null || profileData === void 0 ? void 0 : profileData.parentContact) || '');
  // Sync form fields whenever profileData loads/changes from parent
  useEffect(() => {
    if (profileData) {
      setPhotoUrl(profileData.photoUrl || '');
      setFullName(profileData.fullName || '');
      setContactNumber(profileData.contactNumber || '');
      setGrade(profileData.grade || '');
      setAge(profileData.age ? String(profileData.age) : '');
      setParentName(profileData.parentName || '');
      setParentContact(profileData.parentContact || '');
    }
  }, [profileData]);

  const [categoriesList, setCategoriesList] = useState([]);
  const [isGradeModalVisible, setIsGradeModalVisible] = useState(false);

  useEffect(() => {
    const fetchGrades = async () => {
      try {
        const res = await api.get('/subjects');
        if (res.data?.categories) {
          const list = res.data.categories.map(c => typeof c === 'object' ? c.label || c.value : String(c));
          setCategoriesList(list);
        } else {
          setCategoriesList(['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'Grade 13']);
        }
      } catch (e) {
        setCategoriesList(['Grade 1', 'Grade 2', 'Grade 3', 'Grade 4', 'Grade 5', 'Grade 6', 'Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12', 'Grade 13']);
      }
    };
    fetchGrades();
  }, []);

  const pickFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to upload a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true, aspect: [1, 1], quality: 0.85,
      base64: true,
    });
    if (!result.canceled && result.assets[0]) {
      // Use base64 data URI for local preview (or upload to server if available)
      const asset = result.assets[0];
      const dataUri = `data:image/jpeg;base64,${asset.base64}`;
      setPhotoUrl(dataUri);
    }
  };
  const validatePhone = (phone) => {
    if (!phone) return true;
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 9 && digits.length <= 11;
  };

  const handleSave = async () => {
    var _a, _b;
    if (contactNumber && !validatePhone(contactNumber)) {
      Alert.alert('Invalid Phone', 'Please enter a valid contact number (9-11 digits).');
      return;
    }
    if (parentContact && !validatePhone(parentContact)) {
      Alert.alert('Invalid Phone', 'Please enter a valid parent contact number (9-11 digits).');
      return;
    }
    try {
      setSaving(true);
      const res = await api.patch('/users/me', { fullName, contactNumber, grade, age: age || null, parentName, parentContact, photoUrl });
      Alert.alert('✅ Saved', 'Your profile has been updated.');
      setProfileData(res.data.user);
      setEditing(false);
    }
    catch (e) {
      Alert.alert('Failed', ((_b = (_a = e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) || 'Try again.');
    }
    finally {
      setSaving(false);
    }
  };
  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await (context === null || context === void 0 ? void 0 : context.logout()); router.replace('/(auth)/login'); } },
    ]);
  };
  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'Are you sure you want to delete your account? This action is permanent and cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete Account', style: 'destructive', onPress: async () => {
        try {
          await api.delete('/users/me');
          await (context === null || context === void 0 ? void 0 : context.logout());
          Alert.alert('Deleted', 'Your account has been deleted successfully.');
          router.replace('/(auth)/login');
        } catch (e) {
          Alert.alert('Failed', 'Failed to delete your account. Please try again.');
        }
      }},
    ]);
  };
  return (<>
    {/* Hero */}
    <View style={styles.hero}>
      <TouchableOpacity onPress={() => setEditing(true)} activeOpacity={0.85} style={{ marginBottom: 12 }}>
        {photoUrl ? (
          <Image source={{ uri: photoUrl }} style={styles.heroPhoto} />
        ) : (
          <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={styles.heroAvatar}>
            <Text style={styles.heroAvatarChar}>{((profileData?.fullName) || (user?.name) || 'S').charAt(0)}</Text>
          </LinearGradient>
        )}
      </TouchableOpacity>
      <Text style={styles.heroName}>{(profileData?.fullName) || (user?.name) || 'Student'}</Text>
      <Text style={styles.heroEmail}>{user?.email}</Text>
      <View style={styles.roleBadge}><Text style={styles.roleText}>{roleLabel}</Text></View>
    </View>

    {/* Info section */}
    {profileData && (
      <View style={styles.profileGrid}>
        {profileData.grade ? (
          <View style={[styles.profileCard, { backgroundColor: 'rgba(124,111,255,0.1)' }]}>
            <Text style={styles.profileCardEmoji}>🎓</Text>
            <Text style={[styles.profileCardLabel, { color: '#7C6FFF' }]}>Grade</Text>
            <Text style={styles.profileCardValue}>{profileData.grade}</Text>
          </View>
        ) : null}

        {profileData.age ? (
          <View style={[styles.profileCard, { backgroundColor: 'rgba(59,130,246,0.1)' }]}>
            <Text style={styles.profileCardEmoji}>🎂</Text>
            <Text style={[styles.profileCardLabel, { color: '#3b82f6' }]}>Age</Text>
            <Text style={styles.profileCardValue}>{profileData.age} yrs</Text>
          </View>
        ) : null}

        {profileData.contactNumber ? (
          <View style={[styles.profileCard, { backgroundColor: 'rgba(34,197,94,0.1)' }]}>
            <Text style={styles.profileCardEmoji}>📞</Text>
            <Text style={[styles.profileCardLabel, { color: '#22c55e' }]}>Contact</Text>
            <Text style={styles.profileCardValue} numberOfLines={1}>{profileData.contactNumber}</Text>
          </View>
        ) : null}

        {profileData.parentName ? (
          <View style={[styles.profileCard, { backgroundColor: 'rgba(234,179,8,0.1)' }]}>
            <Text style={styles.profileCardEmoji}>👨</Text>
            <Text style={[styles.profileCardLabel, { color: '#eab308' }]}>Parent Details</Text>
            <Text style={styles.profileCardValue} numberOfLines={2}>
              {profileData.parentName}
            </Text>
          </View>
        ) : null}
      </View>
    )}

    <Text style={[styles.sectionTitle, { marginTop: 12, opacity: 0.85 }]}>SETTINGS</Text>
    <FrostedPanel style={styles.menuGroup}>
      {[
        { icon: '📋', label: 'My Bookings', sub: 'View all sessions', onPress: () => router.push('/bookings') },
        { icon: '✏️', label: 'Edit Profile', sub: 'Update info & photo', onPress: () => setEditing(true) },
        { icon: '🏫', label: 'Institutes', sub: 'Browse and join institutes', onPress: () => router.push('/institutes') },
        { icon: '🚪', label: 'Sign Out', sub: 'Sign out of your account', onPress: handleLogout },
        { icon: '⚠️', label: 'Delete Account', sub: 'Permanently remove account', onPress: handleDeleteAccount, destructive: true },
      ].map((item, i, arr) => (
        <TouchableOpacity key={i} style={[styles.menuItem, i < arr.length - 1 && styles.menuDivider]} onPress={item.onPress} activeOpacity={0.75}>
          <View style={[styles.menuIcon, item.destructive && { backgroundColor: 'rgba(239,68,68,0.12)' }]}><Text style={{ fontSize: 16 }}>{item.icon}</Text></View>
          <View style={styles.menuText}>
            <Text style={[styles.menuLabel, item.destructive && { color: '#ff6b6b' }]}>{item.label}</Text>
            <Text style={styles.menuSub}>{item.sub}</Text>
          </View>
          <Text style={[styles.chevron, item.destructive && { color: 'rgba(239,68,68,0.4)' }]}>›</Text>
        </TouchableOpacity>
      ))}
    </FrostedPanel>
    <View style={{ height: 50 }} />

    {/* Edit Modal */}
    <Modal visible={editing} animationType="fade" transparent>
      <Pressable style={ms.overlay} onPress={() => setEditing(false)}>
        <Pressable style={ms.sheet} onPress={e => e.stopPropagation()}>
          <View style={ms.handle} />
          <Text style={ms.title}>Edit Profile</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Photo row */}
            <View style={ms.photoRow}>
              {photoUrl ? (<Image source={{ uri: photoUrl }} style={ms.photoPreview} />) : (<LinearGradient colors={['#7C6FFF', '#5B50E8']} style={[ms.photoPreview, { alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 24 }}>{((user === null || user === void 0 ? void 0 : user.name) || 'S').charAt(0)}</Text>
              </LinearGradient>)}
              <View style={{ flex: 1 }}>
                <TouchableOpacity onPress={pickFromGallery} style={ms.galleryBtn} activeOpacity={0.85}>
                  <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={ms.galleryBtnGrad}>
                    <Text style={ms.galleryBtnText}>📷 Choose from Gallery</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <Text style={ms.hint}>Or paste a photo URL below</Text>
                <TextInput style={ms.input} value={photoUrl} onChangeText={setPhotoUrl} placeholder="https://..." placeholderTextColor="rgba(140,140,190,0.4)" autoCapitalize="none" />
              </View>
            </View>
            <Text style={ms.label}>Full Name</Text>
            <TextInput style={ms.input} value={fullName} onChangeText={setFullName} placeholder="Your name" placeholderTextColor="rgba(140,140,190,0.4)" />
            <Text style={ms.label}>Contact Number</Text>
            <TextInput style={ms.input} value={contactNumber} onChangeText={setContactNumber} placeholder="+94 7X..." placeholderTextColor="rgba(140,140,190,0.4)" keyboardType="phone-pad" />
            <Text style={ms.label}>Grade</Text>
            <TouchableOpacity
              style={[ms.input, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
              onPress={() => setIsGradeModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={{ color: grade ? '#fff' : 'rgba(140,140,190,0.45)', fontSize: 15, fontWeight: '500' }}>
                {grade || 'Select Grade'}
              </Text>
              <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}>▼</Text>
            </TouchableOpacity>
            <Text style={ms.label}>Age</Text>
            <TextInput style={ms.input} value={age} onChangeText={setAge} placeholder="Your age" placeholderTextColor="rgba(140,140,190,0.4)" keyboardType="numeric" />
            <Text style={ms.label}>Parent’s Name</Text>
            <TextInput style={ms.input} value={parentName} onChangeText={setParentName} placeholder="Parent or guardian name" placeholderTextColor="rgba(140,140,190,0.4)" />
            <Text style={ms.label}>Parent’s Contact</Text>
            <TextInput style={ms.input} value={parentContact} onChangeText={setParentContact} placeholder="+94 7X..." placeholderTextColor="rgba(140,140,190,0.4)" keyboardType="phone-pad" />
            <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85} style={{ marginTop: 8, marginBottom: 4 }}>
              <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={ms.btnGrad}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={ms.btnText}>Save Changes</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>

    {/* Grade Selector Modal */}
    <Modal visible={isGradeModalVisible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <TouchableOpacity style={StyleSheet.absoluteFillObject} onPress={() => setIsGradeModalVisible(false)} />
        <View style={styles.modalSheet}>
          <Text style={styles.modalTitle}>Select Grade</Text>
          <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 350 }}>
            {categoriesList.map((g, idx) => (
              <TouchableOpacity key={idx} onPress={() => { setGrade(g); setIsGradeModalVisible(false); }} style={styles.modalOption}>
                <Text style={{ color: '#fff', fontSize: 16, fontWeight: '600' }}>{g}</Text>
                {grade === g && <View style={styles.modalCircle} />}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>);
}
// Tutor profile view + edit
function TutorProfile({ user }) {
  const context = useContext(AuthContext);
  const [tutorData, setTutorData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  // Editable fields
  const [bio, setBio] = useState('');
  const [location, setLocation] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [timetable, setTimetable] = useState('');
  const [introVideoUrl, setIntroVideoUrl] = useState('');
  const [meetingLink, setMeetingLink] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [fullName, setFullName] = useState('');
  const [subjects, setSubjects] = useState([]);
  const [classTypes, setClassTypes] = useState([]);
  const [classFormats, setClassFormats] = useState([]);

  const [showSubjectsModal, setShowSubjectsModal] = useState(false);
  const [showClassTypesModal, setShowClassTypesModal] = useState(false);
  const [showClassFormatsModal, setShowClassFormatsModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [subscriptionHistory, setSubscriptionHistory] = useState([]);
  const [dbSubjectsList, setDbSubjectsList] = useState([]);

  const loadSubscriptionHistory = async () => {
    try {
      if (user?.id) {
        const res = await api.get(`/subscription/${user.id}`);
        if (res && res.data && res.data.subscription) {
          setSubscriptionHistory(res.data.subscription.history || []);
        } else {
          setSubscriptionHistory([]);
        }
      }
    } catch (err) {
      console.error('Failed to load subscription history', err);
    }
  };

  useEffect(() => {
    api.get('/subjects').then(res => {
      const categories = res.data.categories || [];
      const byCat = res.data.subjectsByCategory || {};
      let list = [];
      categories.forEach(c => {
        const subs = byCat[c.value] || [];
        subs.forEach(s => {
          list.push({ label: `${c.label} - ${s}`, subject: s, category: c.value, mediums: ['english'] });
        });
      });
      setDbSubjectsList(list);
    }).catch(() => { });
  }, []);
  const loadProfile = async () => {
    try {
      const res = await api.get('/tutors/me/profile');
      const t = res.data.profile || {};
      setTutorData(t);
      setBio(t.bio || '');
      setLocation(t.location || '');
      setContactPhone(t.contactPhone || '');
      setHourlyRate(t.hourlyRate != null ? String(t.hourlyRate) : '');
      setTimetable(t.timetable || '');
      setIntroVideoUrl(t.introVideoUrl || '');
      setMeetingLink(t.meetingLink || '');
      setPhotoUrl(t.photoUrl || '');
      setFullName(t.fullName || t.name || '');
      setSubjects(t.subjects || []);
      setClassTypes(t.classTypes || []);
      setClassFormats(t.classFormats || []);
      await loadSubscriptionHistory();
    }
    catch (e) { console.error('Failed to load profile', e); }
    finally {
      setLoading(false);
    }
  };
  useEffect(() => { loadProfile(); }, []);
  // Re-sync edit fields whenever profile data reloads
  useEffect(() => {
    if (tutorData) {
      setBio(tutorData.bio || '');
      setLocation(tutorData.location || '');
      setContactPhone(tutorData.contactPhone || '');
      setHourlyRate(tutorData.hourlyRate != null ? String(tutorData.hourlyRate) : '');
      setTimetable(tutorData.timetable || '');
      setIntroVideoUrl(tutorData.introVideoUrl || '');
      setMeetingLink(tutorData.meetingLink || '');
      setPhotoUrl(tutorData.photoUrl || '');
      setFullName(tutorData.fullName || tutorData.name || '');
      setSubjects(tutorData.subjects || []);
      setClassTypes(tutorData.classTypes || []);
      setClassFormats(tutorData.classFormats || []);
    }
  }, [tutorData]);
  const pickPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to upload a profile photo.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.85, base64: true });
    if (!result.canceled && result.assets[0]) {
      const dataUri = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setPhotoUrl(dataUri);
    }
  };
  const handleSave = async () => {
    var _a, _b;
    try {
      setSaving(true);
      const tutorId = user._id || user.id;

      await api.put('/tutors/profile', {
        name: fullName,
        bio, location, contactPhone, hourlyRate: parseFloat(hourlyRate) || 0, timetable, introVideoUrl, meetingLink, photoUrl,
        subjects,
        classTypes,
        classFormats
      });
      Alert.alert('✅ Saved', 'Your profile has been updated.');
      loadProfile();
      setEditMode(false);
    }
    catch (e) {
      Alert.alert('Failed', ((_b = (_a = e.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) || 'Try again.');
    }
    finally {
      setSaving(false);
    }
  };
  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await (context === null || context === void 0 ? void 0 : context.logout()); router.replace('/(auth)/login'); } },
    ]);
  };
  const handleDeleteHistory = async (index) => {
    Alert.alert('Delete History', 'Are you sure you want to delete this subscription history record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        try {
          await api.delete(`/subscription/history/${index}`);
          await loadSubscriptionHistory();
          Alert.alert('Success', 'History record deleted.');
        } catch (err) {
          Alert.alert('Failed', 'Failed to delete history record.');
        }
      }}
    ]);
  };
  const handleClearRejectedHistory = async () => {
    Alert.alert('Clear History', 'Clear all rejected history records?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => {
        try {
          await api.delete('/subscription/history/rejected/clear');
          await loadSubscriptionHistory();
          Alert.alert('Success', 'Rejected history cleared.');
        } catch (err) {
          Alert.alert('Failed', 'Failed to clear history.');
        }
      }}
    ]);
  };
  const handleDeleteAccount = () => {
    Alert.alert('Delete Account', 'Are you sure you want to delete your account? This action is permanent and cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete Account', style: 'destructive', onPress: async () => {
        try {
          await api.delete('/users/me');
          await (context === null || context === void 0 ? void 0 : context.logout());
          Alert.alert('Deleted', 'Your account has been deleted successfully.');
          router.replace('/(auth)/login');
        } catch (e) {
          Alert.alert('Failed', 'Failed to delete your account. Please try again.');
        }
      }},
    ]);
  };
  if (loading)
    return (<View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>);
  const displaySubjects = ((tutorData === null || tutorData === void 0 ? void 0 : tutorData.subjects) || []).map((s) => typeof s === 'object' ? s.subject : s);
  return (<View style={{ flex: 1 }}>
    {/* Hero */}
    <View style={styles.hero}>
      <TouchableOpacity onPress={() => setEditMode(true)} activeOpacity={0.85}>
        {(tutorData === null || tutorData === void 0 ? void 0 : tutorData.photoUrl) ? (<Image source={{ uri: tutorData.photoUrl }} style={styles.heroPhoto} />) : (<LinearGradient colors={['#7C6FFF', '#5B50E8']} style={styles.heroAvatar}>
          <Text style={styles.heroAvatarChar}>{((tutorData === null || tutorData === void 0 ? void 0 : tutorData.fullName) || (user === null || user === void 0 ? void 0 : user.name) || 'T').charAt(0)}</Text>
        </LinearGradient>)}
        <View style={styles.editPhotoBadge}><Text style={{ color: '#fff', fontSize: 10, fontWeight: '700' }}>EDIT</Text></View>
      </TouchableOpacity>
      <Text style={styles.heroName}>{(tutorData === null || tutorData === void 0 ? void 0 : tutorData.fullName) || (tutorData === null || tutorData === void 0 ? void 0 : tutorData.name) || (user === null || user === void 0 ? void 0 : user.name) || 'Tutor'}</Text>
      <Text style={styles.heroEmail}>{user === null || user === void 0 ? void 0 : user.email}</Text>
      <View style={[styles.roleBadge, { borderColor: 'rgba(34,197,94,0.25)', backgroundColor: 'rgba(34,197,94,0.1)' }]}>
        <Text style={[styles.roleText, { color: '#22c55e' }]}>✓ TUTOR</Text>
      </View>
      {(tutorData === null || tutorData === void 0 ? void 0 : tutorData.avgRating) > 0 && (<View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8 }}>
        <Text style={{ color: '#f59e0b', fontSize: 16 }}>{'★'.repeat(Math.round(tutorData.avgRating))}</Text>
        <Text style={{ color: Colors.textMuted, fontSize: 13 }}>{tutorData.avgRating.toFixed(1)} ({tutorData.ratingCount} reviews)</Text>
      </View>)}
    </View>

    {/* Profile details */}
    {tutorData && (
      <FrostedPanel style={styles.infoSection}>
        <View style={{ padding: 18, gap: 14 }}>
          {tutorData.hourlyRate != null ? (
            <View style={styles.groupedInfoRow}>
              <Text style={{ fontSize: 16 }}>💰</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.groupedInfoLabel}>HOURLY RATE</Text>
                <Text style={styles.groupedInfoValue}>LKR {tutorData.hourlyRate}/hr</Text>
              </View>
            </View>
          ) : null}

          {tutorData.location ? (
            <View style={styles.groupedInfoRow}>
              <Text style={{ fontSize: 16 }}>📍</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.groupedInfoLabel}>LOCATION</Text>
                <Text style={styles.groupedInfoValue}>{tutorData.location}</Text>
              </View>
            </View>
          ) : null}

          {tutorData.contactPhone ? (
            <View style={styles.groupedInfoRow}>
              <Text style={{ fontSize: 16 }}>📞</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.groupedInfoLabel}>CONTACT</Text>
                <Text style={styles.groupedInfoValue}>{tutorData.contactPhone}</Text>
              </View>
            </View>
          ) : null}

          {displaySubjects.length > 0 ? (
            <View style={styles.groupedInfoRow}>
              <Text style={{ fontSize: 16 }}>📚</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.groupedInfoLabel}>SUBJECTS</Text>
                <Text style={styles.groupedInfoValue}>{displaySubjects.slice(0, 3).join(', ')}</Text>
              </View>
            </View>
          ) : null}

          {tutorData.meetingLink ? (
            <View style={styles.groupedInfoRow}>
              <Text style={{ fontSize: 16 }}>🔗</Text>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.groupedInfoLabel}>MEETING LINK</Text>
                <Text style={[styles.groupedInfoValue, { color: '#60a5fa' }]} numberOfLines={1}>{tutorData.meetingLink}</Text>
              </View>
            </View>
          ) : null}
        </View>
      </FrostedPanel>
    )}

    {tutorData?.bio ? (
      <FrostedPanel style={[styles.infoSection, { marginTop: 12 }]}>
        <View style={{ padding: 18 }}>
          <Text style={styles.groupedInfoLabel}>BIO / EXPERIENCE</Text>
          <Text style={[styles.cardBody, { marginTop: 4, color: '#fff', fontSize: 14, lineHeight: 21 }]}>{tutorData.bio}</Text>
        </View>
      </FrostedPanel>
    ) : null}

    <Text style={[styles.sectionTitle, { marginTop: 12, opacity: 0.85 }]}>SETTINGS</Text>
    <FrostedPanel style={styles.menuGroup}>
      {[
        { icon: '📊', label: 'Bookings', sub: 'Bookings, earnings & sessions', onPress: () => router.push('/bookings') },
        { icon: '✏️', label: 'Edit Profile', sub: 'Bio, subjects, photo, rates', onPress: () => setEditMode(true) },
        { icon: '💎', label: 'Subscription', sub: 'Manage trial and paid plans', onPress: () => router.push('/subscription') },
        { icon: '📜', label: 'History', sub: 'Past subscription plans', onPress: () => { loadSubscriptionHistory(); setShowHistoryModal(true); } },
        { icon: '🏫', label: 'Institutes', sub: 'Manage institute requests', onPress: () => router.push('/institutes') },
        { icon: '🚪', label: 'Sign Out', sub: 'Sign out of your account', onPress: handleLogout },
        { icon: '⚠️', label: 'Delete Account', sub: 'Permanently remove account', onPress: handleDeleteAccount, destructive: true },
      ].map((item, i, arr) => (<TouchableOpacity key={i} style={[styles.menuItem, i < arr.length - 1 && styles.menuDivider]} onPress={item.onPress} activeOpacity={0.75}>
        <View style={[styles.menuIcon, item.destructive && { backgroundColor: 'rgba(239,68,68,0.12)' }]}><Text style={{ fontSize: 16 }}>{item.icon}</Text></View>
        <View style={styles.menuText}>
          <Text style={[styles.menuLabel, item.destructive && { color: '#ff6b6b' }]}>{item.label}</Text>
          <Text style={styles.menuSub}>{item.sub}</Text>
        </View>
        <Text style={[styles.chevron, item.destructive && { color: 'rgba(239,68,68,0.4)' }]}>›</Text>
      </TouchableOpacity>))}
    </FrostedPanel>
    <View style={{ height: 40 }} />

    {/* Subscription History Popup Modal */}
    <Modal visible={showHistoryModal} animationType="slide" transparent>
      <Pressable style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'center', padding: 20 }} onPress={() => setShowHistoryModal(false)}>
        <Pressable style={{ backgroundColor: '#0c0721', borderRadius: 28, padding: 24, borderWidth: 1, borderColor: 'rgba(124,111,255,0.22)', height: '82%', width: '100%', elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 12 }, shadowOpacity: 0.6, shadowRadius: 20, overflow: 'hidden' }} onPress={e => e.stopPropagation()}>
          <View style={{ width: 44, height: 5, borderRadius: 2.5, backgroundColor: 'rgba(255,255,255,0.15)', alignSelf: 'center', marginBottom: 20 }} />
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <View style={{ flex: 1, minWidth: 150 }}>
              <Text style={{ fontSize: 20, fontWeight: '900', color: '#fff', letterSpacing: -0.5 }} numberOfLines={1}>📜 Subscription History</Text>
              <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>Past and active plans</Text>
            </View>
            {subscriptionHistory && subscriptionHistory.length > 0 && (
              <TouchableOpacity onPress={handleClearRejectedHistory} activeOpacity={0.7} style={{ backgroundColor: 'rgba(239,68,68,0.1)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.25)', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 }}>
                <Text style={{ color: '#ff6b6b', fontSize: 12, fontWeight: '800' }}>Clear Rejected</Text>
              </TouchableOpacity>
            )}
          </View>
          <ScrollView showsVerticalScrollIndicator={false} style={{ marginTop: 6 }} contentContainerStyle={{ paddingBottom: 16 }}>
            {subscriptionHistory && subscriptionHistory.length > 0 ? (
              subscriptionHistory.map((h, index) => {
                const isRejected = h.status === 'cancelled' || h.status === 'rejected' || h.status === 'declined';
                return (
                  <View key={index} style={{ marginBottom: 14, padding: 18, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.03)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.06)' }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={{ color: '#fff', fontSize: 17, fontWeight: '800', textTransform: 'capitalize' }}>
                        {h.plan} Plan
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: isRejected ? 'rgba(239,68,68,0.12)' : 'rgba(52,211,153,0.12)', borderWidth: 1, borderColor: isRejected ? 'rgba(239,68,68,0.3)' : 'rgba(52,211,153,0.3)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isRejected ? '#ef4444' : '#10b981', marginRight: 6 }} />
                        <Text style={{ color: isRejected ? '#ff6b6b' : '#34d399', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' }}>
                          {h.status}
                        </Text>
                      </View>
                    </View>

                    <Text style={{ color: 'rgba(255,255,255,0.45)', fontSize: 13, marginTop: 6, fontWeight: '500' }}>
                      🗓️ {new Date(h.startedAt).toLocaleDateString()} to {new Date(h.expiresAt).toLocaleDateString()}
                    </Text>

                    <TouchableOpacity onPress={() => handleDeleteHistory(index)} activeOpacity={0.8} style={{ alignSelf: 'flex-start', marginTop: 14, backgroundColor: 'rgba(239,68,68,0.08)', borderWidth: 1, borderColor: 'rgba(239,68,68,0.22)', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 }}>
                      <Text style={{ color: '#ff6b6b', fontSize: 12, fontWeight: '700' }}>Delete Record</Text>
                    </TouchableOpacity>
                  </View>
                );
              })
            ) : (
              <View style={{ padding: 24, alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.02)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)', borderRadius: 20, marginVertical: 12 }}>
                <Text style={{ fontSize: 28, marginBottom: 8 }}>📭</Text>
                <Text style={{ color: 'rgba(255,255,255,0.4)', fontSize: 14, fontWeight: '600' }}>No history records found.</Text>
              </View>
            )}
          </ScrollView>
          <TouchableOpacity style={{ marginTop: 8, borderRadius: 16, overflow: 'hidden' }} onPress={() => setShowHistoryModal(false)} activeOpacity={0.85}>
            <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={{ padding: 15, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16, letterSpacing: 0.3 }}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>

    {/* Tutor Edit Modal */}
    <Modal visible={editMode} animationType="fade" transparent>
      <Pressable style={ms.overlay} onPress={() => setEditMode(false)}>
        <Pressable style={ms.sheet} onPress={e => e.stopPropagation()}>
          <View style={ms.handle} />
          <Text style={ms.title}>Edit Tutor Profile</Text>
          <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* Photo */}
            <View style={ms.photoRow}>
              {photoUrl ? (<Image source={{ uri: photoUrl }} style={ms.photoPreview} />) : (<LinearGradient colors={['#7C6FFF', '#5B50E8']} style={[ms.photoPreview, { alignItems: 'center', justifyContent: 'center' }]}>
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 24 }}>{((user === null || user === void 0 ? void 0 : user.name) || 'T').charAt(0)}</Text>
              </LinearGradient>)}
              <View style={{ flex: 1 }}>
                <TouchableOpacity onPress={pickPhoto} style={ms.galleryBtn} activeOpacity={0.85}>
                  <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={ms.galleryBtnGrad}>
                    <Text style={ms.galleryBtnText}>📷 Choose from Gallery</Text>
                  </LinearGradient>
                </TouchableOpacity>
                <Text style={ms.hint}>Or paste a URL below</Text>
                <TextInput style={ms.input} value={photoUrl} onChangeText={setPhotoUrl} placeholder="https://..." placeholderTextColor="rgba(140,140,190,0.4)" autoCapitalize="none" />
              </View>
            </View>
            <Text style={ms.label}>Full Name</Text>
            <TextInput style={ms.input} value={fullName} onChangeText={setFullName} placeholder="Your display name" placeholderTextColor="rgba(140,140,190,0.4)" />
            <Text style={ms.label}>Bio</Text>
            <TextInput style={[ms.input, { height: 90, textAlignVertical: 'top' }]} value={bio} onChangeText={setBio} placeholder="Tell students about yourself..." placeholderTextColor="rgba(140,140,190,0.4)" multiline />
            <Text style={ms.label}>Hourly Rate (LKR)</Text>
            <TextInput style={ms.input} value={hourlyRate} onChangeText={setHourlyRate} placeholder="E.g. 1500" placeholderTextColor="rgba(140,140,190,0.4)" keyboardType="numeric" />
            <Text style={ms.label}>Location</Text>
            <TextInput style={ms.input} value={location} onChangeText={setLocation} placeholder="City or area" placeholderTextColor="rgba(140,140,190,0.4)" />
            <Text style={ms.label}>Contact Phone</Text>
            <TextInput style={ms.input} value={contactPhone} onChangeText={setContactPhone} placeholder="+94 7X..." placeholderTextColor="rgba(140,140,190,0.4)" keyboardType="phone-pad" />
            <Text style={ms.label}>Available Time Slots</Text>
            <TextInput style={[ms.input, { height: 70, textAlignVertical: 'top' }]} value={timetable} onChangeText={setTimetable} placeholder="Mon–Fri 4pm–8pm..." placeholderTextColor="rgba(140,140,190,0.4)" multiline />
            <Text style={ms.label}>Demo Video URL (YouTube)</Text>
            <TextInput style={ms.input} value={introVideoUrl} onChangeText={setIntroVideoUrl} placeholder="https://youtube.com/..." placeholderTextColor="rgba(140,140,190,0.4)" autoCapitalize="none" />
            <Text style={ms.label}>Online Meeting Link</Text>
            <TextInput style={ms.input} value={meetingLink} onChangeText={setMeetingLink} placeholder="https://meet.google.com/..." placeholderTextColor="rgba(140,140,190,0.4)" autoCapitalize="none" />

            <Text style={ms.label}>Subjects</Text>
            <TouchableOpacity style={ms.input} onPress={() => setShowSubjectsModal(true)}>
              <Text style={{ color: subjects.length ? '#fff' : 'rgba(140,140,190,0.4)' }}>
                {subjects.length ? subjects.map(s => typeof s === 'object' ? s.subject : s).join(', ') : 'Select Subjects...'}
              </Text>
            </TouchableOpacity>

            <Text style={ms.label}>Class Types</Text>
            <TouchableOpacity style={ms.input} onPress={() => setShowClassTypesModal(true)}>
              <Text style={{ color: classTypes.length ? '#fff' : 'rgba(140,140,190,0.4)' }}>
                {classTypes.length ? classTypes.join(', ') : 'Select Class Types...'}
              </Text>
            </TouchableOpacity>

            <Text style={ms.label}>Class Formats</Text>
            <TouchableOpacity style={ms.input} onPress={() => setShowClassFormatsModal(true)}>
              <Text style={{ color: classFormats.length ? '#fff' : 'rgba(140,140,190,0.4)' }}>
                {classFormats.length ? classFormats.join(', ') : 'Select Class Formats...'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity onPress={handleSave} disabled={saving} activeOpacity={0.85} style={{ marginTop: 16, marginBottom: 40 }}>
              <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={ms.btnGrad}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={ms.btnText}>Save Changes</Text>}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
    {/* Subjects Selection Modal */}
    <Modal visible={showSubjectsModal} animationType="slide" transparent>
      <Pressable style={ms.overlay} onPress={() => setShowSubjectsModal(false)}>
        <Pressable style={[ms.sheet, { height: '80%' }]} onPress={e => e.stopPropagation()}>
          <View style={ms.handle} />
          <Text style={ms.title}>Select Subjects</Text>
          <ScrollView style={{ marginTop: 10 }}>
            {dbSubjectsList.map((item, idx) => {
              const isSelected = subjects.some(s => (typeof s === 'object' ? s.subject : s) === item.subject);
              return (
                <TouchableOpacity key={idx} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}
                  onPress={() => {
                    if (isSelected) setSubjects(subjects.filter(s => (typeof s === 'object' ? s.subject : s) !== item.subject));
                    else setSubjects([...subjects, item]);
                  }}>
                  <Text style={{ flex: 1, color: '#fff', fontSize: 16 }}>{item.label}</Text>
                  {isSelected && <Text style={{ color: '#22c55e', fontSize: 18 }}>✓</Text>}
                </TouchableOpacity>
              )
            })}
          </ScrollView>
          <TouchableOpacity style={{ marginTop: 16, borderRadius: 12, overflow: 'hidden' }} onPress={() => setShowSubjectsModal(false)} activeOpacity={0.85}>
            <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={{ padding: 14, alignItems: 'center' }}>
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Done</Text>
            </LinearGradient>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>

    {/* Class Types Selection Modal */}
    <Modal visible={showClassTypesModal} animationType="slide" transparent>
      <Pressable style={ms.overlay} onPress={() => setShowClassTypesModal(false)}>
        <Pressable style={ms.sheet} onPress={e => e.stopPropagation()}>
          <View style={ms.handle} />
          <Text style={ms.title}>Select Class Types</Text>
          <View style={{ marginTop: 10 }}>
            {[{ value: 'online', label: 'Online' }, { value: 'physical', label: 'Physical' }].map((item, idx) => {
              const isSelected = classTypes.includes(item.value);
              return (
                <TouchableOpacity key={idx} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}
                  onPress={() => {
                    if (isSelected) setClassTypes(classTypes.filter(t => t !== item.value));
                    else setClassTypes([...classTypes, item.value]);
                  }}>
                  <Text style={{ flex: 1, color: '#fff', fontSize: 16 }}>{item.label}</Text>
                  {isSelected && <Text style={{ color: '#22c55e', fontSize: 18 }}>✓</Text>}
                </TouchableOpacity>
              )
            })}
          </View>
          <TouchableOpacity style={{ marginTop: 16, borderRadius: 12, overflow: 'hidden' }} onPress={() => setShowClassTypesModal(false)} activeOpacity={0.85}><LinearGradient colors={['#7C6FFF', '#5B50E8']} style={{ padding: 14, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Done</Text></LinearGradient></TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>

    {/* Class Formats Selection Modal */}
    <Modal visible={showClassFormatsModal} animationType="slide" transparent>
      <Pressable style={ms.overlay} onPress={() => setShowClassFormatsModal(false)}>
        <Pressable style={ms.sheet} onPress={e => e.stopPropagation()}>
          <View style={ms.handle} />
          <Text style={ms.title}>Select Class Formats</Text>
          <View style={{ marginTop: 10 }}>
            {[{ value: 'individual', label: 'Individual (1-on-1)' }, { value: 'group', label: 'Group Class' }].map((item, idx) => {
              const isSelected = classFormats.includes(item.value);
              return (
                <TouchableOpacity key={idx} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.05)' }}
                  onPress={() => {
                    if (isSelected) setClassFormats(classFormats.filter(f => f !== item.value));
                    else setClassFormats([...classFormats, item.value]);
                  }}>
                  <Text style={{ flex: 1, color: '#fff', fontSize: 16 }}>{item.label}</Text>
                  {isSelected && <Text style={{ color: '#22c55e', fontSize: 18 }}>✓</Text>}
                </TouchableOpacity>
              )
            })}
          </View>
          <TouchableOpacity style={{ marginTop: 16, borderRadius: 12, overflow: 'hidden' }} onPress={() => setShowClassFormatsModal(false)} activeOpacity={0.85}><LinearGradient colors={['#7C6FFF', '#5B50E8']} style={{ padding: 14, alignItems: 'center' }}><Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>Done</Text></LinearGradient></TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  </View>);
}
function InstituteSettingsScreen({ user }) {
  const context = useContext(AuthContext);
  const [institute, setInstitute] = useState(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    location: '',
    photo: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      const res = await api.get('/institutes/my-institute').catch(() => null);
      if (res && res.data && res.data.institute) {
        setInstitute(res.data.institute);
        setForm({
          name: res.data.institute.name || '',
          description: res.data.institute.description || '',
          location: res.data.institute.location || '',
          photo: res.data.institute.photo || '',
        });
      }
    } catch (err) {
      console.warn('Failed to load institute settings', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async () => {
    if (!institute) return;
    setSaving(true);
    try {
      const id = institute.id || institute._id;
      await api.put(`/institutes/${id}`, form);
      Alert.alert('Success', 'Institute details updated successfully!');
      loadData();
    } catch (e) {
      Alert.alert('Error', e?.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: async () => { await context?.logout(); router.replace('/(auth)/login'); } },
    ]);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#06040f' }}>
        <ActivityIndicator color="#10B981" size="large" />
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 15, marginTop: 12 }}>Loading settings...</Text>
      </View>
    );
  }

  return (
    <PremiumBlurWrapper>
      <View style={{ flex: 1, backgroundColor: '#06040f', paddingTop: Platform.OS === 'ios' ? 60 : 44 }}>
        {/* Ambient green blobs */}
        <View style={{ position: 'absolute', top: -80, right: -100, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(16,185,129,0.12)' }} />
        <View style={{ position: 'absolute', bottom: 200, left: -80, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(5,150,105,0.07)' }} />

        <View style={{ paddingHorizontal: 16, marginBottom: 16, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <View>
            <Text style={{ fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 }}>⚙️ Settings</Text>
            <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)', marginTop: 2 }}>Edit your institute profile & manage session</Text>
          </View>
          <TouchableOpacity onPress={handleLogout} style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: 'rgba(239, 68, 68, 0.15)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontSize: 16 }}>🚪</Text>
          </TouchableOpacity>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16 }}>
          <View style={{ gap: 16, marginTop: 4 }}>
            <View style={{ gap: 4 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' }}>Institute Name</Text>
              <TextInput
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#fff' }}
                value={form.name}
                onChangeText={(v) => setForm(f => ({ ...f, name: v }))}
                placeholder="Enter Institute Name"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' }}>Description</Text>
              <TextInput
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#fff', height: 100, textAlignVertical: 'top' }}
                value={form.description}
                onChangeText={(v) => setForm(f => ({ ...f, description: v }))}
                placeholder="Tell us about the institute"
                placeholderTextColor="rgba(255,255,255,0.3)"
                multiline
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' }}>Location</Text>
              <TextInput
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#fff' }}
                value={form.location}
                onChangeText={(v) => setForm(f => ({ ...f, location: v }))}
                placeholder="e.g. Online, Colombo 03"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
            </View>

            <View style={{ gap: 4 }}>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '600' }}>Logo URL</Text>
              <TextInput
                style={{ backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', borderRadius: 14, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#fff' }}
                value={form.photo}
                onChangeText={(v) => setForm(f => ({ ...f, photo: v }))}
                placeholder="e.g. https://example.com/logo.png"
                placeholderTextColor="rgba(255,255,255,0.3)"
              />
            </View>

            <TouchableOpacity
              onPress={handleSaveSettings}
              disabled={saving}
              style={{ marginTop: 8 }}
              activeOpacity={0.85}
            >
              <LinearGradient colors={['#10B981', '#059669']} style={{ borderRadius: 14, paddingVertical: 15, alignItems: 'center' }}>
                {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>Save Changes</Text>}
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                Alert.alert('Delete Account', 'Are you sure you want to delete your account? This action is permanent and cannot be undone.', [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Delete Account', style: 'destructive', onPress: async () => {
                    try {
                      await api.delete('/users/me');
                      await (context === null || context === void 0 ? void 0 : context.logout());
                      Alert.alert('Deleted', 'Your account has been deleted successfully.');
                      router.replace('/(auth)/login');
                    } catch (e) {
                      Alert.alert('Failed', 'Failed to delete your account. Please try again.');
                    }
                  }},
                ]);
              }}
              style={{ marginTop: 12, borderWidth: 1, borderColor: 'rgba(239,68,68,0.3)', borderRadius: 14, backgroundColor: 'rgba(239,68,68,0.1)', paddingVertical: 15, alignItems: 'center' }}
              activeOpacity={0.85}
            >
              <Text style={{ color: '#ff6b6b', fontSize: 15, fontWeight: '700' }}>⚠️ Delete Account</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>
    </PremiumBlurWrapper>
  );
}

// ── MAIN EXPORT ──────────────────────────────────────
export default function ProfileScreen() {
  var _a;
  const context = useContext(AuthContext);
  const user = context === null || context === void 0 ? void 0 : context.user;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const [profileData, setProfileData] = useState(null);
  const [tutorData, setTutorData] = useState(null);
  const role = String((_a = user === null || user === void 0 ? void 0 : user.role) !== null && _a !== void 0 ? _a : '').trim().toLowerCase();

  useFocusEffect(React.useCallback(() => {
    fadeAnim.setValue(0);
    Animated.timing(fadeAnim, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    if (role === 'student') {
      api.get('/users/me').then(res => setProfileData(res.data.user)).catch(() => { });
    } else if (role === 'tutor') {
      api.get('/tutors/me/profile').then(res => setTutorData(res.data.profile)).catch(() => { });
    }
  }, [role]));

  const bgPhotoUrl = null;

  if (role === 'institute_manager') {
    return <InstituteSettingsScreen user={user} />;
  }

  return (<PremiumBlurWrapper>
    <View style={[styles.gradient, { flex: 1 }]}>
      <LinearGradient colors={['#06040f', '#0d0920', '#06040f']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.blob1} />
      <View style={styles.blob2} />
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 60 }}>
        <Animated.View style={{ opacity: fadeAnim }}>
          {role.includes('tutor') ? (<TutorProfile user={user} />) : role === 'student' ? (<StudentProfile user={user} profileData={profileData} setProfileData={setProfileData} />) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 60, paddingHorizontal: 32 }}>
              <Text style={{ fontSize: 48, marginBottom: 16 }}>🔒</Text>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 8, textAlign: 'center' }}>Access Restricted</Text>
              <Text style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, textAlign: 'center', lineHeight: 22 }}>This role is managed from the web platform. Please log in as a student or tutor to access profile settings.</Text>
            </View>
          )}
          <Text style={styles.version}>TutorHub Mobile v1.0</Text>
        </Animated.View>
      </ScrollView>
    </View>
  </PremiumBlurWrapper>);
}
const styles = StyleSheet.create({
  frostedPanel: {
    overflow: 'hidden',
    backgroundColor: 'rgba(45, 4, 141, 0.81)',
    borderWidth: 0,
    borderColor: 'rgba(38, 0, 255, 0.6)',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  frostedOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(255, 255, 255, 0.05)' },
  frostedTopLine: { position: 'absolute', top: 0, left: 0, right: 0, height: 1, backgroundColor: 'rgba(255,255,255,0.3)' },
  gradient: { flex: 1 },
  blob1: { position: 'absolute', top: -80, right: -100, width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(124,111,255,0.12)' },
  blob2: { position: 'absolute', bottom: 200, left: -80, width: 240, height: 240, borderRadius: 120, backgroundColor: 'rgba(59,130,246,0.07)' },
  blobBL: { position: 'absolute', bottom: -60, left: -80, width: 260, height: 260, borderRadius: 130, backgroundColor: 'rgba(100,60,220,0.1)' },
  hero: { alignItems: 'center', paddingTop: Spacing.xxl + 10, paddingBottom: Spacing.lg },
  heroPhoto: { width: 84, height: 84, borderRadius: 42, borderWidth: 3, borderColor: Colors.primary },
  heroAvatar: { width: 84, height: 84, borderRadius: 42, alignItems: 'center', justifyContent: 'center', shadowColor: '#7C6FFF', shadowOpacity: 0.6, shadowRadius: 24, shadowOffset: { width: 0, height: 0 }, elevation: 14 },
  heroAvatarChar: { color: '#fff', fontSize: 32, fontWeight: '800' },
  editPhotoBadge: { position: 'absolute', bottom: 0, right: 0, backgroundColor: Colors.primary, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 3, borderWidth: 2, borderColor: '#06040f' },
  heroName: { fontSize: 24, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5, marginTop: 12, marginBottom: 4 },
  heroEmail: { fontSize: 13, color: Colors.textSecondary, marginBottom: 10 },
  roleBadge: { backgroundColor: 'rgba(124,111,255,0.1)', borderRadius: 20, paddingHorizontal: 14, paddingVertical: 5, borderWidth: 1, borderColor: 'rgba(124,111,255,0.22)' },
  roleText: { color: Colors.primary, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  infoSection: { marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg, marginBottom: Spacing.sm },
  groupedInfoRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.08)', padding: 12, borderRadius: 12 },
  groupedInfoLabel: { fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: '700', letterSpacing: 0.8, marginBottom: 2 },
  groupedInfoValue: { fontSize: 15, color: '#fff', fontWeight: '700' },
  cardBody: { color: Colors.textSecondary, fontSize: 14, lineHeight: 21 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, paddingHorizontal: Spacing.lg, marginTop: Spacing.md, marginBottom: 8, letterSpacing: 1, textTransform: 'uppercase' },
  menuGroup: { marginHorizontal: Spacing.md, borderRadius: BorderRadius.lg },
  menuItem: { flexDirection: 'row', alignItems: 'center', padding: Spacing.md },
  menuDivider: { borderBottomWidth: 1, borderBottomColor: Colors.glassBorder },
  menuIcon: { width: 42, height: 42, borderRadius: 11, backgroundColor: 'rgba(124,111,255,0.1)', alignItems: 'center', justifyContent: 'center', marginRight: 14 },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: '600', color: Colors.textPrimary },
  menuSub: { fontSize: 12, color: Colors.textMuted, marginTop: 2 },
  chevron: { fontSize: 22, color: Colors.textMuted },
  logoutBtn: { marginHorizontal: Spacing.md, marginTop: Spacing.lg, borderRadius: BorderRadius.lg, paddingVertical: 15, alignItems: 'center' },
  logoutTouch: { width: '100%', alignItems: 'center' },
  logoutText: { color: '#ff6b6b', fontSize: 16, fontWeight: '700', textAlign: 'center' },
  version: { textAlign: 'center', color: Colors.textMuted, fontSize: 11, marginTop: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.65)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#110D26', borderTopLeftRadius: 32, borderTopRightRadius: 32, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: '#fff', marginBottom: 20 },
  modalOption: { paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.04)' },
  modalCircle: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#7C6FFF' },
  profileGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: Spacing.md,
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  profileCard: {
    width: '48%',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingVertical: 20,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  profileCardEmoji: {
    fontSize: 32,
  },
  profileCardLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.5)',
    letterSpacing: 0.8,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  profileCardValue: {
    fontSize: 15,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
});
const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: '#0f0a1e', borderRadius: 24, padding: Spacing.xl, paddingBottom: Spacing.xl, borderWidth: 1, borderColor: 'rgba(124,111,255,0.15)', maxHeight: '90%', elevation: 24, shadowColor: '#000', shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.5, shadowRadius: 16, overflow: 'hidden' },
  handle: { display: 'none' },
  title: { fontSize: 22, fontWeight: '800', color: Colors.textPrimary, textAlign: 'center', marginBottom: Spacing.lg },
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, marginBottom: Spacing.md },
  photoPreview: { width: 72, height: 72, borderRadius: 36, borderWidth: 2, borderColor: Colors.primary },
  galleryBtn: { marginBottom: 8 },
  galleryBtnGrad: { borderRadius: BorderRadius.md, paddingVertical: 10, paddingHorizontal: 14, alignItems: 'center' },
  galleryBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  hint: { color: Colors.textMuted, fontSize: 11, marginBottom: 6 },
  label: { color: Colors.textSecondary, fontSize: 13, fontWeight: '600', marginBottom: 6, letterSpacing: 0.3 },
  input: { backgroundColor: Colors.inputBg, borderWidth: 1, borderColor: Colors.inputBorder, borderRadius: BorderRadius.md, paddingHorizontal: Spacing.md, paddingVertical: 13, fontSize: 15, color: Colors.textPrimary, marginBottom: Spacing.md },
  btnGrad: { borderRadius: BorderRadius.md, paddingVertical: 15, alignItems: 'center' },
  btnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
