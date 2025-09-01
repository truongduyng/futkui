import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { Text, TextStyle, TouchableOpacity } from 'react-native';

interface MentionTextProps {
  text: string;
  style?: TextStyle;
  mentionStyle?: TextStyle;
  onLinkPress?: (url: string) => void;
}

export const MentionText = React.memo(function MentionText({ text, style, mentionStyle, onLinkPress }: MentionTextProps) {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  // URL regex pattern to match http/https URLs
  const urlPattern = /(https?:\/\/[^\s]+)/g;
  const mentionPattern = /(@\w+)/g;

  // First split by URLs, then by mentions
  const urlParts = text.split(urlPattern);

  const renderPart = (part: string, partIndex: number) => {
    // Check if this part is a URL
    if (urlPattern.test(part)) {
      return (
        <TouchableOpacity
          key={partIndex}
          onPress={() => onLinkPress?.(part)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              {
                color: colors.tint,
                textDecorationLine: 'underline',
                fontWeight: '500',
              },
              mentionStyle,
            ]}
          >
            {part}
          </Text>
        </TouchableOpacity>
      );
    }

    // Split by mentions for non-URL parts
    const mentionParts = part.split(mentionPattern);

    return mentionParts.map((mentionPart, mentionIndex) => {
      if (mentionPart.startsWith('@')) {
        // This is a mention
        return (
          <Text
            key={`${partIndex}-${mentionIndex}`}
            style={[
              {
                color: colors.tint,
                fontWeight: '600',
              },
              mentionStyle,
            ]}
          >
            {mentionPart}
          </Text>
        );
      } else {
        // Regular text
        return mentionPart;
      }
    });
  };

  return (
    <Text style={style}>
      {urlParts.map((part, index) => renderPart(part, index))}
    </Text>
  );
});
