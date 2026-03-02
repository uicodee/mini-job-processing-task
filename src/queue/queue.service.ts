import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue, JobsOptions } from 'bullmq';
import { TASK_QUEUE } from './queue.constants';
import { TaskPriority } from '../task/dto/types.dto';

const PRIORITY_MAP: Record<TaskPriority, number> = {
  [TaskPriority.HIGH]: 1,
  [TaskPriority.NORMAL]: 2,
  [TaskPriority.LOW]: 3,
};

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(@InjectQueue(TASK_QUEUE) private readonly taskQueue: Queue) {}

  async addTask(
    taskId: string,
    payload: Record<string, any>,
    priority: TaskPriority,
    delayMs?: number,
  ): Promise<void> {
    const opts: JobsOptions = {
      jobId: taskId,
      priority: PRIORITY_MAP[priority],
      delay: delayMs ?? 0,
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: false,
      removeOnFail: false,
    };

    this.logger.log(
      `Enqueuing task: id=${taskId} priority=${priority}(${opts.priority}) delay=${delayMs ?? 0}ms`,
    );
    await this.taskQueue.add('process', { taskId, payload }, opts);
    this.logger.log(`Task enqueued: id=${taskId}`);
  }

  async removeTask(taskId: string): Promise<void> {
    this.logger.log(`Removing task from queue: id=${taskId}`);
    const job = await this.taskQueue.getJob(taskId);
    if (job) {
      await job.remove();
      this.logger.log(`Task removed from queue: id=${taskId}`);
    } else {
      this.logger.warn(`Task not found in queue (may already be processing): id=${taskId}`);
    }
  }
}
