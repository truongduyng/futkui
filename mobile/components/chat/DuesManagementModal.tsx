import { Colors } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";

interface DuesMember {
  id: string;
  status: string; // 'unpaid', 'pending', 'paid', 'overdue'
  billImageUrl?: string;
  profile: {
    id: string;
    handle: string;
    displayName?: string;
    avatarUrl?: string;
  };
  createdAt: number;
  updatedAt: number;
}

interface DuesCycleData {
  id: string;
  periodKey: string;
  amountPerMember: number;
  status: string;
  deadline: number;
  createdAt: number;
  duesMembers: DuesMember[];
}


interface DuesManagementModalProps {
  visible: boolean;
  onClose: () => void;
  duesCycle: DuesCycleData;
  onUpdateMemberStatus?: (
    cycleId: string,
    profileId: string,
    status: string,
  ) => Promise<void>;
}

export function DuesManagementModal({
  visible,
  onClose,
  duesCycle,
  onUpdateMemberStatus,
}: DuesManagementModalProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const [isUpdating, setIsUpdating] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "#4CAF50";
      case "pending":
        return "#FF9800";
      case "overdue":
        return "#F44336";
      default:
        return colors.tabIconDefault;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return "✅";
      case "pending":
        return "⏳";
      case "overdue":
        return "⚠️";
      default:
        return "⭕";
    }
  };

  const handleStatusUpdate = async (member: DuesMember, newStatus: string) => {
    if (!onUpdateMemberStatus) return;

    setIsUpdating(true);
    try {
      await onUpdateMemberStatus(duesCycle.id, member.profile.id, newStatus);
      Alert.alert(t("common.success"), t("chat.statusUpdated"));
    } catch (error) {
      console.error("Failed to update member status:", error);
      Alert.alert(t("common.error"), t("chat.failedToUpdateStatus"));
    } finally {
      setIsUpdating(false);
    }
  };


  // Calculate statistics
  const totalMembers = duesCycle.duesMembers.length;
  const paidMembers = duesCycle.duesMembers.filter(m => m.status === 'paid').length;
  const pendingMembers = duesCycle.duesMembers.filter(m => m.status === 'pending').length;
  const unpaidMembers = duesCycle.duesMembers.filter(m => m.status === 'unpaid').length;
  const overdueMembers = duesCycle.duesMembers.filter(m => m.status === 'overdue').length;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.cancelButton}>
            <Text style={[styles.cancelText, { color: colors.text }]}>
              {t('common.cancel')}
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("chat.manageDues")}
          </Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
        >
            {/* Dues Info */}
            <View
              style={[
                styles.duesInfo,
                {
                  backgroundColor: isDark ? "#1C1C1E" : "#F8F8F8",
                  borderColor: colors.border || "rgba(0,0,0,0.1)",
                },
              ]}
            >
              <Text style={[styles.duesTitle, { color: colors.text }]}>
                💰 {duesCycle.periodKey}
              </Text>
              <Text style={[styles.amountText, { color: colors.text }]}>
                {duesCycle.amountPerMember.toFixed(2)} {t("chat.perMember")}
              </Text>
              <Text
                style={[styles.statsText, { color: colors.tabIconDefault }]}
              >
                {paidMembers}/{totalMembers} {t("chat.paid")} •{pendingMembers}{" "}
                {t("chat.pending")} •{unpaidMembers} {t("chat.unpaid")} •
                {overdueMembers} {t("chat.overdue")}
              </Text>
            </View>

            {/* Member List */}
            <View style={styles.membersSection}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("chat.memberStatus")} ({totalMembers})
              </Text>

              {duesCycle.duesMembers.map((member) => {
                return (
                  <View
                    key={member.id}
                    style={[
                      styles.memberItem,
                      {
                        backgroundColor: isDark ? "#2C2C2E" : "#F2F2F7",
                        borderColor: getStatusColor(member.status),
                      },
                    ]}
                  >
                    <View style={styles.memberHeader}>
                      <View style={styles.memberInfo}>
                        <View
                          style={[
                            styles.memberAvatar,
                            { borderColor: getStatusColor(member.status) },
                          ]}
                        >
                          <Text style={styles.avatarText}>
                            {member.profile.handle?.charAt(0).toUpperCase() ||
                              "?"}
                          </Text>
                        </View>
                        <View style={styles.memberDetails}>
                          <Text
                            style={[
                              styles.memberHandle,
                              { color: colors.text },
                            ]}
                          >
                            @{member.profile.handle}
                          </Text>
                          <Text
                            style={[
                              styles.memberStatus,
                              { color: getStatusColor(member.status) },
                            ]}
                          >
                            {getStatusIcon(member.status)}{" "}
                            {member.status.toUpperCase()}
                          </Text>
                        </View>
                      </View>

                      {/* Quick Actions */}
                      <View style={styles.memberActions}>
                        {member.status !== "paid" && (
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              { backgroundColor: "#4CAF50" },
                            ]}
                            onPress={() => handleStatusUpdate(member, "paid")}
                            disabled={isUpdating}
                          >
                            <Text style={styles.actionButtonText}>
                              {t("chat.markPaid")}
                            </Text>
                          </TouchableOpacity>
                        )}

                        {member.status !== "unpaid" && (
                          <TouchableOpacity
                            style={[
                              styles.actionButton,
                              { backgroundColor: colors.tabIconDefault },
                            ]}
                            onPress={() => handleStatusUpdate(member, "unpaid")}
                            disabled={isUpdating}
                          >
                            <Text style={styles.actionButtonText}>
                              {t("chat.markUnpaid")}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>

            {isUpdating && (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.tint} />
                <Text style={[styles.loadingText, { color: colors.text }]}>
                  {t("common.updating")}...
                </Text>
              </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    fontSize: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  headerSpacer: {
    width: 50,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  duesInfo: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  duesTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  amountText: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  statsText: {
    fontSize: 12,
  },
  membersSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  memberItem: {
    borderWidth: 2,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  memberHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  memberAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    backgroundColor: "rgba(0,0,0,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  memberDetails: {
    flex: 1,
  },
  memberHandle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  memberStatus: {
    fontSize: 12,
    fontWeight: "500",
  },
  memberActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    gap: 8,
  },
  loadingText: {
    fontSize: 14,
  },
});
