import React from 'react';
import { Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

interface ThemeSwitcherProps {
  visible: boolean;
  onClose: () => void;
}

export function ThemeSwitcher({ visible, onClose }: ThemeSwitcherProps) {
  const { t } = useTranslation();
  const { themeMode, isDark, setThemeMode } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const THEMES = [
    { mode: 'light' as const, name: t('explore.light'), icon: 'sunny-outline' as const },
    { mode: 'dark' as const, name: t('explore.dark'), icon: 'moon-outline' as const },
    { mode: 'system' as const, name: t('explore.system'), icon: 'phone-portrait-outline' as const },
  ];

  const changeTheme = (mode: 'light' | 'dark' | 'system') => {
    setThemeMode(mode);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      presentationStyle="overFullScreen"
    >
      <TouchableOpacity style={styles.overlay} onPress={onClose} activeOpacity={1}>
        <TouchableOpacity style={[styles.container, { backgroundColor: colors.background }]} activeOpacity={1}>
          <View style={styles.header}>
            <Text style={[styles.title, { color: colors.text }]}>{t('explore.theme')}</Text>
            <TouchableOpacity onPress={onClose}>
              <Text style={[styles.closeButton, { color: colors.tint }]}>Done</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.themeList}>
            {THEMES.map((theme) => (
              <TouchableOpacity
                key={theme.mode}
                style={[
                  styles.themeOption,
                  themeMode === theme.mode && {
                    backgroundColor: colors.tint + '20',
                    borderColor: colors.tint
                  }
                ]}
                onPress={() => changeTheme(theme.mode)}
              >
                <View style={styles.iconContainer}>
                  <Ionicons
                    name={theme.icon}
                    size={24}
                    color={colors.text}
                  />
                </View>
                <Text style={[styles.themeName, { color: colors.text }]}>
                  {theme.name}
                </Text>
                {themeMode === theme.mode && (
                  <Text style={[styles.checkmark, { color: colors.tint }]}>✓</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  container: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingTop: 20,
    paddingBottom: 40,
    minHeight: 300,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  closeButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  themeList: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  iconContainer: {
    width: 24,
    height: 24,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  themeName: {
    fontSize: 16,
    flex: 1,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});