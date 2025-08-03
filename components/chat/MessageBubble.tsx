import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Reaction {
  id: string;
  emoji: string;
  userName: string;
}

interface MessageBubbleProps {
  content: string;
  authorName: string;
  createdAt: Date;
  isOwnMessage: boolean;
  reactions: Reaction[];
  onReactionPress: (emoji: string) => void;
}

export function MessageBubble({
  content,
  authorName,
  createdAt,
  isOwnMessage,
  reactions,
  onReactionPress,
}: MessageBubbleProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

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

  return (
    <View style={[
      styles.container,
      isOwnMessage ? styles.ownMessage : styles.otherMessage
    ]}>
      {!isOwnMessage && (
        <Text style={[styles.authorName, { color: colors.text }]}>
          {authorName}
        </Text>
      )}

      <View style={[
        styles.bubble,
        isOwnMessage
          ? [styles.ownBubble, { backgroundColor: colors.tint }]
          : [styles.otherBubble, { backgroundColor: colors.background }]
      ]}>
        <Text style={[
          styles.messageText,
          isOwnMessage
            ? styles.ownMessageText
            : { color: colors.text }
        ]}>
          {content}
        </Text>
      </View>

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
  timeText: {
    fontSize: 10,
    marginTop: 2,
    marginHorizontal: 8,
  },
  reactionsContainer: {
    flexDirection: 'row',
    marginTop: 4,
    marginLeft: 8,
    flexWrap: 'wrap',
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 4,
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
});
