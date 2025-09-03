import { useCallback } from 'react';
import { id } from '@instantdb/react-native';
import { instantClient } from './useInstantDB';
import { uploadToR2 } from '../../utils/r2Upload';

export function useDuesOperations() {
  const db = instantClient;

  const createDuesCycle = useCallback(
    async (duesData: {
      groupId: string;
      periodKey: string;
      amountPerMember: number;
      deadline: number;
      creatorId: string;
      authorName: string;
    }, triggerGroupNotifications: (data: any) => Promise<void>) => {
      const cycleId = id();
      const messageId = id();

      // First create the dues cycle and message
      const result = await db.transact([
        db.tx.duesCycles[cycleId].update({
          periodKey: duesData.periodKey,
          amountPerMember: duesData.amountPerMember,
          status: 'active',
          deadline: duesData.deadline,
          createdAt: Date.now(),
        }).link({
          group: duesData.groupId,
          creator: duesData.creatorId,
          message: messageId,
        }),
        db.tx.messages[messageId].update({
          content: '',
          authorName: duesData.authorName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          type: 'dues',
        }).link({
          group: duesData.groupId,
          author: duesData.creatorId,
        }),
      ]);

      // Trigger notifications
      try {
        await triggerGroupNotifications({
          groupId: duesData.groupId,
          messageContent: '',
          authorName: duesData.authorName,
          authorId: duesData.creatorId,
          mentions: [],
          messageId: messageId,
          messageType: 'text',
        });
      } catch (error) {
        console.error('Failed to send dues notifications:', error);
      }

      return result;
    },
    [db]
  );

  const submitDuesPayment = useCallback(
    async (paymentData: {
      cycleId: string;
      profileId: string;
      billImageUri?: string;
    }) => {
      console.log('submitDuesPayment called with:', paymentData);

      // First get the dues cycle to get the amount
      const duesCycleQuery = await db.queryOnce({
        duesCycles: {
          $: {
            where: { id: paymentData.cycleId },
          },
        },
      });

      const duesCycle = duesCycleQuery.data?.duesCycles?.[0];
      console.log('Found dues cycle:', duesCycle);
      if (!duesCycle) {
        console.error('Dues cycle not found for ID:', paymentData.cycleId);
        throw new Error('Dues cycle not found');
      }

      let billImageUrl: string | undefined;

      // Upload bill image if provided
      if (paymentData.billImageUri) {
        try {
          const fileName = `dues-bill-${Date.now()}.jpg`;
          billImageUrl = await uploadToR2(paymentData.billImageUri, fileName);
        } catch (error) {
          console.error('Error uploading bill image:', error);
          throw new Error('Failed to upload bill image');
        }
      }

      // Check if duesMembers entry exists, create or update it
      const duesMemberQuery = await db.queryOnce({
        duesMembers: {
          $: {
            where: {
              "duesCycle.id": paymentData.cycleId,
              "profile.id": paymentData.profileId,
            },
          },
        },
      });

      const existingDuesMember = duesMemberQuery.data.duesMembers?.[0];

      // Update or create duesMembers entry - mark as paid
      let result;
      if (existingDuesMember) {
        console.log('Updating existing duesMembers entry:', existingDuesMember.id);
        result = await db.transact([
          db.tx.duesMembers[existingDuesMember.id].update({
            billImageUrl: billImageUrl,
            updatedAt: Date.now(),
            status: 'pending', // Mark as pending admin approval
          })
        ]);
      } else {
        console.log('Creating new duesMembers entry for cycle:', paymentData.cycleId, 'profile:', paymentData.profileId);
        const duesMemberId = id();
        result = await db.transact([
          db.tx.duesMembers[duesMemberId].create({
            billImageUrl: billImageUrl,
            createdAt: Date.now(),
            updatedAt: Date.now(),
            status: 'pending', // Mark as pending admin approval
          }).link({
            duesCycle: paymentData.cycleId,
            profile: paymentData.profileId,
          })
        ]);
        console.log('Successfully created duesMembers entry:', duesMemberId);
      }

      return result;
    },
    [db]
  );

  const updateDuesMemberStatus = useCallback(
    async (cycleId: string, profileId: string, status: string) => {
      // Find the duesMembers entry
      const duesMemberQuery = await db.queryOnce({
        duesMembers: {
          $: {
            where: {
              "duesCycle.id": cycleId,
              "profile.id": profileId,
            },
          },
        },
      });

      const duesMember = duesMemberQuery.data.duesMembers?.[0];
      if (!duesMember) {
        throw new Error('Dues member entry not found');
      }

      // If marking as paid, create ledger entry
      if (status === 'paid') {
        // Get dues cycle info for amount
        const duesCycleQuery = await db.queryOnce({
          duesCycles: {
            $: {
              where: { id: cycleId },
            },
          },
        });

        const duesCycle = duesCycleQuery.data?.duesCycles?.[0];
        if (!duesCycle) {
          throw new Error('Dues cycle not found');
        }

        // Check if ledger entry already exists
        const profileRefKey = `${profileId}_${cycleId}`;
        const existingLedgerQuery = await db.queryOnce({
          ledgerEntries: {
            $: {
              where: {
                profileRefKey: profileRefKey,
              },
            },
          },
        });

        const existingLedgerEntry = existingLedgerQuery.data.ledgerEntries?.[0];

        if (!existingLedgerEntry) {
          // Create ledger entry
          const ledgerEntryId = id();
          await db.transact([
            db.tx.ledgerEntries[ledgerEntryId].update({
              refId: cycleId,
              amount: duesCycle.amountPerMember,
              type: 'dues_payment',
              note: 'Marked as paid by admin',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              profileRefKey: profileRefKey,
            }).link({
              profile: profileId,
            }),
          ]);
        }
      }

      const result = await db.transact([
        db.tx.duesMembers[duesMember.id].update({
          updatedAt: Date.now(),
          status: status,
        }),
      ]);

      return result;
    },
    [db]
  );

  const closeDuesCycle = useCallback(
    async (cycleId: string) => {
      const result = await db.transact([
        db.tx.duesCycles[cycleId].update({
          status: 'closed',
        }),
      ]);
      return result;
    },
    [db]
  );

  return {
    createDuesCycle,
    submitDuesPayment,
    updateDuesMemberStatus,
    closeDuesCycle,
  };
}