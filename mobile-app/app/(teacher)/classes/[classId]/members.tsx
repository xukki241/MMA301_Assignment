import React from 'react';
import { View, Text, StyleSheet, SectionList, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../../api/client';

interface Member {
  userId: string;
  fullName: string;
  email: string;
  status?: string;
}

interface MembersResponse {
  teachers: Member[];
  students: Member[];
}

export default function ClassMembersScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const router = useRouter();

  // Fetch members
  const { data: members, isLoading, error } = useQuery<MembersResponse>({
    queryKey: ['members', classId],
    queryFn: () => apiRequest<MembersResponse>(`/classes/${classId}/members`),
  });

  const navigateToSubSection = (section: 'stream' | 'exercises' | 'members' | 'settings') => {
    router.push(`/(teacher)/classes/${classId}/${section}`);
  };

  const sections = members
    ? [
        { title: 'Teachers', data: members.teachers },
        { title: 'Students', data: members.students },
      ]
    : [];

  return (
    <View style={styles.container}>
      {/* Sub Header Navigation */}
      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.subHeaderTab} onPress={() => navigateToSubSection('stream')}>
          <Text style={styles.subHeaderTabTxt}>Stream</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.subHeaderTab} onPress={() => navigateToSubSection('exercises')}>
          <Text style={styles.subHeaderTabTxt}>Exercises</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.subHeaderTab, styles.activeTab]} onPress={() => navigateToSubSection('members')}>
          <Text style={[styles.subHeaderTabTxt, styles.activeTabTxt]}>Members</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.subHeaderTab} onPress={() => navigateToSubSection('settings')}>
          <Text style={styles.subHeaderTabTxt}>Settings</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Error loading members</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.userId}
          contentContainerStyle={styles.list}
          renderSectionHeader={({ section: { title } }) => (
            <Text style={styles.sectionHeader}>{title}</Text>
          )}
          renderItem={({ item }) => (
            <View style={styles.memberCard}>
              <View style={styles.avatarPlaceholder}>
                <Text style={styles.avatarText}>
                  {item.fullName.split(' ').map((n) => n[0]).join('').toUpperCase()}
                </Text>
              </View>
              <View style={styles.memberInfo}>
                <Text style={styles.memberName}>{item.fullName}</Text>
                <Text style={styles.memberEmail}>{item.email}</Text>
              </View>
              {item.status && (
                <View style={styles.statusBadge}>
                  <Text style={styles.statusBadgeTxt}>{item.status}</Text>
                </View>
              )}
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
  list: {
    padding: 16,
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginVertical: 12,
  },
  memberCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  memberInfo: {
    flex: 1,
  },
  memberName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  memberEmail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 1,
  },
  statusBadge: {
    backgroundColor: '#D1FAE5',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  statusBadgeTxt: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
  },
  errorText: {
    color: '#DC2626',
    fontWeight: 'bold',
  },
});
