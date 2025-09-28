import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { FlatList, RefreshControl, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { CachedAvatar } from './CachedAvatar';

interface Group {
  id: string;
  name: string;
  description: string;
  avatar: string;
  createdAt: number;
  shareLink: string;
  creatorId: string;
  avatarUrl?: string;
  creator?: {
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
  onRefresh?: () => Promise<void>;
  isRefreshing?: boolean;
  // Join club functionality
  shareLink?: string;
  onShareLinkChange?: (link: string) => void;
  onJoinViaLink?: () => void;
  isJoining?: boolean;
}

export function GroupList({
  groups,
  memberships,
  unreadData,
  onGroupPress,
  onRefresh,
  isRefreshing = false,
  shareLink,
  onShareLinkChange,
  onJoinViaLink,
  isJoining = false
}: GroupListProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  // Check if user only has bot groups
  const nonBotGroups = React.useMemo(() =>
    (groups || []).filter(group => group.creator?.handle !== 'fk'),
    [groups]
  );
  const hasOnlyBotGroups = nonBotGroups.length === 0 && (groups || []).length > 0;

  // Helper function to get unread count for a group from the provided data
  const getUnreadCount = React.useCallback((groupId: string) => {
    if (!unreadData?.messages) return 0;
    return unreadData.messages.filter((msg: any) => msg.group?.id === groupId).length;
  }, [unreadData]);

  const renderEmptyState = () => (
    <View style={hasOnlyBotGroups ? styles.botOnlyFooterContainer : styles.emptyStateContainer}>
      <Text style={[styles.emptyStateTitle, { color: colors.text }]}>{t('empty.noGroupsYet')}</Text>
      <Text style={[styles.emptyStateMessage, { color: colors.tabIconDefault }]}>
        {t('empty.createOrJoin')}
      </Text>
    </View>
  );

  // Ensure groups is always an array
  const safeGroups = groups || [];

  const getLastMessage = React.useCallback((group: Group) => {
    if (!group.messages || group.messages.length === 0) return null;
    return group.messages[group.messages.length - 1];
  }, []);

  const getMessagePreview = React.useCallback((message: Group['messages'][0]) => {
    // Handle poll messages
    if (message.type === 'poll' && message.poll) {
      return `📊 ${message.poll.question}`;
    }

    // Handle image messages
    if (message.type === 'image' || message.imageUrl) {
      return `📷 ${t('messagePreview.image')}`;
    }

    // Handle text messages with content
    if (message.content?.trim()) {
      const content = message.content.trim();
      return content.length > 50 ? `${content.substring(0, 50)}...` : content;
    }

    // Handle match messages (assuming they would be linked somehow)
    if (message.type === 'match') {
      return `⚽ ${t('messagePreview.match')}`;
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

  const GroupItem = React.useCallback(function GroupItem({ group, onPress }: { group: Group; onPress: (group: Group) => void }) {
    const lastMessage = getLastMessage(group);
    const isBotGroup = group.creator?.handle === 'fk';
    const unreadCount = getUnreadCount(group.id);

    // Configuration object to reduce if/else statements
    const groupConfig = React.useMemo(() => {
      const currentColors = isDark ? Colors.dark : Colors.light;

      if (isBotGroup) {
        return {
          itemStyles: [styles.groupItem, { backgroundColor: currentColors.card, borderLeftWidth: 4, borderLeftColor: currentColors.tint }],
          avatarStyles: [styles.avatarContainer, { backgroundColor: currentColors.tint, borderWidth: 2, borderColor: currentColors.tint }],
          avatarTextStyles: [styles.avatarText, { fontSize: 24 }],
          nameStyles: [styles.groupName, { color: currentColors.tint, fontWeight: '700' as const }],
          messageStyles: [styles.lastMessage, { color: currentColors.tint, fontStyle: 'italic' as const }, unreadCount > 0 && { fontWeight: '600' as const, color: currentColors.text }].filter(Boolean),
          avatarContent: group.avatarUrl,
          showImage: !!group.avatarUrl
        };
      }

      return {
        itemStyles: [styles.groupItem, { backgroundColor: currentColors.card }],
        avatarStyles: [styles.avatarContainer, group.avatarUrl && styles.avatarContainerWithImage],
        avatarTextStyles: [styles.avatarText],
        nameStyles: [styles.groupName, { color: currentColors.text }],
        messageStyles: [styles.lastMessage, { color: currentColors.tabIconDefault }, unreadCount > 0 && { fontWeight: '600' as const, color: currentColors.text }].filter(Boolean),
        avatarContent: group.avatar || group.name.charAt(0).toUpperCase(),
        showImage: !!group.avatarUrl
      };
    }, [isBotGroup, group.avatar, group.name, group.avatarUrl, unreadCount]);

    return (
      <TouchableOpacity
        style={groupConfig.itemStyles}
        onPress={() => onPress(group)}
      >
        <View style={groupConfig.avatarStyles}>
          {groupConfig.showImage ? (
            <CachedAvatar
              uri={group.avatarUrl!}
              size={50}
              fallbackComponent={
                <Text style={groupConfig.avatarTextStyles}>
                  {group.name.charAt(0).toUpperCase()}
                </Text>
              }
            />
          ) : (
            <Text style={groupConfig.avatarTextStyles}>
              {groupConfig.avatarContent}
            </Text>
          )}
        </View>

        <View style={styles.groupInfo}>
          <View style={styles.groupHeader}>
            <View style={styles.groupNameContainer}>
              <Text style={groupConfig.nameStyles}>
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
              <Text style={groupConfig.messageStyles}>
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
  }, [getLastMessage, getUnreadCount, colors.tabIconDefault, formatTime, getMessagePreview, isDark]);

  const renderGroup = React.useCallback(({ item: group }: { item: Group }) => {
    return <GroupItem group={group} onPress={onGroupPress} />;
  }, [onGroupPress, GroupItem]);

  return (
    <View style={styles.container}>

      {onJoinViaLink && onShareLinkChange && (
        <View style={styles.joinSection}>
          <View style={styles.joinContainer}>
            <View style={[
              styles.inputContainer,
              {
                backgroundColor: colors.card,
                borderColor: shareLink ? colors.tint : colors.tabIconDefault,
              }
            ]}>
              <Ionicons
                name="link-outline"
                size={18}
                color={shareLink ? colors.tint : colors.tabIconDefault}
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  styles.joinInput,
                  {
                    color: colors.text,
                  },
                ]}
                value={shareLink || ''}
                onChangeText={onShareLinkChange}
                placeholder={t('input.enterClubLink')}
                placeholderTextColor={colors.tabIconDefault}
                editable={!isJoining}
              />
              {shareLink && !isJoining && (
                <TouchableOpacity
                  onPress={() => onShareLinkChange('')}
                  style={styles.clearButton}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={colors.tabIconDefault}
                  />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              style={[
                styles.joinButton,
                {
                  backgroundColor: isJoining ? colors.tabIconDefault : colors.tint,
                  opacity: (!shareLink?.trim() || isJoining) ? 0.6 : 1
                }
              ]}
              onPress={onJoinViaLink}
              disabled={!shareLink?.trim() || isJoining}
              activeOpacity={0.8}
            >
              {isJoining ? (
                <Ionicons name="hourglass-outline" size={16} color="white" />
              ) : (
                <>
                  <Ionicons name="enter-outline" size={16} color="white" style={styles.buttonIcon} />
                  <Text style={styles.joinButtonText}>{t('common.join')}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={safeGroups}
        renderItem={renderGroup}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={safeGroups.length === 0 ? styles.emptyListContainer : styles.listContainer}
        ListEmptyComponent={renderEmptyState}
        ListFooterComponent={hasOnlyBotGroups ? renderEmptyState : undefined}
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
  // Join section styles
  joinSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  joinContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  inputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 2,
    shadowColor: '#a0a0a0ff',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 8,
  },
  joinInput: {
    flex: 1,
    fontSize: 14,
    paddingVertical: 10,
    paddingHorizontal: 0,
  },
  clearButton: {
    padding: 2,
    marginLeft: 4,
  },
  joinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 70,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  buttonIcon: {
    marginRight: 4,
  },
  joinButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  // Bot-only footer styles
  botOnlyFooterContainer: {
    paddingHorizontal: 32,
    paddingTop: 32,
    paddingBottom: 100, // Extra bottom padding to prevent tab bar overlap
    alignItems: 'center',
    marginTop: 28,
  },
});
