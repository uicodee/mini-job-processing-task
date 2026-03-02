import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEnum,
  IsOptional,
  IsObject,
  IsDateString,
  IsUUID,
} from 'class-validator';
import { TaskPriority } from './types.dto';

export class CreateTaskDto {
  @ApiProperty({ example: 'email', description: 'Task type (e.g. email, report)' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ enum: TaskPriority, default: TaskPriority.NORMAL })
  @IsOptional()
  @IsEnum(TaskPriority)
  priority?: TaskPriority;

  @ApiPropertyOptional({ example: { to: 'user@example.com', subject: 'Hello' } })
  @IsOptional()
  @IsObject()
  payload?: Record<string, any>;

  @ApiProperty({ example: 'unique-key-abc123', description: 'Idempotency key' })
  @IsString()
  idempotencyKey: string;

  @ApiPropertyOptional({ example: '2026-03-05T10:00:00.000Z', description: 'Scheduled execution time' })
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;
}
