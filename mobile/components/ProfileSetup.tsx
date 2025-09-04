import { Colors } from "@/constants/Colors";
import { SPORTS_KEYS } from "@/constants/Sports";
import { useTheme } from "@/contexts/ThemeContext";
import { useInstantDB } from "@/hooks/db/useInstantDB";
import { registerForPushNotificationsAsync } from "@/utils/notifications";
import { uploadToR2 } from "@/utils/r2Upload";
import { id } from "@instantdb/react-native";
import * as ImagePicker from "expo-image-picker";
import React, { useState, useEffect } from "react";
import {
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/useToast";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { LocationSelector } from "./LocationSelector";
import provinces from '@/utils/data/provinces.json';

interface ExistingProfile {
  id: string;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
  sports?: string[] | { sport: string; level: string; }[]; // Support both old and new format
  location?: string;
  photos?: string[];
  email?: string;
}

interface ProfileSetupProps {
  userId?: string;
  existingProfile?: ExistingProfile;
  onProfileCreated?: () => void;
  onProfileUpdated?: () => void;
  mode?: 'create' | 'edit';
  showHeader?: boolean;
  onSubmitPress?: (submitFn: () => void) => void;
}


export function ProfileSetup({
  userId,
  existingProfile,
  onProfileCreated,
  onProfileUpdated,
  mode = 'create',
  showHeader = true,
  onSubmitPress
}: ProfileSetupProps) {
  const { t } = useTranslation();
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [selectedLocationCode, setSelectedLocationCode] = useState<string>("");
  const [isLocationSelectorVisible, setIsLocationSelectorVisible] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const { instantClient } = useInstantDB();
  const { showError } = useToast();


  // Initialize form data based on mode
  useEffect(() => {
    if (mode === 'edit' && existingProfile) {
      // Pre-fill form with existing profile data
      setHandle(existingProfile.handle || '');
      setDisplayName(existingProfile.displayName || '');

      // Handle location - find the province code if location is stored as label
      const existingLocation = existingProfile.location || '';
      const foundProvince = provinces.find(p => p.label === existingLocation || p.code === existingLocation);
      if (foundProvince) {
        setSelectedLocationCode(foundProvince.code);
        setLocation(foundProvince.label);
      } else {
        setLocation(existingLocation);
      }

      // Handle both old format (objects with sport property) and new format (strings)
      if (existingProfile.sports) {
        const convertedSports = existingProfile.sports.map((sportItem: any) => {
          return typeof sportItem === 'string' ? sportItem : sportItem.sport;
        }).filter(sport => sport); // Remove any undefined/null values
        setSelectedSports(convertedSports);
      } else {
        setSelectedSports([]);
      }
      setSelectedPhotos(existingProfile.photos || []);
      if (existingProfile.avatarUrl) {
        setSelectedImage(existingProfile.avatarUrl);
      }
    } else if (mode === 'create') {
      // Check for Apple Sign-In data and prefill display name if available
      const checkAppleUserInfo = async () => {
        try {
          const appleUserInfoStr = await AsyncStorage.getItem("appleUserInfo");
          if (appleUserInfoStr) {
            const appleUserInfo = JSON.parse(appleUserInfoStr);

            // Clear the stored data
            await AsyncStorage.removeItem("appleUserInfo");

            // Prefill display name if we have Apple name data
            const fullName = appleUserInfo.fullName;
            let prefillName = "";

            if (fullName?.givenName && fullName?.familyName) {
              prefillName = `${fullName.givenName} ${fullName.familyName}`.trim();
            } else if (fullName?.givenName) {
              prefillName = fullName.givenName;
            } else if (fullName?.familyName) {
              prefillName = fullName.familyName;
            }

            if (prefillName) {
              setDisplayName(prefillName);
            }
          }
        } catch (error) {
          console.error("Error checking Apple user info:", error);
        }
      };

      checkAppleUserInfo();
    }
  }, [mode, existingProfile]);

  const isValidHandle = (handle: string) => {
    return /^[a-zA-Z0-9_]{3,20}$/.test(handle);
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showError(
        t("profile.permissionRequired"),
        t("profile.permissionMessage"),
      );
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

  const pickMultiplePhotos = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showError(
        t("profile.permissionRequired"),
        t("profile.permissionMessage"),
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: false,
      allowsMultipleSelection: true,
      selectionLimit: 5,
      quality: 0.5,
    });

    if (!result.canceled && result.assets) {
      const newPhotos = result.assets.map(asset => asset.uri);
      setSelectedPhotos(prev => [...prev, ...newPhotos].slice(0, 5));
    }
  };

  const removePhoto = (index: number) => {
    setSelectedPhotos(prev => prev.filter((_, i) => i !== index));
  };

  const toggleSport = (sport: string) => {
    setSelectedSports(prev => {
      if (prev.includes(sport)) {
        return prev.filter(s => s !== sport);
      }
      return [...prev, sport];
    });
  };




  const isSportSelected = (sport: string) => {
    return selectedSports.includes(sport);
  };

  const handleLocationSelect = (province: { code: string; label: string }) => {
    setSelectedLocationCode(province.code);
    setLocation(province.label);
  };

  const openLocationSelector = () => {
    setIsLocationSelectorVisible(true);
  };

  const clearLocation = () => {
    setSelectedLocationCode('');
    setLocation('');
  };

  const handleSubmit = React.useCallback(async () => {
    if (!handle.trim()) {
      showError(t("common.error"), t("profile.errorHandle"));
      return;
    }

    if (!isValidHandle(handle)) {
      showError(t("common.error"), t("profile.errorHandleFormat"));
      return;
    }

    if (!displayName.trim()) {
      showError(t("common.error"), t("profile.errorDisplayName"));
      return;
    }

    // Photo is optional for Apple Sign-In users - they already provided their identity
    // if (!selectedImage) {
    //   showError(t('common.error'), t('profile.errorPhoto'));
    //   return;
    // }

    setIsSubmitting(true);

    try {
      let profileId: string;

      if (mode === 'edit' && existingProfile) {
        profileId = existingProfile.id;

        // Check if handle is already taken (exclude current profile)
        if (handle.toLowerCase() !== existingProfile.handle.toLowerCase()) {
          const existingProfileCheck = await instantClient.queryOnce({
            profiles: {
              $: { where: { handle: handle.toLowerCase() } },
            },
          });

          if (
            existingProfileCheck.data.profiles &&
            existingProfileCheck.data.profiles.length > 0
          ) {
            showError(t("common.error"), t("profile.handleTaken"));
            setIsSubmitting(false);
            return;
          }
        }
      } else {
        // Check if handle is already taken
        const existingProfileCheck = await instantClient.queryOnce({
          profiles: {
            $: { where: { handle: handle.toLowerCase() } },
          },
        });

        if (
          existingProfileCheck.data.profiles &&
          existingProfileCheck.data.profiles.length > 0
        ) {
          showError(t("common.error"), t("profile.handleTaken"));
          setIsSubmitting(false);
          return;
        }

        profileId = id();
      }
      let avatarUrl = null;
      let photoUrls: string[] = [];

      // Upload avatar image if provided and it's a new local image (not existing URL)
      if (selectedImage && selectedImage.startsWith('file://')) {
        try {
          const fileName = `avatar-${profileId}-${Date.now()}.jpg`;
          avatarUrl = await uploadToR2(selectedImage, fileName);
        } catch (error) {
          console.error("Error uploading avatar:", error);
          showError(
            t("common.error"),
            t("profile.failedUploadPhoto") + " Your selected image is still available - please try again."
          );
          setIsSubmitting(false);
          // Keep the selected image so user can try again
          return;
        }
      } else if (selectedImage && !selectedImage.startsWith('file://')) {
        // Keep existing avatar URL
        avatarUrl = selectedImage;
      }

      // Handle additional photos - separate new uploads from existing URLs
      if (selectedPhotos.length > 0) {
        try {
          const newPhotos = selectedPhotos.filter(photo => photo.startsWith('file://'));
          const existingPhotos = selectedPhotos.filter(photo => !photo.startsWith('file://'));

          let newPhotoUrls: string[] = [];
          if (newPhotos.length > 0) {
            const uploadPromises = newPhotos.map(async (photo, index) => {
              const fileName = `photo-${profileId}-${Date.now()}-${index}.jpg`;
              return await uploadToR2(photo, fileName);
            });
            newPhotoUrls = await Promise.all(uploadPromises);
          }

          photoUrls = [...existingPhotos, ...newPhotoUrls];
        } catch (error) {
          console.error("Error uploading photos:", error);
          showError(
            t("common.error"),
            t("profile.failedUploadPhoto") + " Your selected image is still available - please try again."
          );
          setIsSubmitting(false);
          // Keep the selected photos so user can try again
          return;
        }
      }

      if (mode === 'edit') {
        // Update existing profile
        const profileTransaction = instantClient.tx.profiles[profileId].update({
          handle: handle.toLowerCase(),
          displayName: displayName.trim(),
          ...(avatarUrl && { avatarUrl }),
          sports: selectedSports.length > 0 ? selectedSports : undefined,
          location: location.trim() || undefined,
          photos: photoUrls.length > 0 ? photoUrls : undefined,
        });

        await instantClient.transact([profileTransaction]);
        onProfileUpdated?.();
      } else {
        // Get push notification token for new profiles
        const pushToken = await registerForPushNotificationsAsync();

        // Create new profile
        const profileTransaction = instantClient.tx.profiles[profileId]
          .update({
            handle: handle.toLowerCase(),
            displayName: displayName.trim(),
            createdAt: Date.now(),
            pushToken: pushToken || undefined,
            avatarUrl: avatarUrl || undefined,
            sports: selectedSports.length > 0 ? selectedSports : undefined,
            location: location.trim() || undefined,
            photos: photoUrls.length > 0 ? photoUrls : undefined,
          })
          .link({ user: userId! });

        await instantClient.transact([profileTransaction]);
        onProfileCreated?.();
      }
    } catch (error) {
      console.error("Error creating profile:", error);
      showError(t("common.error"), t("profile.failedCreateProfile"));
    } finally {
      setIsSubmitting(false);
    }
  }, [handle, displayName, selectedImage, selectedPhotos, selectedSports, location, mode, existingProfile, instantClient, showError, t, onProfileCreated, onProfileUpdated, userId]);

  // Expose handleSubmit to parent if onSubmitPress is provided
  React.useEffect(() => {
    if (onSubmitPress) {
      onSubmitPress(handleSubmit);
    }
  }, [onSubmitPress, handleSubmit]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Custom Header */}
      {showHeader && (
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {mode === 'edit' ? t("profile.editProfile") : t("profile.setupProfile")}
          </Text>
          <TouchableOpacity
            style={[styles.saveButton, { backgroundColor: colors.tint }]}
            onPress={handleSubmit}
            disabled={isSubmitting}
          >
            <Text style={styles.saveButtonText}>
              {isSubmitting
                ? (mode === 'edit' ? t("profile.updatingProfile") : t("profile.creatingProfile"))
                : (mode === 'edit' ? t("profile.updateProfile") : t("profile.createProfile"))}
              {(selectedImage?.startsWith('file://') || selectedPhotos.some(p => p.startsWith('file://'))) && !isSubmitting ? " 📁" : ""}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.content}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("profile.profilePhoto")}
            </Text>

            <View style={styles.imagePickerSection}>
              <TouchableOpacity onPress={pickImage} activeOpacity={0.7}>
                {selectedImage ? (
                  <Image
                    source={{ uri: selectedImage }}
                    style={styles.selectedImage}
                  />
                ) : (
                  <View
                    style={[
                      styles.imagePlaceholder,
                      { borderColor: colors.icon },
                    ]}
                  >
                    <Text
                      style={[
                        styles.placeholderText,
                        { color: colors.tabIconDefault },
                      ]}
                    >
                      {t("profile.tapSelectPhoto")}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("profile.username")}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.icon,
                  color: colors.text,
                  backgroundColor: colors.background,
                },
              ]}
              placeholder={t("profile.placeholderHandle")}
              placeholderTextColor={colors.tabIconDefault}
              value={handle}
              onChangeText={setHandle}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
            />
            <Text style={[styles.inputHint, { color: colors.tabIconDefault }]}>
              {t("profile.handleHint")}
            </Text>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("profile.displayName")}
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  borderColor: colors.icon,
                  color: colors.text,
                  backgroundColor: colors.background,
                },
              ]}
              placeholder={t("profile.placeholderDisplayName")}
              placeholderTextColor={colors.tabIconDefault}
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={50}
            />

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("profile.location")}
            </Text>
            <TouchableOpacity
              style={[
                styles.locationSelector,
                {
                  borderColor: colors.icon,
                  backgroundColor: colors.background,
                },
              ]}
              onPress={openLocationSelector}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.locationText,
                  {
                    color: location ? colors.text : colors.tabIconDefault,
                  },
                ]}
              >
                {location || t("profile.selectLocationPlaceholder")}
              </Text>
              <View style={styles.locationSelectorRight}>
                {location && (
                  <TouchableOpacity
                    onPress={clearLocation}
                    style={styles.clearLocationButton}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Ionicons name="close-circle" size={20} color={colors.tabIconDefault} />
                  </TouchableOpacity>
                )}
                <Ionicons name="chevron-down" size={20} color={colors.tabIconDefault} />
              </View>
            </TouchableOpacity>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("profile.additionalPhotos")}
            </Text>
            <View style={styles.photosSection}>
              <TouchableOpacity
                style={[
                  styles.addPhotoButton,
                  { borderColor: colors.icon },
                ]}
                onPress={pickMultiplePhotos}
                disabled={selectedPhotos.length >= 5}
              >
                <Text
                  style={[
                    styles.addPhotoText,
                    { color: colors.tabIconDefault },
                  ]}
                >
                  {selectedPhotos.length >= 5 ? t("profile.maxPhotos") : t("profile.addPhotos")}
                </Text>
              </TouchableOpacity>

              {selectedPhotos.length > 0 && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={styles.photosScroll}
                >
                  {selectedPhotos.map((photo, index) => (
                    <View key={index} style={styles.photoContainer}>
                      <Image
                        source={{ uri: photo }}
                        style={styles.additionalPhoto}
                      />
                      <TouchableOpacity
                        style={[styles.removePhotoButton, { backgroundColor: colors.accent }]}
                        onPress={() => removePhoto(index)}
                      >
                        <Text style={styles.removePhotoText}>×</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </ScrollView>
              )}
            </View>

            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t("profile.sports")}
            </Text>

            <View style={styles.sportsContainer}>
              {SPORTS_KEYS.map((sportKey) => (
                <TouchableOpacity
                  key={sportKey}
                  style={[
                    styles.sportButton,
                    {
                      borderColor: colors.icon,
                      backgroundColor: isSportSelected(sportKey)
                        ? colors.tint
                        : colors.background,
                    },
                  ]}
                  onPress={() => toggleSport(sportKey)}
                >
                  <Text
                    style={[
                      styles.sportButtonText,
                      {
                        color: isSportSelected(sportKey)
                          ? "white"
                          : colors.text,
                      },
                    ]}
                  >
                    {t(`sports.${sportKey}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <LocationSelector
        visible={isLocationSelectorVisible}
        onClose={() => setIsLocationSelectorVisible(false)}
        onSelect={handleLocationSelect}
        selectedLocation={selectedLocationCode}
      />
    </SafeAreaView>
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
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  content: {
    width: "100%",
    maxWidth: 400,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 22,
    textAlign: "center",
    opacity: 0.8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    marginTop: 4,
  },
  imagePickerSection: {
    alignItems: "center",
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
    borderStyle: "dashed",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 12,
    textAlign: "center",
  },
  input: {
    width: "100%",
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
    width: "100%",
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 24,
  },
  buttonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    marginTop: 12,
  },
  sportsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  sportButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 4,
  },
  sportButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  selectedIndicator: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  photosSection: {
    marginBottom: 16,
  },
  addPhotoButton: {
    height: 48,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  addPhotoText: {
    fontSize: 14,
  },
  photosScroll: {
    maxHeight: 100,
  },
  photoContainer: {
    position: "relative",
    marginRight: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  additionalPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: "absolute",
    top: -4,
    right: -4,
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  removePhotoText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  emailText: {
    fontSize: 14,
    marginTop: 8,
    marginBottom: 16,
    textAlign: "center",
    opacity: 0.8,
  },
  locationSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 16,
    flex: 1,
  },
  locationSelectorRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  clearLocationButton: {
    padding: 4,
  },
});
