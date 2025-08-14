import { Colors } from "@/constants/Colors";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface LoadingStatesProps {
  type: "loading" | "loadingGroup" | "loadingMessages" | "groupNotFound";
}

export function LoadingStates({ type }: LoadingStatesProps) {
  const colors = Colors["light"];

  const getContent = () => {
    switch (type) {
      case "loading":
        return "Loading...";
      case "loadingGroup":
        return "Loading group...";
      case "loadingMessages":
        return "Loading messages...";
      case "groupNotFound":
        return "Group not found";
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