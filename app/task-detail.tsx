import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getPlant, updatePlant } from '@/lib/plantRepository';
import { type Plant } from '@/lib/types';
import { getRelativeLabelStyle, relativeLabel } from '@/lib/upcomingTasks';

// ─── Constants ────────────────────────────────────────────────────────────────

const TASK_TYPE_META: Record<
  'watering' | 'fertilization' | 'sprinkling',
  { icon: keyof typeof Ionicons.glyphMap; label: string; description: string }
> = {
  watering: {
    icon: 'water',
    label: 'Watering',
    description: 'Time to give your plant some hydration',
  },
  fertilization: {
    icon: 'leaf',
    label: 'Fertilization',
    description: 'Time to feed your plant with nutrients',
  },
  sprinkling: {
    icon: 'water-outline',
    label: 'Sprinkling',
    description: "Time to mist your plant's leaves",
  },
};

const COMPLETION_FIELD: Record<
  'watering' | 'fertilization' | 'sprinkling',
  'lastWateredAt' | 'lastFertilizedAt' | 'lastSprinkledAt'
> = {
  watering: 'lastWateredAt',
  fertilization: 'lastFertilizedAt',
  sprinkling: 'lastSprinkledAt',
};

// ─── Pure helper functions ────────────────────────────────────────────────────

export function getTaskTypeIcon(taskType: string): keyof typeof Ionicons.glyphMap {
  const meta = TASK_TYPE_META[taskType as keyof typeof TASK_TYPE_META];
  return meta?.icon ?? 'help-circle-outline';
}

export function getTaskTypeLabel(taskType: string): string {
  const meta = TASK_TYPE_META[taskType as keyof typeof TASK_TYPE_META];
  return meta?.label ?? taskType;
}

export function getTaskTypeDescription(taskType: string): string {
  const meta = TASK_TYPE_META[taskType as keyof typeof TASK_TYPE_META];
  return meta?.description ?? '';
}

export function getCompletionField(
  taskType: string
): 'lastWateredAt' | 'lastFertilizedAt' | 'lastSprinkledAt' {
  return COMPLETION_FIELD[taskType as keyof typeof COMPLETION_FIELD] ?? 'lastWateredAt';
}

// ─── TaskInfoCard ─────────────────────────────────────────────────────────────

type TaskInfoCardProps = {
  taskType: 'watering' | 'fertilization' | 'sprinkling';
};

export function TaskInfoCard({ taskType }: TaskInfoCardProps) {
  const icon = getTaskTypeIcon(taskType);
  const label = getTaskTypeLabel(taskType);
  const description = getTaskTypeDescription(taskType);

  return (
    <View style={cardStyles.card}>
      <View style={cardStyles.iconRow}>
        <View style={cardStyles.iconBg}>
          <Ionicons name={icon} size={22} color="#22c55e" />
        </View>
        <Text style={cardStyles.label}>{label}</Text>
      </View>
      <Text style={cardStyles.description}>{description}</Text>
    </View>
  );
}

const cardStyles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  iconRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  iconBg: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f0fdf4',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b3b2f',
  },
  description: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
  },
});

// ─── DueDateBadge ─────────────────────────────────────────────────────────────

type DueDateBadgeProp = {
  relativeLabel: string;
};

export function DueDateBadge({ relativeLabel }: DueDateBadgeProp) {
  const style = getRelativeLabelStyle(relativeLabel);

  return (
    <View style={[badgeStyles.pill, { backgroundColor: style.backgroundColor }]}>
      <Text style={[badgeStyles.text, { color: style.color }]}>{relativeLabel}</Text>
    </View>
  );
}

const badgeStyles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});

// ─── TaskDetailScreen ─────────────────────────────────────────────────────────

export default function TaskDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ plantId?: string; taskType?: string; dueDate?: string }>();

  const plantId = typeof params.plantId === 'string' && params.plantId ? params.plantId : null;
  const taskType = (params.taskType ?? '') as 'watering' | 'fertilization' | 'sprinkling';
  const dueDate = params.dueDate ?? '';

  const [plant, setPlant] = useState<Plant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [writeError, setWriteError] = useState<string | null>(null);

  useEffect(() => {
    if (!plantId) {
      setError('Invalid or missing plant ID.');
      setLoading(false);
      return;
    }
    const load = async () => {
      try {
        const result = await getPlant(plantId);
        if (result) {
          setPlant(result);
        } else {
          setError('Plant not found.');
        }
      } catch {
        setError('Could not load plant. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [plantId]);

  if (loading) {
    return (
      <SafeAreaView style={screenStyles.safeArea}>
        <View style={screenStyles.centered}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !plant) {
    return (
      <SafeAreaView style={screenStyles.safeArea}>
        <View style={screenStyles.centered}>
          <Text style={screenStyles.errorText}>{error ?? 'Something went wrong.'}</Text>
          <TouchableOpacity
            style={screenStyles.goHomeButton}
            onPress={() => router.replace('/home')}
          >
            <Text style={screenStyles.goHomeButtonText}>Go Home</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Compute relative label inline from dueDate
  const dueDateRelativeLabel = (() => {
    if (!dueDate) return '';
    const parsed = new Date(dueDate);
    if (isNaN(parsed.getTime())) return dueDate;
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    return relativeLabel(parsed, todayStart);
  })();

  const handleMarkAsDone = async () => {
    if (!plantId) return;
    setWriteError(null);
    setSaving(true);
    try {
      await updatePlant(plantId, {
        [getCompletionField(taskType)]: new Date(),
      });
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/home');
      }
    } catch {
      setWriteError('Could not save. Please try again.');
      setSaving(false);
    }
  };

  return (
    <SafeAreaView style={screenStyles.safeArea}>
      {/* Header */}
      <View style={screenStyles.header}>
        <TouchableOpacity onPress={() => router.back()} style={screenStyles.headerButton}>
          <Ionicons name="chevron-back" size={24} color="#1b3b2f" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={screenStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero image area */}
        <View style={screenStyles.heroContainer}>
          {plant.imageUrl ? (
            <Image
              source={{ uri: plant.imageUrl }}
              style={screenStyles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={screenStyles.heroPlaceholder}>
              <Ionicons name="leaf-outline" size={64} color="#9ca3af" />
            </View>
          )}
        </View>

        {/* Plant name */}
        <Text style={screenStyles.plantName}>{plant.name}</Text>

        {/* Subtitle */}
        <Text style={screenStyles.subtitle}>Indoor Plant Care</Text>

        {/* Task info card */}
        <TaskInfoCard taskType={taskType} />

        {/* Due date badge */}
        <DueDateBadge relativeLabel={dueDateRelativeLabel} />

        {/* Action buttons */}
        {writeError && (
          <Text style={screenStyles.writeErrorText}>{writeError}</Text>
        )}
        <TouchableOpacity
          style={[screenStyles.markDoneButton, saving && screenStyles.buttonDisabled]}
          onPress={handleMarkAsDone}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator size="small" color="#ffffff" />
          ) : (
            <Text style={screenStyles.markDoneButtonText}>Mark as Done</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={[screenStyles.cancelButton, saving && screenStyles.buttonDisabled]}
          onPress={() => router.back()}
          disabled={saving}
        >
          <Text style={screenStyles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const screenStyles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7f4',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#6b7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  goHomeButton: {
    backgroundColor: '#22c55e',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  goHomeButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f4f7f4',
  },
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  heroContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    marginBottom: 16,
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  heroPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plantName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1b3b2f',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 16,
  },
  writeErrorText: {
    fontSize: 14,
    color: '#ef4444',
    marginTop: 12,
    marginBottom: 4,
    textAlign: 'center',
  },
  markDoneButton: {
    backgroundColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  markDoneButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#22c55e',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  cancelButtonText: {
    color: '#22c55e',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
});
