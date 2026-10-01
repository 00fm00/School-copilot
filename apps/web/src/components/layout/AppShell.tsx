import React from 'react';
import { Link, Outlet, useRouterState } from '@tanstack/react-router';
import { Role } from '@school-copilot/shared';
import { authStore } from '../../lib/auth-store';
import { useLogout } from '../../api/hooks/useAuth';
import { MessageSquare, FileText, LogOut, Shield, GraduationCap, Users } from 'lucide-react';

export function AppShell() {
  const user = authStore.getUser();
  const logoutMutation = useLogout();
  const routerState = useRouterState();
  const currentPath = routerState.location.pathname;

  const getRoleIcon = (role?: Role) => {
    switch (role) {
      case Role.ADMIN:
        return <Shield className="w-4 h-4 text-purple-600" />;
      case Role.TEACHER:
        return <GraduationCap className="w-4 h-4 text-blue-600" />;
      case Role.PARENT:
        return <Users className="w-4 h-4 text-emerald-600" />;
      default:
        return null;
    }
  };

  const getRoleBadgeColor = (role?: Role) => {
    switch (role) {
      case Role.ADMIN:
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case Role.TEACHER:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case Role.PARENT:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      default:
        return 'bg-slate-100 text-slate-800 border-slate-200';
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between">
        <div>
          {/* Logo / Brand */}
          <div className="p-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-sm">
              SC
            </div>
            <div>
              <h1 className="font-semibold text-slate-900 leading-tight">School Copilot</h1>
              <p className="text-xs text-slate-500">Role-Aware ERP Assistant</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="p-3 space-y-1">
            <Link
              to="/chat"
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                currentPath.startsWith('/chat')
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-4 h-4" />
              <span>Chat Assistant</span>
            </Link>

            {user?.role === Role.ADMIN && (
              <Link
                to="/admin/documents"
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  currentPath.startsWith('/admin')
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Documents & Roles</span>
              </Link>
            )}
          </nav>
        </div>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-200">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 mb-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-semibold text-slate-900 truncate">{user?.name}</span>
              <span
                className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getRoleBadgeColor(
                  user?.role,
                )}`}
              >
                {getRoleIcon(user?.role)}
                {user?.role}
              </span>
            </div>
            <div className="text-[11px] text-slate-500 truncate">{user?.email}</div>
          </div>

          <button
            onClick={() => logoutMutation.mutate()}
            disabled={logoutMutation.isPending}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 border border-slate-200 hover:border-red-200 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
