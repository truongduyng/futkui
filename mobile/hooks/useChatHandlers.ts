import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { useToast } from './useToast';

interface Profile {
  id: string;
  handle: string;
  displayName?: string;
}

interface Group {
  id: string;
  name: string;
  shareLink: string;
}

interface Match {
  id: string;
  rsvps?: any[];
}

interface UseChatHandlersProps {
  currentProfile?: Profile;
  group?: Group;
  userMembership?: { id: string };
  matches: Match[];
  sendMessage: (params: any) => Promise<any>;
  sendPoll: (params: any) => Promise<any>;
  createMatch: (params: any) => Promise<any>;
  addReaction: (params: any) => Promise<any>;
  vote: (params: any) => Promise<any>;
  closePoll: (pollId: string) => Promise<any>;
  rsvpToMatch: (params: any) => Promise<any>;
  checkInToMatch: (params: any) => Promise<any>;
  closeMatch: (matchId: string) => Promise<any>;
  leaveGroup: (membershipId: string) => Promise<any>;
  setIsNearBottom: (value: boolean) => void;
  setShowScrollToBottom: (value: boolean) => void;
  setSelectedImageUrl: (url: string | null) => void;
  handleReportMessage?: (messageId: string, reason: string, description: string) => void;
}

export function useChatHandlers({
  currentProfile,
  group,
  userMembership,
  matches,
  sendMessage,
  sendPoll,
  createMatch,
  addReaction,
  vote,
  closePoll,
  rsvpToMatch,
  checkInToMatch,
  closeMatch,
  leaveGroup,
  setIsNearBottom,
  setShowScrollToBottom,
  setSelectedImageUrl,
  handleReportMessage,
}: UseChatHandlersProps) {
  const router = useRouter();
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();

  const handleShareGroup = useCallback(async () => {
    if (group?.shareLink) {
      try {
        await Clipboard.setStringAsync(group.shareLink);
        showSuccess(t('hooks.shareGroup.copied'), t('hooks.shareGroup.copiedMessage'));
      } catch (error) {
        console.error("Copy error:", error);
        showError(t('hooks.shareGroup.errorTitle'), t('hooks.shareGroup.failedCopy'));
      }
    }
  }, [group?.shareLink, showSuccess, showError, t]);

  const handleLeaveGroup = useCallback(() => {
    Alert.alert(
      t('hooks.leaveGroup.title'),
      t('hooks.leaveGroup.confirmMessage', { groupName: group?.name }),
      [
        {
          text: t('hooks.leaveGroup.leave'),
          style: "destructive",
          onPress: async () => {
            if (!currentProfile || !group) return;

            try {
              if (userMembership) {
                await leaveGroup(userMembership.id);
                router.back();
                showSuccess(t('hooks.leaveGroup.successTitle'), t('hooks.leaveGroup.successMessage', { groupName: group.name }));
              } else {
                showError(
                  t('hooks.leaveGroup.errorTitle'),
                  t('hooks.leaveGroup.membershipNotFound'),
                );
              }
            } catch (error) {
              console.error("Leave group error:", error);
              showError(t('hooks.leaveGroup.errorTitle'), t('hooks.leaveGroup.failedToLeave'));
            }
          },
        },
        { text: t('hooks.leaveGroup.cancel'), style: "cancel" },
      ],
    );
  }, [currentProfile, group, userMembership, leaveGroup, router, showSuccess, showError, t]);

  const handleSendMessage = async (content: string, imageUri?: string, mentions?: string[]) => {
    if (!currentProfile) {
      showError(t('hooks.sendMessage.errorTitle'), t('hooks.sendMessage.waitProfile'));
      return;
    }

    try {
      await sendMessage({
        groupId: group?.id,
        content,
        authorId: currentProfile.id,
        authorName: currentProfile.handle,
        imageUri,
        mentions,
      });

      // Reset scroll state - let natural message update handle scrolling
      setIsNearBottom(true);
      setShowScrollToBottom(false);
    } catch (error) {
      showError(t('hooks.sendMessage.errorTitle'), t('hooks.sendMessage.failedSend'));
      console.error("Error sending message:", error);
    }
  };

  const handleSendPoll = async (question: string, options: { id: string; text: string }[], allowMultiple: boolean, expiresAt?: number) => {
    if (!currentProfile) {
      showError(t('hooks.sendPoll.errorTitle'), t('hooks.sendPoll.waitProfile'));
      return;
    }

    try {
      await sendPoll({
        groupId: group?.id,
        question,
        options,
        authorId: currentProfile.id,
        authorName: currentProfile.handle,
        allowMultiple,
        expiresAt,
      });

      // Reset scroll state - let natural message update handle scrolling
      setIsNearBottom(true);
      setShowScrollToBottom(false);
    } catch (error) {
      showError(t('hooks.sendPoll.errorTitle'), t('hooks.sendPoll.failedSend'));
      console.error("Error sending poll:", error);
    }
  };

  const handleCreateMatch = async (matchData: {
    title: string;
    description: string;
    gameType: string;
    location: string;
    matchDate: number;
  }) => {
    if (!currentProfile) {
      showError(t('hooks.createMatch.errorTitle'), t('hooks.createMatch.waitProfile'));
      return;
    }

    try {
      await createMatch({
        groupId: group?.id,
        title: matchData.title,
        description: matchData.description,
        gameType: matchData.gameType,
        location: matchData.location,
        matchDate: matchData.matchDate,
        creatorId: currentProfile.id,
        authorName: currentProfile.handle,
      });

      // Reset scroll state - let natural message update handle scrolling
      setIsNearBottom(true);
      setShowScrollToBottom(false);
    } catch (error) {
      showError(t('hooks.createMatch.errorTitle'), t('hooks.createMatch.failedCreate'));
      console.error("Error creating match:", error);
    }
  };

  const handleAddReaction = useCallback(async (
    messageId: string,
    emoji: string,
    existingReactions: any[],
  ) => {
    if (!currentProfile) {
      showError(t('hooks.addReaction.errorTitle'), t('hooks.addReaction.waitProfile'));
      return;
    }

    try {
      await addReaction({
        messageId,
        emoji,
        userId: currentProfile.id,
        userName: currentProfile.handle,
        existingReactions,
      });
    } catch (error) {
      showError(t('hooks.addReaction.errorTitle'), t('hooks.addReaction.failedAdd'));
      console.error("Error adding reaction:", error);
    }
  }, [currentProfile, addReaction, showError, t]);

  const handleReactionPress = useCallback((
    messageId: string,
    emoji: string,
    existingReactions: any[],
  ) => {
    handleAddReaction(messageId, emoji, existingReactions);
  }, [handleAddReaction]);

  const handleImagePress = useCallback((imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
  }, [setSelectedImageUrl]);

  const handleVote = useCallback(async (pollId: string, optionId: string, existingVotes: any[], allowMultiple: boolean) => {
    if (!currentProfile) {
      showError(t('hooks.vote.errorTitle'), t('hooks.vote.waitProfile'));
      return;
    }

    try {
      await vote({
        pollId,
        optionId,
        userId: currentProfile.id,
        existingVotes,
        allowMultiple,
      });
    } catch (error) {
      showError(t('hooks.vote.errorTitle'), t('hooks.vote.failedVote'));
      console.error("Error voting:", error);
    }
  }, [currentProfile, vote, showError, t]);

  const handleClosePoll = useCallback(async (pollId: string) => {
    if (!currentProfile) {
      showError(t('hooks.closePoll.errorTitle'), t('hooks.closePoll.waitProfile'));
      return;
    }

    Alert.alert(
      t('hooks.closePoll.title'),
      t('hooks.closePoll.confirmMessage'),
      [
        {
          text: t('hooks.closePoll.closePoll'),
          style: "destructive",
          onPress: async () => {
            try {
              await closePoll(pollId);
            } catch (error) {
              showError(t('hooks.closePoll.errorTitle'), t('hooks.closePoll.failedClose'));
              console.error("Error closing poll:", error);
            }
          },
        },
        { text: t('hooks.closePoll.cancel'), style: "cancel" },
      ]
    );
  }, [currentProfile, closePoll, showError, t]);

  const handleRsvp = useCallback(async (matchId: string, response: 'yes' | 'no' | 'maybe') => {
    if (!currentProfile) {
      showError(t('hooks.rsvp.errorTitle'), t('hooks.rsvp.waitProfile'));
      return;
    }

    try {
      const match = matches.find(m => m.id === matchId);
      await rsvpToMatch({
        matchId,
        userId: currentProfile.id,
        response,
        existingRsvps: (match as any)?.rsvps || [],
      });
    } catch (error) {
      showError(t('hooks.rsvp.errorTitle'), t('hooks.rsvp.failedRsvp'));
      console.error("Error RSVPing to match:", error);
    }
  }, [currentProfile, rsvpToMatch, matches, showError, t]);

  const handleCheckIn = useCallback(async (matchId: string) => {
    if (!currentProfile) {
      showError(t('hooks.checkIn.errorTitle'), t('hooks.checkIn.waitProfile'));
      return;
    }

    try {
      await checkInToMatch({
        matchId,
        userId: currentProfile.id,
      });
      showSuccess(t('hooks.checkIn.successTitle'), t('hooks.checkIn.successMessage'));
    } catch (error) {
      showError(t('hooks.checkIn.errorTitle'), t('hooks.checkIn.failedCheckIn'));
      console.error("Error checking in to match:", error);
    }
  }, [currentProfile, checkInToMatch, showSuccess, showError, t]);

  const handleCloseMatch = useCallback(async (matchId: string) => {
    if (!currentProfile) {
      showError(t('hooks.closeMatch.errorTitle'), t('hooks.closeMatch.waitProfile'));
      return;
    }

    Alert.alert(
      t('hooks.closeMatch.title'),
      t('hooks.closeMatch.confirmMessage'),
      [
        {
          text: t('hooks.closeMatch.closeMatch'),
          style: "destructive",
          onPress: async () => {
            try {
              await closeMatch(matchId);
            } catch (error) {
              showError(t('hooks.closeMatch.errorTitle'), t('hooks.closeMatch.failedClose'));
              console.error("Error closing match:", error);
            }
          },
        },
        { text: t('hooks.closeMatch.cancel'), style: "cancel" },
      ]
    );
  }, [currentProfile, closeMatch, showError, t]);

  return {
    handleShareGroup,
    handleLeaveGroup,
    handleSendMessage,
    handleSendPoll,
    handleCreateMatch,
    handleAddReaction,
    handleReactionPress,
    handleImagePress,
    handleVote,
    handleClosePoll,
    handleRsvp,
    handleCheckIn,
    handleCloseMatch,
    handleReportMessage,
  };
}
