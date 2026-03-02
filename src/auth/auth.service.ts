import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { Role } from '../user/dto/types.dto';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto): Promise<{ accessToken: string }> {
    this.logger.log(`Register attempt for email: ${dto.email}`);

    const existing = await this.userService.findByEmail(dto.email);
    if (existing) {
      this.logger.warn(`Register failed — email already in use: ${dto.email}`);
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = await this.userService.create({
      email: dto.email,
      passwordHash,
      role: Role.USER,
      isActive: true,
    });

    this.logger.log(`User registered successfully: id=${user.id} email=${user.email}`);

    const accessToken = this.jwtService.sign({ userId: user.id, role: user.role });
    return { accessToken };
  }

  async login(dto: LoginDto): Promise<{ accessToken: string }> {
    this.logger.log(`Login attempt for email: ${dto.email}`);

    const user = await this.userService.findByEmail(dto.email);
    if (!user || !user.isActive) {
      this.logger.warn(`Login failed — user not found or inactive: ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      this.logger.warn(`Login failed — wrong password for: ${dto.email}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    this.logger.log(`User logged in: id=${user.id} email=${user.email}`);

    const accessToken = this.jwtService.sign({ userId: user.id, role: user.role });
    return { accessToken };
  }
}
