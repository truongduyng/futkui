import { Colors } from "@/constants/Colors";
import { useInstantDB } from "@/hooks/useInstantDB";
import { Ionicons } from '@expo/vector-icons';
import React, { useState, useEffect } from "react";
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
import { CachedAvatar } from "@/components/chat/CachedAvatar";

export default function ExploreScreen() {
  const [shareLink, setShareLink] = useState("");
  const colors = Colors["light"];

  const { queryAllGroupsOnce, useProfile, joinGroup } = useInstantDB();
  const { data: profileData } = useProfile();
  
  const [allGroups, setAllGroups] = useState<any[]>([]);

  useEffect(() => {
    const fetchGroups = async () => {
      try {
        const result = await queryAllGroupsOnce();
        const groups = result?.data?.groups?.filter((g: any) => g && g.id) || [];
        setAllGroups(groups);
      } catch (error) {
        console.error('Error fetching groups:', error);
      }
    };

    fetchGroups();
  }, [queryAllGroupsOnce]);
  const currentProfile = profileData?.profiles?.[0];

  // Show popular/featured groups for showcase (including user's own groups)
  const showcaseGroups = allGroups
    .filter(
      (group: any) => group && group.id && group.admin?.handle !== "fk", // Filter out bot groups
    )
    .sort((a: any, b: any) => {
      // Sort by member count (descending) to show most popular first
      const aMemberCount = a.memberships?.length || 0;
      const bMemberCount = b.memberships?.length || 0;
      return bMemberCount - aMemberCount;
    })
    .slice(0, 10); // Show top 10 groups

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

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Join a Group
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
              placeholder="Enter group link..."
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
            style={[styles.sectionDescription, { color: colors.tabIconDefault }]}
          >
            Discover what others are talking about • {allGroups.length}+ clubs
          </Text>
          <View style={styles.groupList}>
            {showcaseGroups.length === 0 ? (
              <Text style={[styles.emptyText, { color: colors.tabIconDefault }]}>
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
                    <View style={[
                      styles.avatarContainer,
                      group.avatarFile?.url && styles.avatarContainerWithImage
                    ]}>
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
    backgroundColor: 'transparent',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 4,
    paddingBottom: 20,
  },
  section: {
    marginTop: 16,
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
    fontSize: 18,
    fontWeight: "700",
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
