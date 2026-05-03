import React, { useEffect, useRef, useContext } from 'react';
import { View, StyleSheet, Animated, Easing, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { AuthContext } from '../src/contexts/AuthContext';

export default function SplashScreen() {
  const logoScale = useRef(new Animated.Value(0.3)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const nameOpacity = useRef(new Animated.Value(0)).current;
  const nameSlide = useRef(new Animated.Value(24)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const screenOpacity = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;

  const context = useContext(AuthContext);

  const getNormalizedRole = (rawUser, authToken) => {
    const directRole = String(rawUser?.role ?? rawUser?.userRole ?? rawUser?.type ?? '')
      .trim()
      .toLowerCase();
    if (directRole) return directRole;

    if (authToken) {
      try {
        const payload = authToken.split('.')[1];
        if (payload) {
          const atobFn = globalThis?.atob;
          if (typeof atobFn !== 'function') return '';
          const padded = payload
            .padEnd(Math.ceil(payload.length / 4) * 4, '=')
            .replace(/-/g, '+')
            .replace(/_/g, '/');
          const decoded = JSON.parse(atobFn(padded));
          return String(decoded?.role ?? '').trim().toLowerCase();
        }
      } catch {
        // Ignore decode failures and use default route.
      }
    }

    return '';
  };

  useEffect(() => {
    // Pulsing glow loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 1, duration: 1200, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1200, useNativeDriver: true }),
      ])
    ).start();

    const startAnimation = () => {
      Animated.sequence([
        // Logo spring pop-in
        Animated.parallel([
          Animated.spring(logoScale, { toValue: 1, friction: 4, tension: 70, useNativeDriver: true }),
          Animated.timing(logoOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        ]),
        Animated.delay(80),
        // Name slides up
        Animated.parallel([
          Animated.timing(nameOpacity, { toValue: 1, duration: 380, useNativeDriver: true }),
          Animated.timing(nameSlide, {
            toValue: 0,
            duration: 380,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        // Tagline fades
        Animated.timing(taglineOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
        // Hold
        Animated.delay(1000),
        // Fade out
        Animated.timing(screenOpacity, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]).start(() => {
        if (context?.token) {
          router.replace('/(tabs)');
        } else {
          router.replace('/(auth)/login');
        }
      });
    };

    const t = setTimeout(startAnimation, 150);
    return () => clearTimeout(t);
  }, []);

  return (
    <Animated.View style={[styles.container, { opacity: screenOpacity }]}>
      <LinearGradient colors={['#06040f', '#0d0920', '#060415']} style={StyleSheet.absoluteFill} />

      {/* Glow blob behind logo */}
      <Animated.View style={[styles.glowBlob, { opacity: glowAnim }]} />

      {/* Logo image */}
      <Animated.View style={[styles.logoWrapper, { opacity: logoOpacity, transform: [{ scale: logoScale }] }]}>
        <Image source={require('../assets/images/icon.png')} style={styles.logoImage} resizeMode="contain" />
      </Animated.View>

      {/* App Name */}
      <Animated.Text style={[styles.appName, { opacity: nameOpacity, transform: [{ translateY: nameSlide }] }]}>
        TutorHub
      </Animated.Text>

      {/* Tagline */}
      <Animated.Text style={[styles.tagline, { opacity: taglineOpacity }]}>LEARN . GROW . SUCCEED</Animated.Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#06040f' },
  glowBlob: {
    position: 'absolute',
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: 'rgba(124,111,255,0.14)',
    shadowColor: '#7C6FFF',
    shadowOpacity: 1,
    shadowRadius: 100,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  logoWrapper: {
    width: 120,
    height: 120,
    borderRadius: 30,
    marginBottom: 24,
    shadowColor: '#7C6FFF',
    shadowOpacity: 0.7,
    shadowRadius: 50,
    shadowOffset: { width: 0, height: 0 },
    elevation: 20,
    overflow: 'hidden',
  },
  logoImage: { width: 120, height: 120, borderRadius: 28 },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: 'rgba(240,240,255,0.97)',
    letterSpacing: -1.5,
    marginBottom: 14,
  },
  tagline: {
    fontSize: 12,
    color: 'rgba(124,111,255,0.7)',
    letterSpacing: 4,
    fontWeight: '600',
  },
});

