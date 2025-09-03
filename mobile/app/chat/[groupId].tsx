import { ActivityBar } from "@/components/chat/ActivityBar";
import { useChatItemRenderer } from "@/components/chat/ChatItemRenderer";
import { ImageModal } from "@/components/chat/ImageModal";
import { LoadingHeader } from "@/components/chat/LoadingHeader";
import { LoadingStates } from "@/components/chat/LoadingStates";
import { MessageInput } from "@/components/chat/MessageInput";
import { Colors } from "@/constants/Colors";
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { useChatData } from "@/hooks/useChatData";
import { useChatHandlers } from "@/hooks/useChatHandlers";
import { useChatScroll } from "@/hooks/useChatScroll";
import { useInstantDB } from "@/hooks/useInstantDB";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useTranslation } from 'react-i18next';
import * as Clipboard from "expo-clipboard";
import { useToast } from "@/hooks/useToast";
import AsyncStorage from '@react-native-async-storage/async-storage';
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
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { showSuccess, showError } = useToast();
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [messageLimit, setMessageLimit] = useState(500);
  const [reportedMessageIds, setReportedMessageIds] = useState<Set<string>>(new Set());

  const {
    useGroup,
    useMessages,
    useDuesCycles,
    useProfile,
    useUserMembership,
    createDuesCycle,
    submitDuesPayment,
    updateDuesMemberStatus,
    closeDuesCycle,
    sendMessage,
    sendPoll,
    vote,
    closePoll,
    addOptionToPoll,
    createMatch,
    rsvpToMatch,
    checkInToMatch,
    unCheckInFromMatch,
    closeMatch,
    addReaction,
    leaveGroup,
    markMessagesAsRead,
    reportMessage,
    useBlockedUsers,
    deleteMessage,
  } = useInstantDB();

  // Data queries
  const { data: groupData, isLoading: isLoadingGroup } = useGroup(groupId || "");
  const { data: messagesData, isLoading: isLoadingMessages } = useMessages(groupId || "", messageLimit);
  const { data: duesCyclesData } = useDuesCycles(groupId || "");
  const { data: profileData } = useProfile();
  const { data: membershipData } = useUserMembership(groupId || "");
  const { data: blockedData } = useBlockedUsers();

  const currentProfile = profileData?.profiles?.[0];
  const userMembership = membershipData?.memberships?.[0];
  const group = groupData?.groups?.[0];
  const duesCycles = duesCyclesData?.duesCycles || [];
  const isBotGroup = group?.creator?.handle === 'fk';

  // Get blocked profile IDs instead of user IDs
  const blockedProfileIds = useMemo(() =>
    blockedData?.blocks?.map((block: any) => block.blocked?.id).filter(Boolean) || [],
    [blockedData?.blocks]
  );

  // Share handler
  const handleShareGroup = useCallback(async () => {
    // Prevent sharing bot groups
    if (isBotGroup) {
      showError(t('common.error'), t('groupProfile.cannotShareBotGroup'));
      return;
    }

    if (group?.shareLink) {
      try {
        const shareMessage = `${t('groupProfile.joinGroupMessage', { groupName: group.name })}\n\n${group.shareLink}\n\n${t('groupProfile.downloadAppMessage')}\nhttps://futkui.com/download`;
        await Clipboard.setStringAsync(shareMessage);
        showSuccess(
          t('groupProfile.shareLinkCopied'),
          t('groupProfile.shareLinkCopiedMessage')
        );
      } catch (error) {
        console.error('Error copying share link:', error);
        showError(t('common.error'), t('groupProfile.shareError'));
      }
    }
  }, [group?.shareLink, group?.name, isBotGroup, t, showSuccess, showError]);

  // Process chat data
  const { messages: allMessages, polls, matches, hasMoreMessages } = useChatData({
    messagesData,
    groupId: groupId || "",
    messageLimit,
  });

  // Filter out reported messages and messages from blocked users
  const messages = useMemo(() =>
    allMessages
      .filter((message: any) => !reportedMessageIds.has(message.id))
      .filter((message: any) => !blockedProfileIds.includes(message.author?.id)),
    [allMessages, reportedMessageIds, blockedProfileIds]
  );


  // Extract members for mentions
  const members = useMemo(() =>
    group?.memberships
      ?.map((membership) => ({
        id: membership.profile?.id || "",
        handle: membership.profile?.handle || "",
        displayName: membership.profile?.displayName,
      }))
      .filter((member) => member.id && member.handle) || [],
    [group?.memberships]
  );

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

  // Load reported messages from AsyncStorage
  useEffect(() => {
    const loadReportedMessages = async () => {
      if (!currentProfile?.id || !groupId) return;

      try {
        const storageKey = `reportedMessages_${currentProfile.id}_${groupId}`;
        const stored = await AsyncStorage.getItem(storageKey);
        if (stored) {
          const reportedIds = JSON.parse(stored);
          setReportedMessageIds(new Set(reportedIds));
        }
      } catch (error) {
        console.error('Error loading reported messages:', error);
      }
    };

    loadReportedMessages();
  }, [currentProfile?.id, groupId]);

  // Save reported messages to AsyncStorage
  const saveReportedMessage = useCallback(async (messageId: string) => {
    if (!currentProfile?.id || !groupId) return;

    try {
      const newReportedIds = new Set([...reportedMessageIds, messageId]);
      setReportedMessageIds(newReportedIds);

      const storageKey = `reportedMessages_${currentProfile.id}_${groupId}`;
      await AsyncStorage.setItem(storageKey, JSON.stringify([...newReportedIds]));
    } catch (error) {
      console.error('Error saving reported message:', error);
    }
  }, [currentProfile?.id, groupId, reportedMessageIds]);

  // Report handler
  const handleReportMessage = useCallback(async (messageId: string, reason: string, description: string) => {
    if (!currentProfile?.id) {
      showError(t('hooks.sendMessage.errorTitle'), t('hooks.sendMessage.waitProfile'));
      return;
    }

    try {
      await reportMessage({
        messageId,
        reason,
        description,
        reporterId: currentProfile.id,
      });

      // Hide the reported message for the reporter
      await saveReportedMessage(messageId);
    } catch (error) {
      console.error('Failed to report message:', error);
      showError(t('report.error'), t('report.submitError'));
    }
  }, [currentProfile?.id, reportMessage, saveReportedMessage, showError, t]);

  // Delete handler
  const handleDeleteMessage = useCallback(async (messageId: string) => {
    try {
      await deleteMessage(messageId);
      showSuccess(t('chat.messageDeleted'), t('chat.messageDeletedSuccess'));
    } catch (error) {
      console.error('Failed to delete message:', error);
      showError(t('common.error'), t('chat.deleteError'));
    }
  }, [deleteMessage, showSuccess, showError, t]);

  // Event handlers
  const {
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
    handleUnCheckIn,
    handleCloseMatch,
    handleAddOptionToPoll,
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
    addOptionToPoll,
    rsvpToMatch,
    checkInToMatch,
    unCheckInFromMatch,
    closeMatch,
    leaveGroup,
    setIsNearBottom,
    setShowScrollToBottom,
    setSelectedImageUrl,
  });

  useEffect(() => {
    if (group) {
      navigation.setOptions({
        title: group.name,
        headerBackTitle: t('common.back'),
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.tint,
        headerTitleStyle: {
          color: colors.text,
        },
        headerRight: () => (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {!isBotGroup && (
              <TouchableOpacity
                onPress={handleShareGroup}
                style={{
                  minWidth: 44,
                  minHeight: 44,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
                activeOpacity={0.7}
              >
                <Ionicons name="share-outline" size={22} color={colors.tint} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              onPress={() => router.push(`/chat/${groupId}/profile`)}
              style={{
                minWidth: 44,
                minHeight: 44,
                justifyContent: 'center',
                alignItems: 'center',
              }}
              activeOpacity={0.7}
            >
              <Ionicons name="information-circle-outline" size={22} color={colors.tint} />
            </TouchableOpacity>
          </View>
        ),
      });
    }
  }, [group, colors, navigation, router, groupId, t, handleShareGroup, isBotGroup]);


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

  // Dues handlers
  const handleCreateDuesCycle = useCallback(async (duesData: {
    periodKey: string;
    amountPerMember: number;
    deadline: number;
  }) => {
    if (!currentProfile || !groupId) return;

    try {
      await createDuesCycle({
        ...duesData,
        groupId,
        creatorId: currentProfile.id,
        authorName: currentProfile.handle,
      });
      showSuccess(t('chat.duesCycleCreated') || 'Dues cycle created successfully');
    } catch (error) {
      console.error('Failed to create dues cycle:', error);
      showError(t('chat.failedToCreateCycle') || 'Failed to create dues cycle');
    }
  }, [createDuesCycle, currentProfile, groupId, showSuccess, showError, t]);

  const handleSubmitDuesPayment = useCallback(async (cycleId: string, billImageUri?: string) => {
    if (!currentProfile) return;

    try {
      await submitDuesPayment({
        cycleId,
        profileId: currentProfile.id,
        billImageUri,
      });

      showSuccess(t('chat.paymentSubmitted') || 'Payment submitted successfully');
    } catch (error) {
      console.error('Failed to submit payment:', error);
      showError(t('chat.failedToSubmitPayment') || 'Failed to submit payment');
    }
  }, [submitDuesPayment, currentProfile, showSuccess, showError, t]);

  const handleUpdateDuesMemberStatus = useCallback(async (cycleId: string, profileId: string, status: string) => {
    try {
      await updateDuesMemberStatus(cycleId, profileId, status);
      showSuccess(t('chat.statusUpdated') || 'Status updated successfully');
    } catch (error) {
      console.error('Failed to update member status:', error);
      showError(t('chat.failedToUpdateStatus') || 'Failed to update status');
    }
  }, [updateDuesMemberStatus, showSuccess, showError, t]);

  const handleCloseDuesCycle = useCallback(async (cycleId: string) => {
    try {
      await closeDuesCycle(cycleId);
      showSuccess(t('chat.duesCycleClosed') || 'Dues cycle closed');
    } catch (error) {
      console.error('Failed to close dues cycle:', error);
      showError('Failed to close dues cycle');
    }
  }, [closeDuesCycle, showSuccess, showError, t]);

  // Chat item rendering
  const { renderChatItem, keyExtractor } = useChatItemRenderer({
    chatItems: messages,
    currentProfile,
    group,
    userMembership,
    totalMembers: members.length,
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
    handleUnCheckIn,
    handleCloseMatch,
    handleAddOptionToPoll,
    handleReportMessage,
    handleDeleteMessage,
    handleSubmitDuesPayment,
    handleUpdateDuesMemberStatus,
    handleCloseDuesCycle,
  });

  // Loading states
  if (!groupId) return <LoadingStates type="loading" />;
  if (isLoadingGroup) return <LoadingStates type="loadingGroup" />;
  if (!group) return <LoadingStates type="groupNotFound" />;

  return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ActivityBar
          polls={polls}
          matches={matches}
          duesCycles={duesCycles}
          groupId={groupId || ""}
        />
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={insets.top + 25}
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
            onCreateDuesCycle={handleCreateDuesCycle}
            members={members}
            userMembership={userMembership}
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

