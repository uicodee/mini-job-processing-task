import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsObject,
  IsDateString,
  IsString,
} from 'class-validator';
import { TaskPriority, TaskType } from './types.dto';

export class CreateTaskDto {
  @ApiProperty({
    enum: TaskType,
    example: TaskType.EMAIL,
    description: 'Task type',
  })
  @IsEnum(TaskType)
  type: TaskType;

  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.NORMAL })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({
    example: { to: 'user@example.com', subject: 'Hello' },
  })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;

  @ApiProperty({ example: 'unique-key-abc123', description: 'Idempotency key' })
  @IsString()
  idempotencyKey: string;

  @ApiPropertyOptional({
    example: '2026-03-05T10:00:00+05:00',
    description: 'Scheduled execution time (ISO 8601 with timezone offset, e.g. +05:00 for Tashkent)',
  })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
