import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DuesPaymentModal } from './DuesPaymentModal';
import { DuesManagementModal } from './DuesManagementModal';
import { AvatarStack } from './AvatarStack';

interface DuesMember {
  id: string;
  status: string; // 'unpaid', 'pending', 'paid', 'overdue'
  profile: {
    id: string;
    handle: string;
    displayName?: string;
    avatarUrl?: string;
  };
  createdAt: number;
  updatedAt: number;
}

interface DuesCycleData {
  id: string;
  periodKey: string;
  amountPerMember: number;
  status: string; // 'active', 'closed'
  deadline: number;
  createdAt: number;
  duesMembers: DuesMember[];
}

interface DuesBubbleProps {
  duesCycle: DuesCycleData;
  currentUserId: string;
  onSubmitPayment: (cycleId: string, billImageUri?: string) => Promise<void>;
  onUpdateMemberStatus: (cycleId: string, profileId: string, status: string) => Promise<void>;
  onCloseCycle?: (cycleId: string) => Promise<void>;
  isOwnMessage: boolean;
  isAdmin: boolean;
  author?: {
    id: string;
    handle: string;
    displayName?: string;
  };
  createdAt: Date;
  showAuthor?: boolean;
}

export const DuesBubble = React.memo(function DuesBubble({
  duesCycle,
  currentUserId,
  onSubmitPayment,
  onUpdateMemberStatus,
  onCloseCycle,
  isOwnMessage,
  isAdmin,
  author,
  createdAt,
  showAuthor = true,
}: DuesBubbleProps) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showManagementModal, setShowManagementModal] = useState(false);

  // Calculate statistics
  const totalMembers = duesCycle.duesMembers.length;
  const memberStatuses = duesCycle.duesMembers.map(m => m.status || 'unpaid');
  const paidMembers = memberStatuses.filter(s => s === 'paid').length;

  const paymentProgress = totalMembers > 0 ? Math.round((paidMembers / totalMembers) * 100) : 0;

  // Get paid members for avatar display
  const paidMembersList = duesCycle.duesMembers
    .filter(m => m.status === 'paid')
    .map(m => ({
      id: m.profile.id,
      handle: m.profile.handle,
      displayName: m.profile.displayName,
      avatarUrl: m.profile.avatarUrl || `https://ui-avatars.com/api/?name=${m.profile.handle}&background=random&size=32`,
    }));

  // Find current user's payment status
  const currentUserMember = duesCycle.duesMembers.find(m => m.profile.id === currentUserId);
  const currentUserStatus = currentUserMember ? (currentUserMember.status || 'unpaid') : 'unpaid';

  const formatTime = (date: Date) => {
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatDeadline = (deadline: number) => {
    const isOverdue = deadline < Date.now();

    if (isOverdue) {
      return t('chat.overdue');
    }

    const timeDiff = deadline - Date.now();
    const daysDiff = Math.ceil(timeDiff / (24 * 60 * 60 * 1000));

    if (daysDiff <= 0) {
      return t('chat.dueToday');
    } else if (daysDiff === 1) {
      return t('chat.dueTomorrow');
    } else {
      return `${daysDiff} ${t('chat.daysLeft')}`;
    }
  };


  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return '#22C55E';
      case 'pending':
        return '#F59E0B';
      case 'overdue':
        return '#EF4444';
      default:
        return colors.accent;
    }
  };

  const handlePaymentPress = () => {
    if (currentUserStatus === 'paid') {
      Alert.alert(t('chat.alreadyPaid'), t('chat.paymentAlreadyConfirmed'));
      return;
    }
    setShowPaymentModal(true);
  };

  const handleManagementPress = () => {
    setShowManagementModal(true);
  };

  const isOverdue = duesCycle.deadline < Date.now();
  const isExpired = duesCycle.deadline < Date.now();
  const isClosed = duesCycle.status === 'closed';

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
          styles.duesBubble,
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
        <View style={styles.duesHeader}>
          <View style={styles.titleRow}>
            <Text
              style={[
                styles.duesTitle,
                isOwnMessage ? styles.ownText : { color: colors.text },
              ]}
            >
              💰 {duesCycle.periodKey}
            </Text>
            {isAdmin && (
              <TouchableOpacity
                onPress={handleManagementPress}
                style={[
                  styles.closeButton,
                  { backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }
                ]}
              >
                <Text style={[
                  styles.closeButtonText,
                  { color: isOwnMessage ? 'white' : colors.text }
                ]}>
                  {t('chat.manageDues')}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <Text
            style={[
              styles.amountText,
              isOwnMessage ? styles.ownText : { color: colors.text },
            ]}
          >
            {duesCycle.amountPerMember} {t('chat.perMember')}
          </Text>

          <Text
            style={[
              styles.deadlineText,
              { color: isOverdue ? '#EF4444' : (isOwnMessage ? 'rgba(255,255,255,0.8)' : colors.tabIconDefault) }
            ]}
          >
            {formatDeadline(duesCycle.deadline)}
          </Text>
        </View>

        {/* Progress */}
        <View style={styles.progressSection}>
          <View style={styles.progressRow}>
            <Text
              style={[
                styles.progressText,
                isOwnMessage ? styles.ownText : { color: colors.text },
              ]}
            >
              {paidMembers}/{totalMembers} {t('chat.paid')} ({paymentProgress}%)
            </Text>
          </View>

          <View style={[
            styles.progressBar,
            { backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }
          ]}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${paymentProgress}%`,
                  backgroundColor: isOwnMessage ? 'white' : colors.tint,
                },
              ]}
            />
          </View>

          {/* Paid Members Avatars */}
          {paidMembersList.length > 0 && (
            <View style={styles.paidMembersSection}>
              <View style={styles.paidMembersRow}>
                <AvatarStack
                  users={paidMembersList}
                  maxVisible={6}
                  avatarSize={24}
                  overlap={8}
                  showCount={true}
                />
              </View>
            </View>
          )}
        </View>

        {/* Actions */}
        <View style={styles.actionsSection}>
          {!isClosed && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.paymentButton,
                { backgroundColor: getStatusColor(currentUserStatus) }
              ]}
              onPress={handlePaymentPress}
              disabled={currentUserStatus === 'paid'}
            >
              <Text style={styles.actionButtonText}>
                {currentUserStatus === 'paid'
                  ? t('chat.paid')
                  : currentUserStatus === 'pending'
                  ? t('chat.pending')
                  : t('chat.markAsPaid')
                }
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Status indicator */}
        {(isClosed || isExpired) && (
          <View style={styles.statusFooter}>
            <Text
              style={[
                styles.statusFooterText,
                isOwnMessage ? styles.ownText : { color: colors.tabIconDefault },
              ]}
            >
              {isClosed ? t('chat.duesCycleClosed') : t('chat.duesCycleExpired')}
            </Text>
          </View>
        )}
      </View>

      <View style={styles.messageFooter}>
        <Text style={[styles.timeText, { color: colors.tabIconDefault }]}>
          {formatTime(createdAt)}
        </Text>
      </View>

      {/* Modals */}
      <DuesPaymentModal
        visible={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onSubmitPayment={(billImageUri) => onSubmitPayment(duesCycle.id, billImageUri)}
        requiredAmount={duesCycle.amountPerMember}
        periodKey={duesCycle.periodKey}
      />

      {isAdmin && (
        <DuesManagementModal
          visible={showManagementModal}
          onClose={() => setShowManagementModal(false)}
          duesCycle={duesCycle}
          onUpdateMemberStatus={onUpdateMemberStatus}
          onCloseCycle={onCloseCycle}
          isAdmin={isAdmin}
        />
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
    maxWidth: "100%",
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
  duesBubble: {
    borderRadius: 16,
    padding: 16,
    width: "100%",
    minWidth: 320,
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
  duesHeader: {
    marginBottom: 16,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  duesTitle: {
    fontSize: 18,
    fontWeight: "700",
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
  amountText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  deadlineText: {
    fontSize: 12,
    fontStyle: 'italic',
  },
  progressSection: {
    marginBottom: 6,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
  },
  totalAmountText: {
    fontSize: 16,
    fontWeight: '700',
  },
  progressBar: {
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  paidMembersSection: {
    paddingTop: 8,
  },
  paidMembersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paidMembersLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
  membersSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  statusBreakdown: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  statusItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  statusIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  statusCount: {
    fontSize: 12,
    fontWeight: '500',
  },
  memberAvatars: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  memberAvatar: {
    alignItems: 'center',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusIndicator: {
    fontSize: 10,
    marginTop: 2,
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  actionButton: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
  },
  paymentButton: {},
  manageButton: {},
  actionButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  statusFooter: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  statusFooterText: {
    fontSize: 12,
    fontStyle: 'italic',
    textAlign: 'center',
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
