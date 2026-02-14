import { useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Redirects to login when user is not signed in and they try to access protected routes (home, garden).
 */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const current = segments[0];
  const isProtected = current === 'home' || current === 'garden' || current === 'add-plant';

  useEffect(() => {
    if (loading) return;
    if (!user && isProtected) {
      router.replace('/');
    }
  }, [user, loading, isProtected, router]);

  return <>{children}</>;
}
