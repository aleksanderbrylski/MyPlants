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
