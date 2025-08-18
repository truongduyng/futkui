import React, { memo, useState } from 'react';
import { Image, View, ActivityIndicator } from 'react-native';

interface CachedAvatarProps {
  uri: string;
  size: number;
  style?: any;
  fallbackComponent?: React.ReactNode;
}

export const CachedAvatar = memo(function CachedAvatar({ uri, size, style, fallbackComponent }: CachedAvatarProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const handleLoadStart = () => {
    setIsLoading(true);
    setHasError(false);
  };

  const handleLoadEnd = () => {
    setIsLoading(false);
  };

  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (hasError && fallbackComponent) {
    return <View style={[avatarStyle, style]}>{fallbackComponent}</View>;
  }

  return (
    <View style={[avatarStyle, style]}>
      <Image
        source={{ uri }}
        style={[avatarStyle, { position: 'absolute' }]}
        resizeMode="cover"
        onLoadStart={handleLoadStart}
        onLoadEnd={handleLoadEnd}
        onError={handleError}
      />
      {isLoading && (
        <View style={[avatarStyle, {
          position: 'absolute',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          justifyContent: 'center',
          alignItems: 'center'
        }]}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the URI or size changes
  return prevProps.uri === nextProps.uri && prevProps.size === nextProps.size;
});
