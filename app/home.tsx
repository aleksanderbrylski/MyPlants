import React from 'react';
import { SafeAreaView, View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

type Task = {
  id: string;
  plant: string;
  watering: string;
  sunlight: string;
  fertilization: string;
};

type PlantCard = {
  id: string;
  name: string;
  watering: string;
};

const UPCOMING_TASKS: Task[] = [
  {
    id: '1',
    plant: 'Fiddle Leaf Fig',
    watering: 'In 2 days',
    sunlight: 'Bright, indirect',
    fertilization: 'In 3 weeks',
  },
  {
    id: '2',
    plant: 'Snake Plant',
    watering: 'In 5 days',
    sunlight: 'Low to bright, indirect',
    fertilization: 'In 6 weeks',
  },
  {
    id: '3',
    plant: 'Monstera',
    watering: 'In 3 days',
    sunlight: 'Bright, indirect',
    fertilization: 'In 4 weeks',
  },
];

const PLANTS: PlantCard[] = [
  {
    id: '1',
    name: 'Fiddle Leaf Fig',
    watering: 'Water in 2 days',
  },
  {
    id: '2',
    name: 'Snake Plant',
    watering: 'Water in 5 days',
  },
  {
    id: '3',
    name: 'Monstera',
    watering: 'Water in 3 days',
  },
  {
    id: '4',
    name: 'Pothos',
    watering: 'Water in 4 days',
  },
];

export default function HomeScreen() {
  const router = useRouter();
  const { signOut } = useAuth();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Top header */}
        <View style={styles.topBar}>
          <View style={styles.brandContainer}>
            <View style={styles.brandIcon}>
              <Ionicons name="leaf" size={18} color="#22c55e" />
            </View>
            <Text style={styles.brandText}>Plant Care</Text>
          </View>
          <View style={styles.topBarRight}>
            <TouchableOpacity
              style={styles.profileBubble}
              onPress={() => router.push('/garden')}
            >
              <Ionicons name="flower-outline" size={20} color="#1b3b2f" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
              <Text style={styles.signOutText}>Sign out</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Page title */}
        <Text style={styles.pageTitle}>My Plants</Text>

        {/* Upcoming tasks card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <View style={styles.cardHeaderLeft}>
              <View style={styles.iconBadge}>
                <Ionicons name="calendar-outline" size={18} color="#22c55e" />
              </View>
              <Text style={styles.cardTitle}>Upcoming Tasks</Text>
            </View>
          </View>

          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, { flex: 2 }]}>Plant</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.3 }]}>Watering</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.6 }]}>Sunlight</Text>
            <Text style={[styles.tableHeaderText, { flex: 1.2 }]}>Fertilization</Text>
          </View>

          {UPCOMING_TASKS.map((task, index) => (
            <View
              key={task.id}
              style={[
                styles.tableRow,
                index < UPCOMING_TASKS.length - 1 && styles.tableRowBorder,
              ]}
            >
              <Text style={[styles.tableCellText, { flex: 2 }]}>{task.plant}</Text>
              <Text style={[styles.tableCellText, { flex: 1.3 }]}>{task.watering}</Text>
              <Text style={[styles.tableCellText, { flex: 1.6 }]} numberOfLines={1}>
                {task.sunlight}
              </Text>
              <Text style={[styles.tableCellText, { flex: 1.2 }]}>{task.fertilization}</Text>
            </View>
          ))}
        </View>

        {/* All plants header */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleWrapper}>
            <Ionicons name="leaf-outline" size={18} color="#16a34a" />
            <Text style={styles.sectionTitle}>All Plants</Text>
          </View>
          <TouchableOpacity
            style={styles.addPlantButton}
            onPress={() => router.push('/garden')}
          >
            <Ionicons name="add" size={16} color="#ffffff" />
            <Text style={styles.addPlantButtonText}>View garden</Text>
          </TouchableOpacity>
        </View>

        {/* Horizontal list of plants */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.plantRow}
        >
          {PLANTS.map((plant) => (
            <View key={plant.id} style={styles.plantCard}>
              <View style={styles.plantImageWrapper} />
              <View style={styles.plantInfo}>
                <Text style={styles.plantName}>{plant.name}</Text>
                <View style={styles.plantMetaRow}>
                  <Ionicons name="water-outline" size={14} color="#0ea5e9" />
                  <Text style={styles.plantMetaText}>{plant.watering}</Text>
                </View>
              </View>
            </View>
          ))}
        </ScrollView>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7f4',
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
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  signOutButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
  },
  signOutText: {
    fontSize: 13,
    color: '#6b7280',
    fontWeight: '500',
  },
  profileBubble: {
    width: 36,
    height: 36,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#d1d5db',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1b3b2f',
    marginBottom: 16,
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
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconBadge: {
    width: 28,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  tableHeader: {
    flexDirection: 'row',
    paddingVertical: 8,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#e5e7eb',
    marginTop: 4,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
  },
  tableRowBorder: {
    borderBottomWidth: 1,
    borderColor: '#f3f4f6',
  },
  tableCellText: {
    fontSize: 14,
    color: '#111827',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1b3b2f',
  },
  addPlantButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#22c55e',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  addPlantButtonText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '600',
  },
  plantRow: {
    paddingVertical: 4,
  },
  plantCard: {
    width: 180,
    marginRight: 14,
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
    height: 130,
    backgroundColor: '#e5e7eb',
  },
  plantImage: {
    width: '100%',
    height: '100%',
  },
  plantInfo: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#ffffff',
  },
  plantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  plantMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  plantMetaText: {
    fontSize: 13,
    color: '#6b7280',
  },
});

