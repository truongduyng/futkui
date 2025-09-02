import { Colors } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useInstantDB } from "@/hooks/useInstantDB";
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
  sports?: { sport: string; level: string; }[];
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
}

const SPORTS_KEYS = [
  'football', 'basketball', 'tennis', 'pickleball', 'volleyball',
  'badminton', 'table_tennis', 'swimming', 'running', 'cycling',
];

const LEVEL_OPTIONS = [
  { value: 'beginner', labelKey: 'profile.skillLevels.beginner' },
  { value: 'intermediate', labelKey: 'profile.skillLevels.intermediate' },
  { value: 'advanced', labelKey: 'profile.skillLevels.advanced' },
  { value: 'expert', labelKey: 'profile.skillLevels.expert' }
];

interface SportWithLevel {
  sport: string;
  level: string;
}

export function ProfileSetup({
  userId,
  existingProfile,
  onProfileCreated,
  onProfileUpdated,
  mode = 'create'
}: ProfileSetupProps) {
  const { t } = useTranslation();
  const [handle, setHandle] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedPhotos, setSelectedPhotos] = useState<string[]>([]);
  const [sportsWithLevels, setSportsWithLevels] = useState<SportWithLevel[]>([]);
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

      setSportsWithLevels(existingProfile.sports || []);
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

  const addSport = (sport: string) => {
    setSportsWithLevels(prev => {
      if (prev.find(s => s.sport === sport)) {
        return prev; // Sport already exists
      }
      return [...prev, { sport, level: 'beginner' }];
    });
  };

  const removeSport = (sport: string) => {
    setSportsWithLevels(prev => prev.filter(s => s.sport !== sport));
  };

  const updateSportLevel = (sport: string, level: string) => {
    setSportsWithLevels(prev =>
      prev.map(s => s.sport === sport ? { ...s, level } : s)
    );
  };

  const getSportLevel = (sport: string) => {
    return sportsWithLevels.find(s => s.sport === sport)?.level || 'beginner';
  };

  const isSportSelected = (sport: string) => {
    return sportsWithLevels.some(s => s.sport.toLocaleLowerCase() === sport);
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

  const handleSubmit = async () => {
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
          showError(t("common.error"), t("profile.failedUploadPhoto"));
          setIsSubmitting(false);
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
          showError(t("common.error"), t("profile.failedUploadPhoto"));
          setIsSubmitting(false);
          return;
        }
      }

      if (mode === 'edit') {
        // Update existing profile
        const profileTransaction = instantClient.tx.profiles[profileId].update({
          handle: handle.toLowerCase(),
          displayName: displayName.trim(),
          ...(avatarUrl && { avatarUrl }),
          sports: sportsWithLevels.length > 0 ? sportsWithLevels : undefined,
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
            sports: sportsWithLevels.length > 0 ? sportsWithLevels : undefined,
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
  };


  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
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
            <Text style={[styles.title, { color: colors.text }]}>
              {mode === 'edit' ? t("profile.editProfile") : t("profile.setupProfile")}
            </Text>
            <Text style={[styles.subtitle, { color: colors.text }]}>
              {mode === 'edit' ? t("profile.setupSubtitle") : t("profile.setupSubtitle")}
            </Text>

            {mode === 'edit' && existingProfile?.email && (
              <Text style={[styles.emailText, { color: colors.tabIconDefault }]}>
                {existingProfile.email}
              </Text>
            )}

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
              {t("profile.sportsAndLevels")}
            </Text>
            <Text style={[styles.inputHint, { color: colors.tabIconDefault }]}>
              {t("profile.sportsAndLevelsHint")}
            </Text>

            <View style={styles.addSportsContainer}>
              <View style={styles.availableSportsContainer}>
                {SPORTS_KEYS.map((sportKey) => (
                  <TouchableOpacity
                    key={sportKey}
                    style={[
                      styles.availableSportButton,
                      {
                        borderColor: colors.icon,
                        backgroundColor: isSportSelected(sportKey)
                          ? colors.tint
                          : colors.background,
                      },
                    ]}
                    onPress={() => isSportSelected(sportKey) ? removeSport(sportKey) : addSport(sportKey)}
                    disabled={isSportSelected(sportKey)}
                  >
                    <Text
                      style={[
                        styles.availableSportButtonText,
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

            {sportsWithLevels.length > 0 && (
              <View style={styles.selectedSportsContainer}>
                {sportsWithLevels.map((sportWithLevel) => (
                  <View key={sportWithLevel.sport} style={[styles.sportLevelRow, { borderColor: colors.border, backgroundColor: colors.card }]}>
                    <View style={styles.sportLevelHeader}>
                      <Text style={[styles.sportName, { color: colors.text }]}>
                        {t(`sports.${sportWithLevel.sport.toLocaleLowerCase()}`)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeSport(sportWithLevel.sport)}
                        style={[styles.removeSportButton, { backgroundColor: colors.accent }]}
                      >
                        <Text style={styles.removeSportText}>×</Text>
                      </TouchableOpacity>
                    </View>
                    <View style={styles.levelOptionsRow}>
                      {LEVEL_OPTIONS.map((levelOption) => (
                        <TouchableOpacity
                          key={levelOption.value}
                          style={[
                            styles.levelOptionButton,
                            {
                              borderColor: colors.icon,
                              backgroundColor: getSportLevel(sportWithLevel.sport) === levelOption.value
                                ? colors.tint
                                : colors.background,
                            },
                          ]}
                          onPress={() => updateSportLevel(sportWithLevel.sport, levelOption.value)}
                        >
                          <Text
                            style={[
                              styles.levelOptionText,
                              {
                                color: getSportLevel(sportWithLevel.sport) === levelOption.value
                                  ? "white"
                                  : colors.text,
                              },
                            ]}
                          >
                            {t(levelOption.labelKey)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}
              </View>
            )}

            <TouchableOpacity
              style={[styles.button, { backgroundColor: colors.tint }]}
              onPress={handleSubmit}
              disabled={isSubmitting}
            >
              <Text style={styles.buttonText}>
                {isSubmitting
                  ? (mode === 'edit' ? t("profile.updatingProfile") : t("profile.creatingProfile"))
                  : (mode === 'edit' ? t("profile.updateProfile") : t("profile.createProfile"))}
              </Text>
            </TouchableOpacity>
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
  addSportsContainer: {
    marginBottom: 16,
  },
  availableSportsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  availableSportButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  availableSportButtonText: {
    fontSize: 14,
    fontWeight: "500",
  },
  selectedSportsContainer: {
    marginBottom: 16,
  },
  sportLevelRow: {
    marginBottom: 16,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  sportLevelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  sportName: {
    fontSize: 16,
    fontWeight: "600",
  },
  removeSportButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  removeSportText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  levelOptionsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  levelOptionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    minWidth: 70,
  },
  levelOptionText: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
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
  },
  additionalPhoto: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  removePhotoButton: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  removePhotoText: {
    color: "white",
    fontSize: 16,
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
