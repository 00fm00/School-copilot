import { Role, DocumentStatus, MessageRole } from './enums';

export interface UserDto {
  id: string;
  email: string;
  name: string;
  role: Role;
  classIds: string[];
  isActive: boolean;
}

export interface JwtPayload {
  sub: string;
  role: Role;
  classIds: string[];
  iat?: number;
  exp?: number;
}

export interface AuthResponseDto {
  accessToken: string;
  user: UserDto;
}

export interface SchoolClassDto {
  id: string;
  name: string;
}

export interface StudentDto {
  id: string;
  name: string;
  classId: string;
  parentUserId: string;
}

export interface DocumentDto {
  id: string;
  title: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  errorMessage?: string;
  pageCount?: number;
  audienceRoles: Role[];
  classScope: string[];
  uploadedBy: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export interface CitationDto {
  documentId: string;
  title: string;
  page: number;
  chunkId: string;
}

export interface ChatMessageDto {
  id: string;
  sessionId: string;
  role: MessageRole;
  content: string;
  citations: CitationDto[];
  refused: boolean;
  createdAt: string;
}

export interface ChatSessionDto {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateChatSessionDto {
  title?: string;
}

export interface SendMessageDto {
  content: string;
}

export interface SendMessageResponseDto {
  message: ChatMessageDto;
  citations: CitationDto[];
  refused: boolean;
}
