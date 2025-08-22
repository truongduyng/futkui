import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';

interface PollOption {
  id: string;
  text: string;
}

interface Vote {
  id: string;
  optionId: string;
  user: {
    id: string;
    handle: string;
    displayName?: string;
  };
}

interface PollData {
  id: string;
  question: string;
  options: PollOption[];
  allowMultiple: boolean;
  expiresAt?: number;
  closedAt?: number;
  votes: Vote[];
}

interface PollBubbleProps {
  poll: PollData;
  currentUserId: string;
  onVote: (optionId: string) => void;
  onClosePoll?: (pollId: string) => void;
  isOwnMessage: boolean;
  author?: {
    id: string;
    handle: string;
    displayName?: string;
  };
  createdAt: Date;
  showAuthor?: boolean;
}

export const PollBubble = React.memo(function PollBubble({
  poll,
  currentUserId,
  onVote,
  onClosePoll,
  isOwnMessage,
  author,
  createdAt,
  showAuthor = true,
}: PollBubbleProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
const colors = isDark ? Colors.dark : Colors.light;

  // Calculate vote counts and user votes
  const voteCounts = poll.options.reduce((acc, option) => {
    acc[option.id] = poll.votes.filter(vote => vote.optionId === option.id).length;
    return acc;
  }, {} as Record<string, number>);

  const totalVotes = poll.votes.length;
  const userVotes = poll.votes.filter(vote => vote.user.id === currentUserId).map(vote => vote.optionId);

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getVotePercentage = (optionId: string) => {
    if (totalVotes === 0) return 0;
    return Math.round((voteCounts[optionId] / totalVotes) * 100);
  };

  const handleVotePress = (optionId: string) => {
    onVote(optionId);
  };

  const handleClosePoll = () => {
    if (onClosePoll) {
      onClosePoll(poll.id);
    }
  };

  const isExpired = (poll.expiresAt && poll.expiresAt < Date.now()) || !!poll.closedAt;
  const wasClosedManually = !!poll.closedAt;
  const isCreator = isOwnMessage && author?.id === currentUserId;

  const formatTimeRemaining = (expiresAt: number) => {
    const now = Date.now();
    const timeLeft = expiresAt - now;

    if (timeLeft <= 0) return t('chat.expired');

    const days = Math.floor(timeLeft / (24 * 60 * 60 * 1000));
    const hours = Math.floor((timeLeft % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
    const minutes = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

    if (days > 0) return `${days}d ${hours}h left`;
    if (hours > 0) return `${hours}h ${minutes}m left`;
    return `${minutes}m left`;
  };

  return (
    <View
      style={[
        styles.container,
        isOwnMessage ? styles.ownMessage : styles.otherMessage,
      ]}
    >
      {!isOwnMessage && showAuthor && (
        <Text style={[styles.authorName, { color: colors.text }]}>
          {author?.handle || t('chat.unknown')}
        </Text>
      )}

      <View
        style={[
          styles.pollBubble,
          isOwnMessage
            ? [styles.ownBubble, { backgroundColor: colors.tint }]
            : [styles.otherBubble, { backgroundColor: "#F0F0F0" }],
        ]}
      >
        <View style={styles.pollHeader}>
          <View style={styles.pollTitleRow}>
            <Text
              style={[
                styles.pollQuestion,
                isOwnMessage ? styles.ownText : { color: colors.text },
              ]}
            >
              {poll.question}
            </Text>
            {isCreator && !isExpired && onClosePoll && (
              <TouchableOpacity
                onPress={handleClosePoll}
                style={[
                  styles.closeButton,
                  { backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }
                ]}
              >
                <Text style={[
                  styles.closeButtonText,
                  { color: isOwnMessage ? 'white' : colors.text }
                ]}>
                  {t('chat.closePoll')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.pollMetaRow}>
            {poll.expiresAt && !wasClosedManually && (
              <Text style={[
                styles.expirationText,
                { color: isOwnMessage ? 'rgba(255,255,255,0.8)' : colors.tabIconDefault }
              ]}>
                {isExpired ? t('chat.expired') : formatTimeRemaining(poll.expiresAt)}
              </Text>
            )}
          </View>
        </View>

        <View style={styles.optionsContainer}>
          {poll.options.map((option) => {
            const voteCount = voteCounts[option.id] || 0;
            const percentage = getVotePercentage(option.id);
            const isVoted = userVotes.includes(option.id);
            const isDisabled = isExpired;

            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.optionButton,
                  isVoted ? styles.votedOption : null,
                  isDisabled ? styles.disabledOption : null,
                  {
                    backgroundColor: isVoted
                      ? (isOwnMessage ? 'rgba(255,255,255,0.3)' : colors.tint + '20')
                      : (isOwnMessage ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'),
                  },
                ]}
                onPress={() => handleVotePress(option.id)}
                disabled={isDisabled || false}
                activeOpacity={0.7}
              >
                <View style={styles.optionContent}>
                  <View style={styles.optionLeft}>
                    <View style={[
                      styles.optionIndicator,
                      poll.allowMultiple ? styles.squareIndicator : styles.circleIndicator,
                      {
                        backgroundColor: isVoted
                          ? (isOwnMessage ? 'white' : colors.tint)
                          : 'transparent',
                        borderColor: isOwnMessage ? 'white' : colors.tint,
                      }
                    ]}>
                      {isVoted && (
                        <Text style={[
                          styles.checkmark,
                          { color: isOwnMessage ? colors.tint : 'white' }
                        ]}>
                          ✓
                        </Text>
                      )}
                    </View>
                    <Text
                      style={[
                        styles.optionText,
                        isOwnMessage ? styles.ownText : { color: colors.text },
                      ]}
                    >
                      {option.text}
                    </Text>
                  </View>
                  <View style={styles.optionRight}>
                    <Text
                      style={[
                        styles.voteCount,
                        isOwnMessage ? styles.ownText : { color: colors.tabIconDefault },
                      ]}
                    >
                      {voteCount} {voteCount === 1 ? t('chat.vote') : t('chat.votes')}
                    </Text>
                    {totalVotes > 0 && (
                      <Text
                        style={[
                          styles.percentage,
                          isOwnMessage ? styles.ownText : { color: colors.tabIconDefault },
                        ]}
                      >
                        {percentage}%
                      </Text>
                    )}
                  </View>
                </View>
                {totalVotes > 0 && (
                  <View style={[
                    styles.progressBar,
                    { backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }
                  ]}>
                    <View
                      style={[
                        styles.progressFill,
                        {
                          width: `${percentage}%`,
                          backgroundColor: isOwnMessage ? 'white' : colors.tint,
                        },
                      ]}
                    />
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>

        <View style={styles.pollFooter}>
          <Text
            style={[
              styles.totalVotes,
              isOwnMessage ? styles.ownText : { color: colors.tabIconDefault },
            ]}
          >
            {totalVotes} {totalVotes === 1 ? t('chat.vote') : t('chat.votes')} {t('chat.total')}
          </Text>
          {isExpired && (
            <Text
              style={[
                styles.expiredText,
                isOwnMessage ? styles.ownText : { color: colors.tabIconDefault },
              ]}
            >
              {wasClosedManually ? t('chat.pollClosed') : t('chat.pollEnded')}
            </Text>
          )}
        </View>
      </View>

      <View style={styles.messageFooter}>
        <Text style={[styles.timeText, { color: colors.tabIconDefault }]}>
          {formatTime(createdAt)}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: "85%",
  },
  ownMessage: {
    alignSelf: "flex-end",
  },
  otherMessage: {
    alignSelf: "flex-start",
  },
  authorName: {
    fontSize: 12,
    marginBottom: 2,
    marginLeft: 8,
  },
  pollBubble: {
    borderRadius: 18,
    padding: 16,
    minWidth: 280,
  },
  ownBubble: {
    borderBottomRightRadius: 4,
  },
  otherBubble: {
    borderBottomLeftRadius: 4,
  },
  ownText: {
    color: "white",
  },
  pollHeader: {
    marginBottom: 16,
  },
  pollTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  pollMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  pollQuestion: {
    fontSize: 16,
    fontWeight: "600",
    lineHeight: 20,
    flex: 1,
    marginRight: 8,
  },
  closeButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  closeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  expirationText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  multipleTag: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  multipleTagText: {
    fontSize: 10,
    fontWeight: '500',
  },
  optionsContainer: {
    marginBottom: 12,
  },
  optionButton: {
    marginBottom: 8,
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  votedOption: {
    borderColor: 'rgba(255,255,255,0.3)',
  },
  disabledOption: {
    opacity: 0.6,
  },
  optionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionIndicator: {
    width: 18,
    height: 18,
    borderWidth: 2,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  squareIndicator: {
    borderRadius: 3,
  },
  circleIndicator: {
    borderRadius: 9,
  },
  checkmark: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  optionText: {
    fontSize: 14,
    flex: 1,
    lineHeight: 18,
  },
  optionRight: {
    alignItems: 'flex-end',
  },
  voteCount: {
    fontSize: 11,
    fontWeight: '500',
  },
  percentage: {
    fontSize: 10,
    fontWeight: '600',
  },
  progressBar: {
    height: 2,
    borderRadius: 1,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1,
  },
  pollFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalVotes: {
    fontSize: 11,
    fontWeight: '500',
  },
  expiredText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  messageFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginHorizontal: 8,
  },
  timeText: {
    fontSize: 10,
  },
});
