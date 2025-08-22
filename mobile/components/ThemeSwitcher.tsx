import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';

export function ThemeSwitcher() {
  const { themeMode, isDark, setThemeMode } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const themeOptions = [
    { mode: 'light' as const, icon: 'sunny-outline', label: 'Light' },
    { mode: 'dark' as const, icon: 'moon-outline', label: 'Dark' },
    { mode: 'system' as const, icon: 'phone-portrait-outline', label: 'System' },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>Theme</Text>
      <View style={styles.optionsContainer}>
        {themeOptions.map((option) => (
          <TouchableOpacity
            key={option.mode}
            style={[
              styles.option,
              {
                backgroundColor: themeMode === option.mode ? colors.primary : colors.neutral,
                borderColor: colors.neutral,
              }
            ]}
            onPress={() => setThemeMode(option.mode)}
          >
            <Ionicons
              name={option.icon as any}
              size={20}
              color={themeMode === option.mode ? '#fff' : colors.text}
            />
            <Text
              style={[
                styles.optionText,
                {
                  color: themeMode === option.mode ? '#fff' : colors.text,
                }
              ]}
            >
              {option.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    margin: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});