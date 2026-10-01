import React from 'react';

export function App() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-xl shadow-md p-6 text-center border border-slate-200">
        <h1 className="text-2xl font-bold text-indigo-600 mb-2">School ERP Copilot</h1>
        <p className="text-slate-600 text-sm mb-4">
          Role-aware RAG assistant for school administrators, teachers, and parents.
        </p>
        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
          System Initialized
        </div>
      </div>
    </div>
  );
}

export default App;
