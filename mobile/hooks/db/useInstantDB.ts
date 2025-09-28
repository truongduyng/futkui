import { instantClient } from './instantClient';
import { useInstantQueries } from './useInstantQueries';
import { useMessageOperations } from './useMessageOperations';
import { useGroupOperations } from './useGroupOperations';
import { usePollOperations } from './usePollOperations';
import { useMatchOperations } from './useMatchOperations';
import { useDuesOperations } from './useDuesOperations';
import { useUserOperations } from './useUserOperations';
import { useBotOperations } from './useBotOperations';
import { useDMOperations } from './useDMOperations';

export { instantClient };

export function useInstantDB() {
  // Import all modular hooks
  const queries = useInstantQueries();
  const botOps = useBotOperations();
  const messageOps = useMessageOperations();
  const userOps = useUserOperations();
  const dmOps = useDMOperations();

  // Group operations need bot operations
  const groupOps = useGroupOperations();

  // Poll, Match, and Dues operations need message notifications
  const pollOps = usePollOperations();
  const matchOps = useMatchOperations();
  const duesOps = useDuesOperations();

  return {
    instantClient,

    // Query hooks from useInstantQueries
    useGroups: queries.useGroups,
    useLastMessages: queries.useLastMessages,
    useAllGroups: queries.useAllGroups,
    useGroup: queries.useGroup,
    useMessages: queries.useMessages,
    useMatches: queries.useMatches,
    useDuesCycles: queries.useDuesCycles,
    useDuesMembersStatus: queries.useDuesMembersStatus,
    useLedgerEntries: queries.useLedgerEntries,
    useProfile: queries.useProfile,
    useUserMembership: queries.useUserMembership,
    useUnreadCount: queries.useUnreadCount,
    useBlockedUsers: queries.useBlockedUsers,
    useIsBlocked: queries.useIsBlocked,
    useDMs: queries.useDMs,
    useDMMessages: queries.useDMMessages,
    useDMUnreadCounts: queries.useDMUnreadCounts,

    // Query once functions
    queryAllGroupsOnce: queries.queryAllGroupsOnce,
    queryGroupByShareLink: queries.queryGroupByShareLink,
    queryGroupsOnce: queries.queryGroupsOnce,
    queryProfileOnce: queries.queryProfileOnce,
    queryLastMessagesOnce: queries.queryLastMessagesOnce,
    queryUnreadCountsOnce: queries.queryUnreadCountsOnce,

    // Message operations
    sendMessage: messageOps.sendMessage,
    addReaction: messageOps.addReaction,
    removeReaction: messageOps.removeReaction,
    deleteMessage: messageOps.deleteMessage,
    reportMessage: messageOps.reportMessage,
    filterBlockedMessages: messageOps.filterBlockedMessages,
    getBlockedUserIds: messageOps.getBlockedUserIds,

    // Group operations
    createGroup: (groupData: {
      name: string;
      description: string;
      avatarUrl: string;
      sports: string[];
      creatorId: string;
      rule?: string;
    }) => groupOps.createGroup(groupData, botOps.ensureBotProfile, botOps.sendGroupWelcomeMessage),
    joinGroup: groupOps.joinGroup,
    leaveGroup: groupOps.leaveGroup,
    removeMember: groupOps.removeMember,
    updateGroup: groupOps.updateGroup,
    reportGroup: groupOps.reportGroup,
    markMessagesAsRead: groupOps.markMessagesAsRead,

    // Poll operations
    sendPoll: (pollData: {
      groupId: string;
      question: string;
      options: { id: string; text: string }[];
      authorId: string;
      authorName: string;
      allowMultiple: boolean;
      allowMembersToAddOptions: boolean;
      expiresAt?: number;
    }) => pollOps.sendPoll(pollData),
    vote: pollOps.vote,
    closePoll: pollOps.closePoll,
    addOptionToPoll: pollOps.addOptionToPoll,

    // Match operations
    createMatch: (matchData: {
      groupId: string;
      title: string;
      description: string;
      gameType: string;
      location: string;
      matchDate: number;
      creatorId: string;
      authorName: string;
    }) => matchOps.createMatch(matchData),
    rsvpToMatch: matchOps.rsvpToMatch,
    checkInToMatch: matchOps.checkInToMatch,
    unCheckInFromMatch: matchOps.unCheckInFromMatch,
    closeMatch: matchOps.closeMatch,
    addExpense: matchOps.addExpense,
    editExpense: matchOps.editExpense,

    // Dues operations
    createDuesCycle: (duesData: {
      groupId: string;
      periodKey: string;
      amountPerMember: number;
      deadline: number;
      creatorId: string;
      authorName: string;
    }) => duesOps.createDuesCycle(duesData),
    submitDuesPayment: duesOps.submitDuesPayment,
    updateDuesMemberStatus: duesOps.updateDuesMemberStatus,
    closeDuesCycle: duesOps.closeDuesCycle,

    // Bot operations
    ensureUserHasBotGroup: botOps.ensureUserHasBotGroup,
    ensureBotInGroup: botOps.ensureBotInGroup,
    getBotProfile: botOps.getBotProfile,

    // User operations
    updatePushToken: userOps.updatePushToken,
    reportUser: userOps.reportUser,
    blockUser: userOps.blockUser,
    unblockUser: userOps.unblockUser,

    // DM operations
    createOrGetDM: dmOps.createOrGetDM,
    sendDMMessage: dmOps.sendDMMessage,
    markDMAsRead: dmOps.markDMAsRead,
    getDMUnreadCount: dmOps.getDMUnreadCount,
  };
}
