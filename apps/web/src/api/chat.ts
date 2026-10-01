import { apiClient } from './client';
import { ChatMessageDto, ChatSessionDto, SendMessageResponseDto } from '@school-copilot/shared';

export async function fetchSessions(): Promise<ChatSessionDto[]> {
  const { data } = await apiClient.get<ChatSessionDto[]>('/chat/sessions');
  return data;
}

export async function createSession(title?: string): Promise<ChatSessionDto> {
  const { data } = await apiClient.post<ChatSessionDto>('/chat/sessions', { title });
  return data;
}

export async function fetchSessionMessages(sessionId: string): Promise<ChatMessageDto[]> {
  const { data } = await apiClient.get<ChatMessageDto[]>(`/chat/sessions/${sessionId}`);
  return data;
}

export async function deleteSession(sessionId: string): Promise<{ message: string }> {
  const { data } = await apiClient.delete<{ message: string }>(`/chat/sessions/${sessionId}`);
  return data;
}

export async function sendChatMessage(
  sessionId: string,
  content: string,
): Promise<SendMessageResponseDto> {
  const { data } = await apiClient.post<SendMessageResponseDto>(
    `/chat/sessions/${sessionId}/messages`,
    { content },
  );
  return data;
}
