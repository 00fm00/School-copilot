import React, { useRef, useState } from 'react';
import { DocumentDto, DocumentStatus, Role } from '@school-copilot/shared';
import {
  useDeleteDocument,
  useReindexDocument,
  useReplaceDocument,
} from '../../api/hooks/useDocuments';
import {
  Clock,
  Loader2,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  Upload,
  Trash2,
} from 'lucide-react';

interface DocumentsTableProps {
  documents: DocumentDto[];
  isLoading: boolean;
}

export function DocumentsTable({ documents, isLoading }: DocumentsTableProps) {
  const deleteMutation = useDeleteDocument();
  const reindexMutation = useReindexDocument();
  const replaceMutation = useReplaceDocument();

  const [replacingDocId, setReplacingDocId] = useState<string | null>(null);
  const replaceFileInputRef = useRef<HTMLInputElement>(null);

  const handleTriggerReplace = (docId: string) => {
    setReplacingDocId(docId);
    replaceFileInputRef.current?.click();
  };

  const handleFileReplacement = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!replacingDocId || !e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    const formData = new FormData();
    formData.append('file', file);
    try {
      await replaceMutation.mutateAsync({ id: replacingDocId, formData });
    } finally {
      setReplacingDocId(null);
      if (replaceFileInputRef.current) {
        replaceFileInputRef.current.value = '';
      }
    }
  };

  const renderStatusBadge = (doc: DocumentDto) => {
    switch (doc.status) {
      case DocumentStatus.QUEUED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3.5 h-3.5 animate-pulse text-amber-500" />
            <span>Queued</span>
          </span>
        );
      case DocumentStatus.PROCESSING:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
            <span>Processing</span>
          </span>
        );
      case DocumentStatus.READY:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
            <span>Ready</span>
          </span>
        );
      case DocumentStatus.FAILED:
        return (
          <span
            title={doc.errorMessage || 'Ingestion failed'}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-50 text-rose-700 border border-rose-200 cursor-help"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
            <span>Failed</span>
          </span>
        );
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <input
        ref={replaceFileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileReplacement}
      />

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider">
              <th className="py-3 px-4">Document Title</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Audience</th>
              <th className="py-3 px-4">Class Scope</th>
              <th className="py-3 px-4">Pages</th>
              <th className="py-3 px-4">Uploaded</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-500" />
                  <span>Loading documents...</span>
                </td>
              </tr>
            ) : documents.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-12 text-center text-slate-400">
                  No documents uploaded yet. Click "Upload Document" to add your first PDF.
                </td>
              </tr>
            ) : (
              documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-4 font-medium text-slate-900">
                    <div className="font-semibold text-slate-900">{doc.title}</div>
                    <div className="text-[11px] text-slate-400">
                      {doc.originalName} • v{doc.version}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">{renderStatusBadge(doc)}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {doc.audienceRoles.map((role) => (
                        <span
                          key={role}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700"
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-slate-600">
                      {doc.classScope.includes('ALL')
                        ? 'All Classes'
                        : `${doc.classScope.length} class(es)`}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-600">
                    {doc.pageCount ? `${doc.pageCount} pgs` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        title="Replace PDF file"
                        onClick={() => handleTriggerReplace(doc.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Reindex document"
                        onClick={() => reindexMutation.mutate(doc.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Delete document"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${doc.title}"?`)) {
                            deleteMutation.mutate(doc.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
