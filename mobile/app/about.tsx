import { WebViewModal } from "@/components/WebViewModal";
import { FeedbackModal } from "@/components/FeedbackModal";
import { Colors } from "@/constants/Colors";
import { useTheme } from '@/contexts/ThemeContext';
import { Ionicons } from "@expo/vector-icons";
import * as Application from 'expo-application';
import * as StoreReview from 'expo-store-review';
import * as WebBrowser from 'expo-web-browser';
import React, { useState } from "react";
import {
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import * as Clipboard from 'expo-clipboard';
import Toast from 'react-native-toast-message';
import { useTranslation } from "react-i18next";

export default function AboutScreen() {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;

  const [webViewModal, setWebViewModal] = useState<{visible: boolean; url: string; title: string}>({
    visible: false,
    url: '',
    title: ''
  });

  const [feedbackModalVisible, setFeedbackModalVisible] = useState(false);

  const appVersion = Application.nativeApplicationVersion || "1.0.0";
  const buildVersion = Application.nativeBuildVersion || "1";

  const handlePrivacy = () => {
    setWebViewModal({
      visible: true,
      url: 'https://futkui.com/en/privacy',
      title: 'Privacy Policy'
    });
  };

  const handleTerms = () => {
    setWebViewModal({
      visible: true,
      url: 'https://futkui.com/en/terms',
      title: 'Terms of Service'
    });
  };

  const handleRateApp = async () => {
    try {
      const isAvailable = await StoreReview.isAvailableAsync();
      if (isAvailable) {
        await StoreReview.requestReview();
      } else {
        // Fallback to store URL
        const storeUrl = Platform.OS === 'ios'
          ? 'https://apps.apple.com/us/app/futkui-chat-nh%C3%B3m-th%E1%BB%83-thao/id6751161027' // Replace with actual App Store ID
          : 'https://play.google.com/store/apps/details?id=com.futkui'; // Replace with actual package name
        await WebBrowser.openBrowserAsync(storeUrl);
      }
    } catch (error) {
      console.error('Error opening store review:', error);
      Alert.alert(t('common.error'), t('about.rateError'));
    }
  };

  const handleFeedback = () => {
    setFeedbackModalVisible(true);
  };

  const handleContactUs = async () => {
    try {
      await Clipboard.setStringAsync('hi@futkui.com');
      Toast.show({
        type: 'success',
        text1: t('about.contactEmailCopied'),
        text2: 'hi@futkui.com'
      });
    } catch (error) {
      console.error('Error copying email:', error);
      Toast.show({
        type: 'info',
        text1: t('about.contactUs'),
        text2: 'hi@futkui.com'
      });
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* App Info Section */}
        <View style={styles.section}>
          <View style={styles.appHeader}>
            <View style={[styles.appIcon, { backgroundColor: colors.tint }]}>
              <Text style={styles.appIconText}>FK</Text>
            </View>
            <Text style={[styles.appName, { color: colors.text }]}>FutKui</Text>
            <Text style={[styles.appVersion, { color: colors.tabIconDefault }]}>
              {t('about.version')} {appVersion} ({buildVersion})
            </Text>
            <Text style={[styles.appDescription, { color: colors.tabIconDefault }]}>
              {t('about.description')}
            </Text>
          </View>
        </View>

        {/* Menu Section */}
        <View style={styles.section}>
          <View style={[styles.menuContainer, { backgroundColor: colors.background }]}>
            <TouchableOpacity
              style={[styles.menuButton, styles.menuButtonFirst]}
              onPress={handleRateApp}
              activeOpacity={0.8}
            >
              <View style={styles.menuButtonContent}>
                <View
                  style={[
                    styles.menuIconContainer,
                    { backgroundColor: "rgba(255, 193, 7, 0.1)" },
                  ]}
                >
                  <Ionicons name="star-outline" size={20} color="#FFC107" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text
                    style={[styles.menuButtonTitle, { color: colors.text }]}
                  >
                    {t('about.rateApp')}
                  </Text>
                  <Text
                    style={[
                      styles.menuButtonSubtitle,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {t('about.rateAppDescription')}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.tabIconDefault}
              />
            </TouchableOpacity>

            <View style={[styles.menuSeparator, { backgroundColor: colors.tabIconDefault }]} />

            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleFeedback}
              activeOpacity={0.8}
            >
              <View style={styles.menuButtonContent}>
                <View
                  style={[
                    styles.menuIconContainer,
                    { backgroundColor: "rgba(33, 150, 243, 0.1)" },
                  ]}
                >
                  <Ionicons name="mail-outline" size={20} color="#2196F3" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text
                    style={[styles.menuButtonTitle, { color: colors.text }]}
                  >
                    {t('about.sendFeedback')}
                  </Text>
                  <Text
                    style={[
                      styles.menuButtonSubtitle,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {t('about.sendFeedbackDescription')}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.tabIconDefault}
              />
            </TouchableOpacity>

            <View style={[styles.menuSeparator, { backgroundColor: colors.tabIconDefault }]} />

            <TouchableOpacity
              style={styles.menuButton}
              onPress={handleContactUs}
              activeOpacity={0.8}
            >
              <View style={styles.menuButtonContent}>
                <View
                  style={[
                    styles.menuIconContainer,
                    { backgroundColor: "rgba(76, 175, 80, 0.1)" },
                  ]}
                >
                  <Ionicons name="chatbubble-outline" size={20} color="#4CAF50" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text
                    style={[styles.menuButtonTitle, { color: colors.text }]}
                  >
                    {t('about.contactUs')}
                  </Text>
                  <Text
                    style={[
                      styles.menuButtonSubtitle,
                      { color: colors.tabIconDefault },
                    ]}
                  >
                    {t('about.contactUsDescription')}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.tabIconDefault}
              />
            </TouchableOpacity>

            <View style={[styles.menuSeparator, { backgroundColor: colors.tabIconDefault }]} />

            <TouchableOpacity
              style={styles.menuButton}
              onPress={handlePrivacy}
              activeOpacity={0.8}
            >
              <View style={styles.menuButtonContent}>
                <View
                  style={[
                    styles.menuIconContainer,
                    { backgroundColor: "rgba(74, 144, 226, 0.1)" },
                  ]}
                >
                  <Ionicons name="shield-outline" size={20} color="#4A90E2" />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text
                    style={[styles.menuButtonTitle, { color: colors.text }]}
                  >
                    {t('explore.privacy')}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.tabIconDefault}
              />
            </TouchableOpacity>

            <View style={[styles.menuSeparator, { backgroundColor: colors.tabIconDefault }]} />

            <TouchableOpacity
              style={[styles.menuButton, styles.menuButtonLast]}
              onPress={handleTerms}
              activeOpacity={0.8}
            >
              <View style={styles.menuButtonContent}>
                <View
                  style={[
                    styles.menuIconContainer,
                    { backgroundColor: "rgba(156, 39, 176, 0.1)" },
                  ]}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={20}
                    color="#9C27B0"
                  />
                </View>
                <View style={styles.menuTextContainer}>
                  <Text
                    style={[styles.menuButtonTitle, { color: colors.text }]}
                  >
                    {t('explore.termsOfService')}
                  </Text>
                </View>
              </View>
              <Ionicons
                name="chevron-forward"
                size={20}
                color={colors.tabIconDefault}
              />
            </TouchableOpacity>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.tabIconDefault }]}>
            {t('about.madeWith')} ❤️ {t('about.byTeam')}
          </Text>
          <Text style={[styles.footerText, { color: colors.tabIconDefault }]}>
            © 2025 FutKui. {t('about.allRightsReserved')}
          </Text>
        </View>
      </ScrollView>

      <WebViewModal
        visible={webViewModal.visible}
        onClose={() => setWebViewModal({visible: false, url: '', title: ''})}
        url={webViewModal.url}
        title={webViewModal.title}
      />

      <FeedbackModal
        isVisible={feedbackModalVisible}
        onClose={() => setFeedbackModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  section: {
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
  },
  appHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  appIcon: {
    width: 80,
    height: 80,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  appIconText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  appName: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  appVersion: {
    fontSize: 16,
    marginBottom: 8,
  },
  appDescription: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  menuContainer: {
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  menuButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuButtonFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  menuButtonLast: {
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  menuSeparator: {
    height: 0.5,
    marginLeft: 68,
    opacity: 0.3,
  },
  menuButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  menuTextContainer: {
    flex: 1,
  },
  menuButtonTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  menuButtonSubtitle: {
    fontSize: 13,
    opacity: 0.8,
  },
  footer: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    alignItems: 'center',
    marginTop: 'auto',
  },
  footerText: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 4,
  },
});
