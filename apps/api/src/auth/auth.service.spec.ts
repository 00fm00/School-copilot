import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Role } from '@school-copilot/shared';
import { AuthService } from './auth.service';
import { User } from '../schemas/user.schema';
import { RefreshToken } from '../schemas/refresh-token.schema';
import { Student } from '../schemas/student.schema';

describe('AuthService', () => {
  let service: AuthService;
  let jwtService: JwtService;

  const mockUserId = new Types.ObjectId();
  const mockClassId = new Types.ObjectId();

  const mockUser = {
    _id: mockUserId,
    email: 'admin@school.local',
    name: 'Admin User',
    passwordHash: '',
    role: Role.ADMIN,
    classIds: [],
    isActive: true,
  };

  const mockUserModel = {
    findOne: jest.fn(),
    findById: jest.fn(),
  };

  const mockRefreshTokenModel = {
    findOne: jest.fn(),
    create: jest.fn(),
    updateMany: jest.fn(),
    updateOne: jest.fn(),
  };

  const mockStudentModel = {
    find: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue([]),
    }),
  };

  beforeEach(async () => {
    const passwordHash = await require('bcryptjs').hash('Password123!', 10);
    mockUser.passwordHash = passwordHash;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-jwt-token'),
          },
        },
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              if (key === 'JWT_ACCESS_TTL') return '15m';
              if (key === 'JWT_REFRESH_TTL_DAYS') return 7;
              return defaultValue;
            }),
          },
        },
        {
          provide: getModelToken(User.name),
          useValue: mockUserModel,
        },
        {
          provide: getModelToken(RefreshToken.name),
          useValue: mockRefreshTokenModel,
        },
        {
          provide: getModelToken(Student.name),
          useValue: mockStudentModel,
        },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    jwtService = module.get<JwtService>(JwtService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('login', () => {
    it('should authenticate valid credentials and return tokens', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });
      mockRefreshTokenModel.create.mockResolvedValue({});

      const result = await service.login('admin@school.local', 'Password123!');
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBeDefined();
      expect(result.user.email).toBe('admin@school.local');
    });

    it('should throw UnauthorizedException on wrong password', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });

      await expect(service.login('admin@school.local', 'WrongPassword')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should throw UnauthorizedException on non-existent user', async () => {
      mockUserModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(service.login('nobody@school.local', 'Password123!')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('refresh token rotation and reuse detection', () => {
    it('should rotate valid refresh token', async () => {
      const existingTokenDoc = {
        userId: mockUserId,
        tokenHash: 'somehash',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: null,
        replacedBy: null,
        save: jest.fn().mockResolvedValue(true),
      };

      mockRefreshTokenModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(existingTokenDoc),
      });
      mockUserModel.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockUser),
      });
      mockRefreshTokenModel.create.mockResolvedValue({});

      const result = await service.refresh('raw-token');
      expect(result.accessToken).toBe('mock-jwt-token');
      expect(result.refreshToken).toBeDefined();
      expect(existingTokenDoc.revokedAt).toBeInstanceOf(Date);
      expect(existingTokenDoc.replacedBy).toBeDefined();
    });

    it('should detect reuse and revoke entire token family', async () => {
      const revokedTokenDoc = {
        userId: mockUserId,
        tokenHash: 'reusedhash',
        expiresAt: new Date(Date.now() + 100000),
        revokedAt: new Date(Date.now() - 5000),
        replacedBy: 'already-replaced-hash',
      };

      mockRefreshTokenModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(revokedTokenDoc),
      });

      await expect(service.refresh('reused-token')).rejects.toThrow(UnauthorizedException);
      expect(mockRefreshTokenModel.updateMany).toHaveBeenCalledWith(
        { userId: mockUserId, revokedAt: null },
        { revokedAt: expect.any(Date) },
      );
    });

    it('should reject expired refresh token', async () => {
      const expiredTokenDoc = {
        userId: mockUserId,
        tokenHash: 'expiredhash',
        expiresAt: new Date(Date.now() - 10000),
        revokedAt: null,
        replacedBy: null,
      };

      mockRefreshTokenModel.findOne.mockReturnValue({
        exec: jest.fn().mockResolvedValue(expiredTokenDoc),
      });

      await expect(service.refresh('expired-token')).rejects.toThrow(UnauthorizedException);
    });
  });
});
