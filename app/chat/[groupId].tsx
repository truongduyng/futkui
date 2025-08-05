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

  const { useGroup, useProfile, sendMessage, addReaction } = useInstantDB();
  const { data: groupData, isLoading } = useGroup(groupId || '');
  const { data: profileData } = useProfile();
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

  const handleAddReaction = async (messageId: string, emoji: string) => {
    if (!currentProfile) {
      Alert.alert('Error', 'Please wait for your profile to load.');
      return;
    }

    try {
      await addReaction({
        messageId,
        emoji,
        userId: currentProfile.id,
        userName: currentProfile.handle,
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
    const isOwnMessage = message.author?.id === currentProfile?.id;

    return (
      <MessageBubble
        content={message.content}
        author={message.author}
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
});
