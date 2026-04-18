import React, { useState } from "react";
import { useFetch } from "../hooks/useFetch.js";
import api from "../lib/api.js";
import { Card } from "../components/Card.jsx";
import { ActivityBadge } from "../components/Badge.jsx";
import { Spinner } from "../components/Spinner.jsx";
import { EmptyState } from "../components/EmptyState.jsx";

function EditModal({ workout, onSave, onClose }) {
  const ACTIVITIES = ["running","walking","cycling","gym_strength","hiit","yoga","swimming","jump_rope","elliptical"];
  const [activity, setActivity] = useState(workout.activity_type);
  const [duration, setDuration] = useState(String(workout.duration));
  const [date,     setDate]     = useState(workout.workout_date?.slice(0,10) || "");
  const [notes,    setNotes]    = useState(workout.notes || "");
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState("");

  const handleSave = async () => {
    setLoading(true); setError("");
    try {
      await api.put(`/api/workouts/${workout.id}`, {
        activity_type: activity, duration: Number(duration), workout_date: date, notes,
      });
      onSave();
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
         onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-gray-900 mb-4">Edit Workout</h3>
        {error && <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">{error}</div>}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Activity</label>
            <select value={activity} onChange={e => setActivity(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
              {ACTIVITIES.map(a => <option key={a} value={a}>{a.replace("_"," ")}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Duration (min)</label>
              <input type="number" value={duration} onChange={e => setDuration(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Notes</label>
            <input type="text" value={notes} onChange={e => setNotes(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        <div className="flex gap-3 mt-5">
          <button onClick={handleSave} disabled={loading}
            className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold rounded-xl text-sm transition flex items-center justify-center gap-2">
            {loading && <Spinner size="sm" />}
            Save
          </button>
          <button onClick={onClose}
            className="flex-1 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 font-medium rounded-xl text-sm transition">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

export function HistoryPage() {
  const { data: rows, loading, refetch } = useFetch("/api/workouts/history");
  const [editing,  setEditing]  = useState(null);
  const [deleting, setDeleting] = useState(null);

  const handleDelete = async (id) => {
    if (!confirm("Delete this workout? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await api.delete(`/api/workouts/${id}`);
      refetch();
    } catch { /* ignore */ }
    finally { setDeleting(null); }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Workout History</h2>
        <p className="text-sm text-gray-400 mt-0.5">Your last 50 sessions</p>
      </div>

      {editing && (
        <EditModal workout={editing} onClose={() => setEditing(null)}
          onSave={() => { setEditing(null); refetch(); }} />
      )}

      <Card padding={false}>
        {loading ? (
          <div className="flex justify-center py-16"><Spinner size="lg" /></div>
        ) : !rows?.length ? (
          <EmptyState icon="🏃" title="No workouts yet"
            message="Log your first workout to see your history here." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Date","Activity","Duration","Calories","Steps","Speed","Notes",""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={r.id} className={`border-b border-gray-50 hover:bg-gray-50/50 transition ${i % 2 === 0 ? "" : "bg-gray-50/30"}`}>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500 whitespace-nowrap">{r.workout_date}</td>
                    <td className="px-4 py-3"><ActivityBadge type={r.activity_type} /></td>
                    <td className="px-4 py-3 text-gray-700 font-medium">{r.duration} min</td>
                    <td className="px-4 py-3 text-blue-600 font-semibold tabular-nums">{Math.round(r.calories_burned || 0)}</td>
                    <td className="px-4 py-3 text-gray-500">{r.steps ? Number(r.steps).toLocaleString() : "—"}</td>
                    <td className="px-4 py-3 text-gray-500">{r.speed ? `${r.speed} km/h` : "—"}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs max-w-xs truncate">{r.notes || ""}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button onClick={() => setEditing(r)}
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-gray-400 hover:text-blue-600 transition text-base">
                          ✏️
                        </button>
                        <button onClick={() => handleDelete(r.id)} disabled={deleting === r.id}
                          className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-600 transition text-base">
                          {deleting === r.id ? <Spinner size="sm" /> : "🗑️"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
