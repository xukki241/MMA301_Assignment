import React from 'react';
import { Tabs, Redirect, useRouter } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function StudentLayout() {
  const { user, isAuthenticated, loading } = useAppStore();
  const logout = useAppStore((state) => state.logout);
  const router = useRouter();

  // Wait for session restoration
  if (loading) return null;

  // Auth guard: must be authenticated
  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Role guard: must be Student
  if (user.role !== 'Student') {
    return <Redirect href="/" />;
  }

  const handleLogout = async () => {
    await logout();
    router.replace('/(auth)/login');
  };

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#2563EB',
        headerShown: true,
        headerRight: () => (
          <TouchableOpacity onPress={handleLogout} style={styles.logoutButton}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        ),
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Dashboard' }} />
      <Tabs.Screen name="courses/join" options={{ title: 'Join Class' }} />
      <Tabs.Screen name="grades" options={{ title: 'Grades' }} />

      <Tabs.Screen name="courses/[classId]/stream" options={{ href: null }} />
      <Tabs.Screen name="courses/[classId]/materials" options={{ href: null }} />
      <Tabs.Screen name="courses/[classId]/submit/[exerciseId]" options={{ href: null }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  logoutButton: {
    marginRight: 16,
    padding: 6,
    backgroundColor: '#EF4444',
    borderRadius: 4,
  },
  logoutText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
  },
});
