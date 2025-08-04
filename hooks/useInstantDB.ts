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
        admin: {
          avatar: {},
        },
        messages: {}, // No $: { order/limit } here!
      },
    });
  };

  const useGroup = (groupId: string) => {
    return db.useQuery({
      groups: {
        $: { where: { id: groupId } },
        admin: {
          avatar: {},
        },
        messages: {
          $: { order: { createdAt: 'asc' } } as any, // Get all messages in chronological order
          author: {
            avatar: {},
          },
          reactions: {
            user: {},
          },
        },
      },
    });
  };

  const useProfile = () => {
    const { user } = db.useAuth();
    if (!user) {
      throw new Error("useProfile must be used after auth");
    }

    return db.useQuery({
      profiles: {
        $: { where: { "user.id": user.id } },
        avatar: {},
      }
    });
  };

  // Utility function to generate random handle
  const generateHandle = () => {
    const adjectives = ['Quick', 'Lazy', 'Happy', 'Sad', 'Bright', 'Dark', 'Swift', 'Calm'];
    const nouns = ['Fox', 'Dog', 'Cat', 'Bird', 'Fish', 'Mouse', 'Wolf', 'Bear'];
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomSuffix = Math.floor(Math.random() * 9000) + 1000;
    return `${randomAdjective}${randomNoun}${randomSuffix}`;
  };

  // Profile management
  const createProfile = useCallback(async (userId: string) => {
    await db.transact(
      db.tx.profiles[id()].update({
        handle: generateHandle(),
        createdAt: Date.now(),
      }).link({ user: userId })
    );
  }, [db]);

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
        }).link({ admin: groupData.adminId }),
      ]);

      return result;
    },
    [db]
  );

  const sendMessage = useCallback(
    async (messageData: {
      groupId: string;
      content: string;
      authorId: string;
      authorName: string;
    }) => {
      const result = await db.transact([
        db.tx.messages[id()].update({
          content: messageData.content,
          authorName: messageData.authorName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }).link({
          group: messageData.groupId,
          author: messageData.authorId
        }),
      ]);

      return result;
    },
    [db]
  );

  const addReaction = useCallback(
    async (reactionData: {
      messageId: string;
      emoji: string;
      userId: string;
    }) => {
      const result = await db.transact([
        db.tx.reactions[id()].update({
          emoji: reactionData.emoji,
          createdAt: Date.now(),
        }).link({
          message: reactionData.messageId,
          user: reactionData.userId
        }),
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
    useProfile,
    createProfile,
    createGroup,
    sendMessage,
    addReaction,
    removeReaction,
  };
}
