import { createFileRoute } from '@tanstack/react-router';
import React, { useState } from 'react';
import { DocumentStatus } from '@school-copilot/shared';
import { useDocuments } from '../../../api/hooks/useDocuments';
import { DocumentsTable } from '../../../components/documents/DocumentsTable';
import { UploadDocumentDialog } from '../../../components/documents/UploadDocumentDialog';
import { FileText, Plus, RefreshCw, Database, Cloud, ShieldCheck, Layers } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/admin/documents')({
  component: AdminDocumentsPage,
});

function AdminDocumentsPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const { data, isLoading, refetch, isRefetching } = useDocuments(1, 50);

  const documents = data?.items || [];
  const totalDocs = data?.total ?? documents.length;
  const readyDocs = documents.filter((d) => d.status === DocumentStatus.READY).length;
  const cloudDocs = documents.filter((d) => !!d.fileUrl && d.fileUrl.startsWith('http')).length;
  const schoolWideDocs = documents.filter(
    (d) => d.classScope.includes('ALL') || d.classScope.length === 0,
  ).length;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded-full bg-slate-900 text-[10px] font-semibold tracking-wider text-slate-200 uppercase">
              Admin Governance
            </span>
            <span className="text-xs text-slate-400">• Institutional Repository</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-slate-800" />
            <span>Document Management & Ingestion</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-2xl">
            Upload institutional PDFs, manage role-based access controls (RBAC), and monitor
            real-time vector embeddings and cloud ingestion states.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2 text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-xs"
            title="Refresh repository"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin text-slate-900' : ''}`} />
          </button>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Total Documents</span>
            <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {isLoading ? '...' : totalDocs}
            </span>
            <span className="text-[11px] text-slate-400">indexed</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Vector Ready</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-700">
              {isLoading ? '...' : readyDocs}
            </span>
            <span className="text-[11px] text-emerald-600 font-medium">grounded in AI</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Cloud Storage CDN</span>
            <div className="w-8 h-8 rounded-lg bg-sky-50 flex items-center justify-center text-sky-700">
              <Cloud className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-sky-800">{isLoading ? '...' : cloudDocs}</span>
            <span className="text-[11px] text-sky-600 font-medium">Cloudinary synced</span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">School-Wide Scope</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-700">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {isLoading ? '...' : schoolWideDocs}
            </span>
            <span className="text-[11px] text-slate-400">all classes</span>
          </div>
        </div>
      </div>

      {/* Documents Table */}
      <DocumentsTable documents={documents} isLoading={isLoading} />

      {/* Upload Modal */}
      <UploadDocumentDialog isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </div>
  );
}
