import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../../api/client';

interface SubmissionItem {
  submissionId: string;
  studentId: string;
  studentName: string;
  status: 'OnTime' | 'Late' | 'NotSubmitted';
  submittedAt: string;
  score: number | null;
  gradedAt: string | null;
}

export default function ExerciseSubmissionsScreen() {
  const { exerciseId } = useLocalSearchParams<{ exerciseId: string }>();
  const router = useRouter();

  // Fetch submissions
  const { data: submissions, isLoading, error } = useQuery<SubmissionItem[]>({
    queryKey: ['submissions', exerciseId],
    queryFn: () => apiRequest<SubmissionItem[]>(`/exercises/${exerciseId}/submissions`),
  });

  const handleGrade = (submissionId: string) => {
    router.push(`/(teacher)/exercises/${exerciseId}/grade/${submissionId}`);
  };

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Student Submissions</Text>

      {error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Error loading submissions</Text>
        </View>
      ) : submissions && submissions.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.noDataText}>No submissions received yet.</Text>
        </View>
      ) : (
        <FlatList
          data={submissions}
          keyExtractor={(item) => item.submissionId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.studentDetails}>
                <Text style={styles.studentName}>{item.studentName}</Text>
                <Text style={styles.submitDate}>
                  Submitted: {new Date(item.submittedAt).toLocaleString()}
                </Text>
                <View style={styles.badgeRow}>
                  <View
                    style={[
                      styles.statusBadge,
                      {
                        backgroundColor:
                          item.status === 'OnTime' ? '#D1FAE5' : '#FEE2E2',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusBadgeTxt,
                        {
                          color: item.status === 'OnTime' ? '#065F46' : '#991B1B',
                        },
                      ]}
                    >
                      {item.status}
                    </Text>
                  </View>
                  {item.score !== null && (
                    <View style={styles.scoreBadge}>
                      <Text style={styles.scoreBadgeTxt}>Graded: {item.score} pts</Text>
                    </View>
                  )}
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.gradeBtn,
                  item.score !== null && styles.regradeBtn,
                ]}
                onPress={() => handleGrade(item.submissionId)}
              >
                <Text
                  style={[
                    styles.gradeBtnTxt,
                    item.score !== null && styles.regradeBtnTxt,
                  ]}
                >
                  {item.score !== null ? 'Regrade' : 'Grade'}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    padding: 16,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
  },
  list: {
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  studentDetails: {
    flex: 1,
    paddingRight: 16,
  },
  studentName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  submitDate: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 8,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  statusBadgeTxt: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  scoreBadge: {
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  scoreBadgeTxt: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: 'bold',
  },
  gradeBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
  },
  regradeBtn: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  gradeBtnTxt: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  regradeBtnTxt: {
    color: '#4B5563',
  },
  noDataText: {
    fontSize: 15,
    color: '#6B7280',
  },
  errorText: {
    color: '#DC2626',
    fontWeight: 'bold',
  },
});
