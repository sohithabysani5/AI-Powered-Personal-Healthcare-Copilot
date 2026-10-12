import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/api';
import { useApp } from '../context/AppContext';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Info } from 'lucide-react';

export const UploadPage: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progressStatus, setProgressStatus] = useState<string>('');
  const navigate = useNavigate();
  const { t } = useApp();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(selected.type)) {
        setError('Only PDF, JPG, and PNG files are supported.');
        setFile(null);
        return;
      }
      if (selected.size > 20 * 1024 * 1024) {
        setError('File size exceeds the 20MB limit.');
        setFile(null);
        return;
      }
      setError(null);
      setFile(selected);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please choose a file to upload.');
      return;
    }

    try {
      setUploading(true);
      setError(null);
      setProgressStatus('Uploading document securely to private vault...');

      const formData = new FormData();
      formData.append('file', file);

      setTimeout(() => {
        setProgressStatus('Extracting digital text & applying OCR processing...');
      }, 900);

      const res = await apiClient.post('/documents/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setProgressStatus('Extraction complete! Redirecting to review screen...');
      setTimeout(() => {
        navigate(`/documents/${res.data.id}`);
      }, 800);
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to process medical document.');
      setUploading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 md:p-8">
        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center mx-auto mb-3 border border-teal-100">
            <Upload className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-800">Upload Medical Document</h2>
          <p className="text-xs text-slate-500 mt-1">
            Accepts PDF reports, lab tests, prescriptions, and scans (PDF, JPG, PNG up to 20MB).
          </p>
        </div>

        {error && (
          <div className="mb-5 p-3.5 bg-red-50 text-red-700 text-xs rounded-xl border border-red-200 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleUpload} className="space-y-6">
          <div className="border-2 border-dashed border-slate-300 hover:border-teal-500 rounded-2xl p-8 text-center cursor-pointer transition bg-slate-50/50">
            <input
              type="file"
              id="file-upload"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={handleFileChange}
              disabled={uploading}
              className="hidden"
            />
            <label htmlFor="file-upload" className="cursor-pointer block">
              <FileText className="w-10 h-10 text-slate-400 mx-auto mb-3" />
              {file ? (
                <div>
                  <p className="text-sm font-semibold text-teal-700">{file.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {(file.size / (1024 * 1024)).toFixed(2)} MB • Ready for analysis
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-semibold text-slate-700">Click to browse or drag file here</p>
                  <p className="text-xs text-slate-400 mt-1">PDF, JPG, or PNG</p>
                </div>
              )}
            </label>
          </div>

          {uploading && (
            <div className="p-4 bg-teal-50/70 border border-teal-200 rounded-xl flex items-center space-x-3 text-xs text-teal-800">
              <Loader2 className="w-4 h-4 text-teal-600 animate-spin shrink-0" />
              <span className="font-medium">{progressStatus}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={!file || uploading}
            className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 disabled:bg-slate-300 text-white font-semibold text-xs rounded-xl shadow-xs transition flex items-center justify-center space-x-2"
          >
            {uploading ? (
              <span>Analyzing Document...</span>
            ) : (
              <span>Start Extraction & Review</span>
            )}
          </button>
        </form>

        <div className="mt-6 pt-5 border-t border-slate-100 flex items-start space-x-2 text-[11px] text-slate-500">
          <Info className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
          <span>
            Privacy Guarantee: Extracted findings are shown in a review window before being added to your health profile. You can inspect, modify, or reject any field.
          </span>
        </div>
      </div>
    </div>
  );
};
