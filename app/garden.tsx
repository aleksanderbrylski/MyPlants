import React, { useEffect, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { subscribePlants, type Plant } from '@/lib/firestore';

export default function GardenScreen() {
  const router = useRouter();
  const { user } = useAuth();
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

  const renderItem = ({ item }: { item: Plant }) => (
    <View style={styles.card}>
      <View style={styles.imageWrapper}>
        {item.imageUrl ? (
          <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="cover" />
        ) : (
          <View style={styles.placeholderImage}>
            <Ionicons name="leaf-outline" size={40} color="#9ca3af" />
          </View>
        )}
      </View>
      <View style={styles.cardContent}>
        <Text style={styles.plantName} numberOfLines={1}>{item.name}</Text>
        <View style={styles.wateringRow}>
          <Ionicons name="water-outline" size={16} color="#0ea5e9" />
          <Text style={styles.wateringText} numberOfLines={1}>{item.watering}</Text>
        </View>
        {item.fertilization ? (
          <View style={styles.fertilizerRow}>
            <Ionicons name="nutrition-outline" size={14} color="#a16207" />
            <Text style={styles.fertilizerText} numberOfLines={1}>{item.fertilization}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1b3b2f" />
          </TouchableOpacity>
          <View style={styles.headerText}>
            <Text style={styles.title}>My Garden</Text>
            <Text style={styles.subtitle}>All your plants in one place</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#22c55e" />
            <Text style={styles.loadingText}>Loading plants…</Text>
          </View>
        ) : plants.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIcon}>
              <Ionicons name="leaf-outline" size={48} color="#9ca3af" />
            </View>
            <Text style={styles.emptyTitle}>No plants yet</Text>
            <Text style={styles.emptySubtitle}>Tap + to add your first plant</Text>
          </View>
        ) : (
          <FlatList
            data={plants}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            numColumns={2}
            columnWrapperStyle={styles.row}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        <TouchableOpacity
          style={styles.fab}
          onPress={() => router.push('/add-plant')}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={26} color="#ffffff" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const CARD_GAP = 14;

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f4f7f4',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: '#1b3b2f',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    color: '#6b7280',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 96,
  },
  emptyIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#e5e7eb',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#6b7280',
  },
  listContent: {
    paddingBottom: 96,
  },
  row: {
    justifyContent: 'space-between',
    marginBottom: CARD_GAP,
  },
  card: {
    flex: 1,
    marginHorizontal: CARD_GAP / 2,
    backgroundColor: '#ffffff',
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  imageWrapper: {
    height: 130,
    backgroundColor: '#e5e7eb',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  placeholderImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e5e7eb',
  },
  cardContent: {
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  plantName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 6,
  },
  wateringRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  wateringText: {
    fontSize: 13,
    color: '#6b7280',
    flex: 1,
  },
  fertilizerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  fertilizerText: {
    fontSize: 12,
    color: '#6b7280',
    flex: 1,
  },
  fab: {
    position: 'absolute',
    right: 24,
    bottom: 32,
    width: 56,
    height: 56,
    borderRadius: 999,
    backgroundColor: '#22c55e',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 6,
  },
});
