import React, { useState } from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Image,
} from "react-native";
import { useThemeColor } from "../../hooks/useThemeColor";
import { useTranslation } from "react-i18next";
import { useToast } from "../../hooks/useToast";
import { Ionicons } from "@expo/vector-icons";

interface Member {
  id: string;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
  role?: string;
  membershipId?: string;
}

interface BlockUserModalProps {
  isVisible: boolean;
  onClose: () => void;
  member: Member | null;
  isBlocked: boolean;
  isCurrentUserAdmin: boolean;
  onBlock: (member: Member) => Promise<void>;
  onUnblock: (member: Member) => Promise<void>;
  onRemove?: (member: Member) => Promise<void>;
}

export const BlockUserModal: React.FC<BlockUserModalProps> = ({
  isVisible,
  onClose,
  member,
  isBlocked,
  isCurrentUserAdmin,
  onBlock,
  onUnblock,
  onRemove,
}) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const { t } = useTranslation();

  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const borderColor = useThemeColor({}, "border");
  const buttonColor = useThemeColor({}, "tint");
  const { showSuccess, showError } = useToast();

  const handleBlockAction = async () => {
    if (!member) return;

    setIsProcessing(true);
    try {
      if (isBlocked) {
        await onUnblock(member);
        showSuccess(
          t("block.unblockSuccess"),
          t("block.unblockSuccessMessage", {
            handle: member.handle,
          }),
        );
      } else {
        await onBlock(member);
        showSuccess(
          t("block.blockSuccess"),
          t("block.blockSuccessMessage", {
            handle: member.handle,
          }),
        );
      }
      onClose();
    } catch (error) {
      console.error("Error blocking/unblocking user:", error);
      showError(
        t("common.error"),
        isBlocked
          ? t("block.unblockError")
          : t("block.blockError"),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveAction = async () => {
    if (!member || !onRemove) return;

    setIsProcessing(true);
    try {
      await onRemove(member);
      onClose();
    } catch (error) {
      console.error("Error removing member:", error);
      showError(
        t("common.error"),
        t("groupProfile.failedToRemoveMember"),
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (!member) return null;

  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          style={[styles.bottomSheet, { backgroundColor }]}
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Header with close button */}
          <View style={styles.header}>
            <View style={[styles.handleBar, { backgroundColor: borderColor }]} />
            <TouchableOpacity
              style={[styles.closeButton, { backgroundColor: borderColor + '20' }]}
              onPress={onClose}
              disabled={isProcessing}
            >
              <Ionicons 
                name="close" 
                size={20} 
                color={textColor} 
              />
            </TouchableOpacity>
          </View>

          {/* Content */}
          <View style={styles.content}>
            {/* Member info */}
            <View style={styles.memberInfo}>
              <View
                style={[
                  styles.memberAvatar,
                  { backgroundColor: borderColor + "20" },
                ]}
              >
                {member.avatarUrl ? (
                  <Image
                    source={{ uri: member.avatarUrl }}
                    style={styles.memberAvatarImage}
                  />
                ) : (
                  <Text
                    style={[styles.memberAvatarText, { color: buttonColor }]}
                  >
                    {(member.displayName || member.handle)
                      .charAt(0)
                      .toUpperCase()}
                  </Text>
                )}
              </View>
              <Text style={[styles.memberName, { color: textColor }]}>
                {member.displayName || member.handle}
              </Text>
              <Text style={[styles.memberHandle, { color: textColor + "80" }]}>
                @{member.handle}
              </Text>
            </View>

            {/* Action description */}
            <View style={styles.descriptionContainer}>
              <Ionicons
                name={
                  isBlocked
                    ? "checkmark-circle-outline"
                    : "person-remove-outline"
                }
                size={24}
                color={isBlocked ? "#34C759" : "#FF3B30"}
                style={styles.descriptionIcon}
              />
              <Text style={[styles.description, { color: textColor }]}>
                {isBlocked
                  ? t("block.unblockDescription", {
                      handle: member.handle,
                    })
                  : t("block.blockDescription", {
                      handle: member.handle,
                    })}
              </Text>
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[
                styles.actionButton,
                {
                  backgroundColor: isBlocked ? "#34C759" : "#FF3B30",
                },
                isProcessing && styles.disabledButton,
              ]}
              onPress={handleBlockAction}
              disabled={isProcessing}
            >
              <Text style={styles.actionButtonText}>
                {isProcessing
                  ? t("common.processing")
                  : isBlocked
                  ? t("block.unblockUser")
                  : t("block.blockUser")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Remove Member Button - Only show if user is admin and can remove */}
          {isCurrentUserAdmin && onRemove && member?.role !== "admin" && (
            <View style={[styles.footer, { paddingTop: 8, paddingBottom: 8 }]}>
              <TouchableOpacity
                style={[
                  styles.removeButton,
                  { backgroundColor: "#FF3B3015", borderColor: "#FF3B30" },
                  isProcessing && styles.disabledButton,
                ]}
                onPress={handleRemoveAction}
                disabled={isProcessing}
              >
                <Ionicons
                  name="person-remove-outline"
                  size={20}
                  color="#FF3B30"
                  style={{ marginRight: 8 }}
                />
                <Text style={[styles.removeButtonText, { color: "#FF3B30" }]}>
                  {isProcessing
                    ? t("common.processing")
                    : t("groupProfile.removeMember")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 34,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 12,
    paddingHorizontal: 20,
    paddingBottom: 8,
    position: "relative",
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    opacity: 0.3,
  },
  closeButton: {
    position: "absolute",
    right: 20,
    top: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 24,
  },
  memberInfo: {
    alignItems: "center",
    marginBottom: 24,
  },
  memberAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  memberAvatarImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  memberAvatarText: {
    fontSize: 28,
    fontWeight: "600",
  },
  memberName: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
    textAlign: "center",
  },
  memberHandle: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
  },
  descriptionContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 24,
    backgroundColor: "rgba(0, 0, 0, 0.03)",
    padding: 16,
    borderRadius: 12,
    marginHorizontal: -4,
  },
  descriptionIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  description: {
    flex: 1,
    fontSize: 16,
    lineHeight: 22,
  },
  footer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  actionButton: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  disabledButton: {
    opacity: 0.6,
  },
  actionButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  removeButton: {
    width: "100%",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
    borderWidth: 1,
    flexDirection: "row",
  },
  removeButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
});
