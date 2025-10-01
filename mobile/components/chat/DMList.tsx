import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CachedAvatar } from './CachedAvatar';

interface DMParticipant {
  id: string;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
}

interface DM {
  id: string;
  participantKey: string;
  createdAt: number;
  lastMessageAt?: number;
  participant1?: DMParticipant;
  participant2?: DMParticipant;
  messages: {
    id: string;
    content?: string;
    createdAt: number;
    type?: string;
    imageUrl?: string;
    author?: DMParticipant;
  }[];
}

interface DMListProps {
  dms: DM[];
  currentUserId: string;
  unreadCounts?: { [dmId: string]: number };
  onDMPress: (dm: DM) => void;
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
}

export function DMList({
  dms,
  currentUserId,
  unreadCounts = {},
  onDMPress,
  onRefresh,
  isRefreshing = false
}: DMListProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const getOtherParticipant = React.useCallback((dm: DM) => {
    // Return the participant that is not the current user
    if (dm.participant1?.id === currentUserId) {
      return dm.participant2;
    } else {
      return dm.participant1;
    }
  }, [currentUserId]);

  const getLastMessage = React.useCallback((dm: DM) => {
    if (!dm.messages || dm.messages.length === 0) return null;
    return dm.messages[dm.messages.length - 1];
  }, []);

  const getMessagePreview = React.useCallback((message: DM['messages'][0]) => {
    // Handle image messages
    if (message.type === 'image' || message.imageUrl) {
      return `📷 ${t('messagePreview.image')}`;
    }

    // Handle text messages with content
    if (message.content?.trim()) {
      const content = message.content.trim();
      return content.length > 50 ? `${content.substring(0, 50)}...` : content;
    }

    // Fallback for unknown message types
    return t('messagePreview.message');
  }, [t]);

  const formatTime = React.useCallback((timestamp: number) => {
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
  }, []);

  const renderEmptyState = () => (
    <View style={styles.emptyStateContainer}>
      <Ionicons name="chatbubbles-outline" size={64} color={colors.tabIconDefault} />
      <Text style={[styles.emptyStateTitle, { color: colors.text }]}>
        {t('dm.noDMs')}
      </Text>
      <Text style={[styles.emptyStateMessage, { color: colors.tabIconDefault }]}>
        {t('dm.startDMPrompt')}
      </Text>
    </View>
  );

  const DMItem = React.memo(function DMItem({ dm, onPress }: { dm: DM; onPress: (dm: DM) => void }) {
    const otherParticipant = getOtherParticipant(dm);
    const lastMessage = getLastMessage(dm);
    const unreadCount = unreadCounts[dm.id] || 0;

    const handlePress = React.useCallback(() => {
      onPress(dm);
    }, [onPress, dm]);

    if (!otherParticipant) {
      return null;
    }

    return (
      <TouchableOpacity
        style={[styles.dmItem, { backgroundColor: colors.card }]}
        onPress={handlePress}
      >
        <View style={styles.avatarContainer}>
          {otherParticipant.avatarUrl ? (
            <CachedAvatar
              uri={otherParticipant.avatarUrl}
              size={50}
              fallbackComponent={
                <Text style={styles.avatarText}>
                  {(otherParticipant.displayName || otherParticipant.handle).charAt(0).toUpperCase()}
                </Text>
              }
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { backgroundColor: colors.tint }]}>
              <Text style={styles.avatarText}>
                {(otherParticipant.displayName || otherParticipant.handle).charAt(0).toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.dmInfo}>
          <View style={styles.dmHeader}>
            <View style={styles.dmNameContainer}>
              <Text style={[styles.dmName, { color: colors.text }]}>
                {otherParticipant.displayName || otherParticipant.handle}
              </Text>
              <Text style={[styles.dmHandle, { color: colors.tabIconDefault }]}>
                @{otherParticipant.handle}
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
              <Text
                style={[
                  styles.lastMessage,
                  { color: colors.tabIconDefault },
                  unreadCount > 0 && { fontWeight: '600', color: colors.text }
                ]}
                numberOfLines={1}
              >
                {getMessagePreview(lastMessage)}
              </Text>
            )}
            {unreadCount > 0 && (
              <View style={[styles.unreadBadge, { backgroundColor: colors.tint }]}>
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

  const renderDM = React.useCallback(({ item: dm }: { item: DM }) => {
    return <DMItem dm={dm} onPress={onDMPress} />;
  }, [onDMPress, DMItem]);

  // Ensure dms is always an array
  const safeDMs = dms || [];

  return (
    <View style={styles.container}>
      <FlatList
        data={safeDMs}
        renderItem={renderDM}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={safeDMs.length === 0 ? styles.emptyListContainer : styles.listContainer}
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
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 100, // Add bottom padding to prevent tab bar overlap
  },
  emptyListContainer: {
    flex: 1,
  },
  dmItem: {
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
    marginRight: 12,
    overflow: 'hidden',
  },
  avatarPlaceholder: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
  },
  dmInfo: {
    flex: 1,
  },
  dmHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  dmNameContainer: {
    flex: 1,
    marginRight: 8,
  },
  dmName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  dmHandle: {
    fontSize: 13,
  },
  timeText: {
    fontSize: 12,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  lastMessage: {
    fontSize: 14,
    flex: 1,
  },
  unreadBadge: {
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
    marginTop: 16,
    textAlign: 'center',
  },
  emptyStateMessage: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
});
