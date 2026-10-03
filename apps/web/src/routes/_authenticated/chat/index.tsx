import { createFileRoute, useNavigate } from '@tanstack/react-router';
import React, { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Role } from '@school-copilot/shared';
import { authStore } from '../../../lib/auth-store';
import { createSession, sendChatMessage } from '../../../api/chat';
import { queryKeys } from '../../../api/keys';
import {
  MessageSquare,
  Sparkles,
  Loader2,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  HeartHandshake,
  Send,
  Cpu,
} from 'lucide-react';

export const Route = createFileRoute('/_authenticated/chat/')({
  component: ChatIndexPage,
});

function ChatIndexPage() {
  const user = authStore.getUser();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [input, setInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleStartPrompt = async (promptText: string) => {
    const text = promptText.trim();
    if (!text || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const title = text.length > 30 ? `${text.slice(0, 27)}...` : text;
      const session = await createSession(title);
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.sessions });

      // Trigger the prompt immediately in background so it processes while navigating
      sendChatMessage(session.id, text).catch(() => {});

      navigate({ to: '/chat/$sessionId', params: { sessionId: session.id } });
    } catch {
      setIsSubmitting(false);
    }
  };

  const handleBlankSession = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const session = await createSession();
      queryClient.invalidateQueries({ queryKey: queryKeys.chat.sessions });
      navigate({ to: '/chat/$sessionId', params: { sessionId: session.id } });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleStartPrompt(input);
    }
  };

  const getRoleBadge = (role?: Role) => {
    switch (role) {
      case Role.ADMIN:
        return {
          label: 'Administrator Portal',
          icon: ShieldCheck,
          color: 'text-purple-700 bg-purple-50 border-purple-200',
        };
      case Role.TEACHER:
        return {
          label: 'Faculty & Teacher Workspace',
          icon: BookOpen,
          color: 'text-blue-700 bg-blue-50 border-blue-200',
        };
      case Role.PARENT:
        return {
          label: 'Parent & Guardian Portal',
          icon: HeartHandshake,
          color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        };
      default:
        return {
          label: 'School Workspace',
          icon: ShieldCheck,
          color: 'text-slate-700 bg-slate-100 border-slate-200',
        };
    }
  };

  const getRoleQuestions = (role?: Role) => {
    switch (role) {
      case Role.ADMIN:
        return [
          {
            title: 'Auditing Document Repository',
            desc: 'List active school policies and their assigned access scopes',
          },
          {
            title: 'Faculty Leave Entitlement Policy',
            desc: 'What are the emergency medical and casual leave allowances for staff?',
          },
          {
            title: 'Tuition Fee Due Dates & Surcharges',
            desc: 'Summarize fee payment deadlines and late penalty schedules for 2026',
          },
        ];
      case Role.TEACHER:
        return [
          {
            title: 'Term 2 Examination Timeline',
            desc: 'When are final question papers due and what is the grading cutoff?',
          },
          {
            title: 'Emergency Leave Protocol',
            desc: 'What is the required workflow to request emergency substitute cover?',
          },
          {
            title: 'Academic Calendar Key Dates',
            desc: 'List upcoming parent-teacher conferences and national holidays',
          },
        ];
      case Role.PARENT:
      default:
        return [
          {
            title: 'Term 2 Fee Deadlines & Breakdown',
            desc: 'What is the due date for Term 2 tuition and payment methods?',
          },
          {
            title: 'Winter Vacation Schedule',
            desc: 'When does the winter break start and what day do classes resume?',
          },
          {
            title: 'Sick Leave & Absences',
            desc: 'How do I submit medical certificates for an excused absence?',
          },
        ];
    }
  };

  const badge = getRoleBadge(user?.role);
  const questions = getRoleQuestions(user?.role);
  const BadgeIcon = badge.icon;

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-3 sm:p-6 md:p-10 bg-slate-50/70 overflow-y-auto">
      <div className="max-w-xl w-full p-4 sm:p-8 bg-white rounded-2xl border border-slate-200/90 shadow-xs text-left animate-in fade-in duration-200 my-auto">
        {/* Role Badge & Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs shrink-0">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                Welcome, {user?.name || 'User'}
              </h2>
              <p className="text-[11px] sm:text-xs text-slate-500">Verified Institutional AI Assistant</p>
            </div>
          </div>
          <div
            className={`self-start sm:self-auto px-2.5 py-1 rounded-full border text-[10px] sm:text-[11px] font-semibold flex items-center gap-1.5 ${badge.color}`}
          >
            <BadgeIcon className="w-3.5 h-3.5" />
            <span>{badge.label}</span>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed mb-5">
          Answers are strictly retrieved from official school documents and gated by role
          permissions. Type your inquiry below or choose a suggested starter query.
        </p>

        {/* Direct Input Composer */}
        <div className="mb-6">
          <div className="relative rounded-xl sm:rounded-2xl bg-slate-50/80 border border-slate-300 focus-within:border-slate-800 focus-within:bg-white focus-within:ring-2 focus-within:ring-slate-900/10 transition-all duration-150 shadow-xs">
            <textarea
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isSubmitting}
              placeholder="Ask anything about school policies, fees, or circulars... (Press Enter to send)"
              className="w-full resize-none px-3.5 pt-3 pb-2 text-xs bg-transparent focus:outline-none placeholder:text-slate-400 text-slate-800"
            />
            <div className="flex items-center justify-between px-3 pb-2 pt-1 text-[11px] text-slate-400 border-t border-slate-200/50">
              <span className="flex items-center gap-1 text-[10px] text-slate-500">
                <Cpu className="w-3 h-3 text-indigo-500" />
                <span>Atlas Vector Search</span>
              </span>
              <button
                type="button"
                onClick={() => handleStartPrompt(input)}
                disabled={!input.trim() || isSubmitting}
                className="flex items-center gap-1 px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-30"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Starting...</span>
                  </>
                ) : (
                  <>
                    <span>Ask</span>
                    <Send className="w-3 h-3" />
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Suggested Queries */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5 text-slate-700" />
            <span>Suggested Queries for your role</span>
          </div>
          {questions.map((q, idx) => (
            <button
              key={idx}
              type="button"
              disabled={isSubmitting}
              onClick={() => handleStartPrompt(q.desc)}
              className="w-full p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-xs text-left transition-all group flex items-center justify-between gap-3 disabled:opacity-50"
            >
              <div className="truncate pr-2">
                <p className="text-xs font-bold text-slate-800 group-hover:text-slate-950 transition-colors truncate">
                  {q.title}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate">"{q.desc}"</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all shrink-0" />
            </button>
          ))}
        </div>

        {/* Bottom Actions */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <p className="text-[11px] text-slate-400">Strictly grounded • Zero hallucination</p>
          <button
            onClick={handleBlankSession}
            disabled={isSubmitting}
            className="w-full sm:w-auto py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            Start Blank Conversation
          </button>
        </div>
      </div>
    </div>
  );
}
