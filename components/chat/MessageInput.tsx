import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface MessageInputProps {
  onSendMessage: (message: string) => void;
  onAddReaction: (emoji: string) => void;
  disabled?: boolean;
}

const QUICK_REACTIONS = ['👍', '❤️', '😂', '😮', '😢', '😡'];

export function MessageInput({ onSendMessage, onAddReaction, disabled }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [showReactions, setShowReactions] = useState(false);
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const handleSend = () => {
    if (message.trim() && !disabled) {
      onSendMessage(message.trim());
      setMessage('');
    }
  };

  const handleReaction = (emoji: string) => {
    onAddReaction(emoji);
    setShowReactions(false);
  };

  return (
    <View style={styles.container}>
      {showReactions && (
        <View style={[styles.reactionsContainer, { backgroundColor: colors.background }]}>
          {QUICK_REACTIONS.map((emoji) => (
            <TouchableOpacity
              key={emoji}
              style={styles.reactionButton}
              onPress={() => handleReaction(emoji)}
            >
              <Text style={styles.reactionEmoji}>{emoji}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <View style={[styles.inputContainer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={styles.reactionToggle}
          onPress={() => setShowReactions(!showReactions)}
        >
          <Text style={[styles.reactionToggleText, { color: colors.text }]}>😊</Text>
        </TouchableOpacity>

        <TextInput
          style={[styles.textInput, { color: colors.text }]}
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message..."
          placeholderTextColor={colors.tabIconDefault}
          multiline
          maxLength={1000}
          editable={!disabled}
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: message.trim() ? colors.tint : colors.tabIconDefault }
          ]}
          onPress={handleSend}
          disabled={!message.trim() || disabled}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  reactionsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 8,
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reactionButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 4,
  },
  reactionEmoji: {
    fontSize: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reactionToggle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  reactionToggleText: {
    fontSize: 20,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    maxHeight: 100,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginLeft: 8,
  },
  sendButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});
