import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import 'react-native-reanimated';

import { AuthGuard } from '@/components/AuthGuard';
import { AuthProvider } from '@/contexts/AuthContext';
import { useColorScheme } from '@/hooks/useColorScheme';

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AuthProvider>
        <AuthGuard>
        <Stack screenOptions={{ headerShown: false }}>
        {/* Login is the initial screen (app/index.tsx) */}
        <Stack.Screen name="index" />
        <Stack.Screen name="redirect" />
        {/* Home and Garden screens */}
        <Stack.Screen name="home" />
        <Stack.Screen name="garden" />
        <Stack.Screen name="add-plant" />
        <Stack.Screen name="+not-found" />
      </Stack>
        </AuthGuard>
      </AuthProvider>
    </ThemeProvider>
  );
}
