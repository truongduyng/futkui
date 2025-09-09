import React, { useState, useRef, useEffect } from 'react';
import { Image, View, StyleSheet, Text } from 'react-native';
import { ImageSkeleton } from './ImageSkeleton';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';

interface SkeletonImageProps {
  source: { uri: string };
  style?: any;
  skeletonStyle?: any;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'repeat' | 'center';
  borderRadius?: number;
  showErrorFallback?: boolean;
}

export function SkeletonImage({ 
  source, 
  style, 
  skeletonStyle,
  resizeMode = 'cover',
  borderRadius = 0,
  showErrorFallback = true
}: SkeletonImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const isMountedRef = useRef(true);
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    // Reset states when source changes
    setIsLoading(true);
    setHasError(false);
  }, [source.uri]);

  const handleLoadStart = () => {
    if (!isMountedRef.current) return;
    setIsLoading(true);
    setHasError(false);
  };

  const handleLoad = () => {
    if (!isMountedRef.current) return;
    setIsLoading(false);
    setHasError(false);
  };

  const handleError = () => {
    if (!isMountedRef.current) return;
    setIsLoading(false);
    setHasError(true);
  };

  return (
    <View style={[styles.container, style]}>
      <Image
        source={source}
        style={[
          styles.image,
          { opacity: isLoading || hasError ? 0 : 1, borderRadius }
        ]}
        resizeMode={resizeMode}
        onLoadStart={handleLoadStart}
        onLoad={handleLoad}
        onError={handleError}
      />
      {isLoading && (
        <ImageSkeleton
          width="100%"
          height="100%"
          borderRadius={borderRadius}
          style={[styles.skeleton, skeletonStyle]}
        />
      )}
      {hasError && showErrorFallback && (
        <View style={[
          styles.errorFallback,
          { 
            backgroundColor: colors.card,
            borderColor: colors.border,
            borderWidth: 1,
            borderRadius 
          }
        ]}>
          <Text style={styles.errorEmoji}>📷</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  skeleton: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  errorFallback: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorEmoji: {
    fontSize: 24,
    opacity: 0.5,
  },
});