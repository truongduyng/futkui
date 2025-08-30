import { Colors } from '@/constants/Colors';
import { useTheme } from '@/contexts/ThemeContext';
import { useInstantDB } from '@/hooks/useInstantDB';
import AntDesign from '@expo/vector-icons/AntDesign';
// Conditional import for Google Sign-In to avoid module errors in Expo Go
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Platform, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ProfileSetup } from './ProfileSetup';
import { WebViewModal } from './WebViewModal';


interface AuthGateProps {
  children: React.ReactNode;
}

function AuthenticatedContent({ children }: { children: React.ReactNode }) {
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const { t } = useTranslation();
  const { instantClient, useProfile, ensureUserHasBotGroup } = useInstantDB();
  const { user } = instantClient.useAuth();
  const botGroupInitiatedRef = useRef(new Set<string>());
  const [showProfileSetup, setShowProfileSetup] = useState(false);

  const { data: profileData, isLoading: profileLoading } = useProfile();
  const profile = profileData?.profiles?.[0];

  // Check if user needs to set up profile
  useEffect(() => {
    if (user && !profileLoading && !profile) {
      setShowProfileSetup(true);
    }
  }, [user, profileLoading, profile]);

  // Ensure bot group is created for the user after profile is created
  useEffect(() => {
    if (profile?.id && !botGroupInitiatedRef.current.has(profile.id)) {
      botGroupInitiatedRef.current.add(profile.id);
      ensureUserHasBotGroup(profile.id).catch(error => {
        console.error('Error ensuring bot group in AuthenticatedContent:', error);
        botGroupInitiatedRef.current.delete(profile.id); // Reset on error to allow retry
      });
    }
  }, [profile?.id, ensureUserHasBotGroup]);

  const handleProfileCreated = () => {
    setShowProfileSetup(false);
    // The profile query will automatically refetch and show the main content
  };

  if (profileLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.text }]}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (showProfileSetup && user) {
    return (
      <ProfileSetup
        userId={user.id}
        onProfileCreated={handleProfileCreated}
      />
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.text }]}>{t('auth.settingUpProfile')}</Text>
      </View>
    );
  }

  return <>{children}</>;
}

export function AuthGate({ children }: AuthGateProps) {
  const [sentEmail, setSentEmail] = useState('');
  const { isDark } = useTheme();
  const colors = isDark ? Colors.dark : Colors.light;
  const { t } = useTranslation();

  const { instantClient } = useInstantDB();
  const { user, isLoading: authLoading } = instantClient.useAuth();

  // Reset sentEmail when user logs out
  useEffect(() => {
    if (!user) {
      setSentEmail('');
    }
  }, [user]);

  if (authLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.text }]}>{t('common.loading')}</Text>
      </View>
    );
  }

  if (user) {
    return <AuthenticatedContent>{children}</AuthenticatedContent>;
  }

  return (
    <KeyboardAvoidingView
      style={[styles.container, { backgroundColor: colors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.authContainer}>
        {!sentEmail ? (
          <EmailStep onSendEmail={setSentEmail} colors={colors} instantClient={instantClient} />
        ) : (
          <CodeStep sentEmail={sentEmail} onBack={() => setSentEmail('')} colors={colors} instantClient={instantClient} />
        )}
      </View>
    </KeyboardAvoidingView>
  );
}

function EmailStep({ onSendEmail, colors, instantClient }: { onSendEmail: (email: string) => void; colors: any; instantClient: any }) {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showLegalModal, setShowLegalModal] = useState(false);
  const [legalModalData, setLegalModalData] = useState<{ url: string; title: string } | null>(null);

  useEffect(() => {
    // Configure Google Sign-In
    try {
      // Dynamically import Google Sign-In
      import('@react-native-google-signin/google-signin').then(({ GoogleSignin }) => {
        GoogleSignin.configure({
          iosClientId: '47888129307-u4k28pevnbqrtbit67ce0lhgm497s2vu.apps.googleusercontent.com',
          webClientId: '47888129307-dgs1cdotptmh232gigmtukg7bsso31p4.apps.googleusercontent.com',
        });
      });
    } catch (error) {
      console.warn('Google Sign-In not available:', error);
    }
  }, []);

  const handleSubmit = async () => {
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      await instantClient.auth.sendMagicCode({ email });
      onSendEmail(email);
    } catch (error) {
      Alert.alert(t('common.error'), t('auth.failedSendCode'));
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const nonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        Math.random().toString(),
        { encoding: Crypto.CryptoEncoding.HEX }
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce,
      });

      if (credential.identityToken) {
        await instantClient.auth.signInWithIdToken({
          clientName: 'apple',
          idToken: credential.identityToken,
          nonce,
        });

        // Store Apple-provided user info for automatic profile creation
        if (credential.fullName || credential.email) {
          const appleUserInfo = {
            fullName: credential.fullName,
            email: credential.email,
            authMethod: 'apple'
          };

          // Store in AsyncStorage to use during profile creation
          try {
            const AsyncStorage = await import('@react-native-async-storage/async-storage');
            await AsyncStorage.default.setItem('appleUserInfo', JSON.stringify(appleUserInfo));
          } catch (storageError) {
            console.warn('Failed to store Apple user info:', storageError);
          }
        }
      }
    } catch (error: any) {
      if (error.code === 'ERR_CANCELED') {
        // User canceled the sign-in flow
        return;
      }
      Alert.alert(t('common.error'), t('auth.failedAppleSignIn'));
      console.error('Apple Sign In error:', error);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      // Dynamically import Google Sign-In
      const { GoogleSignin } = await import('@react-native-google-signin/google-signin');

      // Check if Google Play services are available (Android)
      if (Platform.OS === 'android') {
        await GoogleSignin.hasPlayServices();
      }

      const userInfo = await GoogleSignin.signIn();
      const idToken = userInfo.data?.idToken;

      if (!idToken) {
        console.error('No ID token present!');
        Alert.alert(t('common.error'), 'Failed to get authentication token from Google');
        return;
      }


      // Use correct client name for Android
      const androidClientName = __DEV__ ? 'google-android-dev' : 'google-android';
      const clientName = Platform.OS === 'android' ? androidClientName : 'google-ios';

      await instantClient.auth.signInWithIdToken({
        clientName,
        idToken,
      });

    } catch (error: any) {
      if (error.code === 'SIGN_IN_CANCELLED' || error.code === 'SIGN_IN_CANCELED') {
        // User canceled the sign-in flow
        return;
      }
      Alert.alert(t('common.error'), t('auth.failedGoogleSignIn'));
      console.error('Google Sign In error:', error);
    }
  };

  const handlePrivacyPress = () => {
    setLegalModalData({
      url: 'https://futkui.com/privacy',
      title: 'Privacy Policy'
    });
    setShowLegalModal(true);
  };

  const handleTermsPress = () => {
    setLegalModalData({
      url: 'https://futkui.com/terms',
      title: 'Terms of Service'
    });
    setShowLegalModal(true);
  };

  return (
    <>
      <Image
        source={require('../assets/images/splash-icon.png')}
        style={styles.logo}
        resizeMode="contain"
      />
      <Text style={[styles.title, { color: colors.text }]}>{t('auth.welcome')}</Text>
      {/* <Text style={[styles.subtitle, { color: colors.text }]}>
        {t('auth.chooseMethod')}
      </Text> */}

      <TouchableOpacity
        style={styles.googleButton}
        onPress={handleGoogleSignIn}
      >
        <View style={styles.googleButtonContent}>
          <AntDesign name="google" size={16} style={styles.googleIcon} />
          <Text style={styles.googleButtonText}>{t('auth.signInGoogle')}</Text>
        </View>
      </TouchableOpacity>

      {Platform.OS === 'ios' && (
        <AppleAuthentication.AppleAuthenticationButton
          buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
          buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
          cornerRadius={8}
          style={styles.appleButton}
          onPress={handleAppleSignIn}
        />
      )}


      <Text style={[styles.orText, { color: colors.text }]}>or</Text>

      <TextInput
        style={[styles.input, {
          borderColor: colors.icon,
          color: colors.text,
          backgroundColor: colors.background
        }]}
        placeholder={t('auth.placeholderEmail')}
        placeholderTextColor={colors.tabIconDefault}
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
      />
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.tint }]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? t('common.sending') : t('auth.sendCode')}
        </Text>
      </TouchableOpacity>

      <Text style={[styles.privacyText, { color: colors.tabIconDefault }]}>
        {t('auth.privacyAccept')}{' '}
        <Text style={[styles.privacyLink, { color: colors.tint }]} onPress={handleTermsPress}>
          {t('auth.termsOfService')}
        </Text>
        {' '}{t('auth.and')}{' '}
        <Text style={[styles.privacyLink, { color: colors.tint }]} onPress={handlePrivacyPress}>
          {t('auth.privacyPolicy')}
        </Text>
        .
      </Text>

      {legalModalData && (
        <WebViewModal
          visible={showLegalModal}
          onClose={() => {
            setShowLegalModal(false);
            setLegalModalData(null);
          }}
          url={legalModalData.url}
          title={legalModalData.title}
        />
      )}
    </>
  );
}

function CodeStep({ sentEmail, onBack, colors, instantClient }: {
  sentEmail: string;
  onBack: () => void;
  colors: any;
  instantClient: any;
}) {
  const { t } = useTranslation();
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!code.trim()) return;

    setIsLoading(true);
    try {
      console.log('Attempting to sign in with magic code...');
      await instantClient.auth.signInWithMagicCode({ email: sentEmail, code });
      console.log('Sign-in successful!');

    } catch (error) {
      Alert.alert(t('common.error'), t('auth.invalidCode'));
      setCode('');
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Text style={[styles.title, { color: colors.text }]}>{t('auth.enterCode')}</Text>
      <Text style={[styles.subtitle, { color: colors.text }]}>
        {t('auth.enterCodeSent')} <Text style={{ fontWeight: 'bold' }}>{sentEmail}</Text>
      </Text>
      <TextInput
        style={[styles.input, {
          borderColor: colors.icon,
          color: colors.text,
          backgroundColor: colors.background
        }]}
        placeholder={t('auth.placeholderCode')}
        placeholderTextColor={colors.tabIconDefault}
        value={code}
        onChangeText={setCode}
        keyboardType="number-pad"
        maxLength={6}
      />
      <TouchableOpacity
        style={[styles.button, { backgroundColor: colors.tint }]}
        onPress={handleSubmit}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? t('common.verifying') : t('auth.verifyCode')}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={[styles.backButtonText, { color: colors.tint }]}>
          {t('auth.backToEmail')}
        </Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  authContainer: {
    width: '80%',
    maxWidth: 300,
    alignItems: 'center',
  },
  logo: {
    width: 80,
    height: 80,
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 28,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    marginBottom: 24,
    textAlign: 'center',
    opacity: 0.8,
  },
  input: {
    width: '100%',
    height: 48,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 16,
    marginBottom: 16,
    fontSize: 16,
  },
  button: {
    width: '100%',
    height: 48,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    paddingVertical: 8,
  },
  backButtonText: {
    fontSize: 14,
  },
  text: {
    fontSize: 16,
  },
  appleButton: {
    width: '100%',
    height: 48,
    marginBottom: 16,
  },
  googleButton: {
    width: '100%',
    height: 48,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#dadce0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  googleIcon: {
    marginRight: 8,
    color: '#4285f4',
  },
  googleButtonText: {
    color: '#3c4043',
    fontSize: 18,
    fontWeight: '600',
  },
  orText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 16,
    opacity: 0.7,
  },
  privacyText: {
    fontSize: 12,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.6,
  },
  privacyLink: {
    textDecorationLine: 'underline',
  },
  contentGuidelinesText: {
    fontSize: 11,
    textAlign: 'center',
    marginTop: 8,
    opacity: 0.6,
    fontStyle: 'italic',
  },
});
