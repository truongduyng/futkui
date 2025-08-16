import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';
import { AuthGate } from '@/components/AuthGate';
import { UnreadCountProvider } from '@/contexts/UnreadCountContext';


export default function RootLayout() {
  const [loaded] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  if (!loaded) {
    // Async font loading only occurs in development.
    return null;
  }

  return (
    <ThemeProvider value={DefaultTheme}>
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
      <StatusBar style="dark" />
    </ThemeProvider>
  );
}
