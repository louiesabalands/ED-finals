
import { useState, useEffect } from 'react';
import { supabase } from './supabase';
import type { Session, User } from '@supabase/supabase-js';

type AuthState = {
  session: Session | null;
  user: User | null;
  loading: boolean;
};

let globalSession: Session | null = null;
let globalUser: User | null = null;
let globalLoading = true;

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => listener());
}

export function setAuth(session: Session | null) {
  globalSession = session;
  globalUser = session?.user ?? null;
  globalLoading = false;
  notify();
}

export function useAuth(): AuthState {
  const [, forceRender] = useState(0);

  useEffect(() => {
    const listener = () => forceRender((n) => n + 1);
    listeners.add(listener);

    return () => {
      listeners.delete(listener);
    };
  }, []);

  return {
    session: globalSession,
    user: globalUser,
    loading: globalLoading,
  };
}

let initializationPromise: Promise<() => void> | null = null;

export function initializeAuth(): Promise<() => void> {
  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
      console.log('Session error:', error.message);
    }

    setAuth(data.session);

    const { data: authListener } =
      supabase.auth.onAuthStateChange((_event, session) => {
        setAuth(session);
      });

    return () => {
      authListener.subscription.unsubscribe();
      initializationPromise = null;
    };
  })();

  return initializationPromise;
}

export type SignUpProfile = {
  full_name: string;
  role: 'student' | 'teacher';
};

export async function signUp(
  email: string,
  password: string,
  profile?: SignUpProfile
) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: profile
      ? {
          data: {
            full_name: profile.full_name,
            role: profile.role,
          },
        }
      : undefined,
  });

  if (error) return { data, error };

  if (data.session) setAuth(data.session);

  return { data, error: null };
}

export async function signIn(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) return { data, error };

  if (data.session) setAuth(data.session);

  return { data, error: null };
}

export async function signOut() {
  const { error } = await supabase.auth.signOut();

  if (error) return { error };

  setAuth(null);

  return { error: null };
}