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

  const { instantClient, useGroup, useProfile, sendMessage, addReaction } = useInstantDB();
  const { user } = instantClient.useAuth();
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
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={[styles.backButton, { color: colors.tint }]}>← Back</Text>
          </TouchableOpacity>
          <View style={styles.groupInfo}>
            <Text style={[styles.groupEmoji, { color: colors.text }]}>
              {group.name.charAt(0).toUpperCase()}
            </Text>
            <View>
              <Text style={[styles.groupName, { color: colors.text }]}>
                {group.name}
              </Text>
              <Text style={[styles.memberCount, { color: colors.tabIconDefault }]}>
                Created by {group.admin?.handle || 'Unknown'}
              </Text>
            </View>
          </View>
        </View>

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
