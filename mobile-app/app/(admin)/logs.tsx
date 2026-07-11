import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../api/client';

interface AuditLog {
  logId: string;
  action: string;
  message: string;
  userId: string;
  ipAddress: string;
  timestamp: string;
}

export default function AdminLogsScreen() {
  const [filterAction, setFilterAction] = useState('');

  // Fetch admin logs
  const { data: logs, isLoading, error, refetch } = useQuery<AuditLog[]>({
    queryKey: ['admin-logs'],
    queryFn: () => apiRequest<AuditLog[]>('/admin/logs'),
  });

  const filteredLogs = logs
    ? logs.filter((l) =>
        l.action.toLowerCase().includes(filterAction.toLowerCase()) ||
        l.message.toLowerCase().includes(filterAction.toLowerCase())
      )
    : [];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TextInput
          style={styles.filterInput}
          placeholder="Filter logs by action or details..."
          value={filterAction}
          onChangeText={setFilterAction}
        />
        <TouchableOpacity style={styles.refreshBtn} onPress={() => refetch()}>
          <Text style={styles.refreshBtnTxt}>Refresh</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Error loading audit logs</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLogs}
          keyExtractor={(item) => item.logId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.logCard}>
              <View style={styles.logHeader}>
                <Text style={styles.logAction}>{item.action}</Text>
                <Text style={styles.logDate}>{new Date(item.timestamp).toLocaleString()}</Text>
              </View>
              <Text style={styles.logMsg}>{item.message}</Text>
              <View style={styles.logFooter}>
                <Text style={styles.footerTxt}>Actor: {item.userId}</Text>
                <Text style={styles.footerTxt}>IP: {item.ipAddress}</Text>
              </View>
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
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    gap: 12,
  },
  filterInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 8,
    fontSize: 14,
    backgroundColor: '#FAFAFA',
  },
  refreshBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    justifyContent: 'center',
  },
  refreshBtnTxt: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  list: {
    padding: 16,
  },
  logCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  logAction: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#D97706',
    backgroundColor: '#FEF3C7',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  logDate: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  logMsg: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 18,
    marginBottom: 8,
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    paddingTop: 8,
  },
  footerTxt: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  errorText: {
    color: '#DC2626',
    fontWeight: 'bold',
  },
});
