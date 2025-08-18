import { MatchCard } from "@/components/chat/MatchCard";
import { PollBubble } from "@/components/chat/PollBubble";
import { Colors } from "@/constants/Colors";
import { useInstantDB } from "@/hooks/useInstantDB";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

export default function ActivityDetailsScreen() {
  const params = useLocalSearchParams<{ groupId: string }>();
  const groupId = params?.groupId;
  const colors = Colors["light"];
  const navigation = useNavigation();

  const {
    useGroup,
    useMessages,
    useMatches,
    useProfile,
    vote,
    closePoll,
    rsvpToMatch,
    checkInToMatch,
    closeMatch,
  } = useInstantDB();

  const { data: groupData } = useGroup(groupId || "");
  const { data: messagesData } = useMessages(groupId || "", 1000);
  const { data: matchesData } = useMatches(groupId || "");
  const { data: profileData } = useProfile();

  const group = groupData?.groups?.[0];
  const matches = matchesData?.matches || [];
  const currentProfile = profileData?.profiles?.[0];

  // Get polls from messages
  const polls = useMemo(() => {
    const messageList = messagesData?.messages || [];
    return messageList
      .filter((message) => message.poll)
      .map((message) => ({
        ...message.poll,
        message,
      }));
  }, [messagesData?.messages]);

  // Filter active polls
  const activePolls = polls.filter((poll) => {
    if (poll.closedAt) return false;
    if (poll.expiresAt && poll.expiresAt < Date.now()) return false;
    return true;
  });

  // Filter upcoming matches
  const upcomingMatches = matches.filter((match) => {
    return match.isActive && match.matchDate > Date.now();
  });

  useEffect(() => {
    navigation.setOptions({
      title: "Group Activities",
      headerBackTitle: "Back",
      headerShown: true,
      headerStyle: {
        backgroundColor: colors.background,
      },
      headerTintColor: colors.tint,
      headerTitleStyle: {
        color: colors.text,
      },
    });
  }, [navigation, colors]);

  const handleVote = async (pollId: string, optionId: string, votes: any[], allowMultiple: boolean) => {
    if (!currentProfile) return;

    try {
      await vote({
        pollId,
        optionId,
        userId: currentProfile.id,
        existingVotes: votes,
        allowMultiple,
      });
    } catch (error) {
      console.error("Error voting:", error);
    }
  };

  const handleClosePoll = async (pollId: string) => {
    try {
      await closePoll(pollId);
    } catch (error) {
      console.error("Error closing poll:", error);
    }
  };

  const handleRsvp = async (matchId: string, response: 'yes' | 'no' | 'maybe') => {
    if (!currentProfile) return;

    try {
      const match = matches.find(m => m.id === matchId);
      const existingRsvps = match?.rsvps || [];

      await rsvpToMatch({
        matchId,
        userId: currentProfile.id,
        response,
        existingRsvps,
      });
    } catch (error) {
      console.error("Error RSVP:", error);
    }
  };

  const handleCheckIn = async (matchId: string) => {
    if (!currentProfile) return;

    try {
      await checkInToMatch({
        matchId,
        userId: currentProfile.id,
      });
    } catch (error) {
      console.error("Error check-in:", error);
    }
  };

  const handleCloseMatch = async (matchId: string) => {
    if (!currentProfile) return;

    try {
      await closeMatch(matchId);
    } catch (error) {
      console.error("Error closing match:", error);
    }
  };

  if (!groupId || !group) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Loading...
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Active Polls Section */}
        {activePolls.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>📊</Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Active Polls
              </Text>
              <View style={[styles.badge, { backgroundColor: colors.tint }]}>
                <Text style={styles.badgeText}>{activePolls.length}</Text>
              </View>
            </View>
          {activePolls.map((poll) => {
            const isOwnPoll = poll.message?.author?.id === currentProfile?.id;
            return (
              <PollBubble
                key={poll.id}
                poll={{
                  id: poll.id || '',
                  question: poll.question || '',
                  options: poll.options || [],
                  allowMultiple: poll.allowMultiple || false,
                  expiresAt: poll.expiresAt,
                  closedAt: poll.closedAt,
                  votes: (poll.votes || []).filter((vote): vote is any => vote.user != null),
                }}
                currentUserId={currentProfile?.id || ''}
                onVote={(optionId) => handleVote(poll.id || '', optionId, poll.votes || [], poll.allowMultiple || false)}
                onClosePoll={handleClosePoll}
                isOwnMessage={isOwnPoll}
                author={poll.message?.author}
                createdAt={new Date(poll.message?.createdAt || Date.now())}
                showAuthor={!isOwnPoll}
              />
            );
          })}
        </View>
      )}

        {/* Upcoming Matches Section */}
        {upcomingMatches.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionIcon}>⚽</Text>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Upcoming Matches
              </Text>
              <View style={[styles.badge, { backgroundColor: colors.tint }]}>
                <Text style={styles.badgeText}>{upcomingMatches.length}</Text>
              </View>
            </View>
          {upcomingMatches.map((match) => {
            const isOwnMatch = match.creator?.id === currentProfile?.id;
            const isCreator = match.creator?.id === currentProfile?.id;
            const isGroupAdmin = group?.adminId === currentProfile?.id;

            return (
              <MatchCard
                key={match.id}
                match={{
                  id: match.id,
                  title: match.title,
                  description: match.description,
                  gameType: match.gameType,
                  location: match.location,
                  matchDate: match.matchDate,
                  createdAt: match.createdAt,
                  isActive: match.isActive,
                  closedAt: match.closedAt,
                  rsvps: (match.rsvps || []).filter((rsvp): rsvp is any =>
                    rsvp.user != null &&
                    (rsvp.response === 'yes' || rsvp.response === 'no' || rsvp.response === 'maybe')
                  ),
                  checkIns: (match.checkIns || []).filter((checkIn): checkIn is any => checkIn.user != null),
                  creator: match.creator || { id: '', handle: 'Unknown', displayName: 'Unknown' },
                }}
                currentUserId={currentProfile?.id || ''}
                onRsvp={(response) => handleRsvp(match.id, response)}
                onCheckIn={() => handleCheckIn(match.id)}
                onCloseMatch={() => handleCloseMatch(match.id)}
                isOwnMessage={isOwnMatch}
                author={match.creator}
                createdAt={new Date(match.createdAt)}
                showAuthor={!isOwnMatch}
                isCreator={isCreator}
                isGroupAdmin={isGroupAdmin}
              />
            );
          })}
        </View>
      )}

        {/* Empty State */}
        {activePolls.length === 0 && upcomingMatches.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: colors.background }]}>
            <View style={styles.emptyStateIcon}>
              <Text style={styles.emptyStateEmoji}>🎯</Text>
            </View>
            <Text style={[styles.emptyStateText, { color: colors.text }]}>
              No Active Activities
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: colors.tabIconDefault }]}>
              Create a poll or match in the chat to see them here
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  mainTitle: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  section: {
    marginTop: 6,
    marginBottom: 32,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  sectionIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    flex: 1,
  },
  badge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingVertical: 64,
    minHeight: 400,
  },
  emptyStateIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(0,0,0,0.05)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  emptyStateEmoji: {
    fontSize: 32,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
  },
  activityItem: {
    marginBottom: 12,
  },
});
