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
} from 'firebase/firestore';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';

/** Firestore collection: users/{uid}/plants */
export function plantsCollection(uid: string) {
  return collection(db, 'users', uid, 'plants');
}

export type Plant = {
  id: string;
  name: string;
  watering: string;
  sunlight?: string;
  fertilization?: string;
  imageUrl?: string;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PlantInput = Omit<Plant, 'id' | 'createdAt' | 'updatedAt'> & {
  sunlight?: string;
  fertilization?: string;
  imageUrl?: string;
};

function mapDocToPlant(id: string, data: Record<string, unknown>): Plant {
  const createdAt = data.createdAt instanceof Timestamp ? data.createdAt.toDate() : undefined;
  const updatedAt = data.updatedAt instanceof Timestamp ? data.updatedAt.toDate() : undefined;
  return {
    id,
    name: (data.name as string) ?? '',
    watering: (data.watering as string) ?? '',
    sunlight: data.sunlight as string | undefined,
    fertilization: data.fertilization as string | undefined,
    imageUrl: data.imageUrl as string | undefined,
    createdAt,
    updatedAt,
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

export async function addPlant(uid: string, input: PlantInput): Promise<string> {
  const col = plantsCollection(uid);
  const now = Timestamp.now();
  const docRef = await addDoc(col, {
    ...input,
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
  await updateDoc(docRef, {
    ...updates,
    updatedAt: Timestamp.now(),
  });
}

export async function deletePlant(uid: string, plantId: string): Promise<void> {
  const docRef = doc(db, 'users', uid, 'plants', plantId);
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
