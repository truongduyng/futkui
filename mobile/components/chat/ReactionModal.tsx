import { Colors } from "@/constants/Colors";
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from "react";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { BlurView } from 'expo-blur';
import { useTranslation } from 'react-i18next';
import { MentionText } from "./MentionText";
import { CachedAvatar } from "./CachedAvatar";
import { MessageImage } from "./MessageImage";

interface Reaction {
  id: string;
  emoji: string;
  userName?: string;
  user?: {
    id: string;
    handle: string;
    displayName?: string;
  };
}

interface ReactionModalProps {
  visible: boolean;
  onClose: () => void;
  content?: string;
  author: {
    id: string;
    handle: string;
    displayName?: string;
    avatarUrl?: string;
  };
  isOwnMessage: boolean;
  showAuthor: boolean;
  imageUrl?: string;
  onImagePress?: (imageUrl: string) => void;
  reactions: Reaction[];
  showReactionOptions: boolean;
  showMessageOptions: boolean;
  onAddReaction?: (emoji: string) => void;
  onCopyText: () => void;
  onReportMessage?: () => void;
  onDeleteMessage?: () => void;
  messageId?: string;
  messagePosition?: { x: number; y: number; width: number; height: number };
}

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

export function ReactionModal({
  visible,
  onClose,
  content,
  author,
  isOwnMessage,
  showAuthor,
  imageUrl,
  onImagePress,
  reactions,
  showReactionOptions,
  showMessageOptions,
  onAddReaction,
  onCopyText,
  onReportMessage,
  onDeleteMessage,
  messageId,
  messagePosition,
}: ReactionModalProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const colors = useMemo(() => isDark ? Colors.dark : Colors.light, [isDark]);

  const hasTextContent = content && content.trim();

  // Dynamic styles based on theme
  const dynamicStyles = useMemo(() => ({
    reactionOptionsContainer: {
      ...styles.reactionOptionsContainer,
      backgroundColor: isDark ? "#2A2A2A" : "white",
      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
    },
    messageOptionsContainer: {
      ...styles.messageOptionsContainer,
      backgroundColor: isDark ? "#2A2A2A" : "white",
      borderColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
    },
    messageOptionText: {
      ...styles.messageOptionText,
      color: isDark ? "#ECEDEE" : "#333",
    },
    reportOptionText: {
      ...styles.messageOptionText,
      color: "#FF4444",
      fontWeight: "bold" as const,
    },
    deleteOptionText: {
      ...styles.messageOptionText,
      color: "#FF4444",
      fontWeight: "bold" as const,
    },
  }), [isDark]);

  const handleAddReaction = (emoji: string) => {
    if (onAddReaction) {
      onAddReaction(emoji);
    }
    onClose();
  };

  const handleCopyText = () => {
    onCopyText();
    onClose();
  };

  const handleReportMessage = () => {
    if (onReportMessage) {
      onReportMessage();
    }
    onClose();
  };

  const handleDeleteMessage = () => {
    if (onDeleteMessage) {
      onDeleteMessage();
    }
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <BlurView intensity={20} tint={isDark ? "dark" : "light"} style={styles.blurContainer}>
        <TouchableOpacity
          style={styles.reactionModalOverlay}
          activeOpacity={1}
          onPress={onClose}
        >
          {/* Render message at original position */}
          <View style={[
            styles.centeredMessageContainer,
            messagePosition && {
              position: 'absolute',
              top: showReactionOptions ? messagePosition.y - 100 : messagePosition.y,
              left: 0,
              right: 0,
              justifyContent: 'flex-start',
            }
          ]}>
            {/* Reaction options above the message */}
            {showReactionOptions && onAddReaction && !isOwnMessage && (
              <View style={styles.centeredReactionOptions}>
                <View style={dynamicStyles.reactionOptionsContainer}>
                  {QUICK_REACTIONS.map((emoji) => (
                    <TouchableOpacity
                      key={emoji}
                      style={styles.reactionOptionButton}
                      onPress={() => handleAddReaction(emoji)}
                    >
                      <Text style={styles.reactionOptionEmoji}>{emoji}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            <View style={[
              styles.messageDisplayContainer,
              isOwnMessage ? styles.ownMessage : styles.otherMessage,
            ]}>
              {!isOwnMessage && showAuthor && (
                <View style={styles.authorSection}>
                  {author?.avatarUrl && (
                    <CachedAvatar
                      uri={author.avatarUrl}
                      size={16}
                      style={styles.authorAvatar}
                    />
                  )}
                  <Text style={[styles.authorName, { color: colors.text }]}>
                    {author?.displayName || author?.handle || t('chat.unknown')}
                  </Text>
                </View>
              )}

              <View style={styles.messageContainer}>
                {/* Image without background */}
                {imageUrl && (
                  <MessageImage
                    imageUrl={imageUrl}
                    onImagePress={onImagePress}
                    onLongPress={() => {}}
                  />
                )}

                {/* Text content with background bubble */}
                {hasTextContent && (
                  <View
                    style={[
                      styles.bubble,
                      isOwnMessage
                        ? [styles.ownBubble, { backgroundColor: colors.tint }]
                        : [styles.otherBubble, { backgroundColor: isDark ? "#2A2A2A" : "#F0F0F0" }],
                    ]}
                  >
                    <MentionText
                      text={content}
                      style={StyleSheet.flatten([
                        styles.messageText,
                        isOwnMessage ? styles.ownMessageText : { color: colors.text },
                      ])}
                      mentionStyle={
                        isOwnMessage
                          ? {
                              color: "white",
                              fontWeight: "700",
                            }
                          : undefined
                      }
                      onLinkPress={() => {}}
                    />
                  </View>
                )}
              </View>

              {/* Message options below the message */}
              {showMessageOptions && (hasTextContent || imageUrl) && (
                <View style={[
                  dynamicStyles.messageOptionsContainer,
                  styles.centeredMessageOptions,
                  isOwnMessage ? { alignSelf: 'flex-end' } : { alignSelf: 'flex-start' }
                ]}>
                  {hasTextContent && (
                    <TouchableOpacity
                      style={styles.messageOptionButton}
                      onPress={handleCopyText}
                    >
                      <View style={styles.messageOptionContent}>
                        <Ionicons name="copy-outline" size={18} color={isDark ? "#999" : "#666"} />
                        <Text style={dynamicStyles.messageOptionText}>{t('chat.copyText')}</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {isOwnMessage && onDeleteMessage && messageId && (
                    <TouchableOpacity
                      style={styles.deleteOptionButton}
                      onPress={handleDeleteMessage}
                    >
                      <View style={styles.messageOptionContent}>
                        <Ionicons name="trash" size={18} color="#FF4444" />
                        <Text style={dynamicStyles.deleteOptionText}>{t('chat.deleteMessage')}</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {!isOwnMessage && onReportMessage && messageId && (
                    <TouchableOpacity
                      style={styles.reportOptionButton}
                      onPress={handleReportMessage}
                    >
                      <View style={styles.messageOptionContent}>
                        <Ionicons name="flag" size={18} color="#FF4444" />
                        <Text style={dynamicStyles.reportOptionText}>{t('report.reportMessage')}</Text>
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          </View>
        </TouchableOpacity>
      </BlurView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    flex: 1,
  },
  reactionModalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-start",
    alignItems: "stretch",
  },
  centeredMessageContainer: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageDisplayContainer: {
    marginVertical: 4,
    maxWidth: "80%",
  },
  ownMessage: {
    alignSelf: "flex-end",
  },
  otherMessage: {
    alignSelf: "flex-start",
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
    marginLeft: 8,
  },
  authorAvatar: {
    marginRight: 6,
  },
  authorName: {
    fontSize: 12,
  },
  messageContainer: {
    position: "relative",
    zIndex: 1,
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    maxWidth: "100%",
    zIndex: 1,
  },
  ownBubble: {
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  ownMessageText: {
    color: "white",
  },
  reactionsContainer: {
    position: "absolute",
    bottom: -10,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  reactionsOwnMessage: {
    right: 8,
  },
  reactionsOtherMessage: {
    right: 8,
  },
  centeredReactionOptions: {
    marginBottom: 6,
    alignSelf: "flex-start",
  },
  centeredMessageOptions: {
    marginTop: 6,
    marginLeft: 0,
    alignSelf: "flex-start",
  },
  reactionOptionsContainer: {
    flexDirection: "row",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 25,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  reactionOptionButton: {
    paddingHorizontal: 6,
    paddingVertical: 4,
    marginHorizontal: 2,
    borderRadius: 8,
  },
  reactionOptionEmoji: {
    fontSize: 20,
  },
  messageOptionsContainer: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  messageOptionButton: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  reportOptionButton: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  deleteOptionButton: {
    paddingVertical: 12,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  messageOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  messageOptionText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#333",
  },
});
