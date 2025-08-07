import { Colors } from '@/constants/Colors';
import React, { useState } from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  content: string;
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
}

export function MessageBubble({
  content,
  author,
  createdAt,
  isOwnMessage,
  reactions,
  onReactionPress,
  onAddReaction,
  showTimestamp = true,
}: MessageBubbleProps) {
  const colors = Colors["light"];
  const [showReactionOptions, setShowReactionOptions] = useState(false);
  const [showReactionDetails, setShowReactionDetails] = useState(false);
  const [messagePosition, setMessagePosition] = useState({ x: 0, y: 0, width: 0, height: 0 });

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

  const handleLongPress = (event: any) => {
    if (onAddReaction && !isOwnMessage) {
      // Get the message bubble position
      event.target.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
        setMessagePosition({ x: pageX, y: pageY, width, height });
        setShowReactionOptions(true);
      });
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
  };

  return (
    <>
      <TouchableOpacity
        style={[
          styles.container,
          isOwnMessage ? styles.ownMessage : styles.otherMessage,
        ]}
        onPress={handleTapOutside}
        activeOpacity={1}
      >
        {!isOwnMessage && (
          <Text style={[styles.authorName, { color: colors.text }]}>
            {author?.handle || "Unknown"}
          </Text>
        )}

        <View style={styles.messageContainer}>
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
            <Text
              style={[
                styles.messageText,
                isOwnMessage ? styles.ownMessageText : { color: colors.text },
              ]}
            >
              {content}
            </Text>
          </TouchableOpacity>
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
                  position: 'absolute',
                  left: messagePosition.x,
                  top: messagePosition.y + messagePosition.height + 10,
                }
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

        <View style={styles.messageFooter}>
          {showTimestamp && (
            <Text style={[styles.timeText, { color: colors.tabIconDefault }]}>
              {formatTime(createdAt)}
            </Text>
          )}

          {Object.keys(groupedReactions).length > 0 && (
            <View style={styles.reactionsContainer}>
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
}

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
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    marginTop: 4,
  },
  reactionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.08)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 4,
    marginBottom: 2,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  reactionEmojis: {
    flexDirection: "row",
    marginRight: 1,
    alignItems: "center",
  },
  reactionEmoji: {
    fontSize: 14,
    width: 20,
    height: 20,
    textAlign: "center",
    lineHeight: 20,
  },
  overlappingEmoji: {
    marginLeft: -7,
  },
  reactionCount: {
    fontSize: 13,
    fontWeight: "500",
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
