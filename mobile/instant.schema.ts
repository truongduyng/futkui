// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react-native";

const _schema = i.schema({
  // We inferred 3 attributes!
  // Take a look at this schema, and if everything looks good,
  // run `push schema` again to enforce the types.
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
    }),
    checkIns: i.entity({
      checkedInAt: i.number(),
      location: i.string().optional(),
    }),
    groups: i.entity({
      avatarUrl: i.string().optional(),
      createdAt: i.number(),
      creatorId: i.string(),
      description: i.string(),
      name: i.string(),
      shareLink: i.string().unique(),
      sports: i.json().optional(),
    }),
    matches: i.entity({
      closedAt: i.number().optional(),
      createdAt: i.number(),
      description: i.string(),
      gameType: i.string(),
      isActive: i.boolean(),
      location: i.string(),
      matchDate: i.number(),
      title: i.string(),
    }),
    memberships: i.entity({
      createdAt: i.number(),
      lastReadMessageAt: i.number().optional(),
      profileGroupKey: i.string().unique(),
      role: i.string().optional(),
    }),
    messages: i.entity({
      authorName: i.string(),
      content: i.string().optional(),
      createdAt: i.number().indexed(),
      imageUrl: i.string().optional(),
      mentions: i.json().optional(),
      type: i.string().optional(),
      updatedAt: i.number(),
    }),
    polls: i.entity({
      allowMultiple: i.boolean().optional(),
      closedAt: i.number().optional(),
      createdAt: i.number(),
      expiresAt: i.number().optional(),
      options: i.json(),
      question: i.string(),
    }),
    profiles: i.entity({
      avatarUrl: i.string().optional(),
      createdAt: i.number(),
      displayName: i.string().optional(),
      handle: i.string().unique().indexed(),
      pushToken: i.string().optional(),
    }),
    reactions: i.entity({
      createdAt: i.number(),
      emoji: i.string(),
      userName: i.string(),
    }),
    rsvps: i.entity({
      createdAt: i.number(),
      response: i.string(),
      updatedAt: i.number(),
    }),
    votes: i.entity({
      createdAt: i.number(),
      optionId: i.string(),
    }),
    reports: i.entity({
      reason: i.string(),
      description: i.string().optional(),
      type: i.string(), // "message", "user", or "group"
      targetId: i.string(), // ID of the message, user, or group being reported
      status: i.string().optional(), // "pending", "reviewed", "resolved", "dismissed"
      createdAt: i.number(),
      resolvedAt: i.number().optional(),
      adminNotes: i.string().optional(),
    }),
  },
  links: {
    checkInsUser: {
      forward: {
        on: "checkIns",
        has: "one",
        label: "user",
      },
      reverse: {
        on: "profiles",
        has: "many",
        label: "checkIns",
      },
    },
    groupsCreator: {
      forward: {
        on: "groups",
        has: "one",
        label: "creator",
      },
      reverse: {
        on: "profiles",
        has: "many",
        label: "creatorGroups",
      },
    },
    groupsMemberships: {
      forward: {
        on: "groups",
        has: "many",
        label: "memberships",
      },
      reverse: {
        on: "memberships",
        has: "one",
        label: "group",
      },
    },
    groupsMessages: {
      forward: {
        on: "groups",
        has: "many",
        label: "messages",
      },
      reverse: {
        on: "messages",
        has: "one",
        label: "group",
      },
    },
    matchesCheckIns: {
      forward: {
        on: "matches",
        has: "many",
        label: "checkIns",
      },
      reverse: {
        on: "checkIns",
        has: "one",
        label: "match",
      },
    },
    matchesCreator: {
      forward: {
        on: "matches",
        has: "one",
        label: "creator",
      },
      reverse: {
        on: "profiles",
        has: "many",
        label: "createdMatches",
      },
    },
    matchesGroup: {
      forward: {
        on: "matches",
        has: "one",
        label: "group",
      },
      reverse: {
        on: "groups",
        has: "many",
        label: "matches",
      },
    },
    matchesMessage: {
      forward: {
        on: "matches",
        has: "one",
        label: "message",
      },
      reverse: {
        on: "messages",
        has: "one",
        label: "match",
      },
    },
    matchesRsvps: {
      forward: {
        on: "matches",
        has: "many",
        label: "rsvps",
      },
      reverse: {
        on: "rsvps",
        has: "one",
        label: "match",
      },
    },
    membershipsProfile: {
      forward: {
        on: "memberships",
        has: "one",
        label: "profile",
      },
      reverse: {
        on: "profiles",
        has: "many",
        label: "memberships",
      },
    },
    messagesAuthor: {
      forward: {
        on: "messages",
        has: "one",
        label: "author",
        required: true,
      },
      reverse: {
        on: "profiles",
        has: "many",
        label: "messages",
      },
    },
    messagesReactions: {
      forward: {
        on: "messages",
        has: "many",
        label: "reactions",
      },
      reverse: {
        on: "reactions",
        has: "one",
        label: "message",
      },
    },
    pollsMatch: {
      forward: {
        on: "polls",
        has: "one",
        label: "match",
      },
      reverse: {
        on: "matches",
        has: "one",
        label: "poll",
      },
    },
    pollsMessage: {
      forward: {
        on: "polls",
        has: "one",
        label: "message",
      },
      reverse: {
        on: "messages",
        has: "one",
        label: "poll",
      },
    },
    pollsVotes: {
      forward: {
        on: "polls",
        has: "many",
        label: "votes",
      },
      reverse: {
        on: "votes",
        has: "one",
        label: "poll",
      },
    },
    profilesUser: {
      forward: {
        on: "profiles",
        has: "one",
        label: "user",
      },
      reverse: {
        on: "$users",
        has: "one",
        label: "profile",
      },
    },
    reactionsUser: {
      forward: {
        on: "reactions",
        has: "one",
        label: "user",
      },
      reverse: {
        on: "profiles",
        has: "many",
        label: "reactions",
      },
    },
    rsvpsUser: {
      forward: {
        on: "rsvps",
        has: "one",
        label: "user",
      },
      reverse: {
        on: "profiles",
        has: "many",
        label: "rsvps",
      },
    },
    votesUser: {
      forward: {
        on: "votes",
        has: "one",
        label: "user",
      },
      reverse: {
        on: "profiles",
        has: "many",
        label: "votes",
      },
    },
    reportsReporter: {
      forward: {
        on: "reports",
        has: "one",
        label: "reporter",
      },
      reverse: {
        on: "profiles",
        has: "many",
        label: "reports",
      },
    },
    reportsMessage: {
      forward: {
        on: "reports",
        has: "one",
        label: "message",
      },
      reverse: {
        on: "messages",
        has: "many",
        label: "reports",
      },
    },
    reportsReportedUser: {
      forward: {
        on: "reports",
        has: "one",
        label: "reportedUser",
      },
      reverse: {
        on: "profiles",
        has: "many",
        label: "userReports",
      },
    },
    reportsReportedGroup: {
      forward: {
        on: "reports",
        has: "one",
        label: "reportedGroup",
      },
      reverse: {
        on: "groups",
        has: "many",
        label: "groupReports",
      },
    },
  },
  rooms: {},
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
