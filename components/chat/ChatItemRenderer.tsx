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
  getFileUrl: (fileId: string) => string | undefined;
  stableHandleVote: (pollId: string, optionId: string, votes: any[], allowMultiple: boolean) => void;
  stableHandleClosePoll: (pollId: string) => void;
  stableHandleReaction: (messageId: string, emoji: string, reactions: any[]) => void;
  stableHandleAddReaction: (messageId: string, emoji: string, reactions: any[]) => void;
  handleImagePress: (imageUrl: string) => void;
  handleRsvp: (matchId: string, response: 'yes' | 'no' | 'maybe') => void;
  handleCheckIn: (matchId: string) => void;
}

export function useChatItemRenderer({
  chatItems,
  currentProfile,
  getFileUrl,
  stableHandleVote,
  stableHandleClosePoll,
  stableHandleReaction,
  stableHandleAddReaction,
  handleImagePress,
  handleRsvp,
  handleCheckIn,
}: ChatItemRendererProps) {
  const colors = Colors["light"];

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

      const previousAuthorId = (previousItem as any)?.author?.id || (previousItem as any)?.creator?.id;
      const showAuthor = !previousItem ||
        previousAuthorId !== matchItem.creator?.id;

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
    const previousAuthorId = (previousItem as any)?.author?.id || (previousItem as any)?.creator?.id;
    const showAuthor =
      !previousItem ||
      previousAuthorId !== message.author?.id;

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
      </>
    );
  }, [
    chatItems,
    currentProfile?.id,
    shouldShowTimestamp,
    getFileUrl,
    colors.tabIconDefault,
    stableHandleVote,
    stableHandleClosePoll,
    stableHandleReaction,
    stableHandleAddReaction,
    handleImagePress,
    handleRsvp,
    handleCheckIn
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
