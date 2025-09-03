import { useCallback } from 'react';
import { id } from '@instantdb/react-native';
import { instantClient } from './useInstantDB';

export function useUserOperations() {
  const db = instantClient;

  const updatePushToken = useCallback(
    async (profileId: string, pushToken: string) => {
      const result = await db.transact([
        db.tx.profiles[profileId].update({
          pushToken: pushToken,
        }),
      ]);
      return result;
    },
    [db]
  );

  const reportUser = useCallback(
    async (reportData: {
      userId: string;
      reason: string;
      description?: string;
      reporterId: string;
    }) => {
      const result = await db.transact([
        db.tx.reports[id()].update({
          reason: reportData.reason,
          description: reportData.description,
          type: 'user',
          targetId: reportData.userId,
          status: 'pending',
          createdAt: Date.now(),
        }).link({
          reporter: reportData.reporterId,
          reportedUser: reportData.userId,
        }),
      ]);
      return result;
    },
    [db]
  );

  const blockUser = useCallback(
    async (blockedProfileId: string, currentUserId: string) => {
      if (!currentUserId) throw new Error("User not authenticated");

      // Get current user's profile
      const currentUserProfile = await db.queryOnce({
        profiles: {
          $: { where: { "user.id": currentUserId } }
        }
      });

      if (!currentUserProfile.data.profiles?.[0]) {
        throw new Error("Current user profile not found");
      }

      const currentProfileId = currentUserProfile.data.profiles[0].id;
      const blockerProfileKey = `${currentProfileId}_${blockedProfileId}`;

      const result = await db.transact([
        db.tx.blocks[id()].update({
          createdAt: Date.now(),
          blockerProfileKey,
        }).link({
          blocker: currentProfileId,
          blocked: blockedProfileId
        }),
      ]);

      return result;
    },
    [db]
  );

  const unblockUser = useCallback(
    async (blockedProfileId: string, currentUserId: string) => {
      if (!currentUserId) throw new Error("User not authenticated");

      // Get current user's profile ID first
      const currentUserProfile = await db.queryOnce({
        profiles: {
          $: { where: { "user.id": currentUserId } }
        }
      });

      if (!currentUserProfile.data.profiles?.[0]) {
        throw new Error("Current user profile not found");
      }

      const currentProfileId = currentUserProfile.data.profiles[0].id;
      const blockerProfileKey = `${currentProfileId}_${blockedProfileId}`;

      // Find the block relationship using the unique blockerProfileKey
      const blockQuery = await db.queryOnce({
        blocks: {
          $: {
            where: {
              blockerProfileKey: blockerProfileKey
            }
          }
        }
      });

      const blockToRemove = blockQuery.data.blocks?.[0];
      if (!blockToRemove) {
        throw new Error("Block relationship not found");
      }

      const result = await db.transact([
        db.tx.blocks[blockToRemove.id].delete(),
      ]);

      return result;
    },
    [db]
  );

  return {
    updatePushToken,
    reportUser,
    blockUser,
    unblockUser,
  };
}