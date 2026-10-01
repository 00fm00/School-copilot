import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import React from 'react';
import { UserDto } from '@school-copilot/shared';

export interface RouterContext {
  queryClient: QueryClient;
  auth: {
    isAuthenticated: () => boolean;
    getUser: () => UserDto | null;
  };
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <div className="min-h-screen bg-slate-50 text-slate-900 antialiased">
      <Outlet />
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex h-screen items-center justify-center bg-slate-50">
      <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-slate-200">
        <h1 className="text-4xl font-extrabold text-indigo-600">404</h1>
        <p className="mt-2 text-slate-600 font-medium">Page Not Found</p>
        <p className="text-xs text-slate-400 mt-1">The requested page does not exist.</p>
        <a
          href="/"
          className="mt-4 inline-block px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 transition-colors"
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  ),
});
