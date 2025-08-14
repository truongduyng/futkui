import { Colors } from "@/constants/Colors";
import { useNavigation } from "expo-router";
import { useCallback, useEffect } from "react";
import { Alert } from "react-native";

interface UseChatHeaderProps {
  group: any;
  handleShareGroup: () => void;
  handleLeaveGroup: () => void;
}

export function useChatHeader({ group, handleShareGroup, handleLeaveGroup }: UseChatHeaderProps) {
  const navigation = useNavigation();
  const colors = Colors["light"];

  const showOptionsMenu = useCallback(() => {
    Alert.alert("Group Options", "", [
      {
        text: "Share Group",
        onPress: handleShareGroup,
      },
      {
        text: "Leave Group",
        style: "destructive",
        onPress: handleLeaveGroup,
      },
      { text: "Cancel", style: "cancel" },
    ]);
  }, [handleShareGroup, handleLeaveGroup]);

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

  return { showOptionsMenu };
}