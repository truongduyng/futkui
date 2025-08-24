import { Colors } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useInstantDB } from "@/hooks/useInstantDB";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useCallback } from "react";

interface Member {
  id: string;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
  role?: string;
}

export default function GroupProfileScreen() {
  const params = useLocalSearchParams<{ groupId: string }>();
  const groupId = params?.groupId;
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const navigation = useNavigation();

  const { useGroup, useUserMembership, useMessages, leaveGroup } =
    useInstantDB();

  const { data: groupData } = useGroup(groupId || "");
  const { data: membershipData } = useUserMembership(groupId || "");
  const { data: messagesData } = useMessages(groupId || "", 50);

  const userMembership = membershipData?.memberships?.[0];
  const group = groupData?.groups?.[0];

  const members: Member[] =
    group?.memberships
      ?.map((membership) => ({
        id: membership.profile?.id || "",
        handle: membership.profile?.handle || "",
        displayName: membership.profile?.displayName,
        avatarUrl: membership.profile?.avatarUrl,
        role: membership.role,
      }))
      .filter((member) => member.id && member.handle) || [];

  const handleShareGroup = useCallback(async () => {
    if (group?.shareLink) {
      try {
        await Clipboard.setStringAsync(group.shareLink);
        Alert.alert(
          "Share Link Copied",
          "The group invite link has been copied to your clipboard!",
        );
      } catch (error) {
        console.error("Copy error:", error);
        Alert.alert("Error", "Failed to copy share link");
      }
    }
  }, [group?.shareLink]);

  // Get recent activities (polls, matches, messages)
  const recentActivities =
    messagesData?.messages
      ?.filter(
        (msg) =>
          msg.type === "poll" || msg.type === "match" || msg.poll || msg.match,
      )
      ?.slice(0, 5) || [];

  const handleViewActivities = () => {
    router.push(`/activity/${groupId}`);
  };

  // Set screen title and header
  useEffect(() => {
    if (group?.name) {
      navigation.setOptions({
        title: group.name,
        headerRight: () => (
          <TouchableOpacity
            onPress={handleShareGroup}
            style={{
              minWidth: 44,
              minHeight: 44,
              justifyContent: "center",
              alignItems: "center",
            }}
            activeOpacity={0.7}
          >
            <Ionicons name="share-outline" size={20} color={colors.tint} />
          </TouchableOpacity>
        ),
      });
    }
  }, [group?.name, navigation, colors, handleShareGroup]);

  const handleLeaveGroup = () => {
    Alert.alert("Leave Group", "Are you sure you want to leave this group?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Leave",
        style: "destructive",
        onPress: async () => {
          try {
            if (userMembership?.id) {
              await leaveGroup(userMembership.id);
              router.back();
            }
          } catch (error) {
            console.error("Error leaving group:", error);
            Alert.alert("Error", "Failed to leave group");
          }
        },
      },
    ]);
  };

  if (!group) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.errorText, { color: colors.text }]}>
          Group not found
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Group Header */}
        <View style={styles.groupHeader}>
          <View
            style={[styles.avatarContainer, { backgroundColor: colors.card }]}
          >
            {group.avatarUrl ? (
              <Image
                source={{ uri: group.avatarUrl }}
                style={styles.groupAvatar}
              />
            ) : (
              <Ionicons name="people" size={40} color={colors.tabIconDefault} />
            )}
          </View>
          <Text style={[styles.groupName, { color: colors.text }]}>
            {group.name}
          </Text>
          {group.description && (
            <Text
              style={[
                styles.groupDescription,
                { color: colors.tabIconDefault },
              ]}
            >
              {group.description}
            </Text>
          )}
          <Text style={[styles.memberCount, { color: colors.tabIconDefault }]}>
            {members.length} {members.length === 1 ? "member" : "members"}
          </Text>
        </View>

        {/* Recent Activities Section */}
        {recentActivities.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              Recent Activities
            </Text>
            <View
              style={[styles.activitiesList, { backgroundColor: colors.card }]}
            >
              {recentActivities.map((activity, index) => {
                const isLast = index === recentActivities.length - 1;
                const isPoll = activity.poll || activity.type === "poll";
                const isMatch = activity.match || activity.type === "match";

                return (
                  <View
                    key={activity.id}
                    style={[
                      styles.activityRow,
                      !isLast && {
                        borderBottomColor: colors.border,
                        borderBottomWidth: StyleSheet.hairlineWidth,
                      },
                    ]}
                  >
                    <View style={styles.activityIcon}>
                      <Ionicons
                        name={
                          isPoll
                            ? "bar-chart"
                            : isMatch
                            ? "football"
                            : "chatbubble"
                        }
                        size={20}
                        color={colors.tint}
                      />
                    </View>
                    <View style={styles.activityContent}>
                      <Text
                        style={[styles.activityTitle, { color: colors.text }]}
                      >
                        {isPoll
                          ? activity.poll?.question || "Poll"
                          : isMatch
                          ? activity.match?.title || "Match"
                          : "Message"}
                      </Text>
                      <Text
                        style={[
                          styles.activityTime,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        {new Date(activity.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                );
              })}
              <TouchableOpacity
                style={styles.option}
                onPress={handleViewActivities}
                activeOpacity={0.6}
              >
                <View style={styles.optionLeft}>
                  <Ionicons
                    name="analytics-outline"
                    size={24}
                    color={colors.tint}
                    style={styles.optionIcon}
                  />
                  <Text style={[styles.optionText, { color: colors.text }]}>
                    View All Activities
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.tabIconDefault}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Members Section */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Members
          </Text>
          <View style={[styles.membersList, { backgroundColor: colors.card }]}>
            {members.map((member, index) => (
              <View
                key={member.id}
                style={[
                  styles.memberRow,
                  index === members.length - 1 && styles.memberRowLast,
                  { borderBottomColor: colors.border },
                ]}
              >
                <View style={styles.memberInfo}>
                  <View
                    style={[
                      styles.memberAvatar,
                      { backgroundColor: colors.background },
                    ]}
                  >
                    {member.avatarUrl ? (
                      <Image
                        source={{ uri: member.avatarUrl }}
                        style={styles.memberAvatarImage}
                      />
                    ) : (
                      <Text
                        style={[
                          styles.memberAvatarText,
                          { color: colors.tint },
                        ]}
                      >
                        {(member.displayName || member.handle)
                          .charAt(0)
                          .toUpperCase()}
                      </Text>
                    )}
                  </View>
                  <View style={styles.memberDetails}>
                    <View style={styles.memberNameRow}>
                      <Text style={[styles.memberName, { color: colors.text }]}>
                        {member.displayName || member.handle}
                      </Text>
                      {member.id === group.adminId && (
                        <View
                          style={[
                            styles.adminBadge,
                            { backgroundColor: colors.tint + "20" },
                          ]}
                        >
                          <Text
                            style={[styles.adminText, { color: colors.tint }]}
                          >
                            Admin
                          </Text>
                        </View>
                      )}
                    </View>
                    {member.displayName && (
                      <Text
                        style={[
                          styles.memberHandle,
                          { color: colors.tabIconDefault },
                        ]}
                      >
                        @{member.handle}
                      </Text>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Danger Zone */}
        <View style={styles.section}>
          <View style={[styles.dangerZone, { backgroundColor: "#FF3B3010" }]}>
            <TouchableOpacity
              style={styles.option}
              onPress={handleLeaveGroup}
              activeOpacity={0.6}
            >
              <View style={styles.optionLeft}>
                <Ionicons
                  name="exit-outline"
                  size={24}
                  color="#FF3B30"
                  style={styles.optionIcon}
                />
                <Text style={[styles.optionText, { color: "#FF3B30" }]}>
                  Leave Group
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flex: 1,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "500",
  },
  groupHeader: {
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 32,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  groupAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  groupName: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 8,
    textAlign: "center",
  },
  groupDescription: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 12,
    lineHeight: 22,
  },
  memberCount: {
    fontSize: 14,
    fontWeight: "500",
  },
  section: {
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  membersList: {
    marginHorizontal: 20,
    borderRadius: 12,
  },
  memberRow: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  memberRowLast: {
    borderBottomWidth: 0,
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  memberAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: "600",
  },
  memberDetails: {
    flex: 1,
  },
  memberNameRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 2,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    marginRight: 8,
  },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  adminText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  memberHandle: {
    fontSize: 14,
  },
  actionsList: {
    marginHorizontal: 20,
    borderRadius: 12,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 56,
  },
  dangerZone: {
    marginHorizontal: 20,
    borderRadius: 12,
  },
  activitiesList: {
    marginHorizontal: 20,
    borderRadius: 12,
  },
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  activityTime: {
    fontSize: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  optionIcon: {
    marginRight: 16,
  },
  optionText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
