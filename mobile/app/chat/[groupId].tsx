import { ActivityBar } from "@/components/chat/ActivityBar";
import { useChatItemRenderer } from "@/components/chat/ChatItemRenderer";
import { ImageModal } from "@/components/chat/ImageModal";
import { LoadingHeader } from "@/components/chat/LoadingHeader";
import { LoadingStates } from "@/components/chat/LoadingStates";
import { MessageInput } from "@/components/chat/MessageInput";
import { Colors } from "@/constants/Colors";
import { useChatData } from "@/hooks/useChatData";
import { useChatHandlers } from "@/hooks/useChatHandlers";
import { useChatHeader } from "@/hooks/useChatHeader";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useInstantDB } from "@/hooks/useInstantDB";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useState } from "react";
import {
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
    markMessagesAsRead,
  } = useInstantDB();

  // Data queries
  const { data: groupData, isLoading: isLoadingGroup } = useGroup(groupId || "");
  const { data: messagesData, isLoading: isLoadingMessages } = useMessages(groupId || "", messageLimit);
  const { data: profileData } = useProfile();
  const { data: membershipData } = useUserMembership(groupId || "");
  
  const currentProfile = profileData?.profiles?.[0];
  const userMembership = membershipData?.memberships?.[0];
  const group = groupData?.groups?.[0];

  // Process chat data
  const { messages, polls, matches, hasMoreMessages } = useChatData({
    messagesData,
    groupId: groupId || "",
    messageLimit,
  });

  // Extract members for mentions
  const members = group?.memberships
    ?.map((membership) => ({
      id: membership.profile?.id || "",
      handle: membership.profile?.handle || "",
      displayName: membership.profile?.displayName,
    }))
    .filter((member) => member.id && member.handle) || [];

  // Scroll management
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
    chatItems: messages,
    hasMoreMessages,
    messageLimit,
    setMessageLimit,
    groupId: groupId || "",
  });

  // Event handlers
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

  // Header management
  const { showOptionsMenu } = useChatHeader({ group, handleShareGroup, handleLeaveGroup });

  useEffect(() => {
    if (group) {
      navigation.setOptions({
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
  }, [group, showOptionsMenu, colors, navigation]);

  // Chat item rendering
  const { renderChatItem, keyExtractor } = useChatItemRenderer({
    chatItems: messages,
    currentProfile,
    group,
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

  // Mark messages as read when user views the chat
  useEffect(() => {
    if (userMembership?.id && messages.length > 0) {
      const markAsRead = async () => {
        try {
          await markMessagesAsRead(userMembership.id);
        } catch (error) {
          console.error('Error marking messages as read:', error);
        }
      };

      markAsRead();
    }
  }, [userMembership?.id, messages.length, markMessagesAsRead]);

  // Loading states
  if (!groupId) return <LoadingStates type="loading" />;
  if (isLoadingGroup) return <LoadingStates type="loadingGroup" />;
  if (!group) return <LoadingStates type="groupNotFound" />;

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
          {isLoadingMessages && messages.length === 0 ? (
            <LoadingStates type="loadingMessages" />
          ) : (
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderChatItem}
              keyExtractor={keyExtractor}
              style={styles.messageList}
              contentContainerStyle={styles.messageListContent}
              inverted
              maintainVisibleContentPosition={{
                minIndexForVisible: 0,
                autoscrollToTopThreshold: 10,
              }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              automaticallyAdjustKeyboardInsets
              keyboardDismissMode="interactive"
              removeClippedSubviews
              maxToRenderPerBatch={10}
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
  messageList: {
    flex: 1,
  },
  messageListContent: {
    paddingHorizontal: 16,
    paddingVertical: 8,
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
});
