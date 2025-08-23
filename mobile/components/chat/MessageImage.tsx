import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, TouchableOpacity, View } from 'react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { Colors } from '@/constants/Colors';

interface MessageImageProps {
  imageUrl: string;
  onImagePress?: (imageUrl: string) => void;
  onLongPress?: (event: any) => void;
}

export const MessageImage = React.memo(function MessageImage({
  imageUrl,
  onImagePress,
  onLongPress,
}: MessageImageProps) {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const [imageLoading, setImageLoading] = useState(true);

  useEffect(() => {
    setImageLoading(true);
  }, [imageUrl]);

  const handleImageLoad = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handleImageError = useCallback(() => {
    setImageLoading(false);
  }, []);

  const handlePress = useCallback(() => {
    onImagePress?.(imageUrl);
  }, [onImagePress, imageUrl]);

  return (
    <TouchableOpacity
      onPress={handlePress}
      onLongPress={onLongPress}
      activeOpacity={0.8}
      style={styles.imageBubble}
    >
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: imageUrl }}
          style={styles.messageImage}
          resizeMode="cover"
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
        {imageLoading && (
          <View style={styles.imageLoadingOverlay}>
            <ActivityIndicator size="small" color={colors.tint} />
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
});

const styles = StyleSheet.create({
  imageBubble: {
    padding: 0,
    borderRadius: 12,
    maxWidth: "100%",
    zIndex: 1,
    backgroundColor: "transparent",
    marginBottom: 4,
  },
  imageContainer: {
    position: "relative",
    width: 200,
    height: 150,
  },
  messageImage: {
    width: 200,
    height: 150,
    borderRadius: 12,
    marginBottom: 4,
  },
  imageLoadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
});