import { createFileRoute } from '@tanstack/react-router';
import React from 'react';
import { authStore } from '../../../lib/auth-store';
import { useCreateSession } from '../../../api/hooks/useChat';
import { MessageSquare, Sparkles, Loader2 } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/chat/')({
  component: ChatIndexPage,
});

function ChatIndexPage() {
  const user = authStore.getUser();
  const createSessionMutation = useCreateSession();

  const handleStartPrompt = (promptText: string) => {
    createSessionMutation.mutate(
      promptText.length > 30 ? `${promptText.slice(0, 27)}...` : promptText,
    );
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
      <div className="max-w-md w-full p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">Welcome, {user?.name || 'User'}!</h2>
        <p className="text-xs text-slate-500 mb-6">
          Ask questions about school policies, fee structures, exam circulars, and schedules.
          Answers are strictly grounded in verified school documents according to your role.
        </p>

        {createSessionMutation.isPending ? (
          <div className="p-4 flex items-center justify-center gap-2 text-indigo-600 text-xs font-medium">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Starting new conversation...</span>
          </div>
        ) : (
          <div className="space-y-2 text-left">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Suggested Questions</span>
            </div>
            <div
              onClick={() => handleStartPrompt('When does the winter vacation start and end?')}
              className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-900 cursor-pointer transition-colors"
            >
              "When does the winter vacation start and end?"
            </div>
            <div
              onClick={() =>
                handleStartPrompt('What is the procedure for applying for emergency sick leave?')
              }
              className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-900 cursor-pointer transition-colors"
            >
              "What is the procedure for applying for emergency sick leave?"
            </div>
            <div
              onClick={() =>
                handleStartPrompt('What is the deadline for paying the Term 2 tuition fee?')
              }
              className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-900 cursor-pointer transition-colors"
            >
              "What is the deadline for paying the Term 2 tuition fee?"
            </div>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-slate-100">
          <button
            onClick={() => createSessionMutation.mutate()}
            disabled={createSessionMutation.isPending}
            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-colors"
          >
            Start Blank Conversation
          </button>
        </div>
      </div>
    </div>
  );
}
