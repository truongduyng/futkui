import { Colors } from '@/constants/Colors';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface RsvpData {
  id: string;
  response: 'yes' | 'no' | 'maybe';
  user: {
    id: string;
    handle: string;
    displayName?: string;
  };
}

interface CheckInData {
  id: string;
  checkedInAt: number;
  user: {
    id: string;
    handle: string;
    displayName?: string;
  };
}

interface MatchData {
  id: string;
  title: string;
  description: string;
  gameType: string;
  location: string;
  matchDate: number;
  createdAt: number;
  isActive: boolean;
  closedAt?: number;
  rsvps: RsvpData[];
  checkIns: CheckInData[];
  creator: {
    id: string;
    handle: string;
    displayName?: string;
  };
}

interface MatchCardProps {
  match: MatchData;
  currentUserId: string;
  onRsvp: (response: 'yes' | 'no' | 'maybe') => void;
  onCheckIn: () => void;
  onCloseMatch?: () => void;
  isOwnMessage: boolean;
  author?: {
    id: string;
    handle: string;
    displayName?: string;
  };
  createdAt: Date;
  showAuthor?: boolean;
  isCreator?: boolean;
  isGroupAdmin?: boolean;
}


export const MatchCard = React.memo(function MatchCard({
  match,
  currentUserId,
  onRsvp,
  onCheckIn,
  onCloseMatch,
  isOwnMessage,
  author,
  createdAt,
  showAuthor = true,
  isCreator = false,
  isGroupAdmin = false,
}: MatchCardProps) {
  const colors = Colors['light'];

  const matchDateTime = new Date(match.matchDate);
  const isMatchToday = new Date().toDateString() === matchDateTime.toDateString();
  const isMatchPast = match.matchDate < Date.now();
  const isMatchClosed = match.closedAt !== undefined;

  // Show close button if user is creator or group admin, match is not closed, and match is not past
  const canCloseMatch = (isCreator || isGroupAdmin) && !isMatchClosed && !isMatchPast && onCloseMatch;

  // Checkin window: 15 minutes before match to 2 hours after match
  const now = Date.now();
  const fifteenMinBeforeMatch = match.matchDate - (15 * 60 * 1000); // 15 minutes in milliseconds
  const twoHoursAfterMatch = match.matchDate + (2 * 60 * 60 * 1000); // 2 hours in milliseconds
  const isInCheckinWindow = now >= fifteenMinBeforeMatch && now <= twoHoursAfterMatch;

  // Calculate RSVP counts
  const rsvpCounts = match.rsvps.reduce((acc, rsvp) => {
    acc[rsvp.response] = (acc[rsvp.response] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const userRsvp = match.rsvps.find(rsvp => rsvp.user.id === currentUserId);
  const userCheckedIn = match.checkIns.some(checkIn => checkIn.user.id === currentUserId);

  const formatDate = (date: Date) => {
    return date.toLocaleDateString([], {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatTimeAgo = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRsvpButtonStyle = (response: 'yes' | 'no' | 'maybe') => {
    const isSelected = userRsvp?.response === response;
    let backgroundColor = '#D1D5DB';
    let borderColor = '#D1D5DB';
    let textColor = colors.text;

    if (isSelected) {
      switch (response) {
        case 'yes':
          backgroundColor = '#22C55E';
          borderColor = '#22C55E';
          textColor = 'white';
          break;
        case 'no':
          backgroundColor = '#EF4444';
          borderColor = '#EF4444';
          textColor = 'white';
          break;
        case 'maybe':
          backgroundColor = '#F59E0B';
          borderColor = '#F59E0B';
          textColor = 'white';
          break;
      }
    }

    return { backgroundColor, borderColor, textColor };
  };

  const canCheckIn = isInCheckinWindow && match.isActive && !userCheckedIn && !isMatchClosed;
  const showCheckIn = isInCheckinWindow && match.isActive && !isMatchClosed;

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
          styles.matchCard,
          isOwnMessage
            ? [styles.ownBubble, { backgroundColor: colors.tint }]
            : [styles.otherBubble, { backgroundColor: "#F0F0F0" }],
        ]}
      >
        {/* Header */}
        <View style={styles.matchHeader}>
          <View style={styles.titleRow}>
            <View style={styles.titleContent}>
              <Text style={styles.gameTypeEmoji}>⚽</Text>
              <Text
                style={[
                  styles.matchTitle,
                  isOwnMessage ? styles.ownText : { color: colors.text },
                ]}
              >
                Match Event
              </Text>
            </View>
            {canCloseMatch && (
              <TouchableOpacity
                onPress={onCloseMatch}
                style={[
                  styles.closeButton,
                  { backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }
                ]}
              >
                <Text style={[
                  styles.closeButtonText,
                  { color: isOwnMessage ? 'white' : colors.text }
                ]}>
                  Close
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Match Info */}
        <View style={styles.matchInfo}>
          <View style={styles.infoRow}>
            <Ionicons
              name="calendar"
              size={14}
              color={isOwnMessage ? 'white' : colors.tabIconDefault}
            />
            <Text style={[
              styles.infoText,
              isOwnMessage ? styles.ownText : { color: colors.text }
            ]}>
              {formatDate(matchDateTime)} at {formatTime(matchDateTime)}
              {isMatchToday && (
                <Text style={[styles.todayBadge, { color: isOwnMessage ? '#FFD700' : '#22C55E' }]}>
                  {' '}• TODAY
                </Text>
              )}
            </Text>
          </View>
        </View>

        {/* Description */}
        <Text style={[
          styles.description,
          isOwnMessage ? styles.ownText : { color: colors.text }
        ]}>
          {match.description}
        </Text>

        {/* RSVP Section */}
        {!isMatchPast && !isMatchClosed && (
          <View style={styles.rsvpSection}>
            <Text style={[
              styles.sectionTitle,
              isOwnMessage ? styles.ownText : { color: colors.text }
            ]}>
              Your Response
            </Text>
            <View style={styles.rsvpButtons}>
              {(['yes', 'no', 'maybe'] as const).map((response) => {
                const buttonStyle = getRsvpButtonStyle(response);
                return (
                  <TouchableOpacity
                    key={response}
                    style={[
                      styles.rsvpButton,
                      {
                        backgroundColor: buttonStyle.backgroundColor,
                        borderColor: buttonStyle.borderColor,
                      },
                    ]}
                    onPress={() => onRsvp(response)}
                  >
                    <Text style={[styles.rsvpButtonText, { color: buttonStyle.textColor }]}>
                      {response === 'yes' ? '✓ Yes' : response === 'no' ? '✗ No' : '? Maybe'}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Check-in Section */}
        {showCheckIn && (
          <View style={styles.checkInSection}>
            <Text style={[
              styles.sectionTitle,
              isOwnMessage ? styles.ownText : { color: colors.text }
            ]}>
              Match Day Check-in
            </Text>
            {userCheckedIn ? (
              <View style={[styles.checkedInBadge, { backgroundColor: '#22C55E' }]}>
                <Ionicons name="checkmark-circle" size={16} color="white" />
                <Text style={styles.checkedInText}>Checked In!</Text>
              </View>
            ) : canCheckIn ? (
              <TouchableOpacity
                style={[styles.checkInButton, { backgroundColor: '#22C55E' }]}
                onPress={onCheckIn}
              >
                <Ionicons name="log-in" size={16} color="white" />
                <Text style={styles.checkInButtonText}>Check In</Text>
              </TouchableOpacity>
            ) : (
              <Text style={[
                styles.checkInDisabled,
                isOwnMessage ? styles.ownText : { color: colors.tabIconDefault }
              ]}>
                Check-in not available
              </Text>
            )}
          </View>
        )}

        {/* RSVP Summary */}
        <View style={styles.rsvpSummary}>
          <View style={styles.summaryHeader}>
            <Text style={[
              styles.summaryTitle,
              isOwnMessage ? styles.ownText : { color: colors.text }
            ]}>
              Responses ({match.rsvps.length} total)
            </Text>
            {isMatchClosed && (
              <Text style={[
                styles.closedText,
                isOwnMessage ? styles.ownText : { color: colors.tabIconDefault }
              ]}>
                Match closed
              </Text>
            )}
          </View>
          <View style={styles.rsvpCounts}>
            {Object.entries(rsvpCounts).map(([response, count]) => (
              <View key={response} style={styles.rsvpCount}>
                <Text style={[
                  styles.rsvpCountEmoji,
                  { color: isOwnMessage ? 'white' : colors.text }
                ]}>
                  {response === 'yes' ? '✓' : response === 'no' ? '✗' : '?'}
                </Text>
                <Text style={[
                  styles.rsvpCountText,
                  isOwnMessage ? styles.ownText : { color: colors.tabIconDefault }
                ]}>
                  {count}
                </Text>
              </View>
            ))}
            {match.checkIns.length > 0 && (
              <View style={styles.rsvpCount}>
                <Ionicons
                  name="checkmark-circle"
                  size={12}
                  color={isOwnMessage ? 'white' : colors.text}
                />
                <Text style={[
                  styles.rsvpCountText,
                  isOwnMessage ? styles.ownText : { color: colors.tabIconDefault }
                ]}>
                  {match.checkIns.length} checked in
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <View style={styles.messageFooter}>
        <Text style={[styles.timeText, { color: colors.tabIconDefault }]}>
          {formatTimeAgo(createdAt)}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: "90%",
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
  matchCard: {
    borderRadius: 18,
    padding: 16,
    minWidth: 300,
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
  matchHeader: {
    marginBottom: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  titleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  gameTypeEmoji: {
    fontSize: 20,
    marginRight: 8,
  },
  matchTitle: {
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 22,
    flex: 1,
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
  matchInfo: {
    marginBottom: 12,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  infoText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
  todayBadge: {
    fontWeight: '700',
    fontSize: 12,
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  rsvpSection: {
    marginBottom: 16,
  },
  checkInSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  rsvpButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  rsvpButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    alignItems: 'center',
  },
  rsvpButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  checkInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    gap: 6,
  },
  checkInButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  checkedInBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  checkedInText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  checkInDisabled: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  rsvpSummary: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
    paddingTop: 12,
  },
  summaryHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryTitle: {
    fontSize: 12,
    fontWeight: '600',
  },
  closedText: {
    fontSize: 11,
    fontStyle: 'italic',
  },
  rsvpCounts: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  rsvpCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rsvpCountEmoji: {
    fontSize: 12,
    fontWeight: '600',
  },
  rsvpCountText: {
    fontSize: 11,
    fontWeight: '500',
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
