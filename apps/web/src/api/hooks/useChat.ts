import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import {
  fetchSessions,
  createSession,
  fetchSessionMessages,
  deleteSession,
  sendChatMessage,
} from '../chat';
import { queryKeys } from '../keys';
import { ChatMessageDto } from '@school-copilot/shared';

export function useChatSessions() {
  return useQuery({
    queryKey: queryKeys.chat.sessions,
    queryFn: fetchSessions,
  });
}

export function useChatSession(sessionId: string) {
  return useQuery({
    queryKey: queryKeys.chat.session(sessionId),
    queryFn: () => fetchSessionMessages(sessionId),
    enabled: Boolean(sessionId),
  });
}

export function useCreateSession() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (title?: string) => createSession(title),
    onSuccess: (session) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.sessions });
      navigate({ to: '/chat/$sessionId', params: { sessionId: session.id } });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: (sessionId: string) => deleteSession(sessionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.sessions });
      navigate({ to: '/chat' });
    },
  });
}

export function useSendMessage(sessionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (content: string) => sendChatMessage(sessionId, content),
    // Optimistic user message update
    onMutate: async (content: string) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.chat.session(sessionId) });

      const previousMessages =
        queryClient.getQueryData<ChatMessageDto[]>(queryKeys.chat.session(sessionId)) || [];

      const optimisticUserMsg: ChatMessageDto = {
        id: `optimistic-${Date.now()}`,
        sessionId,
        role: 'user',
        content,
        citations: [],
        refused: false,
        createdAt: new Date().toISOString(),
      };

      queryClient.setQueryData<ChatMessageDto[]>(queryKeys.chat.session(sessionId), [
        ...previousMessages,
        optimisticUserMsg,
      ]);

      return { previousMessages };
    },
    onError: (_err, _content, context) => {
      if (context?.previousMessages) {
        queryClient.setQueryData(queryKeys.chat.session(sessionId), context.previousMessages);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.session(sessionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.sessions });
    },
  });
}
