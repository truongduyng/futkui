import React, { useState, useCallback, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import { Colors } from "@/constants/Colors";
import { useInstantDB } from "@/hooks/db/useInstantDB";
import { useTranslation } from "react-i18next";
import { useToast } from "@/hooks/useToast";
import { useRouter } from "expo-router";
import PhotoCarousel from "@/components/ui/PhotoCarousel";
import { SportFilterBottomSheet } from "@/components/ui/FilterBottomSheet";
import { LocationSelector } from "@/components/LocationSelector";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

interface ProfileData {
  id: string;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
  sports?: any[];
  location?: string;
  photos?: string[];
}

function ProfileCard({
  profile,
  colors,
  t,
}: {
  profile: ProfileData;
  colors: any;
  t: any;
}) {
  return (
    <View style={styles.fullScreenCardContainer}>
      <View style={styles.fullScreenCard}>
        <PhotoCarousel
          photos={profile.photos || []}
          avatarUrl={profile.avatarUrl}
          autoSlide={true}
          autoSlideInterval={4500}
          showDots={true}
          colors={colors}
          style={styles.carouselStyle}
        />

        <View style={styles.profileInfo}>
          <Text style={[styles.profileName]}>
            {profile.displayName || profile.handle}
          </Text>

          {profile.sports && profile.sports.length > 0 && (
            <View style={styles.sportsContainer}>
              {profile.sports.slice(0, 3).map((sportItem, sportIndex) => {
                // Handle both old format (object with sport property) and new format (string)
                const sport =
                  typeof sportItem === "string" ? sportItem : sportItem.sport;
                if (!sport) return null;

                return (
                  <View key={sportIndex} style={[styles.sportTag]}>
                    <Text style={[styles.sportText]}>
                      {t(`sports.${sport.toLowerCase()}`)}
                    </Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

export default function ExploreScreen() {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const { t } = useTranslation();
  const { instantClient, createOrGetDM, sendDMMessage } = useInstantDB();
  const { user } = instantClient.useAuth();
  const { showSuccess, showError } = useToast();
  const router = useRouter();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showSportFilter, setShowSportFilter] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const [selectedSports, setSelectedSports] = useState<string[]>([]);
  const [selectedLocation, setSelectedLocation] = useState("");
  const flatListRef = useRef<FlatList>(null);

  // Fetch user's profile for location filtering
  const { data: profileData } = instantClient.useQuery({
    profiles: {
      $: { where: { "user.id": user?.id } },
    },
  });

  // Fetch other users' profiles for exploration
  const { data: exploreData, isLoading } = instantClient.useQuery(
    user?.id
      ? {
          profiles: {
            $: {
              where: {
                avatarUrl: { $isNull: false },
              },
            },
            user: {
              $: {
                where: {
                  id: { $ne: user.id },
                },
              },
            },
          },
        }
      : {},
  );

  React.useEffect(() => {
    if (profileData?.profiles?.[0]) {
      setUserProfile(profileData.profiles[0]);
      setSelectedLocation(profileData.profiles[0].location || "");
    }
  }, [profileData]);

  React.useEffect(() => {
    if (exploreData?.profiles) {
      // Show all profiles without location filtering
      let filteredProfiles = exploreData.profiles;

      // Filter out bot profile (handle 'fk') for better user experience
      filteredProfiles = filteredProfiles.filter(
        (profile: any) => profile.handle !== "fk",
      );

      // Apply filters
      if (selectedLocation.trim()) {
        filteredProfiles = filteredProfiles.filter((profile: any) =>
          profile.location
            ?.toLowerCase()
            .includes(selectedLocation.toLowerCase()),
        );
      }

      if (selectedSports.length > 0) {
        filteredProfiles = filteredProfiles.filter((profile: any) => {
          if (!profile.sports || profile.sports.length === 0) return false;

          return profile.sports.some((sportItem: any) => {
            const sport =
              typeof sportItem === "string" ? sportItem : sportItem.sport;
            return sport && selectedSports.includes(sport.toLowerCase());
          });
        });
      }

      // Shuffle profiles for variety
      const shuffled = [...filteredProfiles].sort(() => Math.random() - 0.5);
      setProfiles(shuffled);
      setLoading(false);

      console.log(
        `Showing ${shuffled.length} profiles from ${exploreData.profiles.length} total`,
      );
    }
  }, [exploreData, selectedSports, selectedLocation]);

  const handleAction = useCallback(() => {
    const currentProfile = profiles[currentIndex];
    if (!currentProfile) return;

    // Move to next profile by scrolling the FlatList
    if (currentIndex < profiles.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      // Update the state immediately to keep UI in sync
      setCurrentIndex(nextIndex);
    }
  }, [currentIndex, profiles]);

  const handleMatchInvite = useCallback(async () => {
    const currentProfile = profiles[currentIndex];
    if (!currentProfile || !userProfile) {
      showError(t("profileExplore.error"));
      return;
    }

    try {
      // Create or get DM between current user and selected profile
      const conversationId = await createOrGetDM(
        userProfile.id,
        currentProfile.id,
      );

      // Auto-send a match invitation message
      await sendDMMessage({
        conversationId,
        content: t("dm.matchInvitation"),
        authorId: userProfile.id,
        authorName: userProfile.displayName || userProfile.handle,
      });

      if (currentIndex < profiles.length - 1) {
        const nextIndex = currentIndex + 1;
        flatListRef.current?.scrollToIndex({
          index: nextIndex,
          animated: true,
        });
        // Update the state immediately to keep UI in sync
        setCurrentIndex(nextIndex);
      }

      showSuccess(
        t("dm.startingChatWith", {
          name: currentProfile.displayName || currentProfile.handle,
        }),
      );

      // Navigate to the DM chat - we'll need a special route for conversations
      router.push(`/dm/${conversationId}`);
    } catch (error) {
      console.error("Error creating DM:", error);
      showError(t("profileExplore.error"));
    }
  }, [
    currentIndex,
    profiles,
    userProfile,
    showSuccess,
    showError,
    t,
    createOrGetDM,
    sendDMMessage,
    router,
  ]);

  const handleApplySports = useCallback((sports: string[]) => {
    setSelectedSports(sports);
    setCurrentIndex(0); // Reset to first profile when filters change
  }, []);

  const handleLocationSelect = useCallback((province: any) => {
    setSelectedLocation(province.label);
    setCurrentIndex(0); // Reset to first profile when filters change
  }, []);

  const getLocationDisplayText = () => {
    return (
      selectedLocation ||
      userProfile?.location ||
      t("profileExplore.allLocations", "All locations")
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

  if (loading || isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t("profileExplore.loading", "Finding profiles...")}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? "light-content" : "dark-content"} />

      {/* Absolute Header */}
      <View style={[styles.header]}>
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
            onPress={() => setShowLocationSelector(true)}
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
            onPress={() => setShowSportFilter(true)}
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

      {/* Profile Cards - TikTok Style FlatList */}
      <FlatList
        ref={flatListRef}
        data={profiles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ProfileCard profile={item} colors={colors} t={t} />
        )}
        style={styles.flatListContainer}
        showsVerticalScrollIndicator={false}
        pagingEnabled={true}
        snapToInterval={screenHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        bounces={false}
        initialNumToRender={2}
        maxToRenderPerBatch={1}
        windowSize={3}
        removeClippedSubviews={true}
        onMomentumScrollEnd={(event) => {
          const newIndex = Math.round(
            event.nativeEvent.contentOffset.y / screenHeight,
          );
          setCurrentIndex(newIndex);
        }}
        getItemLayout={(_, index) => ({
          length: screenHeight,
          offset: screenHeight * index,
          index,
        })}
        ListEmptyComponent={() => (
          <View style={[styles.emptyContainer, { height: screenHeight - 150 }]}>
            <Ionicons
              name="search-outline"
              size={80}
              color={colors.tabIconDefault}
            />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {t("profileExplore.noProfiles", "No more profiles")}
            </Text>
            <Text
              style={[styles.emptySubtitle, { color: colors.tabIconDefault }]}
            >
              {t(
                "profileExplore.noProfilesSubtitle",
                "Check back later for new people in your area",
              )}
            </Text>
          </View>
        )}
        ListFooterComponent={() => (
          <View style={[styles.endContainer, { height: screenHeight }]}>
            <Ionicons name="checkmark-circle" size={60} color={colors.tint} />
            <Text style={[styles.endTitle, { color: colors.text }]}>
              {t("profileExplore.endOfProfiles", "You've seen all profiles!")}
            </Text>
            <Text
              style={[styles.endSubtitle, { color: colors.tabIconDefault }]}
            >
              {t(
                "profileExplore.checkBackLater",
                "Check back later for new people",
              )}
            </Text>
          </View>
        )}
      />

      {/* Action Buttons - Hide when at end of profiles list */}
      {currentIndex < profiles.length && (
        <View style={styles.actionContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.passButton]}
            onPress={handleAction}
          >
            <Ionicons name="close" size={30} color="#fff" />
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.fightButton]}
            onPress={handleMatchInvite}
          >
            <Text style={{ fontSize: 24, color: "white", fontWeight: "500" }}>
              VS
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Location Selector */}
      <LocationSelector
        visible={showLocationSelector}
        onClose={() => setShowLocationSelector(false)}
        onSelect={handleLocationSelect}
        selectedLocation={selectedLocation}
      />

      {/* Sport Filter Bottom Sheet */}
      <SportFilterBottomSheet
        isVisible={showSportFilter}
        onClose={() => setShowSportFilter(false)}
        onApplySports={handleApplySports}
        initialSports={selectedSports}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 24,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 24,
  },
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
  headerTitle: {
    fontSize: 28,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
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
  carouselStyle: {
    width: "100%",
    height: "100%",
    zIndex: 2,
  },
  profileInfo: {
    position: "absolute",
    bottom: 200, // Move up to avoid overlap with action buttons
    left: 20,
    right: 20,
    zIndex: 2,
  },
  profileName: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#fff",
    marginBottom: 4,
  },
  profileHandle: {
    fontSize: 18,
    color: "rgba(255,255,255,0.8)",
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  locationText: {
    color: "#fff",
    fontSize: 16,
    marginLeft: 4,
  },
  sportsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sportTag: {
    backgroundColor: "rgba(0,0,0,0.4)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sportText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
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
  flatListContainer: {
    flex: 1,
  },
  fullScreenCardContainer: {
    height: screenHeight,
    width: screenWidth,
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenCard: {
    width: screenWidth,
    height: screenHeight,
    backgroundColor: "#fff",
    overflow: "hidden",
  },
  endContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
    paddingHorizontal: 40,
  },
  endTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 16,
    textAlign: "center",
  },
  endSubtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: "center",
    lineHeight: 24,
  },
});
