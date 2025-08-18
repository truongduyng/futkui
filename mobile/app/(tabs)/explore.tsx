import { CachedAvatar } from "@/components/chat/CachedAvatar";
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
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ExploreScreen() {
  const [shareLink, setShareLink] = useState("");
  const colors = Colors["light"];

  const { queryAllGroupsOnce, useProfile, joinGroup, instantClient } =
    useInstantDB();
  const { data: profileData } = useProfile();

  const [allGroups, setAllGroups] = useState<any[]>([]);

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

  const handleJoinViaLink = async () => {
    if (!shareLink.trim()) {
      Alert.alert("Error", "Please enter a group link");
      return;
    }

    // Find group by share link
    const group = allGroups.find(
      (g: any) => g && g.shareLink === shareLink.trim(),
    );
    if (group && group.id && currentProfile) {
      // Check if user is already a member
      const isAlreadyMember = group.memberships?.some(
        (membership: any) => membership?.profile?.id === currentProfile.id,
      );

      if (isAlreadyMember) {
        Alert.alert(
          "Already a Member",
          `You are already a member of "${group.name}".`,
        );
        setShareLink("");
        return;
      }

      try {
        await joinGroup(group.id, currentProfile.id);
        Alert.alert("Success", `Joined group: ${group.name}`);
        setShareLink("");
      } catch {
        Alert.alert("Error", "Failed to join group. Please try again.");
      }
    } else {
      Alert.alert("Error", "Group not found. Please check the link.");
    }
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: () => instantClient.auth.signOut(),
      },
    ]);
  };

  const handleProfile = () => {
    Alert.alert("Profile", "Profile settings coming soon!");
  };

  const handlePrivacy = () => {
    Alert.alert("Privacy", "Privacy policy coming soon!");
  };

  const handleTerms = () => {
    Alert.alert("Terms of Service", "Terms of service coming soon!");
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
            Menu
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
                  {currentProfile?.avatar?.url ? (
                    <CachedAvatar
                      uri={currentProfile.avatar.url}
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
                    Profile
                  </Text>
                  <Text
                    style={[
                      styles.menuButtonSubtitle,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {currentProfile?.displayName ||
                      currentProfile?.handle ||
                      "User"}
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
                    Privacy
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
                    Terms of Service
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
              style={[styles.menuButton, styles.menuButtonLast]}
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
                    Sign Out
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#FF6B6B" />
            </TouchableOpacity>
          </View>
        </View>
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Join a Club
          </Text>
          <View style={styles.joinContainer}>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.background,
                  borderColor: colors.tabIconDefault,
                },
              ]}
              value={shareLink}
              onChangeText={setShareLink}
              placeholder="Enter club link..."
              placeholderTextColor={colors.tabIconDefault}
            />
            <TouchableOpacity
              style={[styles.joinButton, { backgroundColor: colors.tint }]}
              onPress={handleJoinViaLink}
              activeOpacity={0.8}
            >
              <Text style={styles.joinButtonText}>Join</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Communities
          </Text>
          <Text
            style={[
              styles.sectionDescription,
              { color: colors.tabIconDefault },
            ]}
          >
            Most active clubs on the platform
          </Text>
          <View style={styles.groupList}>
            {showcaseGroups.length === 0 ? (
              <Text
                style={[styles.emptyText, { color: colors.tabIconDefault }]}
              >
                No communities to showcase at the moment.
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
                        group.avatarFile?.url &&
                          styles.avatarContainerWithImage,
                      ]}
                    >
                      {group.avatarFile?.url ? (
                        <CachedAvatar
                          uri={group.avatarFile.url}
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
    fontWeight: "600",
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
    paddingBottom: 20,
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
  joinContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    marginRight: 12,
  },
  joinButton: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 12,
    minWidth: 80,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  joinButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 0.5,
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
