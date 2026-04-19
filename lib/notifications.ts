import Constants, { ExecutionEnvironment } from 'expo-constants';
import { getPlants } from './plantRepository';
import { buildUpcomingTasks } from './upcomingTasks';

const BACKGROUND_TASK_NAME = 'DAILY_PLANT_TASK_CHECK';

// expo-notifications is not supported in Expo Go since SDK 53 — skip everything there
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

export async function requestNotificationPermission(): Promise<boolean> {
  if (isExpoGo) return false;
  try {
    const N = await import('expo-notifications');
    const { status: existing } = await N.getPermissionsAsync();
    if (existing === 'granted') return true;
    const { status } = await N.requestPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

export async function setupNotificationHandler(): Promise<void> {
  if (isExpoGo) return;
  try {
    const N = await import('expo-notifications');
    N.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  } catch {}
}

/** Schedule a repeating notification at 1:30 AM every day */
export async function scheduleDailyCheck(): Promise<void> {
  if (isExpoGo) return;
  try {
    const N = await import('expo-notifications');
    await N.cancelAllScheduledNotificationsAsync();
    await N.scheduleNotificationAsync({
      content: {
        title: '🌿 Plant care reminder',
        body: 'You have plant tasks due today or overdue. Open the app to check.',
        data: { type: 'daily_check' },
      },
      trigger: {
        type: N.SchedulableTriggerInputTypes.DAILY,
        hour: 12,
        minute: 0,
      },
    });
  } catch (e) {
    console.warn('[notifications] scheduleDailyCheck failed:', e);
  }
}

/** Fire an immediate notification summarising today's and overdue tasks */
export async function sendTaskNotification(todayCount: number, overdueCount: number): Promise<void> {
  if (isExpoGo) return;
  const parts: string[] = [];
  if (overdueCount > 0) parts.push(`${overdueCount} overdue`);
  if (todayCount > 0) parts.push(`${todayCount} due today`);

  const body = parts.length > 0
    ? `You have ${parts.join(' and ')} task${todayCount + overdueCount === 1 ? '' : 's'}.`
    : 'All your plants are on track for today.';

  const N = await import('expo-notifications');
  await N.scheduleNotificationAsync({
    content: {
      title: '🌿 Plant care reminder',
      body,
      data: { type: 'daily_check' },
    },
    trigger: null,
  });
}

/** Fetch plants and fire a notification if any tasks are due/overdue */
export async function checkAndNotify(): Promise<void> {
  const plants = await getPlants();
  if (plants.length === 0) return;
  const tasks = buildUpcomingTasks(plants);
  const todayCount = tasks.filter((t) => t.relativeLabel === 'today').length;
  const overdueCount = tasks.filter((t) => t.relativeLabel.endsWith('ago')).length;
  if (todayCount === 0 && overdueCount === 0) return;
  await sendTaskNotification(todayCount, overdueCount);
}

/** Register a background fetch task that calls checkAndNotify once per day */
export async function registerBackgroundTask(): Promise<void> {
  if (isExpoGo) return;
  try {
    const [TM, BF] = await Promise.all([
      import('expo-task-manager'),
      import('expo-background-fetch'),
    ]);

    TM.defineTask(BACKGROUND_TASK_NAME, async () => {
      try {
        await checkAndNotify();
        return BF.BackgroundFetchResult.NewData;
      } catch {
        return BF.BackgroundFetchResult.Failed;
      }
    });

    const isRegistered = await TM.isTaskRegisteredAsync(BACKGROUND_TASK_NAME);
    if (isRegistered) return;
    await BF.registerTaskAsync(BACKGROUND_TASK_NAME, {
      minimumInterval: 60 * 60 * 24,
      stopOnTerminate: false,
      startOnBoot: true,
    });
  } catch (e) {
    console.warn('[notifications] registerBackgroundTask failed:', e);
  }
}
