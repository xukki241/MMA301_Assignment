import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Modal, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../../store/useAppStore';
import { apiRequest, fetchClasses, MappedClass } from '../../../api/client';

type ClassItem = MappedClass;

export default function ClassesScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setActiveClassId = useAppStore((state) => state.setActiveClassId);

  const [modalVisible, setModalVisible] = useState(false);
  const [className, setClassName] = useState('');
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [createError, setCreateError] = useState('');

  // Fetch classes
  const { data: classes, isLoading, error } = useQuery<ClassItem[]>({
    queryKey: ['classes'],
    queryFn: async () => (await fetchClasses()).teaching,
  });

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: (newClass: { className: string; subject: string; description: string }) =>
      apiRequest<ClassItem>('/classes', {
        method: 'POST',
        body: newClass,
      }),
    onSuccess: (newClass) => {
      queryClient.invalidateQueries({ queryKey: ['classes'] });
      setModalVisible(false);
      setClassName('');
      setSubject('');
      setDescription('');
      setActiveClassId(newClass.classId);
      router.push(`/(teacher)/classes/${newClass.classId}/stream`);
    },
    onError: (err: any) => {
      setCreateError(err.message || 'Failed to create class.');
    },
  });

  const handleCreate = () => {
    if (!className || !subject) {
      setCreateError('Class Name and Subject are required.');
      return;
    }
    setCreateError('');
    createClassMutation.mutate({ className, subject, description });
  };

  const handleSelectClass = (classId: string) => {
    setActiveClassId(classId);
    router.push(`/(teacher)/classes/${classId}/stream`);
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
      <View style={styles.header}>
        <Text style={styles.title}>Taught Classes</Text>
        <TouchableOpacity style={styles.createButton} onPress={() => setModalVisible(true)}>
          <Text style={styles.createButtonText}>+ Create Class</Text>
        </TouchableOpacity>
      </View>

      {error ? (
        <Text style={styles.errorText}>Error fetching classes</Text>
      ) : classes && classes.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>You are not teaching any classes yet.</Text>
        </View>
      ) : (
        <FlatList
          data={classes}
          keyExtractor={(item) => item.classId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity style={styles.classCard} onPress={() => handleSelectClass(item.classId)}>
              <View style={styles.cardHeader}>
                <Text style={styles.className}>{item.className}</Text>
                <Text style={styles.classSubject}>{item.subject}</Text>
              </View>
              <View style={styles.cardFooter}>
                <Text style={styles.classCode}>Code: {item.classCode}</Text>
                <Text style={styles.studentsCount}>{item.activeStudentsCount} Students</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      {/* Create Class Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Class</Text>
            {createError ? <Text style={styles.errorText}>{createError}</Text> : null}

            <Text style={styles.label}>Class Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Advanced Web Engineering"
              value={className}
              onChangeText={setClassName}
            />

            <Text style={styles.label}>Subject *</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Computer Science"
              value={subject}
              onChangeText={setSubject}
            />

            <Text style={styles.label}>Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Brief course objectives..."
              multiline
              numberOfLines={3}
              value={description}
              onChangeText={setDescription}
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, styles.submitBtn]}
                onPress={handleCreate}
                disabled={createClassMutation.isPending}
              >
                {createClassMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.submitBtnText}>Create</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  createButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  createButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  list: {
    padding: 16,
  },
  classCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    marginBottom: 12,
  },
  className: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  classSubject: {
    fontSize: 14,
    color: '#4B5563',
    marginTop: 2,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 12,
  },
  classCode: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '600',
  },
  studentsCount: {
    fontSize: 13,
    color: '#2563EB',
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    marginHorizontal: 16,
    marginTop: 8,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 16,
    textAlign: 'center',
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
    height: 80,
    textAlignVertical: 'top',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#D1D5DB',
  },
  cancelBtnText: {
    color: '#4B5563',
    fontWeight: '600',
  },
  submitBtn: {
    backgroundColor: '#2563EB',
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
