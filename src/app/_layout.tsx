import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Outfit_400Regular,
  Outfit_600SemiBold,
  Outfit_700Bold,
} from '@expo-google-fonts/outfit';
import { SpaceMono_400Regular } from '@expo-google-fonts/space-mono';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { initSettings } from '@/store/settings';
import { initIdentity } from '@/store/identity';
import { initUsage } from '@/store/usage';
import { loadSounds } from '@/services/sounds';
import { colors } from '@/constants/theme';
import { StartupScreen } from '@/components/StartupScreen';
import { ErrorBoundary } from '@/components/ErrorBoundary';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [settingsReady, setSettingsReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [fontsLoaded] = useFonts({
    Outfit_400Regular,
    Outfit_600SemiBold,
    Outfit_700Bold,
    SpaceMono_400Regular,
  });

  useEffect(() => {
    // Usage init must run after settings (it reads premium / user-key state).
    initSettings()
      .then(() => Promise.all([initIdentity(), initUsage(), loadSounds()]))
      .finally(() => setSettingsReady(true));
  }, []);

  useEffect(() => {
    if (fontsLoaded && settingsReady) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, settingsReady]);

  if (!fontsLoaded || !settingsReady) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <StatusBar style="light" />
      <ErrorBoundary>
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bg.elevated },
            headerTintColor: colors.pink,
            headerTitleStyle: { fontFamily: 'Outfit_600SemiBold', color: colors.text.primary },
            headerShadowVisible: false,
            contentStyle: { backgroundColor: colors.bg.base },
            animation: 'slide_from_right',
            gestureEnabled: true,
            fullScreenGestureEnabled: true,
          }}
        >
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="setup" options={{ title: 'New Debate' }} />
          <Stack.Screen name="debate" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="results" options={{ headerShown: false }} />
          <Stack.Screen name="history" options={{ title: 'History' }} />
          <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          <Stack.Screen name="multiplayer" options={{ title: 'Online Multiplayer' }} />
          <Stack.Screen name="mp-debate" options={{ headerShown: false, gestureEnabled: false }} />
          <Stack.Screen name="leaderboard" options={{ title: 'Leaderboard' }} />
        </Stack>
      </ErrorBoundary>
      {!introDone && <StartupScreen onDone={() => setIntroDone(true)} />}
    </GestureHandlerRootView>
  );
}
