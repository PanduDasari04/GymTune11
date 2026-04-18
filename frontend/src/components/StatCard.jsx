import React from "react";

const ACCENT = {
  blue:   { bg: "bg-blue-50",   text: "text-blue-600",   border: "border-blue-100" },
  green:  { bg: "bg-green-50",  text: "text-green-600",  border: "border-green-100" },
  amber:  { bg: "bg-amber-50",  text: "text-amber-600",  border: "border-amber-100" },
  purple: { bg: "bg-purple-50", text: "text-purple-600", border: "border-purple-100" },
  red:    { bg: "bg-red-50",    text: "text-red-600",    border: "border-red-100" },
};

export function StatCard({ label, value, unit = "", icon, accent = "blue", delta }) {
  const a = ACCENT[accent] || ACCENT.blue;
  const isPos = delta > 0;

  return (
    <div className={`bg-white rounded-2xl border ${a.border} p-5 flex flex-col gap-3`}>
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">{label}</span>
        {icon && (
          <span className={`text-xl w-9 h-9 flex items-center justify-center rounded-xl ${a.bg} ${a.text}`}>
            {icon}
          </span>
        )}
      </div>
      <div className="flex items-end gap-1.5">
        <span className={`text-3xl font-bold tabular-nums ${a.text}`}>
          {typeof value === "number" ? value.toLocaleString() : value}
        </span>
        {unit && <span className="text-sm text-gray-400 mb-0.5">{unit}</span>}
      </div>
      {delta !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-medium ${isPos ? "text-green-600" : "text-red-500"}`}>
          <span>{isPos ? "▲" : "▼"}</span>
          <span>{Math.abs(delta).toFixed(1)}% vs last week</span>
        </div>
      )}
    </div>
  );
}
