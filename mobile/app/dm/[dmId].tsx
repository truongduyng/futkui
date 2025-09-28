import { MessageBubble } from "@/components/chat/MessageBubble";
import { ImageModal } from "@/components/chat/ImageModal";
import { LoadingStates } from "@/components/chat/LoadingStates";
import { MessageInput } from "@/components/chat/MessageInput";
import { Colors } from "@/constants/Colors";
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useInstantDB } from "@/hooks/db/useInstantDB";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import * as Clipboard from "expo-clipboard";
import { useToast } from "@/hooks/useToast";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function DMScreen() {
  const params = useLocalSearchParams<{ dmId: string }>();
  const dmId = params?.dmId;
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [messageLimit, setMessageLimit] = useState(500);

  const {
    useDMMessages,
    useProfile,
    sendDMMessage,
    addReaction,
    removeReaction,
    markDMAsRead,
    instantClient,
  } = useInstantDB();

  const { user } = instantClient.useAuth();

  // Get user profile
  const { data: profileData } = useProfile();
  const userProfile = profileData?.profiles?.[0];

  // Get DM messages
  const { data: messagesData, isLoading: messagesLoading } = useDMMessages(dmId || '', messageLimit);
  const messages = messagesData?.messages || [];

  // Get conversation info to find the other participant
  const conversation = messages[0]?.conversation;
  const otherParticipant = conversation?.participant1?.id === userProfile?.id
    ? conversation?.participant2
    : conversation?.participant1;

  // Set navigation title
  useEffect(() => {
    if (otherParticipant) {
      navigation.setOptions({
        title: otherParticipant.displayName || otherParticipant.handle,
        headerRight: () => (
          <TouchableOpacity
            onPress={() => {
              // Could add DM-specific options here
            }}
            style={{ marginRight: 16 }}
          >
            <Ionicons name="ellipsis-horizontal" size={24} color={colors.text} />
          </TouchableOpacity>
        ),
      });
    }
  }, [navigation, otherParticipant, colors.text]);

  // Mark DM as read when messages change
  useEffect(() => {
    if (dmId && userProfile?.id && messages.length > 0) {
      markDMAsRead(dmId, userProfile.id).catch(console.error);
    }
  }, [dmId, userProfile?.id, messages, markDMAsRead]);

  // Copy text to clipboard
  const copyToClipboard = useCallback(async (text: string) => {
    try {
      await Clipboard.setStringAsync(text);
      showSuccess(t('chat.copySuccessMessage'));
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      showError(t('chat.copyError'));
    }
  }, [showSuccess, showError, t]);

  // Handle reaction add/remove
  const handleReaction = useCallback(async (messageId: string, emoji: string, existingReactions: any[]) => {
    if (!userProfile) {
      showError(t('hooks.addReaction.waitProfile'));
      return;
    }

    try {
      const existingReaction = existingReactions.find(
        (reaction: any) => reaction.user?.id === userProfile.id
      );

      if (existingReaction) {
        if (existingReaction.emoji === emoji) {
          // Remove reaction if same emoji
          await removeReaction(existingReaction.id);
        } else {
          // Update reaction if different emoji
          await addReaction({
            messageId,
            emoji,
            userId: userProfile.id,
            userName: userProfile.displayName || userProfile.handle,
            existingReactions,
          });
        }
      } else {
        // Add new reaction
        await addReaction({
          messageId,
          emoji,
          userId: userProfile.id,
          userName: userProfile.displayName || userProfile.handle,
          existingReactions,
        });
      }
    } catch (error) {
      console.error('Error handling reaction:', error);
      showError(t('hooks.addReaction.failedAdd'));
    }
  }, [userProfile, addReaction, removeReaction, showError, t]);

  // Send DM message
  const handleSendMessage = useCallback(async (content: string, imageUri?: string, mentions?: string[]) => {
    if (!userProfile || !dmId) {
      showError(t('hooks.sendMessage.waitProfile'));
      return;
    }

    try {
      await sendDMMessage({
        dmId,
        content,
        authorId: userProfile.id,
        authorName: userProfile.displayName || userProfile.handle,
        imageUri,
        mentions,
      });
    } catch (error) {
      console.error('Error sending DM message:', error);
      showError(t('hooks.sendMessage.failedSend'));
    }
  }, [userProfile, dmId, sendDMMessage, showError, t]);

  const renderMessageItem = useCallback(({ item: message }: { item: any }) => {
    return (
      <MessageBubble
        message={message}
        currentUserId={userProfile?.id || ''}
        onReaction={handleReaction}
        onImagePress={setSelectedImageUrl}
        onCopyText={copyToClipboard}
      />
    );
  }, [userProfile?.id, handleReaction, copyToClipboard]);

  const keyExtractor = useCallback((item: any) => item.id, []);

  const renderFooter = useCallback(() => {
    if (messages.length >= messageLimit) {
      return (
        <TouchableOpacity
          style={[styles.loadMoreButton, { backgroundColor: colors.card }]}
          onPress={() => setMessageLimit(prev => prev + 500)}
        >
          <Text style={[styles.loadMoreText, { color: colors.tint }]}>
            Load more messages
          </Text>
        </TouchableOpacity>
      );
    }
    return <View style={styles.topPadding} />;
  }, [messages.length, messageLimit, colors.card, colors.tint]);

  if (!dmId) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.errorText, { color: colors.text }]}>DM not found</Text>
      </View>
    );
  }

  if (messagesLoading && messages.length === 0) {
    return <LoadingStates type="loadingMessages" />;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        data={messages}
        renderItem={renderMessageItem}
        keyExtractor={keyExtractor}
        style={styles.messagesList}
        contentContainerStyle={[
          styles.messagesContainer,
          { paddingBottom: insets.bottom }
        ]}
        inverted
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        maxToRenderPerBatch={10}
        windowSize={10}
        initialNumToRender={20}
        ListFooterComponent={renderFooter}
      />

      <MessageInput
        onSendMessage={handleSendMessage}
      />

      {selectedImageUrl && (
        <ImageModal
          imageUrl={selectedImageUrl}
          isVisible={!!selectedImageUrl}
          onClose={() => setSelectedImageUrl(null)}
        />
      )}
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: 16,
    flexGrow: 1,
  },
  topPadding: {
    height: 20,
  },
  loadMoreButton: {
    alignSelf: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 20,
    marginVertical: 10,
  },
  loadMoreText: {
    fontSize: 14,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
});