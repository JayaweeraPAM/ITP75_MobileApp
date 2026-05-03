import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';

/**
 * PremiumBlurWrapper — Glassmorphism wrapper.
 * iOS: real BlurView for premium look.
 * Android: opaque dark gradient (BlurView on Android is CPU-heavy and causes lag).
 */
export const PremiumBlurWrapper = ({ children }) => {
  if (Platform.OS === 'android') {
    // Fast path for Android — no BlurView, just a solid dark base
    return (
      <View style={styles.container}>
        {children}
      </View>
    );
  }

  // iOS: real blur
  return (
    <View style={styles.container}>
      <BlurView
        intensity={90}
        tint="dark"
        style={StyleSheet.absoluteFill}
      />
      <LinearGradient
        colors={['rgba(3, 5, 14, 0.55)', 'rgba(6, 8, 20, 0.40)', 'rgba(8, 10, 24, 0.48)']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      {children}
    </View>
  );
};

export default PremiumBlurWrapper;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#06040f',
  },
});
