import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  StatusBar,
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
import { ExploreHeader } from "@/components/explore/ExploreHeader";
import { ExploreActions } from "@/components/explore/ExploreActions";
import { useProfileFilters } from "@/hooks/useProfileFilters";
import {
  useExploreProfiles,
  type ProfileData,
} from "@/hooks/useExploreProfiles";

const { width: screenWidth, height: screenHeight } = Dimensions.get("window");

const ProfileCard = React.memo(function ProfileCard({
  profile,
  colors,
  t,
}: {
  profile: ProfileData;
  colors: any;
  t: any;
}) {
  const sportTags = React.useMemo(() => {
    if (!profile.sports || profile.sports.length === 0) return null;

    return profile.sports.slice(0, 3).map((sportItem, sportIndex) => {
      const sport = typeof sportItem === "string" ? sportItem : sportItem.sport;
      if (!sport) return null;

      return (
        <View key={sportIndex} style={styles.sportTag}>
          <Text style={styles.sportText}>
            {t(`sports.${sport.toLowerCase()}`)}
          </Text>
        </View>
      );
    });
  }, [profile.sports, t]);

  const displayName = React.useMemo(
    () => profile.displayName || profile.handle,
    [profile.displayName, profile.handle],
  );

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
          <Text style={styles.profileName}>{displayName}</Text>

          {profile.description && (
            <Text style={styles.profileDescription} numberOfLines={2}>
              {profile.description}
            </Text>
          )}
          {sportTags && <View style={styles.sportsContainer}>{sportTags}</View>}
        </View>
      </View>
    </View>
  );
});

export default function ExploreScreen() {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const { t } = useTranslation();
  const { instantClient, createOrGetDM, sendDMMessage } = useInstantDB();
  const { user } = instantClient.useAuth();
  const { showSuccess, showError } = useToast();
  const router = useRouter();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [showSportFilter, setShowSportFilter] = useState(false);
  const [showLocationSelector, setShowLocationSelector] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const {
    selectedSports,
    selectedLocation,
    updateSports,
    updateLocation,
  } = useProfileFilters();

  const { profiles, loading, isLoading } = useExploreProfiles({
    userId: user?.id,
    selectedSports,
    selectedLocation,
  });

  // Fetch user's profile once
  useEffect(() => {
    if (!user?.id) return;

    instantClient
      .queryOnce({
        profiles: {
          $: { where: { "user.id": user.id } },
        },
      })
      .then((result) => {
        if (result.data.profiles?.[0]) {
          setUserProfile(result.data.profiles[0]);
        }
      });
  }, [user?.id, instantClient]);

  const resetToFirstProfile = useCallback(() => {
    setCurrentIndex(0);
    flatListRef.current?.scrollToOffset({ offset: 0, animated: false });
  }, []);

  const moveToNextProfile = useCallback(() => {
    if (currentIndex < profiles.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({
        index: nextIndex,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    }
  }, [currentIndex, profiles.length]);

  const handlePass = useCallback(() => {
    moveToNextProfile();
  }, [moveToNextProfile]);

  const handleMatchInvite = useCallback(async () => {
    const currentProfile = profiles[currentIndex];
    if (!currentProfile || !userProfile) {
      showError(t("profileExplore.error"));
      return;
    }

    try {
      const conversationId = await createOrGetDM(
        userProfile.id,
        currentProfile.id,
      );

      // Check if conversation already has messages
      const messagesQuery = await instantClient.queryOnce({
        messages: {
          $: {
            where: { "conversation.id": conversationId },
            limit: 1,
          },
        },
      });

      // Auto-send match invitation if no messages exist
      if (
        !messagesQuery.data.messages ||
        messagesQuery.data.messages.length === 0
      ) {
        await sendDMMessage({
          conversationId,
          content: t("dm.matchInvitation"),
          authorId: userProfile.id,
          authorName: userProfile.displayName || userProfile.handle,
        });
      }

      moveToNextProfile();

      showSuccess(
        t("dm.startingChatWith", {
          name: currentProfile.displayName || currentProfile.handle,
        }),
      );

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
    instantClient,
    moveToNextProfile,
  ]);

  const handleApplySports = useCallback(
    async (sports: string[]) => {
      await updateSports(sports);
      resetToFirstProfile();
    },
    [updateSports, resetToFirstProfile],
  );

  const handleLocationSelect = useCallback(
    async (province: any) => {
      await updateLocation(province.label);
      resetToFirstProfile();
    },
    [updateLocation, resetToFirstProfile],
  );

  const renderProfileCard = useCallback(
    ({ item }: { item: ProfileData }) => (
      <ProfileCard profile={item} colors={colors} t={t} />
    ),
    [colors, t],
  );

  const renderEmptyList = useCallback(
    () => (
      <View style={[styles.emptyContainer, { height: screenHeight - 150 }]}>
        <Ionicons
          name="search-outline"
          size={80}
          color={colors.tabIconDefault}
        />
        <Text style={[styles.emptyTitle, { color: colors.text }]}>
          {t("profileExplore.noProfiles", "No more profiles")}
        </Text>
        <Text style={[styles.emptySubtitle, { color: colors.tabIconDefault }]}>
          {t(
            "profileExplore.noProfilesSubtitle",
            "Check back later for new people in your area",
          )}
        </Text>
      </View>
    ),
    [colors, t],
  );

  const renderFooter = useCallback(
    () => (
      <View style={[styles.endContainer, { height: screenHeight }]}>
        <Ionicons name="checkmark-circle" size={60} color={colors.tint} />
        <Text style={[styles.endTitle, { color: colors.text }]}>
          {t("profileExplore.endOfProfiles", "You've seen all profiles!")}
        </Text>
        <Text style={[styles.endSubtitle, { color: colors.tabIconDefault }]}>
          {t(
            "profileExplore.checkBackLater",
            "Check back later for new people",
          )}
        </Text>
      </View>
    ),
    [colors, t],
  );

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

      <ExploreHeader
        selectedLocation={selectedLocation}
        selectedSports={selectedSports}
        onLocationPress={() => setShowLocationSelector(true)}
        onSportsPress={() => setShowSportFilter(true)}
      />

      <FlatList
        ref={flatListRef}
        data={profiles}
        keyExtractor={(item) => item.id}
        renderItem={renderProfileCard}
        style={styles.flatListContainer}
        showsVerticalScrollIndicator={false}
        pagingEnabled={true}
        snapToInterval={screenHeight}
        snapToAlignment="start"
        decelerationRate="fast"
        bounces={false}
        initialNumToRender={2}
        maxToRenderPerBatch={3}
        windowSize={5}
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
        ListEmptyComponent={renderEmptyList}
        ListFooterComponent={renderFooter}
      />

      <ExploreActions
        visible={currentIndex < profiles.length}
        onPass={handlePass}
        onMatch={handleMatchInvite}
      />

      <LocationSelector
        visible={showLocationSelector}
        onClose={() => setShowLocationSelector(false)}
        onSelect={handleLocationSelect}
        selectedLocation={selectedLocation}
      />

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
  carouselStyle: {
    width: "100%",
    height: "100%",
    zIndex: 2,
  },
  profileInfo: {
    position: "absolute",
    bottom: 200,
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
  profileDescription: {
    fontSize: 16,
    color: "rgba(255,255,255,0.9)",
    marginBottom: 8,
    lineHeight: 22,
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
