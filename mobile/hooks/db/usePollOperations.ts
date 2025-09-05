import { useCallback } from 'react';
import { id } from '@instantdb/react-native';
import { instantClient } from './instantClient';

export function usePollOperations() {
  const db = instantClient;

  const sendPoll = useCallback(
    async (pollData: {
      groupId: string;
      question: string;
      options: { id: string; text: string }[];
      authorId: string;
      authorName: string;
      allowMultiple: boolean;
      allowMembersToAddOptions: boolean;
      expiresAt?: number;
    }) => {
      const messageId = id();
      const pollId = id();

      const result = await db.transact([
        db.tx.messages[messageId].update({
          content: '',
          authorName: pollData.authorName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          type: 'poll',
        }).link({
          group: pollData.groupId,
          author: pollData.authorId
        }),
        db.tx.polls[pollId].update({
          question: pollData.question,
          options: pollData.options,
          createdAt: Date.now(),
          allowMultiple: pollData.allowMultiple,
          allowMembersToAddOptions: pollData.allowMembersToAddOptions,
          expiresAt: pollData.expiresAt,
        }).link({
          message: messageId,
        }),
      ]);

      return result;
    },
    [db]
  );

  const vote = useCallback(
    async (voteData: {
      pollId: string;
      optionId: string;
      userId: string;
      existingVotes: any[];
      allowMultiple: boolean;
    }) => {
      const existingVote = voteData.existingVotes.find(
        (vote: any) => vote.user?.id === voteData.userId && vote.optionId === voteData.optionId
      );

      if (existingVote) {
        // Remove vote if it already exists
        const result = await db.transact([
          db.tx.votes[existingVote.id].delete(),
        ]);
        return result;
      } else {
        // Add new vote
        let transactions = [];

        // If single choice and user has existing votes, remove them first
        if (!voteData.allowMultiple) {
          const userExistingVotes = voteData.existingVotes.filter(
            (vote: any) => vote.user?.id === voteData.userId
          );

          userExistingVotes.forEach((vote: any) => {
            transactions.push(db.tx.votes[vote.id].delete());
          });
        }

        // Add new vote
        transactions.push(
          db.tx.votes[id()].update({
            optionId: voteData.optionId,
            createdAt: Date.now(),
          }).link({
            poll: voteData.pollId,
            user: voteData.userId,
          })
        );

        const result = await db.transact(transactions);
        return result;
      }
    },
    [db]
  );

  const closePoll = useCallback(
    async (pollId: string) => {
      const result = await db.transact([
        db.tx.polls[pollId].update({
          closedAt: Date.now(),
        }),
      ]);
      return result;
    },
    [db]
  );

  const addOptionToPoll = useCallback(
    async (pollId: string, optionText: string) => {
      // First, get the current poll options
      const pollData = await db.queryOnce({
        polls: {
          $: { where: { id: pollId } },
        },
      });

      const poll = pollData.data.polls[0];
      if (!poll || !poll.allowMembersToAddOptions) {
        throw new Error('Cannot add option to this poll');
      }

      // Check if poll has expired or is closed
      if (poll.closedAt || (poll.expiresAt && poll.expiresAt < Date.now())) {
        throw new Error('Cannot add option to expired or closed poll');
      }

      // Check if we've reached the maximum options
      const currentOptions = poll.options as { id: string; text: string }[];
      if (currentOptions.length >= 6) {
        throw new Error('Maximum number of options reached');
      }

      // Generate a new option ID
      const newOptionId = id();
      const newOption = { id: newOptionId, text: optionText };
      const updatedOptions = [...currentOptions, newOption];

      const result = await db.transact([
        db.tx.polls[pollId].update({
          options: updatedOptions,
        }),
      ]);
      return result;
    },
    [db]
  );

  return {
    sendPoll,
    vote,
    closePoll,
    addOptionToPoll,
  };
}