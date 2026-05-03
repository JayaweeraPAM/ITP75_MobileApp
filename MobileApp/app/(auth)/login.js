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
import { AuthContext } from '../../src/contexts/AuthContext';
import { authAPI } from '../../src/services/api';
import { Colors, BorderRadius, Spacing } from '../../constants/theme';
import { GlassCard } from '../../src/components/GlassCard';
import { PremiumBlurWrapper } from '../../src/components/PremiumBlurWrapper';

export default function LoginScreen() {
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

  const getNormalizedRole = (rawUser, authToken) => {
    const directRole = String(rawUser?.role ?? rawUser?.userRole ?? rawUser?.type ?? '').trim().toLowerCase();
    if (directRole) return directRole;

    // Fallback: extract role from JWT payload if backend user object is incomplete.
    if (authToken) {
      try {
        const payload = authToken.split('.')[1];
        if (payload) {
          const atobFn = globalThis?.atob;
          if (typeof atobFn !== 'function') return '';
          const padded = payload.padEnd(Math.ceil(payload.length / 4) * 4, '=').replace(/-/g, '+').replace(/_/g, '/');
          const decoded = JSON.parse(atobFn(padded));
          return String(decoded?.role ?? '').trim().toLowerCase();
        }
      } catch {
        // Ignore decode failures and fallback to student route.
      }
    }

    return '';
  };

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Missing Fields', 'Please enter your email and password.');
      return;
    }
    try {
      setIsLoading(true);
      // Backend uses /api/auth/login
      const { token, user } = await authAPI.login(email, password);
      if (!context) {
        throw new Error('Auth context is not ready. Please restart the app.');
      }
      const normalizedRole = getNormalizedRole(user, token);
      const normalizedUser = {
        ...user,
        name: user.fullName ?? user.name,
        role: normalizedRole || user.role,
      };
      await context.login(token, normalizedUser);
      router.replace('/(tabs)');
    } catch (error) {
      const msg = error?.message || 'Could not connect to server. Check your IP.';
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
                {/* Logo */}
                <View style={[styles.logoWrap, { flexDirection: 'column', gap: 10 }]}>
                  <LinearGradient colors={['#7C6FFF', '#5B50E8']} style={[styles.logoGrad, { marginRight: 0 }]}>
                    <Text style={styles.logoChar}>T</Text>
                  </LinearGradient>
                  <Text style={styles.logoName}>TutorHub</Text>
                </View>

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
                  <LinearGradient colors={['#7C6FFF', '#5B50E8']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
                    {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Sign In</Text>}
                  </LinearGradient>
                </TouchableOpacity>

                <View style={styles.divider}>
                  <View style={styles.dividerLine} />
                  <Text style={styles.dividerText}>or</Text>
                  <View style={styles.dividerLine} />
                </View>

                <TouchableOpacity onPress={() => router.push('/(auth)/register')} style={styles.ghostBtn} activeOpacity={0.8}>
                  <Text style={styles.ghostText}>Create new account →</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => router.push('/institute-login')} style={[styles.ghostBtn, { marginTop: 10 }]} activeOpacity={0.8}>
                  <Text style={styles.ghostText}>Access Institute Portal 🏢</Text>
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
    backgroundColor: 'rgba(100,60,220,0.18)',
  },
  blobBottomRight: {
    position: 'absolute',
    bottom: -100,
    right: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(30,90,220,0.15)',
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
    color: Colors.textPrimary,
  },
  inputFocused: { borderColor: 'rgba(124,111,255,0.55)', backgroundColor: 'rgba(255,255,255,0.09)' },
  btn: {
    borderRadius: BorderRadius.md,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#7C6FFF',
    shadowOpacity: 0.35,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  btnText: { color: '#fff', fontSize: 17, fontWeight: '600', letterSpacing: 0.3 },
  divider: { flexDirection: 'row', alignItems: 'center', marginVertical: Spacing.md },
  dividerLine: { flex: 1, height: 1, backgroundColor: 'rgba(255,255,255,0.08)' },
  dividerText: { color: Colors.textMuted, paddingHorizontal: 12, fontSize: 13 },
  ghostBtn: {
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: BorderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  ghostText: { color: Colors.textSecondary, fontSize: 15, fontWeight: '500' },
});

