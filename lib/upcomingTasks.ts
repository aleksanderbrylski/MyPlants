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
  return getStartOfDay(addDays(lastStart, intervalDays));
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
      if (__DEV__) console.warn('[upcomingTasks] Skipping fertilization (with_watering): invalid params', plant.id);
      return null;
    }
    const lastFert = plant.lastFertilizedAt ? getStartOfDay(plant.lastFertilizedAt) : null;
    const lastWatered = plant.lastWateredAt ? getStartOfDay(plant.lastWateredAt) : null;

    let due: Date;

    if (!lastWatered && !lastFert) {
      // Nothing done yet — fertilization is due today (first action)
      due = todayStart;
    } else if (!lastFert) {
      // Never fertilized — next fert = lastWatered + (N-1) * interval
      due = getStartOfDay(addDays(lastWatered!, (every - 1) * wateringInterval));
    } else if (!lastWatered || lastFert.getTime() >= lastWatered.getTime()) {
      // Fert was most recent — next fert = lastFert + N * interval
      due = getStartOfDay(addDays(lastFert, every * wateringInterval));
    } else {
      // Watering was most recent — count waterings since last fert
      const diffDays = (lastWatered.getTime() - lastFert.getTime()) / (24 * 60 * 60 * 1000);
      const wateringsSinceLastFert = Math.round(diffDays / wateringInterval);

      // Edge case if fertilization was very long time ago and watering recently
      if (wateringsSinceLastFert >= every) {
        due = getStartOfDay(addDays(lastWatered, wateringInterval));
      } else {
        const remaining = every - wateringsSinceLastFert;
        due = getStartOfDay(addDays(lastWatered, remaining * wateringInterval));
      }
    }

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

/**
 * For with_watering mode: returns the next watering due date.
 * Computes next fertilization date first (same logic as fertilizationTask),
 * then next watering = anchor + interval, skipping fert day if they collide.
 */
function withWateringWateringTask(plant: Plant, todayStart: Date): UpcomingTask | null {
  const every = plant.fertilizationEveryWaterings;
  const wateringInterval = plant.wateringIntervalDays;
  if (!isValidInterval(every) || !isValidInterval(wateringInterval)) return null;

  const lastWatered = plant.lastWateredAt ? getStartOfDay(plant.lastWateredAt) : null;
  const lastFert = plant.lastFertilizedAt ? getStartOfDay(plant.lastFertilizedAt) : null;

  // Compute next fertilization date (mirrors fertilizationTask with_watering logic)
  let nextFertDate: Date;
  if (!lastWatered && !lastFert) {
    nextFertDate = todayStart;
  } else if (!lastFert) {
    nextFertDate = getStartOfDay(addDays(lastWatered!, (every - 1) * wateringInterval));
  } else if (!lastWatered || lastFert.getTime() >= lastWatered.getTime()) {
    nextFertDate = getStartOfDay(addDays(lastFert, every * wateringInterval));
  } else {
    const diffDays = (lastWatered.getTime() - lastFert.getTime()) / (24 * 60 * 60 * 1000);
    const wateringsSinceLastFert = Math.round(diffDays / wateringInterval);
    if (wateringsSinceLastFert >= every) {
      nextFertDate = getStartOfDay(addDays(lastWatered, wateringInterval));
    } else {
      const remaining = every - wateringsSinceLastFert;
      nextFertDate = getStartOfDay(addDays(lastWatered, remaining * wateringInterval));
    }
  }

  // Nothing done yet — watering comes after the first fertilization
  if (!lastWatered && !lastFert) {
    const due = getStartOfDay(addDays(nextFertDate, wateringInterval));
    return {
      plantId: plant.id,
      plantName: plant.name,
      taskType: 'watering',
      dueDate: toDateOnlyISO(due),
      relativeLabel: relativeLabel(due, todayStart),
    };
  }

  // Anchor: most recent of lastWatered / lastFert
  const anchor =
    !lastWatered ? lastFert! :
      !lastFert ? lastWatered :
        lastFert.getTime() >= lastWatered.getTime() ? lastFert : lastWatered;

  let due = getStartOfDay(addDays(anchor, wateringInterval));

  // If next watering lands on fertilization day, push it past
  if (due.getTime() === nextFertDate.getTime()) {
    due = getStartOfDay(addDays(nextFertDate, wateringInterval));
  }

  return {
    plantId: plant.id,
    plantName: plant.name,
    taskType: 'watering',
    dueDate: toDateOnlyISO(due),
    relativeLabel: relativeLabel(due, todayStart),
  };
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
    if (plant.fertilizationMode === 'with_watering') {
      const w = withWateringWateringTask(plant, todayStart);
      const f = fertilizationTask(plant, todayStart);
      if (w) tasks.push(w);
      if (f) tasks.push(f);
    } else {
      const w = wateringTask(plant, todayStart);
      if (w) tasks.push(w);
      const f = fertilizationTask(plant, todayStart);
      if (f) tasks.push(f);
    }
    const s = sprinklingTask(plant, todayStart);
    if (s) tasks.push(s);
  }

  tasks.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  return tasks;
}

export function getRelativeLabelStyle(relativeLabel: string): { backgroundColor: string; color: string } {
  // Past = red, today = orange, future = green
  if (relativeLabel.endsWith('ago')) return { backgroundColor: '#dc2626', color: '#ffffff' };
  if (relativeLabel === 'today') return { backgroundColor: '#ea580c', color: '#ffffff' };
  return { backgroundColor: '#22c55e', color: '#ffffff' };
}
