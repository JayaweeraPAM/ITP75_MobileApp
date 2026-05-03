import { Tabs } from 'expo-router';
import React, { useContext, useRef, useEffect } from 'react';
import {
  Platform,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Home, Search, MessageSquare, User, LayoutDashboard, Sparkles, Users, ClipboardList, Settings } from 'lucide-react-native';
import { AuthContext } from '../../src/contexts/AuthContext';
import { BlurView } from 'expo-blur';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TAB_BAR_HORIZONTAL_MARGIN = 20;
const TAB_BAR_WIDTH = SCREEN_WIDTH - TAB_BAR_HORIZONTAL_MARGIN * 2;

// ── CUSTOM TAB BAR BUTTON ─────────────────────────────────────────────────────
function PremiumTabButton({ isFocused, onPress, icon: Icon, label, isHidden, isInstitute }) {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: isFocused ? 1.08 : 1,
        useNativeDriver: true,
        tension: 180,
        friction: 10,
      }),
      Animated.timing(glowAnim, {
        toValue: isFocused ? 1 : 0,
        duration: 250,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isFocused]);

  if (isHidden) return null;

  const iconColor = isFocused
    ? isInstitute ? '#10B981' : '#A5A1FF'
    : isInstitute ? 'rgba(16,185,129,0.38)' : 'rgba(180,175,255,0.38)';
  const labelColor = isFocused
    ? isInstitute ? '#34D399' : '#C4BFFF'
    : isInstitute ? 'rgba(16,185,129,0.38)' : 'rgba(180,175,255,0.38)';

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.75} style={styles.tabButton}>
      {/* Active pill background */}
      {isFocused && (
        <Animated.View
          style={[
            styles.activePill,
            { opacity: glowAnim },
            isInstitute && {
              backgroundColor: 'rgba(16,185,129,0.12)',
              borderColor: 'rgba(16,185,129,0.25)'
            }
          ]}
        />
      )}

      <Animated.View style={[styles.tabInner, { transform: [{ scale: scaleAnim }] }]}>
        <Icon size={22} color={iconColor} strokeWidth={isFocused ? 2.2 : 1.8} />
        <Text style={[styles.tabLabel, { color: labelColor }]}>{label}</Text>
      </Animated.View>
    </TouchableOpacity>
  );
}

// ── CUSTOM TAB BAR ────────────────────────────────────────────────────────────
function PremiumTabBar({ state, descriptors, navigation, isTutor, isInstitute }) {
  const slideAnim = useRef(new Animated.Value(80)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      tension: 120,
      friction: 12,
      delay: 100,
    }).start();
  }, []);

  // Build tabs config
  let tabs = [];
  if (isInstitute) {
    tabs = [
      { name: 'index', label: 'Overview', icon: LayoutDashboard },
      { name: 'search', label: 'Tutors', icon: Users },
      { name: 'chat', label: 'Join Requests', icon: ClipboardList },
      { name: 'profile', label: 'Settings', icon: Settings },
    ];
  } else {
    tabs = [
      {
        name: 'index',
        label: isTutor ? 'Dashboard' : 'Home',
        icon: isTutor ? LayoutDashboard : Home,
      },
      ...(!isTutor ? [{ name: 'search', label: 'Find Tutors', icon: Search }] : []),
      { name: 'chat', label: 'AI Assistant', icon: Sparkles },
      { name: 'profile', label: 'Profile', icon: User },
    ];
  }

  const currentRouteKey = state.routes[state.index].key;
  const currentOptions = descriptors[currentRouteKey].options;
  if (currentOptions.tabBarStyle?.display === 'none') {
    return null;
  }

  return (
    <Animated.View style={[styles.tabBarContainer, { transform: [{ translateY: slideAnim }] }, isInstitute && { shadowColor: '#10B981' }]}>
      {/* Outer glow border */}
      <View
        style={[
          styles.outerGlowBorder,
          isInstitute && { borderColor: 'rgba(16,185,129,0.25)' }
        ]}
        pointerEvents="none"
      />

      {/* Blurred background — same method as booking popup */}
      <BlurView
        intensity={45}
        experimentalBlurMethod="dimezisBlurView"
        tint="dark"
        style={[StyleSheet.absoluteFill, { borderRadius: 30 }]}
      />

      {/* Dark overlay for depth */}
      <View style={styles.darkOverlay} pointerEvents="none" />

      {/* Top highlight line */}
      <View style={styles.topHighlight} pointerEvents="none" />

      {/* Tabs row */}
      <View style={styles.tabsRow}>
        {tabs.map((tab) => {
          const routeIndex = state.routes.findIndex((r) => r.name === tab.name);
          const isFocused = state.index === routeIndex;

          const onPress = () => {
            if (routeIndex < 0) return;
            const event = navigation.emit({
              type: 'tabPress',
              target: state.routes[routeIndex].key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate({ name: tab.name, merge: true });
            }
          };

          return (
            <PremiumTabButton
              key={tab.name}
              isFocused={isFocused}
              onPress={onPress}
              icon={tab.icon}
              label={tab.label}
              isInstitute={isInstitute}
            />
          );
        })}
      </View>
    </Animated.View>
  );
}

// ── LAYOUT ────────────────────────────────────────────────────────────────────
export default function TabLayout() {
  const context = useContext(AuthContext);
  const role = String(context?.user?.role ?? '').trim().toLowerCase();
  const isTutor = role === 'tutor' || role === 'tutor_pending';
  const isInstitute = role === 'institute_manager';

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
      }}
      tabBar={(props) => <PremiumTabBar {...props} isTutor={isTutor} isInstitute={isInstitute} />}
    >
      {/* HOME / DASHBOARD */}
      <Tabs.Screen
        name="index"
        options={{
          title: isTutor ? 'Dashboard' : (isInstitute ? 'Overview' : 'Home'),
        }}
      />

      {/* FIND TUTORS — students or institute */}
      <Tabs.Screen name="search" options={{ title: isInstitute ? 'Tutors' : 'Find Tutors' }} />

      {/* CHAT */}
      <Tabs.Screen name="chat" options={{ title: isInstitute ? 'Join Requests' : 'AI Assistant' }} />

      {/* PROFILE */}
      <Tabs.Screen name="profile" options={{ title: isInstitute ? 'Settings' : 'Profile' }} />

      {/* Hide explore */}
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  tabBarContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 28 : 18,
    left: TAB_BAR_HORIZONTAL_MARGIN,
    right: TAB_BAR_HORIZONTAL_MARGIN,
    width: TAB_BAR_WIDTH,
    borderRadius: 30,
    overflow: 'hidden',
    // Premium shadow
    shadowColor: '#7C6FFF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 24,
    elevation: 24,
    // Black shadow underneath
    backgroundColor: 'transparent',
  },
  outerGlowBorder: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'rgba(124,111,255,0.20)',
    zIndex: 10,
  },
  darkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(6, 4, 15, 0.40)',
    borderRadius: 30,
  },
  topHighlight: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.12)',
    borderRadius: 1,
    zIndex: 5,
  },
  tabsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingVertical: 10,
    paddingBottom: Platform.OS === 'ios' ? 10 : 10,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    paddingVertical: 4,
  },
  activePill: {
    position: 'absolute',
    top: 0,
    left: 4,
    right: 4,
    bottom: 0,
    borderRadius: 18,
    backgroundColor: 'rgba(124,111,255,0.10)',
    borderWidth: 1,
    borderColor: 'rgba(124,111,255,0.22)',
  },
  tabInner: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
    paddingHorizontal: 6,
    position: 'relative',
  },
  iconGlowRing: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(124,111,255,0.12)',
    transform: [{ translateX: -16 }, { translateY: -16 }],
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.2,
    marginTop: 1,
  },
});

