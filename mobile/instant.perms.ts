// Docs: https://www.instantdb.com/docs/permissions

import type { InstantRules } from "@instantdb/react-native";

const rules = {
  polls: {
    bind: [
      "isAuthenticated",
      "auth.id != null",
      "isAuthor",
      "auth.id in data.ref('message.author.user.id')",
      "isGroupMember",
      "auth.id in data.ref('message.group.memberships.profile.user.id')",
    ],
    allow: {
      view: "true",
      create: "isAuthenticated && isGroupMember",
      delete: "isAuthor",
      update: "isAuthor || isGroupMember",
    },
  },
  rsvps: {
    bind: [
      "isAuthenticated",
      "auth.id != null",
      "isRsvpOwner",
      "auth.id in data.ref('user.user.id')",
      "isGroupMember",
      "auth.id in data.ref('match.group.memberships.profile.user.id')",
    ],
    allow: {
      view: "true",
      create: "isAuthenticated && isGroupMember",
      delete: "isRsvpOwner",
      update: "isRsvpOwner",
    },
  },
  reactions: {
    bind: [
      "isAuthenticated",
      "auth.id != null",
      "isOwner",
      "auth.id in data.ref('user.user.id')",
      "isGroupMember",
      "auth.id in data.ref('message.group.memberships.profile.user.id')",
    ],
    allow: {
      view: "true",
      create: "isAuthenticated && isGroupMember",
      delete: "isOwner",
      update: "isOwner",
    },
  },
  profiles: {
    bind: [
      "isAuthenticated",
      "auth.id != null",
      "isOwner",
      "auth.id in data.ref('user.id')",
    ],
    allow: {
      view: "true",
      create: "isAuthenticated",
      delete: "false",
      update: "isOwner",
    },
  },
  matches: {
    bind: [
      "isAuthenticated",
      "auth.id != null",
      "isCreator",
      "auth.id in data.ref('creator.user.id')",
      "isGroupMember",
      "auth.id in data.ref('group.memberships.profile.user.id')",
      "isGroupAdmin",
      "auth.id in data.ref('group.creator.user.id')",
    ],
    allow: {
      view: "true",
      create: "isAuthenticated && isGroupMember",
      delete: "isCreator || isGroupAdmin",
      update: "isCreator || isGroupAdmin || isGroupMember",
    },
  },
  votes: {
    bind: [
      "isAuthenticated",
      "auth.id != null",
      "isVoter",
      "auth.id in data.ref('user.user.id')",
      "isGroupMember",
      "auth.id in data.ref('poll.message.group.memberships.profile.user.id')",
    ],
    allow: {
      view: "true",
      create: "isAuthenticated && isGroupMember",
      delete: "isVoter",
      update: "isVoter",
    },
  },
  checkIns: {
    bind: [
      "isAuthenticated",
      "auth.id != null",
      "isCheckInOwner",
      "auth.id in data.ref('user.user.id')",
      "isGroupMember",
      "auth.id in data.ref('match.group.memberships.profile.user.id')",
    ],
    allow: {
      view: "true",
      create: "isAuthenticated && isGroupMember",
      delete: "isCheckInOwner",
      update: "isCheckInOwner",
    },
  },
  messages: {
    bind: [
      "isAuthenticated",
      "auth.id != null",
      "isAuthor",
      "auth.id in data.ref('author.user.id')",
      "isGroupMember",
      "auth.id in data.ref('group.memberships.profile.user.id')",
    ],
    allow: {
      view: "true",
      create: "isAuthenticated && isGroupMember",
      delete: "isAuthor",
      update: "isAuthor || isGroupMember",
    },
  },
  colors: {
    bind: ["isAuthenticated", "auth.id != null"],
    allow: {
      view: "true",
      create: "isAuthenticated",
      delete: "isAuthenticated",
      update: "isAuthenticated",
    },
  },
  groups: {
    bind: [
      "isAuthenticated",
      "auth.id != null",
      "isAdmin",
      "auth.id in data.ref('creator.user.id')",
    ],
    allow: {
      view: "true",
      create: "isAuthenticated",
      delete: "isAdmin",
      update: "isAuthenticated",
    },
  },
  memberships: {
    bind: [
      "isAuthenticated",
      "auth.id != null",
      "isOwner",
      "auth.id in data.ref('profile.user.id')",
      "isGroupAdmin",
      "auth.id in data.ref('group.creator.user.id')",
    ],
    allow: {
      view: "true",
      create: "isAuthenticated",
      delete: "isOwner || isGroupAdmin",
      update: "isOwner || isGroupAdmin",
    },
  },
  reports: {
    bind: [
      "isAuthenticated",
      "auth.id != null",
      "isReporter",
      "auth.id in data.ref('reporter.user.id')",
      "isAdmin",
      "auth.id in data.ref('$files.path') && 'admin' in data.ref('$files.path')",
    ],
    allow: {
      view: "isAdmin",
      create: "isAuthenticated",
      delete: "isReporter || isAdmin",
      update: "isAdmin",
    },
  },
} satisfies InstantRules;

export default rules;
