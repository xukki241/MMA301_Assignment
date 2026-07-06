import React, { useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useAppStore } from '../../store/useAppStore';
import { apiRequest } from '../../api/client';

interface ClassItem {
  classId: string;
  className: string;
  subject: string;
  classCode: string;
  activeStudentsCount: number;
}

interface Metrics {
  classId: string;
  averageGrade: number;
  riskDistribution: {
    Good: number;
    Warning: number;
    Critical: number;
  };
  atRiskStudents: {
    studentId: string;
    fullName: string;
    currentAverage: number;
    missingCount: number;
    riskLevel: 'Critical' | 'Warning' | 'Good';
  }[];
}

export default function TeacherDashboard() {
  const router = useRouter();
  const { activeClassId, setActiveClassId } = useAppStore();

  // Query classes
  const { data: classes, isLoading: loadingClasses } = useQuery<ClassItem[]>({
    queryKey: ['classes'],
    queryFn: () => apiRequest<ClassItem[]>('/classes'),
  });

  // Automatically select first class
  useEffect(() => {
    if (classes && classes.length > 0 && !activeClassId) {
      setActiveClassId(classes[0].classId);
    }
  }, [classes, activeClassId]);

  // Query metrics for active class
  const { data: metrics, isLoading: loadingMetrics } = useQuery<Metrics>({
    queryKey: ['metrics', activeClassId],
    queryFn: () => apiRequest<Metrics>(`/classes/${activeClassId}/metrics`),
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
        <Text style={styles.noDataText}>No classes found. Create one first!</Text>
        <TouchableOpacity style={styles.createButton} onPress={() => router.push('/(teacher)/classes')}>
          <Text style={styles.createButtonText}>Go to Classes</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const selectedClass = classes.find((c) => c.classId === activeClassId);

  // Compute percentages for risk distribution chart
  const goodCount = metrics?.riskDistribution?.Good ?? 0;
  const warningCount = metrics?.riskDistribution?.Warning ?? 0;
  const criticalCount = metrics?.riskDistribution?.Critical ?? 0;
  const totalStudents = goodCount + warningCount + criticalCount || 1;

  const goodPercent = (goodCount / totalStudents) * 100;
  const warningPercent = (warningCount / totalStudents) * 100;
  const criticalPercent = (criticalCount / totalStudents) * 100;

  return (
    <ScrollView style={styles.container}>
      {/* Class Selector */}
      <View style={styles.selectorContainer}>
        <Text style={styles.sectionTitle}>Select Class</Text>
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

      {loadingMetrics ? (
        <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
      ) : metrics ? (
        <View style={styles.dashboardContent}>
          {/* Main Stat & Chart Card */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>Class Academic Risk Chart</Text>
            
            {/* Risk Distribution Chart */}
            <View style={styles.chartWrapper}>
              <View style={styles.pieContainer}>
                {/* Visual donut approximation using concentric circles/flexbox percentage parts */}
                <View style={styles.donutCenter}>
                  <Text style={styles.donutLabel}>Avg Grade</Text>
                  <Text style={styles.donutVal}>{metrics.averageGrade}%</Text>
                </View>
              </View>
              
              {/* Stacked segment bar */}
              <View style={styles.barChartContainer}>
                <View style={[styles.barSegment, { width: `${goodPercent}%`, backgroundColor: '#10B981' }]} />
                <View style={[styles.barSegment, { width: `${warningPercent}%`, backgroundColor: '#F59E0B' }]} />
                <View style={[styles.barSegment, { width: `${criticalPercent}%`, backgroundColor: '#EF4444' }]} />
              </View>

              {/* Legends with counts */}
              <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendIndicator, { backgroundColor: '#10B981' }]} />
                  <Text style={styles.legendText}>Good: {goodCount}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendIndicator, { backgroundColor: '#F59E0B' }]} />
                  <Text style={styles.legendText}>Warning: {warningCount}</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendIndicator, { backgroundColor: '#EF4444' }]} />
                  <Text style={styles.legendText}>Critical: {criticalCount}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* At Risk Student List */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>At-Risk Students ({metrics.atRiskStudents.length})</Text>
            {metrics.atRiskStudents.length === 0 ? (
              <Text style={styles.emptyText}>All students are performing well in this class!</Text>
            ) : (
              metrics.atRiskStudents.map((stud) => (
                <View key={stud.studentId} style={styles.studentItem}>
                  <View style={styles.studentInfo}>
                    <Text style={styles.studentName}>{stud.fullName}</Text>
                    <Text style={styles.studentDetail}>
                      Avg: {stud.currentAverage}% | Missing: {stud.missingCount}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.riskBadge,
                      {
                        backgroundColor:
                          stud.riskLevel === 'Critical' ? '#FEE2E2' : '#FEF3C7',
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.riskBadgeTxt,
                        {
                          color:
                            stud.riskLevel === 'Critical' ? '#991B1B' : '#92400E',
                        },
                      ]}
                    >
                      {stud.riskLevel}
                    </Text>
                  </View>
                </View>
              ))
            )}
            {metrics.atRiskStudents.length > 0 && (
              <TouchableOpacity
                style={styles.alertRedirectBtn}
                onPress={() => router.push('/(teacher)/alerts')}
              >
                <Text style={styles.alertRedirectBtnTxt}>Notify or Manage Alerts</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      ) : (
        <View style={styles.center}>
          <Text style={styles.noDataText}>No metrics available.</Text>
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
  createButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 6,
  },
  createButtonText: {
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
  dashboardContent: {
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
    marginBottom: 12,
  },
  chartWrapper: {
    alignItems: 'center',
    marginVertical: 8,
  },
  pieContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 10,
    borderColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  donutCenter: {
    alignItems: 'center',
  },
  donutLabel: {
    fontSize: 12,
    color: '#6B7280',
  },
  donutVal: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  barChartContainer: {
    height: 16,
    width: '100%',
    backgroundColor: '#E5E7EB',
    borderRadius: 8,
    flexDirection: 'row',
    overflow: 'hidden',
    marginBottom: 16,
  },
  barSegment: {
    height: '100%',
  },
  legendRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 13,
    color: '#4B5563',
  },
  emptyText: {
    color: '#6B7280',
    fontSize: 14,
    textAlign: 'center',
    marginVertical: 12,
  },
  studentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  studentInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1F2937',
  },
  studentDetail: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  riskBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  riskBadgeTxt: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  alertRedirectBtn: {
    marginTop: 12,
    paddingVertical: 10,
    backgroundColor: '#EFF6FF',
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#BFDBFE',
  },
  alertRedirectBtnTxt: {
    color: '#2563EB',
    fontSize: 14,
    fontWeight: 'bold',
  },
});
