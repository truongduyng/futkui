import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  runOnJS,
  interpolate,
  withTiming,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/Colors';
import { useInstantDB } from '@/hooks/db/useInstantDB';
import { LinearGradient } from 'expo-linear-gradient';
import { useTranslation } from 'react-i18next';
import { useToast } from '@/hooks/useToast';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_HEIGHT = screenHeight * 0.7;
const SWIPE_THRESHOLD = screenWidth * 0.3;

interface ProfileData {
  id: string;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
  sports?: any[];
  location?: string;
  photos?: string[];
}

interface ProfileCardProps {
  profile: ProfileData;
  index: number;
  colors: any;
  onSwipeComplete: (direction: 'left' | 'right' | 'up') => void;
  isActive: boolean;
}

function ProfileCard({ profile, index, colors, onSwipeComplete, isActive }: ProfileCardProps) {
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);

  const panGesture = Gesture.Pan()
    .onStart(() => {
      scale.value = withSpring(0.95);
    })
    .onUpdate((event) => {
      translateX.value = event.translationX;
      translateY.value = event.translationY;
      rotate.value = interpolate(
        event.translationX,
        [-screenWidth, screenWidth],
        [-30, 30]
      );
    })
    .onEnd((event) => {
      const { translationX, translationY, velocityX, velocityY } = event;

      scale.value = withSpring(1);

      // Determine swipe direction
      const isSwipeRight = translationX > SWIPE_THRESHOLD || velocityX > 500;
      const isSwipeLeft = translationX < -SWIPE_THRESHOLD || velocityX < -500;
      const isSwipeUp = translationY < -SWIPE_THRESHOLD || velocityY < -500;

      if (isSwipeRight) {
        translateX.value = withTiming(screenWidth * 1.5, { duration: 300 });
        runOnJS(onSwipeComplete)('right');
      } else if (isSwipeLeft) {
        translateX.value = withTiming(-screenWidth * 1.5, { duration: 300 });
        runOnJS(onSwipeComplete)('left');
      } else if (isSwipeUp) {
        translateY.value = withTiming(-screenHeight, { duration: 300 });
        runOnJS(onSwipeComplete)('up');
      } else {
        // Spring back to center
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
        rotate.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
  }));

  return (
    <View style={styles.fullScreenCardContainer}>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.fullScreenCard, cardStyle]}>
          {profile.photos?.[0] || profile.avatarUrl ? (
            <Image
              source={{ uri: profile.photos?.[0] || profile.avatarUrl }}
              style={styles.profileImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.placeholderImage, { backgroundColor: colors.border }]}>
              <Ionicons name="person" size={80} color={colors.tabIconDefault} />
            </View>
          )}

          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.8)']}
            style={styles.gradient}
          />

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>
              {profile.displayName || profile.handle}
            </Text>
            <Text style={styles.profileHandle}>@{profile.handle}</Text>

            {profile.location && (
              <View style={styles.locationContainer}>
                <Ionicons name="location-outline" size={16} color="#fff" />
                <Text style={styles.locationText}>{profile.location}</Text>
              </View>
            )}

            {profile.sports && profile.sports.length > 0 && (
              <View style={styles.sportsContainer}>
                {profile.sports.slice(0, 3).map((sport, sportIndex) => (
                  <View key={sportIndex} style={styles.sportTag}>
                    <Text style={styles.sportText}>
                      {typeof sport === 'string' ? sport : sport.sport}
                    </Text>
                  </View>
                ))}
              </View>
            )}
          </View>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

export default function ExploreScreen() {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const { t } = useTranslation();
  const { instantClient } = useInstantDB();
  const { user } = instantClient.useAuth();
  const { showSuccess, showInfo, showError } = useToast();

  const [currentIndex, setCurrentIndex] = useState(0);
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Fetch user's profile for location filtering
  const { data: profileData } = instantClient.useQuery({
    profiles: {
      $: { where: { "user.id": user?.id } }
    }
  });

  // Fetch other users' profiles for exploration
  const { data: exploreData, isLoading } = instantClient.useQuery(
    user?.id ? {
      profiles: {
        $: {
          where: {
            "user.id": { $ne: user.id }
          }
        }
      }
    } : {}
  );

  React.useEffect(() => {
    if (profileData?.profiles?.[0]) {
      setUserProfile(profileData.profiles[0]);
    }
  }, [profileData]);

  React.useEffect(() => {
    if (exploreData?.profiles) {
      // Show all profiles without location filtering
      let filteredProfiles = exploreData.profiles;

      // Filter out bot profile (handle 'fk') for better user experience
      filteredProfiles = filteredProfiles.filter((profile: any) => profile.handle !== 'fk');

      // Shuffle profiles for variety
      const shuffled = [...filteredProfiles].sort(() => Math.random() - 0.5);
      setProfiles(shuffled);
      setLoading(false);

      console.log(`Showing ${shuffled.length} profiles from ${exploreData.profiles.length} total`);
    }
  }, [exploreData]);

  const handleSwipeComplete = useCallback((direction: 'left' | 'right' | 'up') => {
    const currentProfile = profiles[currentIndex];
    if (!currentProfile) return;

    if (direction === 'right') {
      // Send "Hi" action
      showSuccess(t('profileExplore.hiSent', 'Hi sent!'));
    } else if (direction === 'up') {
      // Send "Interest" action
      showSuccess(t('profileExplore.interestSent', 'Interest shown!'));
    }
    // For all swipes, move to next profile
    if (currentIndex < profiles.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  }, [currentIndex, profiles, showSuccess, t]);

  const handleMatchInvite = useCallback(async () => {
    const currentProfile = profiles[currentIndex];
    if (!currentProfile || !userProfile) return;

    try {
      // This would typically open a modal to create a match invitation
      showInfo(t('profileExplore.matchInviteFeature', 'Match invite feature coming soon!'));
    } catch {
      showError(t('profileExplore.error', 'Something went wrong'));
    }
  }, [currentIndex, profiles, userProfile, showInfo, showError, t]);


  if (loading || isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.tint} />
          <Text style={[styles.loadingText, { color: colors.text }]}>
            {t('profileExplore.loading', 'Finding profiles...')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (profiles.length === 0 && !loading && !isLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />
        <View style={styles.emptyContainer}>
          <Ionicons name="search-outline" size={80} color={colors.tabIconDefault} />
          <Text style={[styles.emptyTitle, { color: colors.text }]}>
            {t('profileExplore.noProfiles', 'No more profiles')}
          </Text>
          <Text style={[styles.emptySubtitle, { color: colors.tabIconDefault }]}>
            {t('profileExplore.noProfilesSubtitle', 'Check back later for new people in your area')}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t('profileExplore.title', 'Explore')}
        </Text>
        <Text style={[styles.headerSubtitle, { color: colors.tabIconDefault }]}>
          {userProfile?.location || t('profileExplore.allLocations', 'All locations')}
        </Text>
      </View>

      {/* Profile Cards - TikTok Style FlatList */}
      <FlatList
        data={profiles}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <ProfileCard
            profile={item}
            index={index}
            colors={colors}
            onSwipeComplete={handleSwipeComplete}
            isActive={index === currentIndex}
          />
        )}
        style={styles.flatListContainer}
        showsVerticalScrollIndicator={false}
        pagingEnabled={true}
        snapToInterval={screenHeight - 120} // Account for header height
        snapToAlignment="start"
        decelerationRate="fast"
        bounces={false}
        initialNumToRender={2}
        maxToRenderPerBatch={1}
        windowSize={3}
        removeClippedSubviews={true}
        onMomentumScrollEnd={(event) => {
          const newIndex = Math.round(event.nativeEvent.contentOffset.y / (screenHeight - 120));
          setCurrentIndex(newIndex);
        }}
        getItemLayout={(_, index) => ({
          length: screenHeight - 120,
          offset: (screenHeight - 120) * index,
          index,
        })}
        ListFooterComponent={() => (
          <View style={[styles.endContainer, { height: screenHeight - 120 }]}>
            <Ionicons name="checkmark-circle" size={60} color={colors.tint} />
            <Text style={[styles.endTitle, { color: colors.text }]}>
              {t('profileExplore.endOfProfiles', "You've seen all profiles!")}
            </Text>
            <Text style={[styles.endSubtitle, { color: colors.tabIconDefault }]}>
              {t('profileExplore.checkBackLater', 'Check back later for new people')}
            </Text>
          </View>
        )}
      />

      {/* Action Buttons */}
      <View style={styles.actionContainer}>
        <TouchableOpacity
          style={[styles.actionButton, styles.passButton]}
          onPress={() => handleSwipeComplete('left')}
        >
          <Ionicons name="close" size={30} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.hiButton]}
          onPress={() => handleSwipeComplete('right')}
        >
          <Ionicons name="hand-right-outline" size={28} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.interestButton]}
          onPress={() => handleSwipeComplete('up')}
        >
          <Ionicons name="heart" size={28} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, styles.matchButton]}
          onPress={handleMatchInvite}
        >
          <Ionicons name="football-outline" size={28} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Swipe Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={[styles.instructionsText, { color: colors.tabIconDefault }]}>
          {t('profileExplore.instructions', 'Swipe left to pass, right to say hi, up to show interest')}
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 24,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 24,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
    marginTop: 4,
  },
  cardContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: screenWidth - 40,
    height: CARD_HEIGHT,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '50%',
  },
  profileInfo: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  profileName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4,
  },
  profileHandle: {
    fontSize: 18,
    color: 'rgba(255,255,255,0.8)',
    marginBottom: 12,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  locationText: {
    color: '#fff',
    fontSize: 16,
    marginLeft: 4,
  },
  sportsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  sportTag: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  sportText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: 20,
    gap: 20,
  },
  actionButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  passButton: {
    backgroundColor: '#FF4458',
  },
  hiButton: {
    backgroundColor: '#42A5F5',
  },
  interestButton: {
    backgroundColor: '#FF6B6B',
  },
  matchButton: {
    backgroundColor: '#4CAF50',
  },
  instructionsContainer: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  instructionsText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 20,
  },
  flatListContainer: {
    flex: 1,
  },
  fullScreenCardContainer: {
    height: screenHeight - 120, // Account for header and action buttons
    width: screenWidth,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  fullScreenCard: {
    width: screenWidth - 40,
    height: screenHeight * 0.75,
    borderRadius: 20,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    overflow: 'hidden',
  },
  endContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 40,
  },
  endTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginTop: 16,
    textAlign: 'center',
  },
  endSubtitle: {
    fontSize: 16,
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 24,
  },
});
