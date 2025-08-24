import React from 'react';
import { StyleSheet, Text, View, Image } from 'react-native';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';

interface User {
  id: string;
  handle: string;
  displayName?: string;
  avatarUrl: string;
}

interface AvatarStackProps {
  users: User[];
  maxVisible?: number;
  avatarSize?: number;
  overlap?: number;
  showCount?: boolean;
}

export const AvatarStack: React.FC<AvatarStackProps> = ({
  users,
  maxVisible = 4,
  avatarSize = 20,
  overlap = 12,
  showCount = true,
}) => {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  if (!users || users.length === 0) {
    return null;
  }

  const visibleUsers = users.slice(0, maxVisible);
  const remainingCount = Math.max(0, users.length - maxVisible);

  const renderAvatar = (user: User, index: number) => {

    return (
      <View
        key={user.id}
        style={[
          styles.avatarContainer,
          {
            marginLeft: index > 0 ? -overlap : 0,
            zIndex: maxVisible - index,
          }
        ]}
      >
        <Image
          source={{ uri: user.avatarUrl }}
          style={[
            styles.avatar,
            {
              width: avatarSize,
              height: avatarSize,
              borderRadius: avatarSize / 2,
              borderColor: 'rgba(255,255,255,0.3)',
            }
          ]}
          resizeMode="cover"
        />
      </View>
    );
  };

  const renderRemainingCount = () => {
    if (!showCount || remainingCount <= 0) return null;

    return (
      <View
        style={[
          styles.countContainer,
          {
            width: avatarSize,
            height: avatarSize,
            borderRadius: avatarSize / 2,
            backgroundColor: colors.tabIconDefault,
            borderColor: 'rgba(255,255,255,0.3)',
            marginLeft: -overlap,
            zIndex: 0,
          }
        ]}
      >
        <Text style={[
          styles.countText,
          {
            fontSize: avatarSize * 0.35,
            color: colors.background,
          }
        ]}>
          +{remainingCount}
        </Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {visibleUsers.map((user, index) => renderAvatar(user, index))}
      {renderRemainingCount()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    borderWidth: 1,
  },
  countContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
  },
  countText: {
    fontWeight: '600',
  },
});
