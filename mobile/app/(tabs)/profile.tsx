import { CachedAvatar } from "@/components/chat/CachedAvatar";
import { ProfileEditModal } from "@/components/ProfileEditModal";
import { Colors } from "@/constants/Colors";
import { useTheme } from '@/contexts/ThemeContext';
import { useInstantDB } from "@/hooks/useInstantDB";
import { Ionicons } from "@expo/vector-icons";
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

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const { useProfile, instantClient } = useInstantDB();
  const { data: profileData } = useProfile();
  const { user } = instantClient.useAuth();

  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);

  const currentProfile = profileData?.profiles?.[0];

  const handleEditProfile = () => {
    setIsProfileModalVisible(true);
  };

  if (!currentProfile) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t('common.loading')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 }]}
    >
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Profile Header Section */}
        <View style={styles.profileHeader}>
          <View style={styles.profileAvatarContainer}>
            {currentProfile.avatarUrl ? (
              <CachedAvatar
                uri={currentProfile.avatarUrl}
                size={120}
                fallbackComponent={
                  <View style={[styles.avatarFallback, { backgroundColor: colors.tint }]}>
                    <Text style={styles.avatarFallbackText}>
                      {currentProfile.displayName?.charAt(0) ||
                        currentProfile.handle?.charAt(0) ||
                        "U"}
                    </Text>
                  </View>
                }
              />
            ) : (
              <View style={[styles.avatarFallback, { backgroundColor: colors.tint }]}>
                <Text style={styles.avatarFallbackText}>
                  {currentProfile.displayName?.charAt(0) ||
                    currentProfile.handle?.charAt(0) ||
                    "U"}
                </Text>
              </View>
            )}
          </View>

          <Text style={[styles.displayName, { color: colors.text }]}>
            {currentProfile.displayName}
          </Text>
          <Text style={[styles.handle, { color: colors.tabIconDefault }]}>
            @{currentProfile.handle}
          </Text>
          {user?.email && (
            <Text style={[styles.email, { color: colors.tabIconDefault }]}>
              {user.email}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.editButton, { backgroundColor: colors.tint }]}
            onPress={handleEditProfile}
            activeOpacity={0.8}
          >
            <Ionicons name="create-outline" size={18} color="white" />
            <Text style={styles.editButtonText}>{t('profile.editProfile')}</Text>
          </TouchableOpacity>
        </View>

        {/* Location Section */}
        {currentProfile.location && (
          <View style={[styles.section, { backgroundColor: colors.background }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="location-outline" size={20} color={colors.tint} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('profile.location')}
              </Text>
            </View>
            <Text style={[styles.locationText, { color: colors.tabIconDefault }]}>
              {currentProfile.location}
            </Text>
          </View>
        )}

        {/* Sports & Levels Section */}
        {currentProfile.sports && currentProfile.sports.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.background }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="fitness-outline" size={20} color={colors.tint} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('profile.sportsAndLevels')}
              </Text>
            </View>
            <View style={styles.sportsContainer}>
              {currentProfile.sports.map((sportWithLevel: { sport: string; level: string }, index: number) => (
                <View key={index} style={[styles.sportTag, { backgroundColor: colors.tabIconDefault }]}>
                  <Text style={[styles.sportName, { color: colors.text }]}>
                    {t(`sports.${sportWithLevel.sport.toLowerCase()}`)}
                  </Text>
                  <Text style={[styles.sportLevel, { color: colors.tabIconDefault }]}>
                    {t(`profile.skillLevels.${sportWithLevel.level}`)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Photos Section */}
        {currentProfile.photos && currentProfile.photos.length > 0 && (
          <View style={[styles.section, { backgroundColor: colors.background }]}>
            <View style={styles.sectionHeader}>
              <Ionicons name="images-outline" size={20} color={colors.tint} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t('profile.additionalPhotos')}
              </Text>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.photosScrollContainer}
            >
              {currentProfile.photos.map((photo: string, index: number) => (
                <Image
                  key={index}
                  source={{ uri: photo }}
                  style={styles.photo}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {currentProfile && (
        <ProfileEditModal
          visible={isProfileModalVisible}
          onClose={() => setIsProfileModalVisible(false)}
          profile={{
            ...currentProfile,
            email: user?.email
          }}
          onProfileUpdated={() => {
            setIsProfileModalVisible(false);
          }}
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
  },
  profileAvatarContainer: {
    marginBottom: 16,
  },
  avatarFallback: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarFallbackText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  displayName: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
    textAlign: 'center',
  },
  handle: {
    fontSize: 16,
    marginBottom: 4,
    textAlign: 'center',
  },
  email: {
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    gap: 8,
  },
  editButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
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
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  locationText: {
    fontSize: 16,
    marginLeft: 28,
  },
  sportsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginLeft: 28,
  },
  sportTag: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  sportName: {
    fontSize: 14,
    fontWeight: '600',
  },
  sportLevel: {
    fontSize: 12,
    opacity: 0.7,
  },
  photosScrollContainer: {
    paddingLeft: 28,
    gap: 12,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 12,
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
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
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
