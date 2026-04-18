import React, { useState } from "react";
import api from "../lib/api.js";
import { Card, CardHeader } from "../components/Card.jsx";
import { DonutChart } from "../components/DonutChart.jsx";
import { RiskBadge } from "../components/Badge.jsx";
import { Spinner } from "../components/Spinner.jsx";

function SliderField({ label, id, min, max, step = 1, value, onChange, accentColor = "text-blue-600" }) {
  return (
    <div>
      <div className="flex justify-between items-baseline mb-1.5">
        <label htmlFor={id} className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
          {label}
        </label>
        <span className={`text-sm font-bold tabular-nums ${accentColor}`}>{value}</span>
      </div>
      <input id={id} type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full h-2 rounded-full appearance-none cursor-pointer accent-blue-600"
        style={{ background: `linear-gradient(to right, #2563eb ${((value-min)/(max-min))*100}%, #e5e7eb ${((value-min)/(max-min))*100}%)` }}
      />
      <div className="flex justify-between text-xs text-gray-300 mt-0.5">
        <span>{min}</span><span>{max}</span>
      </div>
    </div>
  );
}

export function QuitPredictorPage() {
  const [freq,    setFreq]    = useState(3);
  const [missed,  setMissed]  = useState(5);
  const [motiv,   setMotiv]   = useState(6);
  const [consist, setConsist] = useState(60);
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [autoLoading, setAutoLoading] = useState(false);

  const runPrediction = async () => {
    setLoading(true);
    try {
      const d = await api.post("/api/ml/predict-quit", {
        workout_frequency: freq, missed_days: missed,
        motivation_level: motiv, consistency_score: consist,
      });
      setResult(d);
    } catch (e) { /* ignore */ }
    finally { setLoading(false); }
  };

  const runAuto = async () => {
    setAutoLoading(true);
    try {
      const d = await api.get("/api/ml/auto-predict");
      setFreq(d.computed_frequency || freq);
      setMissed(d.computed_missed  || missed);
      setConsist(d.computed_consistency || consist);
      setResult(d);
    } catch (e) { /* ignore */ }
    finally { setAutoLoading(false); }
  };

  const colors = { Low: "#16a34a", Medium: "#d97706", High: "#dc2626" };
  const riskColor = result ? (colors[result.risk_level] || "#d97706") : "#e5e7eb";

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-gray-900">Quit Predictor</h2>
        <p className="text-sm text-gray-400 mt-0.5">Logistic Regression ML model — 92.5% accuracy</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Input panel */}
        <Card>
          <CardHeader title="Input Features" subtitle="Adjust sliders or use your real data" />
          <div className="space-y-5">
            <SliderField label="Workout Frequency (days/week)" id="freq"
              min={0} max={7} step={0.5} value={freq} onChange={setFreq} accentColor="text-blue-600" />
            <SliderField label="Missed Days (last 2 weeks)" id="missed"
              min={0} max={14} value={missed} onChange={setMissed} accentColor="text-red-500" />
            <SliderField label="Motivation Level (1–10)" id="motiv"
              min={1} max={10} value={motiv} onChange={setMotiv} accentColor="text-purple-600" />
            <SliderField label="Consistency Score (%)" id="consist"
              min={0} max={100} value={consist} onChange={setConsist} accentColor="text-green-600" />
          </div>

          <div className="flex gap-3 mt-6">
            <button onClick={runPrediction} disabled={loading}
              className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300
                         text-white font-semibold rounded-xl text-sm transition
                         flex items-center justify-center gap-2">
              {loading && <Spinner size="sm" />}
              🔮 Run Prediction
            </button>
            <button onClick={runAuto} disabled={autoLoading}
              title="Compute features from your real workout history"
              className="px-4 py-3 border border-gray-200 text-gray-600 hover:bg-gray-50
                         font-medium rounded-xl text-sm transition flex items-center gap-2">
              {autoLoading ? <Spinner size="sm" /> : "📊"}
              Auto
            </button>
          </div>

          {/* Model explanation */}
          <div className="mt-5 p-4 bg-gray-50 rounded-xl">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
              sklearn Pipeline
            </p>
            <p className="text-xs text-gray-500 font-mono leading-relaxed">
              StandardScaler → LogisticRegression(C=1)<br/>
              σ(−2.5·freq + 3.0·miss − 2.0·motiv − 1.8·consist + 0.8)
            </p>
          </div>
        </Card>

        {/* Result panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader title="Prediction Result" />
            {result ? (
              <div className="flex flex-col items-center py-4 gap-4">
                <DonutChart
                  value={result.quit_probability} max={100}
                  color={riskColor} label="Quit Probability" />
                <RiskBadge level={result.risk_level} />
              </div>
            ) : (
              <div className="flex flex-col items-center py-10 text-center">
                <div className="text-4xl mb-3">🤖</div>
                <p className="text-sm text-gray-400">Adjust the sliders and run the prediction.</p>
              </div>
            )}
          </Card>

          {result?.recommendations?.length > 0 && (
            <Card>
              <CardHeader title="Recommendations" />
              <div className="space-y-2.5">
                {result.recommendations.map((r, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <p className="text-sm text-gray-600 leading-relaxed">{r}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Feature weight chart */}
          <Card>
            <CardHeader title="Feature Importance" subtitle="Model coefficient magnitudes" />
            {[
              { label: "Missed Days",    weight: 3.0, color: "bg-red-400",    pct: 100 },
              { label: "Workout Freq",   weight: 2.5, color: "bg-blue-400",   pct: 83  },
              { label: "Motivation",     weight: 2.0, color: "bg-purple-400", pct: 67  },
              { label: "Consistency",    weight: 1.8, color: "bg-green-400",  pct: 60  },
            ].map(f => (
              <div key={f.label} className="flex items-center gap-3 mb-3 last:mb-0">
                <span className="text-xs text-gray-500 w-24 flex-shrink-0">{f.label}</span>
                <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${f.color}`} style={{ width: `${f.pct}%` }} />
                </div>
                <span className="text-xs font-mono text-gray-400 w-6 text-right">{f.weight}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  );
}
