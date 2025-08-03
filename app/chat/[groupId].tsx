import { AuthGate } from '@/components/AuthGate';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { MessageInput } from '@/components/chat/MessageInput';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useInstantDB } from '@/hooks/useInstantDB';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export default function ChatScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const [currentUserName, setCurrentUserName] = useState('');
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { useGroup, sendMessage, addReaction } = useInstantDB();
  const { data: groupData, isLoading } = useGroup(groupId || '');

  useEffect(() => {
    // For testing, set a random user name
    if (!currentUserName) {
      const randomNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
      setCurrentUserName(randomNames[Math.floor(Math.random() * randomNames.length)]);
    }
  }, [currentUserName]);

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

  const handleAddReaction = async (emoji: string) => {
    if (!groupId) return;

    try {
      // For now, we'll add a reaction to the last message
      // In a real app, you'd want to let users select which message to react to
      const lastMessage = messages[messages.length - 1];
      if (lastMessage && lastMessage.id) {
        await addReaction({
          messageId: lastMessage.id,
          emoji,
          userName: currentUserName,
        });
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to add reaction. Please try again.');
      console.error('Error adding reaction:', error);
    }
  };

  const handleReactionPress = (emoji: string) => {
    handleAddReaction(emoji);
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
        onReactionPress={handleReactionPress}
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
            <Text style={styles.groupEmoji}>{group.avatar}</Text>
            <View>
              <Text style={[styles.groupName, { color: colors.text }]}>{group.name}</Text>
            </View>
          </View>
        </View>

        <FlatList
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messageList}
          contentContainerStyle={styles.messageListContent}
          inverted={false}
        />

        <MessageInput
          onSendMessage={handleSendMessage}
          onAddReaction={handleAddReaction}
        />
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
