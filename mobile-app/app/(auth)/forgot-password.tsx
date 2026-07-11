import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { apiRequest } from '../../api/client';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleResetRequest = async () => {
    if (!email) {
      setError('Please enter your email address.');
      return;
    }
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await apiRequest('/auth/forgot-password', {
        method: 'POST',
        body: { email },
      });
      setSuccess('If an account with that email exists, a reset link has been sent.');
    } catch (err: any) {
      // Show generic success message regardless to avoid email enumeration
      setSuccess('If an account with that email exists, a reset link has been sent.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter the email address associated with your account and we'll send you a reset link.
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}

        <Text style={styles.label}>Email Address</Text>
        <TextInput
          style={styles.input}
          placeholder="email@example.edu"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={setEmail}
        />

        <TouchableOpacity style={styles.button} onPress={handleResetRequest} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Send Reset Link</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={() => router.back()} style={styles.linkButton}>
          <Text style={styles.linkText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
    backgroundColor: '#FAFAFA',
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  linkButton: {
    marginTop: 16,
    alignItems: 'center',
  },
  linkText: {
    color: '#2563EB',
    fontSize: 14,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  successText: {
    color: '#059669',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
});
