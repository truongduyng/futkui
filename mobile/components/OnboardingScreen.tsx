import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ImageBackground,
  Dimensions,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { IconSymbol } from './ui/IconSymbol';

const { width: screenWidth } = Dimensions.get('window');

interface OnboardingScreenProps {
  onComplete: () => void;
}

interface OnboardingPage {
  title: string;
  subtitle: string;
  icon: string;
  backgroundImage?: any;
  backgroundColor?: string;
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const { t } = useTranslation();

  const pages: OnboardingPage[] = [
    {
      title: t('onboarding.welcome.title'),
      subtitle: t('onboarding.welcome.subtitle'),
      icon: 'hand.wave.fill',
      backgroundImage: require('../assets/images/foot_ball.jpeg'),
    },
    {
      title: t('onboarding.features.title'),
      subtitle: t('onboarding.features.subtitle'),
      icon: 'person.3.fill',
      backgroundImage: require('../assets/images/pickleball.jpeg'),
    },
    {
      title: t('onboarding.activities.title'),
      subtitle: t('onboarding.activities.subtitle'),
      icon: 'sportscourt.fill',
      backgroundImage: require('../assets/images/tennis.jpeg'),
    },
    {
      title: t('onboarding.ready.title'),
      subtitle: t('onboarding.ready.subtitle'),
      icon: 'rocket.fill',
      backgroundImage: require('../assets/images/badminton.jpeg'),
    },
  ];

  const handleNext = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    } else {
      onComplete();
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  const handlePrevious = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  const currentPageData = pages[currentPage];
  const isLastPage = currentPage === pages.length - 1;

  const containerContent = (
    <>
      <StatusBar
        barStyle="light-content"
        backgroundColor={currentPageData.backgroundImage ? 'transparent' : (currentPageData.backgroundColor || colors.background)}
      />

      {/* Skip Button */}
      {!isLastPage && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={handleSkip}
          activeOpacity={0.7}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={[styles.skipText, { color: 'white' }]}>
            {t('onboarding.skip')}
          </Text>
        </TouchableOpacity>
      )}

      {/* Overlay for better text readability */}
      {currentPageData.backgroundImage && (
        <View style={styles.overlay} />
      )}

      {/* Main Content */}
      <View style={styles.content}>
        {/* Logo/Icon Area */}
        <View style={styles.iconContainer}>
          {currentPage === 0 ? (
            <Image
              source={require('../assets/images/splash-icon.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          ) : (
            <View style={styles.iconBackground}>
              <IconSymbol
                name={currentPageData.icon as any}
                size={80}
                color="white"
              />
            </View>
          )}
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={[styles.title, { color: 'white' }]}>
            {currentPageData.title}
          </Text>
          <Text style={[styles.subtitle, { color: 'rgba(255, 255, 255, 0.9)' }]}>
            {currentPageData.subtitle}
          </Text>
        </View>
      </View>

      {/* Bottom Section */}
      <View style={styles.bottomContainer}>
        {/* Page Indicators */}
        <View style={styles.pageIndicators}>
          {pages.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                {
                  backgroundColor:
                    index === currentPage
                      ? 'white'
                      : 'rgba(255, 255, 255, 0.4)',
                  width: index === currentPage ? 24 : 8,
                },
              ]}
            />
          ))}
        </View>

        {/* Navigation Buttons */}
        <View style={styles.buttonContainer}>
          {currentPage > 0 && (
            <TouchableOpacity
              style={[styles.navButton, styles.backButton]}
              onPress={handlePrevious}
            >
              <Text style={[styles.navButtonText, { color: 'rgba(255, 255, 255, 0.8)' }]}>
                {t('onboarding.back')}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={[
              styles.navButton,
              styles.nextButton,
              { backgroundColor: 'rgba(255, 255, 255, 0.2)' },
            ]}
            onPress={handleNext}
          >
            <Text style={[styles.navButtonText, { color: 'white', fontWeight: '600' }]}>
              {isLastPage ? t('onboarding.getStarted') : t('onboarding.next')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  if (currentPageData.backgroundImage) {
    return (
      <ImageBackground
        source={currentPageData.backgroundImage}
        style={styles.container}
        resizeMode="cover"
      >
        <SafeAreaView style={styles.safeArea}>
          {containerContent}
        </SafeAreaView>
      </ImageBackground>
    );
  }

  return (
    <SafeAreaView
      style={[
        styles.container,
        {
          backgroundColor: currentPageData.backgroundColor || colors.background,
        },
      ]}
    >
      {containerContent}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  safeArea: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    zIndex: 0,
  },
  skipButton: {
    position: 'absolute',
    top: StatusBar.currentHeight ? StatusBar.currentHeight + 20 : 60,
    right: 20,
    zIndex: 10,
    padding: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 16,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '500',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 1,
  },
  iconContainer: {
    marginBottom: 48,
    alignItems: 'center',
  },
  logo: {
    width: 120,
    height: 120,
    zIndex: 10,
    padding: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    borderRadius: 60,
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    maxWidth: screenWidth - 64,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 18,
    textAlign: 'center',
    lineHeight: 26,
    opacity: 0.9,
  },
  bottomContainer: {
    paddingHorizontal: 32,
    paddingBottom: 48,
    paddingTop: 32,
    zIndex: 1,
  },
  pageIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
    gap: 8,
  },
  indicator: {
    height: 8,
    borderRadius: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navButton: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderRadius: 12,
    minWidth: 100,
    alignItems: 'center',
  },
  backButton: {
    backgroundColor: 'transparent',
  },
  nextButton: {
    flex: 1,
    marginLeft: 16,
  },
  navButtonText: {
    fontSize: 16,
  },
});
