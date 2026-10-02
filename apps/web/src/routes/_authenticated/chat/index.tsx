import { createFileRoute } from '@tanstack/react-router';
import React from 'react';
import { Role } from '@school-copilot/shared';
import { authStore } from '../../../lib/auth-store';
import { useCreateSession } from '../../../api/hooks/useChat';
import {
  MessageSquare,
  Sparkles,
  Loader2,
  ArrowRight,
  ShieldCheck,
  BookOpen,
  HeartHandshake,
} from 'lucide-react';

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
    <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 bg-slate-50/70">
      <div className="max-w-xl w-full p-8 bg-white rounded-2xl border border-slate-200 shadow-xs text-left animate-in fade-in duration-200">
        {/* Role Badge & Header */}
        <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Welcome, {user?.name || 'User'}</h2>
              <p className="text-xs text-slate-500">Verified Institutional AI Assistant</p>
            </div>
          </div>
          <div
            className={`px-2.5 py-1 rounded-full border text-[11px] font-semibold flex items-center gap-1.5 ${badge.color}`}
          >
            <BadgeIcon className="w-3.5 h-3.5" />
            <span>{badge.label}</span>
          </div>
        </div>

        <p className="text-xs text-slate-600 leading-relaxed mb-6">
          Answers are strictly retrieved from official school documents and gated by role
          permissions. Select a query to begin or launch a new conversation.
        </p>

        {createSessionMutation.isPending ? (
          <div className="p-8 flex flex-col items-center justify-center gap-2.5 text-slate-700 text-xs font-semibold">
            <Loader2 className="w-5 h-5 animate-spin text-slate-900" />
            <span>Initializing secure conversation context...</span>
          </div>
        ) : (
          <div className="space-y-2.5">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-slate-700" />
              <span>Suggested Inquiries for your role</span>
            </div>
            {questions.map((q, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleStartPrompt(q.desc)}
                className="w-full p-3.5 rounded-xl border border-slate-200/80 bg-slate-50/50 hover:bg-white hover:border-slate-300 hover:shadow-xs text-left transition-all group flex items-center justify-between gap-3"
              >
                <div>
                  <p className="text-xs font-bold text-slate-800 group-hover:text-slate-950 transition-colors">
                    {q.title}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">"{q.desc}"</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-slate-900 group-hover:translate-x-0.5 transition-all shrink-0" />
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between gap-3">
          <p className="text-[11px] text-slate-400">Strictly grounded • Zero hallucination</p>
          <button
            onClick={() => createSessionMutation.mutate()}
            disabled={createSessionMutation.isPending}
            className="py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors disabled:opacity-50"
          >
            Start Blank Conversation
          </button>
        </div>
      </div>
    </div>
  );
}
