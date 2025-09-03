import { useCallback } from 'react';
import { id } from '@instantdb/react-native';
import { instantClient } from './instantClient';
import { uploadToR2 } from '../../utils/r2Upload';
import { sendGroupNotification, getMemberPushTokens } from '../../utils/notifications';

export function useMessageOperations() {
  const db = instantClient;

  const triggerGroupNotifications = useCallback(async (data: {
    groupId: string;
    messageContent: string;
    authorName: string;
    authorId: string;
    mentions?: string[];
    messageId: string;
    messageType?: 'text' | 'poll' | 'match';
    pollData?: {
      question: string;
      options: any[];
    };
    matchData?: {
      description: string;
    };
  }) => {
    try {
      const groupQuery = await db.queryOnce({
        groups: {
          $: { where: { id: data.groupId } },
          memberships: {
            profile: {
              user: {},
            },
          },
        },
      });

      const group = groupQuery.data.groups?.[0];
      if (!group) return;

      const memberTokens = await getMemberPushTokens(
        group.memberships || [],
        data.authorId
      );

      if (memberTokens.length === 0) return;

      await sendGroupNotification({
        groupId: data.groupId,
        groupName: group.name || 'Group Chat',
        messageContent: data.messageContent,
        authorName: data.authorName,
        authorId: data.authorId,
        mentions: data.mentions,
        messageId: data.messageId,
        messageType: data.messageType || 'text',
        pollData: data.pollData,
        matchData: data.matchData,
      }, memberTokens);

    } catch (error) {
      console.error('Error triggering group notifications:', error);
      throw error;
    }
  }, [db]);

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

      try {
        const messageType = imageUrl ? 'text' : 'text';
        await triggerGroupNotifications({
          groupId: messageData.groupId,
          messageContent: messageData.content || '[Image]',
          authorName: messageData.authorName,
          authorId: messageData.authorId,
          mentions: messageData.mentions,
          messageId: messageId,
          messageType,
        });
      } catch (error) {
        console.error('Failed to send notifications:', error);
      }

      return result;
    },
    [db, triggerGroupNotifications]
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
    triggerGroupNotifications,
  };
}
