import { ActivityBar } from "@/components/chat/ActivityBar";
import { useChatItemRenderer } from "@/components/chat/ChatItemRenderer";
import { ImageModal } from "@/components/chat/ImageModal";
import { LoadingHeader } from "@/components/chat/LoadingHeader";
import { MessageInput } from "@/components/chat/MessageInput";
import { Colors } from "@/constants/Colors";
import { useChatHandlers } from "@/hooks/useChatHandlers";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useInstantDB } from "@/hooks/useInstantDB";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useCallback, useEffect, useMemo, useState } from "react";
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
  const params = useLocalSearchParams<{ groupId: string }>();
  const groupId = params?.groupId;
  const colors = Colors["light"];
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [messageLimit, setMessageLimit] = useState(200);

  const {
    useGroup,
    useMessages,
    useProfile,
    useUserMembership,
    sendMessage,
    sendPoll,
    vote,
    closePoll,
    createMatch,
    rsvpToMatch,
    checkInToMatch,
    closeMatch,
    addReaction,
    leaveGroup,
  } = useInstantDB();

  // Separate queries for group info and messages
  const { data: groupData, isLoading: isLoadingGroup } = useGroup(
    groupId || "",
  );
  const { data: messagesData, isLoading: isLoadingMessages } = useMessages(
    groupId || "",
    messageLimit,
  );

  const { data: profileData } = useProfile();
  const { data: membershipData } = useUserMembership(groupId || "");
  const currentProfile = profileData?.profiles?.[0];
  const userMembership = membershipData?.memberships?.[0];

  const group = groupData?.groups?.[0];
  const messages = useMemo(() => messagesData?.messages || [], [messagesData?.messages]);

  // Extract polls from messages for ActivityBar
  const polls = useMemo(() => {
    return messages
      .filter((message) => message.poll)
      .map((message) => ({
        ...message.poll,
        message: {
          group: {
            id: groupId || "",
          },
        },
      }));
  }, [messages, groupId]);

  // Extract matches from messages for ActivityBar
  const matches = useMemo(() => {
    return messages
      .filter((message) => message.match)
      .map((message) => message.match!)
      .filter((match): match is NonNullable<typeof match> => match !== null && match !== undefined);
  }, [messages]);

  // Use messages directly as chat items since matches are now linked to messages
  const chatItems = useMemo(() => {
    return messages;
  }, [messages]);
  const files = useMemo(
    () => messagesData?.$files || [],
    [messagesData?.$files],
  );

  // Memoize file lookup for better performance
  const fileUrlMap = useMemo(() => {
    const map = new Map();
    files.forEach((file) => {
      map.set(file.id, file.url);
    });
    return map;
  }, [files]);

  // Simple check if we have more messages to load
  const hasMoreMessages = messages.length >= messageLimit;

  // Extract members from group memberships for mention functionality
  const members =
    group?.memberships
      ?.map((membership) => ({
        id: membership.profile?.id || "",
        handle: membership.profile?.handle || "",
        displayName: membership.profile?.displayName,
      }))
      .filter((member) => member.id && member.handle) || [];

  // Helper function to resolve file URL from file ID
  const getFileUrl = useCallback(
    (fileId: string) => {
      return fileUrlMap.get(fileId);
    },
    [fileUrlMap],
  );

  // Use scroll hook for managing scroll behavior
  const {
    flatListRef,
    showScrollToBottom,
    isLoadingOlder,
    handleScroll,
    handleLayout,
    scrollToBottom,
    setIsNearBottom,
    setShowScrollToBottom,
  } = useChatScroll({
    chatItems,
    hasMoreMessages,
    messageLimit,
    setMessageLimit,
    groupId: groupId || "",
  });

  // Use handlers hook for managing all event handlers
  const {
    handleShareGroup,
    handleLeaveGroup,
    handleSendMessage,
    handleSendPoll,
    handleCreateMatch,
    handleAddReaction,
    handleReactionPress,
    handleImagePress,
    handleVote,
    handleClosePoll,
    handleRsvp,
    handleCheckIn,
    handleCloseMatch,
  } = useChatHandlers({
    currentProfile,
    group,
    userMembership,
    matches,
    sendMessage,
    sendPoll,
    createMatch,
    addReaction,
    vote,
    closePoll,
    rsvpToMatch,
    checkInToMatch,
    closeMatch,
    leaveGroup,
    setIsNearBottom,
    setShowScrollToBottom,
    setSelectedImageUrl,
  });

  // Navigation header management (keeping inline for now due to JSX complexity)
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

  // Use chat item renderer
  const { renderChatItem, keyExtractor } = useChatItemRenderer({
    chatItems,
    currentProfile,
    group,
    getFileUrl,
    stableHandleVote: (pollId, optionId, votes, allowMultiple) =>
      handleVote(pollId, optionId, votes, allowMultiple),
    stableHandleClosePoll: (pollId) => handleClosePoll(pollId),
    stableHandleReaction: (messageId, emoji, reactions) =>
      handleReactionPress(messageId, emoji, reactions),
    stableHandleAddReaction: (messageId, emoji, reactions) =>
      handleAddReaction(messageId, emoji, reactions),
    handleImagePress,
    handleRsvp,
    handleCheckIn,
    handleCloseMatch,
  });

  // Reset limit when group changes
  useEffect(() => {
    setMessageLimit(500);
  }, [groupId]);

  if (!groupId) {
    return (
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
    );
  }

  if (isLoadingGroup) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading group...
        </Text>
      </View>
    );
  }

  if (!group) {
    return (
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
    );
  }

  return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityBar
          polls={polls}
          matches={matches}
          groupId={groupId || ""}
        />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 20 : 0}
          enabled
        >
          {isLoadingMessages && chatItems.length === 0 ? (
            <View style={[styles.centered, { flex: 1 }]}>
              <Text style={[styles.loadingText, { color: colors.text }]}>
                Loading messages...
              </Text>
            </View>
          ) : (
            <FlatList
              ref={flatListRef}
              data={chatItems}
              renderItem={renderChatItem}
              keyExtractor={keyExtractor}
              style={styles.messageList}
              contentContainerStyle={styles.messageListContent}
              inverted={true}
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
                autoscrollToTopThreshold: 10,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              automaticallyAdjustKeyboardInsets={true}
              keyboardDismissMode="interactive"
              removeClippedSubviews={true}
              maxToRenderPerBatch={10}
              updateCellsBatchingPeriod={100}
              initialNumToRender={15}
              windowSize={5}
              onScroll={handleScroll}
              scrollEventThrottle={16}
              onLayout={handleLayout}
              ListFooterComponent={() => (
                <LoadingHeader isLoading={isLoadingOlder} />
              )}
            />
          )}

          <MessageInput
            onSendMessage={handleSendMessage}
            onSendPoll={handleSendPoll}
            onCreateMatch={handleCreateMatch}
            members={members}
          />
        </KeyboardAvoidingView>

        {showScrollToBottom && (
          <TouchableOpacity
            style={[
              styles.scrollToBottomButton,
              { backgroundColor: colors.tint },
            ]}
            onPress={scrollToBottom}
            activeOpacity={0.8}
          >
            <Text style={styles.scrollButtonText}>↓</Text>
          </TouchableOpacity>
        )}

        <ImageModal
          visible={!!selectedImageUrl}
          imageUrl={selectedImageUrl}
          onClose={() => setSelectedImageUrl(null)}
        />
      </View>
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
  scrollToBottomButton: {
    position: "absolute",
    right: 16,
    bottom: 80,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  scrollButtonText: {
    color: "white",
    fontSize: 20,
    fontWeight: "bold",
  },
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
});
