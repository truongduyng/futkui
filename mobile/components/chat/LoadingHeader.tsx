import { Colors } from "@/constants/Colors";
import { useTheme } from '@/contexts/ThemeContext';
import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";

interface LoadingHeaderProps {
  isLoading: boolean;
}

export const LoadingHeader = React.memo(function LoadingHeader({
  isLoading,
}: LoadingHeaderProps) {
  const { isDark } = useTheme();
const colors = isDark ? Colors.dark : Colors.light;

  if (!isLoading) return null;

  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="small" color={colors.tint} />
    </View>
  );
});

const styles = StyleSheet.create({
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
});
