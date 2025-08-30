import { Colors } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { instantClient, useInstantDB } from "@/hooks/useInstantDB";
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
import { useTranslation } from 'react-i18next';
import { useToast } from "@/hooks/useToast";
import { EditGroupModal } from '@/components/chat/EditGroupModal';
import { ReportModal } from '@/components/chat/ReportModal';
import { BlockUserModal } from '@/components/chat/BlockUserModal';

interface Member {
  id: string;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
  role?: string;
  membershipId?: string;
}

export default function GroupProfileScreen() {
  const params = useLocalSearchParams<{ groupId: string }>();
  const groupId = params?.groupId;
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();

  const { useGroup, useUserMembership, useMessages, leaveGroup, removeMember, updateGroup, reportGroup, useBlockedUsers, blockUser, unblockUser } =
    useInstantDB();

  const { data: groupData } = useGroup(groupId || "");
  const { data: membershipData } = useUserMembership(groupId || "");
  const { data: messagesData } = useMessages(groupId || "", 50);
  const { data: blockedData } = useBlockedUsers();

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
        membershipId: membership.id,
      }))
      .filter((member) => member.id && member.handle) || [];

  const isCurrentUserAdmin = userMembership?.role === "admin";
  const isBotGroup = group?.creator?.handle === 'fk';

  const [showEditModal, setShowEditModal] = React.useState(false);
  const [showReportModal, setShowReportModal] = React.useState(false);
  const [blockModalUser, setBlockModalUser] = React.useState<Member | null>(null);

  const { user: currentUser } = instantClient.useAuth();

  const handleShareGroup = useCallback(async () => {
    // Prevent sharing bot groups
    if (isBotGroup) {
      showError(t('common.error'), t('groupProfile.cannotShareBotGroup'));
      return;
    }
    if (group?.shareLink) {
      try {
        await Clipboard.setStringAsync(group.shareLink);
        showSuccess(
          t('groupProfile.shareLinkCopied'),
          t('groupProfile.shareLinkCopiedMessage')
        );
      } catch (error) {
        console.error("Copy error:", error);
        showError(t('common.error'), t('groupProfile.failedToCopyLink'));
      }
    }
  }, [group?.shareLink, isBotGroup, t, showSuccess, showError]);

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
          !isBotGroup ? (
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
          ) : null
        ),
      });
    }
  }, [group?.name, navigation, colors, handleShareGroup, isBotGroup]);

  const handleLeaveGroup = () => {
    // Prevent leaving bot groups
    if (isBotGroup) {
      showError(t('common.error'), t('groupProfile.cannotLeaveBotGroup'));
      return;
    }

    Alert.alert(
      t('groupProfile.leaveGroup'),
      t('groupProfile.leaveGroupConfirm'),
      [
        { text: t('common.cancel'), style: "cancel" },
        {
          text: t('groupProfile.leave'),
          style: "destructive",
          onPress: async () => {
            try {
              if (userMembership?.id) {
                await leaveGroup(userMembership.id);
                // Navigate back to the main group list instead of group chat
                router.push('/(tabs)');
              }
            } catch (error) {
              console.error("Error leaving group:", error);
              Alert.alert(t('common.error'), t('groupProfile.failedToLeaveGroup'));
            }
          },
        },
      ]
    );
  };

  const handleRemoveMember = useCallback(async (member: Member) => {
    try {
      if (member.membershipId) {
        await removeMember(member.membershipId);
        showSuccess(
          t('groupProfile.memberRemoved'),
          t('groupProfile.memberRemovedMessage', { name: member.displayName || member.handle })
        );
      }
    } catch (error) {
      console.error("Error removing member:", error);
      showError(t('common.error'), t('groupProfile.failedToRemoveMember'));
    }
  }, [removeMember, t, showSuccess, showError]);

  const handleUpdateGroup = useCallback(async (groupData: { name: string; description: string; avatarUrl: string; sports: string[] }) => {
    if (!groupId) return;

    try {
      await updateGroup(groupId, groupData);
      setShowEditModal(false);
    } catch (error) {
      console.error('Error updating group:', error);
      Alert.alert(t('common.error'), t('groupProfile.failedToUpdateGroup'));
    }
  }, [groupId, updateGroup, t]);

  const handleReportGroup = useCallback(async (reason: string, description: string) => {
    if (!groupId || !currentUser?.id || !userMembership?.profile?.id) return;

    try {
      await reportGroup({
        groupId,
        reason,
        description,
        reporterId: userMembership.profile.id,
      });
    } catch (error) {
      console.error('Error reporting group:', error);
      throw error;
    }
  }, [groupId, currentUser?.id, userMembership?.profile?.id, reportGroup]);

  const handleBlockUser = useCallback(async (member: Member) => {
    if (!currentUser?.id) return;
    await blockUser(member.id, currentUser.id);
  }, [blockUser, currentUser?.id]);

  const handleUnblockUser = useCallback(async (member: Member) => {
    if (!currentUser?.id) return;
    await unblockUser(member.id, currentUser.id);
  }, [unblockUser, currentUser?.id]);

  const handleMemberAction = useCallback((member: Member) => {
    const isCurrentUser = member.id === userMembership?.profile?.id;
    const isBotUser = member.handle === 'fk';

    if (isCurrentUser || isBotUser) {
      return; // No actions available for current user or bot
    }

    setBlockModalUser(member);
  }, [userMembership?.profile?.id]);

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
          {t('groupProfile.groupNotFound')}
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
          <View style={[styles.groupNameContainer, isCurrentUserAdmin && styles.groupNameContainerWithEdit]}>
            <Text style={[styles.groupName, { color: colors.text }]}>
              {group.name}
            </Text>
            {isCurrentUserAdmin && (
              <TouchableOpacity
                onPress={() => setShowEditModal(true)}
                style={[styles.editButton, { backgroundColor: colors.card }]}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={16} color={colors.tint} />
              </TouchableOpacity>
            )}
          </View>
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
            {t('groupProfile.memberCount', { count: members.length })}
          </Text>
        </View>

        {/* Recent Activities Section */}
        {recentActivities.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              {t('groupProfile.recentActivities')}
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
                          ? activity.poll?.question || t('groupProfile.poll')
                          : isMatch
                          ? activity.match?.title || t('groupProfile.match')
                          : t('groupProfile.message')}
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
                    {t('groupProfile.viewAllActivities')}
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
            {t('groupProfile.members')}
          </Text>
          <View style={[styles.membersList, { backgroundColor: colors.card }]}>
            {members.map((member, index) => {
              const isCurrentUser = member.id === userMembership?.profile?.id;
              const isBotUser = member.handle === 'fk';
              const isBlocked = (blockedData?.blocks?.map((block: any) => block.blocked?.id).filter(Boolean) || []).includes(member.id);
              const isTouchable = !isCurrentUser && !isBotUser;
              
              return (
                <TouchableOpacity
                  key={member.id}
                  style={[
                    styles.memberRow,
                    index === members.length - 1 && styles.memberRowLast,
                    { borderBottomColor: colors.border },
                    isTouchable && styles.touchableMember,
                    isBlocked && styles.blockedMemberRow,
                  ]}
                  onPress={() => handleMemberAction(member)}
                  activeOpacity={isTouchable ? 0.6 : 1}
                  disabled={!isTouchable}
                >
                  <View style={styles.memberInfo}>
                    <View
                      style={[
                        styles.memberAvatar,
                        { backgroundColor: colors.background },
                        isBlocked && styles.blockedAvatar,
                      ]}
                    >
                      {member.avatarUrl ? (
                        <Image
                          source={{ uri: member.avatarUrl }}
                          style={[
                            styles.memberAvatarImage,
                            isBlocked && styles.blockedAvatarImage,
                          ]}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.memberAvatarText,
                            { color: colors.tint },
                            isBlocked && styles.blockedAvatarText,
                          ]}
                        >
                          {(member.displayName || member.handle)
                            .charAt(0)
                            .toUpperCase()}
                        </Text>
                      )}
                      {isBlocked && (
                        <View style={styles.blockedIndicator}>
                          <Ionicons
                            name="person-remove"
                            size={14}
                            color="#FF3B30"
                          />
                        </View>
                      )}
                    </View>
                    <View style={styles.memberDetails}>
                      <View style={styles.memberNameRow}>
                        <Text style={[
                          styles.memberName, 
                          { color: colors.text },
                          isBlocked && styles.blockedMemberName,
                        ]}>
                          {member.displayName || member.handle}
                        </Text>
                        {member.role === "admin" && (
                          <View
                            style={[
                              styles.adminBadge,
                              { backgroundColor: colors.tint + "20" },
                            ]}
                          >
                            <Text
                              style={[styles.adminText, { color: colors.tint }]}
                            >
                              {t('groupProfile.admin')}
                            </Text>
                          </View>
                        )}
                        {isBlocked && (
                          <View
                            style={[
                              styles.blockedBadge,
                              { backgroundColor: "#FF3B3020" },
                            ]}
                          >
                            <Text
                              style={[styles.blockedText, { color: "#FF3B30" }]}
                            >
                              {t('block.blocked')}
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
                  {isTouchable && (
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.tabIconDefault}
                      style={styles.chevronIcon}
                    />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Actions - Hide for bot groups */}
        {!isBotGroup && (
          <View style={styles.section}>

            <View style={[styles.dangerZone, { backgroundColor: "#FF8C0010", marginBottom: 12 }]}>
              <TouchableOpacity
                style={styles.option}
                onPress={() => setShowReportModal(true)}
                activeOpacity={0.6}
              >
                <View style={styles.optionLeft}>
                  <Ionicons
                    name="flag-outline"
                    size={24}
                    color="#FF8C00"
                    style={styles.optionIcon}
                  />
                  <Text style={[styles.optionText, { color: "#FF8C00" }]}>
                    {t('report.reportGroup')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Leave Group */}
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
                    {t('groupProfile.leaveGroup')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Edit Group Modal */}
      {isCurrentUserAdmin && (
        <EditGroupModal
          visible={showEditModal}
          onClose={() => setShowEditModal(false)}
          onUpdateGroup={handleUpdateGroup}
          initialData={{
            name: group.name || '',
            description: group.description || '',
            avatarUrl: group.avatarUrl || '',
            sports: group.sports || [],
          }}
        />
      )}

      {/* Report Group Modal */}
      <ReportModal
        isVisible={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReportGroup}
        type="group"
        targetName={group?.name}
      />

      {/* Block User Modal */}
      <BlockUserModal
        isVisible={!!blockModalUser}
        onClose={() => setBlockModalUser(null)}
        member={blockModalUser}
        isBlocked={blockModalUser ? (blockedData?.blocks?.map((block: any) => block.blocked?.id).filter(Boolean) || []).includes(blockModalUser.id) : false}
        isCurrentUserAdmin={isCurrentUserAdmin}
        onBlock={handleBlockUser}
        onUnblock={handleUnblockUser}
        onRemove={handleRemoveMember}
      />
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
  groupNameContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  groupNameContainerWithEdit: {
    marginLeft: 32,
  },
  groupName: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  editButton: {
    marginLeft: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  memberRowLast: {
    borderBottomWidth: 0,
  },
  touchableMember: {
    backgroundColor: 'transparent',
  },
  blockedMemberRow: {
    opacity: 0.7,
    backgroundColor: '#FF3B3005',
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  chevronIcon: {
    marginLeft: 12,
    opacity: 0.6,
  },
  memberAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    position: "relative",
  },
  blockedAvatar: {
    opacity: 0.6,
  },
  memberAvatarImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  blockedAvatarImage: {
    opacity: 0.5,
  },
  memberAvatarText: {
    fontSize: 18,
    fontWeight: "600",
  },
  blockedAvatarText: {
    opacity: 0.5,
  },
  blockedIndicator: {
    position: "absolute",
    bottom: -2,
    right: -2,
    backgroundColor: "white",
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
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
  blockedMemberName: {
    opacity: 0.6,
    textDecorationLine: "line-through",
  },
  adminBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginRight: 6,
  },
  adminText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  blockedBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  blockedText: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  memberHandle: {
    fontSize: 14,
  },
  removeMemberButton: {
    padding: 8,
    marginLeft: 8,
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
