import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri, ResponseType } from 'expo-auth-session';
import { useRouter } from 'expo-router';
import { useAuthRequest, discovery } from 'expo-auth-session/providers/google';
import { useAuth } from '@/contexts/AuthContext';
import { firebaseConfig } from '../lib/firebase.config';

WebBrowser.maybeCompleteAuthSession();

export default function LoginScreen() {
  const router = useRouter();
  const { user, loading: authLoading, signIn, signUp, signInWithGoogleIdToken, error, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [googleError, setGoogleError] = useState<string | null>(null);

  const googleRedirectUri = useMemo(
    () => makeRedirectUri({ scheme: 'myapp', path: 'redirect' }),
    []
  );

  const [googleRequest, googleResult, googlePromptAsync] = useAuthRequest(
    {
      webClientId: firebaseConfig.webClientId,
      androidClientId: firebaseConfig.androidClientId,
      // On web use id_token in redirect hash to avoid COOP popup issues; native uses code flow.
      ...(Platform.OS === 'web' ? { responseType: ResponseType.IdToken } : {}),
    },
    { scheme: 'myapp', path: 'redirect' }
  );

  useEffect(() => {
    if (!authLoading && user) {
      router.replace('/home');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (googleResult?.type === 'success' && googleResult.params?.id_token) {
      setGoogleError(null);
      signInWithGoogleIdToken(googleResult.params.id_token)
        .then(() => router.replace('/home'))
        .catch(() => {});
    } else if (googleResult?.type === 'error') {
      clearError();
      const msg = googleResult.error?.message ?? 'Google sign-in was cancelled or failed.';
      const isClientError = /invalid_client|401|OAuth client was not found/i.test(msg);
      setGoogleError(isClientError ? `${msg} See FIREBASE_SETUP.md or the alert for the redirect URI to add.` : msg);
      if (isClientError) {
        Alert.alert(
          'Google OAuth: Add this redirect URI',
          `In Google Cloud Console → APIs & Services → Credentials → your Web client → Authorized redirect URIs, add:\n\n${googleRedirectUri}\n\nAlso set webClientId in lib/firebase.config.ts to the Web client ID from Firebase → Authentication → Sign-in method → Google.`,
          [{ text: 'OK' }]
        );
      }
    }
  }, [googleResult, googleRedirectUri]);

  const handleSubmit = async () => {
    const trimmedEmail = email.trim();
    const trimmedPassword = password.trim();
    if (!trimmedEmail || !trimmedPassword) {
      Alert.alert('Error', 'Please enter email and password.');
      return;
    }
    if (isSignUp && trimmedPassword.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters.');
      return;
    }
    clearError();
    setSubmitting(true);
    try {
      if (isSignUp) {
        await signUp(trimmedEmail, trimmedPassword, displayName.trim() || undefined);
        router.replace('/home');
      } else {
        await signIn(trimmedEmail, trimmedPassword);
        router.replace('/home');
      }
    } catch {
      // Error is set in context; show it below form
    } finally {
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#22c55e" />
          <Text style={styles.loadingText}>Loading…</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Text style={styles.appTitle}>MyPlants</Text>
          <Text style={styles.subtitle}>Keep your plants happy and hydrated</Text>
        </View>

        <View style={styles.form}>
          {isSignUp && (
            <>
              <Text style={styles.label}>Display name (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Your name"
                value={displayName}
                onChangeText={setDisplayName}
                autoCapitalize="words"
              />
            </>
          )}

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter your email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            placeholder={isSignUp ? 'At least 6 characters' : 'Enter your password'}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete={isSignUp ? 'password-new' : 'password'}
          />

          {(error || googleError) ? (
            <Text style={styles.errorText}>{error ?? googleError}</Text>
          ) : null}

          <TouchableOpacity
            style={[styles.loginButton, submitting && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginButtonText}>
                {isSignUp ? 'Create account' : 'Log in'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={[styles.googleButton, (!googleRequest || submitting) && styles.buttonDisabled]}
            onPress={async () => {
              setGoogleError(null);
              clearError();
              if (Platform.OS === 'web' && googleRequest) {
                try {
                  const url = await googleRequest.makeAuthUrlAsync(discovery);
                  window.location.href = url;
                } catch (e) {
                  setGoogleError('Could not start Google sign-in.');
                }
              } else {
                googlePromptAsync();
              }
            }}
            disabled={!googleRequest || submitting}
          >
            <Text style={styles.googleButtonText}>Continue with Google</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.switchModeButton}
            onPress={() => {
              setIsSignUp(!isSignUp);
              clearError();
              setGoogleError(null);
            }}
            disabled={submitting}
          >
            <Text style={styles.switchModeText}>
              {isSignUp
                ? 'Already have an account? Log in'
                : "Don't have an account? Sign up"}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7f4',
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7b72',
  },
  header: {
    marginBottom: 40,
  },
  appTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#1b3b2f',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7b72',
  },
  form: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#3a4a40',
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#dde3dc',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 12 : 8,
    fontSize: 16,
    backgroundColor: '#f9fbf9',
  },
  errorText: {
    marginTop: 12,
    fontSize: 14,
    color: '#dc2626',
  },
  loginButton: {
    marginTop: 24,
    backgroundColor: '#22c55e',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
    color: '#9ca3af',
    fontWeight: '500',
  },
  googleButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 999,
    paddingVertical: 14,
    alignItems: 'center',
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  switchModeButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  switchModeText: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '500',
  },
});
