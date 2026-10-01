import React, { useState, useEffect, useRef } from 'react';
import { useChatSession, useSendMessage } from '../../api/hooks/useChat';
import { getErrorMessage } from '../../api/client';
import { Send, Loader2, FileText, AlertCircle, Sparkles, Bot, User } from 'lucide-react';

interface ChatWindowProps {
  sessionId: string;
}

export function ChatWindow({ sessionId }: ChatWindowProps) {
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

  const handleSend = async () => {
    const trimmed = input.trim();
    if (!trimmed || sendMessageMutation.isPending) return;

    if (trimmed.length > 1000) {
      setError('Message exceeds 1000 characters limit.');
      return;
    }

    setError(null);
    setInput('');

    try {
      await sendMessageMutation.mutateAsync(trimmed);
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

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-50 overflow-hidden">
      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mr-2 text-indigo-500" />
            <span className="text-xs">Loading conversation...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-center p-8">
            <div className="max-w-md">
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
                <Sparkles className="w-6 h-6" />
              </div>
              <h3 className="font-semibold text-slate-800 text-sm">Conversation Started</h3>
              <p className="text-xs text-slate-500 mt-1">
                Ask any question regarding school policies, circulars, fees, or calendars. Answers
                are strictly grounded in authorized documents.
              </p>
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 max-w-3xl ${
                msg.role === 'user' ? 'ml-auto flex-row-reverse' : 'mr-auto'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-semibold shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-indigo-600 border border-slate-200'
                }`}
              >
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Content Bubble */}
              <div
                className={`rounded-2xl p-4 text-xs leading-relaxed max-w-xl shadow-sm ${
                  msg.role === 'user'
                    ? 'bg-indigo-600 text-white rounded-tr-none'
                    : msg.refused
                      ? 'bg-amber-50 text-amber-900 border border-amber-200 rounded-tl-none'
                      : 'bg-white text-slate-800 border border-slate-200 rounded-tl-none'
                }`}
              >
                {msg.refused && (
                  <div className="flex items-center gap-1.5 text-amber-700 font-semibold mb-1 text-[11px]">
                    <AlertCircle className="w-3.5 h-3.5" />
                    <span>Document Not Found or Access Restricted</span>
                  </div>
                )}

                <div className="whitespace-pre-wrap">{msg.content}</div>

                {/* Inline Citations */}
                {!msg.refused && msg.citations && msg.citations.length > 0 && (
                  <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mr-1 self-center">
                      Sources:
                    </span>
                    {msg.citations.map((c, i) => (
                      <div
                        key={`${c.documentId}-${c.page}-${i}`}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-medium hover:bg-slate-200 transition-colors"
                      >
                        <FileText className="w-3 h-3 text-indigo-500" />
                        <span>
                          {c.title} (Page {c.page})
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                <div
                  className={`mt-1 text-[10px] ${
                    msg.role === 'user' ? 'text-indigo-200' : 'text-slate-400'
                  }`}
                >
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Typing indicator */}
        {sendMessageMutation.isPending && (
          <div className="flex items-center gap-3 mr-auto max-w-xl">
            <div className="w-8 h-8 rounded-xl bg-white text-indigo-600 border border-slate-200 flex items-center justify-center shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-3.5 shadow-sm text-xs text-slate-500 flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />
              <span>Checking document permissions and drafting answer...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Composer Input */}
      <div className="p-4 bg-white border-t border-slate-200">
        {error && (
          <div className="mb-2 p-2 rounded-lg bg-red-50 border border-red-200 text-red-600 text-xs font-medium flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>{error}</span>
          </div>
        )}

        <div className="relative flex items-center">
          <textarea
            ref={textareaRef}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about school documents... (Press Enter to send, Shift+Enter for newline)"
            className="w-full resize-none pl-4 pr-12 py-3 text-xs bg-slate-50 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:bg-white transition-all max-h-32"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || sendMessageMutation.isPending}
            className="absolute right-2.5 p-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 disabled:hover:bg-indigo-600 transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5 px-1">
          <span>Grounded with MongoDB Atlas Vector Search</span>
          <span>{input.length}/1000 characters</span>
        </div>
      </div>
    </div>
  );
}
