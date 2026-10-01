import { createFileRoute } from '@tanstack/react-router';
import React, { useState } from 'react';
import { useDocuments } from '../../../api/hooks/useDocuments';
import { DocumentsTable } from '../../../components/documents/DocumentsTable';
import { UploadDocumentDialog } from '../../../components/documents/UploadDocumentDialog';
import { FileText, Plus, RefreshCw } from 'lucide-react';

export const Route = createFileRoute('/_authenticated/admin/documents')({
  component: AdminDocumentsPage,
});

function AdminDocumentsPage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const { data, isLoading, refetch, isRefetching } = useDocuments(1, 50);

  return (
    <div className="p-8 max-w-7xl w-full mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-indigo-600" />
            <span>Document Management</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Upload school PDFs, configure role/class visibility rules, and monitor real-time
            ingestion status.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => refetch()}
            disabled={isRefetching}
            className="p-2 text-slate-500 hover:text-slate-800 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors shadow-sm"
            title="Refresh documents list"
          >
            <RefreshCw className={`w-4 h-4 ${isRefetching ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      {/* Documents Table */}
      <DocumentsTable documents={data?.items || []} isLoading={isLoading} />

      {/* Upload Modal */}
      <UploadDocumentDialog isOpen={isUploadOpen} onClose={() => setIsUploadOpen(false)} />
    </div>
  );
}
