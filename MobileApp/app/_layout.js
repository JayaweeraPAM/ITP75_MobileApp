import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { AuthProvider } from '../src/contexts/AuthContext';
import { GlassBackground } from '../src/components/GlassBackground';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  return (
    <AuthProvider>
      <ThemeProvider value={DarkTheme}>
        <GlassBackground>
          <Stack
            screenOptions={{
              headerShown: false,
              // Ensure cards are opaque so nothing "bleeds through" during transitions.
              contentStyle: { backgroundColor: '#06040f' },
              // Use a simple transition that avoids showing underlying layers.
              animation: 'fade',
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="splash" options={{ headerShown: false, animation: 'none' }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="bookings" options={{ headerShown: false }} />
            <Stack.Screen name="earnings" options={{ headerShown: false }} />
            <Stack.Screen name="tutor-profile" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="subscription" options={{ headerShown: false }} />
            <Stack.Screen name="institutes" options={{ headerShown: false }} />
            <Stack.Screen name="quizzes" options={{ headerShown: false, animation: 'slide_from_right' }} />
            <Stack.Screen name="ai-chat" options={{ headerShown: false }} />
            <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
          </Stack>
          <StatusBar style="light" backgroundColor="#06040f" />
        </GlassBackground>
      </ThemeProvider>
    </AuthProvider>
  );
}

