import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiClient } from '../services/api';
import { FileText, ArrowRight, Trash2, Calendar, Hospital, CheckCircle2, Clock } from 'lucide-react';
import { MedicalDocument } from '../types';

export const DocumentsListPage: React.FC = () => {
  const [documents, setDocuments] = useState<MedicalDocument[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/documents');
      setDocuments(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, []);

  const handleDelete = async (docId: number, e: React.MouseEvent) => {
    e.preventDefault();
    if (!window.confirm('Delete this medical document and remove its extracted records?')) return;
    try {
      await apiClient.delete(`/documents/${docId}`);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
    } catch (err) {
      alert('Failed to delete document.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-slate-800">My Medical Documents</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            View, review, and manage all your uploaded clinical records and lab reports.
          </p>
        </div>
        <Link
          to="/upload"
          className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white font-medium text-xs rounded-xl shadow-xs transition"
        >
          + Upload Document
        </Link>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-500">Loading documents...</div>
      ) : documents.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700 text-sm">No medical records uploaded</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Upload your laboratory tests, prescriptions, or discharge summaries to see them organized here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-teal-300 p-5 shadow-xs flex flex-col justify-between transition group"
            >
              <div>
                <div className="flex items-start justify-between">
                  <span className="px-2 py-0.5 text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200 rounded-md">
                    {doc.category.replace('_', ' ').toUpperCase()}
                  </span>
                  <button
                    onClick={(e) => handleDelete(doc.id, e)}
                    className="text-slate-400 hover:text-red-500 transition p-1"
                    title="Delete document"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <h3 className="text-sm font-semibold text-slate-800 mt-3 line-clamp-1 group-hover:text-teal-700 transition">
                  {doc.original_filename}
                </h3>

                <div className="mt-3 space-y-1.5 text-xs text-slate-500">
                  <div className="flex items-center space-x-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>Report Date: {doc.document_date || 'Not specified'}</span>
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <Hospital className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{doc.healthcare_provider || 'Facility not specified'}</span>
                  </div>
                </div>

                {doc.summary && (
                  <p className="mt-3 text-xs text-slate-600 line-clamp-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                    {doc.summary}
                  </p>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400">
                  {(doc.file_size_bytes / 1024).toFixed(0)} KB • {doc.ocr_applied ? 'OCR Applied' : 'Digital PDF'}
                </span>
                <Link
                  to={`/documents/${doc.id}`}
                  className="inline-flex items-center text-xs font-semibold text-teal-600 hover:text-teal-700"
                >
                  Inspect & Review <ArrowRight className="w-3.5 h-3.5 ml-1" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
