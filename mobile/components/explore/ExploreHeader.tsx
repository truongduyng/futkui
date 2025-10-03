import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Colors } from "@/constants/Colors";
import { useTranslation } from "react-i18next";

interface ExploreHeaderProps {
  selectedLocation: string;
  selectedSports: string[];
  onLocationPress: () => void;
  onSportsPress: () => void;
}

export function ExploreHeader({
  selectedLocation,
  selectedSports,
  onLocationPress,
  onSportsPress,
}: ExploreHeaderProps) {
  const { t } = useTranslation();

  const getLocationDisplayText = () => {
    return (
      selectedLocation || t("profileExplore.allLocations", "All locations")
    );
  };

  const getSportsDisplayText = () => {
    if (selectedSports.length === 0) {
      return t("filters.sports", "Sports");
    } else if (selectedSports.length === 1) {
      return t(`sports.${selectedSports[0]}`);
    } else {
      return t("filters.multipleSports", { count: selectedSports.length });
    }
  };

  return (
    <View style={styles.header}>
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              backgroundColor: selectedLocation
                ? `${Colors.light.tint}90`
                : "rgba(0,0,0,0.3)",
              borderColor: "rgba(255,255,255,0.2)",
            },
          ]}
          onPress={onLocationPress}
        >
          <Ionicons
            name="location-outline"
            size={16}
            color="rgba(255,255,255,0.9)"
          />
          <Text
            style={[
              styles.filterButtonText,
              { color: "rgba(255,255,255,0.9)" },
            ]}
          >
            {getLocationDisplayText()}
          </Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color="rgba(255,255,255,0.7)"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            styles.sportFilterButton,
            {
              backgroundColor:
                selectedSports.length > 0
                  ? `${Colors.light.tint}90`
                  : "rgba(0,0,0,0.3)",
              borderColor: "rgba(255,255,255,0.2)",
            },
          ]}
          onPress={onSportsPress}
        >
          <Ionicons
            name="fitness-outline"
            size={16}
            color="rgba(255,255,255,0.9)"
          />
          <Text
            style={[
              styles.filterButtonText,
              { color: "rgba(255,255,255,0.9)" },
            ]}
          >
            {getSportsDisplayText()}
          </Text>
          <Ionicons
            name="chevron-down"
            size={16}
            color="rgba(255,255,255,0.7)"
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    position: "absolute",
    top: 50,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingVertical: 16,
    zIndex: 10,
    alignItems: "center",
  },
  filterRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    justifyContent: "center",
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    gap: 6,
    flex: 1,
    maxWidth: 180,
  },
  sportFilterButton: {
    maxWidth: 180,
  },
  filterButtonText: {
    fontSize: 14,
    fontWeight: "500",
    flex: 1,
    textAlign: "center",
  },
});
