import React from 'react';
import { Tabs, useRouter } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import { TouchableOpacity, Text, StyleSheet } from 'react-native';

export default function TeacherLayout() {
  const logout = useAppStore((state) => state.logout);
  const router = useRouter();

  const handleLogout = () => {
    logout();
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
      <Tabs.Screen name="classes/index" options={{ title: 'Classes' }} />
      <Tabs.Screen name="alerts" options={{ title: 'Alerts' }} />

      <Tabs.Screen name="classes/[classId]/stream" options={{ href: null }} />
      <Tabs.Screen name="classes/[classId]/exercises" options={{ href: null }} />
      <Tabs.Screen name="classes/[classId]/members" options={{ href: null }} />
      <Tabs.Screen name="classes/[classId]/settings" options={{ href: null }} />
      <Tabs.Screen name="exercises/create" options={{ href: null }} />
      <Tabs.Screen name="exercises/[exerciseId]/submissions" options={{ href: null }} />
      <Tabs.Screen name="exercises/[exerciseId]/grade/[subId]" options={{ href: null }} />
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
