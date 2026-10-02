import React, { useRef, useState, useMemo } from 'react';
import { DocumentDto, DocumentStatus, Role } from '@school-copilot/shared';
import {
  useDeleteDocument,
  useReindexDocument,
  useReplaceDocument,
} from '../../api/hooks/useDocuments';
import {
  Clock,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Upload,
  Trash2,
  Eye,
  ExternalLink,
  Search,
  FileText,
  Filter,
} from 'lucide-react';

interface DocumentsTableProps {
  documents: DocumentDto[];
  isLoading: boolean;
}

export function DocumentsTable({ documents, isLoading }: DocumentsTableProps) {
  const deleteMutation = useDeleteDocument();
  const reindexMutation = useReindexDocument();
  const replaceMutation = useReplaceDocument();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('ALL');
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

  const filteredDocuments = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch =
        searchQuery === '' ||
        doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        doc.originalName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesRole =
        selectedRole === 'ALL' || doc.audienceRoles.includes(selectedRole as Role);

      return matchesSearch && matchesRole;
    });
  }, [documents, searchQuery, selectedRole]);

  const renderStatusBadge = (doc: DocumentDto) => {
    switch (doc.status) {
      case DocumentStatus.QUEUED:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-500/10 text-amber-700 border border-amber-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
            <span>Queued</span>
          </span>
        );
      case DocumentStatus.PROCESSING:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-indigo-500/10 text-indigo-700 border border-indigo-500/20">
            <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />
            <span>Processing</span>
          </span>
        );
      case DocumentStatus.READY:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-700 border border-emerald-500/20">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span>Ready</span>
          </span>
        );
      case DocumentStatus.FAILED:
        return (
          <span
            title={doc.errorMessage || 'Ingestion failed'}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-700 border border-rose-500/20 cursor-help"
          >
            <AlertTriangle className="w-3 h-3 text-rose-500" />
            <span>Failed</span>
          </span>
        );
    }
  };

  const getRoleBadgeStyle = (role: Role) => {
    switch (role) {
      case Role.ADMIN:
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case Role.TEACHER:
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case Role.PARENT:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
      <input
        ref={replaceFileInputRef}
        type="file"
        accept=".pdf"
        className="hidden"
        onChange={handleFileReplacement}
      />

      {/* Filter & Search Header */}
      <div className="p-4 px-6 border-b border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter documents..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-white rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-800 placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <span className="text-[11px] text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" /> Role:
          </span>
          {['ALL', Role.ADMIN, Role.TEACHER, Role.PARENT].map((role) => (
            <button
              key={role}
              onClick={() => setSelectedRole(role)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
                selectedRole === role
                  ? 'bg-slate-900 text-white shadow-sm'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              {role === 'ALL' ? 'All Roles' : role}
            </button>
          ))}
        </div>
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-5">Document</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Audience</th>
              <th className="py-3 px-4">Class Scope</th>
              <th className="py-3 px-4">Pages</th>
              <th className="py-3 px-4">Uploaded</th>
              <th className="py-3 px-5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-400">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                  <span className="text-xs font-medium">Loading document catalog...</span>
                </td>
              </tr>
            ) : filteredDocuments.length === 0 ? (
              <tr>
                <td colSpan={7} className="py-16 text-center text-slate-400">
                  <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                  <p className="text-slate-600 font-medium text-xs">No matching documents found</p>
                  <p className="text-slate-400 text-[11px] mt-0.5">
                    {searchQuery
                      ? 'Try clearing your filter'
                      : 'Upload your first school PDF to begin'}
                  </p>
                </td>
              </tr>
            ) : (
              filteredDocuments.map((doc) => (
                <tr key={doc.id} className="hover:bg-slate-50/60 transition-colors group">
                  <td className="py-3.5 px-5 font-medium text-slate-900">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">
                        PDF
                      </div>
                      <div className="truncate min-w-0">
                        {doc.fileUrl ? (
                          <a
                            href={doc.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="group/link inline-flex items-center gap-1.5 font-semibold text-slate-900 hover:text-indigo-600 transition-colors text-xs"
                          >
                            <span className="truncate">{doc.title}</span>
                            <ExternalLink className="w-3 h-3 text-slate-400 group-hover/link:text-indigo-600 transition-colors inline flex-shrink-0" />
                          </a>
                        ) : (
                          <div className="font-semibold text-slate-900 text-xs truncate">
                            {doc.title}
                          </div>
                        )}
                        <div className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                          <span className="truncate">{doc.originalName}</span>
                          <span>•</span>
                          <span className="px-1 py-0.2 rounded bg-slate-100 text-slate-500 font-semibold text-[10px]">
                            v{doc.version}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">{renderStatusBadge(doc)}</td>
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {doc.audienceRoles.map((role) => (
                        <span
                          key={role}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getRoleBadgeStyle(
                            role,
                          )}`}
                        >
                          {role}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="text-slate-600 font-medium text-xs">
                      {doc.classScope.includes('ALL')
                        ? 'All Classes'
                        : `${doc.classScope.length} class(es)`}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-mono text-[11px]">
                    {doc.pageCount ? `${doc.pageCount} pgs` : '—'}
                  </td>
                  <td className="py-3.5 px-4 text-slate-400 font-mono text-[11px]">
                    {new Date(doc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {doc.fileUrl && (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Preview PDF in Cloud CDN"
                          className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/80 transition-colors inline-flex items-center"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </a>
                      )}
                      <button
                        title="Replace PDF file (purges old chunks)"
                        onClick={() => handleTriggerReplace(doc.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/80 transition-colors"
                      >
                        <Upload className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Reindex document vectors"
                        onClick={() => reindexMutation.mutate(doc.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/80 transition-colors"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                      </button>
                      <button
                        title="Delete document and chunks"
                        onClick={() => {
                          if (confirm(`Are you sure you want to delete "${doc.title}"?`)) {
                            deleteMutation.mutate(doc.id);
                          }
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50/80 transition-colors"
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
