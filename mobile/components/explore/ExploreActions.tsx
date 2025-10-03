import React from "react";
import { View, TouchableOpacity, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";

interface ExploreActionsProps {
  onPass: () => void;
  onMatch: () => void;
  visible: boolean;
}

export function ExploreActions({
  onPass,
  onMatch,
  visible,
}: ExploreActionsProps) {
  if (!visible) return null;

  return (
    <View style={styles.actionContainer}>
      <TouchableOpacity
        style={[styles.actionButton, styles.passButton]}
        onPress={onPass}
      >
        <Ionicons name="close" size={30} color="#fff" />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, styles.fightButton]}
        onPress={onMatch}
      >
        <Text style={styles.vsText}>VS</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  actionContainer: {
    position: "absolute",
    bottom: 80,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
    paddingVertical: 20,
    gap: 64,
    backgroundColor: "transparent",
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  passButton: {
    backgroundColor: Colors.light.accent,
  },
  fightButton: {
    backgroundColor: Colors.light.tint,
  },
  vsText: {
    fontSize: 24,
    color: "white",
    fontWeight: "500",
  },
});
