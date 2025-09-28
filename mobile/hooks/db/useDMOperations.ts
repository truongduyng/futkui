import { useCallback } from 'react';
import { id } from '@instantdb/react-native';
import { instantClient } from './instantClient';
import { uploadToR2 } from '../../utils/r2Upload';

export function useDMOperations() {
  const db = instantClient;

  const createOrGetDM = useCallback(
    async (participant1Id: string, participant2Id: string) => {
      try {
        // Sort participant IDs alphabetically for consistent DM identification
        const sortedIds = [participant1Id, participant2Id].sort();
        const dmKey = `DM_${sortedIds[0]}_${sortedIds[1]}`;

        // Check if any messages already exist for this DM pair
        const existingMessages = await db.queryOnce({
          messages: {
            $: {
              where: {
                content: { $like: `%${dmKey}%` },
                type: 'dm_init'
              }
            },
          },
        });

        if (existingMessages.data.messages && existingMessages.data.messages.length > 0) {
          // Return the DM key as ID for consistency
          return dmKey;
        }

        // Create a DM initialization message to establish the conversation
        const messageId = id();
        await db.transact([
          db.tx.messages[messageId].update({
            content: dmKey, // Store DM key in content for identification
            authorName: 'System',
            createdAt: Date.now(),
            updatedAt: Date.now(),
            type: 'dm_init', // Special type to identify DM initialization
            mentions: [],
          }).link({
            author: sortedIds[0] // Link to first participant
          }),
        ]);

        return dmKey;
      } catch (error) {
        console.error('Error creating/getting DM:', error);
        throw error;
      }
    },
    [db]
  );

  const sendDMMessage = useCallback(
    async (messageData: {
      dmId: string;
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
      const result = await db.transact([
        db.tx.messages[messageId].update({
          content: messageData.content || '',
          authorName: messageData.authorName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          imageUrl: imageUrl,
          type: imageUrl ? 'image' : 'text',
          mentions: messageData.mentions || [],
          // Store DM key in mentions for filtering
          dmKey: messageData.dmId,
        }).link({
          author: messageData.authorId
        }),
      ]);

      return result;
    },
    [db]
  );

  const markDMAsRead = useCallback(
    async (dmId: string, profileId: string) => {
      console.log('Marking DM as read:', dmId, profileId);
      // Simple implementation - could be extended
    },
    [db]
  );

  const getDMUnreadCount = useCallback(
    async (dmId: string, profileId: string) => {
      try {
        return 0; // Simplified for now
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