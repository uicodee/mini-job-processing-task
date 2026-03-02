import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Job } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Task } from '../task/entities/task.entity';
import { TaskStatus } from '../task/dto/types.dto';
import { MockService } from '../mock/mock.service';
import { TASK_QUEUE, DEAD_LETTER_QUEUE, MAX_ATTEMPTS, RATE_LIMITS } from '../queue/queue.constants';

interface TaskJobData {
  taskId: string;
  payload: Record<string, any>;
}

@Processor(TASK_QUEUE, { concurrency: 5 })
export class TaskProcessor extends WorkerHost {
  private readonly logger = new Logger(TaskProcessor.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly mockService: MockService,
    @InjectQueue(DEAD_LETTER_QUEUE)
    private readonly deadLetterQueue: Queue,
  ) {
    super();
  }

  async process(job: Job<TaskJobData>): Promise<void> {
    const { taskId, payload } = job.data;
    this.logger.log(`Processing job: taskId=${taskId} attempt=${job.attemptsMade + 1}/${MAX_ATTEMPTS}`);

    const task = await this.taskRepo.findOne({ where: { id: taskId } });

    if (!task) {
      this.logger.warn(`Task not found in DB, skipping: id=${taskId}`);
      return;
    }

    if (task.status === TaskStatus.COMPLETED || task.status === TaskStatus.CANCELLED) {
      this.logger.log(`Task already in terminal state, skipping: id=${taskId} status=${task.status}`);
      return;
    }

    await this.applyRateLimit(job, task.type);

    task.status = TaskStatus.PROCESSING;
    task.startedAt = new Date();
    await this.taskRepo.save(task);
    this.logger.log(`Task marked PROCESSING: id=${taskId} type=${task.type}`);

    const startTime = Date.now();

    try {
      await this.mockService.processTask(payload);

      const durationMs = Date.now() - startTime;
      task.status = TaskStatus.COMPLETED;
      task.completedAt = new Date();
      await this.taskRepo.save(task);
      this.logger.log(`Task COMPLETED: id=${taskId} duration=${durationMs}ms`);
    } catch (err: any) {
      const durationMs = Date.now() - startTime;
      task.attempts += 1;
      task.lastError = err.message ?? String(err);

      const isPermanentlyFailed = job.attemptsMade >= MAX_ATTEMPTS - 1;

      if (isPermanentlyFailed) {
        task.status = TaskStatus.FAILED;
        await this.taskRepo.save(task);

        await this.deadLetterQueue.add('dead', { taskId, payload, lastError: task.lastError });
        this.logger.error(
          `Task FAILED permanently: id=${taskId} attempts=${task.attempts} duration=${durationMs}ms error="${task.lastError}"`,
        );
      } else {
        task.status = TaskStatus.PENDING;
        await this.taskRepo.save(task);
        this.logger.warn(
          `Task failed, will retry: id=${taskId} attempt=${task.attempts}/${MAX_ATTEMPTS} duration=${durationMs}ms error="${task.lastError}"`,
        );
        throw err;
      }
    }
  }

  private async applyRateLimit(job: Job, taskType: string): Promise<void> {
    const limit = RATE_LIMITS[taskType];
    if (!limit) return;
  }
}
