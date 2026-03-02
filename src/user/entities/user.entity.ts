import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '@/user/dto/types.dto';
import { Task } from '@/task/entities/task.entity';
import { ApiProperty } from '@nestjs/swagger';

@Entity()
export class User {
  @ApiProperty()
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ApiProperty()
  @CreateDateColumn()
  createdAt: Date;

  @ApiProperty()
  @UpdateDateColumn()
  updatedAt: Date;

  @ApiProperty()
  @Column({ unique: true })
  email: string;

  @Column({ select: false })
  passwordHash: string;

  @ApiProperty({ enum: Role })
  @Column({ type: 'enum', enum: Role, default: Role.USER })
  role: Role;

  @ApiProperty()
  @Column({ default: true })
  isActive: boolean;

  @OneToMany(() => Task, (task) => task.user)
  tasks: Task[];
}
