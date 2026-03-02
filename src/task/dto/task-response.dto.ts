import { ApiProperty } from '@nestjs/swagger';
import { Task } from '../entities/task.entity';

export class PaginatedTasksDto {
  @ApiProperty({ type: Task, isArray: true })
  data: Task[];

  @ApiProperty()
  total: number;

  @ApiProperty()
  page: number;

  @ApiProperty()
  limit: number;
}
