import { Colors } from "@/constants/Colors";
import { useTheme } from '@/contexts/ThemeContext';
import { useNavigation } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from 'react-i18next';

interface UseChatHeaderProps {
  group: any;
}

export function useChatHeader({ group }: UseChatHeaderProps) {
  const navigation = useNavigation();
  const { t } = useTranslation();
  const { isDark } = useTheme();
const colors = isDark ? Colors.dark : Colors.light;
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
        headerBackTitle: t('common.back'),
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
  }, [group, navigation, colors, t]);

  return { showOptionsMenu, showBottomSheet, hideOptionsMenu };
}
