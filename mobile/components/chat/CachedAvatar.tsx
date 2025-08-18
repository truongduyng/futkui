import React, { memo, useState, useRef, useEffect } from 'react';
import { ActivityIndicator, Image, View } from 'react-native';

interface CachedAvatarProps {
  uri: string;
  size: number;
  style?: any;
  fallbackComponent?: React.ReactNode;
}

// Global cache to track loaded images
const imageCache = new Set<string>();

export const CachedAvatar = memo(function CachedAvatar({ uri, size, style, fallbackComponent }: CachedAvatarProps) {
  const [isLoading, setIsLoading] = useState(!imageCache.has(uri));
  const [hasError, setHasError] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // If image is already cached, don't show loading
    if (imageCache.has(uri)) {
      setIsLoading(false);
      setHasError(false);
    }
  }, [uri]);

  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: size / 2,
  };

  const handleLoadStart = () => {
    if (!isMountedRef.current) return;
    if (!imageCache.has(uri)) {
      setIsLoading(true);
    }
    setHasError(false);
  };

  const handleLoad = () => {
    if (!isMountedRef.current) return;
    imageCache.add(uri);
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    if (!isMountedRef.current) return;
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
