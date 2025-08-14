import { AuthGate } from '@/components/AuthGate';
import { CreateGroupModal } from '@/components/chat/CreateGroupModal';
import { GroupList } from '@/components/chat/GroupList';
import { Colors } from '@/constants/Colors';
import { useInstantDB } from '@/hooks/useInstantDB';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, SafeAreaView, StyleSheet, Text, View } from 'react-native';

function ChatScreenContent() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();
  const colors = Colors['light'];

  const { useGroups, useProfile, createGroup } = useInstantDB();
  const { data: groupsData, isLoading, error } = useGroups();
  const { data: profileData } = useProfile();
  const currentProfile = profileData?.profiles?.[0];

  const handleGroupPress = (group: any) => {
    router.push({
      pathname: '/chat/[groupId]' as any,
      params: { groupId: group.id }
    });
  };

  const handleCreateGroup = async (groupData: { name: string; description: string; avatar: string }) => {
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

  // Extract groups from memberships
  const profile = groupsData?.profiles?.[0];
  const groups = (profile?.memberships || [])
    .map((membership: any) => membership.group)
    .filter((group: any) => group && group.id);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={[styles.loadingText, { color: colors.text }]}>Loading groups...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: 'red' }]}>Error loading groups: {error.message}</Text>
        </View>
      ) : (
        <GroupList
          groups={groups}
          onGroupPress={handleGroupPress}
          onCreateGroup={() => setShowCreateModal(true)}
        />
      )}

      <CreateGroupModal
        visible={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreateGroup={handleCreateGroup}
      />
    </SafeAreaView>
  );
}

export default function ChatScreen() {
  return (
    <AuthGate>
      <ChatScreenContent />
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
