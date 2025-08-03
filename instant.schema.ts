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
      authorName: i.string(),
      content: i.string(),
      createdAt: i.number(),
      updatedAt: i.number(),
    }),
    reactions: i.entity({
      createdAt: i.number(),
      emoji: i.string(),
      userName: i.string(),
    }),
  },
  links: {
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
  },
  rooms: {},
});

// This helps Typescript display nicer intellisense
type _AppSchema = typeof _schema;
interface AppSchema extends _AppSchema {}
const schema: AppSchema = _schema;

export type { AppSchema };
export default schema;
