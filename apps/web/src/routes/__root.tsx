import { createRootRouteWithContext, Outlet } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import React from 'react';

export interface RouterContext {
  queryClient: QueryClient;
  auth: {
    isAuthenticated: boolean;
    user: any | null;
  };
}

export const Route = createRootRouteWithContext<RouterContext>()({
  component: () => (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Outlet />
    </div>
  ),
  notFoundComponent: () => (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-slate-800">404</h1>
        <p className="mt-2 text-slate-600">Page not found</p>
        <a href="/" className="mt-4 inline-block text-indigo-600 hover:underline">
          Go Home
        </a>
      </div>
    </div>
  ),
});
