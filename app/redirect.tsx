import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Handles Google OAuth redirect on web (full-page redirect flow).
 * Google redirects here with #id_token=... in the hash. We parse it and sign in.
 */
function parseHashParams(hash: string): Record<string, string> {
  const params: Record<string, string> = {};
  if (!hash || hash.charAt(0) !== '#') return params;
  const pairs = hash.slice(1).split('&');
  for (const pair of pairs) {
    const [key, value] = pair.split('=').map(decodeURIComponent);
    if (key && value) params[key] = value;
  }
  return params;
}

export default function RedirectScreen() {
  const router = useRouter();
  const { signInWithGoogleIdToken } = useAuth();
  const [status, setStatus] = useState<'loading' | 'done' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    if (Platform.OS !== 'web' || typeof window === 'undefined') {
      router.replace('/');
      return;
    }

    const hash = window.location.hash;
    const params = parseHashParams(hash);

    const idToken = params.id_token;
    const error = params.error;

    if (error) {
      setErrorMsg(params.error_description ?? error);
      setStatus('error');
      return;
    }

    if (idToken) {
      signInWithGoogleIdToken(idToken)
        .then(() => {
          setStatus('done');
          router.replace('/home');
        })
        .catch((e) => {
          setErrorMsg(e?.message ?? 'Sign-in failed');
          setStatus('error');
        });
    } else {
      setErrorMsg('No id_token in redirect');
      setStatus('error');
    }
  }, [router, signInWithGoogleIdToken]);

  if (status === 'error') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{errorMsg}</Text>
        <TouchableOpacity onPress={() => router.replace('/')}>
          <Text style={styles.link}>Return to login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#22c55e" />
      <Text style={styles.label}>Completing sign-in…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f7f4',
    padding: 24,
  },
  label: {
    marginTop: 12,
    fontSize: 16,
    color: '#6b7b72',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    textAlign: 'center',
    marginBottom: 16,
  },
  link: {
    fontSize: 16,
    color: '#22c55e',
    fontWeight: '600',
  },
});
