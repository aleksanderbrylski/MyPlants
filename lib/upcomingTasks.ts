import type { Plant } from './firestore';

export type UpcomingTask = {
  plantId: string;
  plantName: string;
  taskType: 'watering' | 'fertilization' | 'sprinkling';
  dueDate: string;
  relativeLabel: string;
};

function getStartOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function toDateOnlyISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const out = new Date(date);
  out.setDate(out.getDate() + days);
  return out;
}

export function relativeLabel(dueDate: Date, todayStart: Date): string {
  const dueStart = getStartOfDay(dueDate);
  const diffMs = dueStart.getTime() - todayStart.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  if (diffDays === 0) return 'today';
  if (diffDays < 0) return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? '' : 's'} ago`;
  return `in ${diffDays} day${diffDays === 1 ? '' : 's'}`;
}

function isValidInterval(x: number | '' | undefined): x is number {
  return typeof x === 'number' && x > 0 && Number.isFinite(x);
}

function nextIntervalDate(
  lastAt: Date | undefined,
  intervalDays: number,
  todayStart: Date
): Date {
  if (!lastAt) return todayStart;
  const lastStart = getStartOfDay(lastAt);

  // If last action was today (or in the future), next occurrence is lastStart + 1 interval, not today
  if (
    lastStart.getFullYear() > todayStart.getFullYear() ||
    (lastStart.getFullYear() === todayStart.getFullYear() && lastStart.getMonth() > todayStart.getMonth()) ||
    (lastStart.getFullYear() === todayStart.getFullYear() && lastStart.getMonth() === todayStart.getMonth() && lastStart.getDate() >= todayStart.getDate())
  ) {
    return getStartOfDay(addDays(lastStart, intervalDays));
  }
  const diffMs = todayStart.getTime() - lastStart.getTime();
  const diffDays = diffMs / (24 * 60 * 60 * 1000);
  let n = Math.ceil(diffDays / intervalDays);
  if (n < 1) n = 1;
  return getStartOfDay(addDays(lastStart, n * intervalDays));
}

function wateringTask(plant: Plant, todayStart: Date): UpcomingTask | null {
  if (plant.wateringMode !== 'interval') return null;
  const interval = plant.wateringIntervalDays;
  if (!isValidInterval(interval)) {
    if (__DEV__) console.warn('[upcomingTasks] Skipping watering: invalid wateringIntervalDays', plant.id);
    return null;
  }
  const due = nextIntervalDate(plant.lastWateredAt, interval, todayStart);
  return {
    plantId: plant.id,
    plantName: plant.name,
    taskType: 'watering',
    dueDate: toDateOnlyISO(due),
    relativeLabel: relativeLabel(due, todayStart),
  };
}

function fertilizationTask(plant: Plant, todayStart: Date): UpcomingTask | null {
  const mode = plant.fertilizationMode;
  if (!mode || mode === 'disabled') return null;

  if (mode === 'interval') {
    const interval = plant.fertilizationIntervalDays;
    if (!isValidInterval(interval)) {
      if (__DEV__) console.warn('[upcomingTasks] Skipping fertilization (interval): invalid fertilizationIntervalDays', plant.id);
      return null;
    }
    const due = nextIntervalDate(plant.lastFertilizedAt, interval, todayStart);
    return {
      plantId: plant.id,
      plantName: plant.name,
      taskType: 'fertilization',
      dueDate: toDateOnlyISO(due),
      relativeLabel: relativeLabel(due, todayStart),
    };
  }

  if (mode === 'with_watering') {
    const every = plant.fertilizationEveryWaterings;
    const wateringInterval = plant.wateringIntervalDays;
    if (!isValidInterval(every) || !isValidInterval(wateringInterval)) {
      if (__DEV__) console.warn('[upcomingTasks] Skipping fertilization (with_watering): invalid fertilizationEveryWaterings or wateringIntervalDays', plant.id);
      return null;
    }
    const lastWatered = plant.lastWateredAt;
    if (!lastWatered) {
      return {
        plantId: plant.id,
        plantName: plant.name,
        taskType: 'fertilization',
        dueDate: toDateOnlyISO(todayStart),
        relativeLabel: 'today',
      };
    }
    const lastWateredStart = getStartOfDay(lastWatered);
    const lastFert = plant.lastFertilizedAt;
    let k0: number;
    if (!lastFert) {
      k0 = 1;
    } else {
      const lastFertStart = getStartOfDay(lastFert);
      const diffMs = lastFertStart.getTime() - lastWateredStart.getTime();
      const diffDays = diffMs / (24 * 60 * 60 * 1000);
      k0 = Math.floor(diffDays / wateringInterval) + 1;
    }
    const kNext = k0 + (every - 1);
    const due = getStartOfDay(addDays(lastWateredStart, kNext * wateringInterval));
    return {
      plantId: plant.id,
      plantName: plant.name,
      taskType: 'fertilization',
      dueDate: toDateOnlyISO(due),
      relativeLabel: relativeLabel(due, todayStart),
    };
  }

  return null;
}

function sprinklingTask(plant: Plant, todayStart: Date): UpcomingTask | null {
  if (plant.sprinklingMode !== 'interval') return null;
  const interval = plant.sprinklingIntervalDays;
  if (!isValidInterval(interval)) {
    if (__DEV__) console.warn('[upcomingTasks] Skipping sprinkling: invalid sprinklingIntervalDays', plant.id);
    return null;
  }
  const due = nextIntervalDate(plant.lastSprinkledAt, interval, todayStart);
  return {
    plantId: plant.id,
    plantName: plant.name,
    taskType: 'sprinkling',
    dueDate: toDateOnlyISO(due),
    relativeLabel: relativeLabel(due, todayStart),
  };
}

export function buildUpcomingTasks(plants: Plant[]): UpcomingTask[] {
  const todayStart = getStartOfDay(new Date());
  const tasks: UpcomingTask[] = [];

  for (const plant of plants) {
    const w = wateringTask(plant, todayStart);
    if (w) tasks.push(w);
    const f = fertilizationTask(plant, todayStart);
    if (f) tasks.push(f);
    const s = sprinklingTask(plant, todayStart);
    if (s) tasks.push(s);
  }

  console.log('tasks', tasks);
  tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return tasks;
}

export function getRelativeLabelStyle(relativeLabel: string): { backgroundColor: string; color: string } {
  // Past = red, today = orange, future = green
  if (relativeLabel.endsWith('ago')) return { backgroundColor: '#dc2626', color: '#ffffff' };
  if (relativeLabel === 'today') return { backgroundColor: '#ea580c', color: '#ffffff' };
  return { backgroundColor: '#22c55e', color: '#ffffff' };
}
