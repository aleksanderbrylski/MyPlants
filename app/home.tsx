import React, { useEffect, useState, useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { subscribePlants, type Plant } from '@/lib/firestore';
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

const PREVIEW_LIMIT = 6;

const UPCOMING_PREVIEW_COUNT = 5;

export default function HomeScreen() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const [plants, setPlants] = useState<Plant[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    const unsubscribe = subscribePlants(user.uid, (fetched) => {
      setPlants(fetched);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [user?.uid]);

  const previewPlants = useMemo(() => plants.slice(0, PREVIEW_LIMIT), [plants]);
  const hiddenCount = Math.max(0, plants.length - PREVIEW_LIMIT);

  const tasks = useMemo(() => buildUpcomingTasks(plants), [plants]);
  const tasksPreview = tasks.slice(0, UPCOMING_PREVIEW_COUNT);

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  const plantRows = useMemo(() => {
    const rows: Plant[][] = [];
    for (let i = 0; i < previewPlants.length; i += 2) {
      rows.push(previewPlants.slice(i, i + 2));
    }
    return rows;
  }, [previewPlants]);

  const renderPlantCard = (plant: Plant) => (
    <TouchableOpacity
      key={plant.id}
      style={styles.plantCard}
      activeOpacity={0.9}
      onPress={() => router.push({ pathname: '/plant-details', params: { plantId: plant.id } })}
    >
      <View style={styles.plantImageWrapper}>
        {plant.imageUrl ? (
          <Image
            source={{ uri: plant.imageUrl }}
            style={styles.plantImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="leaf-outline" size={40} color="#9ca3af" />
          </View>
        )}
      </View>
      <Text style={styles.plantName} numberOfLines={1}>
        {plant.name}
      </Text>
    </TouchableOpacity>
  );

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
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header: MyPlants + Logout */}
        <View style={styles.topBar}>
          <View style={styles.brandContainer}>
            <View style={styles.brandIcon}>
              <Ionicons name="leaf" size={18} color="#22c55e" />
            </View>
            <Text style={styles.brandText}>MyPlants</Text>
          </View>
          <TouchableOpacity style={styles.logoutButton} onPress={handleSignOut}>
            <Text style={styles.logoutText}>Logout</Text>
            <Ionicons name="arrow-forward" size={16} color="#374151" />
          </TouchableOpacity>
        </View>

        {/* Upcoming Tasks card */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Upcoming Tasks</Text>
          {tasks.length === 0 ? (
            <Text style={styles.emptyTasksText}>No upcoming tasks</Text>
          ) : (
            <>
              {tasksPreview.map((task) => (
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
              ))}
              <TouchableOpacity
                style={styles.viewAllTasksLink}
                onPress={() => router.push('/tasks')}
              >
                <Text style={styles.viewAllTasksText}>View all tasks</Text>
              </TouchableOpacity>
            </>
          )}
        </View>

        {/* All Plants section */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>All Plants</Text>
          {plants.length === 0 ? (
            <View style={styles.emptyPlantsWrap}>
              <Text style={styles.emptyPlantsText}>No plants yet</Text>
              <TouchableOpacity
                style={styles.viewGardenButton}
                onPress={() => router.push('/garden')}
              >
                <Text style={styles.viewGardenButtonText}>View all plants</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {plantRows.map((row, rowIndex) => (
                <View key={`row-${rowIndex}`} style={styles.plantRow}>
                  {row.map((plant) => renderPlantCard(plant))}
                  {row.length === 1 && <View style={styles.plantCardSpacer} />}
                </View>
              ))}
              {hiddenCount > 0 && (
                <TouchableOpacity onPress={() => router.push('/garden')} style={styles.hiddenCountWrap}>
                  <Text style={styles.hiddenCountText}>+{hiddenCount} more plants</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={styles.viewGardenButton}
                onPress={() => router.push('/garden')}
              >
                <Text style={styles.viewGardenButtonText}>View all plants</Text>
              </TouchableOpacity>
            </>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 24,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  brandContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandIcon: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  brandText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b3b2f',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#e5e7eb',
    borderRadius: 8,
  },
  logoutText: {
    fontSize: 13,
    color: '#374151',
    fontWeight: '500',
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
    marginBottom: 24,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
    marginBottom: 12,
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
  viewAllTasksLink: {
    alignSelf: 'center',
    marginTop: 12,
  },
  viewAllTasksText: {
    fontSize: 14,
    color: '#22c55e',
    fontWeight: '600',
  },
  emptyTasksText: {
    fontSize: 14,
    color: '#6b7280',
    paddingVertical: 8,
  },
  plantRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
  },
  plantCard: {
    flex: 1,
    minWidth: 0,
    borderRadius: 18,
    backgroundColor: '#ffffff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 4,
    overflow: 'hidden',
  },
  plantImageWrapper: {
    height: 120,
    backgroundColor: '#e5e7eb',
  },
  plantImage: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  plantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  viewGardenButton: {
    alignSelf: 'center',
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 8,
  },
  viewGardenButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  emptyPlantsWrap: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  emptyPlantsText: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 12,
  },
  plantCardSpacer: {
    flex: 1,
    minWidth: 0,
  },
  hiddenCountWrap: {
    alignSelf: 'center',
    marginVertical: 4,
  },
  hiddenCountText: {
    textAlign: 'center',
    color: '#22c55e',
    fontWeight: '600',
    fontSize: 14,
    marginVertical: 8,
  },
});
