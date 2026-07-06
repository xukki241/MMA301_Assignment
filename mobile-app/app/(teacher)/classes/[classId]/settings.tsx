import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Switch, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '../../../../api/client';

interface ClassSettings {
  classId: string;
  allowStudentPosts: boolean;
  enableGradeAutoAlerts: boolean;
  themeColor: string;
}

export default function ClassSettingsScreen() {
  const { classId } = useLocalSearchParams<{ classId: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [allowStudentPosts, setAllowStudentPosts] = useState(true);
  const [enableGradeAutoAlerts, setEnableGradeAutoAlerts] = useState(true);
  const [themeColor, setThemeColor] = useState('#2563EB');
  const [successMsg, setSuccessMsg] = useState('');

  // Fetch settings. (If there is no direct settings endpoint, we use class info or fallback, but the design lists: GET or PUT /api/classes/:classId/settings)
  const { data: settings, isLoading, error } = useQuery<ClassSettings>({
    queryKey: ['settings', classId],
    queryFn: () => apiRequest<ClassSettings>(`/classes/${classId}/settings`),
  });

  useEffect(() => {
    if (settings) {
      setAllowStudentPosts(settings.allowStudentPosts);
      setEnableGradeAutoAlerts(settings.enableGradeAutoAlerts);
      setThemeColor(settings.themeColor || '#2563EB');
    }
  }, [settings]);

  // Update mutation
  const updateSettingsMutation = useMutation({
    mutationFn: (newSettings: Omit<ClassSettings, 'classId'>) =>
      apiRequest<ClassSettings>(`/classes/${classId}/settings`, {
        method: 'PUT',
        body: newSettings,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', classId] });
      setSuccessMsg('Settings updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    },
  });

  const handleSave = () => {
    updateSettingsMutation.mutate({
      allowStudentPosts,
      enableGradeAutoAlerts,
      themeColor,
    });
  };

  const navigateToSubSection = (section: 'stream' | 'exercises' | 'members' | 'settings') => {
    router.push(`/(teacher)/classes/${classId}/${section}`);
  };

  const colors = ['#2563EB', '#10B981', '#F59E0B', '#EF4444', '#7C3AED'];

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
        <TouchableOpacity style={styles.subHeaderTab} onPress={() => navigateToSubSection('members')}>
          <Text style={styles.subHeaderTabTxt}>Members</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.subHeaderTab, styles.activeTab]} onPress={() => navigateToSubSection('settings')}>
          <Text style={[styles.subHeaderTabTxt, styles.activeTabTxt]}>Settings</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Error loading settings</Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <Text style={styles.sectionTitle}>Classroom Controls</Text>
          {successMsg ? <Text style={styles.successText}>{successMsg}</Text> : null}

          <View style={styles.card}>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Allow Student Posts</Text>
                <Text style={styles.settingDesc}>Students can publish posts to the class stream</Text>
              </View>
              <Switch value={allowStudentPosts} onValueChange={setAllowStudentPosts} />
            </View>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Grade Auto Alerts</Text>
                <Text style={styles.settingDesc}>Auto-flag students whose grades drop below threshold</Text>
              </View>
              <Switch value={enableGradeAutoAlerts} onValueChange={setEnableGradeAutoAlerts} />
            </View>
          </View>

          <Text style={styles.sectionTitle}>Theme & Brand</Text>
          <View style={styles.card}>
            <Text style={styles.settingLabel}>Select Primary Color</Text>
            <View style={styles.colorPalette}>
              {colors.map((color) => (
                <TouchableOpacity
                  key={color}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    themeColor === color && styles.selectedColor,
                  ]}
                  onPress={() => setThemeColor(color)}
                />
              ))}
            </View>
          </View>

          <TouchableOpacity
            style={styles.saveBtn}
            onPress={handleSave}
            disabled={updateSettingsMutation.isPending}
          >
            {updateSettingsMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveBtnTxt}>Save Settings</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
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
  content: {
    padding: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#374151',
    textTransform: 'uppercase',
    marginTop: 16,
    marginBottom: 8,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  settingInfo: {
    flex: 1,
    paddingRight: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  settingDesc: {
    fontSize: 13,
    color: '#6B7280',
    marginTop: 2,
  },
  colorPalette: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  colorOption: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  selectedColor: {
    borderColor: '#000000',
  },
  saveBtn: {
    backgroundColor: '#2563EB',
    paddingVertical: 14,
    borderRadius: 6,
    alignItems: 'center',
    marginTop: 16,
  },
  saveBtnTxt: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  successText: {
    color: '#059669',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginVertical: 8,
  },
  errorText: {
    color: '#DC2626',
    fontWeight: 'bold',
  },
});
