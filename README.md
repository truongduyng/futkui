# FutKui - Sports Club Chat App

A real-time group chat application built with React Native, Expo, and InstantDB, designed for sports clubs and teams.

## Features

### 🗨️ Group Chat
- Create and join sports club groups
- Real-time messaging with InstantDB
- Magic code authentication (anonymous-style with random handles)
- **Image sharing** with loading indicators
- Message reactions with emojis (long-press to add)
- Group sharing via unique links
- Leave group functionality

### 📷 Rich Media Support
- **Image upload** from device gallery
- **Loading indicators** for heavy images
- **Transparent image display** (no background bubbles)
- Image preview with remove option before sending
- Support for both text and image in same message

### 👥 Group Management
- Create sports clubs with custom names, descriptions, and avatars
- View group members and membership status
- Share groups with unique deep links
- Join groups using share links
- Admin permissions and group ownership
- Member verification before joining

### 🎨 Modern UI
- Beautiful, responsive design optimized for chat
- Professional camera icon for image picker
- Smooth message scrolling with auto-scroll to new messages
- Timestamp grouping (shows time every 15 minutes)
- Message grouping by author
- Loading states and error handling
- Intuitive tab-based navigation

## Tech Stack

- **Frontend**: React Native with Expo
- **Database**: InstantDB (real-time database with live queries)
- **Navigation**: Expo Router with tab-based structure
- **Authentication**: Magic code authentication via InstantDB
- **Storage**: InstantDB file storage for images
- **Styling**: React Native StyleSheet with theming
- **Icons**: Ionicons from Expo vector icons
- **Image Handling**: Expo ImagePicker

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
│   ├── GroupList.tsx      # List of chat groups with member counts
│   ├── MessageBubble.tsx  # Individual message with images & reactions
│   ├── MessageInput.tsx   # Message input with camera icon & image preview
│   └── CreateGroupModal.tsx # Sports club creation modal
├── AuthGate.tsx           # Authentication wrapper with magic codes
└── ui/                    # Reusable UI components

hooks/
└── useInstantDB.ts        # InstantDB operations, queries & file uploads

instant.schema.ts          # Database schema with entities and links
instant.perms.ts          # Permission rules for data access
```

## Database Schema

The app uses InstantDB with the following entities:

- **groups**: Sports clubs with name, description, avatar, admin, and unique share links
- **messages**: Individual messages with content, author, timestamps, and optional imageUrl
- **reactions**: Message reactions with emoji, user, and creation time
- **memberships**: Group memberships with profile, role, and unique profileGroupKey
- **profiles**: User profiles with handle, displayName, and creation time
- **$users**: System users with email (managed by InstantDB)
- **$files**: File storage for images with path and URL (managed by InstantDB)

## Features in Detail

### Creating Sports Clubs
1. Tap the "+ New Sports Club" button on the Chat tab
2. Choose a sport-themed avatar emoji
3. Enter club name and description
4. Tap "Create" to create the sports club

### Sending Messages
1. Tap on a sports club to open the chat
2. Type your message in the input field
3. Tap the camera icon to add an image (optional)
4. Tap "Send" to send message with or without image

### Adding Images
1. Tap the camera icon in the message input
2. Select an image from your gallery
3. Preview the image with option to remove
4. Send with or without text content
5. Images display with loading indicators

### Adding Reactions
1. Long-press on any message (from other users)
2. Select an emoji from the reaction options
3. Reactions appear below messages with user counts
4. Tap reaction details to see who reacted

### Sharing Sports Clubs
1. Open a sports club chat
2. Tap the menu button (⋯) in the header
3. Select "Share Group"
4. Copy the share link to invite others

### Joining Sports Clubs
1. Go to the Explore tab to discover clubs
2. Browse available sports clubs
3. Tap "Join" on a club you want to join
4. Or enter a share link to join directly

### Managing Groups
1. **Leave Group**: Use the menu (⋯) in the chat header
2. **View Members**: See member list and their roles
3. **Admin Rights**: Group creators have admin permissions

## Development Notes

- **Authentication**: Magic code authentication with random handle generation
- **Real-time Sync**: All data synchronized instantly via InstantDB live queries
- **Image Storage**: Files stored in InstantDB storage with automatic URL resolution
- **Permissions**: Comprehensive permission system for data access control
- **Error Handling**: User-friendly alerts and loading states throughout
- **Performance**: Optimized message scrolling and image loading

## Architecture Highlights

### InstantDB Integration
- **Live Queries**: Real-time data synchronization across all clients
- **Transactional Updates**: Atomic operations for message sending and reactions
- **File Storage**: Integrated image upload and serving
- **Permission System**: Rule-based access control for all entities

### UI/UX Features
- **Auto-scroll**: Messages automatically scroll to newest content
- **Loading States**: Visual feedback for image loading and network operations
- **Message Grouping**: Smart timestamp and author grouping
- **Responsive Design**: Works across different screen sizes

## Recent Improvements

- ✅ **Image Upload & Display**: Full image sharing capability with loading indicators
- ✅ **Enhanced Permissions**: Fixed reaction permissions for group members
- ✅ **Professional Icons**: Replaced emojis with proper vector icons
- ✅ **Loading States**: Added loading indicators for heavy images
- ✅ **Message UI**: Improved bubble design and image display

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.
