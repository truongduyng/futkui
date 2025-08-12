import { AuthGate } from "@/components/AuthGate";
import { ImageModal } from "@/components/chat/ImageModal";
import { MatchCard } from "@/components/chat/MatchCard";
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
  const [messageLimit, setMessageLimit] = useState(10);
  const [isLoadingOlder, setIsLoadingOlder] = useState(false);

  const {
    useGroup,
    useMessages,
    useMatches,
    useProfile,
    useUserMembership,
    sendMessage,
    sendPoll,
    vote,
    createMatch,
    rsvpToMatch,
    checkInToMatch,
    addReaction,
    leaveGroup,
    instantClient,
  } = useInstantDB();

  // Separate queries for group info and messages
  const { data: groupData, isLoading: isLoadingGroup } = useGroup(groupId || "");
  const { data: messagesData, isLoading: isLoadingMessages } = useMessages(groupId || "", messageLimit);
  const { data: matchesData } = useMatches(groupId || "");

  const { data: profileData } = useProfile();
  const { data: membershipData } = useUserMembership(groupId || "");
  const { user } = instantClient.useAuth();
  const currentProfile = profileData?.profiles?.[0];
  const userMembership = membershipData?.memberships?.[0];

  const group = groupData?.groups?.[0];
  const matches = useMemo(() => matchesData?.matches || [], [matchesData?.matches]);
  // Reverse messages since we fetch newest first but display oldest first
  const messages = useMemo(() => {
    const msgs = messagesData?.messages || [];
    return [...msgs].reverse();
  }, [messagesData?.messages]);

  // Combine messages and matches for display, sorted by creation time
  const chatItems = useMemo(() => {
    const items = [
      ...messages.map(msg => ({ ...msg, itemType: 'message' })),
      ...matches.map(match => ({ ...match, itemType: 'match' }))
    ];
    return items.sort((a, b) => a.createdAt - b.createdAt);
  }, [messages, matches]);
  const files = useMemo(() => messagesData?.$files || [], [messagesData?.$files]);


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
    if (!isLoadingMessages && chatItems.length > 0 && !hasInitialScrolledRef.current) {
      // Multiple attempts with increasing delays to ensure content is rendered
      const scrollAttempts = [50, 150, 300, 500];

      scrollAttempts.forEach((delay) => {
        setTimeout(() => {
          flatListRef.current?.scrollToEnd({ animated: false });
        }, delay);
      });

      hasInitialScrolledRef.current = true;
    }
  }, [isLoadingMessages, chatItems.length]);

  // Additional scroll trigger when content size changes
  const handleContentSizeChange = useCallback(() => {
    if (!hasInitialScrolledRef.current && chatItems.length > 0) {
      // Immediate scroll when content size changes
      requestAnimationFrame(() => {
        flatListRef.current?.scrollToEnd({ animated: false });
      });
    }
  }, [chatItems.length]);

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

  // Handle new items (messages and matches - only scroll for truly new items, not reactions)
  useEffect(() => {
    const currentCount = chatItems.length;
    const lastCount = lastMessageCountRef.current;

    // Only trigger scroll behavior when item count actually increases
    if (lastCount > 0 && currentCount > lastCount) {
      const currentLastItemId = chatItems.length > 0 ? chatItems[chatItems.length - 1]?.id : '';
      const lastItemId = lastMessageIdRef.current;

      // Double check that we have a new item with a different ID
      if (currentLastItemId && currentLastItemId !== lastItemId) {
        // Check isNearBottom at the time of execution, not as a dependency
        if (isNearBottom) {
          // User is near bottom, scroll to new item without stealing focus
          requestAnimationFrame(() => {
            flatListRef.current?.scrollToEnd({ animated: false });
          });
        }
        // Update the last item ID only when we have a genuinely new item
        lastMessageIdRef.current = currentLastItemId;
      }
    }

    lastMessageCountRef.current = currentCount;
  }, [chatItems.length, chatItems, isNearBottom]);

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

      // Reset scroll state - let natural message update handle scrolling
      setIsNearBottom(true);
      setShowScrollToBottom(false);
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

      // Reset scroll state - let natural message update handle scrolling
      setIsNearBottom(true);
      setShowScrollToBottom(false);
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

  const handleCreateMatch = async (matchData: {
    title: string;
    description: string;
    gameType: string;
    location: string;
    matchDate: number;
  }) => {
    if (!groupId || !currentProfile) {
      Alert.alert("Error", "Please wait for your profile to load.");
      return;
    }

    try {
      await createMatch({
        groupId,
        title: matchData.title,
        description: matchData.description,
        gameType: matchData.gameType,
        location: matchData.location,
        matchDate: matchData.matchDate,
        creatorId: currentProfile.id,
      });

      // Reset scroll state - let natural message update handle scrolling
      setIsNearBottom(true);
      setShowScrollToBottom(false);
    } catch (error) {
      Alert.alert("Error", "Failed to create match. Please try again.");
      console.error("Error creating match:", error);
    }
  };

  const handleRsvp = useCallback(async (matchId: string, response: 'yes' | 'no' | 'maybe') => {
    if (!currentProfile) {
      Alert.alert("Error", "Please wait for your profile to load.");
      return;
    }

    try {
      const match = matches.find(m => m.id === matchId);
      await rsvpToMatch({
        matchId,
        userId: currentProfile.id,
        response,
        existingRsvps: (match as any)?.rsvps || [],
      });
    } catch (error) {
      Alert.alert("Error", "Failed to RSVP. Please try again.");
      console.error("Error RSVPing to match:", error);
    }
  }, [currentProfile, rsvpToMatch, matches]);

  const handleCheckIn = useCallback(async (matchId: string) => {
    if (!currentProfile) {
      Alert.alert("Error", "Please wait for your profile to load.");
      return;
    }

    try {
      await checkInToMatch({
        matchId,
        userId: currentProfile.id,
      });
      Alert.alert("Success", "You've checked in to the match!");
    } catch (error) {
      Alert.alert("Error", "Failed to check in. Please try again.");
      console.error("Error checking in to match:", error);
    }
  }, [currentProfile, checkInToMatch]);

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

  const renderChatItem = useCallback(({
    item,
    index,
  }: {
    item: any;
    index: number;
  }) => {
    // Handle match items
    if (item.itemType === 'match') {
      const matchItem = item as any; // Cast to any to access match properties
      const isOwnMatch = matchItem.creator?.id === currentProfile?.id;
      const previousItem = index > 0 ? chatItems[index - 1] : null;
      const showTimestamp = shouldShowTimestamp(item, previousItem);

      const showAuthor = !previousItem ||
        (previousItem as any).creator?.id !== matchItem.creator?.id ||
        (previousItem as any).author?.id !== matchItem.creator?.id ||
        showTimestamp;

      return (
        <>
          {showTimestamp && (
            <View style={styles.timestampHeader}>
              <Text
                style={[styles.timestampText, { color: colors.tabIconDefault }]}
              >
                {new Date(item.createdAt).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          )}
          <MatchCard
            match={matchItem}
            currentUserId={currentProfile?.id || ''}
            onRsvp={(response) => handleRsvp(matchItem.id, response)}
            onCheckIn={() => handleCheckIn(matchItem.id)}
            isOwnMessage={isOwnMatch}
            author={matchItem.creator}
            createdAt={new Date(matchItem.createdAt)}
            showAuthor={showAuthor}
          />
        </>
      );
    }

    // Handle message items
    const message = item;
    const isOwnMessage = message.author?.id === currentProfile?.id;
    const previousItem = index > 0 ? chatItems[index - 1] : null;
    const showTimestamp = shouldShowTimestamp(message, previousItem);

    // Check if this message is from the same author as the previous message
    const showAuthor =
      !previousItem ||
      (previousItem as any).author?.id !== message.author?.id ||
      (previousItem as any).creator?.id !== message.author?.id ||
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
    chatItems,
    currentProfile?.id,
    shouldShowTimestamp,
    getFileUrl,
    colors.tabIconDefault,
    createVoteHandler,
    createReactionHandler,
    createAddReactionHandler,
    handleImagePress,
    handleRsvp,
    handleCheckIn
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

  if (!groupId) {
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

  if (isLoadingGroup) {
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
            Loading group...
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
            Platform.OS === "ios" ? insets.top + 20 : 0
          }
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
              inverted={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              automaticallyAdjustKeyboardInsets={true}
              keyboardDismissMode="interactive"
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
                if (!hasInitialScrolledRef.current && chatItems.length > 0) {
                  setTimeout(() => {
                    flatListRef.current?.scrollToEnd({ animated: false });
                  }, 0);
                }
              }}
              ListHeaderComponent={renderListHeaderComponent}
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
