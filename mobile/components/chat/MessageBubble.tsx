import { Colors } from "@/constants/Colors";
import { useTheme } from '@/contexts/ThemeContext';
import * as Clipboard from 'expo-clipboard';
import React, { useCallback, useMemo, useState } from "react";
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/useToast';
import { MentionText } from "./MentionText";
import { CachedAvatar } from "./CachedAvatar";
import { WebViewModal } from "../WebViewModal";
import { MessageImage } from "./MessageImage";
import { ReactionButton } from "./ReactionButton";
import { ReactionModal } from "./ReactionModal";
import { ReportModal } from "./ReportModal";

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

interface MessageBubbleProps {
  content?: string;
  author: {
    id: string;
    handle: string;
    displayName?: string;
    avatarUrl?: string;
  };
  createdAt: Date;
  isOwnMessage: boolean;
  reactions: Reaction[];
  onReactionPress: (emoji: string) => void;
  onAddReaction?: (emoji: string) => void;
  showTimestamp?: boolean;
  showAuthor?: boolean;
  imageUrl?: string;
  onImagePress?: (imageUrl: string) => void;
  messageId?: string;
  onReportMessage?: (messageId: string, reason: string, description: string) => void;
  onDeleteMessage?: (messageId: string) => void;
}

export const MessageBubble = React.memo(function MessageBubble({
  content,
  author,
  createdAt,
  isOwnMessage,
  reactions,
  onAddReaction,
  showTimestamp = true,
  showAuthor = true,
  imageUrl,
  onImagePress,
  messageId,
  onReportMessage,
  onDeleteMessage,
}: MessageBubbleProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const colors = useMemo(() => isDark ? Colors.dark : Colors.light, [isDark]);
  const { showSuccess, showError } = useToast();

  // Modal states
  const [showReactionOptions, setShowReactionOptions] = useState(false);
  const [showReactionDetails, setShowReactionDetails] = useState(false);
  const [showMessageOptions, setShowMessageOptions] = useState(false);
  const [showWebView, setShowWebView] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);

  // Content states
  const [webViewUrl, setWebViewUrl] = useState<string | null>(null);
  const [messagePosition, setMessagePosition] = useState({ x: 0, y: 0, width: 0, height: 0 });

  // Dynamic styles based on theme
  const dynamicStyles = useMemo(() => ({
    bottomSheet: {
      ...styles.bottomSheet,
      backgroundColor: isDark ? "#2A2A2A" : "white",
    },
    bottomSheetHeader: {
      ...styles.bottomSheetHeader,
      borderBottomColor: isDark ? "rgba(255, 255, 255, 0.1)" : "rgba(0, 0, 0, 0.1)",
    },
  }), [isDark]);

  const formatTime = useCallback((date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  const groupedReactions = useMemo(() => {
    return reactions.reduce((acc, reaction) => {
      if (!acc[reaction.emoji]) {
        acc[reaction.emoji] = [];
      }
      acc[reaction.emoji].push(reaction);
      return acc;
    }, {} as Record<string, Reaction[]>);
  }, [reactions]);

  const hasTextContent = content && content.trim();
  const isDeletedMessage = content === 'message deleted';
  const hasReactions = Object.keys(groupedReactions).length > 0;

  const handleCopyText = useCallback(async () => {
    if (!hasTextContent) return;

    try {
      await Clipboard.setStringAsync(content!);
      setShowMessageOptions(false);
      setShowReactionOptions(false);
      showSuccess(t('chat.copySuccess'), t('chat.copySuccessMessage'));
    } catch {
      showError(t('common.error'), t('chat.copyError'));
    }
  }, [content, hasTextContent, showSuccess, showError, t]);

  const handleLongPress = useCallback((event: any) => {
    // Don't show options for deleted messages
    if (isDeletedMessage) return;

    event.target.measure(
      (_x: number, _y: number, width: number, height: number, pageX: number, pageY: number) => {
        setMessagePosition({ x: pageX, y: pageY, width, height });

        if (hasTextContent || imageUrl) {
          if (onAddReaction && !isOwnMessage) {
            setShowReactionOptions(true);
          }
          setShowMessageOptions(true);
        } else if (onAddReaction && !isOwnMessage) {
          setShowReactionOptions(true);
        }
      },
    );
  }, [hasTextContent, imageUrl, onAddReaction, isOwnMessage, isDeletedMessage]);

  const handleAddReaction = useCallback((emoji: string) => {
    if (onAddReaction) {
      onAddReaction(emoji);
    }
  }, [onAddReaction]);

  const handleCloseReactionModal = useCallback(() => {
    setShowReactionOptions(false);
    setShowMessageOptions(false);
  }, []);

  const handleTapOutside = useCallback(() => {
    setShowReactionOptions(false);
    setShowMessageOptions(false);
  }, []);

  const handleLinkPress = useCallback((url: string) => {
    setWebViewUrl(url);
    setShowWebView(true);
  }, []);

  const handleCloseWebView = useCallback(() => {
    setShowWebView(false);
    setWebViewUrl(null);
  }, []);

  const handleReportMessage = useCallback((reason: string, description: string) => {
    if (messageId && onReportMessage) {
      onReportMessage(messageId, reason, description);
    }
    setShowMessageOptions(false);
    setShowReportModal(false);
  }, [messageId, onReportMessage]);

  const handleShowReport = useCallback(() => {
    // Close message options first, then open report modal with a small delay
    setShowMessageOptions(false);
    setShowReactionOptions(false);
    setTimeout(() => {
      setShowReportModal(true);
    }, 100);
  }, []);

  const handleDeleteMessage = useCallback(() => {
    if (messageId && onDeleteMessage) {
      onDeleteMessage(messageId);
    }
  }, [messageId, onDeleteMessage]);


  return (
    <>
      <TouchableOpacity
        style={[
          styles.container,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
          !showAuthor && !isOwnMessage && styles.groupedMessage,
          hasReactions && { marginBottom: 16 },
        ]}
        onPress={handleTapOutside}
        activeOpacity={1}
      >
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
          {imageUrl && !isDeletedMessage && (
            <MessageImage
              imageUrl={imageUrl}
              onImagePress={onImagePress}
              onLongPress={handleLongPress}
            />
          )}

          {/* Text content with background bubble */}
          {hasTextContent && (
            <TouchableOpacity
              onLongPress={isDeletedMessage ? undefined : handleLongPress}
              activeOpacity={1}
              style={[
                styles.bubble,
                isDeletedMessage
                  ? [styles.deletedBubble, { backgroundColor: isDark ? "#1A1A1A" : "#F5F5F5" }]
                  : isOwnMessage
                  ? [styles.ownBubble, { backgroundColor: colors.tint }]
                  : [styles.otherBubble, { backgroundColor: isDark ? "#2A2A2A" : "#F0F0F0" }],
              ]}
            >
              <MentionText
                text={isDeletedMessage ? t('chat.messageDeleted') : content}
                style={StyleSheet.flatten([
                  isDeletedMessage ? {} : styles.messageText,
                  isDeletedMessage
                    ? [styles.deletedMessageText, { color: colors.tabIconDefault }]
                    : isOwnMessage ? styles.ownMessageText : { color: colors.text },
                ] as any)}
                mentionStyle={
                  isOwnMessage && !isDeletedMessage
                    ? {
                        color: "white",
                        fontWeight: "700",
                      }
                    : undefined
                }
                onLinkPress={isDeletedMessage ? undefined : handleLinkPress}
              />
            </TouchableOpacity>
          )}
        </View>

        <ReactionModal
          visible={showReactionOptions || showMessageOptions}
          onClose={handleCloseReactionModal}
          content={content}
          author={author}
          isOwnMessage={isOwnMessage}
          showAuthor={showAuthor}
          imageUrl={imageUrl}
          onImagePress={onImagePress}
          reactions={reactions}
          showReactionOptions={showReactionOptions}
          showMessageOptions={showMessageOptions}
          onAddReaction={handleAddReaction}
          onCopyText={handleCopyText}
          onReportMessage={handleShowReport}
          onDeleteMessage={handleDeleteMessage}
          messageId={messageId}
          messagePosition={messagePosition}
        />

        {hasReactions && (
          <View
            style={[
              styles.reactionsContainer,
              isOwnMessage
                ? styles.reactionsOwnMessage
                : styles.reactionsOtherMessage,
            ]}
          >
            <ReactionButton
              groupedReactions={groupedReactions}
              onPress={() => setShowReactionDetails(true)}
            />
          </View>
        )}

        <View style={styles.messageFooter}>
          {showTimestamp && (
            <Text style={[styles.timeText, { color: colors.tabIconDefault }]}>
              {formatTime(createdAt)}
            </Text>
          )}
        </View>
      </TouchableOpacity>
      {/* Reaction Details Bottom Sheet */}
      <Modal
        visible={showReactionDetails}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowReactionDetails(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowReactionDetails(false)}
        >
          <View style={dynamicStyles.bottomSheet}>
            <TouchableOpacity activeOpacity={1}>
              <View style={dynamicStyles.bottomSheetHeader}>
                <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>
                  {t('chat.reactions')}
                </Text>
                <TouchableOpacity onPress={() => setShowReactionDetails(false)}>
                  <Text style={[styles.closeButton, { color: colors.tint }]}>
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.reactionDetailsList}>
                {Object.entries(groupedReactions).map(
                  ([emoji, reactionList]) => (
                    <View key={emoji} style={styles.reactionDetailSection}>
                      <View style={styles.reactionDetailHeader}>
                        <Text style={styles.reactionDetailEmoji}>{emoji}</Text>
                        <Text
                          style={[
                            styles.reactionDetailCount,
                            { color: colors.text },
                          ]}
                        >
                          {reactionList.length}
                        </Text>
                      </View>
                      {reactionList.map((reaction: Reaction) => (
                        <View
                          key={reaction.id}
                          style={styles.reactionDetailItem}
                        >
                          <Text
                            style={[
                              styles.reactionDetailUser,
                              { color: colors.text },
                            ]}
                          >
                            {reaction.user?.handle ||
                              reaction.userName ||
                              t('chat.unknown')}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ),
                )}
              </ScrollView>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* WebView Modal for links */}
      {webViewUrl && (
        <WebViewModal
          visible={showWebView}
          onClose={handleCloseWebView}
          url={webViewUrl}
        />
      )}

      {/* Report Modal */}
      <ReportModal
        isVisible={showReportModal}
        onClose={() => setShowReportModal(false)}
        onSubmit={handleReportMessage}
        type="message"
        targetName={author?.handle || t('chat.unknown')}
      />
    </>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: "80%",
  },
  messageContainer: {
    position: "relative",
    zIndex: 1,
  },
  ownMessage: {
    alignSelf: "flex-end",
  },
  otherMessage: {
    alignSelf: "flex-start",
  },
  groupedMessage: {
    marginTop: 2,
  },
  authorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
    marginLeft: 8,
  },
  authorAvatar: {
    marginRight: 6,
  },
  authorName: {
    fontSize: 12,
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
  deletedBubble: {
    borderWidth: 1,
    borderColor: "rgba(150, 150, 150, 0.3)",
    borderStyle: "dashed",
  },
  deletedMessageText: {
    fontStyle: "italic",
    fontSize: 14,
  },
  messageFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginHorizontal: 8,
  },
  timeText: {
    fontSize: 10,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  bottomSheet: {
    backgroundColor: "white",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "50%",
    paddingBottom: 34,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.1)",
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    fontSize: 18,
    fontWeight: "bold",
  },
  reactionDetailsList: {
    paddingHorizontal: 20,
  },
  reactionDetailSection: {
    marginVertical: 12,
  },
  reactionDetailHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  reactionDetailEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  reactionDetailCount: {
    fontSize: 14,
    fontWeight: "600",
  },
  reactionDetailItem: {
    paddingVertical: 4,
    paddingLeft: 28,
  },
  reactionDetailUser: {
    fontSize: 16,
  },
});
