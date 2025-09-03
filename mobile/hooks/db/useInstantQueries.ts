import { useCallback } from 'react';
import { instantClient } from './instantClient';

export function useInstantQueries() {
  const db = instantClient;

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
    const hasGroupIds = groupIds && groupIds.length > 0;

    return db.useQuery(hasGroupIds ? {
      messages: {
        $: {
          where: { "group.id": { in: groupIds } },
          order: { serverCreatedAt: 'desc' },
          limit: Math.max(100, groupIds.length * 10)
        },
        author: {},
        poll: {},
        group: {}
      },
    } : {
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
        duesCycle: {
          duesMembers: {
            profile: {
              ledgerEntries: {},
            },
          },
        },
        group: {},
      },
      ledgerEntries: {
        $: {
          where: { type: "match_expense" },
        },
        profile: {},
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
      ledgerEntries: {
        $: {
          where: { type: "match_expense" },
        },
        profile: {},
      },
    });
  };

  const useDuesCycles = (groupId: string) => {
    if (!groupId) {
      return { data: null, isLoading: false, error: null };
    }

    return db.useQuery({
      duesCycles: {
        $: {
          where: { "group.id": groupId },
          order: { serverCreatedAt: 'desc' },
        },
        creator: {},
        group: {},
        message: {},
        duesMembers: {
          profile: {},
        },
      },
    });
  };

  const useDuesMembersStatus = (cycleId: string) => {
    if (!cycleId) {
      return { data: null, isLoading: false, error: null };
    }

    return db.useQuery({
      duesMembers: {
        $: {
          where: { "duesCycle.id": cycleId },
        },
        profile: {},
        duesCycle: {},
      },
    });
  };

  const useLedgerEntries = (groupId: string) => {
    if (!groupId) {
      return { data: null, isLoading: false, error: null };
    }

    return db.useQuery({
      ledgerEntries: {
        $: {
          where: { "group.id": groupId },
          order: { serverCreatedAt: 'desc' },
        },
        profile: {},
        group: {},
      },
    });
  };

  const useBlockedUsers = () => {
    const { user } = db.useAuth();
    if (!user) {
      return { data: null, isLoading: false, error: null };
    }

    return db.useQuery({
      blocks: {
        $: { where: { "blocker.user.id": user.id } },
        blocker: {
          user: {},
        },
        blocked: {
          user: {},
        },
      },
    });
  };

  const useIsBlocked = (targetUserId: string) => {
    const { user } = db.useAuth();
    if (!user || !targetUserId) {
      return { data: null, isLoading: false, error: null };
    }

    return db.useQuery({
      blocks: {
        $: {
          where: {
            "blocker.user.id": user.id,
            "blocked.user.id": targetUserId
          }
        },
      },
    });
  };

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

  // QueryOnce versions for non-real-time scenarios
  const queryAllGroupsOnce = useCallback(async () => {
    return await db.queryOnce({
      groups: {
        $: {
          where: { "creator.handle": { $ne: 'fk' } as any },
          order: { serverCreatedAt: 'desc' },
          limit: 7
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
          limit: Math.max(100, groupIds.length * 10)
        },
        author: {},
        poll: {},
        group: {}
      },
    } : {
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

    const groupsWithReads = memberships.filter(m => m.group?.id && m.lastReadMessageAt);

    if (groupsWithReads.length === 0) {
      return { data: { messages: [] } };
    }

    const groupIds = groupsWithReads.map(m => m.group.id);

    const result = await db.queryOnce({
      messages: {
        $: {
          where: { "group.id": { in: groupIds } }
        },
        group: {}
      }
    });

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

  return {
    useGroups,
    useLastMessages,
    useAllGroups,
    useGroup,
    useMessages,
    useProfile,
    useUserMembership,
    useMatches,
    useDuesCycles,
    useDuesMembersStatus,
    useLedgerEntries,
    useBlockedUsers,
    useIsBlocked,
    useUnreadCount,
    queryAllGroupsOnce,
    queryGroupByShareLink,
    queryGroupsOnce,
    queryProfileOnce,
    queryLastMessagesOnce,
    queryUnreadCountsOnce,
  };
}
