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
      avatar: i.string(),
      createdAt: i.number(),
      description: i.string(),
      name: i.string(),
      shareLink: i.string().unique(),
    }),
    messages: i.entity({
      content: i.string(),
      authorName: i.string(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    reactions: i.entity({
      createdAt: i.number(),
      emoji: i.string(),
      userName: i.string(),
    }),
    memberships: i.entity({
      createdAt: i.number(),
      role: i.string().optional(), // 'member', 'admin', etc.
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
    groupMemberships: {
      forward: { on: "groups", has: "many", label: "memberships" },
      reverse: { on: "memberships", has: "one", label: "group" },
    },
    membershipProfiles: {
      forward: { on: "memberships", has: "one", label: "profile" },
      reverse: { on: "profiles", has: "many", label: "memberships" },
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
