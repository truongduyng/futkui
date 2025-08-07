import { AuthGate } from "@/components/AuthGate";
import { Colors } from "@/constants/Colors";
import { useInstantDB } from "@/hooks/useInstantDB";
import React, { useState } from "react";
import {
  Alert,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function ExploreScreen() {
  const [shareLink, setShareLink] = useState("");
  const colors = Colors['light'];

  const { useGroups, useAllGroups, useProfile, joinGroup } = useInstantDB();
  const { data: myGroupsData } = useGroups();
  const { data: allGroupsData } = useAllGroups();
  const { data: profileData } = useProfile();

  const myGroups = myGroupsData?.profiles?.[0]?.memberships?.map((m: any) => m.group).filter((g: any) => g && g.id) || [];
  const allGroups = allGroupsData?.groups?.filter((g: any) => g && g.id) || [];
  const currentProfile = profileData?.profiles?.[0];

  // Filter out groups the user is already a member of
  const availableGroups = allGroups.filter((group: any) =>
    group && group.id && !myGroups.some((myGroup: any) => myGroup && myGroup.id === group.id)
  );

  const handleJoinViaLink = async () => {
    if (!shareLink.trim()) {
      Alert.alert("Error", "Please enter a group link");
      return;
    }

    // Find group by share link
    const group = allGroups.find((g: any) => g && g.shareLink === shareLink.trim());
    if (group && group.id && currentProfile) {
      // Check if user is already a member
      const isAlreadyMember = myGroups.some((myGroup: any) => myGroup && myGroup.id === group.id);
      
      if (isAlreadyMember) {
        Alert.alert("Already a Member", `You are already a member of "${group.name}".`);
        setShareLink("");
        return;
      }

      try {
        await joinGroup(group.id, currentProfile.id);
        Alert.alert("Success", `Joined group: ${group.name}`);
        setShareLink("");
      } catch (error) {
        Alert.alert("Error", "Failed to join group. Please try again.");
      }
    } else {
      Alert.alert("Error", "Group not found. Please check the link.");
    }
  };

  const handleJoinGroup = async (groupId: string, groupName: string) => {
    if (!currentProfile) {
      Alert.alert("Error", "Please wait for your profile to load.");
      return;
    }

    // Check if user is already a member (extra safety check)
    const isAlreadyMember = myGroups.some((myGroup: any) => myGroup && myGroup.id === groupId);
    
    if (isAlreadyMember) {
      Alert.alert("Already a Member", `You are already a member of "${groupName}".`);
      return;
    }

    try {
      await joinGroup(groupId, currentProfile.id);
      Alert.alert("Success", `Joined group: ${groupName}`);
    } catch (error) {
      Alert.alert("Error", "Failed to join group. Please try again.");
    }
  };

  return (
    <AuthGate>
      <SafeAreaView
        style={[styles.container, { backgroundColor: colors.background }]}
      >
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Join a Group
          </Text>
          <View style={styles.joinContainer}>
            <TextInput
              style={[
                styles.input,
                {
                  color: colors.text,
                  backgroundColor: colors.background,
                  borderColor: colors.tabIconDefault,
                },
              ]}
              value={shareLink}
              onChangeText={setShareLink}
              placeholder="Enter group link..."
              placeholderTextColor={colors.tabIconDefault}
            />
            <TouchableOpacity
              style={[styles.joinButton, { backgroundColor: colors.tint }]}
              onPress={handleJoinViaLink}
            >
              <Text style={styles.joinButtonText}>Join</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Community
          </Text>
          <View style={styles.groupList}>
            {availableGroups.length === 0 ? (
              <Text
                style={[styles.emptyText, { color: colors.tabIconDefault }]}
              >
                No groups available to join at the moment.
              </Text>
            ) : (
              availableGroups.map((group: any) => (
                <TouchableOpacity
                  key={group.id}
                  style={[
                    styles.groupItem,
                    { backgroundColor: colors.background },
                  ]}
                  onPress={() => handleJoinGroup(group.id, group.name)}
                >
                  <Text style={styles.groupEmoji}>{group.avatar}</Text>
                  <View style={styles.groupInfo}>
                    <Text style={[styles.groupName, { color: colors.text }]}>
                      {group.name}
                    </Text>
                    <Text
                      style={[
                        styles.groupDescription,
                        { color: colors.tabIconDefault },
                      ]}
                    >
                      {group.description}
                    </Text>
                    <Text
                      style={[
                        styles.memberCount,
                        { color: colors.tabIconDefault },
                      ]}
                    >
                      {group.memberships?.length || 0} members
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.joinGroupButton, { backgroundColor: colors.tint }]}
                    onPress={() => handleJoinGroup(group.id, group.name)}
                  >
                    <Text style={styles.joinGroupButtonText}>Join</Text>
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>
      </SafeAreaView>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  section: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 8,
  },
  joinContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    marginRight: 8,
  },
  joinButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  joinButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  emptyText: {
    textAlign: "center",
    fontSize: 16,
    fontStyle: "italic",
    marginTop: 20,
  },
  groupItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  groupEmoji: {
    fontSize: 24,
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
  },
  groupName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  groupDescription: {
    fontSize: 14,
    marginBottom: 2,
  },
  memberCount: {
    fontSize: 12,
  },
  shareText: {
    fontSize: 14,
    fontWeight: "600",
  },
  joinGroupButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
  },
  joinGroupButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: "600",
  },
  groupList: {
    paddingHorizontal: 16,
  },
});
