import { useState, useEffect } from "react";
import { useInstantDB } from "@/hooks/db/useInstantDB";

export interface ProfileData {
  id: string;
  handle: string;
  displayName?: string;
  avatarUrl?: string;
  sports?: any[];
  location?: string;
  photos?: string[];
  description?: string;
}

interface UseExploreProfilesParams {
  userId: string | undefined;
  selectedSports: string[];
  selectedLocation: string;
}

export function useExploreProfiles({
  userId,
  selectedSports,
  selectedLocation,
}: UseExploreProfilesParams) {
  const { instantClient } = useInstantDB();
  const [profiles, setProfiles] = useState<ProfileData[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch other users' profiles for exploration
  const { data: exploreData, isLoading } = instantClient.useQuery(
    userId
      ? {
          profiles: {
            $: {
              where: {
                "avatarUrl": { $isNull: false },
                "type": { $in: ["user", "user_bot"] },
              },
            },
            user: {
              $: {
                where: {
                  id: { $ne: userId },
                },
              },
            },
          },
        }
      : {},
  );

  // Apply filters and shuffle profiles
  useEffect(() => {
    if (exploreData?.profiles) {
      let filteredProfiles = exploreData.profiles;

      // Apply location filter
      if (selectedLocation.trim()) {
        filteredProfiles = filteredProfiles.filter((profile: any) =>
          profile.location
            ?.toLowerCase()
            .includes(selectedLocation.toLowerCase()),
        );
      }

      // Apply sports filter
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

  return { profiles, loading, isLoading };
}
