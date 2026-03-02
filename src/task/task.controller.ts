import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Query,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { ListTasksDto } from './dto/list-tasks.dto';
import { TaskResponseDto, PaginatedTasksDto } from './dto/task-response.dto';
import { Roles } from '../auth/roles.decorator';
import { Role } from '../user/dto/types.dto';

@ApiTags('tasks')
@ApiBearerAuth()
@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new task' })
  @ApiResponse({ status: 201, type: TaskResponseDto })
  @ApiResponse({ status: 409, description: 'Idempotency key already used' })
  create(@Body() dto: CreateTaskDto, @Request() req: any) {
    return this.taskService.create(dto, req.user);
  }

  @Get()
  @ApiOperation({ summary: 'List tasks (USER sees own, ADMIN sees all)' })
  @ApiResponse({ status: 200, type: PaginatedTasksDto })
  async findAll(@Query() dto: ListTasksDto, @Request() req: any) {
    const { data, total } = await this.taskService.findAll(dto, req.user);
    return { data, total, page: dto.page ?? 1, limit: dto.limit ?? 20 };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Cancel a PENDING task' })
  @ApiResponse({ status: 200, type: TaskResponseDto })
  cancel(@Param('id') id: string, @Request() req: any) {
    return this.taskService.cancel(id, req.user);
  }

  @Post(':id/reprocess')
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Reprocess a FAILED task (ADMIN only)' })
  @ApiResponse({ status: 200, type: TaskResponseDto })
  reprocess(@Param('id') id: string) {
    return this.taskService.reprocess(id);
  }

  @Get('metrics')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get task metrics (ADMIN only)' })
  metrics() {
    return this.taskService.getMetrics();
  }
}
