import { useCallback } from 'react';
import { id } from '@instantdb/react-native';
import { instantClient } from './instantClient';
import { getTranslation } from '../../i18n';

export function useBotOperations() {
  const db = instantClient;

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
          })
          // Note: No user link since we can't create users in $users namespace
        ]);
        return botProfileId;
      } else {
        return botQuery.data.profiles[0].id;
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

  const createBotGroup = useCallback(async (userProfileId: string) => {
    try {
      // Ensure bot profile exists first and get its ID
      const botProfileId = await ensureBotProfile();

      // Check if user already has a bot group
      const existingBotGroup = await db.queryOnce({
        memberships: {
          $: {
            where: {
              "profile.id": userProfileId,
              "group.creator.handle": BOT_HANDLE
            }
          },
          group: {
            creator: {}
          }
        }
      });

      if (existingBotGroup.data.memberships && existingBotGroup.data.memberships.length > 0) {
        // User already has a bot group, return the existing group ID
        return existingBotGroup.data.memberships[0].group?.id;
      }

      const groupId = id();
      const membershipId = id();
      const botMembershipId = id();
      const shareLink = `futkui-chat://group/${Math.random().toString(36).substring(2, 15)}`;

      // Create group with bot as admin and add user as member
      await db.transact([
        // Create the group
        db.tx.groups[groupId].update({
          name: getTranslation('bot.groupName'),
          description: getTranslation('bot.groupDescription'),
          avatarUrl: 'https://futkui.com/public/images/logo-fk.jpg',
          creatorId: botProfileId,
          createdAt: Date.now(),
          shareLink,
        }).link({ creator: botProfileId }),

        // Add bot as admin member
        db.tx.memberships[botMembershipId].update({
          createdAt: Date.now(),
          role: 'admin',
          profileGroupKey: `${botProfileId}_${groupId}`,
        }).link({
          group: groupId,
          profile: botProfileId
        }),

        // Add user as member
        db.tx.memberships[membershipId].update({
          createdAt: Date.now(),
          role: 'member',
          profileGroupKey: `${userProfileId}_${groupId}`,
        }).link({
          group: groupId,
          profile: userProfileId
        }),
      ]);

      // Send welcome message from bot
      await sendWelcomeMessage(groupId, botProfileId);

      return groupId;
    } catch (error) {
      console.error('Error creating bot group:', error);
      throw error;
    }
  }, [db, ensureBotProfile, sendWelcomeMessage]);

  const ensureUserHasBotGroup = useCallback(async (userProfileId: string) => {
    try {
      const result = await createBotGroup(userProfileId);
      return result;
    } catch (error) {
      console.error('Error in ensureUserHasBotGroup:', error);
      // Don't throw the error to prevent breaking the app
      return null;
    }
  }, [createBotGroup]);

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
    createBotGroup,
    ensureUserHasBotGroup,
    ensureBotInGroup,
    BOT_HANDLE,
  };
}