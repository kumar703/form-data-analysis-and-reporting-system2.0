import { submitResponse, Answer } from './api';

export interface QueueJob {
  id: string;
  productId: string;
  payload: Array<{ questionKey: string; answer: any }>;
  attempts: number;
  nextAttemptAt?: number;
}

const STORAGE_KEY = 'autosave_queue';
const MAX_ATTEMPTS = 5;

function exponentialBackoffMs(attempts: number): number {
  return Math.min(60000, 2 ** attempts * 1000);
}

function log(message: string, ...args: any[]): void {
  console.log(`[OfflineQueue] ${message}`, ...args);
}

function getQueue(): QueueJob[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    log('Error reading queue from storage:', error);
    return [];
  }
}

function saveQueue(queue: QueueJob[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch (error) {
    log('Error saving queue to storage:', error);
  }
}

export function enqueueSave(job: Omit<QueueJob, 'id' | 'attempts'>): void {
  const queue = getQueue();
  const newJob: QueueJob = {
    ...job,
    id: crypto.randomUUID(),
    attempts: 0,
  };
  queue.push(newJob);
  saveQueue(queue);
  log(`Enqueued job ${newJob.id} for product ${job.productId}`);
}

export function getQueueLength(): number {
  return getQueue().length;
}

export async function flushQueue(): Promise<void> {
  if (!navigator.onLine) {
    log('Offline - skipping queue flush');
    return;
  }

  const queue = getQueue();
  if (queue.length === 0) {
    log('Queue is empty');
    return;
  }

  log(`Flushing ${queue.length} jobs`);

  const updatedQueue: QueueJob[] = [];
  const now = Date.now();

  for (const job of queue) {
    // Skip if waiting for retry
    if (job.nextAttemptAt && now < job.nextAttemptAt) {
      log(`Skipping job ${job.id} - waiting until ${new Date(job.nextAttemptAt).toISOString()}`);
      updatedQueue.push(job);
      continue;
    }

    // Stop if max attempts reached
    if (job.attempts >= MAX_ATTEMPTS) {
      log(`Job ${job.id} exceeded max attempts (${MAX_ATTEMPTS}) - marking as failed`);
      updatedQueue.push(job);
      continue;
    }

    try {
      // Convert payload format to Answer[] format
      const answers: Answer[] = job.payload.map((item) => ({
        questionId: item.questionKey,
        value: item.answer,
      }));

      await submitResponse(job.productId, answers);
      log(`Successfully saved job ${job.id} for product ${job.productId}`);
      // Don't add to updatedQueue - job succeeded, remove it
    } catch (error) {
      const newAttempts = job.attempts + 1;
      const backoffMs = exponentialBackoffMs(newAttempts);
      const nextAttemptAt = now + backoffMs;

      const updatedJob: QueueJob = {
        ...job,
        attempts: newAttempts,
        nextAttemptAt,
      };

      if (newAttempts >= MAX_ATTEMPTS) {
        log(`Job ${job.id} failed after ${newAttempts} attempts - marking as failed`, error);
      } else {
        log(
          `Job ${job.id} failed (attempt ${newAttempts}/${MAX_ATTEMPTS}) - retrying in ${backoffMs}ms`,
          error
        );
      }

      updatedQueue.push(updatedJob);
    }
  }

  saveQueue(updatedQueue);
  log(`Queue flush complete. ${updatedQueue.length} jobs remaining`);
}



