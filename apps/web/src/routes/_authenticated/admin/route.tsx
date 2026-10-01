import { createFileRoute, redirect, Outlet } from '@tanstack/react-router';
import React from 'react';
import { Role } from '@school-copilot/shared';
import { authStore } from '../../../lib/auth-store';

export const Route = createFileRoute('/_authenticated/admin')({
  beforeLoad: () => {
    const user = authStore.getUser();
    if (!user || user.role !== Role.ADMIN) {
      throw redirect({ to: '/chat' });
    }
  },
  component: () => <Outlet />,
});
