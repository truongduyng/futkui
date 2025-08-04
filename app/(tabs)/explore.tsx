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

  const { useGroups } = useInstantDB();
  const { data: groupsData } = useGroups();
  const groups = groupsData?.groups || [];

  const handleJoinGroup = async () => {
    if (!shareLink.trim()) {
      Alert.alert("Error", "Please enter a group link");
      return;
    }

    // Find group by share link
    const group = groups.find((g: any) => g.shareLink === shareLink.trim());
    if (group) {
      Alert.alert("Success", `Joined group: ${group.name}`);
      setShareLink("");
    } else {
      Alert.alert("Error", "Group not found. Please check the link.");
    }
  };

  const handleShareGroup = (group: any) => {
    Alert.alert(
      "Share Group",
      `Share this link to invite others to join "${group.name}":\n\n${group.shareLink}`,
      [
        {
          text: "Copy Link",
          onPress: () => console.log("Copy link:", group.shareLink),
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
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
              onPress={handleJoinGroup}
            >
              <Text style={styles.joinButtonText}>Join</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            Your Groups
          </Text>
          <View style={styles.groupList}>
            {groups.length === 0 ? (
              <Text
                style={[styles.emptyText, { color: colors.tabIconDefault }]}
              >
                No groups yet. Create your first group in the Chats tab!
              </Text>
            ) : (
              groups.map((group: any) => (
                <TouchableOpacity
                  key={group.id}
                  style={[
                    styles.groupItem,
                    { backgroundColor: colors.background },
                  ]}
                  onPress={() => handleShareGroup(group)}
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
                      {group.members?.length || 0} members
                    </Text>
                  </View>
                  <Text style={[styles.shareText, { color: colors.tint }]}>
                    Share
                  </Text>
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
  groupList: {
    paddingHorizontal: 16,
  },
});
