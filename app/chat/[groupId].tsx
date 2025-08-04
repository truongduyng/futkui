import { AuthGate } from '@/components/AuthGate';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageInput } from '@/components/chat/MessageInput';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useInstantDB } from '@/hooks/useInstantDB';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ChatScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { instantClient, useGroup, sendMessage, addReaction } = useInstantDB();
  const { user } = instantClient.useAuth();
  const { data: groupData, isLoading } = useGroup(groupId || '');

  // Use the authenticated user's email as the current user name
  const currentUserName = user?.email || 'Anonymous';

  const group = groupData?.groups?.[0];
  const messages = group?.messages || [];

  const handleSendMessage = async (content: string) => {
    if (!groupId) return;

    try {
      await sendMessage({
        groupId,
        content,
        authorName: currentUserName,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to send message. Please try again.');
      console.error('Error sending message:', error);
    }
  };

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!groupId) return;

    try {
      await addReaction({
        messageId,
        emoji,
        userName: currentUserName,
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to add reaction. Please try again.');
      console.error('Error adding reaction:', error);
    }
  };

  const handleReactionPress = (messageId: string, emoji: string) => {
    handleAddReaction(messageId, emoji);
  };

  const renderMessage = ({ item: message }: { item: any }) => {
    const isOwnMessage = message.authorName === currentUserName;

    return (
      <MessageBubble
        content={message.content}
        authorName={message.authorName}
        createdAt={new Date(message.createdAt)}
        isOwnMessage={isOwnMessage}
        reactions={message.reactions || []}
        onReactionPress={(emoji: string) => handleReactionPress(message.id, emoji)}
        onAddReaction={(emoji: string) => handleAddReaction(message.id, emoji)}
      />
    );
  };

  if (isLoading) {
    return (
      <AuthGate>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[styles.backButton, { color: colors.tint }]}>← Back</Text>
            </TouchableOpacity>
            <Text style={[styles.loadingText, { color: colors.text }]}>Loading...</Text>
          </View>
        </View>
      </AuthGate>
    );
  }

  if (!group) {
    return (
      <AuthGate>
        <View style={[styles.container, { backgroundColor: colors.background }]}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={[styles.backButton, { color: colors.tint }]}>← Back</Text>
            </TouchableOpacity>
            <Text style={[styles.errorText, { color: colors.text }]}>Group not found</Text>
          </View>
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
          keyboardVerticalOffset={Platform.OS === 'ios' ? 65 : 0}
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
            automaticallyAdjustKeyboardInsets={Platform.OS === 'ios'}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  backButton: {
    fontSize: 16,
    marginRight: 16,
  },
  groupInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  groupEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  groupName: {
    fontSize: 18,
    fontWeight: '600',
  },
  memberCount: {
    fontSize: 12,
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
});
