import { Colors } from "@/constants/Colors";
import React, { useCallback } from "react";
import { StyleSheet, Text, View } from "react-native";
import { MatchCard } from "./MatchCard";
import { MessageBubble } from "./MessageBubble";
import { PollBubble } from "./PollBubble";

interface ChatItemRendererProps {
  chatItems: any[];
  currentProfile?: {
    id: string;
    handle: string;
    displayName?: string;
  };
  group?: {
    id: string;
    adminId: string;
  };
  getFileUrl: (fileId: string) => string | undefined;
  stableHandleVote: (pollId: string, optionId: string, votes: any[], allowMultiple: boolean) => void;
  stableHandleClosePoll: (pollId: string) => void;
  stableHandleReaction: (messageId: string, emoji: string, reactions: any[]) => void;
  stableHandleAddReaction: (messageId: string, emoji: string, reactions: any[]) => void;
  handleImagePress: (imageUrl: string) => void;
  handleRsvp: (matchId: string, response: 'yes' | 'no' | 'maybe') => void;
  handleCheckIn: (matchId: string) => void;
  handleCloseMatch: (matchId: string) => void;
}

export function useChatItemRenderer({
  chatItems,
  currentProfile,
  group,
  getFileUrl,
  stableHandleVote,
  stableHandleClosePoll,
  stableHandleReaction,
  stableHandleAddReaction,
  handleImagePress,
  handleRsvp,
  handleCheckIn,
  handleCloseMatch,
}: ChatItemRendererProps) {
  const colors = Colors["light"];

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

    const resolvedImageUrl = message.imageUrl ? getFileUrl(message.imageUrl) : undefined;

    return (
      <>
        {message.type === 'poll' && message.poll ? (
          <PollBubble
            poll={{
              id: message.poll.id,
              question: message.poll.question,
              options: message.poll.options,
              allowMultiple: message.poll.allowMultiple || false,
              expiresAt: message.poll.expiresAt,
              closedAt: message.poll.closedAt,
              votes: message.poll.votes || [],
            }}
            currentUserId={currentProfile?.id || ''}
            onVote={(optionId) => stableHandleVote(message.poll.id, optionId, message.poll.votes || [], message.poll.allowMultiple || false)}
            onClosePoll={(pollId) => stableHandleClosePoll(pollId)}
            isOwnMessage={isOwnMessage}
            author={message.author}
            createdAt={new Date(message.createdAt)}
            showAuthor={showAuthor}
          />
        ) : message.type === 'match' && message.match ? (
          <MatchCard
            match={message.match}
            currentUserId={currentProfile?.id || ''}
            onRsvp={(response) => handleRsvp(message.match.id, response)}
            onCheckIn={() => handleCheckIn(message.match.id)}
            onCloseMatch={() => handleCloseMatch(message.match.id)}
            isOwnMessage={isOwnMessage}
            author={message.author}
            createdAt={new Date(message.createdAt)}
            showAuthor={showAuthor}
            isCreator={message.match?.creator?.id === currentProfile?.id}
            isGroupAdmin={group?.adminId === currentProfile?.id}
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
  }, [
    chatItems,
    currentProfile?.id,
    group?.adminId,
    shouldShowTimestamp,
    getFileUrl,
    colors.tabIconDefault,
    stableHandleVote,
    stableHandleClosePoll,
    stableHandleReaction,
    stableHandleAddReaction,
    handleImagePress,
    handleRsvp,
    handleCheckIn,
    handleCloseMatch
  ]);

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
