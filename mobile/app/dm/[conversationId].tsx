import React, { useEffect, useState, useCallback } from "react";
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from "@/constants/Colors";
import { useInstantDB } from "@/hooks/db/useInstantDB";
import { useTranslation } from 'react-i18next';
import { useToast } from "@/hooks/useToast";

import { MessageInput } from "@/components/chat/MessageInput";
import { ImageModal } from "@/components/chat/ImageModal";
import { LoadingStates } from "@/components/chat/LoadingStates";

export default function DMChatScreen() {
  const params = useLocalSearchParams<{ conversationId: string }>();
  const conversationId = params?.conversationId;
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { showError } = useToast();

  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const {
    useDMMessages,
    useProfile,
    sendDMMessage,
    instantClient,
  } = useInstantDB();

  // Data queries
  const { data: messagesData, isLoading: isLoadingMessages } = useDMMessages(conversationId || "", 50);
  const { data: profileData } = useProfile();

  const currentProfile = profileData?.profiles?.[0];
  const messages = messagesData?.messages || [];

  // Get conversation details to determine the other participant
  const [otherParticipant, setOtherParticipant] = useState<any>(null);

  useEffect(() => {
    if (!conversationId || !currentProfile?.id) return;

    const fetchConversation = async () => {
      try {
        const conversationQuery = await instantClient.queryOnce({
          conversations: {
            $: { where: { id: conversationId } },
            participant1: {},
            participant2: {},
          },
        });

        const conversation = conversationQuery.data.conversations?.[0];
        if (conversation) {
          // Determine which participant is the other user
          const otherUser = conversation.participant1?.id === currentProfile.id
            ? conversation.participant2
            : conversation.participant1;
          setOtherParticipant(otherUser);
        }
      } catch (error) {
        console.error('Error fetching conversation:', error);
      }
    };

    fetchConversation();
  }, [conversationId, currentProfile?.id, instantClient]);

  // Set navigation title
  useEffect(() => {
    if (otherParticipant) {
      navigation.setOptions({
        title: otherParticipant.displayName || otherParticipant.handle || 'Direct Message',
        headerBackTitle: t('common.back'),
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.tint,
        headerTitleStyle: {
          color: colors.text,
        },
      });
    }
  }, [otherParticipant, colors, navigation, t]);

  // Handle sending messages
  const handleSendMessage = useCallback(async (content: string, imageUri?: string) => {
    if (!currentProfile?.id || !conversationId) {
      showError(t('hooks.sendMessage.errorTitle'), t('hooks.sendMessage.waitProfile'));
      return;
    }

    try {
      await sendDMMessage({
        conversationId,
        content,
        authorId: currentProfile.id,
        authorName: currentProfile.handle,
        imageUri,
      });
    } catch (error) {
      console.error('Failed to send DM:', error);
      showError(t('hooks.sendMessage.errorTitle'), t('hooks.sendMessage.sendFailed'));
    }
  }, [conversationId, currentProfile, sendDMMessage, showError, t]);


  const handleImagePress = useCallback((imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
  }, []);

  // Simple message renderer for DMs (no polls, matches, etc.)
  const renderMessage = useCallback(({ item: message }: { item: any }) => {
    const isCurrentUser = message.author?.id === currentProfile?.id;

    return (
      <View style={[
        styles.messageContainer,
        isCurrentUser ? styles.sentMessage : styles.receivedMessage
      ]}>
        <View style={[
          styles.messageBubble,
          {
            backgroundColor: isCurrentUser ? colors.tint : colors.border,
          }
        ]}>
          {message.imageUrl && (
            <TouchableOpacity onPress={() => handleImagePress(message.imageUrl)}>
              <Text style={[styles.messageText, { color: isCurrentUser ? 'white' : colors.text }]}>
                [Image]
              </Text>
            </TouchableOpacity>
          )}
          {message.content && (
            <Text style={[styles.messageText, { color: isCurrentUser ? 'white' : colors.text }]}>
              {message.content}
            </Text>
          )}
        </View>
        <Text style={[styles.timestamp, { color: colors.tabIconDefault }]}>
          {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  }, [currentProfile?.id, colors, handleImagePress]);

  // Loading states
  if (!conversationId) return <LoadingStates type="loading" />;
  if (isLoadingMessages && messages.length === 0) return <LoadingStates type="loadingMessages" />;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={insets.top + 25}
        enabled
      >
        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          inverted
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        <MessageInput
          onSendMessage={handleSendMessage}
          // Disable group-specific features for DMs
          onSendPoll={async () => {}}
          onCreateMatch={async () => {}}
          onCreateDuesCycle={async () => {}}
          members={[]}
          userMembership={undefined}
          isDirectMessage={true}
        />
      </KeyboardAvoidingView>

      <ImageModal
        visible={!!selectedImageUrl}
        imageUrl={selectedImageUrl}
        onClose={() => setSelectedImageUrl(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  messageContainer: {
    marginVertical: 4,
    maxWidth: '80%',
  },
  sentMessage: {
    alignSelf: 'flex-end',
    alignItems: 'flex-end',
  },
  receivedMessage: {
    alignSelf: 'flex-start',
    alignItems: 'flex-start',
  },
  messageBubble: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    minWidth: 44,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    marginHorizontal: 4,
  },
});