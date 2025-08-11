import { AuthGate } from "@/components/AuthGate";
import { ImageModal } from "@/components/chat/ImageModal";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { MessageInput } from "@/components/chat/MessageInput";
import { PollBubble } from "@/components/chat/PollBubble";
import { Colors } from "@/constants/Colors";
import { useInstantDB } from "@/hooks/useInstantDB";
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams, useNavigation, useRouter } from "expo-router";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
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
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const hasInitialScrolledRef = useRef(false);
  const lastMessageCountRef = useRef(0);
  const lastMessageIdRef = useRef<string>('');
  const [messageLimit, setMessageLimit] = useState(30);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const {
    useGroup,
    useMessages,
    useProfile,
    useUserMembership,
    sendMessage,
    sendPoll,
    vote,
    addReaction,
    leaveGroup,
    instantClient,
  } = useInstantDB();

  // Separate queries for group info and messages
  const { data: groupData, isLoading: isLoadingGroup } = useGroup(groupId || "");
  const { data: messagesData, isLoading: isLoadingMessages } = useMessages(groupId || "", messageLimit);

  const { data: profileData } = useProfile();
  const { data: membershipData } = useUserMembership(groupId || "");
  const { user } = instantClient.useAuth();
  const currentProfile = profileData?.profiles?.[0];
  const userMembership = membershipData?.memberships?.[0];

  const group = groupData?.groups?.[0];
  // Reverse messages since we fetch newest first but display oldest first
  const messages = useMemo(() => {
    const msgs = messagesData?.messages || [];
    return [...msgs].reverse();
  }, [messagesData?.messages]);
  const files = useMemo(() => messagesData?.$files || [], [messagesData?.$files]);

  const isLoading = isLoadingGroup || isLoadingMessages;

  // Simple check if we have more messages to load
  const hasMoreMessages = messages.length >= messageLimit;

  // Extract members from group memberships for mention functionality
  const members = group?.memberships?.map(membership => ({
    id: membership.profile?.id || '',
    handle: membership.profile?.handle || '',
    displayName: membership.profile?.displayName,
  })).filter(member => member.id && member.handle) || [];

  // Helper function to resolve file URL from file ID
  const getFileUrl = useCallback((fileId: string) => {
    const file = files.find(f => f.id === fileId);
    return file?.url;
  }, [files]);

  // Initial scroll to bottom on first load
  useEffect(() => {
    if (!isLoading && messages.length > 0 && !hasInitialScrolledRef.current) {
      // Multiple attempts with increasing delays to ensure content is rendered
      const scrollAttempts = [50, 150, 300, 500];

      scrollAttempts.forEach((delay) => {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, delay);
      });

      hasInitialScrolledRef.current = true;
    }
  }, [isLoading, messages.length]);

  // Additional scroll trigger when content size changes
  const handleContentSizeChange = useCallback(() => {
    if (!hasInitialScrolledRef.current && messages.length > 0) {
      // Immediate scroll when content size changes
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      });
    }
  }, [messages.length]);

  // Load older messages function
  const loadOlderMessages = useCallback(async () => {
    if (isLoadingOlder || !hasMoreMessages) {
      return;
    }

    setIsLoadingOlder(true);

    try {
      // Increase limit to load more messages
      setMessageLimit(prev => prev + 20);
    } catch (error) {
      console.error('Error loading older messages:', error);
    } finally {
      setTimeout(() => setIsLoadingOlder(false), 300);
    }
  }, [isLoadingOlder, hasMoreMessages]);

  // Track scroll position and show/hide scroll to bottom button
  const handleScroll = useCallback((event: any) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const isAtBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - 100;
    const isNearTop = contentOffset.y < 200; // Within 200px of top

    setIsNearBottom(isAtBottom);

    if (!isAtBottom) {
      // User scrolled up, show scroll to bottom button
      setShowScrollToBottom(true);
    } else if (isAtBottom) {
      // User is at bottom, hide button
      setShowScrollToBottom(false);
    }

    // Trigger loading older messages when near top
    if (isNearTop && hasMoreMessages && !isLoadingOlder) {
      loadOlderMessages();
    }
  }, [hasMoreMessages, isLoadingOlder, loadOlderMessages]);

  // Handle new messages (only scroll for truly new messages, not reactions)
  useEffect(() => {
    const currentCount = messages.length;
    const lastCount = lastMessageCountRef.current;

    // Only trigger scroll behavior when message count actually increases
    if (lastCount > 0 && currentCount > lastCount) {
      const currentLastMessageId = messages.length > 0 ? messages[messages.length - 1]?.id : '';
      const lastMessageId = lastMessageIdRef.current;
      
      // Double check that we have a new message with a different ID
      if (currentLastMessageId && currentLastMessageId !== lastMessageId) {
        // Check isNearBottom at the time of execution, not as a dependency
        if (isNearBottom) {
          // User is near bottom, scroll smoothly to new message
          setTimeout(() => {
            flatListRef.current?.scrollToEnd({ animated: true });
          }, 100);
        }
        // Update the last message ID only when we have a genuinely new message
        lastMessageIdRef.current = currentLastMessageId;
      }
    }

    lastMessageCountRef.current = currentCount;
  }, [messages.length]);

  // Reset state when changing groups
  useEffect(() => {
    hasInitialScrolledRef.current = false;
    setShowScrollToBottom(false);
    setIsNearBottom(true);
    lastMessageCountRef.current = 0;
    lastMessageIdRef.current = '';
  }, [groupId]);

  // Scroll to bottom function
  const scrollToBottom = useCallback(() => {
    flatListRef.current?.scrollToEnd({ animated: true });
    setShowScrollToBottom(false);
  }, []);

  // Reset limit when group changes
  useEffect(() => {
    setMessageLimit(30);
  }, [groupId]);

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

  const handleSendMessage = async (content: string, imageUri?: string, mentions?: string[]) => {
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
        mentions,
      });

      // Reset scroll state and scroll to bottom after sending
      setIsNearBottom(true);
      setShowScrollToBottom(false);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      Alert.alert("Error", "Failed to send message. Please try again.");
      console.error("Error sending message:", error);
    }
  };

  const handleAddReaction = useCallback(async (
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
  }, [currentProfile, user, addReaction]);

  const handleReactionPress = useCallback((
    messageId: string,
    emoji: string,
    existingReactions: any[],
  ) => {
    handleAddReaction(messageId, emoji, existingReactions);
  }, [handleAddReaction]);

  const handleImagePress = useCallback((imageUrl: string) => {
    setSelectedImageUrl(imageUrl);
  }, []);

  const handleSendPoll = async (question: string, options: { id: string; text: string }[], allowMultiple: boolean, expiresAt?: number) => {
    if (!groupId || !currentProfile) {
      Alert.alert("Error", "Please wait for your profile to load.");
      return;
    }

    try {
      await sendPoll({
        groupId,
        question,
        options,
        authorId: currentProfile.id,
        authorName: currentProfile.handle,
        allowMultiple,
        expiresAt,
      });

      // Reset scroll state and scroll to bottom after sending
      setIsNearBottom(true);
      setShowScrollToBottom(false);

      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    } catch (error) {
      Alert.alert("Error", "Failed to send poll. Please try again.");
      console.error("Error sending poll:", error);
    }
  };

  const handleVote = useCallback(async (pollId: string, optionId: string, existingVotes: any[], allowMultiple: boolean) => {
    if (!currentProfile) {
      Alert.alert("Error", "Please wait for your profile to load.");
      return;
    }

    try {
      await vote({
        pollId,
        optionId,
        userId: currentProfile.id,
        existingVotes,
        allowMultiple,
      });
    } catch (error) {
      Alert.alert("Error", "Failed to vote. Please try again.");
      console.error("Error voting:", error);
    }
  }, [currentProfile, vote]);

  const shouldShowTimestamp = useCallback((
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
  }, []);

  // Create memoized callback factories to avoid recreating functions on each render
  const createVoteHandler = useCallback((pollId: string, votes: any[], allowMultiple: boolean) => {
    return (optionId: string) => handleVote(pollId, optionId, votes, allowMultiple);
  }, [handleVote]);

  const createReactionHandler = useCallback((messageId: string, reactions: any[]) => {
    return (emoji: string) => handleReactionPress(messageId, emoji, reactions);
  }, [handleReactionPress]);

  const createAddReactionHandler = useCallback((messageId: string, reactions: any[]) => {
    return (emoji: string) => handleAddReaction(messageId, emoji, reactions);
  }, [handleAddReaction]);

  const renderMessage = useCallback(({
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
        {message.type === 'poll' && message.poll ? (
          <PollBubble
            poll={{
              id: message.poll.id,
              question: message.poll.question,
              options: message.poll.options,
              allowMultiple: message.poll.allowMultiple || false,
              expiresAt: message.poll.expiresAt,
              votes: message.poll.votes || [],
            }}
            currentUserId={currentProfile?.id || ''}
            onVote={createVoteHandler(message.poll.id, message.poll.votes || [], message.poll.allowMultiple || false)}
            isOwnMessage={isOwnMessage}
            author={message.author}
            createdAt={new Date(message.createdAt)}
            showAuthor={showAuthor}
          />
        ) : (
          <MessageBubble
            content={message.content}
            author={message.author}
            createdAt={new Date(message.createdAt)}
            isOwnMessage={isOwnMessage}
            reactions={message.reactions || []}
            onReactionPress={createReactionHandler(message.id, message.reactions || [])}
            onAddReaction={createAddReactionHandler(message.id, message.reactions || [])}
            showTimestamp={false}
            showAuthor={showAuthor}
            imageUrl={resolvedImageUrl}
            onImagePress={handleImagePress}
          />
        )}
      </>
    );
  }, [
    messages,
    currentProfile?.id,
    shouldShowTimestamp,
    getFileUrl,
    colors.tabIconDefault,
    createVoteHandler,
    createReactionHandler,
    createAddReactionHandler,
    handleImagePress
  ]);

  const keyExtractor = useCallback((item: any) => item.id, []);

  // Simple spinner indicator for older messages
  const renderListHeaderComponent = useCallback(() => {
    if (!isLoadingOlder) return null;

    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={colors.tint} />
      </View>
    );
  }, [isLoadingOlder, colors.tint]);

  if (isLoading || !groupId) {
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
            keyExtractor={keyExtractor}
            style={styles.messageList}
            contentContainerStyle={styles.messageListContent}
            inverted={false}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            automaticallyAdjustKeyboardInsets={false}
            removeClippedSubviews={false}
            maxToRenderPerBatch={20}
            updateCellsBatchingPeriod={50}
            initialNumToRender={20}
            windowSize={10}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            onContentSizeChange={handleContentSizeChange}
            onLayout={() => {
              // Additional scroll attempt when layout completes
              if (!hasInitialScrolledRef.current && messages.length > 0) {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: false });
                }, 0);
              }
            }}
            ListHeaderComponent={renderListHeaderComponent}
          />

          <MessageInput
            onSendMessage={handleSendMessage}
            onSendPoll={handleSendPoll}
            members={members}
          />
        </KeyboardAvoidingView>

        {showScrollToBottom && (
          <TouchableOpacity
            style={[styles.scrollToBottomButton, { backgroundColor: colors.tint }]}
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
