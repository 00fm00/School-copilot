import { createFileRoute } from '@tanstack/react-router';
import React from 'react';
import { ChatWindow } from '../../../components/chat/ChatWindow';
import { queryKeys } from '../../../api/keys';
import { fetchSessionMessages } from '../../../api/chat';

export const Route = createFileRoute('/_authenticated/chat/$sessionId')({
  loader: async ({ params, context }) => {
    // Prefetch the session messages using ensureQueryData as specified in Section 9
    await context.queryClient.ensureQueryData({
      queryKey: queryKeys.chat.session(params.sessionId),
      queryFn: () => fetchSessionMessages(params.sessionId),
    });
  },
  component: ChatSessionPage,
});

function ChatSessionPage() {
  const { sessionId } = Route.useParams();
  return <ChatWindow sessionId={sessionId} />;
}
