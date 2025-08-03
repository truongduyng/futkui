import { AuthGate } from '@/components/AuthGate';
import { CreateGroupModal } from '@/components/chat/CreateGroupModal';
import { GroupList } from '@/components/chat/GroupList';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { useInstantDB } from '@/hooks/useInstantDB';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';

export default function HomeScreen() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [currentUserName, setCurrentUserName] = useState('');
  const router = useRouter();
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];

  const { useGroups, createGroup } = useInstantDB();
  const { data: groupsData, isLoading, error } = useGroups();

  useEffect(() => {
    // For testing, set a random user name
    if (!currentUserName) {
      const randomNames = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank'];
      setCurrentUserName(randomNames[Math.floor(Math.random() * randomNames.length)]);
    }
  }, [currentUserName]);

  const handleGroupPress = (group: any) => {
    router.push({
      pathname: '/chat/[groupId]' as any,
      params: { groupId: group.id }
    });
  };

  const handleCreateGroup = async (groupData: { name: string; description: string; avatar: string }) => {
    try {
      await createGroup({
        ...groupData,
        adminId: currentUserName, // Using username as admin ID for simplicity
      });
      Alert.alert('Success', 'Group created successfully!');
    } catch (error) {
      Alert.alert('Error', 'Failed to create group. Please try again.');
      console.error('Error creating group:', error);
    }
  };

  const groups = groupsData?.groups || [];

  return (
    <AuthGate>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {isLoading && (
          <View style={styles.loadingContainer}>
            <Text style={[styles.loadingText, { color: colors.text }]}>Loading groups...</Text>
          </View>
        )}

        {error && (
          <View style={styles.errorContainer}>
            <Text style={[styles.errorText, { color: 'red' }]}>Error loading groups: {error.message}</Text>
          </View>
        )}

        <GroupList
          groups={groups}
          onGroupPress={handleGroupPress}
          onCreateGroup={() => setShowCreateModal(true)}
        />

        <CreateGroupModal
          visible={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreateGroup={handleCreateGroup}
        />
      </View>
    </AuthGate>
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
});
