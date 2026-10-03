import { Injectable, NotFoundException, BadRequestException, Inject, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  ChatMessageDto,
  ChatSessionDto,
  CitationDto,
  SendMessageResponseDto,
} from '@school-copilot/shared';
import { ChatSession, ChatSessionDocument } from '../schemas/chat-session.schema';
import { ChatMessage, ChatMessageDocument } from '../schemas/chat-message.schema';
import { RetrievalService, RetrievedChunk } from '../retrieval/retrieval.service';
import { ChunkFilterUser } from '../retrieval/chunk-filter';
import { ILlmProvider, LLM_PROVIDER, ChatContextMessage } from '../llm/llm.interface';
import { SYSTEM_PROMPT } from './prompts/system';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);

  constructor(
    @InjectModel(ChatSession.name) private sessionModel: Model<ChatSessionDocument>,
    @InjectModel(ChatMessage.name) private messageModel: Model<ChatMessageDocument>,
    private retrievalService: RetrievalService,
    @Inject(LLM_PROVIDER) private llmProvider: ILlmProvider,
  ) {}

  async createSession(userId: string, title?: string): Promise<ChatSessionDto> {
    const trimmedTitle = title?.trim() || 'New Conversation';

    // If an empty session (0 messages) is already present for this user, reuse it instead of creating duplicate empty chats
    if (Types.ObjectId.isValid(userId)) {
      const userSessions = await this.sessionModel
        .find({ userId: new Types.ObjectId(userId) })
        .sort({ updatedAt: -1 })
        .exec();

      for (const sess of userSessions) {
        const msgCount = await this.messageModel.countDocuments({
          sessionId: sess._id,
        });
        if (msgCount === 0) {
          // If a custom title was provided, update it
          if (title && title.trim() && sess.title !== title.trim()) {
            sess.title = title.trim();
            await sess.save();
          }

          return {
            id: sess._id.toString(),
            userId: sess.userId.toString(),
            title: sess.title,
            createdAt: (sess.createdAt || new Date()).toISOString(),
            updatedAt: (sess.updatedAt || new Date()).toISOString(),
          };
        }
      }
    }

    const session = await this.sessionModel.create({
      userId: new Types.ObjectId(userId),
      title: trimmedTitle,
    });

    return {
      id: session._id.toString(),
      userId: session.userId.toString(),
      title: session.title,
      createdAt: (session.createdAt || new Date()).toISOString(),
      updatedAt: (session.updatedAt || new Date()).toISOString(),
    };
  }

  async getSessions(userId: string): Promise<ChatSessionDto[]> {
    const sessions = await this.sessionModel
      .find({ userId: new Types.ObjectId(userId) })
      .sort({ updatedAt: -1 })
      .exec();

    return sessions.map((s) => ({
      id: s._id.toString(),
      userId: s.userId.toString(),
      title: s.title,
      createdAt: (s.createdAt || new Date()).toISOString(),
      updatedAt: (s.updatedAt || new Date()).toISOString(),
    }));
  }

  async getSessionMessages(userId: string, sessionId: string): Promise<ChatMessageDto[]> {
    if (!Types.ObjectId.isValid(sessionId) || !Types.ObjectId.isValid(userId)) {
      throw new NotFoundException(`Chat session ${sessionId} not found`);
    }

    // Security: return 404, not 403, for other users' sessions
    const session = await this.sessionModel
      .findOne({
        _id: new Types.ObjectId(sessionId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!session) {
      throw new NotFoundException(`Chat session ${sessionId} not found`);
    }

    const messages = await this.messageModel
      .find({ sessionId: session._id })
      .sort({ createdAt: 1 })
      .exec();

    return messages.map((m) => ({
      id: m._id.toString(),
      sessionId: m.sessionId.toString(),
      role: m.role,
      content: m.content,
      citations: m.citations || [],
      refused: m.refused,
      createdAt: (m.createdAt || new Date()).toISOString(),
    }));
  }

  async deleteSession(userId: string, sessionId: string): Promise<{ message: string }> {
    if (!Types.ObjectId.isValid(sessionId) || !Types.ObjectId.isValid(userId)) {
      throw new NotFoundException(`Chat session ${sessionId} not found`);
    }

    const session = await this.sessionModel
      .findOne({
        _id: new Types.ObjectId(sessionId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!session) {
      throw new NotFoundException(`Chat session ${sessionId} not found`);
    }

    await this.messageModel.deleteMany({ sessionId: session._id }).exec();
    await this.sessionModel.findByIdAndDelete(sessionId).exec();

    return { message: 'Chat session deleted successfully' };
  }

  // Parse inline citations like [1], [2], [1, 2] or 【1】 or 【2†L9-L13】
  private parseCitations(
    answer: string,
    chunks: RetrievedChunk[],
  ): { citations: CitationDto[]; cleanedAnswer: string } {
    const citedBlockNumbers = new Set<number>();
    const citationRegex = /(?:\[|【)(\d+(?:\s*,\s*\d+)*)(?:[†^:][^\]】]*)?(?:\]|】)/g;
    let match: RegExpExecArray | null;

    while ((match = citationRegex.exec(answer)) !== null) {
      const numbers = match[1]!.split(',').map((n) => parseInt(n.trim(), 10));
      numbers.forEach((n) => {
        if (!isNaN(n) && n >= 1 && n <= chunks.length) {
          citedBlockNumbers.add(n);
        }
      });
    }

    const citations: CitationDto[] = [];
    const seenDocs = new Set<string>();

    citedBlockNumbers.forEach((blockNum) => {
      const chunk = chunks[blockNum - 1];
      if (chunk) {
        const key = `${chunk.documentId}-${chunk.page}`;
        if (!seenDocs.has(key)) {
          seenDocs.add(key);
          citations.push({
            documentId: chunk.documentId,
            title: chunk.documentTitle,
            page: chunk.page,
            chunkId: chunk.chunkId,
          });
        }
      }
    });

    const cleanedAnswer = answer.replace(/【(\d+(?:\s*,\s*\d+)*)(?:[†^:][^】]*)?】/g, '[$1]');
    return { citations, cleanedAnswer };
  }

  async sendMessage(
    userId: string,
    sessionId: string,
    userContext: ChunkFilterUser,
    content: string,
  ): Promise<SendMessageResponseDto> {
    if (!Types.ObjectId.isValid(sessionId) || !Types.ObjectId.isValid(userId)) {
      throw new NotFoundException(`Chat session ${sessionId} not found`);
    }

    const trimmedContent = content.trim();
    if (!trimmedContent) {
      throw new BadRequestException('Message content cannot be empty');
    }

    if (trimmedContent.length > 1000) {
      throw new BadRequestException('Message exceeds maximum limit of 1000 characters');
    }

    // Security: return 404 for unowned session
    const session = await this.sessionModel
      .findOne({
        _id: new Types.ObjectId(sessionId),
        userId: new Types.ObjectId(userId),
      })
      .exec();

    if (!session) {
      throw new NotFoundException(`Chat session ${sessionId} not found`);
    }

    // Save user message
    await this.messageModel.create({
      sessionId: session._id,
      role: 'user',
      content: trimmedContent,
      citations: [],
      refused: false,
    });

    // Auto-update session title if default
    if (session.title === 'New Conversation') {
      session.title =
        trimmedContent.length > 40 ? `${trimmedContent.slice(0, 37)}...` : trimmedContent;
      await session.save();
    }

    // Step 2 & 3: Permission-filtered vector retrieval
    const retrieval = await this.retrievalService.retrieveRelevantChunks(
      userContext,
      trimmedContent,
    );

    const refusalMessage = 'I could not find this in the documents available to you.';

    // Fast-path refusal when no relevant chunks passed score threshold
    if (retrieval.shouldRefuse || retrieval.chunks.length === 0) {
      const assistantDoc = await this.messageModel.create({
        sessionId: session._id,
        role: 'assistant',
        content: refusalMessage,
        citations: [],
        refused: true,
      });

      return {
        message: {
          id: assistantDoc._id.toString(),
          sessionId: session._id.toString(),
          role: 'assistant',
          content: refusalMessage,
          citations: [],
          refused: true,
          createdAt: (assistantDoc.createdAt || new Date()).toISOString(),
        },
        citations: [],
        refused: true,
      };
    }

    // Guardrail: Wrap context blocks & strip closing-tag lookalikes
    const contextBlocks = retrieval.chunks
      .map((chunk, index) => {
        const sanitizedText = chunk.text.replace(/<\/context>/gi, '&lt;/context&gt;');
        return `<context id="${index + 1}" title="${chunk.documentTitle}" page="${chunk.page}">\n${sanitizedText}\n</context>`;
      })
      .join('\n\n');

    const userPromptWithContexts = `${contextBlocks}\n\nQuestion: ${trimmedContent}`;

    // Get last 6 turns of conversation history for follow-ups
    const recentMessages = await this.messageModel
      .find({ sessionId: session._id })
      .sort({ createdAt: -1 })
      .limit(6)
      .exec();

    const history: ChatContextMessage[] = recentMessages
      .reverse()
      // Exclude the current user message just inserted
      .slice(0, -1)
      .map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }));

    // Call LLM
    let generatedContent = '';
    try {
      generatedContent = await this.llmProvider.generateAnswer(
        SYSTEM_PROMPT,
        history,
        userPromptWithContexts,
      );
    } catch (err: any) {
      this.logger.error(`LLM call failed: ${err.message}`);
      generatedContent = refusalMessage;
    }

    // Parse citations
    const { citations } = this.parseCitations(generatedContent, retrieval.chunks);

    // Determine if refusal
    const isRefusal =
      generatedContent.toLowerCase().includes('could not find') ||
      generatedContent.toLowerCase().includes('cannot find') ||
      generatedContent.toLowerCase().includes('not mentioned in the available') ||
      generatedContent === refusalMessage;

    const assistantDoc = await this.messageModel.create({
      sessionId: session._id,
      role: 'assistant',
      content: generatedContent,
      citations: isRefusal ? [] : citations,
      refused: isRefusal,
    });

    return {
      message: {
        id: assistantDoc._id.toString(),
        sessionId: session._id.toString(),
        role: 'assistant',
        content: generatedContent,
        citations: isRefusal ? [] : citations,
        refused: isRefusal,
        createdAt: (assistantDoc.createdAt || new Date()).toISOString(),
      },
      citations: isRefusal ? [] : citations,
      refused: isRefusal,
    };
  }
}
