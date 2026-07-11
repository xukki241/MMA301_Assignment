import React from 'react';
import { Tabs, Redirect, useRouter } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function AdminLayout() {
  const { user, isAuthenticated, loading } = useAppStore();
  const logout = useAppStore((state) => state.logout);
  const router = useRouter();

  // Wait for session restoration
  if (loading) return null;

  // Auth guard: must be authenticated
  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  // Role guard: must be Admin
  if (user.role !== 'Admin') {
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
      <Tabs.Screen name="users" options={{ title: 'Users' }} />
      <Tabs.Screen name="logs" options={{ title: 'Audit Logs' }} />
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
