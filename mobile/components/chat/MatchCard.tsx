import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { AvatarStack } from './AvatarStack';
import { ExpenseBottomSheet } from './ExpenseBottomSheet';

interface RsvpData {
  id: string;
  response: 'yes' | 'no' | 'maybe';
  user: {
    id: string;
    handle: string;
    displayName?: string;
    avatarUrl: string;
  };
}

interface CheckInData {
  id: string;
  checkedInAt: number;
  user: {
    id: string;
    handle: string;
    displayName?: string;
    avatarUrl: string;
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

interface ExpenseData {
  id: string;
  amount: number;
  billImageUrl?: string;
  note?: string;
  createdAt: number;
  updatedAt: number;
  profile: {
    id: string;
    handle: string;
    displayName?: string;
  };
}

interface MatchCardProps {
  match: MatchData;
  currentUserId: string;
  expenses?: ExpenseData[];
  onRsvp: (response: 'yes' | 'no' | 'maybe') => void;
  onCheckIn: () => void;
  onUnCheckIn: () => void;
  onCloseMatch?: () => void;
  onAddExpense?: (amount: number, billImageUrl?: string | null, note?: string) => Promise<void>;
  onEditExpense?: (expenseId: string, amount: number, billImageUrl?: string | null, note?: string) => Promise<void>;
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
  expenses = [],
  onRsvp,
  onCheckIn,
  onUnCheckIn,
  onCloseMatch,
  onAddExpense,
  onEditExpense,
  isOwnMessage,
  author,
  createdAt,
  showAuthor = true,
  isCreator = false,
  isGroupAdmin = false,
}: MatchCardProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const [showExpenseSheet, setShowExpenseSheet] = React.useState(false);
  const [editingExpense, setEditingExpense] = React.useState<ExpenseData | null>(null);

  const matchDateTime = new Date(match.matchDate);
  const isMatchToday = new Date().toDateString() === matchDateTime.toDateString();
  const isMatchPast = match.matchDate < Date.now();
  const isMatchClosed = match.closedAt !== undefined;

  // Show close button if user is creator or group admin, match is not closed, and match is not past
  const canCloseMatch = (isCreator || isGroupAdmin) && !isMatchClosed && !isMatchPast && onCloseMatch;

  // Show expense button if user is creator or group admin and has expense callback, and no expense exists
  const existingExpense = expenses[0]; // Only one expense per match
  const canAddExpense = (isCreator || isGroupAdmin) && onAddExpense && !existingExpense;

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
    let backgroundColor = isDark ? '#3A3A3C' : '#E5E7EB';
    let borderColor = isDark ? '#3A3A3C' : '#E5E7EB';
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

  const handleExpenseSubmit = async (amount: number, billImageUrl?: string | null, note?: string) => {
    if (editingExpense && onEditExpense) {
      await onEditExpense(editingExpense.id, amount, billImageUrl, note);
    } else if (onAddExpense) {
      await onAddExpense(amount, billImageUrl, note);
    }
    setEditingExpense(null);
  };

  const handleEditExpense = (expense: ExpenseData) => {
    setEditingExpense(expense);
    setShowExpenseSheet(true);
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
          styles.matchCard,
          styles.cardStyle,
          isOwnMessage
            ? [styles.ownBubble, { backgroundColor: colors.tint }]
            : [styles.otherBubble, { backgroundColor: isDark ? '#2C2C2E' : '#F2F2F7' }],
          {
            shadowColor: isDark ? '#000' : '#000',
            elevation: isDark ? 8 : 4,
          }
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
                {t('chat.matchEvent')}
              </Text>
            </View>
            <View style={styles.headerButtons}>
              {canAddExpense && (
                <TouchableOpacity
                  onPress={() => setShowExpenseSheet(true)}
                  style={[
                    styles.actionButton,
                    { backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }
                  ]}
                >
                  <Ionicons
                    name="receipt"
                    size={14}
                    color={isOwnMessage ? 'white' : colors.text}
                  />
                  <Text style={[
                    styles.actionButtonText,
                    { color: isOwnMessage ? 'white' : colors.text }
                  ]}>
                    {t('expense.addExpense')}
                  </Text>
                </TouchableOpacity>
              )}
              {canCloseMatch && (
                <TouchableOpacity
                  onPress={onCloseMatch}
                  style={[
                    styles.actionButton,
                    { backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }
                  ]}
                >
                  <Text style={[
                    styles.actionButtonText,
                    { color: isOwnMessage ? 'white' : colors.text }
                  ]}>
                    {t('chat.close')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
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
                  {' '}• {t('chat.today')}
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
              {t('chat.yourResponse')}
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
                      {response === 'yes' ? `✓ ${t('chat.yes')}` : response === 'no' ? `✗ ${t('chat.no')}` : `? ${t('chat.maybe')}`}
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
              {t('chat.matchDayCheckIn')}
            </Text>
            {userCheckedIn ? (
              <TouchableOpacity
                style={[styles.unCheckInButton, { backgroundColor: '#EF4444' }]}
                onPress={onUnCheckIn}
              >
                <Ionicons name="log-out" size={16} color="white" />
                <Text style={styles.unCheckInButtonText}>{t('chat.unCheckIn')}</Text>
              </TouchableOpacity>
            ) : canCheckIn ? (
              <TouchableOpacity
                style={[styles.checkInButton, { backgroundColor: '#22C55E' }]}
                onPress={onCheckIn}
              >
                <Ionicons name="log-in" size={16} color="white" />
                <Text style={styles.checkInButtonText}>{t('chat.checkIn')}</Text>
              </TouchableOpacity>
            ) : (
              <Text style={[
                styles.checkInDisabled,
                isOwnMessage ? styles.ownText : { color: colors.tabIconDefault }
              ]}>
                {t('chat.checkInNotAvailable')}
              </Text>
            )}
          </View>
        )}

        {/* Expense Section */}
        {existingExpense && (
          <View style={styles.expensesSection}>
            <Text style={[
              styles.sectionTitle,
              isOwnMessage ? styles.ownText : { color: colors.text }
            ]}>
              {t('expense.expense')}
            </Text>
            <View style={styles.expenseItem}>
              <View style={styles.expenseHeader}>
                <View style={styles.expenseInfo}>
                  <Text style={[
                    styles.expenseAmount,
                    isOwnMessage ? styles.ownText : { color: colors.text }
                  ]}>
                    {existingExpense.amount}
                  </Text>
                </View>
                {(isCreator || isGroupAdmin) && onEditExpense && (
                  <TouchableOpacity
                    onPress={() => handleEditExpense(existingExpense)}
                    style={[styles.editExpenseButton, { backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }]}
                  >
                    <Ionicons
                      name="pencil"
                      size={13}
                      color={isOwnMessage ? 'rgba(255,255,255,0.8)' : colors.tabIconDefault}
                    />
                  </TouchableOpacity>
                )}
              </View>
              {existingExpense.note && (
                <Text style={[
                  styles.expenseNote,
                  isOwnMessage ? styles.ownText : { color: colors.tabIconDefault }
                ]}>
                  {existingExpense.note}
                </Text>
              )}
              {existingExpense.billImageUrl && (
                <View style={styles.billImageContainer}>
                  <Image
                    source={{ uri: existingExpense.billImageUrl }}
                    style={styles.billImagePreview}
                    resizeMode="cover"
                  />
                </View>
              )}
            </View>
          </View>
        )}

        {/* RSVP Summary */}
        <View style={styles.rsvpSummary}>
          <View style={styles.summaryHeader}>
            <Text style={[
              styles.summaryTitle,
              isOwnMessage ? styles.ownText : { color: colors.text }
            ]}>
              {t('chat.responses')} ({match.rsvps.length} {t('chat.total')})
            </Text>
            {isMatchClosed && (
              <Text style={[
                styles.closedText,
                isOwnMessage ? styles.ownText : { color: colors.tabIconDefault }
              ]}>
                {t('chat.matchClosed')}
              </Text>
            )}
          </View>

          {/* RSVP Responses */}
          <View style={styles.rsvpCounts}>
            {(['yes', 'no', 'maybe'] as const).map((response) => {
              const count = rsvpCounts[response] || 0;
              const responseUsers = match.rsvps.filter(rsvp => rsvp.response === response).map(rsvp => rsvp.user);

              if (count === 0) return null;

              return (
                <View key={response} style={styles.rsvpCountSection}>
                  <View style={styles.rsvpCount}>
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
                  {responseUsers.length > 0 && (
                    <View style={styles.rsvpAvatars}>
                      <AvatarStack
                        users={responseUsers}
                        maxVisible={3}
                        avatarSize={25}
                        overlap={6}
                        showCount={true}
                      />
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          {/* Check-in Status */}
          {match.checkIns.length > 0 && (
            <View style={styles.checkInSummary}>
              <View style={styles.rsvpCountSection}>
                <View style={styles.rsvpCount}>
                  <Ionicons
                    name="checkmark-circle"
                    size={14}
                    color={isOwnMessage ? 'white' : colors.text}
                  />
                  <Text style={[
                    styles.rsvpCountText,
                    isOwnMessage ? styles.ownText : { color: colors.tabIconDefault }
                  ]}>
                    {match.checkIns.length} {t('chat.checkedInCount')}
                  </Text>
                </View>
                <View style={styles.rsvpAvatars}>
                  <AvatarStack
                    users={match.checkIns.map(checkIn => checkIn.user)}
                    maxVisible={3}
                    avatarSize={25}
                    overlap={6}
                    showCount={true}
                  />
                </View>
              </View>
            </View>
          )}
        </View>
      </View>

      <View style={styles.messageFooter}>
        <Text style={[styles.timeText, { color: colors.tabIconDefault }]}>
          {formatTimeAgo(createdAt)}
        </Text>
      </View>

      <ExpenseBottomSheet
        isVisible={showExpenseSheet}
        onClose={() => {
          setShowExpenseSheet(false);
          setEditingExpense(null);
        }}
        onSubmit={handleExpenseSubmit}
        matchId={match.id}
        existingExpense={editingExpense}
      />
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
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
    borderRadius: 16,
    padding: 20,
    minWidth: 320,
    margin: 4,
    width: "100%",
  },
  cardStyle: {
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
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
    flexWrap: 'wrap',
  },
  titleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  gameTypeEmoji: {
    fontSize: 16,
    marginRight: 2,
  },
  matchTitle: {
    fontSize: 16,
    fontWeight: '600',
    lineHeight: 22,
    flex: 1,
  },
  headerButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
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
  expensesSection: {
    marginBottom: 16,
  },
  expenseItem: {
    marginBottom: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  expenseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  expenseInfo: {
    flex: 1,
  },
  expenseAmount: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  expenseAuthor: {
    fontSize: 12,
    fontWeight: '500',
  },
  expenseNote: {
    fontSize: 12,
    fontStyle: 'italic',
    marginTop: 4,
  },
  expenseBill: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    gap: 4,
  },
  expenseBillText: {
    fontSize: 12,
    fontWeight: '500',
  },
  editExpenseButton: {
    padding: 6,
    borderRadius: 12,
  },
  billImageContainer: {
    marginTop: 8,
    alignItems: 'center',
  },
  billImagePreview: {
    width: 200,
    height: 120,
    borderRadius: 8,
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
  unCheckInButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 6,
  },
  unCheckInButtonText: {
    color: 'white',
    fontSize: 12,
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
  checkInSummary: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
  },
  rsvpCountSection: {
    alignItems: 'center',
    gap: 6,
  },
  rsvpCount: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  rsvpAvatars: {
    alignItems: 'center',
  },
  rsvpCountEmoji: {
    fontSize: 12,
    fontWeight: '500',
  },
  rsvpCountText: {
    fontSize: 12,
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
