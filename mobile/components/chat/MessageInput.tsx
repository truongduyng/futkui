import { Colors } from "@/constants/Colors";
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from "@expo/vector-icons";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from 'react-i18next';
import { filterContent } from '@/utils/contentFilter';
import { CreatePollModal } from "./CreatePollModal";
import { CreateMatchModal } from "./CreateMatchModal";
import { CreateDuesCycleModal } from "./CreateDuesCycleModal";
import { MentionPicker } from "./MentionPicker";

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
  onSendMessage: (
    message: string,
    imageUri?: string,
    mentions?: string[],
  ) => Promise<void>;
  onSendPoll?: (
    question: string,
    options: PollOption[],
    allowMultiple: boolean,
    allowMembersToAddOptions: boolean,
    expiresAt?: number,
  ) => Promise<void>;
  onCreateMatch?: (matchData: {
    title: string;
    description: string;
    gameType: string;
    location: string;
    matchDate: number;
  }) => Promise<void>;
  onCreateDuesCycle?: (duesData: {
    periodKey: string;
    amountPerMember: number;
    deadline: number;
  }) => Promise<void>;
  members?: Member[];
  disabled?: boolean;
  userMembership?: {
    role?: string;
  };
  isDirectMessage?: boolean;
}

export function MessageInput({
  onSendMessage,
  onSendPoll,
  onCreateMatch,
  onCreateDuesCycle,
  members = [],
  disabled,
  userMembership,
  isDirectMessage = false,
}: MessageInputProps) {
  const { t } = useTranslation();
  const [message, setMessage] = useState("");
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [showPollModal, setShowPollModal] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [showDuesModal, setShowDuesModal] = useState(false);
  const [currentMentionSearch, setCurrentMentionSearch] = useState<string>("");
  const [showMentionPicker, setShowMentionPicker] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const handleSend = async () => {
    if ((message.trim() || selectedImage) && !disabled && !isSending) {
      setIsSending(true);
      // Filter message content
      const filterResult = filterContent(message.trim());

      if (filterResult.isBlocked) {
        Alert.alert(
          t('common.error'),
          filterResult.reason || 'Message contains inappropriate content',
          [{ text: t('common.ok') }]
        );
        return;
      }

      // Extract mentions from the filtered message
      const messageToProcess = filterResult.filteredContent;
      const mentionMatches = messageToProcess.match(/@(\w+)/g) || [];
      const mentions = mentionMatches.map((match) => match.substring(1)); // Remove @ symbol

      // Store values before clearing state
      const messageToSend = messageToProcess;
      const imageToSend = selectedImage || undefined;

      try {
        await onSendMessage(messageToSend, imageToSend, mentions);

        // Clear state only after successful send
        setMessage("");
        setSelectedImage(null);
        setShowMentionPicker(false);
        setCurrentMentionSearch("");
      } catch (error) {
        console.error("Failed to send message:", error);
      } finally {
        setIsSending(false);
      }
    }
  };

  const compressImage = async (uri: string): Promise<string> => {
    try {
      const manipulatedImage = await ImageManipulator.manipulateAsync(
        uri,
        [
          // Resize if image is too large
          { resize: { width: 1024 } }, // Maintain aspect ratio, max width 1024px
        ],
        {
          compress: 0.7, // 70% quality
          format: ImageManipulator.SaveFormat.JPEG,
        }
      );
      return manipulatedImage.uri;
    } catch (error) {
      console.warn("Image compression failed, using original:", error);
      return uri; // Fallback to original if compression fails
    }
  };

  const pickImage = async () => {
    try {
      const { status } =
        await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          t('chat.permissionNeeded'),
          t('chat.cameraRollPermission'),
        );
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        quality: 0.9, // Use higher quality initially, we'll compress it ourselves
      });

      if (!result.canceled && result.assets[0]) {
        // Compress the selected image
        const compressedUri = await compressImage(result.assets[0].uri);
        setSelectedImage(compressedUri);
      }
    } catch {
      Alert.alert(t('common.error'), t('chat.errorPickImage'));
    }
  };

  const removeImage = () => {
    setSelectedImage(null);
  };

  const handleCreatePoll = async (
    question: string,
    options: PollOption[],
    allowMultiple: boolean,
    allowMembersToAddOptions: boolean,
    expiresAt?: number,
  ) => {
    if (onSendPoll && !isSending) {
      // Filter poll question
      const questionFilter = filterContent(question);
      if (questionFilter.isBlocked) {
        Alert.alert(
          t('common.error'),
          questionFilter.reason || 'Poll question contains inappropriate content',
          [{ text: t('common.ok') }]
        );
        return;
      }

      // Filter poll options
      const filteredOptions = options.map(option => {
        const optionFilter = filterContent(option.text);
        if (optionFilter.isBlocked) {
          Alert.alert(
            t('common.error'),
            `Poll option "${option.text}" contains inappropriate content`,
            [{ text: t('common.ok') }]
          );
          return null;
        }
        return {
          ...option,
          text: optionFilter.filteredContent
        };
      }).filter(option => option !== null) as PollOption[];

      if (filteredOptions.length !== options.length) {
        return; // Some options were blocked
      }

      setIsSending(true);
      try {
        await onSendPoll(questionFilter.filteredContent, filteredOptions, allowMultiple, allowMembersToAddOptions, expiresAt);
      } catch (error) {
        console.error("Failed to send poll:", error);
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleCreateMatch = async (matchData: {
    title: string;
    description: string;
    gameType: string;
    location: string;
    matchDate: number;
  }) => {
    if (onCreateMatch && !isSending) {
      // Filter match title
      const titleFilter = filterContent(matchData.title);
      if (titleFilter.isBlocked) {
        Alert.alert(
          t('common.error'),
          titleFilter.reason || 'Match title contains inappropriate content',
          [{ text: t('common.ok') }]
        );
        return;
      }

      // Filter match description
      const descriptionFilter = filterContent(matchData.description);
      if (descriptionFilter.isBlocked) {
        Alert.alert(
          t('common.error'),
          descriptionFilter.reason || 'Match description contains inappropriate content',
          [{ text: t('common.ok') }]
        );
        return;
      }

      const filteredMatchData = {
        ...matchData,
        title: titleFilter.filteredContent,
        description: descriptionFilter.filteredContent,
      };

      setIsSending(true);
      try {
        await onCreateMatch(filteredMatchData);
      } catch (error) {
        console.error("Failed to create match:", error);
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleTextChange = (text: string) => {
    if (isSending) return; // Prevent input changes while sending

    setMessage(text);

    // Check for mention trigger (@)
    const words = text.split(" ");
    const currentWord = words[words.length - 1];

    if (currentWord.startsWith("@") && currentWord.length > 1) {
      setCurrentMentionSearch(currentWord);
      setShowMentionPicker(true);
    } else if (showMentionPicker && !currentWord.startsWith("@")) {
      setShowMentionPicker(false);
      setCurrentMentionSearch("");
    }
  };

  const handleSelectMention = (member: Member) => {
    const words = message.split(" ");
    const lastWordIndex = words.length - 1;

    // Replace the last word (which should be the partial mention) with the full mention
    words[lastWordIndex] = `@${member.handle}`;
    const newMessage = words.join(" ") + " "; // Add space after mention

    setMessage(newMessage);
    setShowMentionPicker(false);
    setCurrentMentionSearch("");

    // Focus back to input
    inputRef.current?.focus();
  };

  const handleCreateDuesCycle = async (duesData: {
    periodKey: string;
    amountPerMember: number;
    deadline: number;
  }) => {
    if (onCreateDuesCycle && !isSending) {
      setIsSending(true);
      try {
        await onCreateDuesCycle(duesData);
      } catch (error) {
        console.error("Failed to create dues cycle:", error);
      } finally {
        setIsSending(false);
      }
    }
  };

  const handleActionMenuSelect = (action: 'image' | 'poll' | 'match' | 'dues') => {
    setShowActionMenu(false);
    
    switch (action) {
      case 'image':
        pickImage();
        break;
      case 'poll':
        setShowPollModal(true);
        break;
      case 'match':
        setShowMatchModal(true);
        break;
      case 'dues':
        setShowDuesModal(true);
        break;
    }
  };

  return (
    <View style={styles.container}>
      {selectedImage && (
        <View style={styles.imagePreviewContainer}>
          <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
          {isSending && (
            <View style={styles.imageLoadingOverlay}>
              <ActivityIndicator size="small" color="white" />
              <Text style={styles.uploadingText}>{t('chat.uploading')}</Text>
            </View>
          )}
          <TouchableOpacity
            style={styles.removeImageButton}
            onPress={removeImage}
            disabled={isSending}
          >
            <Text style={[styles.removeImageText, { opacity: isSending ? 0.5 : 1 }]}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      <View
        style={[styles.inputContainer, { backgroundColor: colors.card }]}
      >
        <TouchableOpacity
          style={styles.addButton}
          onPress={isDirectMessage ? pickImage : () => setShowActionMenu(true)}
          disabled={disabled || isSending}
          activeOpacity={0.6}
        >
          <Ionicons
            name={isDirectMessage ? "camera" : "add"}
            size={20}
            color={disabled || isSending ? colors.tabIconDefault + "40" : colors.tabIconDefault}
          />
        </TouchableOpacity>

        <TextInput
          ref={inputRef}
          style={[styles.textInput, {
            color: colors.text,
            opacity: isSending ? 0.6 : 1
          }]}
          value={message}
          onChangeText={handleTextChange}
          placeholder={isSending ? t('common.sending') : t('chat.typeMessage')}
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
          ]}
          onPress={handleSend}
          disabled={!(message.trim() || selectedImage) || disabled || isSending}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <Text style={styles.sendButtonText}>{t('chat.send')}</Text>
          )}
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

      <CreateMatchModal
        visible={showMatchModal}
        onClose={() => setShowMatchModal(false)}
        onCreateMatch={handleCreateMatch}
      />

      {!isDirectMessage && (
        <Modal
          visible={showActionMenu}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowActionMenu(false)}
        >
        <TouchableOpacity
          style={styles.actionMenuOverlay}
          activeOpacity={1}
          onPress={() => setShowActionMenu(false)}
        >
          <View style={[styles.actionMenu, { backgroundColor: colors.card }]}>
            <TouchableOpacity
              style={styles.actionMenuItem}
              onPress={() => handleActionMenuSelect('image')}
              activeOpacity={0.7}
            >
              <Ionicons name="camera" size={24} color={colors.text} />
              <Text style={[styles.actionMenuText, { color: colors.text }]}>
                {t('chat.image')}
              </Text>
            </TouchableOpacity>

            {onSendPoll && (
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={() => handleActionMenuSelect('poll')}
                activeOpacity={0.7}
              >
                <Ionicons name="bar-chart" size={24} color={colors.text} />
                <Text style={[styles.actionMenuText, { color: colors.text }]}>
                  {t('chat.poll')}
                </Text>
              </TouchableOpacity>
            )}

            {onCreateMatch && (
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={() => handleActionMenuSelect('match')}
                activeOpacity={0.7}
              >
                <Ionicons name="football" size={24} color={colors.text} />
                <Text style={[styles.actionMenuText, { color: colors.text }]}>
                  {t('chat.match')}
                </Text>
              </TouchableOpacity>
            )}

            {onCreateDuesCycle && userMembership?.role === 'admin' && (
              <TouchableOpacity
                style={styles.actionMenuItem}
                onPress={() => handleActionMenuSelect('dues')}
                activeOpacity={0.7}
              >
                <Ionicons name="cash" size={24} color={colors.text} />
                <Text style={[styles.actionMenuText, { color: colors.text }]}>
                  {t('chat.dues')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
      )}

      <CreateDuesCycleModal
        visible={showDuesModal}
        onClose={() => setShowDuesModal(false)}
        onCreateCycle={handleCreateDuesCycle}
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
    flexDirection: "row",
    alignItems: "flex-end",
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 44,
    maxHeight: 120,
    shadowColor: "#000",
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
    alignSelf: "flex-end",
    backgroundColor: Colors['dark'].tint,
  },
  sendButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  addButton: {
    width: 26,
    height: 36,
    borderRadius: 18,
    backgroundColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
  },
  actionMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
    paddingLeft: 16,
    paddingBottom: 88,
  },
  actionMenu: {
    borderRadius: 16,
    padding: 8,
    minWidth: 150,
    maxWidth: 200,
    alignSelf: "flex-start",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  actionMenuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionMenuText: {
    fontSize: 16,
    marginLeft: 12,
    fontWeight: "500",
  },
  imagePreviewContainer: {
    position: "relative",
    marginBottom: 8,
    marginHorizontal: 16,
  },
  imagePreview: {
    width: 120,
    height: 90,
    borderRadius: 8,
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  removeImageText: {
    color: "white",
    fontSize: 12,
    fontWeight: "bold",
  },
  imageLoadingOverlay: {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: [{ translateX: -30 }, { translateY: -10 }],
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  uploadingText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
});
