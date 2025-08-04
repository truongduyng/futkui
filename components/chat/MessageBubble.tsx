import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Reaction {
  id: string;
  emoji: string;
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
}

export function MessageBubble({
  content,
  author,
  createdAt,
  isOwnMessage,
  reactions,
  onReactionPress,
  onAddReaction,
}: MessageBubbleProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const [showReactionOptions, setShowReactionOptions] = useState(false);

  const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const groupedReactions = reactions.reduce((acc, reaction) => {
    if (!acc[reaction.emoji]) {
      acc[reaction.emoji] = [];
    }
    acc[reaction.emoji].push(reaction);
    return acc;
  }, {} as Record<string, Reaction[]>);

  const handleLongPress = () => {
    if (onAddReaction) {
      setShowReactionOptions(true);
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
    <TouchableOpacity
      style={[
        styles.container,
        isOwnMessage ? styles.ownMessage : styles.otherMessage
      ]}
      onPress={handleTapOutside}
      activeOpacity={1}
    >
      {!isOwnMessage && (
        <Text style={[styles.authorName, { color: colors.text }]}>
          {author?.handle || 'Unknown'}
        </Text>
      )}

      <TouchableOpacity
        onLongPress={handleLongPress}
        activeOpacity={0.8}
        style={[
          styles.bubble,
          isOwnMessage
            ? [styles.ownBubble, { backgroundColor: colors.tint }]
            : [styles.otherBubble, { backgroundColor: colorScheme === 'dark' ? '#2A2A2A' : '#F0F0F0' }]
        ]}
      >
        <Text style={[
          styles.messageText,
          isOwnMessage
            ? styles.ownMessageText
            : { color: colors.text }
        ]}>
          {content}
        </Text>
      </TouchableOpacity>

      <View style={styles.messageFooter}>
        <Text style={[styles.timeText, { color: colors.tabIconDefault }]}>
          {formatTime(createdAt)}
        </Text>

        {Object.keys(groupedReactions).length > 0 && (
          <View style={styles.reactionsContainer}>
            {Object.entries(groupedReactions).map(([emoji, reactions]) => (
              <TouchableOpacity
                key={emoji}
                style={styles.reactionButton}
                onPress={() => onReactionPress(emoji)}
              >
                <Text style={styles.reactionEmoji}>{emoji}</Text>
                <Text style={[styles.reactionCount, { color: colors.text }]}>
                  {reactions.length}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {showReactionOptions && onAddReaction && (
        <View style={[styles.reactionOptionsContainer, { backgroundColor: colors.background }]}>
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
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  ownMessage: {
    alignSelf: 'flex-end',
  },
  otherMessage: {
    alignSelf: 'flex-start',
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
    maxWidth: '100%',
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
    color: 'white',
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    marginHorizontal: 8,
  },
  timeText: {
    fontSize: 10,
  },
  reactionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-end',
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 4,
    marginBottom: 2,
  },
  reactionEmoji: {
    fontSize: 14,
    marginRight: 2,
  },
  reactionCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  reactionOptionsContainer: {
    flexDirection: 'row',
    marginTop: 8,
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reactionOptionButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginHorizontal: 2,
  },
  reactionOptionEmoji: {
    fontSize: 18,
  },
});
