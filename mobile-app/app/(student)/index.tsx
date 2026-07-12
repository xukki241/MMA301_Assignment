import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import { apiRequest, fetchClasses, MappedClass } from '../../api/client';

type ClassItem = MappedClass;

interface ExerciseItem {
  exerciseId: string;
  title: string;
  instructions: string;
  dueDate: string;
  maxPoints: number;
}

export default function StudentDashboard() {
  const router = useRouter();
  const { activeClassId, setActiveClassId } = useAppStore();

  // Fetch enrolled classes
  const { data: classes, isLoading: loadingClasses } = useQuery<ClassItem[]>({
    queryKey: ['enrolled-classes'],
    queryFn: async () => (await fetchClasses()).enrolled,
  });

  // Select first class automatically
  useEffect(() => {
    if (classes && classes.length > 0 && !activeClassId) {
      setActiveClassId(classes[0].classId);
    }
  }, [classes, activeClassId]);

  // Fetch exercises for selected class
  const { data: exercises, isLoading: loadingExercises } = useQuery<ExerciseItem[]>({
    queryKey: ['student-exercises', activeClassId],
    queryFn: () => apiRequest<ExerciseItem[]>(`/classes/${activeClassId}/exercises`),
    enabled: !!activeClassId,
  });

  if (loadingClasses) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#2563EB" />
      </View>
    );
  }

  if (!classes || classes.length === 0) {
    return (
      <View style={styles.center}>
        <Text style={styles.noDataText}>You are not enrolled in any classes yet.</Text>
        <TouchableOpacity style={styles.joinButton} onPress={() => router.push('/(student)/courses/join')}>
          <Text style={styles.joinButtonText}>Join Class now</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const selectedClass = classes.find((c) => c.classId === activeClassId);

  // Todo / deadlines sorting
  const upcomingDeadlines = exercises
    ? [...exercises]
        .filter((ex) => new Date(ex.dueDate) > new Date())
        .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
    : [];

  return (
    <ScrollView style={styles.container}>
      {/* Course List / Selector */}
      <View style={styles.selectorContainer}>
        <Text style={styles.sectionTitle}>Enrolled Classes</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollSelector}>
          {classes.map((cls) => (
            <TouchableOpacity
              key={cls.classId}
              style={[styles.classTab, activeClassId === cls.classId && styles.activeClassTab]}
              onPress={() => setActiveClassId(cls.classId)}
            >
              <Text
                style={[
                  styles.classTabTxt,
                  activeClassId === cls.classId && styles.activeClassTabTxt,
                ]}
              >
                {cls.className}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {activeClassId && selectedClass && (
        <View style={styles.content}>
          {/* Quick Access Card */}
          <View style={styles.card}>
            <Text style={styles.className}>{selectedClass.className}</Text>
            <Text style={styles.classDetails}>
              Subject: {selectedClass.subject} | Teacher: {selectedClass.teacherName}
            </Text>
            <View style={styles.quickAccessGrid}>
              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() => router.push(`/(student)/courses/${activeClassId}/stream`)}
              >
                <Text style={styles.quickBtnTxt}>Discussion Stream</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.quickBtn}
                onPress={() => router.push(`/(student)/courses/${activeClassId}/materials`)}
              >
                <Text style={styles.quickBtnTxt}>Class Materials</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Upcoming Deadlines & Todo */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Todo & Upcoming Deliverables</Text>
            {loadingExercises ? (
              <ActivityIndicator size="small" color="#2563EB" />
            ) : upcomingDeadlines.length === 0 ? (
              <Text style={styles.emptyText}>No upcoming deadlines. You are all caught up!</Text>
            ) : (
              upcomingDeadlines.map((ex) => (
                <View key={ex.exerciseId} style={styles.todoItem}>
                  <View style={styles.todoDetails}>
                    <Text style={styles.todoTitle}>{ex.title}</Text>
                    <Text style={styles.todoPoints}>{ex.maxPoints} Points Max</Text>
                    <Text style={styles.todoDue}>
                      Due: {new Date(ex.dueDate).toLocaleString()}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.submitBtn}
                    onPress={() =>
                      router.push(`/(student)/courses/${activeClassId}/submit/${ex.exerciseId}`)
                    }
                  >
                    <Text style={styles.submitBtnTxt}>Submit</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
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
  noDataText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  joinButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  joinButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
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
  className: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  classDetails: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 16,
  },
  quickAccessGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  quickBtn: {
    flex: 1,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
  },
  quickBtnTxt: {
    color: '#2563EB',
    fontWeight: '600',
    fontSize: 14,
  },
  cardHeader: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 14,
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 12,
  },
  todoItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  todoDetails: {
    flex: 1,
    paddingRight: 12,
  },
  todoTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  todoPoints: {
    fontSize: 13,
    color: '#10B981',
    fontWeight: '600',
    marginTop: 2,
  },
  todoDue: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
  submitBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  submitBtnTxt: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
});
