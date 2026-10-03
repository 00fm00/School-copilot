import { NotFoundException } from '@nestjs/common';
import { getModelToken } from '@nestjs/mongoose';
import { Test, TestingModule } from '@nestjs/testing';
import { Types } from 'mongoose';
import { Role } from '@school-copilot/shared';
import { ChatService } from './chat.service';
import { ChatSession } from '../schemas/chat-session.schema';
import { ChatMessage } from '../schemas/chat-message.schema';
import { RetrievalService } from '../retrieval/retrieval.service';
import { LLM_PROVIDER } from '../llm/llm.interface';

describe('ChatService', () => {
  let service: ChatService;

  const mockUserId = new Types.ObjectId();
  const mockSessionId = new Types.ObjectId();
  const mockChunkId = new Types.ObjectId();
  const mockDocId = new Types.ObjectId();

  const mockSession = {
    _id: mockSessionId,
    userId: mockUserId,
    title: 'Test Session',
    createdAt: new Date(),
    updatedAt: new Date(),
    save: jest.fn().mockResolvedValue(true),
  };

  const mockSessionModel = {
    create: jest.fn().mockResolvedValue(mockSession),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        exec: jest.fn().mockResolvedValue([mockSession]),
      }),
    }),
    findOne: jest.fn(),
    findByIdAndDelete: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockSession),
    }),
  };

  const mockMessageModel = {
    create: jest.fn().mockImplementation((data) => ({
      _id: new Types.ObjectId(),
      ...data,
      createdAt: new Date(),
    })),
    find: jest.fn().mockReturnValue({
      sort: jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue([]),
        }),
        exec: jest.fn().mockResolvedValue([]),
      }),
    }),
    deleteMany: jest.fn().mockReturnValue({
      exec: jest.fn().mockResolvedValue({}),
    }),
    countDocuments: jest.fn().mockResolvedValue(0),
  };

  const mockRetrievalService = {
    retrieveRelevantChunks: jest.fn(),
  };

  const mockLlmProvider = {
    generateAnswer: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: getModelToken(ChatSession.name),
          useValue: mockSessionModel,
        },
        {
          provide: getModelToken(ChatMessage.name),
          useValue: mockMessageModel,
        },
        {
          provide: RetrievalService,
          useValue: mockRetrievalService,
        },
        {
          provide: LLM_PROVIDER,
          useValue: mockLlmProvider,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  it('should throw NotFoundException (404) for sessions not owned by the caller', async () => {
    mockSessionModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(null),
    });

    await expect(
      service.getSessionMessages('wrong-user-id', mockSessionId.toString()),
    ).rejects.toThrow(NotFoundException);
  });

  it('should fast-path refusal when retrieval indicates shouldRefuse', async () => {
    mockSessionModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockSession),
    });
    mockRetrievalService.retrieveRelevantChunks.mockResolvedValue({
      chunks: [],
      shouldRefuse: true,
      questionEmbedding: [],
    });

    const res = await service.sendMessage(
      mockUserId.toString(),
      mockSessionId.toString(),
      { role: Role.PARENT, classIds: [] },
      'What is in the confidential staff handbook?',
    );

    expect(res.refused).toBe(true);
    expect(res.message.content).toBe('I could not find this in the documents available to you.');
    expect(res.citations).toHaveLength(0);
    expect(mockLlmProvider.generateAnswer).not.toHaveBeenCalled();
  });

  it('should call LLM and parse inline citations correctly when relevant chunks exist', async () => {
    mockSessionModel.findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(mockSession),
    });

    const mockChunk = {
      chunkId: mockChunkId.toString(),
      documentId: mockDocId.toString(),
      documentTitle: 'Leave Policy',
      page: 1,
      chunkIndex: 0,
      text: 'Teachers are entitled to 12 casual leaves.',
      score: 0.85,
    };

    mockRetrievalService.retrieveRelevantChunks.mockResolvedValue({
      chunks: [mockChunk],
      shouldRefuse: false,
      questionEmbedding: [],
    });

    mockLlmProvider.generateAnswer.mockResolvedValue(
      'Teachers are entitled to 12 casual leaves per academic year [1].',
    );

    const res = await service.sendMessage(
      mockUserId.toString(),
      mockSessionId.toString(),
      { role: Role.TEACHER, classIds: [] },
      'How many casual leaves do teachers get?',
    );

    expect(res.refused).toBe(false);
    expect(res.citations).toHaveLength(1);
    expect(res.citations[0]!.title).toBe('Leave Policy');
    expect(res.citations[0]!.page).toBe(1);
    expect(res.message.content).toContain('[1]');
  });
});
