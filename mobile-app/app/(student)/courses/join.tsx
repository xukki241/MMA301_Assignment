import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';
import { useAppStore } from '../../../store/useAppStore';

export default function JoinCourseScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setActiveClassId = useAppStore((state) => state.setActiveClassId);

  const [classCode, setClassCode] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const joinMutation = useMutation({
    mutationFn: (code: string) =>
      apiRequest<{ enrollmentId: string; classId: string; studentId: string }>('/classes/join', {
        method: 'POST',
        body: { classCode: code },
      }),
    onSuccess: (data) => {
      setSuccess('Successfully joined class!');
      queryClient.invalidateQueries({ queryKey: ['enrolled-classes'] });
      setActiveClassId(data.classId);
      setTimeout(() => {
        router.replace('/(student)');
      }, 1500);
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to join class. Check class code.');
    },
  });

  const handleJoin = () => {
    if (!classCode.trim()) {
      setError('Please enter a class code.');
      return;
    }
    setError('');
    setSuccess('');
    joinMutation.mutate(classCode.trim());
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Join a Classroom</Text>
        <Text style={styles.desc}>
          Ask your teacher for the class code, then enter it below to register for the course.
        </Text>

        {error ? <Text style={styles.errorText}>{error}</Text> : null}
        {success ? <Text style={styles.successText}>{success}</Text> : null}

        <Text style={styles.label}>Class Code</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. AWE829"
          autoCapitalize="characters"
          value={classCode}
          onChangeText={setClassCode}
        />

        <TouchableOpacity style={styles.button} onPress={handleJoin} disabled={joinMutation.isPending}>
          {joinMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Enroll in Class</Text>
          )}
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
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
    textAlign: 'center',
  },
  desc: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
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
    textAlign: 'center',
    fontWeight: 'bold',
    letterSpacing: 2,
  },
  button: {
    backgroundColor: '#2563EB',
    borderRadius: 6,
    padding: 14,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
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
  },
});
