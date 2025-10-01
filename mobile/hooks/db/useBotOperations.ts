import { useCallback } from 'react';
import { id } from '@instantdb/react-native';
import { instantClient } from './instantClient';
import { getTranslation } from '../../i18n';
import { useDMOperations } from './useDMOperations';

export function useBotOperations() {
  const db = instantClient;
  const { createOrGetDM, sendDMMessage } = useDMOperations();

  // Bot constants
  const BOT_HANDLE = 'fk';

  // Bot profile and group management
  const ensureBotProfile = useCallback(async () => {
    try {
      // Check if bot profile exists by handle
      const botQuery = await db.queryOnce({
        profiles: {
          $: { where: { handle: BOT_HANDLE } }
        }
      });

      if (!botQuery.data.profiles || botQuery.data.profiles.length === 0) {
        // Create only bot profile (without user since $users is read-only)
        const botProfileId = id();

        await db.transact([
          db.tx.profiles[botProfileId].update({
            handle: BOT_HANDLE,
            displayName: 'FutKui Bot',
            createdAt: Date.now(),
            type: 'system_bot',
          })
          // Note: No user link since we can't create users in $users namespace
        ]);
        return botProfileId;
      } else {
        // Update existing bot profile to have type 'system_bot' if it doesn't have it
        const existingBot = botQuery.data.profiles[0];
        if (!existingBot.type || existingBot.type !== 'system_bot') {
          await db.transact([
            db.tx.profiles[existingBot.id].update({
              type: 'system_bot',
            })
          ]);
        }
        return existingBot.id;
      }
    } catch (error) {
      console.error('Error ensuring bot profile:', error);
      throw error;
    }
  }, [db]);

  const getBotProfile = useCallback(async () => {
    const botQuery = await db.queryOnce({
      profiles: {
        $: { where: { handle: BOT_HANDLE } }
      }
    });
    return botQuery.data.profiles?.[0] || null;
  }, [db]);

  const sendWelcomeMessage = useCallback(async (groupId: string, botProfileId: string) => {
    const welcomeMessage = getTranslation('chat.welcomeMessage');

    await db.transact([
      db.tx.messages[id()].update({
        content: welcomeMessage,
        authorName: 'FutKui Bot',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        type: 'text',
      }).link({
        group: groupId,
        author: botProfileId
      }),
    ]);
  }, [db]);

  const sendGroupWelcomeMessage = useCallback(async (groupId: string, botProfileId: string) => {
    const groupWelcomeMessage = getTranslation('chat.groupWelcomeMessage');

    await db.transact([
      db.tx.messages[id()].update({
        content: groupWelcomeMessage,
        authorName: 'FutKui Bot',
        createdAt: Date.now(),
        updatedAt: Date.now(),
        type: 'text',
      }).link({
        group: groupId,
        author: botProfileId
      }),
    ]);
  }, [db]);

  const sendConversationWelcomeMessage = useCallback(async (conversationId: string, botProfileId: string) => {
    const welcomeMessage = getTranslation('chat.welcomeMessage');

    await sendDMMessage({
      conversationId,
      content: welcomeMessage,
      authorId: botProfileId,
      authorName: 'FutKui Bot',
    });
  }, [sendDMMessage]);

  const createBotConversation = useCallback(async (userProfileId: string) => {
    try {
      // Ensure bot profile exists first and get its ID
      const botProfileId = await ensureBotProfile();

      // Create or get existing conversation between bot and user
      const conversationId = await createOrGetDM(botProfileId, userProfileId);

      // Check if this is a new conversation by checking if it has any messages
      const existingMessages = await db.queryOnce({
        messages: {
          $: {
            where: {
              "conversation.id": conversationId
            }
          }
        }
      });

      // If no messages exist, send welcome message
      if (!existingMessages.data.messages || existingMessages.data.messages.length === 0) {
        await sendConversationWelcomeMessage(conversationId, botProfileId);
      }

      return conversationId;
    } catch (error) {
      console.error('Error creating bot conversation:', error);
      throw error;
    }
  }, [db, ensureBotProfile, createOrGetDM, sendConversationWelcomeMessage]);

  const ensureUserHasBotConversation = useCallback(async (userProfileId: string) => {
    try {
      const result = await createBotConversation(userProfileId);
      return result;
    } catch (error) {
      console.error('Error in ensureUserHasBotConversation:', error);
      // Don't throw the error to prevent breaking the app
      return null;
    }
  }, [createBotConversation]);

  // Function to ensure bot is a member of an existing group
  const ensureBotInGroup = useCallback(async (groupId: string) => {
    try {
      const botProfileId = await ensureBotProfile();

      // Check if bot is already a member of this group
      const existingMembership = await db.queryOnce({
        memberships: {
          $: {
            where: {
              "group.id": groupId,
              "profile.id": botProfileId
            }
          }
        }
      });

      if (!existingMembership.data.memberships || existingMembership.data.memberships.length === 0) {
        // Bot is not a member, add them
        const botMembershipId = id();
        await db.transact([
          db.tx.memberships[botMembershipId].update({
            createdAt: Date.now(),
            role: 'member',
            profileGroupKey: `${botProfileId}_${groupId}`,
          }).link({
            group: groupId,
            profile: botProfileId
          }),
        ]);
        console.log(`Added @fk bot to group ${groupId}`);
      }
    } catch (error) {
      console.error('Error ensuring bot in group:', error);
      // Don't throw to prevent breaking the app
    }
  }, [db, ensureBotProfile]);

  return {
    ensureBotProfile,
    getBotProfile,
    sendWelcomeMessage,
    sendGroupWelcomeMessage,
    sendConversationWelcomeMessage,
    createBotConversation,
    ensureUserHasBotConversation,
    ensureBotInGroup,
    BOT_HANDLE,
  };
}