import React, { useState, useContext, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { AuthContext } from '../../src/contexts/AuthContext';
import api, { authAPI } from '../../src/services/api';
import { Colors, BorderRadius, Spacing } from '../../constants/theme';
import { GlassCard } from '../../src/components/GlassCard';
import { PremiumBlurWrapper } from '../../src/components/PremiumBlurWrapper';

export default function TutorRegisterScreen() {
  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [contactNumber, setContactNumber] = useState('');
  const [bio, setBio] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [location, setLocation] = useState('');
  const [qualifications, setQualifications] = useState('');
  const [subjects, setSubjects] = useState([]);

  const [dbSubjectsList, setDbSubjectsList] = useState([]);
  const [showSubjectsModal, setShowSubjectsModal] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);
  const context = useContext(AuthContext);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();

    // Fetch subjects from the database via the public route
    api.get('/subjects').then(res => {
      const categories = res.data.categories || [];
      const byCat = res.data.subjectsByCategory || {};
      let list = [];
      categories.forEach(c => {
        const subs = byCat[c.value] || [];
        subs.forEach(s => {
          list.push({ label: `${c.label} - ${s}`, subject: s, category: c.value });
        });
      });
      setDbSubjectsList(list);
    }).catch((err) => {
      console.error('Failed to load subjects on registration:', err);
    });
  }, []);

  const handleNext = () => {
    if (!fullName.trim() || !email.trim() || !password.trim() || !contactNumber.trim()) {
      Alert.alert('Missing Fields', 'Please fill in your name, email, password, and contact number.');
      return;
    }
    if (password.length < 6) {
      Alert.alert('Weak Password', 'Password must be at least 6 characters.');
      return;
    }
    setStep(2);
  };

  const handleRegister = async () => {
    if (!bio.trim() || !hourlyRate.trim() || !location.trim() || subjects.length === 0) {
      Alert.alert('Missing Fields', 'Please enter your bio, hourly rate, location, and subjects.');
      return;
    }
    try {
      setIsLoading(true);
      const { token, user } = await authAPI.registerTutor({
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        password,
        bio: bio.trim(),
        contactPhone: contactNumber.trim(),
        hourlyRate: parseFloat(hourlyRate) || 0,
        location: location.trim(),
        qualifications: qualifications.split(',').map(s => s.trim()).filter(Boolean),
        subjects: subjects.map(s => {
          const [category, subject] = s.split('|');
          return { category, subject };
        }).filter(s => s.subject),
        classTypes: ['Online', 'Physical'],
        classFormats: ['Individual', 'Group'],
      });

      if (!context) {
        throw new Error('Auth context is not ready. Please restart the app.');
      }
      await context.login(token, { ...user, name: user.fullName ?? user.name });
      router.replace('/(tabs)');
    } catch (error) {
      const msg = error?.message || 'Registration failed. Check your network or try again.';
      Alert.alert('Tutor Registration Failed', msg);
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSubjectSelection = (subjKey) => {
    setSubjects(prev => {
      if (prev.includes(subjKey)) {
        return prev.filter(s => s !== subjKey);
      } else {
        return [...prev, subjKey];
      }
    });
  };

  const inputStyle = (f) => [styles.input, focusedField === f && styles.inputFocused];

  return (
    <PremiumBlurWrapper>
      <LinearGradient colors={['#06040f', '#100825', '#06040f']} style={styles.gradient}>
        <View style={styles.blobTopRight} />
        <View style={styles.blobBottomLeft} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              <GlassCard style={styles.card}>
                <View style={[styles.logoWrap, { flexDirection: 'column', gap: 10 }]}>
                  <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={[styles.logoGrad, { marginRight: 0 }]}>
                    <Text style={styles.logoChar}>T</Text>
                  </LinearGradient>
                  <Text style={styles.logoName}>TutorHub</Text>
                </View>

                <Text style={styles.title}>Tutor Application</Text>
                <Text style={styles.subtitle}>Step {step} of 2</Text>

                {step === 1 ? (
                  <View style={styles.fields}>
                    <TextInput
                      style={inputStyle('name')}
                      placeholder="Full Name"
                      placeholderTextColor="rgba(140,140,190,0.45)"
                      value={fullName}
                      onChangeText={setFullName}
                      onFocus={() => setFocusedField('name')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TextInput
                      style={inputStyle('email')}
                      placeholder="Email address"
                      placeholderTextColor="rgba(140,140,190,0.45)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={email}
                      onChangeText={setEmail}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TextInput
                      style={inputStyle('pass')}
                      placeholder="Password"
                      placeholderTextColor="rgba(140,140,190,0.45)"
                      secureTextEntry
                      value={password}
                      onChangeText={setPassword}
                      onFocus={() => setFocusedField('pass')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TextInput
                      style={inputStyle('phone')}
                      placeholder="Contact Number"
                      placeholderTextColor="rgba(140,140,190,0.45)"
                      keyboardType="phone-pad"
                      value={contactNumber}
                      onChangeText={setContactNumber}
                      onFocus={() => setFocusedField('phone')}
                      onBlur={() => setFocusedField(null)}
                    />

                    <TouchableOpacity onPress={handleNext} activeOpacity={0.85}>
                      <LinearGradient colors={['#7C6FFF', '#5B50E8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
                        <Text style={styles.btnText}>Next</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.fields}>
                    <TextInput
                      style={[inputStyle('bio'), { height: 100, textAlignVertical: 'top' }]}
                      placeholder="Bio / Short Description"
                      placeholderTextColor="rgba(140,140,190,0.45)"
                      multiline
                      numberOfLines={4}
                      value={bio}
                      onChangeText={setBio}
                      onFocus={() => setFocusedField('bio')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TextInput
                      style={inputStyle('hourlyRate')}
                      placeholder="Hourly Rate (LKR)"
                      placeholderTextColor="rgba(140,140,190,0.45)"
                      keyboardType="numeric"
                      value={hourlyRate}
                      onChangeText={setHourlyRate}
                      onFocus={() => setFocusedField('hourlyRate')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TextInput
                      style={inputStyle('location')}
                      placeholder="Location"
                      placeholderTextColor="rgba(140,140,190,0.45)"
                      value={location}
                      onChangeText={setLocation}
                      onFocus={() => setFocusedField('location')}
                      onBlur={() => setFocusedField(null)}
                    />

                    <TouchableOpacity
                      style={[inputStyle('subjects'), { justifyContent: 'center' }]}
                      onPress={() => setShowSubjectsModal(true)}
                      activeOpacity={0.85}
                    >
                      <Text style={{ color: subjects.length ? '#fff' : 'rgba(140,140,190,0.45)', fontSize: 16 }}>
                        {subjects.length ? subjects.map(key => key.split('|')[1]).join(', ') : 'Select Subjects'}
                      </Text>
                    </TouchableOpacity>

                    <TextInput
                      style={inputStyle('qualifications')}
                      placeholder="Qualifications (optional)"
                      placeholderTextColor="rgba(140,140,190,0.45)"
                      value={qualifications}
                      onChangeText={setQualifications}
                      onFocus={() => setFocusedField('qualifications')}
                      onBlur={() => setFocusedField(null)}
                    />

                    <TouchableOpacity onPress={handleRegister} disabled={isLoading} activeOpacity={0.85}>
                      <LinearGradient colors={['#7C6FFF', '#5B50E8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
                        {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Submit Registration</Text>}
                      </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity onPress={() => setStep(1)} style={[styles.ghostBtn, { marginTop: 12 }]} activeOpacity={0.8}>
                      <Text style={styles.ghostText}>Back</Text>
                    </TouchableOpacity>
                  </View>
                )}

                <View style={styles.infoBox}>
                  <Text style={styles.infoText}>
                    📌 Upon registration, your profile will be submitted to our administrators for approval.
                  </Text>
                </View>

                {step === 1 && (
                  <TouchableOpacity onPress={() => router.back()} style={styles.ghostBtn} activeOpacity={0.8}>
                    <Text style={styles.ghostText}>Back to Sign In</Text>
                  </TouchableOpacity>
                )}
              </GlassCard>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Subjects Selector Popup */}
        <Modal
          visible={showSubjectsModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSubjectsModal(false)}
        >
          <View style={styles.modalOverlay}>
            <GlassCard style={styles.modalCard}>
              <Text style={styles.modalTitle}>Select Subjects</Text>
              <Text style={styles.modalSubtitle}>Pick one or more subjects you teach</Text>

              <ScrollView style={{ maxHeight: 300 }} contentContainerStyle={{ gap: 8 }}>
                {dbSubjectsList.map((s, index) => {
                  const subjKey = `${s.category}|${s.subject}`;
                  const isSelected = subjects.includes(subjKey);
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => toggleSubjectSelection(subjKey)}
                      activeOpacity={0.75}
                      style={[
                        styles.subjectOption,
                        isSelected && styles.subjectOptionSelected,
                      ]}
                    >
                      <Text style={[styles.subjectText, isSelected && styles.subjectTextSelected]}>
                        {s.label}
                      </Text>
                      {isSelected && <Text style={{ color: '#10B981', fontWeight: 'bold' }}>✓</Text>}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <TouchableOpacity
                onPress={() => setShowSubjectsModal(false)}
                activeOpacity={0.85}
                style={{ marginTop: 16 }}
              >
                <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={styles.modalCloseBtn}>
                  <Text style={{ color: '#fff', fontSize: 16, fontWeight: '700' }}>Done</Text>
                </LinearGradient>
              </TouchableOpacity>
            </GlassCard>
          </View>
        </Modal>
      </LinearGradient>
    </PremiumBlurWrapper>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  blobTopRight: {
    position: 'absolute',
    top: -80,
    right: -80,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(100,60,220,0.18)',
  },
  blobBottomLeft: {
    position: 'absolute',
    bottom: -100,
    left: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(30,90,220,0.14)',
  },
  card: {
    padding: Spacing.xl,
  },
  logoWrap: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl },
  logoGrad: {
    width: 52,
    height: 52,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    shadowColor: '#7C6FFF',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  logoChar: { fontSize: 24, fontWeight: '800', color: '#fff' },
  logoName: { fontSize: 26, fontWeight: '800', color: Colors.textPrimary, letterSpacing: -0.5 },
  title: { fontSize: 22, fontWeight: '700', color: Colors.textPrimary, textAlign: 'center', marginBottom: 6 },
  subtitle: { fontSize: 14, color: Colors.textSecondary, textAlign: 'center', marginBottom: Spacing.xl },
  fields: { marginBottom: Spacing.sm },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    marginBottom: 12,
    fontSize: 16,
    color: Colors.textPrimary,
  },
  inputFocused: { borderColor: 'rgba(124,111,255,0.55)', backgroundColor: 'rgba(255,255,255,0.09)' },
  infoBox: {
    backgroundColor: 'rgba(124,111,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(124,111,255,0.18)',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  infoText: { color: Colors.textSecondary, fontSize: 13, lineHeight: 19 },
  btn: {
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#7C6FFF',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
    marginTop: 8,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
  ghostBtn: {
    marginTop: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  ghostText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '500' },

  // Popup Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    padding: 24,
    borderRadius: 20,
    backgroundColor: 'rgba(24, 20, 36, 0.94)',
    borderWidth: 1,
    borderColor: 'rgba(124, 111, 255, 0.35)',
    shadowColor: '#7C6FFF',
    shadowRadius: 24,
    shadowOpacity: 0.25,
  },
  modalTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 4,
  },
  modalSubtitle: {
    color: 'rgba(255,255,255,0.55)',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 20,
  },
  subjectOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  subjectOptionSelected: {
    backgroundColor: 'rgba(124, 111, 255, 0.15)',
    borderColor: 'rgba(124, 111, 255, 0.45)',
  },
  subjectText: { color: '#fff', fontSize: 15, fontWeight: '500' },
  subjectTextSelected: { color: '#7C6FFF', fontWeight: '700' },
  modalCloseBtn: {
    borderRadius: 14,
    paddingVertical: 15,
    alignItems: 'center',
    shadowColor: '#7C6FFF',
    shadowRadius: 16,
    shadowOpacity: 0.35,
  },
});
