import React from "react";
import { useFetch } from "../hooks/useFetch.js";
import api from "../lib/api.js";
import { Card, CardHeader } from "../components/Card.jsx";
import { StatCard } from "../components/StatCard.jsx";
import { ProgressBar } from "../components/ProgressBar.jsx";
import { WeeklyChart } from "../components/WeeklyChart.jsx";
import { DonutChart } from "../components/DonutChart.jsx";
import { Spinner } from "../components/Spinner.jsx";
import { RiskBadge } from "../components/Badge.jsx";

function BMISection({ bmi }) {
  if (!bmi) {
    return <p className="text-sm text-gray-400">Add weight & height to your profile to see BMI.</p>;
  }
  const colors = { Normal: "#16a34a", Underweight: "#2563eb", Overweight: "#d97706", Obese: "#dc2626" };
  return (
    <div className="flex flex-col items-center gap-1">
      <DonutChart value={bmi.bmi} max={40} color={colors[bmi.category] || "#2563eb"}
        label={bmi.category} sublabel="BMI" />
    </div>
  );
}

function QuitSection() {
  const { data, loading } = useFetch("/api/ml/auto-predict");
  if (loading) return <div className="flex justify-center py-4"><Spinner /></div>;
  if (!data)   return <p className="text-sm text-gray-400">Log workouts to see prediction.</p>;
  const colors = { Low: "#16a34a", Medium: "#d97706", High: "#dc2626" };
  return (
    <div className="flex flex-col items-center gap-3">
      <DonutChart value={data.quit_probability} max={100}
        color={colors[data.risk_level] || "#d97706"}
        label="Quit Probability" sublabel="based on your data" />
      <RiskBadge level={data.risk_level} />
      {data.recommendations?.slice(0, 2).map((r, i) => (
        <p key={i} className="text-xs text-gray-500 text-center leading-relaxed">{r}</p>
      ))}
    </div>
  );
}

function GoalProgress({ goals }) {
  if (!goals) return null;
  const bars = [
    { key: "calories", label: "Calories", unit: "kcal",    color: "bg-amber-500" },
    { key: "sessions", label: "Sessions", unit: "sessions",color: "bg-blue-500" },
    { key: "steps",    label: "Steps",    unit: "steps",   color: "bg-green-500" },
    { key: "minutes",  label: "Minutes",  unit: "min",     color: "bg-purple-500" },
  ];
  return (
    <div className="space-y-4">
      {bars.map(({ key, label, unit, color }) => (
        <ProgressBar key={key}
          label={label}
          value={goals.actuals[key] || 0}
          max={goals.targets[key]}
          color={color}
          sublabel={`${Math.round(goals.actuals[key] || 0).toLocaleString()} / ${goals.targets[key].toLocaleString()} ${unit}`}
        />
      ))}
    </div>
  );
}

export function OverviewPage({ onSeedDemo }) {
  const { data: summary, loading, refetch } = useFetch("/api/dashboard/summary");
  const { data: goals }   = useFetch("/api/goals/weekly");
  const { data: compare } = useFetch("/api/workouts/compare");

  const handleSeed = async () => {
    await api.post("/api/workouts/seed-demo", {});
    refetch();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  const s = summary?.stats || {};
  const changes = compare?.changes || {};

  return (
    <div className="space-y-6">
      {/* CTA bar when no data */}
      {!s.total_sessions && (
        <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-100 rounded-2xl">
          <div>
            <p className="text-sm font-semibold text-blue-800">No workouts yet</p>
            <p className="text-xs text-blue-500 mt-0.5">Load demo data to explore the dashboard</p>
          </div>
          <button onClick={handleSeed}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition">
            🎲 Load Demo
          </button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard label="Calories Burned"  value={Math.round(s.total_calories || 0)}
          unit="kcal"    icon="🔥" accent="amber"
          delta={changes.calories} />
        <StatCard label="Sessions"         value={s.total_sessions || 0}
          unit="total"   icon="🏋️" accent="blue"
          delta={changes.sessions} />
        <StatCard label="Active Minutes"   value={s.total_minutes  || 0}
          unit="min"     icon="⏱️" accent="purple"
          delta={changes.minutes} />
        <StatCard label="Consistency"      value={`${summary?.consistency_score || 0}%`}
          icon="📈"      accent="green" />
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Weekly calories chart */}
        <div className="xl:col-span-2">
          <Card>
            <CardHeader title="Weekly Calorie Burn" subtitle="Last 7 days" />
            <WeeklyChart data={summary?.weekly_data || []} valueKey="cal" color="#2563eb" />
          </Card>
        </div>

        {/* Activity breakdown */}
        <Card>
          <CardHeader title="Activity Mix" subtitle="All time" />
          {summary?.activities?.length ? (
            <div className="space-y-2.5 mt-1">
              {summary.activities.slice(0, 6).map(({ activity_type, cnt }) => {
                const total = summary.activities.reduce((s, a) => s + a.cnt, 0);
                const pct   = Math.round((cnt / total) * 100);
                return (
                  <div key={activity_type}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-600 capitalize font-medium">
                        {activity_type.replace("_", " ")}
                      </span>
                      <span className="text-gray-400">{cnt} sessions</span>
                    </div>
                    <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gray-400 mt-2">No activity data yet.</p>
          )}
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Weekly goals */}
        <Card>
          <CardHeader title="Weekly Goals" subtitle="Progress this week" />
          <GoalProgress goals={goals} />
        </Card>

        {/* BMI */}
        <Card>
          <CardHeader title="BMI Status" subtitle="Body Mass Index" />
          <BMISection bmi={summary?.bmi} />
        </Card>

        {/* Quit predictor */}
        <Card>
          <CardHeader title="Quit Risk" subtitle="ML prediction from your data" />
          <QuitSection />
        </Card>
      </div>
    </div>
  );
}
