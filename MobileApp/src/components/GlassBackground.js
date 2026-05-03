import React from 'react';
import { StyleSheet, View } from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { Colors } from '../../constants/theme';

/**
 * Web-parity deep-space background:
 * - Base gradient
 * - Soft radial "glow blobs" like `Frontend/src/styles/theme.css`
 *
 * Wrap screens/layouts with this so every page has the same premium backdrop.
 */
export function GlassBackground({ style, children, ...rest }) {
  return (
    <View style={[styles.root, style]} {...rest}>
      {/* Strong global blur to improve text contrast across all pages. */}
      <BlurView
        tint="dark"
        intensity={85}
        experimentalBlurMethod="dimezisBlurView"
        style={StyleSheet.absoluteFill}
      />
      {/* Global tint + gradient keeps text readable across every screen section. */}
      <LinearGradient
        colors={['rgba(3, 5, 14, 0.58)', 'rgba(6, 8, 20, 0.44)', 'rgba(8, 10, 24, 0.50)']}
        locations={[0, 0.45, 1]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={styles.overlay} />

      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: Colors.background },
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.14)',
  },
});

