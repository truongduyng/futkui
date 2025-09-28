import { useCallback } from 'react';
import { id } from '@instantdb/react-native';
import { instantClient } from './instantClient';
import { uploadToR2 } from '../../utils/r2Upload';

export function useDMOperations() {
  const db = instantClient;

  const createOrGetDM = useCallback(
    async (participant1Id: string, participant2Id: string) => {
      try {
        // Sort participant IDs alphabetically for consistent conversation identification
        const sortedIds = [participant1Id, participant2Id].sort();
        const participantKey = `${sortedIds[0]}_${sortedIds[1]}`;

        // Check if conversation already exists
        const existingConversation = await db.queryOnce({
          conversations: {
            $: {
              where: {
                participantKey: participantKey,
              }
            },
            participant1: {},
            participant2: {},
          },
        });

        if (existingConversation.data.conversations && existingConversation.data.conversations.length > 0) {
          return existingConversation.data.conversations[0].id;
        }

        // Create new conversation
        const conversationId = id();
        const now = Date.now();

        await db.transact([
          db.tx.conversations[conversationId].update({
            participantKey: participantKey,
            createdAt: now,
            lastMessageAt: now,
          }).link({
            participant1: sortedIds[0],
            participant2: sortedIds[1],
          }),
        ]);

        return conversationId;
      } catch (error) {
        console.error('Error creating/getting DM:', error);
        throw error;
      }
    },
    [db]
  );

  const sendDMMessage = useCallback(
    async (messageData: {
      conversationId: string;
      content: string;
      authorId: string;
      authorName: string;
      imageUri?: string;
      mentions?: string[];
    }) => {
      let imageUrl: string | undefined;

      if (messageData.imageUri) {
        try {
          const fileName = `dm-message-${Date.now()}.jpg`;
          imageUrl = await uploadToR2(messageData.imageUri, fileName);
        } catch (error) {
          console.error('Error uploading image:', error);
          throw new Error('Failed to upload image');
        }
      }

      const messageId = id();
      const now = Date.now();

      const result = await db.transact([
        db.tx.messages[messageId].update({
          content: messageData.content || '',
          authorName: messageData.authorName,
          createdAt: now,
          updatedAt: now,
          imageUrl: imageUrl,
          type: imageUrl ? 'image' : 'text',
          mentions: messageData.mentions || [],
        }).link({
          author: messageData.authorId,
          conversation: messageData.conversationId,
        }),
        // Update conversation's lastMessageAt
        db.tx.conversations[messageData.conversationId].update({
          lastMessageAt: now,
        }),
      ]);

      return result;
    },
    [db]
  );

  const markDMAsRead = useCallback(
    async (conversationId: string, profileId: string) => {
      try {
        // For now, we'll implement read status tracking later
        // This could be done with a separate readStatus entity
        console.log(`Marking conversation ${conversationId} as read for profile ${profileId}`);
      } catch (error) {
        console.error('Error marking DM as read:', error);
      }
    },
    [db]
  );

  const getDMUnreadCount = useCallback(
    async (conversationId: string, profileId: string) => {
      try {
        // Count unread messages - simplified for now
        // In a full implementation, you'd track read status per user
        const messagesQuery = await db.queryOnce({
          messages: {
            $: {
              where: {
                "conversation.id": conversationId,
                "author.id": { $ne: profileId }, // Don't count own messages
              }
            }
          }
        });

        return messagesQuery.data.messages?.length || 0;
      } catch (error) {
        console.error('Error getting DM unread count:', error);
        return 0;
      }
    },
    [db]
  );

  return {
    createOrGetDM,
    sendDMMessage,
    markDMAsRead,
    getDMUnreadCount,
  };
}