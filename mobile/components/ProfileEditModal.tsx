import { Colors } from '@/constants/Colors';
import { useInstantDB } from '@/hooks/useInstantDB';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import React, { useState, useEffect } from 'react';
import { Alert, Image, KeyboardAvoidingView, Modal, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface ProfileEditModalProps {
  visible: boolean;
  onClose: () => void;
  profile: {
    id: string;
    handle: string;
    displayName?: string;
    avatar?: { url: string };
  };
  onProfileUpdated: () => void;
}

export function ProfileEditModal({ visible, onClose, profile, onProfileUpdated }: ProfileEditModalProps) {
  const [handle, setHandle] = useState(profile.handle || '');
  const [displayName, setDisplayName] = useState(profile.displayName || '');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const colors = Colors['light'];
  const { instantClient } = useInstantDB();

  useEffect(() => {
    if (visible) {
      setHandle(profile.handle || '');
      setDisplayName(profile.displayName || '');
      setSelectedImage(null);
    }
  }, [visible, profile]);

  const isValidHandle = (handle: string) => {
    return /^[a-zA-Z0-9_]{3,20}$/.test(handle);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission required', 'Sorry, we need camera roll permissions to upload avatar images.');
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
      Alert.alert('Error', 'Please enter a username');
      return;
    }

    if (!isValidHandle(handle)) {
      Alert.alert('Error', 'Username must be 3-20 characters and contain only letters, numbers, and underscores');
      return;
    }

    if (!displayName.trim()) {
      Alert.alert('Error', 'Please enter a display name');
      return;
    }

    setIsSubmitting(true);

    try {
      // Check if handle is already taken (exclude current profile)
      if (handle.toLowerCase() !== profile.handle.toLowerCase()) {
        const existingProfile = await instantClient.queryOnce({
          profiles: {
            $: { where: { handle: handle.toLowerCase() } }
          }
        });

        if (existingProfile.data.profiles && existingProfile.data.profiles.length > 0) {
          Alert.alert('Error', 'Username is already taken. Please choose another one.');
          setIsSubmitting(false);
          return;
        }
      }

      let avatarFileId = null;

      // Upload new image if selected
      if (selectedImage) {
        try {
          const response = await fetch(selectedImage);
          const blob = await response.blob();
          const fileName = `avatar-${profile.id}-${Date.now()}.jpg`;

          const uploadResult = await instantClient.storage.uploadFile(fileName, blob);
          avatarFileId = uploadResult.data.id;
        } catch (error) {
          console.error('Error uploading avatar:', error);
          Alert.alert('Error', 'Failed to upload profile photo. Please try again.');
          setIsSubmitting(false);
          return;
        }
      }

      // Update profile
      let profileTransaction = instantClient.tx.profiles[profile.id].update({
        handle: handle.toLowerCase(),
        displayName: displayName.trim(),
      });

      // Link new avatar if uploaded
      if (avatarFileId) {
        profileTransaction = profileTransaction.link({ avatar: avatarFileId });
      }

      await instantClient.transact([profileTransaction]);

      onProfileUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Ionicons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Edit Profile</Text>
          <View style={styles.placeholder} />
        </View>

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
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile Photo</Text>

              <View style={styles.imagePickerSection}>
                <TouchableOpacity onPress={pickImage} activeOpacity={0.7}>
                  {selectedImage ? (
                    <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                  ) : profile.avatar?.url ? (
                    <Image source={{ uri: profile.avatar.url }} style={styles.selectedImage} />
                  ) : (
                    <View style={[styles.imagePlaceholder, { borderColor: colors.icon }]}>
                      <Text style={[styles.placeholderText, { color: colors.tabIconDefault }]}>
                        Tap to select photo
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <Text style={[styles.imageHint, { color: colors.tabIconDefault }]}>
                  Tap to change profile photo
                </Text>
              </View>

              <Text style={[styles.sectionTitle, { color: colors.text }]}>Username</Text>
              <TextInput
                style={[styles.input, {
                  borderColor: colors.icon,
                  color: colors.text,
                  backgroundColor: colors.background
                }]}
                placeholder="Enter username (3-20 characters)"
                placeholderTextColor={colors.tabIconDefault}
                value={handle}
                onChangeText={setHandle}
                autoCapitalize="none"
                autoCorrect={false}
                maxLength={20}
              />
              <Text style={[styles.inputHint, { color: colors.tabIconDefault }]}>
                Only letters, numbers, and underscores allowed
              </Text>

              <Text style={[styles.sectionTitle, { color: colors.text }]}>Display Name</Text>
              <TextInput
                style={[styles.input, {
                  borderColor: colors.icon,
                  color: colors.text,
                  backgroundColor: colors.background
                }]}
                placeholder="Enter your display name"
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
                  {isSubmitting ? 'Updating Profile...' : 'Update Profile'}
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
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
    borderBottomColor: 'rgba(0,0,0,0.1)',
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
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'flex-start',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    marginTop: 8,
  },
  imagePickerSection: {
    alignItems: 'center',
    marginBottom: 16,
  },
  selectedImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 8,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  placeholderText: {
    fontSize: 12,
    textAlign: 'center',
  },
  imageHint: {
    fontSize: 12,
    opacity: 0.7,
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