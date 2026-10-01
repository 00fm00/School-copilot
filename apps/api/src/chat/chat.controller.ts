import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ThrottlerGuard, Throttle } from '@nestjs/throttler';
import { ChatService } from './chat.service';
import { CreateChatSessionDto, SendMessageDto } from '@school-copilot/shared';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';

@ApiTags('Chat')
@ApiBearerAuth()
@Controller('chat')
export class ChatController {
  constructor(private chatService: ChatService) {}

  @Post('sessions')
  @ApiOperation({ summary: 'Create a new chat session' })
  @ApiResponse({ status: 201, description: 'Session created' })
  async createSession(@CurrentUser('id') userId: string, @Body() dto: CreateChatSessionDto) {
    return this.chatService.createSession(userId, dto?.title);
  }

  @Get('sessions')
  @ApiOperation({ summary: 'List caller own chat sessions' })
  @ApiResponse({ status: 200, description: 'List of sessions' })
  async getSessions(@CurrentUser('id') userId: string) {
    return this.chatService.getSessions(userId);
  }

  @Get('sessions/:id')
  @ApiOperation({ summary: 'Get messages for a specific session owned by caller' })
  @ApiResponse({ status: 200, description: 'Messages list' })
  @ApiResponse({ status: 404, description: 'Session not found' })
  async getSessionMessages(@CurrentUser('id') userId: string, @Param('id') sessionId: string) {
    return this.chatService.getSessionMessages(userId, sessionId);
  }

  @Delete('sessions/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Delete a chat session owned by caller' })
  @ApiResponse({ status: 200, description: 'Session deleted' })
  async deleteSession(@CurrentUser('id') userId: string, @Param('id') sessionId: string) {
    return this.chatService.deleteSession(userId, sessionId);
  }

  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @Post('sessions/:id/messages')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send question in session and receive cited grounded answer' })
  @ApiResponse({ status: 200, description: 'Assistant answer and citations' })
  async sendMessage(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') sessionId: string,
    @Body() dto: SendMessageDto,
  ) {
    return this.chatService.sendMessage(
      user.id,
      sessionId,
      {
        role: user.role,
        classIds: user.classIds,
      },
      dto.content,
    );
  }
}
