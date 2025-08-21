import { CachedAvatar } from "@/components/chat/CachedAvatar";
import { ProfileEditModal } from "@/components/ProfileEditModal";
import { WebViewModal } from "@/components/WebViewModal";
import { Colors } from "@/constants/Colors";
import { useInstantDB } from "@/hooks/useInstantDB";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from "react-i18next";

export default function ExploreScreen() {
  const { t } = useTranslation();
  const colors = Colors["light"];

  const { queryAllGroupsOnce, useProfile, instantClient } =
    useInstantDB();
  const { data: profileData } = useProfile();
  const { user } = instantClient.useAuth();

  const [allGroups, setAllGroups] = useState<any[]>([]);
  const [isProfileModalVisible, setIsProfileModalVisible] = useState(false);
  const [isPrivacyModalVisible, setIsPrivacyModalVisible] = useState(false);
  const [isTermsModalVisible, setIsTermsModalVisible] = useState(false);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const result = await queryAllGroupsOnce();
        const groups =
          result?.data?.groups?.filter((g: any) => g && g.id) || [];
        setAllGroups(groups);
      } catch (error) {
        console.error("Error fetching groups:", error);
      }
    };

    fetchGroups();
  }, [queryAllGroupsOnce]);
  const currentProfile = profileData?.profiles?.[0];

  // Show newest groups for showcase (filtered from 10 newest from DB)
  const showcaseGroups = allGroups.filter(
    (group: any) => group && group.id && group.admin?.handle !== "fk", // Filter out bot groups
  );


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

  const handleProfile = () => {
    setIsProfileModalVisible(true);
  };

  const handlePrivacy = () => {
    setIsPrivacyModalVisible(true);
  };

  const handleTerms = () => {
    setIsTermsModalVisible(true);
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
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Top Menu Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('explore.menu')}
          </Text>
          <View style={[styles.menuContainer, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={[styles.menuButton, styles.menuButtonFirst]}
              onPress={handleProfile}
              activeOpacity={0.8}
            >
              <View style={styles.menuButtonContent}>
                <View
                  style={[
                    styles.menuAvatarContainer,
                    { backgroundColor: "rgba(255, 255, 255, 0.1)" },
                  ]}
                >
                  {currentProfile?.avatarUrl ? (
                    <CachedAvatar
                      uri={currentProfile.avatarUrl}
                      size={32}
                      fallbackComponent={
                        <Text
                          style={[
                            styles.menuAvatarText,
                            { backgroundColor: colors.tint },
                          ]}
                        >
                          {currentProfile.displayName?.charAt(0) ||
                            currentProfile.handle?.charAt(0) ||
                            "U"}
                        </Text>
                      }
                    />
                  ) : (
                    <Text
                      style={[
                        styles.menuAvatarText,
                        { backgroundColor: colors.tint },
                      ]}
                    >
                      {currentProfile?.displayName?.charAt(0) ||
                        currentProfile?.handle?.charAt(0) ||
                        "U"}
                    </Text>
                  )}
                </View>
                <View style={styles.menuTextContainer}>
                  <Text
                    style={[styles.menuButtonTitle, { color: colors.text }]}
                  >
                    {currentProfile?.displayName}
                  </Text>
                  <Text
                    style={[
                      styles.menuButtonSubtitle,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    @{currentProfile?.handle}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.tabIconDefault}
              />
            </TouchableOpacity>

            <View style={[styles.menuSeparator, { backgroundColor: colors.tabIconDefault }]} />

            <TouchableOpacity
              style={styles.menuButton}
              onPress={handlePrivacy}
              activeOpacity={0.8}
            >
              <View style={styles.menuButtonContent}>
                <View
                  style={[
                    styles.menuIconContainer,
                    { backgroundColor: "rgba(74, 144, 226, 0.1)" },
                  ]}
                >
                  <Ionicons name="shield-outline" size={20} color="#4A90E2" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text
                    style={[styles.menuButtonTitle, { color: colors.text }]}
                  >
                    {t('explore.privacy')}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.tabIconDefault}
              />
            </TouchableOpacity>

            <View style={[styles.menuSeparator, { backgroundColor: colors.tabIconDefault }]} />

            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleTerms}
              activeOpacity={0.8}
            >
              <View style={styles.menuButtonContent}>
                <View
                  style={[
                    styles.menuIconContainer,
                    { backgroundColor: "rgba(156, 39, 176, 0.1)" },
                  ]}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color="#9C27B0"
                  />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text
                    style={[styles.menuButtonTitle, { color: colors.text }]}
                  >
                    {t('explore.termsOfService')}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.tabIconDefault}
              />
            </TouchableOpacity>

            <View style={[styles.menuSeparator, { backgroundColor: colors.tabIconDefault }]} />

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

            <View style={[styles.menuSeparator, { backgroundColor: colors.tabIconDefault }]} />

            <TouchableOpacity
              style={[styles.menuButton, styles.menuButtonLast]}
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

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t('explore.communities')}
          </Text>
          <Text
            style={[
              styles.sectionDescription,
              { color: colors.tabIconDefault },
            ]}
          >
            {t('explore.communitiesDescription')}
          </Text>
          <View style={styles.groupList}>
            {showcaseGroups.length === 0 ? (
              <Text
                style={[styles.emptyText, { color: colors.tabIconDefault }]}
              >
                {t('explore.noCommunitiesYet')}
              </Text>
            ) : (
              showcaseGroups.map((group: any) => {
                return (
                  <View
                    key={group.id}
                    style={[
                      styles.groupItem,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    <View
                      style={[
                        styles.avatarContainer,
                        group.avatarUrl &&
                          styles.avatarContainerWithImage,
                      ]}
                    >
                      {group.avatarUrl ? (
                        <CachedAvatar
                          uri={group.avatarUrl}
                          size={40}
                          fallbackComponent={
                            <Text style={styles.groupEmoji}>
                              {group.name.charAt(0).toUpperCase()}
                            </Text>
                          }
                        />
                      ) : (
                        <Text style={styles.groupEmoji}>
                          {group.name.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                    <View style={styles.groupInfo}>
                      <Text style={[styles.groupName, { color: colors.text }]}>
                        {group.name}
                      </Text>
                      <Text
                        style={[
                          styles.groupDescription,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        {group.description}
                      </Text>
                    </View>
                    <View style={styles.memberCountContainer}>
                      <Text
                        style={[
                          styles.memberCount,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        {group.memberships?.length || 0}
                      </Text>
                      <Ionicons
                        name="person-outline"
                        size={24}
                        color={colors.tabIconDefault}
                        style={styles.memberIcon}
                      />
                    </View>
                  </View>
                );
              })
            )}
          </View>
        </View>
      </ScrollView>

      {currentProfile && (
        <ProfileEditModal
          visible={isProfileModalVisible}
          onClose={() => setIsProfileModalVisible(false)}
          profile={currentProfile}
          onProfileUpdated={() => {
            // The profile will automatically update via InstantDB's real-time updates
            setIsProfileModalVisible(false);
          }}
        />
      )}

      <WebViewModal
        visible={isPrivacyModalVisible}
        onClose={() => setIsPrivacyModalVisible(false)}
        url="https://futkui.com/en/privacy"
        title="Privacy Policy"
      />

      <WebViewModal
        visible={isTermsModalVisible}
        onClose={() => setIsTermsModalVisible(false)}
        url="https://futkui.com/en/terms"
        title="Terms of Service"
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  menuContainer: {
    marginHorizontal: 20,
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
    paddingVertical: 8,
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
    marginLeft: 68,
    opacity: 0.3,
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
  sectionDescription: {
    fontSize: 14,
    marginBottom: 16,
    paddingHorizontal: 16,
    fontStyle: "italic",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    fontStyle: "italic",
    marginTop: 20,
  },
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  avatarContainer: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarContainerWithImage: {
    backgroundColor: "transparent",
  },
  groupEmoji: {
    fontSize: 20,
    textAlign: "center",
    width: "100%",
    height: "100%",
    lineHeight: 40,
    backgroundColor: Colors.light.tint,
    color: "white",
  },
  groupInfo: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  memberBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  memberBadgeText: {
    color: "white",
    fontSize: 10,
    fontWeight: "600",
  },
  groupName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  groupDescription: {
    fontSize: 14,
    marginBottom: 4,
    lineHeight: 20,
  },
  memberCountContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    minWidth: 50,
    paddingHorizontal: 8,
  },
  memberIcon: {
    marginLeft: 4,
    opacity: 0.7,
  },
  memberCount: {
    fontSize: 20,
    fontWeight: "600",
    opacity: 0.8,
  },
  groupList: {
    paddingHorizontal: 16,
  },
});
