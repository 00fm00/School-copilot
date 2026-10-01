import { createFileRoute } from '@tanstack/react-router';
import React from 'react';
import { authStore } from '../../../lib/auth-store';
import { MessageSquare, Sparkles } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/chat/')({
  component: ChatIndexPage,
});

function ChatIndexPage() {
  const user = authStore.getUser();

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50">
      <div className="max-w-md w-full p-8 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <MessageSquare className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900 mb-1">
          Welcome back, {user?.name || 'User'}!
        </h2>
        <p className="text-sm text-slate-500 mb-6">
          Ask questions about school policies, fee structures, exam circulars, and schedules.
          Answers are strictly grounded in verified school documents.
        </p>

        <div className="space-y-2 text-left">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Suggested Questions</span>
          </div>
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors">
            "When does the winter vacation start and end?"
          </div>
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors">
            "What is the procedure for applying for emergency sick leave?"
          </div>
          <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 text-xs text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors">
            "What is the deadline for paying the Term 2 tuition fee?"
          </div>
        </div>
      </div>
    </div>
  );
}
