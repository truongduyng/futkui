import { Colors } from "@/constants/Colors";
import { useRouter } from "expo-router";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTranslation } from 'react-i18next';

interface Poll {
  id?: string;
  question?: string;
  closedAt?: number;
  expiresAt?: number;
  message: {
    group: {
      id: string;
    };
  };
}

interface Match {
  id: string;
  title: string;
  matchDate: number;
  isActive: boolean;
}

interface ActivityBarProps {
  polls: Poll[];
  matches: Match[];
  groupId: string;
}

export function ActivityBar({ polls, matches, groupId }: ActivityBarProps) {
  const { t } = useTranslation();
  const colors = Colors["light"];
  const router = useRouter();

  // Filter active polls (not closed and not expired)
  const activePolls = polls.filter((poll) => {
    if (!poll.id || !poll.question) return false;
    if (poll.closedAt) return false;
    if (poll.expiresAt && poll.expiresAt < Date.now()) return false;
    return true;
  });

  // Filter upcoming matches (active and in the future)
  const upcomingMatches = matches.filter((match) => {
    return match.isActive && match.matchDate > Date.now();
  });

  const totalActivities = activePolls.length + upcomingMatches.length;

  if (totalActivities === 0) {
    return null;
  }

  const handlePress = () => {
    router.push(`/activity/${groupId}`);
  };

  const getActivityText = () => {
    const parts: string[] = [];

    if (activePolls.length > 0) {
      const pollText = activePolls.length === 1 ? t('chat.activePoll') : t('chat.activePolls');
      parts.push(`${activePolls.length} ${pollText}`);
    }

    if (upcomingMatches.length > 0) {
      const matchText = upcomingMatches.length === 1 ? t('chat.upcomingMatch') : t('chat.upcomingMatches');
      parts.push(`${upcomingMatches.length} ${matchText}`);
    }

    return parts.join(' · ');
  };

  return (
    <TouchableOpacity
      style={[styles.container, { backgroundColor: colors.tint }]}
      onPress={handlePress}
      activeOpacity={0.8}
    >
      <View style={styles.content}>
        <View style={styles.leftContent}>
          <Text style={styles.activityIcon}>🎯</Text>
          <Text style={[styles.activityText, { color: 'white' }]}>
            {getActivityText()}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginTop: 8,
    borderRadius: 8,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    opacity: 0.85,
  },
  content: {
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  activityIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  activityText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  rightContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tapText: {
    fontSize: 13,
    fontWeight: '500',
    marginRight: 4,
  },
  chevron: {
    fontSize: 18,
    fontWeight: '600',
  },
});
