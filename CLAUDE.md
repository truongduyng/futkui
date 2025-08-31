# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Mobile App (React Native):**
```bash
cd mobile
npm start        # Start development server
npm run ios      # iOS simulator
npm run android  # Android emulator
npm run web      # Web browser
npm run lint     # Linting
npm run reset-project  # Reset project
```

**Backend/Landing Page (Fastify):**
```bash
cd be_landing
npm start        # Production server (fastify start -l info app.js)
npm run dev      # Development server with auto-reload
npm test         # Run tests (node --test test/**/*.test.js)
npm run build-css  # Build CSS with watch mode
npm run build-css-prod  # Build CSS for production
```

**Build Commands:**
```bash
# Mobile builds
cd mobile
npm run build-android  # Local Android build (requires EAS CLI)
npm run build-ios      # Local iOS build (requires EAS CLI)

# No specific build command for backend - uses npm start for production
```

## Architecture Overview

FutKui is a React Native group chat app built with Expo and InstantDB for real-time functionality, with a Fastify backend for the web landing page.

### Core Tech Stack
- **Mobile Frontend**: React Native with Expo Router for navigation
- **Backend/Landing**: Fastify (Node.js web framework) for server-side functionality and web landing page
- **Database**: InstantDB (real-time database with live queries)
- **Authentication**: Magic code authentication via InstantDB
- **Styling**: React Native StyleSheet with theming support

### Key Architecture Components

**InstantDB Schema & Setup:**
- `mobile/instant.schema.ts`: Defines database entities (groups, messages, reactions, profiles, $users, $files, checkIns, matches, polls, votes, reports, blocks, memberships)
- `mobile/hooks/useInstantDB.ts`: Central hub for database operations and custom hooks
- InstantDB app uses magic code authentication with random profile handles for anonymous-style usage
- All entities use UUIDs generated via `id()` function from InstantDB

**Mobile App Structure:**
- `mobile/app/_layout.tsx`: Root layout with theme provider and authentication
- `mobile/app/(tabs)/`: Tab-based navigation with index.tsx (chat) and explore.tsx
- `mobile/app/chat/[groupId].tsx`: Individual chat screen with real-time messaging
- `mobile/app/chat/[groupId]/profile.tsx`: Group profile and settings screen
- `mobile/app/activity/[groupId].tsx`: Activity screen for matches and polls
- `mobile/components/AuthGate.tsx`: Authentication wrapper with magic code flow
- `mobile/components/chat/`: Chat-specific components (GroupList, MessageBubble, MessageInput, CreateGroupModal, etc.)
- `mobile/components/ui/`: Reusable UI components (IconSymbol, TabBarBackground)
- `mobile/contexts/`: React contexts for theme, group refresh, and unread counts
- `mobile/hooks/`: Custom hooks including the main `useInstantDB.ts`
- `mobile/i18n/`: Internationalization setup with English and Vietnamese locales

**Backend/Landing Structure:**
- `be_landing/app.js`: Main Fastify application entry point
- `be_landing/routes/`: API routes and handlers
- `be_landing/plugins/`: Fastify plugins for shared functionality
- `be_landing/test/`: Test files for backend functionality

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

### Environment & Configuration
- InstantDB app ID is configured via `EXPO_PUBLIC_INSTANT_APP_ID` environment variable in `mobile/hooks/useInstantDB.ts`
- Backend uses dotenv for environment variables

### Data & Database Patterns  
- Dates are stored as Unix timestamps (milliseconds) using `Date.now()`
- All database entities use UUIDs generated via `id()` function from InstantDB
- Groups use unique share links (`futkui-chat://group/[randomString]`) for joining functionality
- Message reactions are stored as separate entities linked to messages and users
- Unique keys like `profileGroupKey` and `blockerProfileKey` ensure data integrity

### Authentication & Users
- Authentication state is managed through InstantDB's `useAuth()` hook
- Magic code authentication with random profile handles (e.g., "QuickFox1234")
- Profile creation is automatically triggered in AuthGate component after successful authentication
- Bot functionality is built-in with handle `fk` - automatically added to all groups

### Features & Content
- Image uploads use R2 storage via `mobile/utils/r2Upload.ts`
- Push notifications are handled via `mobile/utils/notifications.ts`
- The app supports polls, matches/activities, check-ins, and RSVPs as special message types
- User blocking functionality with filtered message display
- Content reporting system for messages, users, and groups
- Internationalization (i18n) supports English and Vietnamese languages

### Development & Testing
- Backend uses Node.js built-in test runner (`node --test test/**/*.test.js`)
- Mobile app uses Expo CLI for linting and development
- No specific test runner configured for mobile app yet

## InstantDB Development Guidelines

**CRITICAL:** Before writing ANY InstantDB code, you MUST read `.claude/instant-rules.md` to understand how to use InstantDB properly.

Key InstantDB patterns used in this project:
- Always use `db.useQuery()` for real-time data subscriptions
- Use `db.queryOnce()` for one-time queries (like in explore screen)
- Use `db.transact()` for all database mutations
- All query hooks must be called unconditionally (use conditional query parameters instead)
- Use `id()` from InstantDB for generating UUIDs
- Link entities using `.link()` method in transactions
- Filter queries using `where` clauses with supported operators: `$ne`, `$gt`, `$lt`, `$gte`, `$lte`, `$in`, `$like`, `$ilike`, `$isNull`
- Use dot notation for nested field queries: `"relation.field": value`

If the Instant MCP tools are available, use them for schema management and app creation.
