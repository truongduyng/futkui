import { useCallback } from 'react';
import { id } from '@instantdb/react-native';
import { instantClient } from './instantClient';
import { uploadToR2 } from '../../utils/r2Upload';

export function useMessageOperations() {
  const db = instantClient;


  const sendMessage = useCallback(
    async (messageData: {
      groupId: string;
      content: string;
      authorId: string;
      authorName: string;
      imageUri?: string;
      mentions?: string[];
    }) => {
      let imageUrl: string | undefined;

      if (messageData.imageUri) {
        try {
          const fileName = `message-${Date.now()}.jpg`;
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
          type: imageUrl ? (messageData.content ? 'image' : 'image') : 'text',
          mentions: messageData.mentions || [],
        }).link({
          group: messageData.groupId,
          author: messageData.authorId
        }),
      ]);

      return result;
    },
    [db]
  );

  const addOrUpdateReaction = useCallback(
    async (reactionData: {
      messageId: string;
      emoji: string;
      userId: string;
      userName: string;
      existingReactions: any[];
    }) => {
      const existingReaction = reactionData.existingReactions.find(
        (reaction: any) => reaction.user?.id === reactionData.userId
      );

      if (existingReaction) {
        const result = await db.transact([
          db.tx.reactions[existingReaction.id].update({
            emoji: reactionData.emoji,
            userName: reactionData.userName,
            createdAt: Date.now(),
          })
        ]);
        return result;
      } else {
        const result = await db.transact([
          db.tx.reactions[id()].update({
            emoji: reactionData.emoji,
            userName: reactionData.userName,
            createdAt: Date.now(),
          }).link({
            message: reactionData.messageId,
            user: reactionData.userId
          }),
        ]);
        return result;
      }
    },
    [db]
  );

  const removeReaction = useCallback(
    async (reactionId: string) => {
      const result = await db.transact([
        db.tx.reactions[reactionId].delete(),
      ]);

      return result;
    },
    [db]
  );

  const deleteMessage = useCallback(
    async (messageId: string) => {
      const result = await db.transact([
        db.tx.messages[messageId].update({
          content: 'message deleted',
          imageUrl: '',
          updatedAt: Date.now(),
        }),
      ]);
      return result;
    },
    [db]
  );

  const reportMessage = useCallback(
    async (reportData: {
      messageId: string;
      reason: string;
      description?: string;
      reporterId: string;
    }) => {
      const result = await db.transact([
        db.tx.reports[id()].update({
          reason: reportData.reason,
          description: reportData.description,
          type: 'message',
          targetId: reportData.messageId,
          status: 'pending',
          createdAt: Date.now(),
        }).link({
          reporter: reportData.reporterId,
          message: reportData.messageId,
        }),
      ]);
      return result;
    },
    [db]
  );

  const filterBlockedMessages = useCallback((messages: any[], blockedUserIds: string[]) => {
    if (!blockedUserIds.length) return messages;

    return messages.filter((message: any) => {
      const authorUserId = message.author?.user?.id;
      return !blockedUserIds.includes(authorUserId);
    });
  }, []);

  const getBlockedUserIds = useCallback(async (currentUserId: string): Promise<string[]> => {
    if (!currentUserId) return [];

    const blocksQuery = await db.queryOnce({
      blocks: {
        $: { where: { "blocker.user.id": currentUserId } },
        blocked: {
          user: {},
        },
      },
    });

    return blocksQuery.data.blocks?.map((block: any) => block.blocked?.user?.id).filter(Boolean) || [];
  }, [db]);

  return {
    sendMessage,
    addReaction: addOrUpdateReaction,
    removeReaction,
    deleteMessage,
    reportMessage,
    filterBlockedMessages,
    getBlockedUserIds,
  };
}
