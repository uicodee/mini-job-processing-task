import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindManyOptions, Between, MoreThanOrEqual, LessThanOrEqual } from 'typeorm';
import { Task } from './entities/task.entity';
import { User } from '../user/entities/user.entity';
import { Role } from '../user/dto/types.dto';
import { TaskStatus, TaskPriority } from './dto/types.dto';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksDto } from './dto/list-tasks.dto';
import { QueueService } from '../queue/queue.service';

@Injectable()
export class TaskService {
  private readonly logger = new Logger(TaskService.name);

  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    private readonly queueService: QueueService,
  ) {}

  async create(dto: CreateTaskDto, user: User): Promise<Task> {
    this.logger.log(
      `Create task: type=${dto.type} priority=${dto.priority ?? TaskPriority.NORMAL} userId=${user.id} idempotencyKey=${dto.idempotencyKey}`,
    );

    const existing = await this.taskRepo.findOne({
      where: { idempotencyKey: dto.idempotencyKey },
    });
    if (existing) {
      this.logger.warn(`Duplicate idempotencyKey="${dto.idempotencyKey}" — task already exists: id=${existing.id}`);
      throw new ConflictException('Task with this idempotency key already exists');
    }

    const scheduledAt = dto.scheduledAt ? new Date(dto.scheduledAt) : null;
    const delayMs = scheduledAt ? Math.max(0, scheduledAt.getTime() - Date.now()) : 0;

    const task = this.taskRepo.create({
      type: dto.type,
      priority: dto.priority ?? TaskPriority.NORMAL,
      payload: dto.payload ?? {},
      idempotencyKey: dto.idempotencyKey,
      scheduledAt,
      status: TaskStatus.PENDING,
      user,
    });

    const saved = await this.taskRepo.save(task);
    this.logger.log(`Task saved to DB: id=${saved.id} scheduledAt=${scheduledAt ?? 'immediate'}`);

    await this.queueService.addTask(saved.id, saved.payload, saved.priority, delayMs);
    return saved;
  }

  async findAll(dto: ListTasksDto, user: User): Promise<{ data: Task[]; total: number }> {
    this.logger.log(
      `List tasks: userId=${user.id} role=${user.role} filters=${JSON.stringify({ status: dto.status, type: dto.type, from: dto.from, to: dto.to })} page=${dto.page} limit=${dto.limit}`,
    );

    const where: FindManyOptions<Task>['where'] = {};

    if (user.role !== Role.ADMIN) {
      (where as any).user = { id: user.id };
    }
    if (dto.status) (where as any).status = dto.status;
    if (dto.type) (where as any).type = dto.type;
    if (dto.from && dto.to) {
      (where as any).createdAt = Between(new Date(dto.from), new Date(dto.to));
    } else if (dto.from) {
      (where as any).createdAt = MoreThanOrEqual(new Date(dto.from));
    } else if (dto.to) {
      (where as any).createdAt = LessThanOrEqual(new Date(dto.to));
    }

    const page = dto.page ?? 1;
    const limit = dto.limit ?? 20;

    const [data, total] = await this.taskRepo.findAndCount({
      where,
      relations: ['user'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    this.logger.log(`Found ${total} tasks (returned ${data.length})`);
    return { data, total };
  }

  async cancel(taskId: string, user: User): Promise<Task> {
    this.logger.log(`Cancel task: id=${taskId} requestedBy=${user.id} role=${user.role}`);

    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['user'],
    });
    if (!task) {
      this.logger.warn(`Cancel failed — task not found: id=${taskId}`);
      throw new NotFoundException('Task not found');
    }

    if (user.role !== Role.ADMIN && task.user.id !== user.id) {
      this.logger.warn(`Cancel denied — task ${taskId} belongs to user ${task.user.id}, requested by ${user.id}`);
      throw new ForbiddenException('Access denied');
    }
    if (task.status !== TaskStatus.PENDING) {
      this.logger.warn(`Cancel failed — task ${taskId} is in status ${task.status}, not PENDING`);
      throw new BadRequestException('Only PENDING tasks can be cancelled');
    }

    await this.queueService.removeTask(taskId);
    task.status = TaskStatus.CANCELLED;
    const saved = await this.taskRepo.save(task);
    this.logger.log(`Task cancelled: id=${taskId}`);
    return saved;
  }

  async reprocess(taskId: string): Promise<Task> {
    this.logger.log(`Reprocess task: id=${taskId}`);

    const task = await this.taskRepo.findOne({
      where: { id: taskId },
      relations: ['user'],
    });
    if (!task) {
      this.logger.warn(`Reprocess failed — task not found: id=${taskId}`);
      throw new NotFoundException('Task not found');
    }
    if (task.status !== TaskStatus.FAILED) {
      this.logger.warn(`Reprocess failed — task ${taskId} is in status ${task.status}, not FAILED`);
      throw new BadRequestException('Only FAILED tasks can be reprocessed');
    }

    task.status = TaskStatus.PENDING;
    task.attempts = 0;
    task.lastError = null;
    const saved = await this.taskRepo.save(task);
    this.logger.log(`Task reset to PENDING: id=${taskId}`);

    await this.queueService.addTask(saved.id, saved.payload, saved.priority);
    return saved;
  }

  async getMetrics() {
    this.logger.log('Fetching task metrics');

    const statusCounts = await this.taskRepo
      .createQueryBuilder('task')
      .select('task.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('task.status')
      .getRawMany<{ status: string; count: string }>();

    const total = statusCounts.reduce((sum, r) => sum + parseInt(r.count), 0);

    const avgResult = await this.taskRepo
      .createQueryBuilder('task')
      .select(
        'AVG(EXTRACT(EPOCH FROM (task."completedAt" - task."startedAt")) * 1000)',
        'avgMs',
      )
      .where('task."completedAt" IS NOT NULL AND task."startedAt" IS NOT NULL')
      .getRawOne<{ avgMs: string | null }>();

    const avgProcessingMs = avgResult?.avgMs ? Math.round(parseFloat(avgResult.avgMs)) : null;

    const byStatus: Record<string, number> = {};
    for (const row of statusCounts) {
      byStatus[row.status] = parseInt(row.count);
    }

    this.logger.log(`Metrics: total=${total} avgProcessingMs=${avgProcessingMs ?? 'n/a'} byStatus=${JSON.stringify(byStatus)}`);
    return { total, byStatus, avgProcessingMs };
  }
}
