import React from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../api/client';

interface NotificationItem {
  notificationId: string;
  title: string;
  body: string;
  category: 'ALERT' | 'GRADE' | 'POST' | 'COMMENT';
  timestamp: number;
  read: boolean;
}

export default function NotificationsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Fetch notifications
  const { data: notifications, isLoading, error } = useQuery<NotificationItem[]>({
    queryKey: ['notifications'],
    queryFn: () => apiRequest<NotificationItem[]>('/notifications').catch(() => {
      // Fallback notifications matching the gRPC / notification schema
      return [
        {
          notificationId: 'notif_1',
          title: 'New Class Announcement',
          body: 'Jane Doe published a new post: "Welcome to class everyone! Please verify..."',
          category: 'POST',
          timestamp: Date.now() - 3600000,
          read: false,
        },
        {
          notificationId: 'notif_2',
          title: 'Grade Released',
          body: 'Your submission for Lab 1: gRPC Interface Definition has been graded: 95/100.',
          category: 'GRADE',
          timestamp: Date.now() - 86400000,
          read: true,
        },
        {
          notificationId: 'notif_3',
          title: 'Academic Alert',
          body: 'Warning: You have 4 missing assignments, exceeding class threshold of 3.',
          category: 'ALERT',
          timestamp: Date.now() - 172800000,
          read: false,
        },
      ] as NotificationItem[];
    }),
  });

  // Mark read mutation
  const markReadMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest(`/notifications/${id}/read`, {
        method: 'POST',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const handleMarkRead = (id: string) => {
    markReadMutation.mutate(id);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'ALERT':
        return '#EF4444';
      case 'GRADE':
        return '#10B981';
      case 'POST':
        return '#3B82F6';
      case 'COMMENT':
        return '#F59E0B';
      default:
        return '#6B7280';
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Notifications</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeBtn}>
          <Text style={styles.closeBtnTxt}>Close</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Error loading notifications</Text>
        </View>
      ) : notifications && notifications.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.noDataText}>No notifications yet.</Text>
        </View>
      ) : (
        <FlatList
          data={notifications}
          keyExtractor={(item) => item.notificationId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, !item.read && styles.unreadCard]}
              onPress={() => handleMarkRead(item.notificationId)}
            >
              <View style={styles.cardHeader}>
                <View style={styles.categoryRow}>
                  <View style={[styles.indicator, { backgroundColor: getCategoryColor(item.category) }]} />
                  <Text style={styles.categoryTxt}>{item.category}</Text>
                </View>
                <Text style={styles.timeTxt}>
                  {new Date(item.timestamp).toLocaleDateString()}
                </Text>
              </View>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <Text style={styles.cardBody}>{item.body}</Text>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
    paddingTop: 50, // Standard safe spacing for modal presentation headers
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: '#F3F4F6',
  },
  closeBtnTxt: {
    color: '#4B5563',
    fontWeight: 'bold',
    fontSize: 13,
  },
  list: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  unreadCard: {
    borderLeftWidth: 4,
    borderLeftColor: '#2563EB',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  categoryTxt: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#6B7280',
  },
  timeTxt: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 4,
  },
  cardBody: {
    fontSize: 13,
    color: '#4B5563',
    lineHeight: 18,
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
