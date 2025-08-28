import { id, init } from '@instantdb/react-native';
import { useCallback } from 'react';
import schema from '../instant.schema';
import { sendGroupNotification, getMemberPushTokens } from '../utils/notifications';
import { uploadToR2 } from '../utils/r2Upload';
import { getTranslation } from '../i18n';

const instantClient = init({
  appId: process.env.EXPO_PUBLIC_INSTANT_APP_ID || 'default-app-id',
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
            creator: {},
            messages: {},
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
        author: {},
        poll: {},
        group: {}
      },
    } : {
      // Empty query that returns no results but still calls the hook
      messages: {
        $: {
          where: { id: "__nonexistent__" },
        }
      }
    });
  };

  const useAllGroups = () => {
    return db.useQuery({
      groups: {
        creator: {},
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
        creator: {},
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
        author: {},
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
    });
  };

  const useProfile = () => {
    const { user } = db.useAuth();
    if (!user) {
      throw new Error("useProfile must be used after auth");
    }

    return db.useQuery({
      profiles: {
        $: { where: { "user.id": user.id } }
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

  // Notification helper function
  const triggerGroupNotifications = useCallback(async (data: {
    groupId: string;
    messageContent: string;
    authorName: string;
    authorId: string;
    mentions?: string[];
    messageId: string;
    messageType?: 'text' | 'poll' | 'match';
    pollData?: {
      question: string;
      options: any[];
    };
    matchData?: {
      description: string;
    };
  }) => {
    try {
      // Get group details and members
      const groupQuery = await db.queryOnce({
        groups: {
          $: { where: { id: data.groupId } },
          memberships: {
            profile: {
              user: {},
            },
          },
        },
      });

      const group = groupQuery.data.groups?.[0];
      if (!group) return;

      // Get push tokens for all members except the message author
      const memberTokens = await getMemberPushTokens(
        group.memberships || [],
        data.authorId
      );

      if (memberTokens.length === 0) return;

      // Send notifications
      await sendGroupNotification({
        groupId: data.groupId,
        groupName: group.name || 'Group Chat',
        messageContent: data.messageContent,
        authorName: data.authorName,
        authorId: data.authorId,
        mentions: data.mentions,
        messageId: data.messageId,
        messageType: data.messageType || 'text',
        pollData: data.pollData,
        matchData: data.matchData,
      }, memberTokens);

    } catch (error) {
      console.error('Error triggering group notifications:', error);
      throw error;
    }
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

  // Profile management functions are now handled in ProfileSetup component

  // Mutation functions
  const createGroup = useCallback(
    async (groupData: {
      name: string;
      description: string;
      avatarUrl: string;
      sports: string[];
      creatorId: string;
    }) => {
      const shareLink = `futkui-chat://group/${Math.random().toString(36).substring(2, 15)}`;
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

      return result;
    },
    [db, ensureBotProfile]
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
          const fileName = `message-${Date.now()}.jpg`;
          imageUrl = await uploadToR2(messageData.imageUri, fileName);
        } catch (error) {
          console.error('Error uploading image:', error);
          throw new Error('Failed to upload image');
        }
      }

      const messageId = id();
      const result = await db.transact([
        db.tx.messages[messageId].update({
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

      // Trigger notifications after successful message send
      try {
        const messageType = imageUrl ? 'text' : 'text'; // Both text and image messages use 'text' type for notifications
        await triggerGroupNotifications({
          groupId: messageData.groupId,
          messageContent: messageData.content || '[Image]',
          authorName: messageData.authorName,
          authorId: messageData.authorId,
          mentions: messageData.mentions,
          messageId: messageId,
          messageType,
        });
      } catch (error) {
        console.error('Failed to send notifications:', error);
        // Don't throw error for notifications as message was already sent successfully
      }

      return result;
    },
    [db, triggerGroupNotifications]
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

  const removeMember = useCallback(
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

      // Trigger notifications after successful poll creation
      try {
        await triggerGroupNotifications({
          groupId: pollData.groupId,
          messageContent: '', // Will be generated by notification system
          authorName: pollData.authorName,
          authorId: pollData.authorId,
          mentions: [],
          messageId: messageId,
          messageType: 'poll',
          pollData: {
            question: pollData.question,
            options: pollData.options,
          },
        });
      } catch (error) {
        console.error('Failed to send poll notifications:', error);
        // Don't throw error for notifications as poll was already created successfully
      }

      return result;
    },
    [db, triggerGroupNotifications]
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

      // Trigger notifications after successful match creation
      try {
        await triggerGroupNotifications({
          groupId: matchData.groupId,
          messageContent: '', // Will be generated by notification system
          authorName: matchData.authorName,
          authorId: matchData.creatorId,
          mentions: [],
          messageId: messageId,
          messageType: 'match',
          matchData: {
            description: matchData.description,
          },
        });
      } catch (error) {
        console.error('Failed to send match notifications:', error);
        // Don't throw error for notifications as match was already created successfully
      }

      return result;
    },
    [db, triggerGroupNotifications]
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

  const updateGroup = useCallback(
    async (groupId: string, groupData: {
      name: string;
      description: string;
      avatarUrl: string;
      sports: string[];
    }) => {
      const result = await db.transact([
        db.tx.groups[groupId].update({
          name: groupData.name,
          description: groupData.description,
          avatarUrl: groupData.avatarUrl,
          sports: groupData.sports,
        }),
      ]);
      return result;
    },
    [db]
  );

  const reportMessage = useCallback(
    async (reportData: {
      messageId: string;
      reason: string;
      description?: string;
      reporterId: string;
    }) => {
      const result = await db.transact([
        db.tx.reports[id()].update({
          reason: reportData.reason,
          description: reportData.description,
          type: 'message',
          targetId: reportData.messageId,
          status: 'pending',
          createdAt: Date.now(),
        }).link({
          reporter: reportData.reporterId,
          message: reportData.messageId,
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

  const useUnreadCount = (groupId: string, lastReadMessageAt: number | undefined) => {
    if (!groupId) {
      return { data: { messages: [] }, isLoading: false, error: null };
    }

    return db.useQuery({
      messages: {
        $: {
          where: lastReadMessageAt ? {
            "group.id": groupId,
            createdAt: { $gt: lastReadMessageAt }
          } : {
            "group.id": groupId
          }
        }
      }
    });
  };

  // QueryOnce versions for non-real-time scenarios (like explore screen)
  const queryAllGroupsOnce = useCallback(async () => {
    return await db.queryOnce({
      groups: {
        $: {
          order: { serverCreatedAt: 'desc' },
          limit: 10
        },
        creator: {},
        memberships: {
          profile: {
            user: {},
          },
        },
      },
    });
  }, [db]);

  const queryGroupByShareLink = useCallback(async (shareLink: string) => {
    if (!shareLink) {
      return { data: { groups: [] } };
    }

    return await db.queryOnce({
      groups: {
        $: { where: { shareLink: shareLink } },
        creator: {},
        memberships: {
          profile: {
            user: {},
          },
        },
      },
    });
  }, [db]);

  const queryGroupsOnce = useCallback(async (userId: string) => {
    if (!userId) {
      return { data: null };
    }

    return await db.queryOnce({
      profiles: {
        $: { where: { "user.id": userId } },
        memberships: {
          group: {
            creator: {},
            messages: {},
          },
        },
      },
    });
  }, [db]);

  const queryProfileOnce = useCallback(async (userId: string) => {
    if (!userId) {
      throw new Error("queryProfileOnce must be used after auth");
    }

    return await db.queryOnce({
      profiles: {
        $: { where: { "user.id": userId } }
      }
    });
  }, [db]);

  const queryLastMessagesOnce = useCallback(async (groupIds: string[]) => {
    const hasGroupIds = groupIds && groupIds.length > 0;

    return await db.queryOnce(hasGroupIds ? {
      messages: {
        $: {
          where: { "group.id": { in: groupIds } },
          order: { serverCreatedAt: 'desc' },
          limit: Math.max(100, groupIds.length * 10) // Ensure we get enough messages to cover all groups
        },
        author: {},
        poll: {},
        group: {}
      },
    } : {
      // Empty query that returns no results
      messages: {
        $: {
          where: { id: "__nonexistent__" },
          limit: 0
        }
      }
    });
  }, [db]);

  const queryUnreadCountsOnce = useCallback(async (memberships: any[]) => {
    if (!memberships || memberships.length === 0) {
      return { data: { messages: [] } };
    }

    // Get group IDs that have last read timestamps
    const groupsWithReads = memberships.filter(m => m.group?.id && m.lastReadMessageAt);

    if (groupsWithReads.length === 0) {
      return { data: { messages: [] } };
    }

    // Get all group IDs
    const groupIds = groupsWithReads.map(m => m.group.id);

    // Query all messages for these groups
    const result = await db.queryOnce({
      messages: {
        $: {
          where: { "group.id": { in: groupIds } }
        },
        group: {}
      }
    });

    // Filter messages on the client side based on lastReadMessageAt
    if (result?.data?.messages) {
      const membershipsMap = new Map(
        groupsWithReads.map(m => [m.group.id, m.lastReadMessageAt])
      );

      const unreadMessages = result.data.messages.filter((msg: any) => {
        const lastReadAt = membershipsMap.get(msg.group?.id);
        return lastReadAt && msg.createdAt > lastReadAt;
      });

      return {
        data: {
          messages: unreadMessages
        }
      };
    }

    return { data: { messages: [] } };
  }, [db]);


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
    useUnreadCount,
    queryAllGroupsOnce,
    queryGroupByShareLink,
    queryGroupsOnce,
    queryProfileOnce,
    queryLastMessagesOnce,
    queryUnreadCountsOnce,
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
    removeMember,
    ensureUserHasBotGroup,
    ensureBotInGroup,
    getBotProfile,
    markMessagesAsRead,
    updatePushToken,
    updateGroup,
    reportMessage,
    reportUser,
  };
}
