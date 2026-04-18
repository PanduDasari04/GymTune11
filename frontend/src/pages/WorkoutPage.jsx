import React, { useState, useEffect } from "react";
import api from "../lib/api.js";
import { Card, CardHeader } from "../components/Card.jsx";
import { Spinner } from "../components/Spinner.jsx";

const MET = {
  running:9.8, walking:3.5, cycling:7.5, gym_strength:5.0,
  hiit:10.0, yoga:2.5, swimming:8.0, jump_rope:12.0, elliptical:5.5,
};

const ACTIVITIES = [
  ["running",      "🏃 Running"],
  ["walking",      "🚶 Walking"],
  ["cycling",      "🚲 Cycling"],
  ["gym_strength", "🏋️ Gym / Strength"],
  ["hiit",         "⚡ HIIT"],
  ["yoga",         "🧘 Yoga"],
  ["swimming",     "🏊 Swimming"],
  ["jump_rope",    "💫 Jump Rope"],
  ["elliptical",   "🔄 Elliptical"],
];

function InputField({ label, id, type = "text", value, onChange, placeholder, optional = false }) {
  return (
    <div>
      <label htmlFor={id} className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
        {label}{optional && <span className="normal-case text-gray-300 ml-1 font-normal">optional</span>}
      </label>
      <input id={id} type={type} value={value} onChange={onChange} placeholder={placeholder}
        className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm
                   focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
                   placeholder:text-gray-300 bg-white" />
    </div>
  );
}

export function WorkoutPage({ user }) {
  const [activity, setActivity] = useState("running");
  const [duration, setDuration] = useState("");
  const [date,     setDate]     = useState(new Date().toISOString().split("T")[0]);
  const [distance, setDistance] = useState("");
  const [steps,    setSteps]    = useState("");
  const [speed,    setSpeed]    = useState("");
  const [notes,    setNotes]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const [result,   setResult]   = useState(null);  // {success, calories_burned, error}

  const weight = user?.weight || 70;
  const met    = MET[activity] || 5.0;
  const dur    = parseFloat(duration) || 0;
  const estCal = dur > 0 ? +(met * weight * (dur / 60)).toFixed(1) : null;
  const fatG   = estCal ? +(estCal / 7.7).toFixed(1) : null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!duration) { setResult({ error: "Duration is required." }); return; }
    setLoading(true);
    setResult(null);
    try {
      const d = await api.post("/api/workouts/log", {
        activity_type: activity,
        duration:      Number(duration),
        date,
        distance:      distance ? Number(distance) : null,
        steps:         steps    ? Number(steps)    : null,
        speed:         speed    ? Number(speed)    : null,
        notes,
      });
      setResult({ success: true, calories_burned: d.calories_burned });
      setDuration(""); setDistance(""); setSteps(""); setSpeed(""); setNotes("");
    } catch (err) {
      setResult({ error: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Log Workout</h2>
        <p className="text-sm text-gray-400 mt-0.5">Record your training session</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Form */}
        <div className="md:col-span-3">
          <Card>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Activity select */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Activity Type
                </label>
                <select value={activity} onChange={e => setActivity(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white">
                  {ACTIVITIES.map(([val, lbl]) => (
                    <option key={val} value={val}>{lbl}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <InputField label="Duration (min)" id="dur" type="number"
                  value={duration} onChange={e => setDuration(e.target.value)} placeholder="45" />
                <InputField label="Date" id="date" type="date"
                  value={date} onChange={e => setDate(e.target.value)} />
                <InputField label="Distance (km)" id="dist" type="number"
                  value={distance} onChange={e => setDistance(e.target.value)} placeholder="5.0" optional />
                <InputField label="Steps" id="steps" type="number"
                  value={steps} onChange={e => setSteps(e.target.value)} placeholder="8000" optional />
                <InputField label="Speed (km/h)" id="speed" type="number"
                  value={speed} onChange={e => setSpeed(e.target.value)} placeholder="8.5" optional />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">
                  Notes <span className="normal-case text-gray-300 font-normal">optional</span>
                </label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)}
                  rows={2} placeholder="How did it feel? Any personal records?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm
                             focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-white
                             placeholder:text-gray-300" />
              </div>

              {/* Feedback */}
              {result?.error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  ⚠ {result.error}
                </div>
              )}
              {result?.success && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-700">
                  ✓ Workout saved! <strong>{result.calories_burned} kcal</strong> burned.
                </div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                           text-white font-semibold rounded-xl transition text-sm
                           flex items-center justify-center gap-2">
                {loading && <Spinner size="sm" />}
                {loading ? "Saving…" : "✓ Save Workout"}
              </button>
            </form>
          </Card>
        </div>

        {/* Live estimator */}
        <div className="md:col-span-2 space-y-4">
          <Card>
            <CardHeader title="Live Estimator" />
            <div className="text-center py-4">
              <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">
                Est. Calories
              </div>
              <div className="text-4xl font-bold text-blue-600 tabular-nums">
                {estCal ?? "—"}
              </div>
              <div className="text-xs text-gray-400 mt-1">kcal</div>
            </div>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-xs text-gray-400 mb-1">Fat Loss</div>
                <div className="text-lg font-bold text-amber-600">{fatG ?? "—"}</div>
                <div className="text-xs text-gray-400">grams</div>
              </div>
              <div className="bg-gray-50 rounded-xl p-3 text-center">
                <div className="text-xs text-gray-400 mb-1">MET Value</div>
                <div className="text-lg font-bold text-purple-600">{met}</div>
                <div className="text-xs text-gray-400">activity</div>
              </div>
            </div>
            <div className="mt-3 p-3 bg-blue-50 rounded-xl">
              <p className="text-xs text-blue-700 font-mono text-center">
                Cal = {met} × {weight}kg × {(dur/60).toFixed(2)}hr
              </p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
