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
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { AuthContext } from '../src/contexts/AuthContext';
import { authAPI } from '../src/services/api';
import { Colors, BorderRadius, Spacing } from '../constants/theme';
import { GlassCard } from '../src/components/GlassCard';
import { PremiumBlurWrapper } from '../src/components/PremiumBlurWrapper';

export default function InstituteLoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    try {
      setIsLoading(true);
      const { token, user } = await authAPI.login(email, password);
      if (!context) {
        throw new Error('Auth context is not ready. Please restart the app.');
      }
      
      if (user.role !== 'institute_manager') {
        Alert.alert('Login Restricted', 'This account is not an institute manager. Use the tutor or student login instead.');
        setIsLoading(false);
        return;
      }

      await context.login(token, user);
      Alert.alert('Success', 'Welcome back!');
      router.replace('/(tabs)');
    } catch (error) {
      const msg = error?.message || 'Could not connect to server.';
      Alert.alert('Login Failed', msg);
    } finally {
      setIsLoading(false);
    }
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
                {/* Logo & Header */}
                <View style={styles.logoWrap}>
                  <LinearGradient colors={['#0284C7', '#0369A1']} style={styles.logoGrad}>
                    <Text style={styles.logoChar}>I</Text>
                  </LinearGradient>
                  <Text style={styles.logoName}>Institute Portal</Text>
                </View>

                <Text style={styles.title}>Sign In</Text>
                <Text style={styles.subtitle}>Manage your institute, tutors, and more.</Text>

                <View style={styles.fields}>
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
                </View>

                <TouchableOpacity onPress={handleLogin} disabled={isLoading} activeOpacity={0.85}>
                  <LinearGradient colors={['#0EA5E9', '#0284C7']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
                    {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity onPress={() => router.push('/institute-register')} style={styles.ghostBtn} activeOpacity={0.8}>
                  <Text style={styles.ghostText}>Register new institute →</Text>
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
    backgroundColor: 'rgba(14,165,233,0.14)',
  },
  blobBottomRight: {
    position: 'absolute',
    bottom: -100,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(2,132,199,0.12)',
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
    shadowColor: '#0EA5E9',
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
  inputFocused: { borderColor: 'rgba(14,165,233,0.55)', backgroundColor: 'rgba(255,255,255,0.09)' },
  btn: {
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#0EA5E9',
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
