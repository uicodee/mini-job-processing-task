import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskProcessor } from './task.processor';
import { Task } from '../task/entities/task.entity';
import { MockModule } from '../mock/mock.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [TypeOrmModule.forFeature([Task]), MockModule, QueueModule],
  providers: [TaskProcessor],
})
export class WorkerModule {}
