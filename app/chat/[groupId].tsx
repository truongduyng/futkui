import { AuthGate } from "@/components/AuthGate";
import { ImageModal } from "@/components/chat/ImageModal";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { MessageInput } from "@/components/chat/MessageInput";
import { Colors } from "@/constants/Colors";
import { useInstantDB } from "@/hooks/useInstantDB";
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChatScreen() {
  const { groupId } = useLocalSearchParams<{ groupId: string }>();
  const colors = Colors["light"];
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const router = useRouter();
  const flatListRef = useRef<FlatList>(null);
  const previousMessageCountRef = useRef<number>(0);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const {
    useGroup,
    useProfile,
    useUserMembership,
    sendMessage,
    addReaction,
    leaveGroup,
    instantClient,
  } = useInstantDB();
  const { data: groupData, isLoading } = useGroup(groupId || "");
  const { data: profileData } = useProfile();
  const { data: membershipData } = useUserMembership(groupId || "");
  const { user } = instantClient.useAuth();
  const currentProfile = profileData?.profiles?.[0];
  const userMembership = membershipData?.memberships?.[0];

  const group = groupData?.groups?.[0];
  const messages = group?.messages || [];
  const files = groupData?.$files || [];

  // Helper function to resolve file URL from file ID
  const getFileUrl = (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    return file?.url;
  };

  // Track message count changes to detect new messages
  useEffect(() => {
    const currentMessageCount = messages.length;
    const previousMessageCount = previousMessageCountRef.current;

    if (currentMessageCount > 0) {
      if (previousMessageCount === 0) {
        // Initial load, scroll to bottom without animation
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, 100);
      } else if (currentMessageCount > previousMessageCount) {
        // New message added, scroll to bottom with animation
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: true });
        }, 100);
      }
    }

    previousMessageCountRef.current = currentMessageCount;
  }, [messages.length]);

  const handleShareGroup = useCallback(() => {
    if (group?.shareLink) {
      Alert.alert(
        "Share Group",
        `Share this link to invite others to join "${group.name}":\n\n${group.shareLink}`,
        [
          {
            text: "Copy Link",
            onPress: async () => {
              try {
                await Clipboard.setStringAsync(group.shareLink);
                Alert.alert("Copied!", "Group link copied to clipboard");
              } catch (error) {
                console.error("Copy error:", error);
                Alert.alert("Error", "Failed to copy link to clipboard");
              }
            },
          },
          { text: "Cancel", style: "cancel" },
        ],
      );
    }
  }, [group?.shareLink, group?.name]);

  const handleLeaveGroup = useCallback(() => {
    Alert.alert(
      "Leave Group",
      `Are you sure you want to leave "${group?.name}"?`,
      [
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            if (!currentProfile || !group) return;

            try {
              if (userMembership) {
                await leaveGroup(userMembership.id);
                router.back();
                Alert.alert("Left Group", `You have left ${group.name}`);
              } else {
                Alert.alert(
                  "Error",
                  "Unable to find your membership in this group.",
                );
              }
            } catch (error) {
              console.error("Leave group error:", error);
              Alert.alert("Error", "Failed to leave group. Please try again.");
            }
          },
        },
        { text: "Cancel", style: "cancel" },
      ],
    );
  }, [currentProfile, group, userMembership, leaveGroup, router]);

  const showOptionsMenu = useCallback(() => {
    Alert.alert("Group Options", "", [
      {
        text: "Share Group",
        onPress: handleShareGroup,
      },
      {
        text: "Leave Group",
        style: "destructive",
        onPress: handleLeaveGroup,
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [handleShareGroup, handleLeaveGroup]);

  // Update navigation header when group data loads
  useEffect(() => {
    if (group) {
      navigation.setOptions({
        title: group.name,
        headerBackTitle: "Back",
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.tint,
        headerTitleStyle: {
          color: colors.text,
        },
        headerRight: () => (
          <TouchableOpacity
            onPress={showOptionsMenu}
            style={{ marginRight: 4, padding: 8 }}
          >
            <Text style={{ color: colors.tint, fontSize: 16 }}>⋯</Text>
          </TouchableOpacity>
        ),
      });
    }
  }, [group, navigation, colors, showOptionsMenu]);

  const handleSendMessage = async (content: string, imageUri?: string) => {
    if (!groupId || !currentProfile) {
      Alert.alert("Error", "Please wait for your profile to load.");
      return;
    }

    try {
      await sendMessage({
        groupId,
        content,
        authorId: currentProfile.id,
        authorName: currentProfile.handle,
        imageUri,
      });

      // Auto-scroll to bottom after sending message
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      Alert.alert("Error", "Failed to send message. Please try again.");
      console.error("Error sending message:", error);
    }
  };

  const handleAddReaction = async (
    messageId: string,
    emoji: string,
    existingReactions: any[],
  ) => {
    if (!currentProfile || !user) {
      Alert.alert("Error", "Please wait for your profile to load.");
      return;
    }

    try {
      await addReaction({
        messageId,
        emoji,
        userId: currentProfile.id, // Use profile ID to match schema
        userName: currentProfile.handle,
        existingReactions,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to add reaction. Please try again.");
      console.error("Error adding reaction:", error);
    }
  };

  const handleReactionPress = (
    messageId: string,
    emoji: string,
    existingReactions: any[],
  ) => {
    handleAddReaction(messageId, emoji, existingReactions);
  };

  const handleImagePress = (imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
  };

  const shouldShowTimestamp = (
    currentMessage: any,
    previousMessage: any,
  ): boolean => {
    if (!previousMessage) return true;

    const currentTime = new Date(currentMessage.createdAt);
    const previousTime = new Date(previousMessage.createdAt);

    // Show timestamp if messages are more than 15 minutes apart
    const timeDifference = currentTime.getTime() - previousTime.getTime();
    const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds

    return timeDifference >= fifteenMinutes;
  };

  const renderMessage = ({
    item: message,
    index,
  }: {
    item: any;
    index: number;
  }) => {
    const isOwnMessage = message.author?.id === currentProfile?.id;
    const previousMessage = index > 0 ? messages[index - 1] : null;
    const showTimestamp = shouldShowTimestamp(message, previousMessage);

    // Check if this message is from the same author as the previous message
    const showAuthor =
      !previousMessage ||
      previousMessage.author?.id !== message.author?.id ||
      showTimestamp; // Always show author after timestamp breaks

    const resolvedImageUrl = message.imageUrl ? getFileUrl(message.imageUrl) : undefined;

    return (
      <>
        {showTimestamp && (
          <View style={styles.timestampHeader}>
            <Text
              style={[styles.timestampText, { color: colors.tabIconDefault }]}
            >
              {new Date(message.createdAt).toLocaleString([], {
                month: "short",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </Text>
          </View>
        )}
        <MessageBubble
          content={message.content}
          author={message.author}
          createdAt={new Date(message.createdAt)}
          isOwnMessage={isOwnMessage}
          reactions={message.reactions || []}
          onReactionPress={(emoji: string) =>
            handleReactionPress(message.id, emoji, message.reactions || [])
          }
          onAddReaction={(emoji: string) =>
            handleAddReaction(message.id, emoji, message.reactions || [])
          }
          showTimestamp={false}
          showAuthor={showAuthor}
          imageUrl={resolvedImageUrl}
          onImagePress={handleImagePress}
        />
      </>
    );
  };

  if (isLoading) {
    return (
      <AuthGate>
        <View
          style={[
            styles.container,
            styles.centered,
            { backgroundColor: colors.background },
          ]}
        >
          <Text style={[styles.loadingText, { color: colors.text }]}>
            Loading...
          </Text>
        </View>
      </AuthGate>
    );
  }

  if (!group) {
    return (
      <AuthGate>
        <View
          style={[
            styles.container,
            styles.centered,
            { backgroundColor: colors.background },
          ]}
        >
          <Text style={[styles.errorText, { color: colors.text }]}>
            Group not found
          </Text>
        </View>
      </AuthGate>
    );
  }

  return (
    <AuthGate>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={
            Platform.OS === "ios" ? insets.bottom + 49 : 0
          }
          enabled
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
            inverted={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={false}
            onLayout={() =>
              flatListRef.current?.scrollToEnd({ animated: false })
            }
          />

          <MessageInput onSendMessage={handleSendMessage} />
        </KeyboardAvoidingView>
        
        <ImageModal
          visible={!!selectedImageUrl}
          imageUrl={selectedImageUrl}
          onClose={() => setSelectedImageUrl(null)}
        />
      </View>
    </AuthGate>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
  },
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  timestampHeader: {
    alignItems: "center",
    marginVertical: 16,
  },
  timestampText: {
    fontSize: 12,
    fontWeight: "500",
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
});
