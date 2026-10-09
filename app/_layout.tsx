import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { initializeAuth } from '@/lib/auth';

export default function RootLayout() {
  useEffect(() => {
    let mounted = true;
    let unsubscribe: (() => void) | undefined;

    initializeAuth().then((cleanup: () => void) => {
      if (mounted) {
        unsubscribe = cleanup;
      } else {
        cleanup();
      }
    });

    return () => {
      mounted = false;
      unsubscribe?.();
    };
  }, []);

  return <Stack />;
}