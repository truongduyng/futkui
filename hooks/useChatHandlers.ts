import { useCallback } from 'react';
import { Alert } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useRouter } from 'expo-router';

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
  leaveGroup: (membershipId: string) => Promise<any>;
  setIsNearBottom: (value: boolean) => void;
  setShowScrollToBottom: (value: boolean) => void;
  setSelectedImageUrl: (url: string | null) => void;
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
  leaveGroup,
  setIsNearBottom,
  setShowScrollToBottom,
  setSelectedImageUrl,
}: UseChatHandlersProps) {
  const router = useRouter();

  const handleShareGroup = useCallback(() => {
    if (group?.shareLink) {
      Alert.alert(
        "Share Group",
        `Share this link to invite others to join "${group.name}":\n\n${group.shareLink}`,
        [
          {
            text: "Copy Link",
            onPress: async () => {
              try {
                await Clipboard.setStringAsync(group.shareLink);
                Alert.alert("Copied!", "Group link copied to clipboard");
              } catch (error) {
                console.error("Copy error:", error);
                Alert.alert("Error", "Failed to copy link to clipboard");
              }
            },
          },
          { text: "Cancel", style: "cancel" },
        ],
      );
    }
  }, [group?.shareLink, group?.name]);

  const handleLeaveGroup = useCallback(() => {
    Alert.alert(
      "Leave Group",
      `Are you sure you want to leave "${group?.name}"?`,
      [
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            if (!currentProfile || !group) return;

            try {
              if (userMembership) {
                await leaveGroup(userMembership.id);
                router.back();
                Alert.alert("Left Group", `You have left ${group.name}`);
              } else {
                Alert.alert(
                  "Error",
                  "Unable to find your membership in this group.",
                );
              }
            } catch (error) {
              console.error("Leave group error:", error);
              Alert.alert("Error", "Failed to leave group. Please try again.");
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  }, [currentProfile, group, userMembership, leaveGroup, router]);

  const handleSendMessage = async (content: string, imageUri?: string, mentions?: string[]) => {
    if (!currentProfile) {
      Alert.alert("Error", "Please wait for your profile to load.");
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
      Alert.alert("Error", "Failed to send message. Please try again.");
      console.error("Error sending message:", error);
    }
  };

  const handleSendPoll = async (question: string, options: { id: string; text: string }[], allowMultiple: boolean, expiresAt?: number) => {
    if (!currentProfile) {
      Alert.alert("Error", "Please wait for your profile to load.");
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
      Alert.alert("Error", "Failed to send poll. Please try again.");
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
      Alert.alert("Error", "Please wait for your profile to load.");
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
      });

      // Reset scroll state - let natural message update handle scrolling
      setIsNearBottom(true);
      setShowScrollToBottom(false);
    } catch (error) {
      Alert.alert("Error", "Failed to create match. Please try again.");
      console.error("Error creating match:", error);
    }
  };

  const handleAddReaction = useCallback(async (
    messageId: string,
    emoji: string,
    existingReactions: any[],
  ) => {
    if (!currentProfile) {
      Alert.alert("Error", "Please wait for your profile to load.");
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
      Alert.alert("Error", "Failed to add reaction. Please try again.");
      console.error("Error adding reaction:", error);
    }
  }, [currentProfile, addReaction]);

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
      Alert.alert("Error", "Please wait for your profile to load.");
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
      Alert.alert("Error", "Failed to vote. Please try again.");
      console.error("Error voting:", error);
    }
  }, [currentProfile, vote]);

  const handleClosePoll = useCallback(async (pollId: string) => {
    if (!currentProfile) {
      Alert.alert("Error", "Please wait for your profile to load.");
      return;
    }

    Alert.alert(
      "Close Poll",
      "Are you sure you want to close this poll? This action cannot be undone.",
      [
        {
          text: "Close Poll",
          style: "destructive",
          onPress: async () => {
            try {
              await closePoll(pollId);
            } catch (error) {
              Alert.alert("Error", "Failed to close poll. Please try again.");
              console.error("Error closing poll:", error);
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }, [currentProfile, closePoll]);

  const handleRsvp = useCallback(async (matchId: string, response: 'yes' | 'no' | 'maybe') => {
    if (!currentProfile) {
      Alert.alert("Error", "Please wait for your profile to load.");
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
      Alert.alert("Error", "Failed to RSVP. Please try again.");
      console.error("Error RSVPing to match:", error);
    }
  }, [currentProfile, rsvpToMatch, matches]);

  const handleCheckIn = useCallback(async (matchId: string) => {
    if (!currentProfile) {
      Alert.alert("Error", "Please wait for your profile to load.");
      return;
    }

    try {
      await checkInToMatch({
        matchId,
        userId: currentProfile.id,
      });
      Alert.alert("Success", "You've checked in to the match!");
    } catch (error) {
      Alert.alert("Error", "Failed to check in. Please try again.");
      console.error("Error checking in to match:", error);
    }
  }, [currentProfile, checkInToMatch]);

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
  };
}