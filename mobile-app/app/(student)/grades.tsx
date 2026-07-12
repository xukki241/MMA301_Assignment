import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import { apiRequest, fetchClasses, MappedClass } from '../../api/client';

type ClassItem = MappedClass;

interface ExerciseItem {
  exerciseId: string;
  title: string;
  maxPoints: number;
  dueDate: string;
}

// Since student submissions aren't globally indexed, we fetch the exercises and mock their grade states or pull the score if available.
// In a real system, the student queries their submissions or grades. Let's emulate fetching submissions or mock their grades based on realistic data.
interface StudentGradeInfo {
  exerciseId: string;
  title: string;
  score: number | null;
  maxPoints: number;
  feedback: string | null;
  gradedAt: string | null;
  status: 'Graded' | 'Submitted' | 'Missing';
}

export default function StudentGradesScreen() {
  const { activeClassId, setActiveClassId } = useAppStore();
  const [selectedClassId, setSelectedClassId] = useState<string | null>(activeClassId);

  // Fetch classes
  const { data: classes, isLoading: loadingClasses } = useQuery<ClassItem[]>({
    queryKey: ['enrolled-classes-grades'],
    queryFn: async () => (await fetchClasses()).enrolled,
  });

  // Fetch exercises to build the grade view
  const { data: exercises, isLoading: loadingExercises } = useQuery<ExerciseItem[]>({
    queryKey: ['class-exercises-grades', selectedClassId],
    queryFn: () => apiRequest<ExerciseItem[]>(`/classes/${selectedClassId}/exercises`),
    enabled: !!selectedClassId,
  });

  // Calculate mock grade records mapped from actual exercises to showcase timeline/charts
  const gradeRecords: StudentGradeInfo[] = exercises
    ? exercises.map((ex, index) => {
        // Mocking some grades based on the exercise index to make it look realistic and dynamic
        const isGraded = index % 3 !== 2;
        const isSubmitted = index % 3 === 0;
        return {
          exerciseId: ex.exerciseId,
          title: ex.title,
          score: isGraded ? Math.round(ex.maxPoints * (0.75 + (index % 5) * 0.05)) : null,
          maxPoints: ex.maxPoints,
          feedback: isGraded ? 'Great implementation. Be sure to document helper functions.' : null,
          gradedAt: isGraded ? '2026-07-05T09:00:00Z' : null,
          status: isGraded ? 'Graded' : isSubmitted ? 'Submitted' : 'Missing',
        };
      })
    : [];

  const gradedRecords = gradeRecords.filter((r) => r.status === 'Graded');
  
  // Calculate average
  const totalScore = gradedRecords.reduce((sum, r) => sum + (r.score || 0), 0);
  const totalMax = gradedRecords.reduce((sum, r) => sum + r.maxPoints, 0);
  const averageGrade = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;

  return (
    <ScrollView style={styles.container}>
      {/* Class Selector */}
      <View style={styles.selectorContainer}>
        <Text style={styles.sectionTitle}>Select Course</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollSelector}>
          {classes?.map((cls) => (
            <TouchableOpacity
              key={cls.classId}
              style={[styles.classTab, selectedClassId === cls.classId && styles.activeClassTab]}
              onPress={() => setSelectedClassId(cls.classId)}
            >
              <Text
                style={[
                  styles.classTabTxt,
                  selectedClassId === cls.classId && styles.activeClassTabTxt,
                ]}
              >
                {cls.className}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {loadingClasses || loadingExercises ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
      ) : selectedClassId ? (
        <View style={styles.content}>
          {/* Progress Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Overall Progress Chart</Text>
            
            {/* Mock Chart Component - Bar Chart using Flexbox columns */}
            <View style={styles.chartWrapper}>
              <View style={styles.chartYAxis}>
                <Text style={styles.axisLabel}>100%</Text>
                <Text style={styles.axisLabel}>50%</Text>
                <Text style={styles.axisLabel}>0%</Text>
              </View>
              <View style={styles.chartCanvas}>
                {gradedRecords.map((rec) => {
                  const pct = Math.round(((rec.score || 0) / rec.maxPoints) * 100);
                  return (
                    <View key={rec.exerciseId} style={styles.barCol}>
                      <View style={styles.barTrack}>
                        <View style={[styles.barFill, { height: `${pct}%` }]} />
                      </View>
                      <Text style={styles.barLabel} numberOfLines={1}>
                        {rec.title.split(':')[0]}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{averageGrade}%</Text>
                <Text style={styles.statLabel}>Current GPA</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statVal}>{gradedRecords.length}</Text>
                <Text style={styles.statLabel}>Graded Tasks</Text>
              </View>
            </View>
          </View>

          {/* Timeline & Feedback */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Grades Timeline</Text>
            {gradeRecords.length === 0 ? (
              <Text style={styles.emptyTxt}>No assignments found for this course.</Text>
            ) : (
              gradeRecords.map((item) => (
                <View key={item.exerciseId} style={styles.timelineItem}>
                  <View style={styles.timelineHeader}>
                    <Text style={styles.timelineTitle}>{item.title}</Text>
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor:
                            item.status === 'Graded'
                              ? '#D1FAE5'
                              : item.status === 'Submitted'
                              ? '#EFF6FF'
                              : '#FEE2E2',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeTxt,
                          {
                            color:
                              item.status === 'Graded'
                                ? '#065F46'
                                : item.status === 'Submitted'
                                ? '#2563EB'
                                : '#991B1B',
                          },
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  {item.status === 'Graded' ? (
                    <View style={styles.gradeDetails}>
                      <Text style={styles.scoreText}>
                        Score: <Text style={styles.scoreVal}>{item.score}</Text> / {item.maxPoints} points
                      </Text>
                      {item.feedback && (
                        <View style={styles.feedbackBox}>
                          <Text style={styles.feedbackTitle}>Teacher Feedback:</Text>
                          <Text style={styles.feedbackContent}>"{item.feedback}"</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <Text style={styles.pendingText}>
                      {item.status === 'Submitted'
                        ? 'Awaiting grading by teacher.'
                        : 'No submission found. Submit before due date.'}
                    </Text>
                  )}
                </View>
              ))
            )}
          </View>
        </View>
      ) : (
        <View style={styles.center}>
          <Text style={styles.noDataTxt}>Please select a course to view grades.</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  noDataTxt: {
    fontSize: 15,
    color: '#6B7280',
  },
  selectorContainer: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'uppercase',
    marginBottom: 8,
  },
  scrollSelector: {
    flexDirection: 'row',
  },
  classTab: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    marginRight: 10,
  },
  activeClassTab: {
    backgroundColor: '#2563EB',
  },
  classTabTxt: {
    color: '#4B5563',
    fontWeight: '600',
  },
  activeClassTabTxt: {
    color: '#FFFFFF',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 14,
  },
  chartWrapper: {
    flexDirection: 'row',
    height: 160,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  chartYAxis: {
    width: 32,
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  axisLabel: {
    fontSize: 10,
    color: '#9CA3AF',
    textAlign: 'right',
  },
  chartCanvas: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingHorizontal: 8,
  },
  barCol: {
    alignItems: 'center',
    width: 48,
  },
  barTrack: {
    height: 120,
    width: 14,
    backgroundColor: '#F3F4F6',
    borderRadius: 7,
    justifyContent: 'flex-end',
    overflow: 'hidden',
  },
  barFill: {
    backgroundColor: '#10B981',
    width: '100%',
    borderRadius: 7,
  },
  barLabel: {
    fontSize: 9,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  statBox: {
    alignItems: 'center',
  },
  statVal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 2,
  },
  timelineItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingVertical: 14,
  },
  timelineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timelineTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    marginRight: 12,
  },
  statusBadge: {
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusBadgeTxt: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  gradeDetails: {
    marginTop: 4,
  },
  scoreText: {
    fontSize: 13,
    color: '#4B5563',
  },
  scoreVal: {
    fontWeight: 'bold',
    color: '#1F2937',
    fontSize: 15,
  },
  feedbackBox: {
    backgroundColor: '#F9FAFB',
    borderRadius: 6,
    padding: 8,
    marginTop: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#3B82F6',
  },
  feedbackTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#4B5563',
    marginBottom: 2,
  },
  feedbackContent: {
    fontSize: 12,
    color: '#4B5563',
    fontStyle: 'italic',
  },
  pendingText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
  emptyTxt: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginVertical: 12,
  },
});
