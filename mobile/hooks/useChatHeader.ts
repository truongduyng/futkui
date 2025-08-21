import { Colors } from "@/constants/Colors";
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useState } from "react";

interface UseChatHeaderProps {
  group: any;
}

export function useChatHeader({ group }: UseChatHeaderProps) {
  const navigation = useNavigation();
  const colors = Colors["light"];
  const [showBottomSheet, setShowBottomSheet] = useState(false);

  const showOptionsMenu = useCallback(() => {
    setShowBottomSheet(true);
  }, []);

  const hideOptionsMenu = useCallback(() => {
    setShowBottomSheet(false);
  }, []);

  useEffect(() => {
    if (group) {
      navigation.setOptions({
        title: group.name,
        headerBackTitle: "Back",
        headerShown: true,
        headerStyle: {
          backgroundColor: colors.background,
        },
        headerTintColor: colors.tint,
        headerTitleStyle: {
          color: colors.text,
        },
        headerRight: undefined
      });
    }
  }, [group, navigation, colors]);

  return { showOptionsMenu, showBottomSheet, hideOptionsMenu };
}
