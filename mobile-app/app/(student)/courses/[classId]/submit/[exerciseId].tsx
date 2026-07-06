import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../../../api/client';

export default function SubmitExerciseScreen() {
  const { classId, exerciseId } = useLocalSearchParams<{ classId: string; exerciseId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [fileName, setFileName] = useState('grpc_solution.zip');
  const [fileSize, setFileSize] = useState('1048576'); // ~1MB
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [step, setStep] = useState<'idle' | 'presigned' | 'uploading' | 'finalizing' | 'success'>('idle');

  // Multi-step submission mutation
  const submitMutation = useMutation({
    mutationFn: async () => {
      // Step 1: Request pre-signed URL
      setStep('presigned');
      const presignedData = await apiRequest<{ uploadUrl: string; filePathUrl: string }>(
        `/exercises/${exerciseId}/submissions/presigned-url`,
        {
          method: 'POST',
          body: {
            fileName,
            fileSize: parseInt(fileSize, 10),
          },
        }
      );

      // Step 2: Upload to S3 (LocalStack)
      setStep('uploading');
      await fetch(presignedData.uploadUrl, {
        method: 'PUT',
        body: 'MOCK_ZIP_FILE_CONTENT_BLOB_OR_STREAM',
        headers: {
          'Content-Type': 'application/zip',
        },
      });

      // Step 3: Finalize metadata persistence
      setStep('finalizing');
      const finalData = await apiRequest<{ submissionId: string }>(
        `/exercises/${exerciseId}/submissions`,
        {
          method: 'POST',
          body: {
            fileName,
            filePathUrl: presignedData.filePathUrl,
            fileSize: parseInt(fileSize, 10),
          },
        }
      );

      return finalData;
    },
    onSuccess: () => {
      setStep('success');
      setSuccessMsg('Assignment submitted successfully!');
      queryClient.invalidateQueries({ queryKey: ['student-exercises', classId] });
      setTimeout(() => {
        router.back();
      }, 1500);
    },
    onError: (err: any) => {
      setStep('idle');
      setErrorMsg(err.message || 'Submission chain failed.');
    },
  });

  const handleSubmit = () => {
    if (!fileName || !fileSize) {
      setErrorMsg('Please specify file details.');
      return;
    }
    setErrorMsg('');
    submitMutation.mutate();
  };

  const getStepText = () => {
    switch (step) {
      case 'presigned':
        return 'Requesting pre-signed S3 upload URL...';
      case 'uploading':
        return 'Uploading solution archive to LocalStack S3...';
      case 'finalizing':
        return 'Registering metadata with Core API...';
      case 'success':
        return 'Submission completed!';
      default:
        return 'Submit Solution';
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Submit Assignment</Text>
        <Text style={styles.subtitle}>
          Secure multi-step S3 document upload integration.
        </Text>

        {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}
        {successMsg ? <Text style={styles.successText}>{successMsg}</Text> : null}

        <Text style={styles.label}>File Name to upload</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. assignment_v1.zip"
          value={fileName}
          onChangeText={setFileName}
          editable={step === 'idle'}
        />

        <Text style={styles.label}>File Size (in bytes)</Text>
        <TextInput
          style={styles.input}
          placeholder="1048576"
          keyboardType="numeric"
          value={fileSize}
          onChangeText={setFileSize}
          editable={step === 'idle'}
        />

        <TouchableOpacity
          style={[styles.button, step !== 'idle' && styles.disabledButton]}
          onPress={handleSubmit}
          disabled={step !== 'idle'}
        >
          {step !== 'idle' && step !== 'success' ? (
            <View style={styles.row}>
              <ActivityIndicator color="#fff" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>{getStepText()}</Text>
            </View>
          ) : (
            <Text style={styles.buttonText}>Upload & Submit</Text>
          )}
        </TouchableOpacity>

        {step !== 'idle' && (
          <View style={styles.progressContainer}>
            <Text style={styles.progressText}>Current step: {step.toUpperCase()}</Text>
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
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
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 18,
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
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
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
  progressContainer: {
    marginTop: 16,
    padding: 10,
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  progressText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: 'bold',
  },
});
