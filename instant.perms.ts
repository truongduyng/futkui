// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from "@instantdb/react-native";

const rules = {
  profiles: {
    allow: {
      view: "true",
      create: "isAuthenticated",
      update: "isOwner",
      delete: "false",
    },
    bind: ["isAuthenticated", "auth.id != null", "isOwner", "auth.id in data.ref('user.id')"]
  },
  groups: {
    allow: {
      view: "true",
      create: "isAuthenticated",
      update: "isAuthenticated",
      delete: "isAdmin",
    },
    bind: ["isAuthenticated", "auth.id != null", "isAdmin", "auth.id in data.ref('admin.id')"]
  },
  messages: {
    allow: {
      view: "true",
      create: "isAuthenticated && isGroupMember",
      update: "isAuthor || isGroupMember",
      delete: "isAuthor",
    },
    bind: [
      "isAuthenticated", "auth.id != null",
      "isAuthor", "auth.id in data.ref('author.user.id')",
      "isGroupMember", "auth.id in data.ref('group.memberships.profile.user.id')"
    ]
  },
  reactions: {
    allow: {
      view: "true",
      create: "isAuthenticated && isGroupMember",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: [
      "isAuthenticated", "auth.id != null",
      "isOwner", "auth.id in data.ref('user.user.id')",
      "isGroupMember", "auth.id in data.ref('message.group.memberships.profile.user.id')"
    ]
  },
  memberships: {
    allow: {
      view: "true",
      create: "isAuthenticated",
      update: "isOwner || isGroupAdmin",
      delete: "isOwner || isGroupAdmin",
    },
    bind: [
      "isAuthenticated", "auth.id != null",
      "isOwner", "auth.id in data.ref('profile.user.id')",
      "isGroupAdmin", "auth.id in data.ref('group.admin.user.id')"
    ]
  },
  colors: {
    allow: {
      view: "true",
      create: "isAuthenticated",
      update: "isAuthenticated",
      delete: "isAuthenticated",
    },
    bind: ["isAuthenticated", "auth.id != null"]
  },
  polls: {
    allow: {
      view: "true",
      create: "isAuthenticated && isGroupMember",
      update: "isAuthor || isGroupMember",
      delete: "isAuthor",
    },
    bind: [
      "isAuthenticated", "auth.id != null",
      "isAuthor", "auth.id in data.ref('message.author.user.id')",
      "isGroupMember", "auth.id in data.ref('message.group.memberships.profile.user.id')"
    ]
  },
  votes: {
    allow: {
      view: "true",
      create: "isAuthenticated && isGroupMember",
      update: "isVoter",
      delete: "isVoter",
    },
    bind: [
      "isAuthenticated", "auth.id != null",
      "isVoter", "auth.id in data.ref('user.user.id')",
      "isGroupMember", "auth.id in data.ref('poll.message.group.memberships.profile.user.id')"
    ]
  },
  $files: {
    allow: {
      view: "true",
      create: "isAuthenticated",
      update: "isOwner",
      delete: "isOwner",
    },
    bind: ["isAuthenticated", "auth.id != null", "isOwner", "auth.id != null && data.path.startsWith(auth.id + '/')"]
  }
} satisfies InstantRules;

export default rules;
