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
    const { user } = db.useAuth();
    if (!user) {
      return { data: null, isLoading: false, error: null };
    }

    return db.useQuery({
      profiles: {
        $: { where: { "user.id": user.id } },
        memberships: {
          group: {
            admin: {
              avatar: {},
            },
            avatarFile: {},
          },
        },
      },
    });
  };

  const useLastMessages = (groupIds: string[]) => {
    // Always call the hook but with conditional query parameters
    const hasGroupIds = groupIds && groupIds.length > 0;

    return db.useQuery(hasGroupIds ? {
      messages: {
        $: {
          where: { "group.id": { in: groupIds } },
          order: { serverCreatedAt: 'desc' },
          limit: Math.max(100, groupIds.length * 10) // Ensure we get enough messages to cover all groups
        },
        author: {
          avatar: {},
        },
        poll: {},
        group: {}
      },
    } : {
      // Empty query that returns no results but still calls the hook
      messages: {
        $: {
          where: { id: "__nonexistent__" },
          limit: 0
        }
      }
    });
  };

  const useAllGroups = () => {
    return db.useQuery({
      groups: {
        admin: {
          avatar: {},
        },
        memberships: {
          profile: {
            user: {},
          },
        },
      },
    });
  };

  const useGroup = (groupId: string) => {
    if (!groupId) {
      return { data: null, isLoading: false, error: null };
    }

    return db.useQuery({
      groups: {
        $: { where: { id: groupId } },
        admin: {
          avatar: {},
        },
        memberships: {
          profile: {},
        },
      },
    });
  };

  const useMessages = (groupId: string, limit = 30) => {
    if (!groupId) {
      return { data: null, isLoading: false, error: null };
    }

    return db.useQuery({
      messages: {
        $: {
          where: { "group.id": groupId },
          order: { serverCreatedAt: 'desc' },
          limit: limit,
        },
        author: {
          avatar: {},
        },
        reactions: {
          user: {},
        },
        poll: {
          votes: {
            user: {},
          },
        },
        match: {
          rsvps: {
            user: {},
          },
          checkIns: {
            user: {},
          },
          creator: {},
        },
        group: {},
      },
      $files: {},
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

  const useUserMembership = (groupId: string) => {
    const { user } = db.useAuth();
    if (!user || !groupId) {
      return { data: null, isLoading: false, error: null };
    }

    return db.useQuery({
      memberships: {
        $: { where: { "group.id": groupId, "profile.user.id": user.id } },
        profile: { user: {} },
        group: {},
      }
    });
  };

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
    const welcomeMessage = `👋 Welcome to FutKui!

I'm your personal assistant here to help you with:
• 📅 Match notifications and reminders
• ⚽ Team updates and announcements
• 🔔 Important app notifications
• 💬 Quick support when you need it

Feel free to message me anytime if you have questions or need help with the app!`;

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
              "group.admin.handle": BOT_HANDLE
            }
          },
          group: {
            admin: {}
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
          name: 'FutKui',
          description: 'Your personal FutKui assistant for notifications and updates',
          avatar: '🤖',
          adminId: botProfileId,
          createdAt: Date.now(),
          shareLink,
        }).link({ admin: botProfileId }),

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

  // Profile management functions are now handled in ProfileSetup component

  // Mutation functions
  const createGroup = useCallback(
    async (groupData: {
      name: string;
      description: string;
      avatarFileId: string;
      sports: string[];
      adminId: string;
    }) => {
      const shareLink = `futkui-chat://group/${Math.random().toString(36).substring(2, 15)}`;
      const groupId = id();
      const membershipId = id();

      const result = await db.transact([
        db.tx.groups[groupId].update({
          name: groupData.name,
          description: groupData.description,
          adminId: groupData.adminId,
          createdAt: Date.now(),
          shareLink,
        }).link({ 
          admin: groupData.adminId
        }),
        db.tx.memberships[membershipId].update({
          createdAt: Date.now(),
          role: 'admin',
          profileGroupKey: `${groupData.adminId}_${groupId}`,
        }).link({
          group: groupId,
          profile: groupData.adminId
        }),
      ]);

      // Update sports and avatar in separate transactions
      const updates = [];
      
      if (groupData.sports && groupData.sports.length > 0) {
        updates.push(
          db.tx.groups[groupId].update({
            sports: groupData.sports,
          })
        );
      }
      
      // Link avatar file
      updates.push(
        db.tx.groups[groupId].link({
          avatarFile: groupData.avatarFileId
        })
      );
      
      if (updates.length > 0) {
        await db.transact(updates);
      }

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
      imageUri?: string;
      mentions?: string[];
    }) => {
      let imageUrl: string | undefined;

      // Upload image if provided
      if (messageData.imageUri) {
        try {
          const response = await fetch(messageData.imageUri);
          const blob = await response.blob();
          const fileName = `message-${Date.now()}.jpg`;

          const uploadResult = await db.storage.uploadFile(fileName, blob);
          // For now, store the file ID and handle URL resolution in the component
          // TODO: Find a better way to get the download URL immediately after upload
          imageUrl = uploadResult.data.id;
        } catch (error) {
          console.error('Error uploading image:', error);
          throw new Error('Failed to upload image');
        }
      }

      const result = await db.transact([
        db.tx.messages[id()].update({
          content: messageData.content || '', // Allow empty content for image-only messages
          authorName: messageData.authorName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          imageUrl: imageUrl,
          type: imageUrl ? (messageData.content ? 'image' : 'image') : 'text',
          mentions: messageData.mentions || [],
        }).link({
          group: messageData.groupId,
          author: messageData.authorId
        }),
      ]);

      return result;
    },
    [db]
  );

  const addOrUpdateReaction = useCallback(
    async (reactionData: {
      messageId: string;
      emoji: string;
      userId: string;
      userName: string;
      existingReactions: any[];
    }) => {
      // Find existing reaction by this user on this message
      const existingReaction = reactionData.existingReactions.find(
        (reaction: any) => reaction.user?.id === reactionData.userId
      );

      if (existingReaction) {
        // Update existing reaction
        const result = await db.transact([
          db.tx.reactions[existingReaction.id].update({
            emoji: reactionData.emoji,
            userName: reactionData.userName,
            createdAt: Date.now(),
          })
        ]);
        return result;
      } else {
        // Create new reaction
        const result = await db.transact([
          db.tx.reactions[id()].update({
            emoji: reactionData.emoji,
            userName: reactionData.userName,
            createdAt: Date.now(),
          }).link({
            message: reactionData.messageId,
            user: reactionData.userId
          }),
        ]);
        return result;
      }
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

  const sendPoll = useCallback(
    async (pollData: {
      groupId: string;
      question: string;
      options: { id: string; text: string }[];
      authorId: string;
      authorName: string;
      allowMultiple: boolean;
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

  // Match operations
  const createMatch = useCallback(
    async (matchData: {
      groupId: string;
      title: string;
      description: string;
      gameType: string;
      location: string;
      matchDate: number;
      creatorId: string;
      authorName: string;
    }) => {
      const matchId = id();
      const messageId = id();

      const result = await db.transact([
        db.tx.matches[matchId].update({
          title: matchData.title,
          description: matchData.description,
          gameType: matchData.gameType,
          location: matchData.location,
          matchDate: matchData.matchDate,
          createdAt: Date.now(),
          isActive: true,
        }).link({
          group: matchData.groupId,
          creator: matchData.creatorId,
          message: messageId,
        }),
        db.tx.messages[messageId].update({
          content: ``,
          authorName: matchData.authorName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          type: 'match',
        }).link({
          group: matchData.groupId,
          author: matchData.creatorId,
        }),
      ]);

      return result;
    },
    [db]
  );


  const rsvpToMatch = useCallback(
    async (rsvpData: {
      matchId: string;
      userId: string;
      response: 'yes' | 'no' | 'maybe';
      existingRsvps: any[];
    }) => {
      const existingRsvp = rsvpData.existingRsvps.find(
        (rsvp: any) => rsvp.user?.id === rsvpData.userId
      );

      if (existingRsvp) {
        // Update existing RSVP
        const result = await db.transact([
          db.tx.rsvps[existingRsvp.id].update({
            response: rsvpData.response,
            updatedAt: Date.now(),
          }),
        ]);
        return result;
      } else {
        // Create new RSVP
        const result = await db.transact([
          db.tx.rsvps[id()].update({
            response: rsvpData.response,
            createdAt: Date.now(),
            updatedAt: Date.now(),
          }).link({
            match: rsvpData.matchId,
            user: rsvpData.userId,
          }),
        ]);
        return result;
      }
    },
    [db]
  );

  const checkInToMatch = useCallback(
    async (checkInData: {
      matchId: string;
      userId: string;
    }) => {
      const result = await db.transact([
        db.tx.checkIns[id()].update({
          checkedInAt: Date.now(),
        }).link({
          match: checkInData.matchId,
          user: checkInData.userId,
        }),
      ]);

      return result;
    },
    [db]
  );

  const closeMatch = useCallback(
    async (matchId: string) => {
      const result = await db.transact([
        db.tx.matches[matchId].update({
          closedAt: Date.now(),
          isActive: false,
        }),
      ]);
      return result;
    },
    [db]
  );

  const useMatches = (groupId: string) => {
    if (!groupId) {
      return { data: null, isLoading: false, error: null };
    }

    return db.useQuery({
      matches: {
        $: {
          where: { "group.id": groupId },
        },
        creator: {},
        rsvps: {
          user: {},
        },
        checkIns: {
          user: {},
        },
      },
    });
  };

  return {
    instantClient,
    useGroups,
    useLastMessages,
    useAllGroups,
    useGroup,
    useMessages,
    useMatches,
    useProfile,
    useUserMembership,
    createGroup,
    sendMessage,
    sendPoll,
    vote,
    closePoll,
    createMatch,
    rsvpToMatch,
    checkInToMatch,
    closeMatch,
    addReaction: addOrUpdateReaction,
    removeReaction,
    joinGroup,
    leaveGroup,
    ensureUserHasBotGroup,
    getBotProfile,
  };
}
