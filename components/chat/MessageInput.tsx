import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import React, { useRef, useState } from 'react';
import { Alert, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { CreatePollModal } from './CreatePollModal';
import { MentionPicker } from './MentionPicker';

interface PollOption {
  id: string;
  text: string;
}

interface Member {
  id: string;
  handle: string;
  displayName?: string;
}

interface MessageInputProps {
  onSendMessage: (message: string, imageUri?: string, mentions?: string[]) => void;
  onSendPoll?: (question: string, options: PollOption[], allowMultiple: boolean, expiresAt?: number) => void;
  members?: Member[];
  disabled?: boolean;
}

export function MessageInput({ onSendMessage, onSendPoll, members = [], disabled }: MessageInputProps) {
  const [message, setMessage] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPollModal, setShowPollModal] = useState(false);
  const [currentMentionSearch, setCurrentMentionSearch] = useState<string>('');
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const colors = Colors['light'];

  const handleSend = () => {
    if ((message.trim() || selectedImage) && !disabled) {
      // Extract mentions from the message
      const mentionMatches = message.match(/@(\w+)/g) || [];
      const mentions = mentionMatches.map(match => match.substring(1)); // Remove @ symbol
      
      onSendMessage(message.trim(), selectedImage || undefined, mentions);
      setMessage('');
      setSelectedImage(null);
      setShowMentionPicker(false);
      setCurrentMentionSearch('');
    }
  };

  const compressImage = async (uri: string): Promise<string> => {
    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync({
        uri,
        actions: [
          // Resize if image is too large
          { resize: { width: 1024 } }, // Maintain aspect ratio, max width 1024px
        ],
        saveOptions: {
          compress: 0.7, // 70% quality
          format: ImageManipulator.SaveFormat.JPEG,
        }
      });
      return manipulatedImage.uri;
    } catch (error) {
      console.warn('Image compression failed, using original:', error);
      return uri; // Fallback to original if compression fails
    }
  };

  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.9, // Use higher quality initially, we'll compress it ourselves
      });

      if (!result.canceled && result.assets[0]) {
        // Compress the selected image
        const compressedUri = await compressImage(result.assets[0].uri);
        setSelectedImage(compressedUri);
      }
    } catch {
      Alert.alert('Error', 'Failed to pick image');
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  const handleCreatePoll = (question: string, options: PollOption[], allowMultiple: boolean, expiresAt?: number) => {
    if (onSendPoll) {
      onSendPoll(question, options, allowMultiple, expiresAt);
    }
  };

  const handleTextChange = (text: string) => {
    setMessage(text);
    
    // Check for mention trigger (@)
    const words = text.split(' ');
    const currentWord = words[words.length - 1];
    
    if (currentWord.startsWith('@') && currentWord.length > 1) {
      setCurrentMentionSearch(currentWord);
      setShowMentionPicker(true);
    } else if (showMentionPicker && !currentWord.startsWith('@')) {
      setShowMentionPicker(false);
      setCurrentMentionSearch('');
    }
  };

  const handleSelectMention = (member: Member) => {
    const words = message.split(' ');
    const lastWordIndex = words.length - 1;
    
    // Replace the last word (which should be the partial mention) with the full mention
    words[lastWordIndex] = `@${member.handle}`;
    const newMessage = words.join(' ') + ' '; // Add space after mention
    
    setMessage(newMessage);
    setShowMentionPicker(false);
    setCurrentMentionSearch('');
    
    // Focus back to input
    inputRef.current?.focus();
  };

  return (
    <View style={styles.container}>
      {selectedImage && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
          <TouchableOpacity style={styles.removeImageButton} onPress={removeImage}>
            <Text style={styles.removeImageText}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={[styles.inputContainer, { backgroundColor: colors.background }]}>
        <TouchableOpacity
          style={styles.imageButton}
          onPress={pickImage}
          disabled={disabled}
          activeOpacity={0.6}
        >
          <Ionicons
            name="camera"
            size={20}
            color={colors.tabIconDefault}
          />
        </TouchableOpacity>

        {onSendPoll && (
          <TouchableOpacity
            style={styles.pollButton}
            onPress={() => setShowPollModal(true)}
            disabled={disabled}
            activeOpacity={0.6}
          >
            <Ionicons
              name="bar-chart"
              size={20}
              color={colors.tabIconDefault}
            />
          </TouchableOpacity>
        )}

        <TextInput
          ref={inputRef}
          style={[styles.textInput, { color: colors.text }]}
          value={message}
          onChangeText={handleTextChange}
          placeholder="Type a message..."
          placeholderTextColor={colors.tabIconDefault}
          multiline
          maxLength={1000}
          editable={!disabled}
          textAlignVertical="top"
          scrollEnabled={true}
          returnKeyType="default"
        />

        <TouchableOpacity
          style={[
            styles.sendButton,
            { backgroundColor: (message.trim() || selectedImage) ? colors.tint : colors.tabIconDefault }
          ]}
          onPress={handleSend}
          disabled={!(message.trim() || selectedImage) || disabled}
        >
          <Text style={styles.sendButtonText}>Send</Text>
        </TouchableOpacity>
      </View>

      <MentionPicker
        members={members}
        searchText={currentMentionSearch}
        onSelectMention={handleSelectMention}
        visible={showMentionPicker}
      />

      <CreatePollModal
        visible={showPollModal}
        onClose={() => setShowPollModal(false)}
        onCreatePoll={handleCreatePoll}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 34,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    maxHeight: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    minHeight: 28,
    maxHeight: 100,
    paddingHorizontal: 8,
    paddingVertical: 8,
    lineHeight: 20,
  },
  sendButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    marginLeft: 8,
    alignSelf: 'flex-end',
  },
  sendButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  imageButton: {
    width: 26,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pollButton: {
    width: 26,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 4,
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 8,
    marginHorizontal: 16,
  },
  imagePreview: {
    width: 120,
    height: 90,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  removeImageText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
