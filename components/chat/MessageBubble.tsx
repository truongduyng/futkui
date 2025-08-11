import { Colors } from "@/constants/Colors";
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { MentionText } from "./MentionText";

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
  author?: {
    id: string;
    handle: string;
    displayName?: string;
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
}: MessageBubbleProps) {
  const colors = Colors["light"];
  const [showReactionOptions, setShowReactionOptions] = useState(false);
  const [showReactionDetails, setShowReactionDetails] = useState(false);
  const [showMessageOptions, setShowMessageOptions] = useState(false);
  const [messagePosition, setMessagePosition] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [imageLoading, setImageLoading] = useState(true);

  // Reset loading state when imageUrl changes
  useEffect(() => {
    if (imageUrl) {
      setImageLoading(true);
    }
  }, [imageUrl]);

  const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "😡"];

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, Reaction[]>);

  const handleCopyText = async () => {
    if (content && content.trim()) {
      try {
        await Clipboard.setStringAsync(content);
        setShowMessageOptions(false);
        // Could add a toast notification here instead of alert
      } catch {
        // Silent fail - could add toast notification
      }
    }
  };

  const handleLongPress = (event: any) => {
    if (content && content.trim()) {
      // Get the message bubble position for options menu
      event.target.measure(
        (
          _x: number,
          _y: number,
          width: number,
          height: number,
          pageX: number,
          pageY: number,
        ) => {
          setMessagePosition({ x: pageX, y: pageY, width, height });
          setShowMessageOptions(true);
        },
      );
    } else if (onAddReaction && !isOwnMessage) {
      // Get the message bubble position for reaction options
      event.target.measure(
        (
          _x: number,
          _y: number,
          width: number,
          height: number,
          pageX: number,
          pageY: number,
        ) => {
          setMessagePosition({ x: pageX, y: pageY, width, height });
          setShowReactionOptions(true);
        },
      );
    }
  };

  const handleAddReaction = (emoji: string) => {
    if (onAddReaction) {
      onAddReaction(emoji);
      setShowReactionOptions(false);
    }
  };

  const handleTapOutside = () => {
    setShowReactionOptions(false);
    setShowMessageOptions(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.container,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
          !showAuthor && !isOwnMessage && styles.groupedMessage,
          Object.keys(groupedReactions).length > 0 && { marginBottom: 16 },
        ]}
        onPress={handleTapOutside}
        activeOpacity={1}
      >
        {!isOwnMessage && showAuthor && (
          <Text style={[styles.authorName, { color: colors.text }]}>
            {author?.handle || "Unknown"}
          </Text>
        )}

        <View style={styles.messageContainer}>
          {/* Image without background */}
          {imageUrl && (
            <TouchableOpacity
              onPress={() => onImagePress?.(imageUrl)}
              onLongPress={handleLongPress}
              activeOpacity={0.8}
              style={styles.imageBubble}
            >
              <View style={styles.imageContainer}>
                <Image
                  source={{ uri: imageUrl }}
                  style={styles.messageImage}
                  resizeMode="cover"
                  onLoad={() => setImageLoading(false)}
                  onError={() => setImageLoading(false)}
                />
                {imageLoading && (
                  <View style={styles.imageLoadingOverlay}>
                    <ActivityIndicator size="small" color={colors.tint} />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}

          {/* Text content with background bubble */}
          {content && content.trim() && (
            <TouchableOpacity
              onLongPress={handleLongPress}
              activeOpacity={1}
              style={[
                styles.bubble,
                isOwnMessage
                  ? [styles.ownBubble, { backgroundColor: colors.tint }]
                  : [styles.otherBubble, { backgroundColor: "#F0F0F0" }],
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
              />
            </TouchableOpacity>
          )}
        </View>

        {showReactionOptions && onAddReaction && !isOwnMessage && (
          <Modal
            visible={showReactionOptions}
            transparent={true}
            animationType="none"
            onRequestClose={handleTapOutside}
          >
            <TouchableOpacity
              style={styles.reactionModalOverlay}
              activeOpacity={1}
              onPress={handleTapOutside}
            >
              <View
                style={[
                  styles.reactionOptionsContainer,
                  {
                    position: "absolute",
                    left: messagePosition.x,
                    top: messagePosition.y + messagePosition.height + 10,
                  },
                ]}
              >
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
            </TouchableOpacity>
          </Modal>
        )}

        {showMessageOptions && content && content.trim() && (
          <Modal
            visible={showMessageOptions}
            transparent={true}
            animationType="none"
            onRequestClose={handleTapOutside}
          >
            <TouchableOpacity
              style={styles.reactionModalOverlay}
              activeOpacity={1}
              onPress={handleTapOutside}
            >
              <View
                style={[
                  styles.messageOptionsContainer,
                  {
                    position: "absolute",
                    left: messagePosition.x,
                    top: messagePosition.y + messagePosition.height + 10,
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.messageOptionButton}
                  onPress={handleCopyText}
                >
                  <View style={styles.messageOptionContent}>
                    <Ionicons name="copy-outline" size={18} color="#666" />
                  </View>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </Modal>
        )}

        {Object.keys(groupedReactions).length > 0 && (
          <View
            style={[
              styles.reactionsContainer,
              isOwnMessage
                ? styles.reactionsOwnMessage
                : styles.reactionsOtherMessage,
            ]}
          >
            <TouchableOpacity
              style={styles.reactionButton}
              onPress={() => setShowReactionDetails(true)}
            >
              <View style={styles.reactionEmojis}>
                {Object.keys(groupedReactions)
                  .slice(0, 3)
                  .map((emoji, index) => (
                    <Text
                      key={emoji}
                      style={[
                        styles.reactionEmoji,
                        index > 0 && styles.overlappingEmoji,
                      ]}
                    >
                      {emoji}
                    </Text>
                  ))}
              </View>
              <Text style={[styles.reactionCount, { color: colors.text }]}>
                {Object.values(groupedReactions).reduce(
                  (total, reactionList) => total + reactionList.length,
                  0,
                )}
              </Text>
            </TouchableOpacity>
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
          <View style={styles.bottomSheet}>
            <TouchableOpacity activeOpacity={1}>
              <View style={styles.bottomSheetHeader}>
                <Text style={[styles.bottomSheetTitle, { color: colors.text }]}>
                  Reactions
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
                              "Unknown"}
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
  authorName: {
    fontSize: 12,
    marginBottom: 2,
    marginLeft: 8,
  },
  bubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 18,
    maxWidth: "100%",
    zIndex: 1,
  },
  imageBubble: {
    padding: 0,
    borderRadius: 12,
    maxWidth: "100%",
    zIndex: 1,
    backgroundColor: "transparent",
    marginBottom: 4,
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
  imageContainer: {
    position: "relative",
    width: 200,
    height: 150,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 4,
  },
  imageLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  ownMessageText: {
    color: "white",
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
  reactionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginLeft: 2,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.15)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    zIndex: 1,
  },
  reactionEmojis: {
    flexDirection: "row",
    marginRight: 2,
    alignItems: "center",
  },
  reactionEmoji: {
    fontSize: 10,
    height: 12,
    textAlign: "center",
    lineHeight: 12,
  },
  overlappingEmoji: {
    marginLeft: -4,
  },
  reactionCount: {
    fontSize: 9,
    fontWeight: "600",
    minWidth: 10,
    textAlign: "center",
  },
  reactionModalOverlay: {
    flex: 1,
    backgroundColor: "transparent",
    justifyContent: "flex-start",
    alignItems: "flex-start",
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
  reactionOptionsOther: {
    left: 8,
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
