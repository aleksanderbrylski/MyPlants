import {
  collection,
  doc,
  addDoc,
  getDocs,
  getDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
  onSnapshot,
  Unsubscribe,
  Timestamp,
  deleteField,
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';

/** Firestore collection: users/{uid}/plants */
export function plantsCollection(uid: string) {
  return collection(db, 'users', uid, 'plants');
}

export type Plant = {
  id: string;
  name: string;
  watering?: string;
  sunlight?: string;
  fertilization?: string;
  sprinkling?: string;
  fertilizationMode?: 'disabled' | 'interval' | 'with_watering';
  wateringMode?: 'disabled' | 'interval';
  sprinklingMode?: 'disabled' | 'interval';
  imageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
  wateringIntervalDays?: number | '';
  fertilizationIntervalDays?: number | '';
  fertilizationEveryWaterings?: number | '';
  sprinklingIntervalDays?: number | '';
  notes?: string;
  lastWateredAt?: Date;
  lastFertilizedAt?: Date;
  lastSprinkledAt?: Date;
};

export type PlantInput = Omit<Plant, 'id' | 'createdAt' | 'updatedAt'>;

function mapDocToPlant(id: string, data: Record<string, unknown>): Plant {
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined;
  const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : undefined;
  const lastWateredAt =
    data.lastWateredAt instanceof Timestamp ? data.lastWateredAt.toDate() : undefined;
  const lastFertilizedAt =
    data.lastFertilizedAt instanceof Timestamp ? data.lastFertilizedAt.toDate() : undefined;
  const lastSprinkledAt =
    data.lastSprinkledAt instanceof Timestamp ? data.lastSprinkledAt.toDate() : undefined;
  return {
    id,
    name: (data.name as string) ?? '',
    watering: data.watering as string | undefined,
    sunlight: data.sunlight as string | undefined,
    fertilization: data.fertilization as string | undefined,
    sprinkling: data.sprinkling as string | undefined,
    fertilizationMode: data.fertilizationMode as
      | 'disabled'
      | 'interval'
      | 'with_watering'
      | undefined,
    wateringMode: data.wateringMode as ('disabled' | 'interval' | undefined),
    sprinklingMode: data.sprinklingMode as ('disabled' | 'interval' | undefined),
    imageUrl: data.imageUrl as string | undefined,
    createdAt,
    updatedAt,
    wateringIntervalDays:
      typeof data.wateringIntervalDays === 'number'
        ? (data.wateringIntervalDays as number)
        : undefined,
    fertilizationIntervalDays:
      typeof data.fertilizationIntervalDays === 'number'
        ? (data.fertilizationIntervalDays as number)
        : undefined,
    fertilizationEveryWaterings:
      typeof data.fertilizationEveryWaterings === 'number'
        ? (data.fertilizationEveryWaterings as number)
        : undefined,
    sprinklingIntervalDays:
      typeof data.sprinklingIntervalDays === 'number'
        ? (data.sprinklingIntervalDays as number)
        : undefined,
    notes: data.notes as string | undefined,
    lastWateredAt,
    lastFertilizedAt,
    lastSprinkledAt,
  };
}

export async function getPlants(uid: string): Promise<Plant[]> {
  const col = plantsCollection(uid);
  const q = query(col, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map((d) => mapDocToPlant(d.id, d.data()));
}

export function subscribePlants(
  uid: string,
  onUpdate: (plants: Plant[]) => void
): Unsubscribe {
  const col = plantsCollection(uid);
  const q = query(col, orderBy('createdAt', 'desc'));
  return onSnapshot(q, (snapshot) => {
    const plants = snapshot.docs.map((d) => mapDocToPlant(d.id, d.data()));
    onUpdate(plants);
  });
}

export async function getPlant(uid: string, plantId: string): Promise<Plant | null> {
  const docRef = doc(db, 'users', uid, 'plants', plantId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return mapDocToPlant(snap.id, snap.data());
}

function stripUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined)
  ) as Partial<T>;
}

export async function addPlant(uid: string, input: PlantInput): Promise<string> {
  const col = plantsCollection(uid);
  const now = Timestamp.now();
  const docRef = await addDoc(col, {
    ...stripUndefined(input),
    createdAt: now,
    updatedAt: now,
  });
  return docRef.id;
}

export async function updatePlant(
  uid: string,
  plantId: string,
  updates: Partial<PlantInput>
): Promise<void> {
  const docRef = doc(db, 'users', uid, 'plants', plantId);
  // Replace undefined values with deleteField() so Firestore actually removes the field
  const payload: Record<string, unknown> = { updatedAt: Timestamp.now() };
  for (const [key, value] of Object.entries(updates)) {
    payload[key] = value === undefined ? deleteField() : value;
  }
  await updateDoc(docRef, payload);
}

export async function deletePlant(uid: string, plantId: string): Promise<void> {
  const docRef = doc(db, 'users', uid, 'plants', plantId);
  const snap = await getDoc(docRef);

  if (!snap.exists()) {
    return;
  }

  const data = snap.data() as { imageUrl?: unknown };
  const hasImage =
    typeof data.imageUrl === 'string' && (data.imageUrl as string).trim().length > 0;

  if (hasImage) {
    const imageRef = ref(storage, `users/${uid}/plants/${plantId}/image`);
    try {
      await deleteObject(imageRef);
    } catch (error) {
      // Ignore errors when deleting the image so plant removal still succeeds
      // (e.g. if the image was never uploaded or already removed).
      console.log('Failed to delete plant image from storage', error);
    }
  }

  await deleteDoc(docRef);
}

/** Upload plant image to Storage, return download URL. Path: users/{uid}/plants/{plantId}/image */
export async function uploadPlantImage(
  uid: string,
  plantId: string,
  uri: string,
  mimeType: string = 'image/jpeg'
): Promise<string> {
  const response = await fetch(uri);
  const blob = await response.blob();
  const storageRef = ref(storage, `users/${uid}/plants/${plantId}/image`);
  await uploadBytesResumable(storageRef, blob, { contentType: mimeType });
  return getDownloadURL(storageRef);
}
