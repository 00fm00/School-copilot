import React, { useState, useEffect, useRef } from 'react';
import { useChatSession, useSendMessage } from '../../api/hooks/useChat';
import { getErrorMessage } from '../../api/client';
import { Role } from '@school-copilot/shared';
import { authStore } from '../../lib/auth-store';
import {
  Send,
  Loader2,
  FileText,
  Sparkles,
  Bot,
  User,
  Shield,
  ShieldAlert,
  Cpu,
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Lock,
} from 'lucide-react';

interface ChatWindowProps {
  sessionId: string;
}

export function ChatWindow({ sessionId }: ChatWindowProps) {
  const user = authStore.getUser();
  const { data: messages = [], isLoading } = useChatSession(sessionId);
  const sendMessageMutation = useSendMessage(sessionId);

  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, sendMessageMutation.isPending]);

  const handleSend = async (overrideText?: string) => {
    const textToSend = (overrideText !== undefined ? overrideText : input).trim();
    if (!textToSend || sendMessageMutation.isPending) return;

    if (textToSend.length > 1000) {
      setError('Message exceeds 1000 characters limit.');
      return;
    }

    setError(null);
    setInput('');

    try {
      await sendMessageMutation.mutateAsync(textToSend);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getSuggestedPrompts = () => {
    switch (user?.role) {
      case Role.ADMIN:
        return [
          {
            title: 'Anjani Career & Employment',
            prompt: 'Where is Anjani currently working and what is her role?',
            tag: 'Resume Data',
          },
          {
            title: 'Staff Leave Policy Audit',
            prompt: 'What are the rules and emergency quotas for staff leaves?',
            tag: 'Policy',
          },
          {
            title: 'Class 8 Fee Schedule',
            prompt: 'What is the fee payment schedule and installment deadlines for Class 8?',
            tag: 'Financial',
          },
        ];
      case Role.TEACHER:
        return [
          {
            title: 'Class 8 Examination Criteria',
            prompt: 'What are the passing criteria and schedule for Class 8 exams?',
            tag: 'Academics',
          },
          {
            title: 'Staff Leave Entitlement',
            prompt: 'How many days of casual leave are teachers entitled to per year?',
            tag: 'Handbook',
          },
          {
            title: 'Academic Holiday Calendar',
            prompt: 'What are the upcoming school holiday dates for this term?',
            tag: 'Calendar',
          },
        ];
      case Role.PARENT:
      default:
        return [
          {
            title: 'Installment Deadlines',
            prompt: 'When is the second installment fee due and what is the late fee?',
            tag: 'Fee Structure',
          },
          {
            title: 'Class 8 Examination Timetable',
            prompt: 'What is the Class 8 examination timetable and subject schedule?',
            tag: 'Circular',
          },
          {
            title: 'Vacation & Reopening Dates',
            prompt: 'When does the winter break begin and when does school reopen?',
            tag: 'Calendar',
          },
        ];
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#F8FAFC] overflow-hidden">
      {/* Top Security & Status Bar */}
      <div className="h-12 px-6 bg-white border-b border-slate-200/80 flex items-center justify-between flex-shrink-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-xs font-semibold text-slate-800 tracking-tight">
            Institutional Copilot Session
          </span>
          <span className="text-slate-300">|</span>
          <span className="text-[11px] text-slate-500 font-mono">{user?.role} Context</span>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>Zero-Leakage Guardrails</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full border border-slate-200">
            <Cpu className="w-3 h-3 text-indigo-600" />
            <span>Hybrid Retrieval</span>
          </div>
        </div>
      </div>

      {/* Messages Scroll Canvas */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {isLoading ? (
            <div className="flex h-96 items-center justify-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mr-2.5 text-indigo-600" />
              <span className="text-xs font-medium">
                Verifying authorization and loading session...
              </span>
            </div>
          ) : messages.length === 0 ? (
            <div className="py-12 px-4 max-w-2xl mx-auto text-center">
              <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200/80 text-indigo-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Sparkles className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900 tracking-tight">
                Institutional Knowledge Copilot
              </h2>
              <p className="text-xs text-slate-500 mt-1.5 leading-relaxed max-w-md mx-auto">
                Ask questions regarding school policies, student exams, fee schedules, or circulars.
                Every response is strictly grounded in verified institutional documents.
              </p>

              {/* Role-based Starter Prompts */}
              <div className="mt-8 text-left space-y-2">
                <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1 mb-2">
                  Suggested Prompts for {user?.role}:
                </div>
                <div className="grid grid-cols-1 gap-2">
                  {getSuggestedPrompts().map((starter, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(starter.prompt)}
                      className="group flex items-center justify-between p-3 rounded-xl bg-white hover:bg-slate-50/80 border border-slate-200/80 hover:border-indigo-300 text-left transition-all duration-150 shadow-sm"
                    >
                      <div className="truncate pr-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-800 group-hover:text-indigo-600 transition-colors">
                            {starter.title}
                          </span>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-500 border border-slate-200">
                            {starter.tag}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5 truncate">
                          "{starter.prompt}"
                        </p>
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex items-start gap-3.5 ${
                  msg.role === 'user' ? 'ml-auto justify-end' : 'mr-auto justify-start'
                }`}
              >
                {/* Avatar Monogram */}
                {msg.role !== 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-sm border border-slate-800">
                    SC
                  </div>
                )}

                {/* Message Bubble Card */}
                <div
                  className={`rounded-2xl p-5 text-[13px] leading-relaxed max-w-2xl shadow-sm transition-all ${
                    msg.role === 'user'
                      ? 'bg-slate-900 text-white border border-slate-800 rounded-tr-none'
                      : 'bg-white text-slate-800 border border-slate-200/90 rounded-tl-none'
                  }`}
                >
                  {/* Refusal Security Notice */}
                  {msg.refused ? (
                    <div className="flex items-start gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-slate-700 mb-2">
                      <ShieldAlert className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <div className="font-semibold text-slate-900 text-xs mb-0.5">
                          Zero-Leakage Boundary Enforced
                        </div>
                        <div className="text-slate-500 text-[11px] leading-relaxed">
                          {msg.content}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap font-normal">{msg.content}</div>
                  )}

                  {/* Verified Source Citations */}
                  {!msg.refused && msg.citations && msg.citations.length > 0 && (
                    <div className="mt-4 pt-3 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
                        <FileText className="w-3.5 h-3.5 text-indigo-500" />
                        <span>Verified Citations & Sources</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {msg.citations.map((c, i) => (
                          <div
                            key={`${c.documentId}-${c.page}-${i}`}
                            className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs transition-colors hover:bg-slate-100/70"
                          >
                            <div className="flex items-center gap-2 truncate min-w-0">
                              <div className="w-7 h-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">
                                PDF
                              </div>
                              <div className="truncate">
                                <div className="font-semibold text-slate-800 truncate text-[11px]">
                                  {c.title}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  Page {c.page}
                                </div>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 flex-shrink-0">
                              [{i + 1}]
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div
                    className={`mt-2.5 text-[10px] font-mono ${
                      msg.role === 'user' ? 'text-slate-400' : 'text-slate-400'
                    }`}
                  >
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                {/* User Avatar */}
                {msg.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-slate-200 text-slate-700 border border-slate-300 flex items-center justify-center flex-shrink-0 text-xs font-bold">
                    {user?.name?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
            ))
          )}

          {/* Typing / Reasoning Indicator */}
          {sendMessageMutation.isPending && (
            <div className="flex items-start gap-3.5 mr-auto max-w-xl">
              <div className="w-8 h-8 rounded-xl bg-slate-900 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold shadow-sm">
                SC
              </div>
              <div className="bg-white border border-slate-200/90 rounded-2xl rounded-tl-none p-4 shadow-sm text-xs text-slate-600 flex items-center gap-3">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <div>
                  <span className="font-semibold text-slate-800">Grounded Copilot Reasoning</span>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Querying Atlas vector index & verifying role-based access...
                  </p>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Floating Modern Input Composer */}
      <div className="p-4 bg-white/80 backdrop-blur-md border-t border-slate-200/80">
        <div className="max-w-4xl mx-auto">
          {error && (
            <div className="mb-2 p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-500" />
              <span>{error}</span>
            </div>
          )}

          <div className="relative rounded-2xl bg-white border border-slate-300 focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 shadow-sm transition-all duration-150">
            <textarea
              ref={textareaRef}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about school policies, exams, or circulars... (Press Enter to send)"
              className="w-full resize-none px-4 pt-3.5 pb-2 text-xs bg-transparent focus:outline-none max-h-36 placeholder:text-slate-400 text-slate-800"
            />

            <div className="flex items-center justify-between px-3.5 pb-2.5 pt-1 text-[11px] text-slate-400">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium text-[10px]">
                  <Cpu className="w-3 h-3 text-indigo-500" />
                  <span>Atlas Vector Grounded</span>
                </span>
                <span className="hidden sm:inline text-slate-300">•</span>
                <span className="hidden sm:inline">Shift+Enter for newline</span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono text-[10px] text-slate-400">{input.length}/1000</span>
                <button
                  onClick={() => handleSend()}
                  disabled={!input.trim() || sendMessageMutation.isPending}
                  className="p-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white disabled:opacity-30 disabled:hover:bg-slate-900 transition-all duration-150 shadow-sm"
                  title="Send query"
                >
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
