import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useAppStore } from '../store/useAppStore';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

function SessionGate({ children }: { children: React.ReactNode }) {
  const loading = useAppStore((s) => s.loading);
  const restoreSession = useAppStore((s) => s.restoreSession);

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  if (loading) {
    return (
      <View style={styles.splash}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return <>{children}</>;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <SessionGate>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(auth)" />
            <Stack.Screen name="(teacher)" />
            <Stack.Screen name="(student)" />
            <Stack.Screen name="(admin)" />
            <Stack.Screen name="notifications" options={{ presentation: 'modal' }} />
          </Stack>
        </SessionGate>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
});
