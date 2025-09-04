import { DefaultTheme, DarkTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { AuthGate } from '@/components/AuthGate';
import { UnreadCountProvider } from '@/contexts/UnreadCountContext';
import { ThemeProvider, useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/Colors';
import Toast from 'react-native-toast-message';
import '@/i18n';
import { useTranslation } from 'react-i18next';
import { Platform } from 'react-native';
import ErrorBoundary from '@/components/ErrorBoundary';
import { setupGlobalErrorHandler } from '@/utils/errorHandler';
import React from 'react';


function ThemedApp() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const navigationTheme = {
    ...(isDark ? DarkTheme : DefaultTheme),
    colors: {
      ...(isDark ? DarkTheme : DefaultTheme).colors,
      primary: colors.primary,
      background: colors.background,
      card: colors.background,
      text: colors.text,
      border: colors.border,
    },
  };

  return (
    <NavigationThemeProvider value={navigationTheme}>
      <UnreadCountProvider>
        <ErrorBoundary>
          <AuthGate>
            <Stack>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen
                name="chat/[groupId]"
                options={{
                  headerShown: true,
                  title: 'Chat',
                  presentation: 'card'
                }}
              />
              <Stack.Screen
                name="about"
                options={{
                  title: t('explore.about'),
                  presentation: 'card',
                  headerShown: true,
                  headerBackTitle: t('explore.menu'),
                }}
              />
              <Stack.Screen
                name="menu"
                options={{
                  title: t('explore.menu'),
                  presentation: 'card',
                  headerShown: true,
                  headerBackTitle: t('common.back'),
                }}
              />
              <Stack.Screen name="+not-found" />
            </Stack>
          </AuthGate>
        </ErrorBoundary>
      </UnreadCountProvider>
      <StatusBar style={isDark ? "light" : "dark"} translucent={Platform.OS === 'android'} />
      <Toast topOffset={Platform.OS === 'android' ? 100 : 80} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  // Setup global error handlers once
  React.useEffect(() => {
    setupGlobalErrorHandler();
  }, []);

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider>
      <ThemedApp />
    </ThemeProvider>
  );
}
