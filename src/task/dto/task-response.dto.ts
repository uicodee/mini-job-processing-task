import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority, TaskStatus } from './types.dto';

export class TaskResponseDto {
  @ApiProperty() id: string;
  @ApiProperty() type: string;
  @ApiProperty({ enum: TaskPriority }) priority: TaskPriority;
  @ApiProperty() payload: Record<string, any>;
  @ApiProperty({ enum: TaskStatus }) status: TaskStatus;
  @ApiProperty() idempotencyKey: string;
  @ApiProperty() attempts: number;
  @ApiPropertyOptional() lastError: string | null;
  @ApiPropertyOptional() scheduledAt: Date | null;
  @ApiPropertyOptional() startedAt: Date | null;
  @ApiPropertyOptional() completedAt: Date | null;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
  @ApiProperty() userId: string;
}

export class PaginatedTasksDto {
  @ApiProperty({ type: [TaskResponseDto] }) data: TaskResponseDto[];
  @ApiProperty() total: number;
  @ApiProperty() page: number;
  @ApiProperty() limit: number;
}
