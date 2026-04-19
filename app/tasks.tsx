import React, { useEffect, useState, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { subscribePlants } from '@/lib/plantRepository';
import { type Plant } from '@/lib/types';
import {
  buildUpcomingTasks,
  getRelativeLabelStyle,
  type UpcomingTask,
} from '@/lib/upcomingTasks';

const TASK_TYPE_LABEL: Record<UpcomingTask['taskType'], string> = {
  watering: 'Watering',
  fertilization: 'Fertilization',
  sprinkling: 'Sprinkling',
};

function TaskRow({ task, onPress }: { task: UpcomingTask; onPress?: () => void }) {
  const pillStyle = getRelativeLabelStyle(task.relativeLabel);
  const isWatering = task.taskType === 'watering';
  const isSprinkling = task.taskType === 'sprinkling';
  const isFertilization = task.taskType === 'fertilization';
  return (
    <TouchableOpacity style={styles.taskRow} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.taskIconWrapper}>
        {isWatering && <Ionicons name="water" size={20} color="#0ea5e9" />}
        {isSprinkling && <Ionicons name="water-outline" size={20} color="#eab308" />}
        {isFertilization && <Ionicons name="leaf" size={20} color="#22c55e" />}
      </View>
      <View style={styles.taskTextWrap}>
        <Text style={styles.taskPlantName}>{task.plantName}</Text>
        <Text style={styles.taskTypeSubtitle}>{TASK_TYPE_LABEL[task.taskType]}</Text>
      </View>
      <View style={[styles.taskPill, { backgroundColor: pillStyle.backgroundColor }]}>
        <Text style={[styles.taskPillText, { color: pillStyle.color }]}>
          {task.relativeLabel}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function TasksScreen() {
  const router = useRouter();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = subscribePlants((fetched) => {
      setPlants(fetched);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const tasks = useMemo(() => buildUpcomingTasks(plants), [plants]);

  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/home')}>
          <Ionicons name="arrow-back" size={24} color="#1b3b2f" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Tasks</Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {tasks.length === 0 ? (
            <Text style={styles.emptyText}>No upcoming tasks</Text>
          ) : (
            tasks.map((task) => (
              <TaskRow
                key={`${task.plantId}-${task.taskType}-${task.dueDate}`}
                task={task}
                onPress={() =>
                  router.push({
                    pathname: '/task-detail',
                    params: { plantId: task.plantId, taskType: task.taskType, dueDate: task.dueDate },
                  })
                }
              />
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7f4',
  },
  loadingWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: '#f4f7f4',
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1b3b2f',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    paddingVertical: 16,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 5,
  },
  taskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  taskIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 999,
    backgroundColor: '#f0fdf4',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskTextWrap: {
    flex: 1,
  },
  taskPlantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
  },
  taskTypeSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
  taskPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  taskPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 14,
    color: '#6b7280',
    paddingVertical: 8,
  },
});
