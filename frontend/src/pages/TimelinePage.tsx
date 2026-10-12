import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { Clock, Calendar, FileText, Activity, Pill, CheckCircle2 } from 'lucide-react';
import { TimelineEvent } from '../types';

export const TimelinePage: React.FC = () => {
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTimeline = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/health/timeline');
        setEvents(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchTimeline();
  }, []);

  const getEventIcon = (category: string) => {
    switch (category) {
      case 'lab':
        return <Activity className="w-4 h-4 text-blue-600" />;
      case 'prescription':
        return <Pill className="w-4 h-4 text-amber-600" />;
      case 'upload':
        return <FileText className="w-4 h-4 text-teal-600" />;
      default:
        return <Clock className="w-4 h-4 text-purple-600" />;
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Healthcare Journey Timeline</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Chronological record of clinical events, consultations, laboratory assessments, and uploaded records.
        </p>
      </div>

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading chronological timeline...</div>
      ) : events.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <Clock className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="font-semibold text-slate-700 text-sm">No timeline events yet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Events will automatically appear here as you upload medical documents or click "Load Demo Data".
          </p>
        </div>
      ) : (
        <div className="relative pl-6 space-y-6 before:absolute before:left-3 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
          {events.map((ev) => (
            <div key={ev.id} className="relative flex items-start space-x-4">
              <div className="absolute -left-6 top-1 w-6 h-6 rounded-full bg-white border-2 border-teal-500 flex items-center justify-center shadow-xs">
                {getEventIcon(ev.category)}
              </div>

              <div className="flex-1 bg-white p-4 rounded-xl border border-slate-200 shadow-xs hover:border-slate-300 transition">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                  <span className="text-[11px] font-semibold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-md border border-teal-100">
                    {ev.event_date}
                  </span>
                  <span className="text-[10px] uppercase font-bold text-slate-400">
                    {ev.category}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-slate-800">{ev.title}</h3>
                {ev.description && (
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed">{ev.description}</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
