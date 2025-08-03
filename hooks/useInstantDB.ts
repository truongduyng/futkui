import { id, init } from '@instantdb/react-native';
import { useCallback } from 'react';
import schema from '../instant.schema';

const instantClient = init({
  appId: 'fef46afc-feff-4b78-be85-3c293174c5cc',
  schema,
});

export { instantClient };

export function useInstantDB() {
  const db = instantClient;

  // Query hooks
  const useGroups = () => {
    return db.useQuery({
      groups: {
        messages: {}, // No $: { order/limit } here!
      },
    });
  };

  const useGroup = (groupId: string) => {
    return db.useQuery({
      groups: {
        $: { where: { id: groupId } },
        messages: {
          $: { order: { createdAt: 'asc' } } as any, // Get all messages in chronological order
          reactions: {},
        },
      },
    });
  };

  // Mutation functions
  const createGroup = useCallback(
    async (groupData: {
      name: string;
      description: string;
      avatar: string;
      adminId: string;
    }) => {
      const shareLink = `futkui-chat://group/${Math.random().toString(36).substring(2, 15)}`;

      const result = await db.transact([
        db.tx.groups[id()].update({
          name: groupData.name,
          description: groupData.description,
          avatar: groupData.avatar,
          createdAt: Date.now(),
          shareLink,
          adminId: groupData.adminId,
        }),
      ]);

      return result;
    },
    [db]
  );

  const sendMessage = useCallback(
    async (messageData: {
      groupId: string;
      content: string;
      authorName: string;
    }) => {
      const result = await db.transact([
        db.tx.messages[id()].update({
          content: messageData.content,
          authorName: messageData.authorName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }).link({ group: messageData.groupId }),
      ]);

      return result;
    },
    [db]
  );

  const addReaction = useCallback(
    async (reactionData: {
      messageId: string;
      emoji: string;
      userName: string;
    }) => {
      const result = await db.transact([
        db.tx.reactions[id()].update({
          emoji: reactionData.emoji,
          userName: reactionData.userName,
          createdAt: Date.now(),
        }).link({ message: reactionData.messageId }),
      ]);

      return result;
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

  return {
    instantClient,
    useGroups,
    useGroup,
    createGroup,
    sendMessage,
    addReaction,
    removeReaction,
  };
}
