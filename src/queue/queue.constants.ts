export const TASK_QUEUE = 'task-queue';
export const DEAD_LETTER_QUEUE = 'task-dead-letter';

export const RATE_LIMITS: Record<string, { max: number; duration: number }> = {
  email: { max: 5, duration: 60_000 },
  report: { max: 2, duration: 60_000 },
};

export const MAX_ATTEMPTS = 3;
