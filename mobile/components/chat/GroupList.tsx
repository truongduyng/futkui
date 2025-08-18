import { Colors } from '@/constants/Colors';
import { instantClient } from '@/hooks/useInstantDB';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CachedAvatar } from './CachedAvatar';

interface Group {
  id: string;
  name: string;
  description: string;
  avatar: string;
  createdAt: number;
  shareLink: string;
  adminId: string;
  avatarFile?: {
    id: string;
    url: string;
  };
  admin?: {
    id: string;
    handle: string;
    displayName?: string;
  };
  messages: {
    id: string;
    content?: string;
    createdAt: number;
    type?: string;
    imageUrl?: string;
    author?: {
      id: string;
      handle: string;
      displayName?: string;
    };
    poll?: {
      id: string;
      question: string;
    };
  }[];
}

interface GroupListProps {
  groups: Group[];
  memberships: any[];
  unreadData?: any;
  onGroupPress: (group: Group) => void;
  onCreateGroup: () => void;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

export const GroupList = React.memo(function GroupList({ groups, memberships, unreadData, onGroupPress, onCreateGroup, onRefresh, isRefreshing = false }: GroupListProps) {
  const colors = Colors['light'];
  const router = useRouter();
  // Helper function to get unread count for a group from the provided data
  const getUnreadCount = (groupId: string, membership?: any) => {
    if (!unreadData?.messages) return 0;
    return unreadData.messages.filter((msg: any) => msg.group?.id === groupId).length;
  };

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Text style={[styles.emptyStateTitle, { color: colors.text }]}>No Groups Yet</Text>
      <Text style={[styles.emptyStateMessage, { color: colors.tabIconDefault }]}>
        Create a new group or join an existing one to start chatting!
      </Text>
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.emptyStateButton, { backgroundColor: colors.tint }]}
          onPress={onCreateGroup}
        >
          <Text style={styles.emptyStateButtonText}>Create Group</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.emptyStateButtonSecondary, { borderColor: colors.tint }]}
          onPress={() => router.push('/(tabs)/explore')}
        >
          <Text style={[styles.emptyStateButtonSecondaryText, { color: colors.tint }]}>Join Group</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Ensure groups is always an array
  const safeGroups = groups || [];

  const handleSignOut = () => {
    instantClient.auth.signOut();
  };

  const getLastMessage = (group: Group) => {
    if (!group.messages || group.messages.length === 0) return null;
    return group.messages[group.messages.length - 1];
  };

  const getMessagePreview = (message: Group['messages'][0]) => {
    // Handle poll messages
    if (message.type === 'poll' && message.poll) {
      return `📊 ${message.poll.question}`;
    }

    // Handle image messages
    if (message.type === 'image' || message.imageUrl) {
      return '📷 Image';
    }

    // Handle text messages with content
    if (message.content?.trim()) {
      const content = message.content.trim();
      return content.length > 50 ? `${content.substring(0, 50)}...` : content;
    }

    // Handle match messages (assuming they would be linked somehow)
    if (message.type === 'match') {
      return '⚽ Match created';
    }

    // Fallback for unknown message types
    return 'Message';
  };

  const formatTime = (timestamp: number) => {
    const now = new Date();
    const messageDate = new Date(timestamp);
    const diffInHours = (now.getTime() - messageDate.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return messageDate.toLocaleDateString([], { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const GroupItem = React.memo(function GroupItem({ group, membership, onPress }: { group: Group; membership?: any; onPress: (group: Group) => void }) {
    const lastMessage = getLastMessage(group);
    const isBotGroup = group.admin?.handle === 'fk';
    const unreadCount = getUnreadCount(group.id, membership);

    return (
      <TouchableOpacity
        style={[
          styles.groupItem,
          { backgroundColor: colors.background },
          isBotGroup && styles.botGroupItem
        ]}
        onPress={() => onPress(group)}
      >
        <View style={[
          styles.avatarContainer,
          isBotGroup && styles.botAvatarContainer,
          group.avatarFile?.url && !isBotGroup && styles.avatarContainerWithImage
        ]}>
          {group.avatarFile?.url && !isBotGroup ? (
            <CachedAvatar
              uri={group.avatarFile.url}
              size={50}
              fallbackComponent={
                <Text style={[
                  styles.avatarText,
                  isBotGroup && styles.botAvatarText
                ]}>
                  {group.avatar || group.name.charAt(0).toUpperCase()}
                </Text>
              }
            />
          ) : (
            <Text style={[
              styles.avatarText,
              isBotGroup && styles.botAvatarText
            ]}>
              {isBotGroup ? '🤖' : (group.avatar || group.name.charAt(0).toUpperCase())}
            </Text>
          )}
        </View>

        <View style={styles.groupInfo}>
          <View style={styles.groupHeader}>
            <View style={styles.groupNameContainer}>
              <Text style={[
                styles.groupName,
                { color: colors.text },
                isBotGroup && styles.botGroupName
              ]}>
                {group.name}
              </Text>
            </View>
            <View style={styles.headerRight}>
              {lastMessage && (
                <Text style={[styles.timeText, { color: colors.tabIconDefault }]}>
                  {formatTime(lastMessage.createdAt)}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.bottomRow}>
            {lastMessage && (
              <Text style={[
                styles.lastMessage,
                { color: colors.tabIconDefault },
                isBotGroup && styles.botLastMessage,
                unreadCount > 0 && styles.unreadMessageText
              ]}>
                {getMessagePreview(lastMessage)}
              </Text>
            )}
            {unreadCount > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>
                  {unreadCount > 99 ? '99+' : unreadCount.toString()}
                </Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  });

  const renderGroup = React.useCallback(({ item: group }: { item: Group }) => {
    const membership = memberships?.find(m => m.group?.id === group.id);
    return <GroupItem group={group} membership={membership} onPress={onGroupPress} />;
  }, [memberships, onGroupPress, GroupItem]);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Groups</Text>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.signOutButton, { borderColor: colors.tint }]}
            onPress={handleSignOut}
          >
            <Text style={[styles.signOutButtonText, { color: colors.tint }]}>Sign Out</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.createButton, { backgroundColor: colors.tint }]}
            onPress={onCreateGroup}
          >
            <Text style={styles.createButtonText}>+ New Group</Text>
          </TouchableOpacity>
        </View>
      </View>

      <FlatList
        data={safeGroups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={safeGroups.length === 0 ? styles.emptyListContainer : styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={onRefresh}
              tintColor={colors.tint}
              colors={[colors.tint]}
            />
          ) : undefined
        }
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  signOutButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  signOutButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  createButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  listContainer: {
    paddingHorizontal: 16,
  },
  emptyListContainer: {
    flex: 1,
  },
  groupItem: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  avatarContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarContainerWithImage: {
    backgroundColor: 'transparent',
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  groupInfo: {
    flex: 1,
  },
  groupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  groupNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: '600',
  },
  timeText: {
    fontSize: 12,
  },
  groupDescription: {
    fontSize: 14,
    marginBottom: 4,
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  memberCount: {
    fontSize: 12,
  },
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 64,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  buttonContainer: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  emptyStateButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    minWidth: 150,
  },
  emptyStateButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyStateButtonSecondary: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    borderWidth: 1,
    minWidth: 150,
  },
  emptyStateButtonSecondaryText: {
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Bot group specific styles
  botGroupItem: {
    borderLeftWidth: 4,
    borderLeftColor: Colors['light'].tint,
    backgroundColor: '#F0FDF4',
  },
  botAvatarContainer: {
    backgroundColor: Colors['light'].tint,
    borderWidth: 2,
    borderColor: Colors['light'].tint,
  },
  botAvatarText: {
    fontSize: 24,
  },
  botGroupName: {
    fontWeight: '700',
    color: Colors['light'].tint,
  },
  botLastMessage: {
    fontStyle: 'italic',
    color: Colors['light'].tint,
  },
  // Header right styles
  headerRight: {
    alignItems: 'flex-end',
  },
  // Bottom row with message and badge
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  // Unread badge styles
  unreadBadge: {
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  unreadBadgeText: {
    color: 'white',
    fontSize: 10,
    fontWeight: 'bold',
    paddingHorizontal: 2,
  },
  unreadMessageText: {
    fontWeight: '600',
    color: Colors['light'].text,
  },
});
