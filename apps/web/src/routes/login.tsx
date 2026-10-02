import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import React, { useState } from 'react';
import { LoginInput, LoginSchema } from '@school-copilot/shared';
import { loginUser } from '../api/auth';
import { getErrorMessage } from '../api/client';
import { authStore } from '../lib/auth-store';
import { Loader2 } from 'lucide-react';

const LoginSearchSchema = z.object({
  redirect: z.string().optional(),
});

export const Route = createFileRoute('/login')({
  validateSearch: (search) => LoginSearchSchema.parse(search),
  beforeLoad: ({ context }) => {
    if (context.auth.isAuthenticated()) {
      throw redirect({ to: '/chat' });
    }
  },
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const [serverError, setServerError] = useState<string | null>(null);
  const [activePersona, setActivePersona] = useState<string>('admin@school.local');

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: 'admin@school.local',
      password: 'Password123!',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    setServerError(null);
    try {
      await loginUser(data);
      const target = search.redirect || '/chat';
      navigate({ to: target as any });
    } catch (err: unknown) {
      setServerError(getErrorMessage(err));
    }
  };

  const handleSelectPersona = (email: string) => {
    setActivePersona(email);
    setValue('email', email, { shouldValidate: true });
    setValue('password', 'Password123!', { shouldValidate: true });
  };

  const personas = [
    { label: 'Admin', email: 'admin@school.local' },
    { label: 'Teacher', email: 'teacher.math@school.local' },
    { label: 'Parent', email: 'parent.smith@school.local' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0D14] flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      {/* Subtle ambient glow in center */}
      <div className="absolute top-1/4 w-[420px] h-[260px] bg-slate-800/20 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex w-10 h-10 rounded-xl bg-slate-900 border border-white/10 items-center justify-center text-slate-100 font-bold text-xs shadow-xs mb-3 tracking-wider">
            SC
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-white">School ERP Copilot</h1>
          <p className="text-xs text-slate-400 mt-1">Sign in to your account</p>
        </div>

        {/* Minimal Login Card */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-white/10 rounded-2xl p-6 sm:p-7 shadow-xl space-y-5">
          {/* Quick Demo Persona Switcher */}
          <div>
            <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 mb-2">
              <span>Quick test account</span>
            </div>
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-black/40 border border-white/5">
              {personas.map((p) => {
                const isSelected = activePersona === p.email;
                return (
                  <button
                    key={p.email}
                    type="button"
                    onClick={() => handleSelectPersona(p.email)}
                    className={`py-1 px-2 text-xs font-medium rounded-md transition-all ${
                      isSelected
                        ? 'bg-slate-800 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {serverError && (
            <div className="p-3 rounded-lg bg-red-950/50 border border-red-800/60 text-red-200 text-xs font-medium">
              {serverError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1.5">
                Email address
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="name@school.local"
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-black/30 text-white placeholder:text-slate-500 transition-colors ${
                  errors.email
                    ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-white/10 focus:border-white/30 focus:ring-1 focus:ring-white/20'
                } focus:outline-none`}
              />
              {errors.email && (
                <p className="mt-1 text-[11px] text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1.5">
                Password
              </label>
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className={`w-full px-3 py-2 text-xs rounded-lg border bg-black/30 text-white placeholder:text-slate-500 transition-colors ${
                  errors.password
                    ? 'border-red-500 focus:ring-1 focus:ring-red-500'
                    : 'border-white/10 focus:border-white/30 focus:ring-1 focus:ring-white/20'
                } focus:outline-none`}
              />
              {errors.password && (
                <p className="mt-1 text-[11px] text-red-400">{errors.password.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-1 py-2.5 px-4 rounded-lg bg-white hover:bg-slate-100 text-slate-950 font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Signing in...</span>
                </>
              ) : (
                <span>Continue</span>
              )}
            </button>
          </form>
        </div>

        {/* Minimal Footer */}
        <p className="text-[11px] text-slate-500 text-center mt-6">
          Institutional access is governed by role permissions.
        </p>
      </div>
    </div>
  );
}
