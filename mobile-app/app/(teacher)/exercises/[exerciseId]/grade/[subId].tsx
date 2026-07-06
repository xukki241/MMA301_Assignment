import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, FlatList, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../../../api/client';

interface Note {
  noteId: string;
  senderId: string;
  senderName: string;
  content: string;
  sentAt: string;
}

export default function GradeSubmissionScreen() {
  const { exerciseId, subId } = useLocalSearchParams<{ exerciseId: string; subId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [error, setError] = useState('');

  // Fetch private notes thread
  const { data: notes, isLoading: loadingNotes } = useQuery<Note[]>({
    queryKey: ['private-notes', subId],
    queryFn: () => apiRequest<Note[]>(`/submissions/${subId}/private-notes`),
  });

  // Mutate grade
  const gradeMutation = useMutation({
    mutationFn: (body: { score: number; feedback: string }) =>
      apiRequest(`/submissions/${subId}/grades`, {
        method: 'POST',
        body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions', exerciseId] });
      router.back();
    },
    onError: (err: any) => {
      setError(err.message || 'Failed to submit grade.');
    },
  });

  // Mutate add private note
  const addNoteMutation = useMutation({
    mutationFn: (content: string) =>
      apiRequest<Note>(`/submissions/${subId}/private-notes`, {
        method: 'POST',
        body: { content },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['private-notes', subId] });
      setNoteContent('');
    },
  });

  const handleGradeSubmit = () => {
    if (!score || isNaN(parseInt(score, 10))) {
      setError('Please enter a valid numeric score.');
      return;
    }
    setError('');
    gradeMutation.mutate({
      score: parseInt(score, 10),
      feedback,
    });
  };

  const handleAddNote = () => {
    if (!noteContent.trim()) return;
    addNoteMutation.mutate(noteContent.trim());
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Grade Submission</Text>
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {/* Grade Form */}
      <View style={styles.card}>
        <Text style={styles.label}>Awarded Score (points) *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 95"
          keyboardType="numeric"
          value={score}
          onChangeText={setScore}
        />

        <Text style={styles.label}>Feedback</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Excellent work! Address comments next time..."
          multiline
          numberOfLines={3}
          value={feedback}
          onChangeText={setFeedback}
        />

        <TouchableOpacity
          style={styles.gradeBtn}
          onPress={handleGradeSubmit}
          disabled={gradeMutation.isPending}
        >
          {gradeMutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.gradeBtnTxt}>Submit Grade</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Private Notes Section */}
      <Text style={styles.sectionTitle}>Private Discussion Thread</Text>
      <View style={styles.card}>
        {loadingNotes ? (
          <ActivityIndicator size="small" color="#2563EB" />
        ) : notes && notes.length === 0 ? (
          <Text style={styles.emptyTxt}>No private notes exchanged yet.</Text>
        ) : (
          notes?.map((item) => (
            <View key={item.noteId} style={styles.noteItem}>
              <View style={styles.noteHeader}>
                <Text style={styles.noteSender}>{item.senderName}</Text>
                <Text style={styles.noteDate}>
                  {new Date(item.sentAt).toLocaleString()}
                </Text>
              </View>
              <Text style={styles.noteContent}>{item.content}</Text>
            </View>
          ))
        )}

        {/* Post note input */}
        <View style={styles.noteInputRow}>
          <TextInput
            style={styles.noteInput}
            placeholder="Type private message..."
            value={noteContent}
            onChangeText={setNoteContent}
          />
          <TouchableOpacity
            style={styles.noteSendBtn}
            onPress={handleAddNote}
            disabled={addNoteMutation.isPending}
          >
            {addNoteMutation.isPending ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.noteSendBtnTxt}>Send</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F3F4F6',
    flexGrow: 1,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginTop: 20,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
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
    padding: 10,
    fontSize: 15,
    marginBottom: 14,
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 70,
    textAlignVertical: 'top',
  },
  gradeBtn: {
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 6,
  },
  gradeBtnTxt: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 15,
  },
  noteItem: {
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    padding: 10,
    marginBottom: 10,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  noteSender: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4B5563',
  },
  noteDate: {
    fontSize: 10,
    color: '#9CA3AF',
  },
  noteContent: {
    fontSize: 13,
    color: '#374151',
  },
  noteInputRow: {
    flexDirection: 'row',
    marginTop: 12,
    gap: 8,
  },
  noteInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 10,
    fontSize: 13,
    backgroundColor: '#FAFAFA',
  },
  noteSendBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    justifyContent: 'center',
  },
  noteSendBtnTxt: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  emptyTxt: {
    color: '#6B7280',
    fontSize: 13,
    textAlign: 'center',
    marginVertical: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    marginBottom: 16,
    fontWeight: 'bold',
  },
});
