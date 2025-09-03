import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { DuesPaymentModal } from './DuesPaymentModal';
import { DuesManagementModal } from './DuesManagementModal';

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
  // Determine status based on ledger entries and bill images
  const getMemberStatus = (member: any) => {
    // Check if there's a ledger entry for this member (means paid)
    const hasLedgerEntry = member.profile?.ledgerEntries?.some((entry: any) => 
      entry.refId === duesCycle.id && entry.type === 'dues_payment'
    );
    
    if (hasLedgerEntry) return 'paid';
    if (member.billImageUrl) return 'pending'; // Has submitted payment proof
    
    // Check if overdue (past deadline)
    const now = Date.now();
    if (duesCycle.deadline && now > duesCycle.deadline) return 'overdue';
    
    return 'unpaid';
  };

  const memberStatuses = duesCycle.duesMembers.map(m => getMemberStatus(m));
  const paidMembers = memberStatuses.filter(s => s === 'paid').length;
  const pendingMembers = memberStatuses.filter(s => s === 'pending').length;
  const unpaidMembers = memberStatuses.filter(s => s === 'unpaid').length;
  const overdueMembers = memberStatuses.filter(s => s === 'overdue').length;

  const paymentProgress = totalMembers > 0 ? Math.round((paidMembers / totalMembers) * 100) : 0;
  const totalAmount = paidMembers * duesCycle.amountPerMember;

  // Find current user's payment status
  const currentUserMember = duesCycle.duesMembers.find(m => m.profile.id === currentUserId);
  const currentUserStatus = currentUserMember ? getMemberStatus(currentUserMember) : 'unpaid';

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

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return '#4CAF50';
      case 'pending':
        return '#FF9800';
      case 'overdue':
        return '#F44336';
      default:
        return colors.tabIconDefault;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return '✓';
      case 'pending':
        return '⏳';
      case 'overdue':
        return '⚠️';
      default:
        return '○';
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

  const handleCloseCycle = () => {
    if (onCloseCycle) {
      Alert.alert(
        t('chat.closeDuesCycle'),
        t('chat.closeDuesCycleConfirm'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          { text: t('common.close'), onPress: () => onCloseCycle(duesCycle.id) },
        ]
      );
    }
  };

  const isOverdue = duesCycle.deadline < Date.now();
  const isExpired = duesCycle.deadline < Date.now();
  const isClosed = duesCycle.status === 'closed';
  const isActive = !isClosed && !isExpired;

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
            {isAdmin && isActive && onCloseCycle && (
              <TouchableOpacity
                onPress={handleCloseCycle}
                style={[
                  styles.closeButton,
                  { backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }
                ]}
              >
                <Text style={[
                  styles.closeButtonText,
                  { color: isOwnMessage ? 'white' : colors.text }
                ]}>
                  {t('chat.closeCycle')}
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
            {formatAmount(duesCycle.amountPerMember)} {t('chat.perMember')}
          </Text>

          <Text
            style={[
              styles.deadlineText,
              { color: isOverdue ? '#F44336' : (isOwnMessage ? 'rgba(255,255,255,0.8)' : colors.tabIconDefault) }
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
            <Text
              style={[
                styles.totalAmountText,
                isOwnMessage ? styles.ownText : { color: colors.text },
              ]}
            >
              {formatAmount(totalAmount)}
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
        </View>

        {/* Member Status */}
        <View style={styles.membersSection}>
          <Text
            style={[
              styles.sectionTitle,
              isOwnMessage ? styles.ownText : { color: colors.text },
            ]}
          >
            {t('chat.memberStatus')}
          </Text>

          {/* Status breakdown */}
          <View style={styles.statusBreakdown}>
            {paidMembers > 0 && (
              <View style={styles.statusItem}>
                <Text style={[styles.statusIcon, { color: '#4CAF50' }]}>✓</Text>
                <Text style={[
                  styles.statusCount,
                  isOwnMessage ? styles.ownText : { color: colors.text }
                ]}>
                  {paidMembers} {t('chat.paid')}
                </Text>
              </View>
            )}

            {pendingMembers > 0 && (
              <View style={styles.statusItem}>
                <Text style={[styles.statusIcon, { color: '#FF9800' }]}>⏳</Text>
                <Text style={[
                  styles.statusCount,
                  isOwnMessage ? styles.ownText : { color: colors.text }
                ]}>
                  {pendingMembers} {t('chat.pending')}
                </Text>
              </View>
            )}

            {unpaidMembers > 0 && (
              <View style={styles.statusItem}>
                <Text style={[styles.statusIcon, { color: colors.tabIconDefault }]}>○</Text>
                <Text style={[
                  styles.statusCount,
                  isOwnMessage ? styles.ownText : { color: colors.text }
                ]}>
                  {unpaidMembers} {t('chat.unpaid')}
                </Text>
              </View>
            )}

            {overdueMembers > 0 && (
              <View style={styles.statusItem}>
                <Text style={[styles.statusIcon, { color: '#F44336' }]}>⚠️</Text>
                <Text style={[
                  styles.statusCount,
                  isOwnMessage ? styles.ownText : { color: colors.text }
                ]}>
                  {overdueMembers} {t('chat.overdue')}
                </Text>
              </View>
            )}
          </View>

          {/* Member avatars with status */}
          <View style={styles.memberAvatars}>
            {duesCycle.duesMembers.map((member) => {
              const memberStatus = getMemberStatus(member);
              return (
                <View key={member.id} style={styles.memberAvatar}>
                  <View style={[
                    styles.avatar,
                    { borderColor: getStatusColor(memberStatus) }
                  ]}>
                    <Text style={styles.avatarText}>
                      {member.profile.handle?.charAt(0).toUpperCase() || '?'}
                    </Text>
                  </View>
                  <Text style={[
                    styles.statusIndicator,
                    { color: getStatusColor(memberStatus) }
                  ]}>
                    {getStatusIcon(memberStatus)}
                  </Text>
                </View>
              );
            })}
          </View>
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

          {isAdmin && (
            <TouchableOpacity
              style={[
                styles.actionButton,
                styles.manageButton,
                { backgroundColor: isOwnMessage ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)' }
              ]}
              onPress={handleManagementPress}
            >
              <Text style={[
                styles.actionButtonText,
                { color: isOwnMessage ? 'white' : colors.text }
              ]}>
                {t('chat.manageDues')}
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
        />
      )}
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
  duesBubble: {
    borderRadius: 16,
    padding: 20,
    minWidth: 300,
    margin: 4,
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
    marginBottom: 16,
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
    backgroundColor: 'rgba(0,0,0,0.1)',
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
  },
  statusIndicator: {
    fontSize: 10,
    marginTop: 2,
  },
  actionsSection: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
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
