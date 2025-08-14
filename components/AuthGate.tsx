import { Colors } from '@/constants/Colors';
import { useInstantDB } from '@/hooks/useInstantDB';
import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

interface AuthGateProps {
  children: React.ReactNode;
}

function AuthenticatedContent({ children }: { children: React.ReactNode }) {
  const colors = Colors['light'];
  const { instantClient, useProfile, createProfile, ensureUserHasBotGroup } = useInstantDB();
  const { user } = instantClient.useAuth();
  const botGroupInitiatedRef = useRef(new Set<string>());

  const { data: profileData, isLoading: profileLoading } = useProfile();
  const profile = profileData?.profiles?.[0];

  useEffect(() => {
    if (user && !profileLoading && !profile) {
      createProfile(user.id);
    }
  }, [user, profileLoading, profile, createProfile]);

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

  if (profileLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.text }]}>Loading...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.text }]}>Setting up your profile...</Text>
      </View>
    );
  }

  return <>{children}</>;
}

export function AuthGate({ children }: AuthGateProps) {
  const [sentEmail, setSentEmail] = useState('');
  const colors = Colors['light'];

  const { instantClient } = useInstantDB();
  const { user, isLoading: authLoading } = instantClient.useAuth();

  if (authLoading) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[styles.text, { color: colors.text }]}>Loading...</Text>
      </View>
    );
  }

  if (user) {
    return <AuthenticatedContent>{children}</AuthenticatedContent>;
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={styles.authContainer}>
        {!sentEmail ? (
          <EmailStep onSendEmail={setSentEmail} colors={colors} instantClient={instantClient} />
        ) : (
          <CodeStep sentEmail={sentEmail} onBack={() => setSentEmail('')} colors={colors} instantClient={instantClient} />
        )}
      </View>
    </View>
  );
}

function EmailStep({ onSendEmail, colors, instantClient }: { onSendEmail: (email: string) => void; colors: any; instantClient: any }) {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      await instantClient.auth.sendMagicCode({ email });
      onSendEmail(email);
    } catch (error) {
      Alert.alert('Error', 'Failed to send code. Please try again.');
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Text style={[styles.title, { color: colors.text }]}>Welcome to FutKui</Text>
      <Text style={[styles.subtitle, { color: colors.text }]}>
        Enter your email to get started
      </Text>
      <TextInput
        style={[styles.input, {
          borderColor: colors.icon,
          color: colors.text,
          backgroundColor: colors.background
        }]}
        placeholder="Enter your email"
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
          {isLoading ? 'Sending...' : 'Send Code'}
        </Text>
      </TouchableOpacity>
    </>
  );
}

function CodeStep({ sentEmail, onBack, colors, instantClient }: {
  sentEmail: string;
  onBack: () => void;
  colors: any;
  instantClient: any;
}) {
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
      Alert.alert('Error', 'Invalid code. Please try again.');
      setCode('');
      console.error('Auth error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Text style={[styles.title, { color: colors.text }]}>Enter Code</Text>
      <Text style={[styles.subtitle, { color: colors.text }]}>
        We sent a code to <Text style={{ fontWeight: 'bold' }}>{sentEmail}</Text>
      </Text>
      <TextInput
        style={[styles.input, {
          borderColor: colors.icon,
          color: colors.text,
          backgroundColor: colors.background
        }]}
        placeholder="Enter 6-digit code"
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
          {isLoading ? 'Verifying...' : 'Verify Code'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.backButton} onPress={onBack}>
        <Text style={[styles.backButtonText, { color: colors.tint }]}>
          Back to email
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
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
});
