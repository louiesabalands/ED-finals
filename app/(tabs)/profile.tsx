
import { useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Alert,
  TextInput,
  Pressable,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';

import { useRouter, useFocusEffect } from 'expo-router';
import AppButton from '@/components/AppButton';
import { COLORS } from '@/constants/colors';
import { useAuth, signOut } from '@/lib/auth';
import {
  getProfile,
  updateProfile,
  type Profile,
} from '@/lib/profiles';

export default function ProfileScreen() {
  const { user } = useAuth();
  const router = useRouter();

  const [profile, setProfile] = useState<Profile | null>(null);
  const [draftName, setDraftName] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    try {
      console.log('User ID:', user.id);
      console.log('User email:', user.email);

      const result = await getProfile(user.id);

      console.log('Loaded profile:', result);

      if (result) {
        setProfile(result);
        setDraftName(result.full_name ?? '');
      } else {
        setProfile(null);
        console.log('Profile not found');
      }
    } catch (error) {
      console.error('Profile loading error:', error);
      Alert.alert('Error', 'Unable to load your profile.');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      loadProfile();
    }, [loadProfile])
  );

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleSaveName = async () => {
    if (!user) return;

    if (!draftName.trim()) {
      Alert.alert('Required', 'Please enter your full name.');
      return;
    }

    setSaving(true);

    try {
      const { error } = await updateProfile(user.id, {
        full_name: draftName.trim(),
      });

      if (error) {
        Alert.alert('Error', error);
        return;
      }

      setProfile((previous) =>
        previous
          ? { ...previous, full_name: draftName.trim() }
          : previous
      );

      setEditing(false);
      Alert.alert('Success', 'Your name has been updated.');
    } catch (error) {
      console.error('Update error:', error);
      Alert.alert('Error', 'Unable to update your name.');
    } finally {
      setSaving(false);
    }
  };

  const handleSignOut = async () => {
    setLoading(true);

    try {
      const { error } = await signOut();

      if (error) {
        Alert.alert('Error', error.message);
        return;
      }

      router.replace('/login');
    } catch (error: any) {
      Alert.alert(
        'Error',
        error?.message || 'Failed to sign out.'
      );
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  const isTeacher = profile?.role === 'teacher';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
        />
      }
    >
      <Text style={styles.title}>My Profile</Text>

      <View
        style={[
          styles.roleBadge,
          isTeacher
            ? styles.teacherBadge
            : styles.studentBadge,
        ]}
      >
        <Text style={styles.roleBadgeText}>
          {profile?.role
            ? profile.role.charAt(0).toUpperCase() +
              profile.role.slice(1)
            : 'Role unavailable'}
        </Text>
      </View>

      {!profile ? (
        <View style={styles.infoCard}>
          <Text style={styles.errorText}>
            Your profile could not be loaded.
          </Text>

          <Pressable
            style={styles.retryButton}
            onPress={handleRefresh}
          >
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : (
        <View style={styles.infoCard}>
          <Text style={styles.label}>Full Name</Text>

          {editing ? (
            <View style={styles.nameEditRow}>
              <TextInput
                style={styles.nameInput}
                value={draftName}
                onChangeText={setDraftName}
                placeholder="Enter your name"
                placeholderTextColor={COLORS.textSecondary}
                editable={!saving}
              />

              <Pressable
                style={styles.saveButton}
                onPress={handleSaveName}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator
                    size="small"
                    color={COLORS.textOnPrimary}
                  />
                ) : (
                  <Text style={styles.saveButtonText}>
                    Save
                  </Text>
                )}
              </Pressable>

              <Pressable
                style={styles.cancelButton}
                onPress={() => {
                  setDraftName(profile.full_name ?? '');
                  setEditing(false);
                }}
                disabled={saving}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              onPress={() => setEditing(true)}
              style={styles.nameRow}
            >
              <Text style={styles.value}>
                {profile.full_name || 'Tap to add your name'}
              </Text>

              <Text style={styles.editHint}>Edit</Text>
            </Pressable>
          )}

          <Text style={styles.label}>Email</Text>
          <Text style={styles.value}>
            {profile.email || user?.email || 'No email'}
          </Text>

          <Text style={styles.label}>Role</Text>
          <Text style={styles.value}>
            {profile.role}
          </Text>

          <Text style={styles.label}>User ID</Text>
          <Text style={styles.valueSmall}>
            {user?.id}
          </Text>
        </View>
      )}

      {isTeacher && (
        <View style={styles.teacherInfo}>
          <Text style={styles.teacherTitle}>
            Teacher Account
          </Text>
          <Text style={styles.teacherDescription}>
            Your account is registered as a teacher.
            You can access the teacher features available
            to your account.
          </Text>
        </View>
      )}

      <View style={styles.signOutContainer}>
        <AppButton
          title="Sign Out"
          icon="log-out-outline"
          onPress={handleSignOut}
          disabled={loading}
        />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 24,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  loadingText: {
    marginTop: 12,
    color: COLORS.textSecondary,
    fontSize: 14,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginBottom: 16,
  },
  teacherBadge: {
    backgroundColor: '#218358',
  },
  studentBadge: {
    backgroundColor: COLORS.textSecondary,
  },
  roleBadgeText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  infoCard: {
    backgroundColor: COLORS.card,
    borderRadius: 14,
    padding: 18,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textSecondary,
    marginBottom: 5,
    marginTop: 12,
  },
  value: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  valueSmall: {
    fontSize: 11,
    color: COLORS.textSecondary,
  },
  nameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  editHint: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.primary,
  },
  nameEditRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  nameInput: {
    flex: 1,
    minWidth: 120,
    backgroundColor: COLORS.surface,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  saveButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: COLORS.textOnPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  cancelButton: {
    paddingHorizontal: 8,
    paddingVertical: 10,
  },
  cancelText: {
    color: COLORS.textSecondary,
    fontSize: 13,
    fontWeight: '600',
  },
  errorText: {
    color: COLORS.danger,
    fontSize: 14,
  },
  retryButton: {
    marginTop: 12,
    padding: 10,
    alignSelf: 'flex-start',
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryText: {
    color: COLORS.textOnPrimary,
    fontWeight: '600',
  },
  teacherInfo: {
    padding: 16,
    backgroundColor: COLORS.card,
    borderRadius: 14,
    borderLeftWidth: 4,
    borderLeftColor: '#218358',
    marginBottom: 20,
  },
  teacherTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  teacherDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  signOutContainer: {
    marginTop: 8,
  },
});