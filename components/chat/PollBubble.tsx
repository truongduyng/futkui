import { Colors } from '@/constants/Colors';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

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
  votes: Vote[];
}

interface PollBubbleProps {
  poll: PollData;
  currentUserId: string;
  onVote: (optionId: string) => void;
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
  isOwnMessage,
  author,
  createdAt,
  showAuthor = true,
}: PollBubbleProps) {
  const colors = Colors['light'];

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

  const isExpired = poll.expiresAt && poll.expiresAt < Date.now();

  return (
    <View
      style={[
        styles.container,
        isOwnMessage ? styles.ownMessage : styles.otherMessage,
      ]}
    >
      {!isOwnMessage && showAuthor && (
        <Text style={[styles.authorName, { color: colors.text }]}>
          {author?.handle || "Unknown"}
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
          <Text
            style={[
              styles.pollQuestion,
              isOwnMessage ? styles.ownText : { color: colors.text },
            ]}
          >
            {poll.question}
          </Text>
          {poll.allowMultiple && (
            <View style={[
              styles.multipleTag,
              { backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }
            ]}>
              <Text style={[
                styles.multipleTagText,
                { color: isOwnMessage ? 'white' : colors.text }
              ]}>
                Multiple choice
              </Text>
            </View>
          )}
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
                      {voteCount} {voteCount === 1 ? 'vote' : 'votes'}
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
            {totalVotes} {totalVotes === 1 ? 'vote' : 'votes'} total
          </Text>
          {isExpired && (
            <Text
              style={[
                styles.expiredText,
                isOwnMessage ? styles.ownText : { color: colors.tabIconDefault },
              ]}
            >
              Poll ended
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
  pollQuestion: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    lineHeight: 20,
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
    borderRadius: 9,
    borderWidth: 2,
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
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