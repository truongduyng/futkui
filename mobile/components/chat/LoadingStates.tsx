import { Colors } from "@/constants/Colors";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { useTranslation } from 'react-i18next';

interface LoadingStatesProps {
  type: "loading" | "loadingGroup" | "loadingMessages" | "groupNotFound";
}

export function LoadingStates({ type }: LoadingStatesProps) {
  const { t } = useTranslation();
  const colors = Colors["light"];

  const getContent = () => {
    switch (type) {
      case "loading":
        return t('common.loading');
      case "loadingGroup":
        return t('chat.loadingGroup');
      case "loadingMessages":
        return t('chat.loadingMessages');
      case "groupNotFound":
        return t('chat.groupNotFound');
    }
  };

  return (
    <View
      style={[
        styles.container,
        styles.centered,
        { backgroundColor: colors.background },
      ]}
    >
      <Text
        style={[
          type === "groupNotFound" ? styles.errorText : styles.loadingText,
          { color: colors.text },
        ]}
      >
        {getContent()}
      </Text>
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
  loadingText: {
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
  },
});