import React, { useState } from 'react';
import { Link, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { Role } from '@school-copilot/shared';
import { authStore } from '../../lib/auth-store';
import { useLogout } from '../../api/hooks/useAuth';
import { useChatSessions, useDeleteSession, useCreateSession } from '../../api/hooks/useChat';
import {
  MessageSquare,
  FileText,
  LogOut,
  Shield,
  GraduationCap,
  Users,
  Plus,
  Trash2,
  Menu,
  X,
  Loader2,
  AlertTriangle,
} from 'lucide-react';

export function AppShell() {
  const user = authStore.getUser();
  const navigate = useNavigate();
  const logoutMutation = useLogout();
  const deleteSessionMutation = useDeleteSession();
  const createSessionMutation = useCreateSession();
  const { data: sessions = [], isLoading: isSessionsLoading } = useChatSessions();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [sessionToDelete, setSessionToDelete] = useState<{ id: string; title: string } | null>(null);

  const getRoleIcon = (role?: Role) => {
    switch (role) {
      case Role.ADMIN:
        return <Shield className="w-3 h-3 text-purple-400" />;
      case Role.TEACHER:
        return <GraduationCap className="w-3 h-3 text-blue-400" />;
      case Role.PARENT:
        return <Users className="w-3 h-3 text-emerald-400" />;
      default:
        return null;
    }
  };

  const getRoleBadgeStyle = (role?: Role) => {
    switch (role) {
      case Role.ADMIN:
        return 'bg-purple-950/70 text-purple-300 border-purple-800/60';
      case Role.TEACHER:
        return 'bg-sky-950/70 text-sky-300 border-sky-800/60';
      case Role.PARENT:
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-800/60';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const handleNewChat = async () => {
    setIsMobileOpen(false);
    if (createSessionMutation.isPending) return;
    try {
      await createSessionMutation.mutateAsync();
    } catch {
      navigate({ to: '/chat' });
    }
  };

  const confirmDeleteSession = async () => {
    if (!sessionToDelete) return;
    try {
      await deleteSessionMutation.mutateAsync(sessionToDelete.id);
      setSessionToDelete(null);
    } catch {
      // Handled in mutation error state
    }
  };

  const renderSidebarContent = (isMobile = false) => (
    <div className="flex flex-col h-full justify-between select-none">
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* Brand Header */}
        <div className="p-4 px-5 border-b border-white/[0.06] flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-slate-900 border border-indigo-400/30 flex items-center justify-center text-white font-bold text-sm shadow-md shadow-indigo-950/40">
              SC
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-semibold text-slate-100 text-sm tracking-tight leading-none">
                  School ERP Copilot
                </h1>
              </div>
              <div className="flex items-center gap-1.5 mt-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-medium tracking-wider text-slate-400 uppercase">
                  Institutional AI
                </span>
              </div>
            </div>
          </div>
          {isMobile && (
            <button
              onClick={() => setIsMobileOpen(false)}
              className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/10"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Quick Actions & Navigation */}
        <div className="p-3.5 space-y-2 border-b border-white/[0.06] flex-shrink-0">
          <button
            onClick={handleNewChat}
            disabled={createSessionMutation.isPending}
            className="w-full group flex items-center justify-between py-2 px-3 bg-white/[0.06] hover:bg-white/[0.1] text-slate-200 hover:text-white rounded-xl text-xs font-medium transition-all duration-150 border border-white/[0.08] shadow-xs active:scale-[0.99] disabled:opacity-50"
          >
            <div className="flex items-center gap-2">
              {createSessionMutation.isPending ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              ) : (
                <Plus className="w-3.5 h-3.5 text-indigo-400 group-hover:rotate-90 transition-transform duration-200" />
              )}
              <span>New Conversation</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400 px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/[0.05]">
              +
            </span>
          </button>

          {user?.role === Role.ADMIN && (
            <Link
              to="/admin/documents"
              onClick={() => isMobile && setIsMobileOpen(false)}
              className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-all duration-150 ${
                currentPath.startsWith('/admin')
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50 font-semibold'
                  : 'text-slate-300 hover:bg-white/[0.05] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 opacity-80" />
                <span>Document Knowledge Base</span>
              </div>
              <span
                className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                  currentPath.startsWith('/admin')
                    ? 'bg-indigo-700/70 text-indigo-100'
                    : 'bg-white/[0.08] text-slate-400'
                }`}
              >
                Admin
              </span>
            </Link>
          )}
        </div>

        {/* Recent Conversations List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1">
          <div className="flex items-center justify-between px-2.5 py-1 mb-1">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Conversations
            </span>
            <span className="text-[10px] font-mono text-slate-400">{sessions.length}</span>
          </div>

          {isSessionsLoading ? (
            <div className="space-y-2 p-1">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-8 rounded-xl bg-white/[0.04] animate-pulse" />
              ))}
            </div>
          ) : sessions.length === 0 ? (
            <div className="text-center py-10 px-4">
              <MessageSquare className="w-6 h-6 text-slate-600 mx-auto mb-2 opacity-50" />
              <p className="text-slate-400 text-xs font-medium">No conversations yet</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Start a new query above</p>
            </div>
          ) : (
            sessions.map((session) => {
              const isActive = currentPath === `/chat/${session.id}`;
              return (
                <div
                  key={session.id}
                  className={`group flex items-center justify-between px-2.5 py-2 rounded-xl text-xs transition-all duration-150 ${
                    isActive
                      ? 'bg-white/[0.12] text-white font-medium border border-white/[0.1] shadow-xs'
                      : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-200'
                  }`}
                >
                  <Link
                    to="/chat/$sessionId"
                    params={{ sessionId: session.id }}
                    onClick={() => isMobile && setIsMobileOpen(false)}
                    className="flex items-center gap-2.5 truncate flex-1 min-w-0"
                  >
                    <MessageSquare
                      className={`w-3.5 h-3.5 shrink-0 transition-colors ${
                        isActive ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-300'
                      }`}
                    />
                    <span className="truncate">{session.title}</span>
                  </Link>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      setSessionToDelete({ id: session.id, title: session.title });
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-400 text-slate-500 rounded transition-all duration-150"
                    title="Delete chat"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* User Card & Logout */}
      <div className="p-3 border-t border-white/[0.06] flex-shrink-0 bg-[#080B12]">
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] mb-2">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-2 truncate min-w-0">
              <div className="w-6 h-6 rounded-lg bg-indigo-950 border border-indigo-700/50 text-indigo-300 font-bold text-[11px] flex items-center justify-center flex-shrink-0">
                {user?.name?.[0]?.toUpperCase() || 'U'}
              </div>
              <span className="text-xs font-semibold text-slate-200 truncate">{user?.name}</span>
            </div>
            <span
              className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(
                user?.role,
              )}`}
            >
              {getRoleIcon(user?.role)}
              <span>{user?.role}</span>
            </span>
          </div>
          <div className="text-[11px] font-mono text-slate-400 truncate pl-8">{user?.email}</div>
        </div>

        <button
          onClick={() => logoutMutation.mutate()}
          disabled={logoutMutation.isPending}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-300 hover:bg-rose-950/30 border border-transparent hover:border-rose-900/40 transition-all duration-150 disabled:opacity-50"
        >
          {logoutMutation.isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Signing Out...</span>
            </>
          ) : (
            <>
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-slate-800 overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-72 bg-[#0A0E17] border-r border-slate-850 flex-col justify-between flex-shrink-0 select-none">
        {renderSidebarContent(false)}
      </aside>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden animate-in fade-in duration-150">
          <div
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs"
          />
          <aside className="fixed inset-y-0 left-0 w-72 z-50 bg-[#0A0E17] flex flex-col justify-between shadow-2xl animate-in slide-in-from-left duration-200">
            {renderSidebarContent(true)}
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header Bar */}
        <header className="md:hidden flex items-center justify-between px-4 py-3 bg-[#0A0E17] border-b border-white/[0.08] text-white flex-shrink-0 z-30">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileOpen(true)}
              className="p-1.5 -ml-1 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-xs font-bold text-white shadow-xs">
                SC
              </div>
              <span className="font-semibold text-xs tracking-tight text-slate-100">
                School ERP Copilot
              </span>
            </div>
          </div>

          <button
            onClick={handleNewChat}
            disabled={createSessionMutation.isPending}
            className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 hover:bg-white/15 text-white rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
          >
            {createSessionMutation.isPending ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-white" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            <span>New</span>
          </button>
        </header>

        {/* Content Canvas */}
        <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-50/70">
          <Outlet />
        </main>
      </div>

      {/* Delete Conversation Confirmation Modal */}
      {sessionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-[#0F141F] border border-white/10 rounded-2xl max-w-sm w-full p-5 shadow-2xl text-left animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Delete Conversation?</h3>
                <p className="text-[11px] text-slate-400 mt-0.5">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 bg-white/[0.04] p-3 rounded-xl border border-white/5 truncate mb-4">
              "{sessionToDelete.title}"
            </p>
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={deleteSessionMutation.isPending}
                onClick={() => setSessionToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deleteSessionMutation.isPending}
                onClick={confirmDeleteSession}
                className="px-4 py-1.5 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-lg flex items-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
              >
                {deleteSessionMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
