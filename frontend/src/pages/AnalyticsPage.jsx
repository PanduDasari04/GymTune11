import React, { useState } from "react";
import { useFetch } from "../hooks/useFetch.js";
import api from "../lib/api.js";
import { Card, CardHeader } from "../components/Card.jsx";
import { WeeklyChart } from "../components/WeeklyChart.jsx";
import { DonutChart } from "../components/DonutChart.jsx";
import { Spinner } from "../components/Spinner.jsx";

function SectionTitle({ children }) {
  return <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4">{children}</h3>;
}

function CompareCard({ label, icon, thisWeek, prevWeek, change }) {
  const up  = change >= 0;
  const col = up ? "text-green-600" : "text-red-500";
  return (
    <div className="bg-gray-50 rounded-xl p-4 text-center">
      <div className="text-2xl mb-2">{icon}</div>
      <p className="text-xs text-gray-400 font-semibold uppercase tracking-wider mb-2">{label}</p>
      <p className="text-xl font-bold text-gray-800 tabular-nums">{Math.round(thisWeek).toLocaleString()}</p>
      <p className="text-xs text-gray-400 mt-0.5">vs {Math.round(prevWeek).toLocaleString()} last wk</p>
      <p className={`text-xs font-bold mt-1.5 ${col}`}>
        {up ? "▲" : "▼"} {Math.abs(change).toFixed(1)}%
      </p>
    </div>
  );
}

function BMICalculator() {
  const [w, setW] = useState(""); const [h, setH] = useState("");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const calc = async () => {
    if (!w || !h) return;
    setLoading(true);
    try {
      const d = await api.post("/api/analytics/bmi", { weight: +w, height: +h });
      setResult(d);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const colors = { Normal:"#16a34a", Underweight:"#2563eb", Overweight:"#d97706", Obese:"#dc2626" };

  return (
    <Card>
      <CardHeader title="BMI Calculator" />
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[["Weight (kg)", w, setW, "70"], ["Height (cm)", h, setH, "175"]].map(([lbl,val,fn,ph]) => (
          <div key={lbl}>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{lbl}</label>
            <input type="number" value={val} onChange={e => fn(e.target.value)} placeholder={ph}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
        ))}
      </div>
      <button onClick={calc} disabled={loading}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold
                   rounded-xl text-sm transition flex items-center justify-center gap-2">
        {loading && <Spinner size="sm" />} Calculate BMI
      </button>
      {result && (
        <div className="mt-4 flex flex-col items-center">
          <DonutChart value={result.bmi} max={40} color={colors[result.category] || "#2563eb"}
            label={result.category} sublabel="BMI" />
        </div>
      )}
    </Card>
  );
}

function RunningAnalyser() {
  const { data: benchmarks } = useFetch("/api/analytics/running-benchmarks");
  const [age,    setAge]    = useState(""); const [speed, setSpeed] = useState("");
  const [result, setResult] = useState(null);
  const [loading,setLoading]= useState(false);

  const analyse = async () => {
    if (!age || !speed) return;
    setLoading(true);
    try {
      const d = await api.post("/api/analytics/running", { age: +age, speed: +speed });
      setResult(d);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  const scoreColor = result
    ? result.score >= 100 ? "#16a34a" : result.score >= 80 ? "#d97706" : "#dc2626"
    : "#2563eb";

  return (
    <Card>
      <CardHeader title="Running Analysis" subtitle="vs age-group benchmarks" />
      <div className="grid grid-cols-2 gap-3 mb-4">
        {[["Age","age",age,setAge,"27"],["Speed (km/h)","spd",speed,setSpeed,"9.5"]].map(([lbl,id,val,fn,ph]) => (
          <div key={id}>
            <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">{lbl}</label>
            <input type="number" value={val} onChange={e => fn(e.target.value)} placeholder={ph}
              className="w-full px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm
                         focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white" />
          </div>
        ))}
      </div>
      <button onClick={analyse} disabled={loading}
        className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white font-semibold
                   rounded-xl text-sm transition flex items-center justify-center gap-2">
        {loading && <Spinner size="sm" />} Analyse
      </button>

      {result && (
        <div className="mt-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Your Speed</p>
              <p className="text-2xl font-bold text-blue-600">{result.user_speed}</p>
              <p className="text-xs text-gray-400">km/h</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-400 mb-1">Group Avg ({result.group})</p>
              <p className="text-2xl font-bold text-gray-600">{result.avg_speed}</p>
              <p className="text-xs text-gray-400">km/h</p>
            </div>
          </div>
          <div className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-3xl font-bold tabular-nums" style={{ color: scoreColor }}>{result.score}%</p>
            <p className="text-sm text-gray-500 mt-1">{result.label}</p>
          </div>
        </div>
      )}

      {/* Benchmark reference table */}
      {benchmarks && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Benchmarks</p>
          <div className="space-y-1.5">
            {benchmarks.map(b => (
              <div key={b.group} className="flex justify-between text-xs">
                <span className="text-gray-500 font-medium">{b.group} yrs</span>
                <span className="text-gray-400">{b.avg_speed} km/h · {b.avg_pace}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Card>
  );
}

function FatLossSection() {
  const { data, loading } = useFetch("/api/analytics/fat-loss");
  if (loading) return <div className="flex justify-center py-8"><Spinner /></div>;
  if (!data)   return null;
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Burned (week)", value: Math.round(data.total_burned).toLocaleString(), unit: "kcal", color: "text-green-600" },
          { label: "Deficit",       value: Math.round(data.calorie_deficit).toLocaleString(), unit: "kcal", color: "text-amber-600" },
          { label: "Fat Loss",      value: data.weekly_fat_loss_kg,  unit: "kg",   color: "text-blue-600" },
        ].map(s => (
          <div key={s.label} className="bg-gray-50 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 uppercase font-semibold tracking-wider mb-2">{s.label}</p>
            <p className={`text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.unit}</p>
          </div>
        ))}
      </div>
      <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
        <p className="text-sm text-blue-800 font-semibold mb-1">The 7,700 Calorie Rule</p>
        <p className="text-xs text-blue-600 leading-relaxed">
          1 kg of body fat ≈ 7,700 kcal. A daily deficit of 550 kcal produces ~0.5 kg fat loss per week
          without muscle loss — the scientifically recommended rate.
        </p>
      </div>
    </div>
  );
}

export function AnalyticsPage() {
  const { data: summary } = useFetch("/api/dashboard/summary");
  const { data: compare } = useFetch("/api/workouts/compare");

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Analytics</h2>
        <p className="text-sm text-gray-400 mt-0.5">Deep-dive into your fitness metrics</p>
      </div>

      {/* Trend charts */}
      <section>
        <SectionTitle>Weekly Trends</SectionTitle>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader title="Calorie Burn" subtitle="Last 7 days" />
            <WeeklyChart data={summary?.weekly_data || []} valueKey="cal" color="#2563eb" />
          </Card>
          <Card>
            <CardHeader title="Session Duration" subtitle="Minutes per day" />
            <WeeklyChart data={summary?.weekly_data || []} valueKey="dur" color="#7c3aed" />
          </Card>
        </div>
      </section>

      {/* Compare */}
      {compare && (
        <section>
          <SectionTitle>This Week vs Last Week</SectionTitle>
          <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
            <CompareCard label="Calories"  icon="🔥" thisWeek={compare.this_week.calories}  prevWeek={compare.prev_week.calories}  change={compare.changes.calories} />
            <CompareCard label="Sessions"  icon="🏋️" thisWeek={compare.this_week.sessions}  prevWeek={compare.prev_week.sessions}  change={compare.changes.sessions} />
            <CompareCard label="Minutes"   icon="⏱️" thisWeek={compare.this_week.minutes}   prevWeek={compare.prev_week.minutes}   change={compare.changes.minutes} />
            <CompareCard label="Steps"     icon="👣" thisWeek={compare.this_week.steps}     prevWeek={compare.prev_week.steps}     change={compare.changes.steps} />
          </div>
        </section>
      )}

      {/* Fat Loss Science */}
      <section>
        <SectionTitle>Fat Loss Projection</SectionTitle>
        <Card><FatLossSection /></Card>
      </section>

      {/* Tools */}
      <section>
        <SectionTitle>Analysis Tools</SectionTitle>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <BMICalculator />
          <RunningAnalyser />
        </div>
      </section>
    </div>
  );
}
