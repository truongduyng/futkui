import { useCallback } from 'react';
import { id } from '@instantdb/react-native';
import { instantClient } from './instantClient';

export function useGroupOperations() {
  const db = instantClient;

  const createGroup = useCallback(
    async (groupData: {
      name: string;
      description: string;
      avatarUrl: string;
      sports: string[];
      creatorId: string;
      rule?: string;
    }, ensureBotProfile: () => Promise<string>, sendGroupWelcomeMessage: (groupId: string, botProfileId: string) => Promise<void>) => {
      const shareLink = Math.random().toString(36).substring(2, 8).toUpperCase();
      const groupId = id();
      const membershipId = id();
      const botMembershipId = id();

      // Ensure bot profile exists and get its ID
      const botProfileId = await ensureBotProfile();

      const result = await db.transact([
        db.tx.groups[groupId].update({
          name: groupData.name,
          description: groupData.description,
          creatorId: groupData.creatorId,
          createdAt: Date.now(),
          shareLink,
          avatarUrl: groupData.avatarUrl,
          sports: groupData.sports,
          rule: groupData.rule,
        }).link({
          creator: groupData.creatorId
        }),
        db.tx.memberships[membershipId].update({
          createdAt: Date.now(),
          role: 'admin',
          profileGroupKey: `${groupData.creatorId}_${groupId}`,
        }).link({
          group: groupId,
          profile: groupData.creatorId
        }),
        // Add bot as member to every group
        db.tx.memberships[botMembershipId].update({
          createdAt: Date.now(),
          role: 'member',
          profileGroupKey: `${botProfileId}_${groupId}`,
        }).link({
          group: groupId,
          profile: botProfileId
        }),
      ]);

      // Send welcome message from bot after group creation
      try {
        await sendGroupWelcomeMessage(groupId, botProfileId);
      } catch (error) {
        console.error('Error sending group welcome message:', error);
        // Don't throw to prevent breaking group creation
      }

      return result;
    },
    [db]
  );

  const joinGroup = useCallback(
    async (groupId: string, profileId: string) => {
      const membershipId = id();
      const profileGroupKey = `${profileId}_${groupId}`;

      const result = await db.transact([
        db.tx.memberships[membershipId].update({
          createdAt: Date.now(),
          role: 'member',
          profileGroupKey,
        }).link({
          group: groupId,
          profile: profileId
        }),
      ]);

      return result;
    },
    [db]
  );

  const leaveGroup = useCallback(
    async (membershipId: string) => {
      const result = await db.transact([
        db.tx.memberships[membershipId].delete(),
      ]);
      return result;
    },
    [db]
  );

  const removeMember = useCallback(
    async (membershipId: string) => {
      const result = await db.transact([
        db.tx.memberships[membershipId].delete(),
      ]);
      return result;
    },
    [db]
  );

  const updateGroup = useCallback(
    async (groupId: string, groupData: {
      name: string;
      description: string;
      avatarUrl: string;
      sports: string[];
      rule?: string;
    }) => {
      const result = await db.transact([
        db.tx.groups[groupId].update({
          name: groupData.name,
          description: groupData.description,
          avatarUrl: groupData.avatarUrl,
          sports: groupData.sports,
          rule: groupData.rule,
        }),
      ]);
      return result;
    },
    [db]
  );

  const reportGroup = useCallback(
    async (reportData: {
      groupId: string;
      reason: string;
      description?: string;
      reporterId: string;
    }) => {
      const result = await db.transact([
        db.tx.reports[id()].update({
          reason: reportData.reason,
          description: reportData.description,
          type: 'group',
          targetId: reportData.groupId,
          status: 'pending',
          createdAt: Date.now(),
        }).link({
          reporter: reportData.reporterId,
          reportedGroup: reportData.groupId,
        }),
      ]);
      return result;
    },
    [db]
  );

  const markMessagesAsRead = useCallback(
    async (membershipId: string) => {
      const result = await db.transact([
        db.tx.memberships[membershipId].update({
          lastReadMessageAt: Date.now(),
        }),
      ]);
      return result;
    },
    [db]
  );

  return {
    createGroup,
    joinGroup,
    leaveGroup,
    removeMember,
    updateGroup,
    reportGroup,
    markMessagesAsRead,
  };
}