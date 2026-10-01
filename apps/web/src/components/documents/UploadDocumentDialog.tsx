import React, { useState, useRef } from 'react';
import { Role } from '@school-copilot/shared';
import { useClasses, useUploadDocument } from '../../api/hooks/useDocuments';
import { getErrorMessage } from '../../api/client';
import { UploadCloud, X, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

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
      setError('Only PDF files are supported.');
      return;
    }

    if (candidateFile.size > 20 * 1024 * 1024) {
      setError('File size exceeds maximum permitted 20 MB.');
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
        setError('Selected file is not a valid PDF document.');
        return;
      }
    } catch {
      // Fallback if arrayBuffer is unavailable
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
      setError('Please select a PDF file to upload.');
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
      setError('Select at least one class or check "All Classes".');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-indigo-600" />
            <h2 className="font-semibold text-slate-900">Upload School Document</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* PDF Drag & Drop Zone */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
              Document File (PDF up to 20 MB)
            </label>
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
                file
                  ? 'border-emerald-400 bg-emerald-50/30'
                  : 'border-slate-300 hover:border-indigo-400 hover:bg-slate-50'
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
                <div className="flex items-center justify-center gap-3 text-emerald-800">
                  <CheckCircle2 className="w-6 h-6 text-emerald-600" />
                  <div className="text-left">
                    <p className="text-xs font-semibold">{file.name}</p>
                    <p className="text-[11px] text-emerald-600">
                      {(file.size / 1024 / 1024).toFixed(2)} MB • Verified PDF
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  <UploadCloud className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-medium text-slate-700">
                    Click to browse or drag and drop your PDF
                  </p>
                  <p className="text-[11px] text-slate-400 mt-0.5">Maximum file size: 20 MB</p>
                </div>
              )}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 uppercase tracking-wider">
              Document Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Leave Policy 2026"
              className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-400"
            />
          </div>

          {/* Audience Roles Checkboxes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Audience Roles
            </label>
            <div className="flex items-center gap-4">
              {[Role.ADMIN, Role.TEACHER, Role.PARENT].map((role) => (
                <label
                  key={role}
                  className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700"
                >
                  <input
                    type="checkbox"
                    checked={audienceRoles.includes(role)}
                    onChange={() => handleRoleToggle(role)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span>{role}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Class Scope */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 uppercase tracking-wider">
              Class Scope
            </label>
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-slate-700 mb-2">
              <input
                type="checkbox"
                checked={isAllClasses}
                onChange={(e) => {
                  setIsAllClasses(e.target.checked);
                  if (e.target.checked) setSelectedClasses([]);
                }}
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span className="font-semibold text-indigo-700">All Classes (School-wide)</span>
            </label>

            {!isAllClasses && (
              <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2 rounded-lg border border-slate-200 bg-slate-50">
                {classes.map((cls) => (
                  <label
                    key={cls.id}
                    className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={selectedClasses.includes(cls.id)}
                      onChange={() => handleClassToggle(cls.id)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>{cls.name}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Footer Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadMutation.isPending}
              className="px-5 py-2 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
            >
              {uploadMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading & Enqueuing...</span>
                </>
              ) : (
                <span>Upload Document</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
