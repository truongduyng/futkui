import { Colors } from '@/constants/Colors';
import { useInstantDB } from '@/hooks/useInstantDB';
import { registerForPushNotificationsAsync } from '@/utils/notifications';
import { uploadToR2 } from '@/utils/r2Upload';
import { id } from '@instantdb/react-native';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/useToast';

interface ProfileSetupProps {
  userId: string;
  onProfileCreated: () => void;
}

export function ProfileSetup({ userId, onProfileCreated }: ProfileSetupProps) {
  const { t } = useTranslation();
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isDark } = useTheme();
const colors = isDark ? Colors.dark : Colors.light;
  const { instantClient } = useInstantDB();
  const { showError } = useToast();

  const isValidHandle = (handle: string) => {
    return /^[a-zA-Z0-9_]{3,20}$/.test(handle);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showError(t('profile.permissionRequired'), t('profile.permissionMessage'));
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleSubmit = async () => {
    if (!handle.trim()) {
      showError(t('common.error'), t('profile.errorHandle'));
      return;
    }

    if (!isValidHandle(handle)) {
      showError(t('common.error'), t('profile.errorHandleFormat'));
      return;
    }

    if (!displayName.trim()) {
      showError(t('common.error'), t('profile.errorDisplayName'));
      return;
    }

    if (!selectedImage) {
      showError(t('common.error'), t('profile.errorPhoto'));
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if handle is already taken
      const existingProfile = await instantClient.queryOnce({
        profiles: {
          $: { where: { handle: handle.toLowerCase() } }
        }
      });

      if (existingProfile.data.profiles && existingProfile.data.profiles.length > 0) {
        showError(t('common.error'), t('profile.handleTaken'));
        setIsSubmitting(false);
        return;
      }

      // Create profile with avatar
      const profileId = id();
      let avatarUrl = null;

      // Upload image (required)
      try {
        const fileName = `avatar-${profileId}-${Date.now()}.jpg`;
        avatarUrl = await uploadToR2(selectedImage, fileName);
      } catch (error) {
        console.error('Error uploading avatar:', error);
        showError(t('common.error'), t('profile.failedUploadPhoto'));
        setIsSubmitting(false);
        return;
      }

      // Get push notification token
      const pushToken = await registerForPushNotificationsAsync();

      // Create profile
      const profileTransaction = instantClient.tx.profiles[profileId].update({
        handle: handle.toLowerCase(),
        displayName: displayName.trim(),
        createdAt: Date.now(),
        pushToken: pushToken || undefined,
        avatarUrl: avatarUrl,
      }).link({ user: userId });

      await instantClient.transact([profileTransaction]);

      onProfileCreated();
    } catch (error) {
      console.error('Error creating profile:', error);
      showError(t('common.error'), t('profile.failedCreateProfile'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={[styles.title, { color: colors.text }]}>{t('profile.setupProfile')}</Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
              {t('profile.setupSubtitle')}
            </Text>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('profile.profilePhoto')}</Text>

            <View style={styles.imagePickerSection}>
              <TouchableOpacity onPress={pickImage} activeOpacity={0.7}>
                {selectedImage ? (
                  <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                ) : (
                  <View style={[styles.imagePlaceholder, { borderColor: colors.icon }]}>
                    <Text style={[styles.placeholderText, { color: colors.tabIconDefault }]}>
                      {t('profile.tapSelectPhoto')}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('profile.username')}</Text>
            <TextInput
              style={[styles.input, {
                borderColor: colors.icon,
                color: colors.text,
                backgroundColor: colors.background
              }]}
              placeholder={t('profile.placeholderHandle')}
              placeholderTextColor={colors.tabIconDefault}
              value={handle}
              onChangeText={setHandle}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
            <Text style={[styles.inputHint, { color: colors.tabIconDefault }]}>
              {t('profile.handleHint')}
            </Text>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t('profile.displayName')}</Text>
            <TextInput
              style={[styles.input, {
                borderColor: colors.icon,
                color: colors.text,
                backgroundColor: colors.background
              }]}
              placeholder={t('profile.placeholderDisplayName')}
              placeholderTextColor={colors.tabIconDefault}
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={50}
            />

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.tint }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>
                {isSubmitting ? t('profile.creatingProfile') : t('profile.createProfile')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 22,
    textAlign: 'center',
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 4,
  },
  imagePickerSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 12,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 12,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    fontSize: 16,
    marginBottom: 4,
  },
  inputHint: {
    fontSize: 12,
    marginBottom: 8,
    opacity: 0.7,
  },
  button: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
