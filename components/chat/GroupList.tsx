import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { instantClient } from '@/hooks/useInstantDB';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface Group {
  id: string;
  name: string;
  description: string;
  avatar: string;
  createdAt: number;
  shareLink: string;
  adminId: string;
  messages: {
    id: string;
    content: string;
    authorName: string;
    createdAt: number;
  }[];
}

interface GroupListProps {
  groups: Group[];
  onGroupPress: (group: Group) => void;
  onCreateGroup: () => void;
}

export function GroupList({ groups, onGroupPress, onCreateGroup }: GroupListProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  // Ensure groups is always an array
  const safeGroups = groups || [];

  const handleSignOut = () => {
    instantClient.auth.signOut();
  };

  const getLastMessage = (group: Group) => {
    if (!group.messages || group.messages.length === 0) return null;
    return group.messages[group.messages.length - 1];
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

  const renderGroup = ({ item: group }: { item: Group }) => {
    const lastMessage = getLastMessage(group);

    return (
      <TouchableOpacity
        style={[styles.groupItem, { backgroundColor: colors.background }]}
        onPress={() => onGroupPress(group)}
      >
        <View style={styles.avatarContainer}>
          <Text style={styles.avatarText}>
            {group.name.charAt(0).toUpperCase()}
          </Text>
        </View>

        <View style={styles.groupInfo}>
          <View style={styles.groupHeader}>
            <Text style={[styles.groupName, { color: colors.text }]}>
              {group.name}
            </Text>
            {lastMessage && (
              <Text style={[styles.timeText, { color: colors.tabIconDefault }]}>
                {formatTime(lastMessage.createdAt)}
              </Text>
            )}
          </View>

          <Text style={[styles.groupDescription, { color: colors.tabIconDefault }]}>
            {group.description}
          </Text>

          {lastMessage && (
            <Text style={[styles.lastMessage, { color: colors.tabIconDefault }]}>
              {lastMessage.authorName}: {lastMessage.content}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

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
        contentContainerStyle={styles.listContainer}
      />
    </View>
  );
}

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
    marginBottom: 4,
  },
  memberCount: {
    fontSize: 12,
  },
});
