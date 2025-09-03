import { Colors } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import React, { useState } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  ActivityIndicator,
  Image,
  Alert,
} from "react-native";
import { useTranslation } from "react-i18next";
import Toast from "react-native-toast-message";
import { ImageModal } from './ImageModal';
import { CachedAvatar } from './CachedAvatar';

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
  onCloseCycle?: (cycleId: string) => Promise<void>;
  isAdmin: boolean;
}

export function DuesManagementModal({
  visible,
  onClose,
  duesCycle,
  onUpdateMemberStatus,
  onCloseCycle,
  isAdmin,
}: DuesManagementModalProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [imageModalVisible, setImageModalVisible] = useState(false);

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

  const handleViewBillingImage = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
    setImageModalVisible(true);
  };

  const handleCloseImageModal = () => {
    setImageModalVisible(false);
    setSelectedImageUrl(null);
  };

  const handleStatusUpdate = async (member: DuesMember, newStatus: string) => {
    if (!onUpdateMemberStatus) return;

    setIsUpdating(true);
    try {
      await onUpdateMemberStatus(duesCycle.id, member.profile.id, newStatus);
      Toast.show({
        type: "success",
        text1: t("common.success"),
        text2: t("chat.statusUpdated"),
      });
    } catch (error) {
      console.error("Failed to update member status:", error);
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("chat.failedToUpdateStatus"),
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleCloseCycle = () => {
    if (onCloseCycle) {
      Alert.alert(
        t('chat.closeDuesCycle'),
        t('chat.closeDuesCycleConfirm'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('common.close'),
            onPress: async () => {
              try {
                await onCloseCycle(duesCycle.id);
                onClose(); // Close modal after successful cycle closure
              } catch (error) {
                console.error("Failed to close cycle:", error);
                Toast.show({
                  type: "error",
                  text1: t("common.error"),
                  text2: t("chat.failedToCloseCycle"),
                });
              }
            }
          },
        ]
      );
    }
  };

  // Calculate statistics
  const totalMembers = duesCycle.duesMembers.length;
  const isActive = duesCycle.status === 'active' && duesCycle.deadline >= Date.now();
  const paidMembers = duesCycle.duesMembers.filter(
    (m) => m.status === "paid",
  ).length;
  const pendingMembers = duesCycle.duesMembers.filter(
    (m) => m.status === "pending",
  ).length;
  const unpaidMembers = duesCycle.duesMembers.filter(
    (m) => m.status === "unpaid",
  ).length;
  const overdueMembers = duesCycle.duesMembers.filter(
    (m) => m.status === "overdue",
  ).length;

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
              X
            </Text>
          </TouchableOpacity>
          <Text style={[styles.title, { color: colors.text }]}>
            {t("chat.manageDues")}
          </Text>
          {isAdmin && isActive && onCloseCycle ? (
            <TouchableOpacity onPress={handleCloseCycle} style={styles.closeButton}>
              <Text style={styles.closeCycleText}>
                {t('chat.closeCycle')}
              </Text>
            </TouchableOpacity>
          ) : (
            <View style={styles.headerSpacer} />
          )}
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Dues Info */}
          <View
            style={[
              styles.duesInfo,
              {
                backgroundColor: isDark ? "#1C1C1E" : "#F8F8F8",
              },
            ]}
          >
            <Text style={[styles.duesTitle, { color: colors.text }]}>
              💰 {duesCycle.periodKey}
            </Text>
            <Text style={[styles.amountText, { color: colors.text }]}>
              {duesCycle.amountPerMember} {t("chat.perMember")}
            </Text>
            <Text style={[styles.statsText, { color: colors.tabIconDefault }]}>
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
                        {member.profile.avatarUrl ? (
                          <CachedAvatar
                            uri={member.profile.avatarUrl}
                            size={36}
                            fallbackComponent={
                              <Text style={styles.avatarText}>
                                {member.profile.handle?.charAt(0).toUpperCase() ||
                                  "?"}
                              </Text>
                            }
                          />
                        ) : (
                          <Text style={styles.avatarText}>
                            {member.profile.handle?.charAt(0).toUpperCase() ||
                              "?"}
                          </Text>
                        )}
                      </View>
                      <View style={styles.memberDetails}>
                        <Text
                          style={[styles.memberHandle, { color: colors.text }]}
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

                  {/* Billing Image */}
                  {member.billImageUrl && (
                    <View style={styles.billingImageContainer}>
                      <Text style={[styles.billingImageLabel, { color: colors.text }]}>
                        {t("chat.paymentProof")}:
                      </Text>
                      <TouchableOpacity
                        style={styles.billingImageWrapper}
                        onPress={() => handleViewBillingImage(member.billImageUrl!)}
                      >
                        <Image
                          source={{ uri: member.billImageUrl }}
                          style={styles.billingImage}
                          resizeMode="contain"
                        />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {isUpdating && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color={colors.tint} />
            </View>
          )}
        </ScrollView>
      </View>

      <ImageModal
        visible={imageModalVisible}
        imageUrl={selectedImageUrl}
        onClose={handleCloseImageModal}
      />
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
  closeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: '#EF4444',
  },
  closeCycleText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  content: {
    flex: 1,
    marginTop: 10,
    paddingHorizontal: 10,
  },
  duesInfo: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    borderWidth: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    overflow: "hidden",
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
  billingImageContainer: {
    marginTop: 12,
    paddingTop: 12,
  },
  billingImageLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 8,
  },
  billingImageWrapper: {
    alignSelf: "flex-start",
    position: "relative",
  },
  billingImage: {
    width: 120,
    height: 80,
    borderRadius: 8,
  },
});
