import { CreateGroupModal } from '@/components/chat/CreateGroupModal';
import { GroupList } from '@/components/chat/GroupList';
import { Colors } from '@/constants/Colors';
import { GroupRefreshProvider } from '@/contexts/GroupRefreshContext';
import { useUnreadCount } from '@/contexts/UnreadCountContext';
import { useInstantDB } from '@/hooks/useInstantDB';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Animated, SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function ChatScreen() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();
  const colors = Colors['light'];

  const { useGroups, useLastMessages, useProfile, createGroup } = useInstantDB();
  const { setTotalUnreadCount } = useUnreadCount();
  
  // Use real-time hooks
  const { data: groupsData, isLoading: groupsLoading, error: groupsError } = useGroups();
  const { data: profileData, isLoading: profileLoading, error: profileError } = useProfile();
  
  const currentProfile = profileData?.profiles?.[0];
  
  // Extract groups first to get group IDs
  const profile = groupsData?.profiles?.[0];
  const baseGroups = useMemo(() =>
    (profile?.memberships || [])
      .map((membership: any) => membership.group)
      .filter((group: any) => group && group.id),
    [profile?.memberships]
  );
  
  // Get group IDs for useLastMessages
  const groupIds = useMemo(() => baseGroups.map((group: any) => group.id), [baseGroups]);
  
  // Use real-time last messages
  const { data: lastMessagesData, isLoading: lastMessagesLoading, error: lastMessagesError } = useLastMessages(groupIds);

  // Calculate combined loading state and error state  
  const isLoading = groupsLoading || profileLoading || lastMessagesLoading;
  const error = groupsError || profileError || lastMessagesError;

  // Animated value for skeleton loading
  const animatedValue = React.useRef(new Animated.Value(0)).current;

  // Start skeleton animation
  React.useEffect(() => {
    const startAnimation = () => {
      Animated.sequence([
        Animated.timing(animatedValue, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(animatedValue, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]).start(() => {
        if (isLoading) {
          startAnimation();
        }
      });
    };

    if (isLoading) {
      startAnimation();
    }
  }, [isLoading, animatedValue]);

  // Skeleton loading component
  const SkeletonLoader = () => {
    const opacity = animatedValue.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 0.7],
    });

    return (
      <View style={styles.skeletonContainer}>
        <View style={[styles.skeletonHeader, { backgroundColor: colors.background }]}>
          <Animated.View style={[styles.skeletonTitle, { opacity, backgroundColor: colors.tabIconDefault }]} />
          <View style={styles.skeletonHeaderButtons}>
            <Animated.View style={[styles.skeletonButton, { opacity, backgroundColor: colors.tabIconDefault }]} />
            <Animated.View style={[styles.skeletonButton, { opacity, backgroundColor: colors.tabIconDefault }]} />
          </View>
        </View>

        {[1, 2, 3, 4, 5].map((index) => (
          <View key={index} style={[styles.skeletonGroupItem, { backgroundColor: colors.background }]}>
            <Animated.View style={[styles.skeletonAvatar, { opacity, backgroundColor: colors.tabIconDefault }]} />
            <View style={styles.skeletonGroupInfo}>
              <Animated.View style={[styles.skeletonGroupName, { opacity, backgroundColor: colors.tabIconDefault }]} />
              <Animated.View style={[styles.skeletonLastMessage, { opacity, backgroundColor: colors.tabIconDefault }]} />
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Calculate unread counts for each group - first create memberships map
  const membershipsMap = useMemo(() => {
    return new Map((profile?.memberships || []).map((m: any) => [m.group?.id, m]));
  }, [profile?.memberships]);
  
  // Calculate total unread messages directly from membership data
  const unreadData = useMemo(() => {
    if (!lastMessagesData?.messages || !membershipsMap.size) {
      return { messages: [] };
    }
    
    const unreadMessages = lastMessagesData.messages.filter((msg: any) => {
      const membership = membershipsMap.get(msg.group?.id);
      return membership?.lastReadMessageAt && msg.createdAt > membership.lastReadMessageAt;
    });
    
    return { messages: unreadMessages };
  }, [lastMessagesData?.messages, membershipsMap]);
  
  
  // Simple refresh function for pull-to-refresh (real-time queries auto-update)
  const [isRefreshing, setIsRefreshing] = useState(false);
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    // Simulate a brief refresh delay since real-time queries auto-update
    setTimeout(() => setIsRefreshing(false), 500);
  }, []);

  const handleGroupPress = (group: any) => {
    router.push({
      pathname: '/chat/[groupId]' as any,
      params: { groupId: group.id }
    });
  };

  const handleCreateGroup = async (groupData: { name: string; description: string; avatarFileId: string; sports: string[] }) => {
    if (!currentProfile) {
      Alert.alert('Error', 'Please wait for your profile to load.');
      return;
    }

    try {
      await createGroup({
        ...groupData,
        adminId: currentProfile.id, // Use profile ID as admin ID
      });
      Alert.alert('Success', 'Group created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create group. Please try again.');
      console.error('Error creating group:', error);
    }
  };

  // Combine groups with their last messages
  const groups = useMemo(() => {
    const getLastMessageForGroup = (groupId: string) => {
      if (!lastMessagesData?.messages) return null;
      return lastMessagesData.messages.find((message: any) => message.group?.id === groupId);
    };

    return (profile?.memberships || [])
      .map((membership: any) => membership.group)
      .filter((group: any) => group && group.id)
      .map((group: any) => ({
        ...group,
        messages: [getLastMessageForGroup(group.id)].filter(Boolean) // Add last message as array for compatibility
      }))
      .sort((a: any, b: any) => {
        // Pin bot group (admin.handle === 'fk') to the top
        const aIsBot = a.admin?.handle === 'fk';
        const bIsBot = b.admin?.handle === 'fk';

        if (aIsBot && !bIsBot) return -1;
        if (!aIsBot && bIsBot) return 1;

        // For non-bot groups, sort by most recent message or creation date
        const aLastMessage = a.messages?.[0];
        const bLastMessage = b.messages?.[0];

        const aTime = aLastMessage?.createdAt || a.createdAt || 0;
        const bTime = bLastMessage?.createdAt || b.createdAt || 0;

        return bTime - aTime;
      });
  }, [profile?.memberships, lastMessagesData?.messages]);

  // Calculate total unread count and update context
  const totalUnreadCount = useMemo(() => {
    if (!unreadData?.messages) return 0;
    return unreadData.messages.length;
  }, [unreadData?.messages]);

  // Update unread count in context
  useEffect(() => {
    setTotalUnreadCount(totalUnreadCount);
  }, [totalUnreadCount, setTotalUnreadCount]);

  return (
    <GroupRefreshProvider refreshGroups={async () => {}}>
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {isLoading ? (
          <SkeletonLoader />
        ) : error ? (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: 'red' }]}>Error loading groups: {error.message}</Text>
          </View>
        ) : (
          <GroupList
            groups={groups}
            memberships={profile?.memberships || []}
            unreadData={unreadData}
            onGroupPress={handleGroupPress}
            onCreateGroup={() => setShowCreateModal(true)}
            onRefresh={handleRefresh}
            isRefreshing={isRefreshing}
          />
        )}

        <CreateGroupModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateGroup={handleCreateGroup}
        />
      </SafeAreaView>
    </GroupRefreshProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    padding: 16,
    alignItems: 'center',
  },
  errorText: {
    fontSize: 14,
    textAlign: 'center',
  },
  // Skeleton styles
  skeletonContainer: {
    flex: 1,
    paddingHorizontal: 16,
  },
  skeletonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  skeletonTitle: {
    width: 80,
    height: 28,
    borderRadius: 4,
  },
  skeletonHeaderButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonButton: {
    width: 80,
    height: 32,
    borderRadius: 16,
  },
  skeletonGroupItem: {
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
  skeletonAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },
  skeletonGroupInfo: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  skeletonGroupName: {
    height: 16,
    borderRadius: 4,
    width: '70%',
  },
  skeletonLastMessage: {
    height: 14,
    borderRadius: 4,
    width: '90%',
  },
});
