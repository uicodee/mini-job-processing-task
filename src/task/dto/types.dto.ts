export enum TaskType {
  EMAIL = 'email',
  REPORT = 'report',
}

export enum TaskStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export enum TaskPriority {
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low',
}
