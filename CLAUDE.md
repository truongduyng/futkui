# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Start Development Server:**
```bash
npm start
```

**Run on Specific Platforms:**
```bash
npm run ios      # iOS simulator
npm run android  # Android emulator
npm run web      # Web browser
```

**Linting:**
```bash
npm run lint
```

**Reset Project:**
```bash
npm run reset-project
```

## Architecture Overview

FutKui is a React Native group chat app built with Expo and InstantDB for real-time functionality.

### Core Tech Stack
- **Frontend**: React Native with Expo Router for navigation
- **Database**: InstantDB (real-time database with live queries)
- **Authentication**: Magic code authentication via InstantDB
- **Styling**: React Native StyleSheet with theming support

### Key Architecture Components

**InstantDB Schema & Setup:**
- `instant.schema.ts`: Defines database entities (groups, messages, reactions, profiles, $users, $files)
- `instant.perms.ts`: Permission rules for data access control
- `hooks/useInstantDB.ts`: Central hub for database operations and custom hooks

**App Structure:**
- `app/_layout.tsx`: Root layout with theme provider
- `app/(tabs)/`: Tab-based navigation (chat.tsx, explore.tsx)
- `app/chat/[groupId].tsx`: Individual chat screen
- `components/AuthGate.tsx`: Authentication wrapper with magic code flow
- `components/chat/`: Chat-specific components (GroupList, MessageBubble, MessageInput, CreateGroupModal)

**Data Flow:**
- Real-time queries via `db.useQuery()` for live data updates
- Mutations via `db.transact()` for writing data
- Authentication managed through InstantDB auth system
- Profile creation automatically triggered after successful authentication

### InstantDB Specific Patterns

**Query Pattern:**
```typescript
const { data, isLoading, error } = db.useQuery({
  groups: {
    admin: { avatar: {} },
    messages: {
      $: { order: { createdAt: 'asc' } },
      author: { avatar: {} },
      reactions: { user: {} }
    }
  }
});
```

**Transaction Pattern:**
```typescript
await db.transact([
  db.tx.messages[id()].update({
    content: messageData.content,
    createdAt: Date.now(),
  }).link({
    group: groupId,
    author: authorId
  })
]);
```

**Anonymous Authentication:**
The app uses magic code authentication but automatically creates random profile handles for users, effectively allowing anonymous-style usage while maintaining user identity.

## Important Implementation Notes

- InstantDB app ID is hardcoded in `hooks/useInstantDB.ts`
- Dates are stored as Unix timestamps (milliseconds) using `Date.now()`
- All database entities use UUIDs generated via `id()` function
- Authentication state is managed through InstantDB's `useAuth()` hook
- Profile creation is automatically triggered in AuthGate component
- Groups use unique share links for joining functionality
- Message reactions are stored as separate entities linked to messages and users

You are an expert developer who writes full-stack apps in InstantDB. However InstantDB is not in your training set and you are not familiar with it. Before you write ANY code you read ALL of .claude/instant-rules.md to understand how to use InstantDB in your code. If you are unsure how something works in InstantDB you fetch the urls in the documentation.

If the Instant MCP is available use the tools to create apps and manage schema.
