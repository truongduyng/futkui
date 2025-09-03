import { Colors } from "@/constants/Colors";
import { useTheme } from '@/contexts/ThemeContext';
import React, { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MatchCard } from "./MatchCard";
import { MessageBubble } from "./MessageBubble";
import { PollBubble } from "./PollBubble";
import { DuesBubble } from "./DuesBubble";

interface ChatItemRendererProps {
  chatItems: any[];
  expenses: any[];
  currentProfile?: {
    id: string;
    handle: string;
    displayName?: string;
  };
  group?: {
    id: string;
    creatorId: string;
  };
  userMembership?: {
    role?: string;
  };
  totalMembers: number;
  stableHandleVote: (pollId: string, optionId: string, votes: any[], allowMultiple: boolean) => void;
  stableHandleClosePoll: (pollId: string) => void;
  handleAddOptionToPoll: (pollId: string, optionText: string) => void;
  stableHandleReaction: (messageId: string, emoji: string, reactions: any[]) => void;
  stableHandleAddReaction: (messageId: string, emoji: string, reactions: any[]) => void;
  handleImagePress: (imageUrl: string) => void;
  handleRsvp: (matchId: string, response: 'yes' | 'no' | 'maybe') => void;
  handleCheckIn: (matchId: string) => void;
  handleUnCheckIn: (matchId: string) => void;
  handleCloseMatch: (matchId: string) => void;
  handleAddExpense: (matchId: string, amount: number, billImageUrl?: string, note?: string) => void;
  handleEditExpense: (expenseId: string, amount: number, billImageUrl?: string, note?: string) => void;
  handleReportMessage: (messageId: string, reason: string, description: string) => void;
  handleDeleteMessage: (messageId: string) => void;
  handleSubmitDuesPayment: (cycleId: string, billImageUri?: string) => Promise<void>;
  handleUpdateDuesMemberStatus: (cycleId: string, profileId: string, status: string) => Promise<void>;
  handleCloseDuesCycle?: (cycleId: string) => Promise<void>;
}

export function useChatItemRenderer({
  chatItems,
  expenses,
  currentProfile,
  userMembership,
  totalMembers,
  stableHandleVote,
  stableHandleClosePoll,
  handleAddOptionToPoll,
  stableHandleReaction,
  stableHandleAddReaction,
  handleImagePress,
  handleRsvp,
  handleCheckIn,
  handleUnCheckIn,
  handleCloseMatch,
  handleAddExpense,
  handleEditExpense,
  handleReportMessage,
  handleDeleteMessage,
  handleSubmitDuesPayment,
  handleUpdateDuesMemberStatus,
  handleCloseDuesCycle,
}: ChatItemRendererProps) {
  const { isDark } = useTheme();
const colors = isDark ? Colors.dark : Colors.light;

  const shouldShowTimestamp = useCallback((
    currentMessage: any,
    previousMessage: any,
    isFirstMessage: boolean,
    totalMessages: number,
  ): boolean => {
    // Don't show timestamp for the first message (newest) unless there are no other messages
    if (isFirstMessage && totalMessages > 1) return false;

    if (!previousMessage) return true;

    // Show timestamp if messages are more than 15 minutes apart
    // Note: In inverted list, previousMessage (index+1) is actually older than currentMessage
    const timeDifference = currentMessage.createdAt - previousMessage.createdAt;
    const fifteenMinutes = 15 * 60 * 1000; // 15 minutes in milliseconds

    return timeDifference >= fifteenMinutes;
  }, []);

  const renderChatItem = useCallback(({
    item,
    index,
  }: {
    item: any;
    index: number;
  }) => {
    // Since matches are now linked to messages, we don't need separate match item handling

    // Handle message items
    const message = item;
    const isOwnMessage = message.author?.id === currentProfile?.id;
    const previousItem = index > 0 ? chatItems[index + 1] : null;
    const showTimestamp = shouldShowTimestamp(message, previousItem, index === 0, chatItems.length);

    // Check if this message is from the same author as the previous message
    const previousAuthorId = (previousItem as any)?.author?.id || (previousItem as any)?.creator?.id;
    const showAuthor =
      !previousItem ||
      previousAuthorId !== message.author?.id;

    const resolvedImageUrl = message.imageUrl;

    return (
      <>
        {message.type === 'poll' && message.poll ? (
          <PollBubble
            poll={{
              id: message.poll.id,
              question: message.poll.question,
              options: message.poll.options,
              allowMultiple: message.poll.allowMultiple || false,
              allowMembersToAddOptions: message.poll.allowMembersToAddOptions || false,
              expiresAt: message.poll.expiresAt,
              closedAt: message.poll.closedAt,
              votes: message.poll.votes || [],
            }}
            currentUserId={currentProfile?.id || ''}
            onVote={(optionId) => stableHandleVote(message.poll.id, optionId, message.poll.votes || [], message.poll.allowMultiple || false)}
            onAddOption={(pollId, optionText) => handleAddOptionToPoll(pollId, optionText)}
            onClosePoll={(pollId) => stableHandleClosePoll(pollId)}
            isOwnMessage={isOwnMessage}
            author={message.author}
            createdAt={new Date(message.createdAt)}
            showAuthor={showAuthor}
            totalMembers={totalMembers}
          />
        ) : message.type === 'match' && message.match ? (
          (() => {
            // Filter expenses for this specific match
            const matchExpenses = expenses.filter(expense => expense.refId === message.match.id);
            
            return (
              <MatchCard
                match={message.match}
                expenses={matchExpenses}
                currentUserId={currentProfile?.id || ''}
                onRsvp={(response) => handleRsvp(message.match.id, response)}
                onCheckIn={() => handleCheckIn(message.match.id)}
                onUnCheckIn={() => handleUnCheckIn(message.match.id)}
                onCloseMatch={() => handleCloseMatch(message.match.id)}
                onAddExpense={(amount, billImageUrl, note) => handleAddExpense(message.match.id, amount, billImageUrl, note)}
                onEditExpense={(expenseId, amount, billImageUrl, note) => handleEditExpense(expenseId, amount, billImageUrl, note)}
                isOwnMessage={isOwnMessage}
                author={message.author}
                createdAt={new Date(message.createdAt)}
                showAuthor={showAuthor}
                isCreator={message.match?.creator?.id === currentProfile?.id}
                isGroupAdmin={userMembership?.role === "admin"}
              />
            );
          })()
        ) : message.type === 'dues' && message.duesCycle ? (
          <DuesBubble
            duesCycle={{
              id: message.duesCycle.id,
              periodKey: message.duesCycle.periodKey,
              amountPerMember: message.duesCycle.amountPerMember,
              status: message.duesCycle.status,
              deadline: message.duesCycle.deadline,
              createdAt: message.duesCycle.createdAt,
              duesMembers: message.duesCycle.duesMembers || [],
            }}
            currentUserId={currentProfile?.id || ''}
            onSubmitPayment={handleSubmitDuesPayment}
            onUpdateMemberStatus={handleUpdateDuesMemberStatus}
            onCloseCycle={handleCloseDuesCycle}
            isOwnMessage={isOwnMessage}
            isAdmin={userMembership?.role === "admin"}
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
            onReactionPress={(emoji) => stableHandleReaction(message.id, emoji, message.reactions || [])}
            onAddReaction={(emoji) => stableHandleAddReaction(message.id, emoji, message.reactions || [])}
            showTimestamp={false}
            showAuthor={showAuthor}
            imageUrl={resolvedImageUrl}
            onImagePress={handleImagePress}
            messageId={message.id}
            onReportMessage={handleReportMessage}
            onDeleteMessage={handleDeleteMessage}
          />
        )}
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
      </>
    );
  }, [currentProfile?.id, chatItems, expenses, shouldShowTimestamp, totalMembers, userMembership?.role, handleImagePress, handleReportMessage, handleDeleteMessage, colors.tabIconDefault, stableHandleVote, handleAddOptionToPoll, stableHandleClosePoll, handleRsvp, handleCheckIn, handleUnCheckIn, handleCloseMatch, handleAddExpense, handleEditExpense, stableHandleReaction, stableHandleAddReaction, handleSubmitDuesPayment, handleUpdateDuesMemberStatus, handleCloseDuesCycle]);

  const keyExtractor = useCallback((item: any) => item.id, []);

  return { renderChatItem, keyExtractor };
}

const styles = StyleSheet.create({
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
