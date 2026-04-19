import React, { useEffect, useState, type ReactNode } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Image,
  ActivityIndicator,
  Alert,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { getPlant, deletePlant } from '@/lib/plantRepository';
import { deleteImage } from '@/lib/imageStore';
import type { Plant } from '@/lib/types';

/**
 * Returns "Not recorded" when date is undefined, otherwise formats as "YYYY-MM-DD".
 */
export function formatLastPerformed(date: Date | undefined): string {
  if (date === undefined) return 'Not recorded';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Returns a human-readable watering schedule string.
 * - "Off" when wateringMode is 'disabled' or undefined
 * - "Every N days" when wateringMode is 'interval'
 */
export function formatWateringSchedule(plant: Plant): string {
  if (plant.wateringMode !== 'interval') return 'Off';
  const days = typeof plant.wateringIntervalDays === 'number' ? plant.wateringIntervalDays : 0;
  return `Every ${days} days`;
}

/**
 * Returns a human-readable fertilization schedule string.
 * - "Off" when fertilizationMode is 'disabled' or undefined
 * - "Every N days" when fertilizationMode is 'interval'
 * - "Every N waterings" when fertilizationMode is 'with_watering'
 */
export function formatFertilizationSchedule(plant: Plant): string {
  if (plant.fertilizationMode === 'interval') {
    const days =
      typeof plant.fertilizationIntervalDays === 'number' ? plant.fertilizationIntervalDays : 0;
    return `Every ${days} days`;
  }
  if (plant.fertilizationMode === 'with_watering') {
    const waterings =
      typeof plant.fertilizationEveryWaterings === 'number'
        ? plant.fertilizationEveryWaterings
        : 0;
    return `Every ${waterings} waterings`;
  }
  return 'Off';
}

/**
 * Returns a human-readable sprinkling schedule string.
 * - "Off" when sprinklingMode is 'disabled' or undefined
 * - "Every N days" when sprinklingMode is 'interval'
 */
export function formatSprinklingSchedule(plant: Plant): string {
  if (plant.sprinklingMode !== 'interval') return 'Off';
  const days =
    typeof plant.sprinklingIntervalDays === 'number' ? plant.sprinklingIntervalDays : 0;
  return `Every ${days} days`;
}

// ─── CareCardReadOnly ────────────────────────────────────────────────────────

type CareCardReadOnlyProps = {
  iconName: keyof typeof Ionicons.glyphMap;
  iconBgColor: string;
  title: string;
  enabled: boolean;
  scheduleText: string;
  lastPerformedText: string;
};

export function CareCardReadOnly({
  iconName,
  iconBgColor,
  title,
  enabled,
  scheduleText,
  lastPerformedText,
}: CareCardReadOnlyProps) {
  return (
    <View style={[careStyles.card, !enabled && careStyles.cardMuted]}>
      <View style={careStyles.cardHeader}>
        <View style={[careStyles.iconBg, { backgroundColor: iconBgColor }]}>
          <Ionicons name={iconName} size={18} color="#ffffff" />
        </View>
        <Text style={careStyles.title}>{title}</Text>
      </View>
      <View style={careStyles.row}>
        <Text style={careStyles.label}>Schedule</Text>
        <Text style={careStyles.value}>{scheduleText}</Text>
      </View>
      <View style={careStyles.row}>
        <Text style={careStyles.label}>Last performed</Text>
        <Text style={careStyles.value}>{lastPerformedText}</Text>
      </View>
    </View>
  );
}

const careStyles = StyleSheet.create({
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
  cardMuted: {
    opacity: 0.45,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconBg: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1b3b2f',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  label: {
    fontSize: 13,
    color: '#6b7280',
  },
  value: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1b3b2f',
  },
});

// ─── CareAccordion ───────────────────────────────────────────────────────────

type CareAccordionProps = {
  expanded: boolean;
  onToggle: () => void;
  plant: Plant;
};

export function CareAccordion({ expanded, onToggle, plant }: CareAccordionProps) {
  return (
    <View style={accordionStyles.container}>
      <TouchableOpacity
        style={accordionStyles.header}
        onPress={onToggle}
        activeOpacity={0.7}
      >
        <Text style={accordionStyles.headerTitle}>Plant Care</Text>
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={20}
          color="#1b3b2f"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={accordionStyles.body}>
          <CareCardReadOnly
            iconName="water"
            iconBgColor="#0ea5e9"
            title="Watering"
            enabled={plant.wateringMode !== 'disabled'}
            scheduleText={formatWateringSchedule(plant)}
            lastPerformedText={formatLastPerformed(plant.lastWateredAt)}
          />
          <CareCardReadOnly
            iconName="leaf"
            iconBgColor="#22c55e"
            title="Fertilization"
            enabled={plant.fertilizationMode !== 'disabled'}
            scheduleText={formatFertilizationSchedule(plant)}
            lastPerformedText={formatLastPerformed(plant.lastFertilizedAt)}
          />
          <CareCardReadOnly
            iconName="water-outline"
            iconBgColor="#eab308"
            title="Misting / Sprinkling"
            enabled={plant.sprinklingMode !== 'disabled'}
            scheduleText={formatSprinklingSchedule(plant)}
            lastPerformedText={formatLastPerformed(plant.lastSprinkledAt)}
          />
        </View>
      )}
    </View>
  );
}

const accordionStyles = StyleSheet.create({
  container: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b3b2f',
  },
  body: {
    paddingHorizontal: 12,
    paddingBottom: 4,
  },
});

// ─── SectionCard ─────────────────────────────────────────────────────────────

type SectionCardProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function SectionCard({ title, subtitle, children }: SectionCardProps) {
  return (
    <View style={sectionStyles.card}>
      <View style={sectionStyles.header}>
        <Text style={sectionStyles.headerTitle}>{title}</Text>
        {subtitle ? <Text style={sectionStyles.headerSubtitle}>{subtitle}</Text> : null}
      </View>
      {children}
    </View>
  );
}

const sectionStyles = StyleSheet.create({
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1b3b2f',
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#6b7280',
    marginTop: 2,
  },
});

// ─── PlantDetailsScreen ───────────────────────────────────────────────────────

export default function PlantDetailsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ plantId?: string }>();

  const plantId = typeof params.plantId === 'string' ? params.plantId : undefined;

  const [plant, setPlant] = useState<Plant | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [careExpanded, setCareExpanded] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!plantId) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      try {
        const result = await getPlant(plantId);
        if (result) {
          setPlant(result);
        } else {
          setNotFound(true);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [plantId]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/home');
    }
  };

  const handleDelete = () => {
    if (!plantId) return;

    const confirmMessage = 'Are you sure you want to delete this plant? This cannot be undone.';

    Alert.alert(
      'Delete Plant',
      confirmMessage,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              if (plant?.imageUrl) {
                await deleteImage(plant.imageUrl);
              }
              await deletePlant(plantId);
              router.replace('/home');
            } catch (e) {
              Alert.alert(
                'Error',
                e instanceof Error ? e.message : 'Could not delete plant. Please try again.'
              );
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={screenStyles.safeArea}>
        <View style={screenStyles.centered}>
          <ActivityIndicator size="large" color="#22c55e" />
        </View>
      </SafeAreaView>
    );
  }

  if (notFound || !plant) {
    return (
      <SafeAreaView style={screenStyles.safeArea}>
        <View style={screenStyles.centered}>
          <Text style={screenStyles.errorText}>Plant not found.</Text>
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

  return (
    <SafeAreaView style={screenStyles.safeArea}>
      {/* Header */}
      <View style={screenStyles.header}>
        <TouchableOpacity onPress={handleBack} style={screenStyles.headerButton}>
          <Ionicons name="chevron-back" size={24} color="#1b3b2f" />
        </TouchableOpacity>
        <Text style={screenStyles.headerTitle}>Plant Details</Text>
        <View style={screenStyles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={screenStyles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Photo area */}
        <View style={screenStyles.photoContainer}>
          {plant.imageUrl ? (
            <Image
              source={{ uri: plant.imageUrl }}
              style={screenStyles.photo}
              resizeMode="cover"
            />
          ) : (
            <View style={screenStyles.photoPlaceholder}>
              <Ionicons name="leaf-outline" size={64} color="#9ca3af" />
            </View>
          )}
        </View>

        {/* Plant name */}
        <Text style={screenStyles.plantName}>{plant.name}</Text>

        {/* Notes */}
        <SectionCard title="Notes">
          <View style={screenStyles.sectionContent}>
            <Text style={plant.notes ? screenStyles.notesText : screenStyles.notesPlaceholder}>
              {plant.notes || 'No notes'}
            </Text>
          </View>
        </SectionCard>

        {/* Care accordion */}
        <CareAccordion
          expanded={careExpanded}
          onToggle={() => setCareExpanded((prev) => !prev)}
          plant={plant}
        />

        {/* Action buttons */}
        <View style={screenStyles.actionsContainer}>
          <TouchableOpacity
            style={[screenStyles.actionButton, screenStyles.editButton]}
            onPress={() =>
              router.push({ pathname: '/add-plant', params: { plantId } })
            }
          >
            <Ionicons name="pencil-outline" size={18} color="#ffffff" />
            <Text style={screenStyles.actionButtonText}>Edit Plant</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[screenStyles.actionButton, screenStyles.deleteButton]}
            onPress={handleDelete}
            disabled={deleting}
          >
            {deleting ? (
              <ActivityIndicator size="small" color="#b91c1c" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="#b91c1c" />
                <Text style={[screenStyles.actionButtonText, screenStyles.deleteButtonText]}>
                  Delete Plant
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[screenStyles.actionButton, screenStyles.gardenButton]}
            onPress={() => router.replace('/garden')}
          >
            <Ionicons name="grid-outline" size={18} color="#22c55e" />
            <Text style={[screenStyles.actionButtonText, screenStyles.gardenButtonText]}>
              View Garden
            </Text>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'space-between',
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
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1b3b2f',
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  photoContainer: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#e5e7eb',
    marginBottom: 16,
  },
  photo: {
    width: '100%',
    height: '100%',
  },
  photoPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  plantName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1b3b2f',
    marginBottom: 16,
  },
  sectionContent: {
    padding: 16,
  },
  notesText: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  notesPlaceholder: {
    fontSize: 14,
    color: '#9ca3af',
    fontStyle: 'italic',
  },
  actionsContainer: {
    gap: 12,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 12,
  },
  editButton: {
    backgroundColor: '#22c55e',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  deleteButtonText: {
    color: '#b91c1c',
  },
  gardenButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1.5,
    borderColor: '#22c55e',
  },
  actionButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
  gardenButtonText: {
    color: '#22c55e',
  },
});
