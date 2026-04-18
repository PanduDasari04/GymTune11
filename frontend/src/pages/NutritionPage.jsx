import React, { useState, useEffect } from "react";
import api from "../lib/api.js";
import { Card, CardHeader } from "../components/Card.jsx";
import { Spinner } from "../components/Spinner.jsx";

function FoodCard({ name, protein, calories, accent }) {
  const accents = {
    green: "border-green-100 hover:border-green-300",
    amber: "border-amber-100 hover:border-amber-300",
  };
  const textColors = { green: "text-green-600", amber: "text-amber-600" };
  return (
    <div className={`bg-white border rounded-xl p-3.5 text-center transition ${accents[accent] || accents.green}`}>
      <p className="text-xs text-gray-500 leading-tight mb-2">{name}</p>
      <p className={`text-xl font-bold tabular-nums ${textColors[accent] || textColors.green}`}>{protein}g</p>
      <p className="text-xs text-gray-400 mt-0.5">protein</p>
      <p className="text-xs text-red-400 mt-1">{calories} kcal</p>
    </div>
  );
}

export function NutritionPage({ user }) {
  const [goal,    setGoal]    = useState(user?.goal?.includes("fat") ? "fat_loss" : "muscle_gain");
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(false);

  const loadPlan = async () => {
    setLoading(true);
    try {
      const d = await api.post("/api/ml/nutrition", { goal });
      setData(d);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  };

  useEffect(() => { loadPlan(); }, []); // eslint-disable-line

  const goals = [
    ["muscle_gain", "💪 Muscle Gain"],
    ["fat_loss",    "🔥 Fat Loss"],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Meal Planner</h2>
        <p className="text-sm text-gray-400 mt-0.5">Protein-rich foods & daily meal plan</p>
      </div>

      {/* Goal selector */}
      <Card>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1">
            <p className="text-sm font-semibold text-gray-700">Fitness Goal</p>
            <p className="text-xs text-gray-400">Select to generate a personalised plan</p>
          </div>
          <select value={goal} onChange={e => setGoal(e.target.value)}
            className="px-3.5 py-2.5 rounded-xl border border-gray-200 text-sm
                       focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white min-w-40">
            {goals.map(([v,l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <button onClick={loadPlan} disabled={loading}
            className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                       text-white font-semibold rounded-xl text-sm transition
                       flex items-center gap-2">
            {loading && <Spinner size="sm" />}
            Generate
          </button>
        </div>
      </Card>

      {loading && !data && (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      )}

      {data && (
        <>
          {/* Macro totals */}
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Daily Protein</p>
                <p className="text-4xl font-bold text-amber-600 tabular-nums">{data.totals?.protein}g</p>
                <p className="text-xs text-gray-400 mt-1">per day</p>
              </div>
            </Card>
            <Card>
              <div className="text-center">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Daily Calories</p>
                <p className="text-4xl font-bold text-red-500 tabular-nums">{data.totals?.calories}</p>
                <p className="text-xs text-gray-400 mt-1">kcal</p>
              </div>
            </Card>
          </div>

          {/* Food sources */}
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <Card>
              <CardHeader title="🥦 Vegetarian Sources" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {data.veg?.map(f => (
                  <FoodCard key={f.name} {...f} accent="green" />
                ))}
              </div>
            </Card>
            <Card>
              <CardHeader title="🍗 Non-Vegetarian Sources" />
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {data.nonveg?.map(f => (
                  <FoodCard key={f.name} {...f} accent="amber" />
                ))}
              </div>
            </Card>
          </div>

          {/* Meal plan */}
          <Card>
            <CardHeader title="Daily Meal Plan" subtitle={goal.replace("_"," ")} />
            <div className="divide-y divide-gray-50">
              {data.meal_plan?.map(m => (
                <div key={m.meal} className="flex items-center gap-4 py-3.5 first:pt-0 last:pb-0">
                  <span className="text-xs font-semibold text-blue-600 w-28 flex-shrink-0">{m.meal}</span>
                  <p className="flex-1 text-sm text-gray-600">{m.items}</p>
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs font-semibold text-purple-600">{m.protein}g protein</p>
                    <p className="text-xs text-gray-400">{m.calories} kcal</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-8 mt-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-400">Total Protein</p>
                <p className="text-lg font-bold text-amber-600">{data.totals?.protein}g</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Total Calories</p>
                <p className="text-lg font-bold text-red-500">{data.totals?.calories} kcal</p>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
