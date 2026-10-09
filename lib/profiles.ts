
import { supabase } from './supabase';

export type Role = 'student' | 'teacher';

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
};

export async function getProfile(
  userId: string
): Promise<Profile | null> {
  console.log('Fetching profile for:', userId);

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, role')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('SUPABASE PROFILE ERROR:', error);
    return null;
  }

  console.log('PROFILE DATA:', data);

  if (!data) {
    console.log('No profile found for user:', userId);
    return null;
  }

  return data as Profile;
}

export async function updateProfile(
  userId: string,
  updates: {
    full_name?: string;
    role?: Role;
  }
): Promise<{ error: string | null }> {
  console.log('Updating profile for:', userId);

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId);

  if (error) {
    console.error('SUPABASE UPDATE ERROR:', error);
    return { error: error.message };
  }

  console.log('Profile updated successfully');

  return { error: null };
}