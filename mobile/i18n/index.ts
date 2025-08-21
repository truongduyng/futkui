import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import AsyncStorage from '@react-native-async-storage/async-storage';

import en from './locales/en.json';
import vi from './locales/vi.json';

const resources = {
  en: {
    translation: en,
  },
  vi: {
    translation: vi,
  },
};

const initI18n = async () => {
  let savedLanguage = 'en';
  
  try {
    const storedLanguage = await AsyncStorage.getItem('selectedLanguage');
    if (storedLanguage && resources[storedLanguage as keyof typeof resources]) {
      savedLanguage = storedLanguage;
    } else {
      // Use system locale if available and supported
      const systemLocale = Localization.getLocales()[0]?.languageCode || 'en';
      savedLanguage = resources[systemLocale as keyof typeof resources] ? systemLocale : 'en';
    }
  } catch (error) {
    console.warn('Error loading saved language:', error);
  }

  return i18n
    .use(initReactI18next)
    .init({
      resources,
      lng: savedLanguage,
      fallbackLng: 'en',
      
      interpolation: {
        escapeValue: false,
      },
      
      compatibilityJSON: 'v3',
    });
};

initI18n();

// Helper function to get translated text outside of React components
export const getTranslation = (key: string): string => {
  return i18n.t(key);
};

export default i18n;