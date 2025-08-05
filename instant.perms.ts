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
    bind: ["isAuthenticated", "auth.id != null", "isOwner", "auth.id == data.id"]
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
      create: "isAuthenticated",
      update: "isAuthenticated",
      delete: "isAuthor",
    },
    bind: ["isAuthenticated", "auth.id != null", "isAuthor", "auth.id in data.ref('author.id')"]
  },
  reactions: {
    allow: {
      view: "true",
      create: "isAuthenticated",
      update: "isAuthenticated",
      delete: "isOwner",
    },
    bind: [
      "isAuthenticated", "auth.id != null", 
      "isOwner", "auth.id in data.ref('user.user.id')"
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
