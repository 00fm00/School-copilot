import { Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import * as bcrypt from 'bcryptjs';
import * as crypto from 'crypto';
import { Role, UserDto } from '@school-copilot/shared';
import { User, UserDocument } from '../schemas/user.schema';
import { RefreshToken, RefreshTokenDocument } from '../schemas/refresh-token.schema';
import { Student, StudentDocument } from '../schemas/student.schema';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(RefreshToken.name) private refreshTokenModel: Model<RefreshTokenDocument>,
    @InjectModel(Student.name) private studentModel: Model<StudentDocument>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async deriveClassIds(user: UserDocument): Promise<string[]> {
    if (user.role === Role.TEACHER) {
      return (user.classIds || []).map((id) => id.toString());
    }
    if (user.role === Role.PARENT) {
      const students = await this.studentModel.find({ parentUserId: user._id }).exec();
      const uniqueClassIds = Array.from(new Set(students.map((s) => s.classId.toString())));
      return uniqueClassIds;
    }
    return [];
  }

  private mapUserToDto(user: UserDocument, classIds: string[]): UserDto {
    return {
      id: user._id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      classIds,
      isActive: user.isActive,
    };
  }

  async login(
    email: string,
    password: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: UserDto }> {
    const user = await this.userModel.findOne({ email: email.toLowerCase() }).exec();
    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isMatch = await this.verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const classIds = await this.deriveClassIds(user);
    const accessToken = this.jwtService.sign(
      {
        sub: user._id.toString(),
        role: user.role,
        classIds,
      },
      {
        expiresIn: this.configService.get<string>('JWT_ACCESS_TTL', '15m'),
      },
    );

    const rawRefreshToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = this.hashToken(rawRefreshToken);
    const ttlDays = this.configService.get<number>('JWT_REFRESH_TTL_DAYS', 7);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    await this.refreshTokenModel.create({
      userId: user._id,
      tokenHash,
      expiresAt,
    });

    return {
      accessToken,
      refreshToken: rawRefreshToken,
      user: this.mapUserToDto(user, classIds),
    };
  }

  async refresh(
    rawRefreshToken: string,
  ): Promise<{ accessToken: string; refreshToken: string; user: UserDto }> {
    if (!rawRefreshToken) {
      throw new UnauthorizedException('Refresh token is required');
    }

    const tokenHash = this.hashToken(rawRefreshToken);
    const existingToken = await this.refreshTokenModel.findOne({ tokenHash }).exec();

    if (!existingToken) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Reuse detection
    if (existingToken.revokedAt || existingToken.replacedBy) {
      this.logger.warn(
        `Refresh token reuse detected for userId: ${existingToken.userId}. Revoking family.`,
      );
      await this.refreshTokenModel.updateMany(
        { userId: existingToken.userId, revokedAt: null },
        { revokedAt: new Date() },
      );
      throw new UnauthorizedException('Invalid or reused refresh token');
    }

    if (existingToken.expiresAt < new Date()) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    const user = await this.userModel.findById(existingToken.userId).exec();
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User account is invalid or inactive');
    }

    // Rotate refresh token
    const newRawRefreshToken = crypto.randomBytes(32).toString('hex');
    const newTokenHash = this.hashToken(newRawRefreshToken);
    const ttlDays = this.configService.get<number>('JWT_REFRESH_TTL_DAYS', 7);
    const expiresAt = new Date(Date.now() + ttlDays * 24 * 60 * 60 * 1000);

    existingToken.revokedAt = new Date();
    existingToken.replacedBy = newTokenHash;
    await existingToken.save();

    await this.refreshTokenModel.create({
      userId: user._id,
      tokenHash: newTokenHash,
      expiresAt,
    });

    const classIds = await this.deriveClassIds(user);
    const accessToken = this.jwtService.sign(
      {
        sub: user._id.toString(),
        role: user.role,
        classIds,
      },
      {
        expiresIn: this.configService.get<string>('JWT_ACCESS_TTL', '15m'),
      },
    );

    return {
      accessToken,
      refreshToken: newRawRefreshToken,
      user: this.mapUserToDto(user, classIds),
    };
  }

  async logout(rawRefreshToken?: string): Promise<void> {
    if (!rawRefreshToken) return;
    const tokenHash = this.hashToken(rawRefreshToken);
    await this.refreshTokenModel.updateOne(
      { tokenHash, revokedAt: null },
      { revokedAt: new Date() },
    );
  }

  async getMe(userId: string): Promise<UserDto> {
    const user = await this.userModel.findById(userId).exec();
    if (!user || !user.isActive) {
      throw new UnauthorizedException('User not found');
    }
    const classIds = await this.deriveClassIds(user);
    return this.mapUserToDto(user, classIds);
  }
}
