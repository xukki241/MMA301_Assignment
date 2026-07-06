import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, ActivityIndicator, ScrollView } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAppStore } from '../../store/useAppStore';
import { apiRequest } from '../../api/client';

interface AlertItem {
  alertId: string;
  studentId: string;
  studentName: string;
  triggeredBy: string;
  message: string;
  sentAt: string;
  isReadByStudent: boolean;
}

export default function AlertsScreen() {
  const queryClient = useQueryClient();
  const { activeClassId } = useAppStore();

  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [notifyTitle, setNotifyTitle] = useState('Academic Review Reminder');
  const [notifyMessage, setNotifyMessage] = useState(
    'Please review your outstanding course deliverables and schedule a tutoring block.'
  );
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch alerts for active class
  const { data: alerts, isLoading, error } = useQuery<AlertItem[]>({
    queryKey: ['alerts', activeClassId],
    queryFn: () => apiRequest<AlertItem[]>(`/classes/${activeClassId}/alerts`),
    enabled: !!activeClassId,
  });

  // Mutate bulk notify
  const bulkNotifyMutation = useMutation({
    mutationFn: (body: { studentIds: string[]; title: string; message: string }) =>
      apiRequest(`/classes/${activeClassId}/alerts/bulk-notify`, {
        method: 'POST',
        body,
      }),
    onSuccess: (data: any) => {
      setStatusMsg(`Success! Alert sent to ${data.recipientsCount || selectedStudents.length} students.`);
      setSelectedStudents([]);
      setTimeout(() => setStatusMsg(''), 4000);
    },
    onError: (err: any) => {
      setErrorMsg(err.message || 'Failed to send bulk notification.');
      setTimeout(() => setErrorMsg(''), 4000);
    },
  });

  const toggleSelectStudent = (studentId: string) => {
    setSelectedStudents((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleBulkNotify = () => {
    if (selectedStudents.length === 0) {
      setErrorMsg('Please select at least one student.');
      return;
    }
    if (!notifyTitle || !notifyMessage) {
      setErrorMsg('Title and message are required.');
      return;
    }
    setErrorMsg('');
    bulkNotifyMutation.mutate({
      studentIds: selectedStudents,
      title: notifyTitle,
      message: notifyMessage,
    });
  };

  if (!activeClassId) {
    return (
      <View style={styles.center}>
        <Text style={styles.noClassText}>Please select a class on the dashboard first.</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Academic Risk Alerts</Text>
      <Text style={styles.subtitle}>
        Select students flagged by BullMQ background analysis to dispatch push notifications.
      </Text>

      {statusMsg ? <Text style={styles.successText}>{statusMsg}</Text> : null}
      {errorMsg ? <Text style={styles.errorText}>{errorMsg}</Text> : null}

      {/* Alert List */}
      <View style={styles.sectionCard}>
        <Text style={styles.cardHeader}>Triggered Flags</Text>
        {isLoading ? (
          <ActivityIndicator size="small" color="#2563EB" />
        ) : error ? (
          <Text style={styles.errorText}>Error fetching alerts</Text>
        ) : alerts && alerts.length === 0 ? (
          <Text style={styles.emptyTxt}>No active alerts. Good job!</Text>
        ) : (
          alerts?.map((item) => {
            const isChecked = selectedStudents.includes(item.studentId);
            return (
              <TouchableOpacity
                key={item.alertId}
                style={[styles.alertRow, isChecked && styles.alertRowSelected]}
                onPress={() => toggleSelectStudent(item.studentId)}
              >
                <View style={[styles.checkbox, isChecked && styles.checkboxChecked]} />
                <View style={styles.alertContent}>
                  <View style={styles.alertHeaderRow}>
                    <Text style={styles.studentName}>{item.studentName}</Text>
                    <Text style={styles.flagLabel}>{item.triggeredBy}</Text>
                  </View>
                  <Text style={styles.alertMsg}>{item.message}</Text>
                  <Text style={styles.alertDate}>
                    Triggered: {new Date(item.sentAt).toLocaleString()}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Bulk Form */}
      {selectedStudents.length > 0 && (
        <View style={styles.sectionCard}>
          <Text style={styles.cardHeader}>Bulk Send Notification ({selectedStudents.length} selected)</Text>
          
          <Text style={styles.label}>Notification Title</Text>
          <TextInput
            style={styles.input}
            placeholder="Academic Review Reminder"
            value={notifyTitle}
            onChangeText={setNotifyTitle}
          />

          <Text style={styles.label}>Message</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="Alert text..."
            multiline
            numberOfLines={3}
            value={notifyMessage}
            onChangeText={setNotifyMessage}
          />

          <TouchableOpacity
            style={styles.notifyBtn}
            onPress={handleBulkNotify}
            disabled={bulkNotifyMutation.isPending}
          >
            {bulkNotifyMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.notifyBtnTxt}>Dispatch Push Reminders</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    backgroundColor: '#F3F4F6',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  subtitle: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 18,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  cardHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 8,
  },
  alertRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  alertRowSelected: {
    backgroundColor: '#EFF6FF',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#9CA3AF',
    marginRight: 12,
  },
  checkboxChecked: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  alertContent: {
    flex: 1,
  },
  alertHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  studentName: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  flagLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  alertMsg: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 4,
  },
  alertDate: {
    fontSize: 11,
    color: '#9CA3AF',
    marginTop: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 4,
    marginTop: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    marginBottom: 12,
    backgroundColor: '#FAFAFA',
  },
  textArea: {
    height: 60,
    textAlignVertical: 'top',
  },
  notifyBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 8,
  },
  notifyBtnTxt: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  successText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 12,
  },
  emptyTxt: {
    color: '#6B7280',
    textAlign: 'center',
    fontSize: 14,
    marginVertical: 12,
  },
  noClassText: {
    fontSize: 15,
    color: '#6B7280',
  },
});
