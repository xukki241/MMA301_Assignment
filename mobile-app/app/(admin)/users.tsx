import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../api/client';

interface UserItem {
  userId: string;
  email: string;
  fullName: string;
  role: 'Teacher' | 'Student' | 'Admin';
  createdAt: string;
  status: 'Active' | 'Suspended';
}

export default function AdminUsersScreen() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState<'All' | 'Teacher' | 'Student' | 'Admin'>('All');

  // Fetch users list
  const { data: users, isLoading, error } = useQuery<UserItem[]>({
    queryKey: ['admin-users'],
    queryFn: () => apiRequest<UserItem[]>('/admin/users'),
  });

  // Toggle user status mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: 'Active' | 'Suspended' }) =>
      apiRequest<UserItem>(`/admin/users/${userId}/status`, {
        method: 'PUT',
        body: { status },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const handleToggleStatus = (user: UserItem) => {
    const nextStatus = user.status === 'Active' ? 'Suspended' : 'Active';
    toggleStatusMutation.mutate({ userId: user.userId, status: nextStatus });
  };

  const filteredUsers = users
    ? users.filter((u) => {
        const matchesSearch =
          u.fullName.toLowerCase().includes(search.toLowerCase()) ||
          u.email.toLowerCase().includes(search.toLowerCase());
        const matchesFilter = filterRole === 'All' || u.role === filterRole;
        return matchesSearch && matchesFilter;
      })
    : [];

  return (
    <View style={styles.container}>
      <View style={styles.controls}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name or email..."
          value={search}
          onChangeText={setSearch}
        />
        
        {/* Role filters */}
        <View style={styles.filterRow}>
          {(['All', 'Teacher', 'Student', 'Admin'] as const).map((r) => (
            <TouchableOpacity
              key={r}
              style={[styles.filterTab, filterRole === r && styles.activeFilterTab]}
              onPress={() => setFilterRole(r)}
            >
              <Text
                style={[
                  styles.filterTabTxt,
                  filterRole === r && styles.activeFilterTabTxt,
                ]}
              >
                {r}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Error loading users</Text>
        </View>
      ) : (
        <FlatList
          data={filteredUsers}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <View style={styles.userCard}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{item.fullName}</Text>
                <Text style={styles.userEmail}>{item.email}</Text>
                <View style={styles.metaRow}>
                  <View style={styles.roleBadge}>
                    <Text style={styles.roleBadgeTxt}>{item.role}</Text>
                  </View>
                  <Text style={styles.dateText}>
                    Joined: {new Date(item.createdAt).toLocaleDateString()}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.statusBtn,
                  item.status === 'Active' ? styles.activeStatusBtn : styles.suspendedStatusBtn,
                ]}
                onPress={() => handleToggleStatus(item)}
              >
                <Text
                  style={[
                    styles.statusBtnTxt,
                    item.status === 'Active' ? styles.activeStatusBtnTxt : styles.suspendedStatusBtnTxt,
                  ]}
                >
                  {item.status}
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
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  controls: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderColor: '#E5E7EB',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 6,
    padding: 10,
    fontSize: 15,
    backgroundColor: '#FAFAFA',
    marginBottom: 12,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
  },
  filterTab: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
  },
  activeFilterTab: {
    backgroundColor: '#2563EB',
  },
  filterTabTxt: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  activeFilterTabTxt: {
    color: '#FFFFFF',
  },
  list: {
    padding: 16,
  },
  userCard: {
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
  userInfo: {
    flex: 1,
    paddingRight: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  userEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  roleBadge: {
    backgroundColor: '#EFF6FF',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  roleBadgeTxt: {
    fontSize: 11,
    color: '#2563EB',
    fontWeight: 'bold',
  },
  dateText: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  statusBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
  },
  activeStatusBtn: {
    backgroundColor: '#D1FAE5',
    borderColor: '#A7F3D0',
  },
  suspendedStatusBtn: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  statusBtnTxt: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  activeStatusBtnTxt: {
    color: '#065F46',
  },
  suspendedStatusBtnTxt: {
    color: '#991B1B',
  },
  errorText: {
    color: '#DC2626',
    fontWeight: 'bold',
  },
});
