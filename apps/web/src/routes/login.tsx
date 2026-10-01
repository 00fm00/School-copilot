import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import React, { useState } from 'react';
import { LoginInput, LoginSchema } from '@school-copilot/shared';
import { loginUser } from '../api/auth';
import { getErrorMessage } from '../api/client';
import { authStore } from '../lib/auth-store';
import { Shield, Lock, Mail, Loader2, Sparkles } from 'lucide-react';

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

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
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

  const handleQuickFill = (email: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', 'Password123!', { shouldValidate: true });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 to-indigo-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-200 p-8">
        <div className="text-center mb-8">
          <div className="inline-flex p-3 rounded-2xl bg-indigo-600 text-white mb-3 shadow-md">
            <Shield className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">School ERP Copilot</h1>
          <p className="text-sm text-slate-500 mt-1">Sign in with role-aware credentials</p>
        </div>

        {serverError && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
            <span>{serverError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                {...register('email')}
                type="email"
                placeholder="name@school.local"
                className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border ${
                  errors.email
                    ? 'border-red-400 focus:ring-red-300'
                    : 'border-slate-300 focus:ring-indigo-400'
                } focus:outline-none focus:ring-2`}
              />
            </div>
            {errors.email && (
              <p className="mt-1 text-xs text-red-500 font-medium">{errors.email.message}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                {...register('password')}
                type="password"
                placeholder="••••••••"
                className={`w-full pl-9 pr-3 py-2 text-sm rounded-lg border ${
                  errors.password
                    ? 'border-red-400 focus:ring-red-300'
                    : 'border-slate-300 focus:ring-indigo-400'
                } focus:outline-none focus:ring-2`}
              />
            </div>
            {errors.password && (
              <p className="mt-1 text-xs text-red-500 font-medium">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition-all duration-150 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Signing in...</span>
              </>
            ) : (
              <span>Sign In</span>
            )}
          </button>
        </form>

        {/* Demo Accounts Quick-Fill Section */}
        <div className="mt-8 pt-6 border-t border-slate-100">
          <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Demo Test Accounts:</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => handleQuickFill('admin@school.local')}
              className="px-2.5 py-1.5 rounded-lg border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-medium transition-colors"
            >
              Admin
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('teacher.math@school.local')}
              className="px-2.5 py-1.5 rounded-lg border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-medium transition-colors"
            >
              Teacher
            </button>
            <button
              type="button"
              onClick={() => handleQuickFill('parent.smith@school.local')}
              className="px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-medium transition-colors"
            >
              Parent
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
