import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Image,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width: screenWidth } = Dimensions.get("window");

interface PhotoCarouselProps {
  photos: string[];
  avatarUrl?: string;
  autoSlide?: boolean;
  autoSlideInterval?: number;
  showDots?: boolean;
  style?: any;
}

export default function PhotoCarousel({
  photos = [],
  avatarUrl,
  autoSlide = true,
  autoSlideInterval = 3000,
  showDots = true,
  style,
}: PhotoCarouselProps) {
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [autoSlideEnabled, setAutoSlideEnabled] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Combine avatar and photos into a single array
  const allImages = React.useMemo(() => {
    const images = [];
    if (avatarUrl) images.push(avatarUrl);
    if (photos && photos.length > 0) images.push(...photos);
    return images;
  }, [avatarUrl, photos]);

  // Auto-slide functionality - stops permanently when user interacts
  useEffect(() => {
    if (autoSlide && autoSlideEnabled && allImages.length > 1) {
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prevIndex) => {
          const nextIndex = (prevIndex + 1) % allImages.length;
          flatListRef.current?.scrollToIndex({
            index: nextIndex,
            animated: true,
          });
          return nextIndex;
        });
      }, autoSlideInterval);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [autoSlide, autoSlideEnabled, allImages.length, autoSlideInterval]);

  // Clean up interval when component unmounts
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const handleDotPress = (index: number) => {
    setCurrentIndex(index);
    flatListRef.current?.scrollToIndex({
      index,
      animated: true,
    });

    // Permanently disable auto-slide when user manually navigates
    disableAutoSlide();
  };

  const disableAutoSlide = () => {
    setAutoSlideEnabled(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  };

  const onScrollBegin = () => {
    // Permanently disable auto-slide when user starts swiping
    disableAutoSlide();
  };

  const onScrollEnd = (event: any) => {
    const newIndex = Math.round(
      event.nativeEvent.contentOffset.x / screenWidth,
    );
    setCurrentIndex(newIndex);
  };

  if (allImages.length === 0) {
    return (
      <View style={[styles.container, style]}>
        <View style={styles.placeholderImage}>
          <Ionicons name="person" size={80} color="#999" />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, style]}>
      <FlatList
        ref={flatListRef}
        data={allImages}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScrollBeginDrag={onScrollBegin}
        onMomentumScrollEnd={onScrollEnd}
        decelerationRate="fast"
        snapToInterval={screenWidth}
        snapToAlignment="start"
        keyExtractor={(_, index) => `photo-${index}`}
        renderItem={({ item: imageUri }) => (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: imageUri }}
              style={styles.image}
              resizeMode="cover"
            />
          </View>
        )}
        getItemLayout={(_, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
      />

      {/* Dots Indicator */}
      {showDots && allImages.length > 1 && (
        <View style={styles.dotsContainer}>
          {allImages.map((_, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.dot,
                index === currentIndex ? styles.activeDot : styles.inactiveDot,
              ]}
              onPress={() => handleDotPress(index)}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
    height: "100%",
  },
  imageContainer: {
    width: screenWidth,
    height: "100%",
  },
  image: {
    width: "100%",
    height: "100%",
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f0f0f0",
  },
  dotsContainer: {
    position: "absolute",
    bottom: 165,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: "center",
    marginHorizontal: 20,
    zIndex: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.3)",
  },
  activeDot: {
    backgroundColor: "#fff",
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  inactiveDot: {
    backgroundColor: "rgba(255,255,255,0.3)",
    borderColor: "rgba(255,255,255,0.5)",
  },
});
