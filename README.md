# FutKui - Group Chat App

A real-time group chat application built with React Native, Expo, and InstantDB.

## Features

### 🗨️ Group Chat
- Create and join chat groups
- Real-time messaging with InstantDB
- Anonymous chat (no authentication required for testing)
- Message reactions with emojis
- Group sharing via links

### 👥 Group Management
- Create groups with custom names, descriptions, and avatars
- View group members and activity
- Share groups with unique links
- Join groups using share links

### 🎨 Modern UI
- Beautiful, responsive design
- Dark and light mode support
- Smooth animations and haptic feedback
- Intuitive navigation

## Tech Stack

- **Frontend**: React Native with Expo
- **Database**: InstantDB (real-time database)
- **Navigation**: Expo Router
- **Styling**: React Native StyleSheet with theming
- **Icons**: Expo Symbols

## Getting Started

### Prerequisites
- Node.js (v18 or higher)
- Expo CLI
- iOS Simulator or Android Emulator (optional)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd futkui
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Run on your preferred platform:
```bash
# iOS
npm run ios

# Android
npm run android

# Web
npm run web
```

## App Structure

```
app/
├── (tabs)/
│   ├── index.tsx          # Main chat groups screen
│   ├── explore.tsx        # Group discovery and sharing
│   └── _layout.tsx        # Tab navigation
├── chat/
│   └── [groupId].tsx      # Individual chat screen
└── _layout.tsx            # Root layout with InstantDB provider

components/
├── chat/
│   ├── GroupList.tsx      # List of chat groups
│   ├── MessageBubble.tsx  # Individual message component
│   ├── MessageInput.tsx   # Message input with reactions
│   └── CreateGroupModal.tsx # Group creation modal
└── ui/                    # Reusable UI components

hooks/
└── useInstantDB.ts        # InstantDB operations and queries

lib/
└── instantdb.ts           # InstantDB configuration
```

## Database Schema

The app uses InstantDB with the following entities:

- **groups**: Chat groups with name, description, avatar, and share links
- **messages**: Individual messages with content, author, and timestamps
- **reactions**: Message reactions with emoji and user information
- **$users**: System users (managed by InstantDB)

## Features in Detail

### Creating Groups
1. Tap the "+ New Group" button on the Chats tab
2. Choose an avatar emoji
3. Enter group name and description
4. Tap "Create" to create the group

### Sending Messages
1. Tap on a group to open the chat
2. Type your message in the input field
3. Tap "Send" or press Enter

### Adding Reactions
1. Tap the emoji button in the message input
2. Select an emoji to add as a reaction
3. Reactions appear below messages with counts

### Sharing Groups
1. Go to the Explore tab
2. Tap on any group to see sharing options
3. Copy the share link to invite others

### Joining Groups
1. Go to the Explore tab
2. Enter a group share link in the input field
3. Tap "Join" to join the group

## Development Notes

- The app uses anonymous users for testing (random names assigned)
- All data is stored in InstantDB with real-time synchronization
- The UI adapts to light/dark mode automatically
- Error handling includes user-friendly alerts

## Future Enhancements

- User authentication and profiles
- Image and file sharing
- Push notifications
- Message editing and deletion
- Group admin features
- Message search functionality
- Voice messages
- Video calls integration

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
