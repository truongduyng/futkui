import { Colors } from '@/constants/Colors';
import React from 'react';
import { Text, TextStyle } from 'react-native';

interface MentionTextProps {
  text: string;
  style?: TextStyle;
  mentionStyle?: TextStyle;
}

export const MentionText = React.memo(function MentionText({ text, style, mentionStyle }: MentionTextProps) {
  const colors = Colors['light'];
  
  // Parse text to find mentions (@username)
  const parts = text.split(/(@\w+)/g);
  
  return (
    <Text style={style}>
      {parts.map((part, index) => {
        if (part.startsWith('@')) {
          // This is a mention
          return (
            <Text
              key={index}
              style={[
                {
                  color: colors.tint,
                  fontWeight: '600',
                },
                mentionStyle,
              ]}
            >
              {part}
            </Text>
          );
        } else {
          // Regular text
          return part;
        }
      })}
    </Text>
  );
});