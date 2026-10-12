import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Activity, Info, AlertCircle } from 'lucide-react';

export const ComparisonPage: React.FC = () => {
  const [availableTests, setAvailableTests] = useState<string[]>([]);
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [trendData, setTrendData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchTests = async () => {
      try {
        const res = await apiClient.get('/health/available-tests');
        setAvailableTests(res.data);
        if (res.data.length > 0) {
          setSelectedTest(res.data[0]);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchTests();
  }, []);

  useEffect(() => {
    const fetchTrends = async () => {
      if (!selectedTest) return;
      try {
        setLoading(true);
        const res = await apiClient.get(`/health/trends/${encodeURIComponent(selectedTest)}`);
        setTrendData(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrends();
  }, [selectedTest]);

  const currentUnit = trendData.length > 0 ? trendData[0].unit : '';
  const refRange = trendData.length > 0 ? trendData[0].reference_range : null;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Longitudinal Health Trends</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Track compatible laboratory tests and biometrics across your historical reports.
        </p>
      </div>

      {availableTests.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700 text-sm">No numeric laboratory tests available</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Upload blood test reports or click "Load Demo Data" in the sidebar to visualize historical glucose, hemoglobin, and cholesterol trends.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Select Biomarker:</label>
              <select
                value={selectedTest}
                onChange={(e) => setSelectedTest(e.target.value)}
                className="text-xs font-semibold px-3 py-2 border border-slate-300 rounded-xl bg-slate-50 focus:ring-1 focus:ring-teal-500"
              >
                {availableTests.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {refRange && (
              <div className="text-right">
                <span className="text-[11px] text-slate-400 block">Report Reference Interval</span>
                <span className="text-xs font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-200">
                  {refRange} {currentUnit}
                </span>
              </div>
            )}
          </div>

          {/* Recharts Trend Line */}
          <div className="h-72 w-full pt-4">
            {loading ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">Loading trend plot...</div>
            ) : trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#64748b' }} />
                  <YAxis tick={{ fontSize: 11, fill: '#64748b' }} unit={` ${currentUnit}`} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px' }}
                    labelStyle={{ color: '#94a3b8', marginBottom: '4px' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name={selectedTest}
                    stroke="#0d9488"
                    strokeWidth={2.5}
                    dot={{ fill: '#0d9488', r: 4 }}
                    activeDot={{ r: 6, fill: '#14b8a6' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Insufficient data points to plot graph.
              </div>
            )}
          </div>

          {/* Observations Data Table */}
          <div className="pt-4 border-t border-slate-100">
            <h4 className="text-xs font-bold text-slate-700 mb-3">Recorded Data Points ({trendData.length})</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {trendData.map((pt, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-[10px] text-slate-400 font-medium">{pt.date}</span>
                  <div className="flex items-baseline space-x-1.5 mt-1">
                    <span className="text-base font-bold text-slate-800">{pt.value}</span>
                    <span className="text-xs text-slate-500">{pt.unit}</span>
                  </div>
                  {pt.flag && (
                    <span
                      className={`inline-block mt-1 text-[10px] px-1.5 py-0.2 rounded font-semibold ${
                        pt.flag === 'High' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                      }`}
                    >
                      {pt.flag}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/60 flex items-start space-x-2 text-[11px] text-slate-500">
            <Info className="w-3.5 h-3.5 text-teal-600 shrink-0 mt-0.5" />
            <span>
              Clinical Integrity Notice: Values are compared only across compatible test methodologies and identical physical units. Numerical change alone does not imply clinical outcome without physician consultation.
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
