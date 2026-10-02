import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import React, { useState } from 'react';
import { LoginInput, LoginSchema } from '@school-copilot/shared';
import { loginUser } from '../api/auth';
import { getErrorMessage } from '../api/client';
import { authStore } from '../lib/auth-store';
import {
  Shield,
  Lock,
  Mail,
  Loader2,
  Sparkles,
  CheckCircle2,
  FileCheck,
  Layers,
  ArrowRight,
} from 'lucide-react';

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
  const [selectedPersona, setSelectedPersona] = useState<string>('admin@school.local');

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

  const handleQuickFill = (email: string) => {
    setSelectedPersona(email);
    setValue('email', email, { shouldValidate: true });
    setValue('password', 'Password123!', { shouldValidate: true });
  };

  const personas = [
    {
      role: 'Administrator',
      email: 'admin@school.local',
      scope: 'Full Ingestion & Governance',
      badge: 'Admin Access',
      badgeStyle: 'bg-purple-100/80 text-purple-900 border-purple-200',
    },
    {
      role: 'Faculty / Teacher',
      email: 'teacher.math@school.local',
      scope: 'Class Schedules & Curricula',
      badge: 'Faculty Access',
      badgeStyle: 'bg-blue-100/80 text-blue-900 border-blue-200',
    },
    {
      role: 'Guardian / Parent',
      email: 'parent.smith@school.local',
      scope: 'Fee Schedules & School Calendar',
      badge: 'Parent Portal',
      badgeStyle: 'bg-emerald-100/80 text-emerald-900 border-emerald-200',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-[#0B0F19] text-slate-100">
      {/* Left Institutional Showcase Panel (Desktop) */}
      <div className="lg:w-1/2 p-8 lg:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-slate-800/80 relative overflow-hidden bg-radial from-slate-900 via-[#0B0F19] to-[#070A10]">
        {/* Ambient Top Light */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Top Brand Monogram */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center shadow-inner">
              <span className="text-sm font-black tracking-wider text-slate-100">SC</span>
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">School ERP Copilot</h1>
              <p className="text-[11px] text-slate-400 font-medium tracking-wide">
                Institutional Knowledge & Policy Assistant
              </p>
            </div>
          </div>
        </div>

        {/* Central Architecture Highlights */}
        <div className="my-12 lg:my-0 relative z-10 max-w-lg space-y-6">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[11px] font-semibold mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
              Enterprise Role-Based Grounding
            </div>
            <h2 className="text-3xl font-extrabold tracking-tight text-white leading-tight">
              Verified answers strictly grounded in official school records.
            </h2>
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">
              Designed specifically for educational institutions to eliminate AI hallucinations and
              strictly enforce student privacy, faculty boundaries, and parent visibility rules.
            </p>
          </div>

          <div className="space-y-3.5 pt-2">
            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <div className="p-2 rounded-lg bg-slate-800 text-slate-300 shrink-0">
                <Shield className="w-4 h-4 text-emerald-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Zero Data-Leakage RBAC</p>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Strict hardware and query level segmentation ensures parents and faculty only
                  query verified documents they are authorized to view.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <div className="p-2 rounded-lg bg-slate-800 text-slate-300 shrink-0">
                <FileCheck className="w-4 h-4 text-sky-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Verifiable Line Citations</p>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Every answer provides interactive citation chips directly referencing source
                  policy documents and page snippets.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800/60">
              <div className="p-2 rounded-lg bg-slate-800 text-slate-300 shrink-0">
                <Layers className="w-4 h-4 text-purple-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-white">Cloud CDN Document Ingestion</p>
                <p className="text-[11px] text-slate-400 leading-normal">
                  Uploaded institutional PDFs are vectorized, chunked, and safely hosted on
                  Cloudinary CDN for instant preview.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Trust Stamp */}
        <div className="relative z-10 flex items-center justify-between text-[11px] text-slate-500 pt-6 border-t border-slate-800/80">
          <span>Compliant with Institutional Data Standards</span>
          <span className="font-mono text-slate-400">v1.0 Production Ready</span>
        </div>
      </div>

      {/* Right Login & Persona Selection Panel */}
      <div className="lg:w-1/2 bg-slate-50 text-slate-900 flex flex-col justify-center items-center p-6 md:p-12 lg:p-16">
        <div className="max-w-md w-full">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Sign in to your account
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select a demo test persona below or enter your authorized credentials.
            </p>
          </div>

          {serverError && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2.5">
              <span>{serverError}</span>
            </div>
          )}

          {/* Quick-Fill Persona Switcher */}
          <div className="mb-6 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>Select Test Persona (1-Click Switch)</span>
            </div>

            <div className="grid grid-cols-1 gap-2">
              {personas.map((p) => {
                const isSelected = selectedPersona === p.email;
                return (
                  <button
                    key={p.email}
                    type="button"
                    onClick={() => handleQuickFill(p.email)}
                    className={`p-3 rounded-xl border text-left transition-all flex items-center justify-between group ${
                      isSelected
                        ? 'border-slate-900 bg-white shadow-xs ring-1 ring-slate-900'
                        : 'border-slate-200/90 bg-white/70 hover:bg-white hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{p.role}</span>
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full border font-semibold ${p.badgeStyle}`}
                        >
                          {p.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">{p.scope}</p>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 group-hover:text-slate-900 transition-colors">
                      <span>Use</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Standard Credentials Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  {...register('email')}
                  type="email"
                  placeholder="name@school.local"
                  className={`w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border ${
                    errors.email
                      ? 'border-red-400 focus:ring-red-300'
                      : 'border-slate-200 focus:ring-slate-900 focus:border-slate-900'
                  } focus:outline-none focus:ring-2 bg-white text-slate-900 shadow-xs transition-all`}
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-[11px] text-red-600 font-medium">{errors.email.message}</p>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  {...register('password')}
                  type="password"
                  placeholder="••••••••"
                  className={`w-full pl-10 pr-3.5 py-2.5 text-xs rounded-xl border ${
                    errors.password
                      ? 'border-red-400 focus:ring-red-300'
                      : 'border-slate-200 focus:ring-slate-900 focus:border-slate-900'
                  } focus:outline-none focus:ring-2 bg-white text-slate-900 shadow-xs transition-all`}
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-[11px] text-red-600 font-medium">
                  {errors.password.message}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full mt-2 py-2.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-all duration-150 flex items-center justify-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-white" />
                  <span>Authenticating credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to School ERP</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          {/* Footer note */}
          <p className="text-[11px] text-slate-400 text-center mt-6">
            Default test account password is{' '}
            <span className="font-mono text-slate-600">Password123!</span>
          </p>
        </div>
      </div>
    </div>
  );
}
