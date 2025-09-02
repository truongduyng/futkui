import { LanguageSelector } from "@/components/LanguageSelector";
import { ProfileEditModal } from "@/components/ProfileEditModal";
import { ThemeSwitcher } from "@/components/ThemeSwitcher";
import { Colors } from "@/constants/Colors";
import { useTheme } from '@/contexts/ThemeContext';
import { useInstantDB } from "@/hooks/useInstantDB";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Platform,
  StatusBar as RNStatusBar,
} from "react-native";
import { useTranslation } from "react-i18next";
import i18n from "@/i18n";

export default function MenuScreen() {
  const { t } = useTranslation();
  const { isDark, themeMode } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const { useProfile, instantClient } =
    useInstantDB();
  const { data: profileData } = useProfile();
  const { user } = instantClient.useAuth();

  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [isThemeSwitcherVisible, setIsThemeSwitcherVisible] = useState(false);
  const [isLanguageSelectorVisible, setIsLanguageSelectorVisible] = useState(false);

  const currentProfile = profileData?.profiles?.[0];

  const handleSignOut = async () => {
    Alert.alert(t('explore.signOut'), t('explore.signOutConfirm'), [
      { text: t('common.cancel'), style: "cancel" },
      {
        text: t('explore.signOut'),
        style: "destructive",
        onPress: () => instantClient.auth.signOut(),
      },
    ]);
  };

  const handleAbout = () => {
    router.push('/about');
  };

  const handleTheme = () => {
    setIsThemeSwitcherVisible(true);
  };

  const handleLanguageSelection = () => {
    setIsLanguageSelectorVisible(true);
  };

  const handleDeleteAccount = async () => {
    Alert.alert(
      t('explore.deleteAccount'),
      t('explore.deleteAccountConfirm'),
      [
        { text: t('common.cancel'), style: "cancel" },
        {
          text: t('explore.deleteAccount'),
          style: "destructive",
          onPress: async () => {
            try {
              const token = user?.refresh_token;

              if (!token) {
                Alert.alert(t('common.error'), t('explore.authError'));
                return;
              }

              const response = await fetch(`${process.env.EXPO_PUBLIC_BACKEND_URL}/api/account`, {
                method: 'DELETE',
                headers: {
                  'Authorization': `Bearer ${token}`,
                },
              });

              if (response.ok) {
                await instantClient.auth.signOut();
                Alert.alert(t('explore.deleteAccount'), t('explore.accountDeleted'));
              } else {
                const errorData = await response.json();
                Alert.alert(t('explore.deleteAccount'), errorData.error || t('explore.deletionFailed'));
              }
            } catch (error) {
              console.error("Error deleting account:", error);
              Alert.alert(t('common.error'), t('explore.deleteError'));
            }
          },
        },
      ]
    );
  };


  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? RNStatusBar.currentHeight : 0 }]}
    >
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Menu Section */}
        <View style={styles.section}>
          <View style={[styles.menuContainer, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleLanguageSelection}
              activeOpacity={0.8}
            >
              <View style={styles.menuButtonContent}>
                <View
                  style={[
                    styles.menuIconContainer,
                    { backgroundColor: "rgba(34, 197, 94, 0.1)" },
                  ]}
                >
                  <Ionicons name="language-outline" size={20} color="#22C55E" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text
                    style={[styles.menuButtonTitle, { color: colors.text }]}
                  >
                    {t('chat.language')}
                  </Text>
                  <Text
                    style={[
                      styles.menuButtonSubtitle,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {i18n.language === 'vi' ? t('chat.vietnamese') : t('chat.english')}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.tabIconDefault}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleTheme}
              activeOpacity={0.8}
            >
              <View style={styles.menuButtonContent}>
                <View
                  style={[
                    styles.menuIconContainer,
                    { backgroundColor: "rgba(139, 69, 19, 0.1)" },
                  ]}
                >
                  <Ionicons name="color-palette-outline" size={20} color="#8B4513" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text
                    style={[styles.menuButtonTitle, { color: colors.text }]}
                  >
                    {t('explore.theme')}
                  </Text>
                  <Text
                    style={[
                      styles.menuButtonSubtitle,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {themeMode === 'system' ? t('explore.system') : themeMode === 'dark' ? t('explore.dark') : t('explore.light')}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.tabIconDefault}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleAbout}
              activeOpacity={0.8}
            >
              <View style={styles.menuButtonContent}>
                <View
                  style={[
                    styles.menuIconContainer,
                    { backgroundColor: "rgba(96, 125, 139, 0.1)" },
                  ]}
                >
                  <Ionicons name="information-circle-outline" size={20} color="#607D8B" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text
                    style={[styles.menuButtonTitle, { color: colors.text }]}
                  >
                    {t('explore.about')}
                  </Text>
                  <Text
                    style={[
                      styles.menuButtonSubtitle,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {t('explore.aboutDescription')}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.tabIconDefault}
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleSignOut}
              activeOpacity={0.8}
            >
              <View style={styles.menuButtonContent}>
                <View
                  style={[
                    styles.menuIconContainer,
                    { backgroundColor: "rgba(255, 107, 107, 0.1)" },
                  ]}
                >
                  <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuButtonTitle, { color: "#FF6B6B" }]}>
                    {t('explore.signOut')}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FF6B6B" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleDeleteAccount}
              activeOpacity={0.8}
            >
              <View style={styles.menuButtonContent}>
                <View
                  style={[
                    styles.menuIconContainer,
                    { backgroundColor: "rgba(220, 38, 38, 0.1)" },
                  ]}
                >
                  <Ionicons name="trash-outline" size={20} color="#DC2626" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text style={[styles.menuButtonTitle, { color: "#DC2626" }]}>
                    {t('explore.deleteAccount')}
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#DC2626" />
            </TouchableOpacity>
          </View>
        </View>

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
            // The profile will automatically update via InstantDB's real-time updates
            setIsProfileModalVisible(false);
          }}
        />
      )}


      <ThemeSwitcher
        visible={isThemeSwitcherVisible}
        onClose={() => setIsThemeSwitcherVisible(false)}
      />

      <LanguageSelector
        visible={isLanguageSelectorVisible}
        onClose={() => setIsLanguageSelectorVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  menuContainer: {
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.2)",
  },
  menuButtonFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  menuButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuAvatarContainer: {
    width: 32,
    height: 32,
    marginRight: 12,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  menuAvatarText: {
    fontSize: 16,
    textAlign: "center",
    width: "100%",
    height: "100%",
    lineHeight: 32,
    color: "white",
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
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 4,
    paddingBottom: 50,
  },
  section: {
    marginTop: 4,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
});
