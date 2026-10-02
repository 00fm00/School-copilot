import React, { useState, useRef } from 'react';
import { Role } from '@school-copilot/shared';
import { useClasses, useUploadDocument } from '../../api/hooks/useDocuments';
import { getErrorMessage } from '../../api/client';
import {
  UploadCloud,
  X,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Shield,
  GraduationCap,
  Users,
} from 'lucide-react';

interface UploadDocumentDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadDocumentDialog({ isOpen, onClose }: UploadDocumentDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [audienceRoles, setAudienceRoles] = useState<Role[]>([Role.TEACHER, Role.PARENT]);
  const [isAllClasses, setIsAllClasses] = useState(true);
  const [selectedClasses, setSelectedClasses] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: classes = [] } = useClasses();
  const uploadMutation = useUploadDocument();

  if (!isOpen) return null;

  const validateAndSetFile = async (candidateFile: File) => {
    setError(null);
    if (!candidateFile.name.toLowerCase().endsWith('.pdf')) {
      setError('Only PDF documents are supported for vector ingestion.');
      return;
    }

    if (candidateFile.size > 20 * 1024 * 1024) {
      setError('File size exceeds the 20 MB system limit.');
      return;
    }

    // Verify magic bytes %PDF on client
    try {
      const slice = candidateFile.slice(0, 4);
      const buffer = await slice.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      const isPdfHeader =
        bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
      if (!isPdfHeader) {
        setError('Selected file is not a valid PDF binary.');
        return;
      }
    } catch {
      // Fallback
    }

    setFile(candidateFile);
    if (!title) {
      setTitle(candidateFile.name.replace(/\.pdf$/i, ''));
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetFile(e.dataTransfer.files[0]);
    }
  };

  const handleRoleToggle = (role: Role) => {
    setAudienceRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role],
    );
  };

  const handleClassToggle = (classId: string) => {
    setSelectedClasses((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!file) {
      setError('Please select a valid PDF file to upload.');
      return;
    }
    if (!title.trim()) {
      setError('Please provide a document title.');
      return;
    }
    if (audienceRoles.length === 0) {
      setError('Select at least one audience role.');
      return;
    }
    if (!isAllClasses && selectedClasses.length === 0) {
      setError('Select at least one class or check "School-wide".');
      return;
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('title', title.trim());
    formData.append('audienceRoles', JSON.stringify(audienceRoles));
    formData.append('classScope', JSON.stringify(isAllClasses ? ['ALL'] : selectedClasses));

    try {
      await uploadMutation.mutateAsync(formData);
      onClose();
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  };

  const rolesConfig = [
    { role: Role.ADMIN, label: 'Administrator', desc: 'Internal admin & staff', icon: Shield },
    {
      role: Role.TEACHER,
      label: 'Faculty / Teacher',
      desc: 'Curriculum & faculty',
      icon: GraduationCap,
    },
    { role: Role.PARENT, label: 'Guardian / Parent', desc: 'Parents & students', icon: Users },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200/90 max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-5 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Institutional Pipeline
              </span>
            </div>
            <h2 className="text-base font-bold text-slate-900 mt-0.5">Ingest School Document</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5">
          {error && (
            <div className="p-3.5 rounded-xl bg-red-50/80 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* PDF Drag & Drop Zone */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              PDF Source File
            </label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                file
                  ? 'border-emerald-400 bg-emerald-50/40'
                  : 'border-slate-300 hover:border-slate-400 hover:bg-slate-50/80'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    validateAndSetFile(e.target.files[0]);
                  }
                }}
              />
              {file ? (
                <div className="flex items-center justify-between gap-3 text-emerald-900">
                  <div className="flex items-center gap-3 text-left">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-900">{file.name}</p>
                      <p className="text-[11px] text-emerald-700 font-medium">
                        {(file.size / 1024 / 1024).toFixed(2)} MB • Verified PDF header
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="text-xs text-slate-400 hover:text-red-600 p-1 font-medium transition-colors"
                  >
                    Replace
                  </button>
                </div>
              ) : (
                <div className="py-2">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto mb-2.5">
                    <UploadCloud className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    Click to select file or drop PDF here
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Maximum size: 20 MB • Auto-chunked & vectorized
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Document Display Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Leave Policy & Academic Calendar 2026"
              className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all text-slate-900 placeholder:text-slate-400 bg-white"
            />
          </div>

          {/* Audience Roles Cards */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Audience Role Governance (RBAC)
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {rolesConfig.map(({ role, label, desc, icon: Icon }) => {
                const isSelected = audienceRoles.includes(role);
                return (
                  <button
                    key={role}
                    type="button"
                    onClick={() => handleRoleToggle(role)}
                    className={`p-3 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'border-slate-900 bg-slate-900 text-white shadow-xs'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100/70 text-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <Icon className={`w-4 h-4 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                      <div
                        className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected
                            ? 'border-white bg-white text-slate-900'
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-bold">{label}</p>
                      <p
                        className={`text-[10px] mt-0.5 ${isSelected ? 'text-slate-300' : 'text-slate-400'}`}
                      >
                        {desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Class Scope */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Class Scope & Restrictions
            </label>
            <div className="flex items-center gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200 mb-2.5">
              <input
                id="all-classes-check"
                type="checkbox"
                checked={isAllClasses}
                onChange={(e) => {
                  setIsAllClasses(e.target.checked);
                  if (e.target.checked) setSelectedClasses([]);
                }}
                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900"
              />
              <label
                htmlFor="all-classes-check"
                className="text-xs font-semibold text-slate-800 cursor-pointer"
              >
                School-wide (Visible to All Classes)
              </label>
            </div>

            {!isAllClasses && (
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-3 rounded-xl border border-slate-200 bg-slate-50/50">
                {classes.map((cls) => (
                  <label
                    key={cls.id}
                    className="flex items-center gap-2 text-xs text-slate-700 hover:text-slate-900 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedClasses.includes(cls.id)}
                      onChange={() => handleClassToggle(cls.id)}
                      className="w-3.5 h-3.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900 accent-slate-900"
                    />
                    <span className="font-medium">{cls.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadMutation.isPending}
              className="px-5 py-2.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition-all flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Processing & Ingesting...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Ingest & Vectorize</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
