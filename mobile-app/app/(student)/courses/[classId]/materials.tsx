import React from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator, Linking } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '../../../../api/client';

interface Material {
  materialId: string;
  title: string;
  contentText: string;
  attachmentURL: string;
}

interface Topic {
  topicId: string;
  title: string;
  orderIndex: number;
  materials: Material[];
}

export default function ClassMaterialsScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const router = useRouter();

  // Fetch topics and materials
  const { data: topics, isLoading, error } = useQuery<Topic[]>({
    queryKey: ['topics', classId],
    queryFn: () => apiRequest<Topic[]>(`/classes/${classId}/topics`),
  });

  const navigateToSubSection = (section: 'stream' | 'materials') => {
    router.push(`/(student)/courses/${classId}/${section}`);
  };

  const handleOpenAttachment = (url: string) => {
    if (url) {
      Linking.openURL(url).catch((err) => console.error('Failed to open link:', err));
    }
  };

  return (
    <View style={styles.container}>
      {/* Sub Header Navigation */}
      <View style={styles.subHeader}>
        <TouchableOpacity style={styles.subHeaderTab} onPress={() => navigateToSubSection('stream')}>
          <Text style={styles.subHeaderTabTxt}>Stream</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.subHeaderTab, styles.activeTab]} onPress={() => navigateToSubSection('materials')}>
          <Text style={[styles.subHeaderTabTxt, styles.activeTabTxt]}>Materials</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Error fetching materials</Text>
        </View>
      ) : topics && topics.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.noDataText}>No course materials uploaded yet.</Text>
        </View>
      ) : (
        <FlatList
          data={topics}
          keyExtractor={(item) => item.topicId}
          contentContainerStyle={styles.list}
          renderItem={({ item: topic }) => (
            <View style={styles.topicSection}>
              <Text style={styles.topicTitle}>{topic.title}</Text>
              
              {topic.materials && topic.materials.length > 0 ? (
                topic.materials.map((mat) => (
                  <View key={mat.materialId} style={styles.materialCard}>
                    <Text style={styles.materialTitle}>{mat.title}</Text>
                    {mat.contentText ? (
                      <Text style={styles.materialContent}>{mat.contentText}</Text>
                    ) : null}
                    {mat.attachmentURL ? (
                      <TouchableOpacity
                        style={styles.downloadBtn}
                        onPress={() => handleOpenAttachment(mat.attachmentURL)}
                      >
                        <Text style={styles.downloadBtnTxt}>View Attachment &rarr;</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                ))
              ) : (
                <Text style={styles.emptyTopicText}>No materials in this topic.</Text>
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
  topicSection: {
    marginBottom: 20,
  },
  topicTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#374151',
    marginBottom: 10,
    textTransform: 'uppercase',
  },
  materialCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  materialTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  materialContent: {
    fontSize: 13,
    color: '#4B5563',
    marginTop: 6,
    lineHeight: 18,
  },
  downloadBtn: {
    alignSelf: 'flex-start',
    marginTop: 10,
    backgroundColor: '#EFF6FF',
    borderWidth: 1,
    borderColor: '#BFDBFE',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  downloadBtnTxt: {
    color: '#2563EB',
    fontSize: 12,
    fontWeight: 'bold',
  },
  emptyTopicText: {
    color: '#9CA3AF',
    fontSize: 13,
    fontStyle: 'italic',
    paddingLeft: 8,
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
