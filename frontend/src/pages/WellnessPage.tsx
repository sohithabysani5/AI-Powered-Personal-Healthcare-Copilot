import React, { useEffect, useState } from 'react';
import { apiClient } from '../services/api';
import { Activity, Plus, Moon, Droplets, Dumbbell, Scale } from 'lucide-react';
import { WellnessEntry } from '../types';

export const WellnessPage: React.FC = () => {
  const [entries, setEntries] = useState<WellnessEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [weight, setWeight] = useState('');
  const [sleep, setSleep] = useState('');
  const [water, setWater] = useState('');
  const [exercise, setExercise] = useState('');
  const [notes, setNotes] = useState('');

  const fetchEntries = async () => {
    try {
      setLoading(true);
      const res = await apiClient.get('/health/wellness');
      setEntries(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/health/wellness', {
        entry_date: date,
        weight_kg: weight ? parseFloat(weight) : null,
        sleep_hours: sleep ? parseFloat(sleep) : null,
        water_liters: water ? parseFloat(water) : null,
        exercise_minutes: exercise ? parseInt(exercise) : null,
        notes: notes || null,
      });
      setWeight('');
      setSleep('');
      setWater('');
      setExercise('');
      setNotes('');
      fetchEntries();
    } catch (err) {
      alert('Failed to log wellness entry');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-slate-800">Personal Wellness Tracker</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Record daily habits (sleep, hydration, activity, weight). Manually recorded wellness data is strictly distinguished from clinical lab results.
        </p>
      </div>

      <form onSubmit={handleAddEntry} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800">Log Daily Wellness Metrics</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full text-xs p-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Weight (kg)</label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="e.g. 72.5"
              className="w-full text-xs p-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Sleep (Hours)</label>
            <input
              type="number"
              step="0.5"
              value={sleep}
              onChange={(e) => setSleep(e.target.value)}
              placeholder="e.g. 7.5"
              className="w-full text-xs p-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Water (Liters)</label>
            <input
              type="number"
              step="0.1"
              value={water}
              onChange={(e) => setWater(e.target.value)}
              placeholder="e.g. 2.5"
              className="w-full text-xs p-2 border border-slate-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Exercise (Mins)</label>
            <input
              type="number"
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              placeholder="e.g. 30"
              className="w-full text-xs p-2 border border-slate-300 rounded-lg"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Wellness Notes</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Morning jog, feeling energetic"
            className="w-full text-xs p-2 border border-slate-300 rounded-lg"
          />
        </div>

        <button
          type="submit"
          className="px-4 py-2 bg-teal-600 text-white text-xs font-semibold rounded-xl hover:bg-teal-700 transition"
        >
          Save Daily Entry
        </button>
      </form>

      {/* Logged Wellness History */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-slate-800 border-b border-slate-100 pb-2">Recent Wellness Log</h3>
        {entries.length === 0 ? (
          <div className="py-6 text-center text-xs text-slate-400">No wellness entries logged yet.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {entries.map((w) => (
              <div key={w.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5">
                <span className="text-[11px] font-bold text-teal-700">{w.entry_date}</span>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-600">
                  {w.weight_kg && <div>⚖️ {w.weight_kg} kg</div>}
                  {w.sleep_hours && <div>🌙 {w.sleep_hours} hrs</div>}
                  {w.water_liters && <div>💧 {w.water_liters} L</div>}
                  {w.exercise_minutes && <div>🏃 {w.exercise_minutes} mins</div>}
                </div>
                {w.notes && <p className="text-[11px] text-slate-500 italic mt-1">"{w.notes}"</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
