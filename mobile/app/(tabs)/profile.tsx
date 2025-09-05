import { CachedAvatar } from "@/components/chat/CachedAvatar";
import { ImageModal } from "@/components/chat/ImageModal";
import { ProfileEditModal } from "@/components/ProfileEditModal";
import { Colors } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useInstantDB } from "@/hooks/db/useInstantDB";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  StatusBar as RNStatusBar,
  Image,
} from "react-native";
import { useTranslation } from "react-i18next";

const getSportEmoji = (sport: string) => {
  switch (sport.toLowerCase()) {
    case "football":
      return "⚽";
    case "basketball":
      return "🏀";
    case "tennis":
      return "🎾";
    case "pickleball":
      return "🏓";
    case "volleyball":
      return "🏐";
    case "badminton":
      return "🏸";
    case "table_tennis":
      return "🏓";
    case "swimming":
      return "🏊";
    case "running":
      return "🏃";
    case "cycling":
      return "🚴";
    default:
      return "🏃";
  }
};

const maskEmail = (email: string) => {
  const [localPart, domain] = email.split('@');
  const maskedLocal = localPart.length > 2
    ? `${localPart.charAt(0)}***${localPart.charAt(localPart.length - 1)}`
    : `${localPart.charAt(0)}***`;
  return `${maskedLocal}@${domain}`;
};

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();

  const { useProfile, instantClient } = useInstantDB();
  const { data: profileData } = useProfile();
  const { user } = instantClient.useAuth();

  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [isImageModalVisible, setIsImageModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  const currentProfile = profileData?.profiles?.[0];

  const handleEditProfile = () => {
    setIsProfileModalVisible(true);
  };

  const handleImagePress = (index: number) => {
    setSelectedImageIndex(index);
    setIsImageModalVisible(true);
  };

  if (!currentProfile) {
    return (
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t("common.loading")}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: colors.background,
          paddingTop: Platform.OS === "android" ? RNStatusBar.currentHeight : 0,
        },
      ]}
    >
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.headerSpacer} />
          <TouchableOpacity
            style={styles.menuButton}
            onPress={() => router.push("/menu")}
            activeOpacity={0.8}
          >
            <Ionicons name="menu" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        {/* Profile Header Section */}
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatarContainer}>
            {currentProfile.avatarUrl ? (
              <CachedAvatar
                uri={currentProfile.avatarUrl}
                size={100}
                fallbackComponent={
                  <View
                    style={[
                      styles.avatarFallback,
                      { backgroundColor: colors.tint },
                    ]}
                  >
                    <Text style={styles.avatarFallbackText}>
                      {currentProfile.displayName?.charAt(0) ||
                        currentProfile.handle?.charAt(0) ||
                        "U"}
                    </Text>
                  </View>
                }
              />
            ) : (
              <View
                style={[
                  styles.avatarFallback,
                  { backgroundColor: colors.tint },
                ]}
              >
                <Text style={styles.avatarFallbackText}>
                  {currentProfile.displayName?.charAt(0) ||
                    currentProfile.handle?.charAt(0) ||
                    "U"}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.nameContainer}>
            <Text style={[styles.displayName, { color: colors.text }]}>
              {currentProfile.displayName}
            </Text>
            <TouchableOpacity
              style={[styles.editButtonSmall, { backgroundColor: colors.card }]}
              onPress={handleEditProfile}
              activeOpacity={0.8}
            >
              <Ionicons name="create-outline" size={20} color={colors.text} />
            </TouchableOpacity>
          </View>
          <Text style={[styles.handle, { color: colors.tabIconDefault }]}>
            @{currentProfile.handle}
          </Text>

          {/* Email and Location */}
          {(currentProfile.location || user?.email) && (
            <View style={styles.locationContainer}>
              {user?.email && (
                <Text style={[styles.locationText, { color: colors.tabIconDefault }]}>
                  {maskEmail(user.email)}
                </Text>
              )}
              {user?.email && currentProfile.location && (
                <Text style={[styles.locationText, { color: colors.tabIconDefault }]}>
                  {' • '}
                </Text>
              )}
              {currentProfile.location && (
                <>
                  <Ionicons name="location-outline" size={16} color={colors.tabIconDefault} />
                  <Text style={[styles.locationText, { color: colors.tabIconDefault }]}>
                    {currentProfile.location}
                  </Text>
                </>
              )}
            </View>
          )}

          {/* Sports Badges */}
          {currentProfile.sports && currentProfile.sports.length > 0 && (
            <View style={styles.badgesContainer}>
              {currentProfile.sports.map((sportItem: any, index: number) => {
                // Handle both old format (object with sport property) and new format (string)
                const sport = typeof sportItem === 'string' ? sportItem : sportItem.sport;
                if (!sport) return null;

                return (
                  <View
                    key={index}
                    style={[
                      styles.badge,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    <Text style={styles.sportEmoji}>
                      {getSportEmoji(sport)}
                    </Text>
                    <Text style={[styles.badgeText, { color: colors.text }]}>
                      {t(`sports.${sport.toLowerCase()}`)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Photos Grid */}
        {currentProfile.photos && currentProfile.photos.length > 0 && (
          <View style={styles.photosGrid}>
            {currentProfile.photos.map((photo: string, index: number) => (
              <TouchableOpacity
                key={index}
                style={styles.photoContainer}
                onPress={() => handleImagePress(index)}
                activeOpacity={0.8}
              >
                <Image
                  source={{ uri: photo }}
                  style={styles.gridPhoto}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ))}
          </View>
        )}
      </ScrollView>

      {currentProfile && (
        <ProfileEditModal
          visible={isProfileModalVisible}
          onClose={() => setIsProfileModalVisible(false)}
          profile={{
            ...currentProfile,
            email: user?.email,
          }}
          onProfileUpdated={() => {
            setIsProfileModalVisible(false);
          }}
        />
      )}

      {currentProfile?.photos && (
        <ImageModal
          visible={isImageModalVisible}
          imageUrl={null}
          imageUrls={currentProfile.photos}
          initialIndex={selectedImageIndex}
          onClose={() => setIsImageModalVisible(false)}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  headerSpacer: {
    flex: 1,
  },
  menuButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 4,
    paddingBottom: 50,
  },
  profileHeader: {
    alignItems: "center",
    marginTop: -30,
    paddingBottom: 12,
    paddingHorizontal: 20,
  },
  profileAvatarContainer: {
    marginBottom: 8,
  },
  avatarFallback: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarFallbackText: {
    fontSize: 48,
    fontWeight: "bold",
    color: "white",
  },
  nameContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  displayName: {
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 32,
    marginRight: 8,
  },
  handle: {
    fontSize: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    marginBottom: 16,
  },
  locationText: {
    fontSize: 16,
  },
  editButtonSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  locationBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: "center",
    marginBottom: 8,
  },
  badgesContainer: {
    flexDirection: "row",
    justifyContent: "center",
    flexWrap: "wrap",
    columnGap: 8,
    rowGap: 4,
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 16,
    borderWidth: 1,
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "500",
    letterSpacing: 0.2,
  },
  sportEmoji: {
    fontSize: 16,
  },
  section: {
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginHorizontal: 20,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  photosGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 10,
    justifyContent: "flex-start",
    gap: 2,
  },
  photoContainer: {
    width: "32.8%",
    aspectRatio: 0.7,
    marginBottom: 1,
  },
  gridPhoto: {
    width: "100%",
    height: "100%",
  },
  menuContainer: {
    marginLeft: 28,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  menuButtonFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  menuButtonLast: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  menuSeparator: {
    height: 0.5,
    marginLeft: 60,
    opacity: 0.3,
  },
  menuButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuButtonTitle: {
    fontSize: 15,
    marginBottom: 1,
  },
  menuButtonSubtitle: {
    fontSize: 13,
    opacity: 0.8,
  },
});
