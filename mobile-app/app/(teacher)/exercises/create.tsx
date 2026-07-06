import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../api/client';

interface TopicItem {
  topicId: string;
  title: string;
  orderIndex: number;
}

export default function CreateExerciseScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [topicId, setTopicId] = useState('');
  const [title, setTitle] = useState('');
  const [instructions, setInstructions] = useState('');
  const [dueDate, setDueDate] = useState('2026-07-15T23:59:59Z');
  const [maxPoints, setMaxPoints] = useState('100');
  const [allowedExtensions, setAllowedExtensions] = useState('zip, rar, pdf');
  const [error, setError] = useState('');

  // Fetch topics
  const { data: topics, isLoading: loadingTopics } = useQuery<TopicItem[]>({
    queryKey: ['topics', classId],
    queryFn: () => apiRequest<TopicItem[]>(`/classes/${classId}/topics`),
  });

  // Mutate create exercise
  const createExerciseMutation = useMutation({
    mutationFn: (body: any) =>
      apiRequest(`/classes/${classId}/exercises`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['exercises', classId] });
      router.back();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to create exercise.');
    },
  });

  const handleSubmit = () => {
    if (!title || !instructions || !maxPoints) {
      setError('Please fill in all required fields.');
      return;
    }
    setError('');

    const extensions = allowedExtensions
      .split(',')
      .map((ext) => ext.trim())
      .filter(Boolean);

    createExerciseMutation.mutate({
      topicId: topicId || 'tpc_default',
      title,
      instructions,
      dueDate,
      maxPoints: parseInt(maxPoints, 10),
      allowedExtensions: extensions,
    });
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headerTitle}>Create Assignment</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Text style={styles.label}>Select Topic</Text>
      {loadingTopics ? (
        <ActivityIndicator size="small" color="#2563EB" style={{ alignSelf: 'flex-start', marginVertical: 10 }} />
      ) : topics && topics.length > 0 ? (
        <View style={styles.topicPalette}>
          {topics.map((top) => (
            <TouchableOpacity
              key={top.topicId}
              style={[styles.topicChip, topicId === top.topicId && styles.activeTopicChip]}
              onPress={() => setTopicId(top.topicId)}
            >
              <Text style={[styles.topicChipTxt, topicId === top.topicId && styles.activeTopicChipTxt]}>
                {top.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      ) : (
        <Text style={styles.hintText}>No topics exist. An automatic topic will be assigned.</Text>
      )}

      <Text style={styles.label}>Title *</Text>
      <TextInput
        style={styles.input}
        placeholder="e.g. Lab 1: gRPC Interface Definition"
        value={title}
        onChangeText={setTitle}
      />

      <Text style={styles.label}>Instructions *</Text>
      <TextInput
        style={[styles.input, styles.textArea]}
        placeholder="Provide details on assignment expectations..."
        multiline
        numberOfLines={4}
        value={instructions}
        onChangeText={setInstructions}
      />

      <Text style={styles.label}>Due Date (ISO format) *</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DDTHH:MM:SSZ"
        value={dueDate}
        onChangeText={setDueDate}
      />

      <View style={styles.row}>
        <View style={styles.halfCol}>
          <Text style={styles.label}>Max Points *</Text>
          <TextInput
            style={styles.input}
            placeholder="100"
            keyboardType="number-pad"
            value={maxPoints}
            onChangeText={setMaxPoints}
          />
        </View>
        <View style={styles.halfCol}>
          <Text style={styles.label}>Allowed Extensions</Text>
          <TextInput
            style={styles.input}
            placeholder="zip, rar, pdf"
            value={allowedExtensions}
            onChangeText={setAllowedExtensions}
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={handleSubmit}
        disabled={createExerciseMutation.isPending}
      >
        {createExerciseMutation.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Publish Assignment</Text>
        )}
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    flexGrow: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 6,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 10,
    fontSize: 15,
    marginBottom: 14,
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCol: {
    flex: 1,
  },
  topicPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 14,
  },
  topicChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  activeTopicChip: {
    backgroundColor: '#2563EB',
    borderColor: '#2563EB',
  },
  topicChipTxt: {
    fontSize: 13,
    color: '#4B5563',
  },
  activeTopicChipTxt: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  hintText: {
    fontSize: 13,
    color: '#6B7280',
    marginBottom: 12,
    fontStyle: 'italic',
  },
  button: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 16,
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
    fontWeight: 'bold',
  },
});
