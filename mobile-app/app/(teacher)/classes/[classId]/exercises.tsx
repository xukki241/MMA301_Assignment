import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../../api/client';

interface ExerciseItem {
  exerciseId: string;
  topicId: string;
  title: string;
  instructions: string;
  dueDate: string;
  maxPoints: number;
  allowedExtensions: string[];
}

export default function ClassExercisesScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const router = useRouter();

  // Fetch exercises
  const { data: exercises, isLoading, error } = useQuery<ExerciseItem[]>({
    queryKey: ['exercises', classId],
    queryFn: () => apiRequest<ExerciseItem[]>(`/classes/${classId}/exercises`),
  });

  const navigateToSubSection = (section: 'stream' | 'exercises' | 'members' | 'settings') => {
    router.push(`/(teacher)/classes/${classId}/${section}`);
  };

  const handleCreateExercise = () => {
    router.push({
      pathname: '/(teacher)/exercises/create',
      params: { classId },
    });
  };

  const handleSelectExercise = (exerciseId: string) => {
    router.push(`/(teacher)/exercises/${exerciseId}/submissions`);
  };

  return (
    <View style={styles.container}>
      {/* Sub Header Navigation */}
      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.subHeaderTab} onPress={() => navigateToSubSection('stream')}>
          <Text style={styles.subHeaderTabTxt}>Stream</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.subHeaderTab, styles.activeTab]} onPress={() => navigateToSubSection('exercises')}>
          <Text style={[styles.subHeaderTabTxt, styles.activeTabTxt]}>Exercises</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.subHeaderTab} onPress={() => navigateToSubSection('members')}>
          <Text style={styles.subHeaderTabTxt}>Members</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.subHeaderTab} onPress={() => navigateToSubSection('settings')}>
          <Text style={styles.subHeaderTabTxt}>Settings</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentHeader}>
        <Text style={styles.sectionTitle}>Assignments & Lab Exercises</Text>
        <TouchableOpacity style={styles.createBtn} onPress={handleCreateExercise}>
          <Text style={styles.createBtnTxt}>+ New Exercise</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Error loading exercises</Text>
        </View>
      ) : exercises && exercises.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.noDataText}>No exercises created yet.</Text>
        </View>
      ) : (
        <FlatList
          data={exercises}
          keyExtractor={(item) => item.exerciseId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.card} onPress={() => handleSelectExercise(item.exerciseId)}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.title}</Text>
                <Text style={styles.pointsText}>{item.maxPoints} pts</Text>
              </View>
              <Text style={styles.instructions} numberOfLines={2}>
                {item.instructions}
              </Text>
              <View style={styles.cardFooter}>
                <Text style={styles.dueDateText}>
                  Due: {new Date(item.dueDate).toLocaleString()}
                </Text>
                <Text style={styles.actionText}>View Submissions &rarr;</Text>
              </View>
            </TouchableOpacity>
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
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  subHeader: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  subHeaderTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  activeTab: {
    borderBottomWidth: 3,
    borderColor: '#2563EB',
  },
  subHeaderTabTxt: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '600',
  },
  activeTabTxt: {
    color: '#2563EB',
  },
  contentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
  },
  createBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  createBtnTxt: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  pointsText: {
    fontSize: 14,
    color: '#10B981',
    fontWeight: '600',
    marginLeft: 12,
  },
  instructions: {
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 18,
    marginBottom: 12,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 10,
  },
  dueDateText: {
    fontSize: 12,
    color: '#EF4444',
    fontWeight: '600',
  },
  actionText: {
    fontSize: 12,
    color: '#2563EB',
    fontWeight: '600',
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
