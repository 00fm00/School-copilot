import { createFileRoute } from '@tanstack/react-router';
import React from 'react';
import { FileText } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/admin/documents')({
  component: AdminDocumentsPage,
});

function AdminDocumentsPage() {
  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span>Document Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload PDFs, configure role/class visibility, and monitor ingestion queues.
          </p>
        </div>
      </div>

      <div className="p-12 text-center bg-white rounded-xl border border-slate-200 shadow-sm">
        <p className="text-sm text-slate-500">
          Documents interface initialized (Phase 2 CRUD ready)
        </p>
      </div>
    </div>
  );
}
