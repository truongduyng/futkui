import React, { memo } from 'react';
import { Image } from 'react-native';

interface CachedAvatarProps {
  uri: string;
  size: number;
  style?: any;
}

export const CachedAvatar = memo(function CachedAvatar({ uri, size, style }: CachedAvatarProps) {
  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  return (
    <Image
      source={{ uri }}
      style={[avatarStyle, style]}
      resizeMode="cover"
    />
  );
}, (prevProps, nextProps) => {
  // Only re-render if the URI or size changes
  return prevProps.uri === nextProps.uri && prevProps.size === nextProps.size;
});
