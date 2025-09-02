import { Colors } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useInstantDB } from "@/hooks/useInstantDB";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useTranslation } from "react-i18next";
import { Ionicons } from "@expo/vector-icons";

interface DuesMember {
  id: string;
  status: string;
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

interface LedgerEntry {
  id: string;
  refId: string;
  amount: number;
  type: string;
  status: string;
  billImageUrl?: string;
  adminNotes?: string;
  confirmedAt?: number;
  createdAt: number;
  updatedAt: number;
  profile: {
    id: string;
    handle: string;
    displayName?: string;
  };
}

interface DuesManagementModalProps {
  visible: boolean;
  onClose: () => void;
  duesCycle: DuesCycleData;
  onConfirmPayment?: (
    ledgerEntryId: string,
    confirmed: boolean,
    adminNotes?: string,
  ) => Promise<void>;
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
  onConfirmPayment,
  onUpdateMemberStatus,
}: DuesManagementModalProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const { useLedgerEntries } = useInstantDB();

  const [adminNotes, setAdminNotes] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  // Get ledger entries for this dues cycle
  const { data: ledgerData } = useLedgerEntries(duesCycle.id);
  const ledgerEntries = (ledgerData?.ledgerEntries || []) as LedgerEntry[];

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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

  const handleConfirmPayment = async (
    entry: LedgerEntry,
    confirmed: boolean,
  ) => {
    if (!onConfirmPayment) return;

    const notes = adminNotes.trim() || undefined;

    Alert.alert(
      confirmed ? t("chat.confirmPayment") : t("chat.rejectPayment"),
      confirmed
        ? t("chat.confirmPaymentMessage", { handle: entry.profile.handle })
        : t("chat.rejectPaymentMessage", { handle: entry.profile.handle }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: confirmed ? t("common.confirm") : t("common.reject"),
          style: confirmed ? "default" : "destructive",
          onPress: async () => {
            setIsUpdating(true);
            try {
              await onConfirmPayment(entry.id, confirmed, notes);
              setAdminNotes("");
              Alert.alert(
                t("common.success"),
                confirmed
                  ? t("chat.paymentConfirmed")
                  : t("chat.paymentRejected"),
              );
            } catch (error) {
              console.error("Failed to confirm payment:", error);
              Alert.alert(t("common.error"), t("chat.failedToProcessPayment"));
            } finally {
              setIsUpdating(false);
            }
          },
        },
      ],
    );
  };

  // Calculate statistics
  const totalMembers = duesCycle.duesMembers.length;
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
                const memberLedgerEntries = ledgerEntries.filter(
                  (entry) => entry.profile.id === member.profile.id,
                );

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

                    {/* Ledger Entries for this member */}
                    {memberLedgerEntries.length > 0 && (
                      <View style={styles.ledgerSection}>
                        <Text
                          style={[styles.ledgerTitle, { color: colors.text }]}
                        >
                          {t("chat.paymentHistory")}:
                        </Text>

                        {memberLedgerEntries.map((entry) => (
                          <View
                            key={entry.id}
                            style={[
                              styles.ledgerEntry,
                              {
                                backgroundColor: isDark ? "#1C1C1E" : "#FFFFFF",
                                borderColor:
                                  entry.status === "confirmed"
                                    ? "#4CAF50"
                                    : entry.status === "rejected"
                                    ? "#F44336"
                                    : "#FF9800",
                              },
                            ]}
                          >
                            <View style={styles.ledgerHeader}>
                              <Text
                                style={[
                                  styles.ledgerAmount,
                                  { color: colors.text },
                                ]}
                              >
                                {entry.amount.toFixed(2)}
                              </Text>
                              <Text
                                style={[
                                  styles.ledgerStatus,
                                  {
                                    color:
                                      entry.status === "confirmed"
                                        ? "#4CAF50"
                                        : entry.status === "rejected"
                                        ? "#F44336"
                                        : "#FF9800",
                                  },
                                ]}
                              >
                                {entry.status.toUpperCase()}
                              </Text>
                            </View>

                            <Text
                              style={[
                                styles.ledgerDate,
                                { color: colors.tabIconDefault },
                              ]}
                            >
                              {formatTime(entry.createdAt)}
                            </Text>

                            {entry.billImageUrl && (
                              <TouchableOpacity
                                style={styles.billImageContainer}
                                onPress={() =>
                                  setExpandedImage(entry.billImageUrl!)
                                }
                              >
                                <Image
                                  source={{ uri: entry.billImageUrl }}
                                  style={styles.billThumbnail}
                                  resizeMode="cover"
                                />
                                <Text
                                  style={[
                                    styles.viewImageText,
                                    { color: colors.tint },
                                  ]}
                                >
                                  {t("chat.viewReceipt")}
                                </Text>
                              </TouchableOpacity>
                            )}

                            {entry.adminNotes && (
                              <Text
                                style={[
                                  styles.adminNotes,
                                  { color: colors.tabIconDefault },
                                ]}
                              >
                                {t("chat.adminNotes")}: {entry.adminNotes}
                              </Text>
                            )}

                            {/* Pending actions */}
                            {entry.status === "pending" && (
                              <View style={styles.pendingActions}>
                                <TextInput
                                  style={[
                                    styles.notesInput,
                                    {
                                      color: colors.text,
                                      backgroundColor: isDark
                                        ? "#3C3C3E"
                                        : "#F8F8F8",
                                      borderColor:
                                        colors.border || "rgba(0,0,0,0.1)",
                                    },
                                  ]}
                                  value={adminNotes}
                                  onChangeText={setAdminNotes}
                                  placeholder={t("chat.addAdminNotes")}
                                  placeholderTextColor={colors.tabIconDefault}
                                  multiline
                                  numberOfLines={2}
                                />

                                <View style={styles.confirmActions}>
                                  <TouchableOpacity
                                    style={[
                                      styles.confirmButton,
                                      { backgroundColor: "#F44336" },
                                    ]}
                                    onPress={() =>
                                      handleConfirmPayment(entry, false)
                                    }
                                    disabled={isUpdating}
                                  >
                                    <Text style={styles.confirmButtonText}>
                                      {t("common.reject")}
                                    </Text>
                                  </TouchableOpacity>

                                  <TouchableOpacity
                                    style={[
                                      styles.confirmButton,
                                      { backgroundColor: "#4CAF50" },
                                    ]}
                                    onPress={() =>
                                      handleConfirmPayment(entry, true)
                                    }
                                    disabled={isUpdating}
                                  >
                                    <Text style={styles.confirmButtonText}>
                                      {t("common.confirm")}
                                    </Text>
                                  </TouchableOpacity>
                                </View>
                              </View>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
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

      {/* Expanded Image Modal */}
      {expandedImage && (
        <Modal
          visible={true}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setExpandedImage(null)}
        >
          <TouchableOpacity
            style={styles.imageModalOverlay}
            activeOpacity={1}
            onPress={() => setExpandedImage(null)}
          >
            <View style={styles.imageModalContainer}>
              <TouchableOpacity
                style={styles.imageCloseButton}
                onPress={() => setExpandedImage(null)}
              >
                <Ionicons name="close-circle" size={32} color="white" />
              </TouchableOpacity>
              <Image
                source={{ uri: expandedImage }}
                style={styles.expandedImage}
                resizeMode="contain"
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
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
  ledgerSection: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
    paddingTop: 12,
    marginTop: 8,
  },
  ledgerTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  ledgerEntry: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
  },
  ledgerHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  ledgerAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  ledgerStatus: {
    fontSize: 12,
    fontWeight: "600",
  },
  ledgerDate: {
    fontSize: 11,
    marginBottom: 8,
  },
  billImageContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  billThumbnail: {
    width: 100,
    height: 80,
    borderRadius: 8,
    marginBottom: 4,
  },
  viewImageText: {
    fontSize: 12,
    fontWeight: "500",
  },
  adminNotes: {
    fontSize: 12,
    fontStyle: "italic",
    marginBottom: 8,
  },
  pendingActions: {
    gap: 8,
  },
  notesInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: "top",
  },
  confirmActions: {
    flexDirection: "row",
    gap: 8,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
  },
  confirmButtonText: {
    fontSize: 14,
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
  imageModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageModalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  imageCloseButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1,
  },
  expandedImage: {
    width: "100%",
    height: "80%",
  },
});
