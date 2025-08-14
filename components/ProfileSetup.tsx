import { Colors } from '@/constants/Colors';
import { useInstantDB } from '@/hooks/useInstantDB';
import { id } from '@instantdb/react-native';
import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface ProfileSetupProps {
  userId: string;
  onProfileCreated: () => void;
}

export function ProfileSetup({ userId, onProfileCreated }: ProfileSetupProps) {
  const [handle, setHandle] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const colors = Colors['light'];
  const { instantClient } = useInstantDB();

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

    if (!selectedImage) {
      Alert.alert('Error', 'Please select a profile photo');
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
        Alert.alert('Error', 'Username is already taken. Please choose another one.');
        setIsSubmitting(false);
        return;
      }

      // Create profile with avatar
      const profileId = id();
      let avatarFileId = null;

      // Upload image (required)
      try {
        const response = await fetch(selectedImage);
        const blob = await response.blob();
        const fileName = `avatar-${profileId}-${Date.now()}.jpg`;

        const uploadResult = await instantClient.storage.uploadFile(fileName, blob);
        avatarFileId = uploadResult.data.id;
      } catch (error) {
        console.error('Error uploading avatar:', error);
        Alert.alert('Error', 'Failed to upload profile photo. Please try again.');
        setIsSubmitting(false);
        return;
      }

      // Create profile
      let profileTransaction = instantClient.tx.profiles[profileId].update({
        handle: handle.toLowerCase(),
        displayName: displayName.trim(),
        createdAt: Date.now(),
      }).link({ user: userId });

      // Link avatar (always required now)
      profileTransaction = profileTransaction.link({ avatar: avatarFileId });

      await instantClient.transact([profileTransaction]);

      onProfileCreated();
    } catch (error) {
      console.error('Error creating profile:', error);
      Alert.alert('Error', 'Failed to create profile. Please try again.');
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
            <Text style={[styles.title, { color: colors.text }]}>Set up your profile</Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
              Choose how you want to appear to other users
            </Text>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>Profile Photo</Text>

            <View style={styles.imagePickerSection}>
              <TouchableOpacity onPress={pickImage} activeOpacity={0.7}>
                {selectedImage ? (
                  <Image source={{ uri: selectedImage }} style={styles.selectedImage} />
                ) : (
                  <View style={[styles.imagePlaceholder, { borderColor: colors.icon }]}>
                    <Text style={[styles.placeholderText, { color: colors.tabIconDefault }]}>
                      Tap to select photo
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
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
                {isSubmitting ? 'Creating Profile...' : 'Create Profile'}
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
