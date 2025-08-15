// Docs: https://www.instantdb.com/docs/modeling-data

import { i } from "@instantdb/react-native";

const _schema = i.schema({
  entities: {
    $files: i.entity({
      path: i.string().unique().indexed(),
      url: i.string(),
    }),
    $users: i.entity({
      email: i.string().unique().indexed().optional(),
    }),
    profiles: i.entity({
      handle: i.string().unique().indexed(),
      displayName: i.string().optional(),
      createdAt: i.number(),
    }),
    colors: i.entity({
      value: i.string().optional(),
    }),
    groups: i.entity({
      adminId: i.string(),
      createdAt: i.number(),
      description: i.string(),
      name: i.string(),
      shareLink: i.string().unique(),
      sports: i.json().optional(), // Array of sport names: ['football', 'basketball', 'tennis']
    }),
    messages: i.entity({
      content: i.string().optional(),
      authorName: i.string(),
      createdAt: i.number(),
      updatedAt: i.number(),
      imageUrl: i.string().optional(),
      type: i.string().optional(), // 'text', 'image', 'poll'
      mentions: i.json().optional(), // Array of mentioned usernames
    }),
    polls: i.entity({
      question: i.string(),
      options: i.json(), // Array of option objects: [{id: string, text: string}]
      createdAt: i.number(),
      expiresAt: i.number().optional(),
      closedAt: i.number().optional(), // Manual close timestamp
      allowMultiple: i.boolean().optional(),
    }),
    votes: i.entity({
      optionId: i.string(),
      createdAt: i.number(),
    }),
    matches: i.entity({
      title: i.string(),
      description: i.string(),
      gameType: i.string(), // 'internal', 'external', 'friendly', etc.
      location: i.string(),
      matchDate: i.number(), // Unix timestamp
      createdAt: i.number(),
      isActive: i.boolean(), // true until match day is over
      closedAt: i.number().optional(), // Manual close timestamp
    }),
    rsvps: i.entity({
      response: i.string(), // 'yes', 'no', 'maybe'
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    checkIns: i.entity({
      checkedInAt: i.number(),
      location: i.string().optional(), // Optional location data
    }),
    reactions: i.entity({
      createdAt: i.number(),
      emoji: i.string(),
      userName: i.string(),
    }),
    memberships: i.entity({
      createdAt: i.number(),
      role: i.string().optional(), // 'member', 'admin', etc.
      profileGroupKey: i.string().unique(), // composite key for profile + group uniqueness
    }),
  },
  links: {
    userProfiles: {
      forward: { on: "profiles", has: "one", label: "user" },
      reverse: { on: "$users", has: "one", label: "profile" },
    },
    groupAdmins: {
      forward: { on: "groups", has: "one", label: "admin" },
      reverse: { on: "profiles", has: "many", label: "adminGroups" },
    },
    messageAuthors: {
      forward: { on: "messages", has: "one", label: "author", required: true },
      reverse: { on: "profiles", has: "many", label: "messages" },
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
    reactionUsers: {
      forward: { on: "reactions", has: "one", label: "user" },
      reverse: { on: "profiles", has: "many", label: "reactions" },
    },
    profileAvatars: {
      forward: { on: "profiles", has: "one", label: "avatar" },
      reverse: { on: "$files", has: "one", label: "profile" },
    },
    groupAvatars: {
      forward: { on: "groups", has: "one", label: "avatarFile" },
      reverse: { on: "$files", has: "one", label: "group" },
    },
    groupMemberships: {
      forward: { on: "groups", has: "many", label: "memberships" },
      reverse: { on: "memberships", has: "one", label: "group" },
    },
    membershipProfiles: {
      forward: { on: "memberships", has: "one", label: "profile" },
      reverse: { on: "profiles", has: "many", label: "memberships" },
    },
    pollMessages: {
      forward: { on: "polls", has: "one", label: "message" },
      reverse: { on: "messages", has: "one", label: "poll" },
    },
    pollVotes: {
      forward: { on: "polls", has: "many", label: "votes" },
      reverse: { on: "votes", has: "one", label: "poll" },
    },
    voteUsers: {
      forward: { on: "votes", has: "one", label: "user" },
      reverse: { on: "profiles", has: "many", label: "votes" },
    },
    matchGroups: {
      forward: { on: "matches", has: "one", label: "group" },
      reverse: { on: "groups", has: "many", label: "matches" },
    },
    matchCreators: {
      forward: { on: "matches", has: "one", label: "creator" },
      reverse: { on: "profiles", has: "many", label: "createdMatches" },
    },
    matchRsvps: {
      forward: { on: "matches", has: "many", label: "rsvps" },
      reverse: { on: "rsvps", has: "one", label: "match" },
    },
    rsvpUsers: {
      forward: { on: "rsvps", has: "one", label: "user" },
      reverse: { on: "profiles", has: "many", label: "rsvps" },
    },
    matchCheckIns: {
      forward: { on: "matches", has: "many", label: "checkIns" },
      reverse: { on: "checkIns", has: "one", label: "match" },
    },
    checkInUsers: {
      forward: { on: "checkIns", has: "one", label: "user" },
      reverse: { on: "profiles", has: "many", label: "checkIns" },
    },
    pollMatches: {
      forward: { on: "polls", has: "one", label: "match" },
      reverse: { on: "matches", has: "one", label: "poll" },
    },
    matchMessages: {
      forward: { on: "matches", has: "one", label: "message" },
      reverse: { on: "messages", has: "one", label: "match" },
    }
  },
  rooms: {},
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
