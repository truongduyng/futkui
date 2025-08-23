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


function ThemedApp() {
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
            <Stack.Screen name="+not-found" />
          </Stack>
        </AuthGate>
      </UnreadCountProvider>
      <StatusBar style={isDark ? "light" : "dark"} />
      <Toast />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

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
