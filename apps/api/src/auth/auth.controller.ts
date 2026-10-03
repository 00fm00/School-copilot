import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  Res,
  HttpCode,
  HttpStatus,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';
import { Public } from '../common/decorators/public.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(
    private authService: AuthService,
    private configService: ConfigService,
  ) {}

  private setRefreshCookie(res: Response, token: string) {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    const ttlDays = this.configService.get<number>('JWT_REFRESH_TTL_DAYS', 7);
    res.cookie('refresh_token', token, {
      httpOnly: true,
      secure: isProd,
      sameSite: isProd ? 'none' : 'lax',
      path: '/api/auth',
      maxAge: ttlDays * 24 * 60 * 60 * 1000,
    });
  }

  @Public()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log in with email and password' })
  @ApiResponse({ status: 200, description: 'Authentication successful' })
  async login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    const result = await this.authService.login(dto.email, dto.password);
    this.setRefreshCookie(res, result.refreshToken);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
  }

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate refresh token and issue new access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed' })
  async refresh(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = dto?.refreshToken || req.cookies?.['refresh_token'];
    if (!refreshToken) {
      throw new UnauthorizedException('No refresh token provided');
    }
    const result = await this.authService.refresh(refreshToken);
    this.setRefreshCookie(res, result.refreshToken);
    return {
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      user: result.user,
    };
  }

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Log out and invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'Successfully logged out' })
  async logout(
    @Body() dto: RefreshDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const isProd = this.configService.get<string>('NODE_ENV') === 'production';
    const refreshToken = dto?.refreshToken || req.cookies?.['refresh_token'];
    if (refreshToken) {
      await this.authService.logout(refreshToken);
    }
    res.clearCookie('refresh_token', {
      path: '/api/auth',
      sameSite: isProd ? 'none' : 'lax',
      secure: isProd,
    });
    return { message: 'Logged out successfully' };
  }

  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get profile of authenticated user' })
  @ApiResponse({ status: 200, description: 'User profile retrieved' })
  async getMe(@CurrentUser('id') userId: string) {
    if (!userId) {
      throw new UnauthorizedException('User not authenticated');
    }
    return this.authService.getMe(userId);
  }
}
