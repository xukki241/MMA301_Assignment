import React from 'react';
import { Redirect } from 'expo-router';
import { useAppStore } from '../store/useAppStore';

export default function Index() {
  const { user, accessToken } = useAppStore();

  if (!accessToken || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user.role === 'Teacher') {
    return <Redirect href="/(teacher)" />;
  } else if (user.role === 'Student') {
    return <Redirect href="/(student)" />;
  } else if (user.role === 'Admin') {
    return <Redirect href="/(admin)/users" />;
  }

  return <Redirect href="/(auth)/login" />;
}
