import { AuthGate } from '@/components/AuthGate';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageInput } from '@/components/chat/MessageInput';
import { Colors } from '@/constants/Colors';
import { useInstantDB } from '@/hooks/useInstantDB';
import { useLocalSearchParams } from 'expo-router';
import React from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ChatScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const colors = Colors['light'];
  const insets = useSafeAreaInsets();

  const { useGroup, useProfile, sendMessage, addReaction, instantClient } = useInstantDB();
  const { data: groupData, isLoading } = useGroup(groupId || '');
  const { data: profileData } = useProfile();
  const { user } = instantClient.useAuth();
  const currentProfile = profileData?.profiles?.[0];

  const group = groupData?.groups?.[0];
  const messages = group?.messages || [];

  const handleSendMessage = async (content: string) => {
    if (!groupId || !currentProfile) {
      Alert.alert('Error', 'Please wait for your profile to load.');
      return;
    }

    try {
      await sendMessage({
        groupId,
        content,
        authorId: currentProfile.id,
        authorName: currentProfile.handle,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
      console.error('Error sending message:', error);
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string, existingReactions: any[]) => {
    if (!currentProfile || !user) {
      Alert.alert('Error', 'Please wait for your profile to load.');
      return;
    }

    try {
      await addReaction({
        messageId,
        emoji,
        userId: currentProfile.id, // Use profile ID to match schema
        userName: currentProfile.handle,
        existingReactions,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to add reaction. Please try again.');
      console.error('Error adding reaction:', error);
    }
  };

  const handleReactionPress = (messageId: string, emoji: string, existingReactions: any[]) => {
    handleAddReaction(messageId, emoji, existingReactions);
  };

  const shouldShowTimestamp = (currentMessage: any, previousMessage: any): boolean => {
    if (!previousMessage) return true;
    
    const currentTime = new Date(currentMessage.createdAt);
    const previousTime = new Date(previousMessage.createdAt);
    
    // Show timestamp if messages are more than 15 minutes apart
    const timeDifference = currentTime.getTime() - previousTime.getTime();
    const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds
    
    return timeDifference >= fifteenMinutes;
  };

  const renderMessage = ({ item: message, index }: { item: any; index: number }) => {
    const isOwnMessage = message.author?.id === currentProfile?.id;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showTimestamp = shouldShowTimestamp(message, previousMessage);

    return (
      <>
        {showTimestamp && (
          <View style={styles.timestampHeader}>
            <Text style={[styles.timestampText, { color: colors.tabIconDefault }]}>
              {new Date(message.createdAt).toLocaleString([], {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        )}
        <MessageBubble
          content={message.content}
          author={message.author}
          createdAt={new Date(message.createdAt)}
          isOwnMessage={isOwnMessage}
          reactions={message.reactions || []}
          onReactionPress={(emoji: string) => handleReactionPress(message.id, emoji, message.reactions || [])}
          onAddReaction={(emoji: string) => handleAddReaction(message.id, emoji, message.reactions || [])}
          showTimestamp={false}
        />
      </>
    );
  };

  if (isLoading) {
    return (
      <AuthGate>
        <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
        </View>
      </AuthGate>
    );
  }

  if (!group) {
    return (
      <AuthGate>
        <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
          <Text style={[styles.errorText, { color: colors.text }]}>Group not found</Text>
        </View>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <View style={[styles.container, { backgroundColor: colors.background }]}>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.bottom + 49 : 0}
          enabled
        >
          <FlatList
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
            inverted={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={false}
            onContentSizeChange={() => {}}
            onLayout={() => {}}
          />

          <MessageInput
            onSendMessage={handleSendMessage}
          />
        </KeyboardAvoidingView>
      </View>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  timestampHeader: {
    alignItems: 'center',
    marginVertical: 16,
  },
  timestampText: {
    fontSize: 12,
    fontWeight: '500',
    backgroundColor: 'rgba(0, 0, 0, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
