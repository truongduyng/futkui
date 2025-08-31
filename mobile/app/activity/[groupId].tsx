import { MatchCard } from "@/components/chat/MatchCard";
import { PollBubble } from "@/components/chat/PollBubble";
import { Colors } from "@/constants/Colors";
import { useTheme } from '@/contexts/ThemeContext';
import { useInstantDB } from "@/hooks/useInstantDB";
import { useLocalSearchParams, useNavigation } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { useTranslation } from 'react-i18next';


export default function ActivityDetailsScreen() {
  const { t } = useTranslation();
  const params = useLocalSearchParams<{ groupId: string }>();
  const groupId = params?.groupId;
  const { isDark } = useTheme();
const colors = isDark ? Colors.dark : Colors.light;
  const navigation = useNavigation();

  const {
    useGroup,
    useMessages,
    useMatches,
    useProfile,
    useUserMembership,
    vote,
    closePoll,
    addOptionToPoll,
    rsvpToMatch,
    checkInToMatch,
    closeMatch,
  } = useInstantDB();

  const { data: groupData } = useGroup(groupId || "");
  const { data: messagesData } = useMessages(groupId || "", 1000);
  const { data: matchesData } = useMatches(groupId || "");
  const { data: profileData } = useProfile();
  const { data: membershipData } = useUserMembership(groupId || "");

  const [showActivePollsOnly, setShowActivePollsOnly] = useState(true);
  const [showActiveMatchesOnly, setShowActiveMatchesOnly] = useState(true);

  const group = groupData?.groups?.[0];
  const matches = matchesData?.matches || [];
  const currentProfile = profileData?.profiles?.[0];
  const userMembership = membershipData?.memberships?.[0];

  // Extract members for poll calculations
  const members = group?.memberships
    ?.map((membership) => ({
      id: membership.profile?.id || "",
      handle: membership.profile?.handle || "",
      displayName: membership.profile?.displayName,
    }))
    .filter((member) => member.id && member.handle) || [];

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

  // Filter polls based on toggle state
  const filteredPolls = polls.filter((poll) => {
    if (showActivePollsOnly) {
      if (poll.closedAt) return false;
      if (poll.expiresAt && poll.expiresAt < Date.now()) return false;
      return true;
    }
    return true; // Show all polls when toggle is off
  });

  // Filter matches based on toggle state
  const filteredMatches = matches.filter((match) => {
    if (showActiveMatchesOnly) {
      return match.isActive && match.matchDate > Date.now();
    }
    return true; // Show all matches when toggle is off
  });

  // Create sections for FlatList
  const sections = useMemo(() => {
    const data = [];

    // Polls section
    data.push({
      type: 'section',
      id: 'polls-header',
      sectionType: 'polls',
      title: showActivePollsOnly ? t('chat.activePolls') : t('chat.allPolls'),
      count: filteredPolls.length,
      showActiveOnly: showActivePollsOnly,
      setShowActiveOnly: setShowActivePollsOnly,
    });

    if (filteredPolls.length > 0) {
      filteredPolls.forEach((poll) => {
        data.push({
          type: 'poll',
          id: poll.id,
          data: poll,
        });
      });
    } else {
      data.push({
        type: 'empty',
        id: 'polls-empty',
        sectionType: 'polls',
        message: showActivePollsOnly ? t('chat.noActivePolls') : t('chat.noPolls'),
      });
    }

    // Matches section
    data.push({
      type: 'section',
      id: 'matches-header',
      sectionType: 'matches',
      title: showActiveMatchesOnly ? t('chat.upcomingMatches') : t('chat.allMatches'),
      count: filteredMatches.length,
      showActiveOnly: showActiveMatchesOnly,
      setShowActiveOnly: setShowActiveMatchesOnly,
    });

    if (filteredMatches.length > 0) {
      filteredMatches.forEach((match) => {
        data.push({
          type: 'match',
          id: match.id,
          data: match,
        });
      });
    } else {
      data.push({
        type: 'empty',
        id: 'matches-empty',
        sectionType: 'matches',
        message: showActiveMatchesOnly ? t('chat.noUpcomingMatches') : t('chat.noMatches'),
      });
    }

    return data;
  }, [filteredPolls, filteredMatches, showActivePollsOnly, showActiveMatchesOnly, t]);

  useEffect(() => {
    navigation.setOptions({
      title: t('chat.groupActivities'),
      headerBackTitle: t('common.back'),
      headerShown: true,
      headerStyle: {
        backgroundColor: colors.background,
      },
      headerTintColor: colors.tint,
      headerTitleStyle: {
        color: colors.text,
      },
    });
  }, [navigation, colors, t]);

  const renderItem = ({ item }: { item: any }) => {
    switch (item.type) {
      case 'section':
        return (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionIcon}>
              {item.sectionType === 'polls' ? '📊' : '⚽'}
            </Text>
            <View style={styles.titleWithBadge}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {item.title}
              </Text>
              <View style={[styles.badge, { backgroundColor: colors.tint }]}>
                <Text style={styles.badgeText}>{item.count}</Text>
              </View>
            </View>
            <View style={styles.sectionToggle}>
              <Switch
                value={item.showActiveOnly}
                onValueChange={item.setShowActiveOnly}
                trackColor={{ false: colors.tabIconDefault, true: colors.tint }}
                thumbColor={item.showActiveOnly ? 'white' : '#f4f3f4'}
                ios_backgroundColor={colors.tabIconDefault}
                style={styles.sectionSwitch}
              />
            </View>
          </View>
        );

      case 'poll':
        const poll = item.data;
        const isOwnPoll = poll.message?.author?.id === currentProfile?.id;
        return (
          <View style={styles.activityItem}>
            <PollBubble
              poll={{
                id: poll.id || '',
                question: poll.question || '',
                options: poll.options || [],
                allowMultiple: poll.allowMultiple || false,
                allowMembersToAddOptions: poll.allowMembersToAddOptions || false,
                expiresAt: poll.expiresAt,
                closedAt: poll.closedAt,
                votes: (poll.votes || []).filter((vote: { user: null; }): vote is any => vote.user != null),
              }}
              currentUserId={currentProfile?.id || ''}
              onVote={(optionId) => handleVote(poll.id || '', optionId, poll.votes || [], poll.allowMultiple || false)}
              onAddOption={(pollId, optionText) => handleAddOptionToPoll(pollId, optionText)}
              onClosePoll={handleClosePoll}
              isOwnMessage={isOwnPoll}
              author={poll.message?.author}
              createdAt={new Date(poll.message?.createdAt || Date.now())}
              showAuthor={!isOwnPoll}
              totalMembers={members.length}
            />
          </View>
        );

      case 'match':
        const match = item.data;
        const isOwnMatch = match.creator?.id === currentProfile?.id;
        const isCreator = match.creator?.id === currentProfile?.id;
        const isGroupAdmin = userMembership?.role === "admin";

        return (
          <View style={styles.activityItem}>
            <MatchCard
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
                rsvps: (match.rsvps || []).filter((rsvp: { user: null; response: string; }): rsvp is any =>
                  rsvp.user != null &&
                  (rsvp.response === 'yes' || rsvp.response === 'no' || rsvp.response === 'maybe')
                ),
                checkIns: (match.checkIns || []).filter((checkIn: { user: null; }): checkIn is any => checkIn.user != null),
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
          </View>
        );

      case 'empty':
        return (
          <View style={styles.emptySection}>
            <Text style={[styles.emptySectionText, { color: colors.tabIconDefault }]}>
              {item.message}
            </Text>
          </View>
        );

      default:
        return null;
    }
  };

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

  const handleAddOptionToPoll = async (pollId: string, optionText: string) => {
    if (!currentProfile) return;

    try {
      await addOptionToPoll(pollId, optionText);
    } catch (error) {
      console.error("Error adding option to poll:", error);
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
          {t('common.loading')}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={sections}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        removeClippedSubviews={true}
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={10}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 8,
  },
  scrollContent: {
    paddingBottom: 32,
    paddingTop: 12,
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
  },
  titleWithBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
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
  sectionToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginLeft: 8,
  },
  toggleLabel: {
    fontSize: 10,
    fontWeight: '500',
  },
  sectionSwitch: {
    transform: [{ scaleX: 0.7 }, { scaleY: 0.7 }],
  },
  emptySection: {
    paddingVertical: 32,
    alignItems: 'center',
  },
  emptySectionText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
});
