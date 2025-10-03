import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY_LOCATION = "@futkui_explore_location";
const STORAGE_KEY_SPORTS = "@futkui_explore_sports";

export function useProfileFilters() {
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");

  // Load saved filters on mount
  useEffect(() => {
    const loadSavedFilters = async () => {
      try {
        const [savedLocation, savedSports] = await Promise.all([
          AsyncStorage.getItem(STORAGE_KEY_LOCATION),
          AsyncStorage.getItem(STORAGE_KEY_SPORTS),
        ]);

        if (savedLocation !== null) {
          setSelectedLocation(savedLocation);
        }

        if (savedSports !== null) {
          const parsedSports = JSON.parse(savedSports);
          if (Array.isArray(parsedSports)) {
            setSelectedSports(parsedSports);
          }
        }
      } catch (error) {
        console.log("Error loading saved filters:", error);
      }
    };

    loadSavedFilters();
  }, []);

  const updateSports = useCallback(async (sports: string[]) => {
    setSelectedSports(sports);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_SPORTS, JSON.stringify(sports));
    } catch (error) {
      console.log("Error saving sports filter:", error);
    }
  }, []);

  const updateLocation = useCallback(async (location: string) => {
    setSelectedLocation(location);
    try {
      await AsyncStorage.setItem(STORAGE_KEY_LOCATION, location);
    } catch (error) {
      console.log("Error saving location filter:", error);
    }
  }, []);

  return {
    selectedSports,
    selectedLocation,
    updateSports,
    updateLocation,
  };
}
