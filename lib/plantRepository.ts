import { Plant, PlantInput } from './types';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Storage keys and schema version
const PLANTS_KEY = '@myplants/plants';
const SCHEMA_VERSION_KEY = '@myplants/schema_version';
const SCHEMA_VERSION = '1';

// Wire format — identical to Plant but with Date fields as strings
type StoredPlant = Omit<Plant,
  'createdAt' | 'updatedAt' | 'lastWateredAt' | 'lastFertilizedAt' | 'lastSprinkledAt'
> & {
  createdAt?: string;
  updatedAt?: string;
  lastWateredAt?: string;
  lastFertilizedAt?: string;
  lastSprinkledAt?: string;
};

// Subscriber registry
const subscribers: Set<(plants: Plant[]) => void> = new Set();

// Convert a Plant (with Date fields) to the AsyncStorage wire format
function toStoredPlant(plant: Plant): StoredPlant {
  const { createdAt, updatedAt, lastWateredAt, lastFertilizedAt, lastSprinkledAt, ...rest } = plant;
  return {
    ...rest,
    createdAt: createdAt !== undefined ? createdAt.toISOString() : undefined,
    updatedAt: updatedAt !== undefined ? updatedAt.toISOString() : undefined,
    lastWateredAt: lastWateredAt !== undefined ? lastWateredAt.toISOString() : undefined,
    lastFertilizedAt: lastFertilizedAt !== undefined ? lastFertilizedAt.toISOString() : undefined,
    lastSprinkledAt: lastSprinkledAt !== undefined ? lastSprinkledAt.toISOString() : undefined,
  };
}

// Convert a StoredPlant (with ISO string fields) back to a Plant with Date objects
function fromStoredPlant(raw: StoredPlant): Plant {
  const { createdAt, updatedAt, lastWateredAt, lastFertilizedAt, lastSprinkledAt, ...rest } = raw;
  return {
    ...rest,
    createdAt: createdAt !== undefined ? new Date(createdAt) : undefined,
    updatedAt: updatedAt !== undefined ? new Date(updatedAt) : undefined,
    lastWateredAt: lastWateredAt !== undefined ? new Date(lastWateredAt) : undefined,
    lastFertilizedAt: lastFertilizedAt !== undefined ? new Date(lastFertilizedAt) : undefined,
    lastSprinkledAt: lastSprinkledAt !== undefined ? new Date(lastSprinkledAt) : undefined,
  };
}

// Read the raw stored plant list from AsyncStorage
async function loadRaw(): Promise<StoredPlant[]> {
  let result: string | null;
  try {
    result = await AsyncStorage.getItem(PLANTS_KEY);
  } catch (e) {
    throw new Error('PlantRepository: failed to read plant data — ' + (e as Error).message);
  }

  if (result === null) {
    return [];
  }

  try {
    return JSON.parse(result) as StoredPlant[];
  } catch {
    console.warn('PlantRepository: corrupt data in storage, resetting to empty list');
    return [];
  }
}

// Write the raw stored plant list to AsyncStorage and notify subscribers
async function saveRaw(plants: StoredPlant[]): Promise<void> {
  try {
    await AsyncStorage.multiSet([
      [PLANTS_KEY, JSON.stringify(plants)],
      [SCHEMA_VERSION_KEY, SCHEMA_VERSION],
    ]);
  } catch (e) {
    throw new Error('PlantRepository: failed to write plant data — ' + (e as Error).message);
  }

  notifySubscribers(plants.map(fromStoredPlant));
}

// Invoke all registered subscriber callbacks with the current plant list
function notifySubscribers(plants: Plant[]): void {
  for (const callback of subscribers) {
    callback(plants);
  }
}

// Read all plants, sorted by createdAt descending (plants without createdAt go last)
export async function getPlants(): Promise<Plant[]> {
  const raw = await loadRaw();
  const plants = raw.map(fromStoredPlant);
  return plants.sort((a, b) => {
    if (a.createdAt === undefined && b.createdAt === undefined) return 0;
    if (a.createdAt === undefined) return 1;
    if (b.createdAt === undefined) return -1;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}

// Read a single plant by ID; returns null if not found
export async function getPlant(plantId: string): Promise<Plant | null> {
  const raw = await loadRaw();
  const found = raw.find((p) => p.id === plantId);
  return found !== undefined ? fromStoredPlant(found) : null;
}

// Add a new plant; assigns a UUID; returns the new ID
export async function addPlant(input: PlantInput): Promise<string> {
  const id: string =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : Date.now().toString(36) + Math.random().toString(36).slice(2);

  const now = new Date().toISOString();
  const inputAsPlant: Plant = { ...input, id };
  const stored = toStoredPlant(inputAsPlant);
  const newPlant: StoredPlant = {
    ...stored,
    id,
    createdAt: now,
    updatedAt: now,
  };

  const existing = await loadRaw();
  await saveRaw([...existing, newPlant]);
  return id;
}

// Replace fields on an existing plant; no-op if plant not found
export async function updatePlant(plantId: string, updates: Partial<PlantInput>): Promise<void> {
  const existing = await loadRaw();
  const index = existing.findIndex((p) => p.id === plantId);
  if (index === -1) return;

  const updatesAsPlant: Plant = { ...updates, id: plantId } as Plant;
  const storedUpdates = toStoredPlant(updatesAsPlant);
  // Remove the id from storedUpdates to avoid overwriting
  const { id: _id, createdAt: _createdAt, ...mergeableUpdates } = storedUpdates;

  const updated: StoredPlant = {
    ...existing[index],
    ...mergeableUpdates,
    updatedAt: new Date().toISOString(),
  };

  const updatedList = [...existing];
  updatedList[index] = updated;
  await saveRaw(updatedList);
}

// Remove a plant record; no-op if plant not found
export async function deletePlant(plantId: string): Promise<void> {
  const existing = await loadRaw();
  const index = existing.findIndex((p) => p.id === plantId);
  if (index === -1) return;

  await saveRaw(existing.filter((p) => p.id !== plantId));
}

// Subscribe to live updates; callback fires immediately and after every write
// Returns an unsubscribe function
export function subscribePlants(callback: (plants: Plant[]) => void): () => void {
  subscribers.add(callback);

  // Fire immediately with current data
  getPlants().then((plants) => callback(plants));

  return () => {
    subscribers.delete(callback);
  };
}
