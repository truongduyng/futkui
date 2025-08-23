import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/Colors';

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

interface ReactionButtonProps {
  groupedReactions: Record<string, Reaction[]>;
  onPress: () => void;
}

export const ReactionButton = React.memo(function ReactionButton({
  groupedReactions,
  onPress,
}: ReactionButtonProps) {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const totalReactionCount = useMemo(() => {
    return Object.values(groupedReactions).reduce(
      (total, reactionList) => total + reactionList.length,
      0,
    );
  }, [groupedReactions]);

  const dynamicStyle = useMemo(() => ({
    backgroundColor: isDark ? "rgba(42, 42, 42, 0.9)" : "rgba(255, 255, 255, 0.9)",
    borderColor: isDark ? "rgba(255, 255, 255, 0.15)" : "rgba(0, 0, 0, 0.15)",
  }), [isDark]);

  return (
    <TouchableOpacity
      style={[styles.reactionButton, dynamicStyle]}
      onPress={onPress}
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
        {totalReactionCount}
      </Text>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  reactionButton: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 4,
    paddingVertical: 2,
    marginLeft: 2,
    borderWidth: 1,
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
});