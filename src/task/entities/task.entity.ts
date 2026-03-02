import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '@/user/entities/user.entity';
import { TaskPriority, TaskStatus, TaskType } from '../dto/types.dto';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class Task {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty({ type: () => User })
  @ManyToOne(() => User, (user) => user.tasks, { onDelete: 'CASCADE' })
  @Index()
  user: User;

  @ApiProperty({ enum: TaskType })
  @Column({ type: 'enum', enum: TaskType })
  @Index()
  type: TaskType;

  @ApiProperty({ enum: TaskPriority })
  @Column({ type: 'enum', enum: TaskPriority, default: TaskPriority.NORMAL })
  priority: TaskPriority;

  @Column({ type: 'jsonb', default: {} })
  payload: Record<string, any>;

  @ApiProperty({ enum: TaskStatus })
  @Column({ type: 'enum', enum: TaskStatus, default: TaskStatus.PENDING })
  @Index()
  status: TaskStatus;

  @ApiProperty()
  @Column({ unique: true })
  @Index({ unique: true })
  idempotencyKey: string;

  @ApiProperty()
  @Column({ default: 0 })
  attempts: number;

  @ApiProperty({ type: 'string', nullable: true })
  @Column({ type: 'text', nullable: true })
  lastError: string | null;

  @ApiProperty({ type: 'string', nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  @Index()
  scheduledAt: Date | null;

  @ApiProperty({ type: 'string', nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  startedAt: Date | null;

  @ApiProperty({ type: 'string', nullable: true })
  @Column({ type: 'timestamptz', nullable: true })
  completedAt: Date | null;
}
