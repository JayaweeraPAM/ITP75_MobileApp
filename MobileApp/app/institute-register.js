import React, { useState, useRef } from 'react';
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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { authAPI } from '../src/services/api';
import { Colors, BorderRadius, Spacing } from '../constants/theme';
import { GlassCard } from '../src/components/GlassCard';
import { PremiumBlurWrapper } from '../src/components/PremiumBlurWrapper';

export default function InstituteRegisterScreen() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const [form, setForm] = useState({
    fullName: '',
    registrationNumber: '',
    email: '',
    password: '',
    phone: '',
    instituteName: '',
    location: '',
    description: '',
  });

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;

  React.useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
    ]).start();
  }, [step]);

  const handleStep1 = () => {
    if (!form.fullName.trim() || !form.registrationNumber.trim() || !form.email.trim() || !form.password.trim()) {
      Alert.alert('Missing Info', 'Please enter manager name, registration number, email, and password.');
      return;
    }
    setStep(2);
  };

  const handleRegister = async () => {
    if (!form.instituteName.trim() || !form.location.trim()) {
      Alert.alert('Missing Info', 'Institute name and location are required.');
      return;
    }
    setLoading(true);
    try {
      await authAPI.registerTutor({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        phone: form.phone,
        isInstituteManager: true,
        instituteRegistrationNo: form.registrationNumber,
        instituteName: form.instituteName,
        instituteLocation: form.location,
        instituteDescription: form.description,
      });

      Alert.alert('Success', 'Institute registration request submitted successfully! Your account is pending admin review.');
      router.replace('/institute-login');
    } catch (error) {
      Alert.alert('Registration Failed', error?.message || 'Failed to submit registration request.');
    } finally {
      setLoading(false);
    }
  };

  const update = (key, val) => {
    setForm((prev) => ({ ...prev, [key]: val }));
  };

  const inputStyle = (f) => [styles.input, focusedField === f && styles.inputFocused];

  return (
    <PremiumBlurWrapper>
      <LinearGradient colors={['#06040f', '#100825', '#06040f']} style={styles.gradient}>
        <View style={styles.blobTopLeft} />
        <View style={styles.blobBottomRight} />

        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Animated.View style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
              <GlassCard style={styles.card}>
                <View style={styles.logoWrap}>
                  <LinearGradient colors={['#10B981', '#059669']} style={styles.logoGrad}>
                    <Text style={styles.logoChar}>+</Text>
                  </LinearGradient>
                  <Text style={styles.logoName}>Register Institute</Text>
                </View>

                <Text style={styles.title}>{step === 1 ? 'Manager Details' : 'Institute Profile'}</Text>
                <Text style={styles.subtitle}>{step === 1 ? 'Step 1 of 2: Who is managing' : 'Step 2 of 2: Tell us about the institute'}</Text>

                {step === 1 ? (
                  <View style={styles.fields}>
                    <TextInput
                      style={inputStyle('fullName')}
                      placeholder="Manager's Full Name"
                      placeholderTextColor="rgba(140,140,190,0.45)"
                      value={form.fullName}
                      onChangeText={(val) => update('fullName', val)}
                      onFocus={() => setFocusedField('fullName')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TextInput
                      style={inputStyle('registrationNumber')}
                      placeholder="Registration ID (e.g. ED/2024/001)"
                      placeholderTextColor="rgba(140,140,190,0.45)"
                      value={form.registrationNumber}
                      onChangeText={(val) => update('registrationNumber', val)}
                      onFocus={() => setFocusedField('registrationNumber')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TextInput
                      style={inputStyle('email')}
                      placeholder="Manager Email Address"
                      placeholderTextColor="rgba(140,140,190,0.45)"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      value={form.email}
                      onChangeText={(val) => update('email', val)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TextInput
                      style={inputStyle('pass')}
                      placeholder="Secure Password"
                      placeholderTextColor="rgba(140,140,190,0.45)"
                      secureTextEntry
                      value={form.password}
                      onChangeText={(val) => update('password', val)}
                      onFocus={() => setFocusedField('pass')}
                      onBlur={() => setFocusedField(null)}
                    />

                    <TouchableOpacity onPress={handleStep1} activeOpacity={0.85} style={{ marginTop: Spacing.md }}>
                      <LinearGradient colors={['#10B981', '#059669']} style={styles.btn}>
                        <Text style={styles.btnText}>Continue</Text>
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.fields}>
                    <TextInput
                      style={inputStyle('instituteName')}
                      placeholder="Institute Name"
                      placeholderTextColor="rgba(140,140,190,0.45)"
                      value={form.instituteName}
                      onChangeText={(val) => update('instituteName', val)}
                      onFocus={() => setFocusedField('instituteName')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TextInput
                      style={inputStyle('location')}
                      placeholder="Location (Online, Colombo, etc.)"
                      placeholderTextColor="rgba(140,140,190,0.45)"
                      value={form.location}
                      onChangeText={(val) => update('location', val)}
                      onFocus={() => setFocusedField('location')}
                      onBlur={() => setFocusedField(null)}
                    />
                    <TextInput
                      style={[inputStyle('description'), { height: 80, textAlignVertical: 'top' }]}
                      placeholder="Description / Mode of learning"
                      placeholderTextColor="rgba(140,140,190,0.45)"
                      multiline
                      value={form.description}
                      onChangeText={(val) => update('description', val)}
                      onFocus={() => setFocusedField('description')}
                      onBlur={() => setFocusedField(null)}
                    />

                    <View style={{ flexDirection: 'row', gap: 10, marginTop: Spacing.md }}>
                      <TouchableOpacity onPress={() => setStep(1)} activeOpacity={0.8} style={[styles.ghostBtn, { flex: 1 }]}>
                        <Text style={styles.ghostText}>Back</Text>
                      </TouchableOpacity>

                      <TouchableOpacity onPress={handleRegister} disabled={loading} activeOpacity={0.85} style={{ flex: 1.5 }}>
                        <LinearGradient colors={['#10B981', '#059669']} style={styles.btn}>
                          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Register</Text>}
                        </LinearGradient>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity onPress={() => router.push('/institute-login')} style={styles.ghostBtn} activeOpacity={0.8}>
                  <Text style={styles.ghostText}>Existing institute? Sign In</Text>
                </TouchableOpacity>
              </GlassCard>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </LinearGradient>
    </PremiumBlurWrapper>
  );
}

const styles = StyleSheet.create({
  gradient: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: Spacing.lg },
  blobTopLeft: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(16,185,129,0.14)',
  },
  blobBottomRight: {
    position: 'absolute',
    bottom: -100,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(5,150,105,0.12)',
  },
  card: {
    padding: Spacing.xl,
  },
  logoWrap: { flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.xl, gap: 12 },
  logoGrad: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.5,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 0 },
    elevation: 10,
  },
  logoChar: { fontSize: 26, fontWeight: '800', color: '#fff' },
  logoName: { fontSize: 24, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  title: { fontSize: 20, fontWeight: '700', color: '#fff', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 13, color: 'rgba(255,255,255,0.65)', textAlign: 'center', marginBottom: Spacing.xl },
  fields: { marginBottom: Spacing.md },
  input: {
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    borderRadius: BorderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 14,
    marginBottom: 12,
    fontSize: 16,
    color: '#fff',
  },
  inputFocused: { borderColor: 'rgba(16,185,129,0.55)', backgroundColor: 'rgba(255,255,255,0.09)' },
  btn: {
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#10B981',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { color: 'rgba(255,255,255,0.4)', paddingHorizontal: 12, fontSize: 13 },
  ghostBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  ghostText: { color: 'rgba(255,255,255,0.7)', fontSize: 15, fontWeight: '500' },
});
