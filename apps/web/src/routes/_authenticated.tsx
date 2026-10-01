import { createFileRoute, redirect } from '@tanstack/react-router';
import React from 'react';
import { authStore } from '../lib/auth-store';
import { refreshUser } from '../api/auth';
import { AppShell } from '../components/layout/AppShell';

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({ location }) => {
    if (!authStore.isAuthenticated()) {
      try {
        await refreshUser();
      } catch {
        throw redirect({
          to: '/login',
          search: {
            redirect: location.href,
          },
        });
      }
    }
  },
  component: () => <AppShell />,
});
