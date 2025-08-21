/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

// Primary color palette
const primary = '#0a7ea4';
const accent = '#FF6B00';
const neutral = '#F5F5F5';
const dark = '#1C1C1C';

export const Colors = {
  light: {
    text: dark,
    background: '#fff',
    tint: primary,
    accent: accent,
    neutral: neutral,
    icon: '#687076',
    tabIconDefault: '#687076',
    tabIconSelected: primary,
    primary: primary,
    secondary: neutral,
  },
  dark: {
    text: '#ECEDEE',
    background: dark,
    tint: '#fff',
    accent: accent,
    neutral: '#2A2A2A',
    icon: '#9BA1A6',
    tabIconDefault: '#9BA1A6',
    tabIconSelected: '#fff',
    primary: primary,
    secondary: '#2A2A2A',
  },
};
