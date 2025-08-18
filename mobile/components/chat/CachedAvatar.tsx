import React, { memo, useState } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';

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

  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
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
        onLoad={handleLoad}
        onError={handleError}
      />
      {isLoading && (
        <View style={[avatarStyle, {
          position: 'absolute',
          backgroundColor: 'rgba(255, 255, 255, 0.9)',
          justifyContent: 'center',
          alignItems: 'center'
        }]}>
          <ActivityIndicator size="small" color="#cad0d7ff" />
        </View>
      )}
    </View>
  );
}, (prevProps, nextProps) => {
  // Only re-render if the URI or size changes
  return prevProps.uri === nextProps.uri && prevProps.size === nextProps.size;
});
