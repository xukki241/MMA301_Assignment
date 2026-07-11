import React from 'react';
import { Stack, Redirect } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';

export default function AuthLayout() {
  const { isAuthenticated, loading } = useAppStore();

  // While session is restoring, render nothing (root layout handles splash)
  if (loading) return null;

  // If user is already authenticated, send them to root which routes by role
  if (isAuthenticated) {
    return <Redirect href="/" />;
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="forgot-password" options={{ headerShown: true, headerTitle: 'Reset Password' }} />
    </Stack>
  );
}
