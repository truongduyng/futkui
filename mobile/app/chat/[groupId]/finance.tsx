import { Colors } from "@/constants/Colors";
import { useTheme } from "@/contexts/ThemeContext";
import { useInstantDB } from "@/hooks/db/useInstantDB";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import {
  Image,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  RefreshControl,
  ListRenderItem,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

interface LedgerEntry {
  id: string;
  amount: number;
  type: string;
  note?: string;
  billImageUrl?: string;
  createdAt: number;
  profile?: {
    id: string;
    handle: string;
    displayName?: string;
    avatarUrl?: string;
  };
}

export default function GroupFinanceScreen() {
  const params = useLocalSearchParams<{ groupId: string }>();
  const groupId = params?.groupId;
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const navigation = useNavigation();
  const { t } = useTranslation();
  const [refreshing, setRefreshing] = useState(false);

  const { useGroup, useLedgerEntries } = useInstantDB();

  const { data: groupData } = useGroup(groupId || "");
  const { data: ledgerData } = useLedgerEntries(groupId || "");

  const group = groupData?.groups?.[0];

  const ledgerEntries: LedgerEntry[] = useMemo(() => {
    return ledgerData?.ledgerEntries || [];
  }, [ledgerData?.ledgerEntries]);

  // Calculate financial summaries
  const financialSummary = useMemo(() => {
    const totalIn = ledgerEntries
      .filter((entry) => entry.type === "dues_payment")
      .reduce((sum, entry) => sum + entry.amount, 0);

    const totalOut = ledgerEntries
      .filter(
        (entry) =>
          entry.type === "dues_refund" || entry.type === "match_expense",
      )
      .reduce((sum, entry) => sum + Math.abs(entry.amount), 0);

    return {
      currentBalance: group?.balance || 0,
      totalIn,
      totalOut,
      netFlow: totalIn - totalOut,
    };
  }, [ledgerEntries, group?.balance]);

  // Sort ledger entries by date (newest first)
  const sortedLedgerEntries = useMemo(() => {
    return [...ledgerEntries].sort((a, b) => b.createdAt - a.createdAt);
  }, [ledgerEntries]);

  const onRefresh = React.useCallback(() => {
    setRefreshing(true);
    // Trigger re-fetch of data
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  }, []);

  // Set screen title
  useEffect(() => {
    navigation.setOptions({
      title: t("finance.title"),
      headerStyle: {
        backgroundColor: colors.background,
      },
      headerTintColor: colors.text,
    });
  }, [navigation, colors, t]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString("vi-VN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getEntryIcon = (type: string) => {
    switch (type) {
      case "dues_payment":
        return "arrow-down-circle";
      case "dues_refund":
        return "arrow-up-circle";
      case "expense":
        return "card";
      default:
        return "swap-horizontal";
    }
  };

  const getEntryColor = (type: string) => {
    switch (type) {
      case "dues_payment":
        return "#34C759"; // Green for income
      case "dues_refund":
        return "#FF3B30"; // Red for outgoing
      case "expense":
        return "#FF9500"; // Orange for expenses
      default:
        return colors.tabIconDefault;
    }
  };

  const getEntryTypeLabel = (type: string) => {
    switch (type) {
      case "dues_payment":
        return t("finance.duesPayment");
      case "dues_refund":
        return t("finance.duesRefund");
      case "expense":
        return t("finance.expense");
      default:
        return t("finance.transaction");
    }
  };

  const renderLedgerEntry: ListRenderItem<LedgerEntry> = ({ item: entry, index }) => {
    const isFirst = index === 0;
    const isLast = index === sortedLedgerEntries.length - 1;
    const isIncome = entry.type === "dues_payment";
    const amount = isIncome ? entry.amount : -Math.abs(entry.amount);

    return (
      <View
        style={[
          styles.ledgerEntry,
          {
            backgroundColor: colors.card,
            marginHorizontal: 20,
          },
          isFirst && styles.ledgerEntryFirst,
          isLast && styles.ledgerEntryLast,
          !isLast && {
            borderBottomColor: colors.border,
            borderBottomWidth: StyleSheet.hairlineWidth,
          },
        ]}
      >
        <View
          style={[
            styles.entryIcon,
            { backgroundColor: getEntryColor(entry.type) + "15" },
          ]}
        >
          <Ionicons
            name={getEntryIcon(entry.type) as any}
            size={20}
            color={getEntryColor(entry.type)}
          />
        </View>
        <View style={styles.entryDetails}>
          <View style={styles.entryHeader}>
            <Text style={[styles.entryType, { color: colors.text }]}>
              {getEntryTypeLabel(entry.type)}
            </Text>
            <Text
              style={[
                styles.entryAmount,
                { color: isIncome ? "#34C759" : "#FF3B30" },
              ]}
            >
              {isIncome ? "+" : "-"}
              {formatCurrency(Math.abs(amount))}
            </Text>
          </View>
          <Text
            style={[styles.entryDate, { color: colors.tabIconDefault }]}
          >
            {formatDate(entry.createdAt)}
          </Text>
          {entry.profile && (
            <View style={styles.entryProfile}>
              <Text
                style={[
                  styles.entryProfileName,
                  { color: colors.tabIconDefault },
                ]}
              >
                {entry.profile.displayName || entry.profile.handle}
              </Text>
            </View>
          )}
          {entry.note && (
            <Text
              style={[styles.entryNote, { color: colors.tabIconDefault }]}
            >
              {entry.note}
            </Text>
          )}
          {entry.billImageUrl && (
            <TouchableOpacity
              style={[
                styles.billImageContainer,
                { backgroundColor: colors.background },
              ]}
              onPress={() => {
                // TODO: Implement image preview
              }}
            >
              <Image
                source={{ uri: entry.billImageUrl }}
                style={styles.billImage}
              />
              <View style={styles.billImageOverlay}>
                <Ionicons name="eye" size={16} color="white" />
              </View>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderHeader = () => (
    <View>
      {/* Balance Summary Section */}
      <View style={styles.summarySection}>
        <View style={[styles.balanceCard, { backgroundColor: colors.card }]}>
          <View style={styles.balanceHeader}>
            <Ionicons name="wallet" size={24} color={colors.tint} />
            <Text style={[styles.balanceTitle, { color: colors.text }]}>
              {t("finance.currentBalance")}
            </Text>
          </View>
          <Text style={[styles.balanceAmount, { color: colors.text }]}>
            {formatCurrency(financialSummary.currentBalance)}
          </Text>
          <View style={styles.balanceSubInfo}>
            <Text
              style={[
                styles.balanceSubText,
                { color: colors.tabIconDefault },
              ]}
            >
              {t("finance.groupFunds")}
            </Text>
          </View>
        </View>

        {/* Summary Cards */}
        <View style={styles.summaryRow}>
          <View
            style={[styles.summaryCard, { backgroundColor: colors.card }]}
          >
            <View
              style={[styles.summaryIcon, { backgroundColor: "#34C75915" }]}
            >
              <Ionicons name="arrow-down" size={20} color="#34C759" />
            </View>
            <Text
              style={[styles.summaryLabel, { color: colors.tabIconDefault }]}
            >
              {t("finance.totalIn")}
            </Text>
            <Text style={[styles.summaryAmount, { color: "#34C759" }]}>
              {formatCurrency(financialSummary.totalIn)}
            </Text>
          </View>

          <View
            style={[styles.summaryCard, { backgroundColor: colors.card }]}
          >
            <View
              style={[styles.summaryIcon, { backgroundColor: "#FF3B3015" }]}
            >
              <Ionicons name="arrow-up" size={20} color="#FF3B30" />
            </View>
            <Text
              style={[styles.summaryLabel, { color: colors.tabIconDefault }]}
            >
              {t("finance.totalOut")}
            </Text>
            <Text style={[styles.summaryAmount, { color: "#FF3B30" }]}>
              {formatCurrency(financialSummary.totalOut)}
            </Text>
          </View>
        </View>
      </View>

      {/* Section Title for Transactions */}
      {sortedLedgerEntries.length > 0 && (
        <View style={styles.transactionsSectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>
            {t("finance.recentTransactions")}
          </Text>
        </View>
      )}
    </View>
  );

  const renderEmptyComponent = () => (
    <View style={[styles.emptyState, { backgroundColor: colors.card }]}>
      <Ionicons
        name="receipt-outline"
        size={48}
        color={colors.tabIconDefault}
      />
      <Text style={[styles.emptyTitle, { color: colors.text }]}>
        {t("finance.noTransactions")}
      </Text>
      <Text
        style={[styles.emptySubtitle, { color: colors.tabIconDefault }]}
      >
        {t("finance.noTransactionsMessage")}
      </Text>
    </View>
  );

  if (!group) {
    return (
      <View
        style={[
          styles.container,
          styles.centered,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.errorText, { color: colors.text }]}>
          {t("groupProfile.groupNotFound")}
        </Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <FlatList
        data={sortedLedgerEntries}
        renderItem={renderLedgerEntry}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={renderEmptyComponent}
        contentContainerStyle={styles.content}
        style={styles.flatList}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: "center",
    alignItems: "center",
  },
  content: {
    flexGrow: 1,
  },
  errorText: {
    fontSize: 16,
    fontWeight: "500",
  },
  summarySection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  balanceCard: {
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
    alignItems: "center",
  },
  balanceHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  balanceTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: "700",
    marginBottom: 4,
  },
  balanceSubInfo: {
    alignItems: "center",
  },
  balanceSubText: {
    fontSize: 14,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  summaryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginBottom: 4,
    textAlign: "center",
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: "600",
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  flatList: {
    flex: 1,
  },
  transactionsSectionHeader: {
    paddingBottom: 4,
  },
  ledgerEntry: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  ledgerEntryFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  ledgerEntryLast: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  entryIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  entryDetails: {
    flex: 1,
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  entryType: {
    fontSize: 16,
    fontWeight: "600",
  },
  entryAmount: {
    fontSize: 16,
    fontWeight: "600",
  },
  entryDate: {
    fontSize: 12,
    marginBottom: 4,
  },
  entryProfile: {
    marginBottom: 4,
  },
  entryProfileName: {
    fontSize: 12,
    fontStyle: "italic",
  },
  entryNote: {
    fontSize: 12,
    marginBottom: 8,
    fontStyle: "italic",
  },
  billImageContainer: {
    width: 80,
    height: 60,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
  },
  billImage: {
    width: "100%",
    height: "100%",
  },
  billImageOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    marginHorizontal: 20,
    borderRadius: 12,
    paddingVertical: 48,
    paddingHorizontal: 24,
    alignItems: "center",
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    lineHeight: 20,
  },
});
