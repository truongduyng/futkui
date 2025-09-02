import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Modal, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { ProfileSetup } from './ProfileSetup';

interface ProfileEditModalProps {
  visible: boolean;
  onClose: () => void;
  profile: {
    id: string;
    handle: string;
    displayName?: string;
    avatarUrl?: string;
    sports?: { sport: string; level: string; }[];
    location?: string;
    photos?: string[];
    email?: string;
  };
  onProfileUpdated: () => void;
}

export function ProfileEditModal({ visible, onClose, profile, onProfileUpdated }: ProfileEditModalProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const handleProfileUpdated = () => {
    onProfileUpdated();
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { borderBottomColor: colors.tabIconDefault }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t('profile.editProfile')}</Text>
          <View style={styles.placeholder} />
        </View>

        <ProfileSetup
          existingProfile={profile}
          onProfileUpdated={handleProfileUpdated}
          mode="edit"
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  closeButton: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  placeholder: {
    width: 32,
  },
});