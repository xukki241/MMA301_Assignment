import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Redirect } from 'expo-router';
import { useAppStore } from '../store/useAppStore';

export default function Index() {
  const { user, isAuthenticated, loading } = useAppStore();

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  switch (user.role) {
    case 'Teacher':
      return <Redirect href="/(teacher)" />;
    case 'Student':
      return <Redirect href="/(student)" />;
    case 'Admin':
      return <Redirect href="/(admin)/users" />;
    default:
      return <Redirect href="/(auth)/login" />;
  }
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
