/**
 * WeeklyChart — SVG bar chart for weekly calories or duration.
 * Pure React, zero dependencies beyond react.
 */
import React from "react";

export function WeeklyChart({ data = [], valueKey = "cal", color = "#2563eb", label = "Calories" }) {
  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-40 text-sm text-gray-400">
        No data for this week yet.
      </div>
    );
  }

  const W = 500, H = 160, PAD = { top: 16, right: 8, bottom: 32, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top  - PAD.bottom;

  const values = data.map(d => Number(d[valueKey]) || 0);
  const maxVal  = Math.max(...values, 1);
  const barW    = Math.floor(chartW / values.length) - 6;

  const yTicks = 4;
  const step   = Math.ceil(maxVal / yTicks / 100) * 100 || 100;
  const yMax   = step * yTicks;

  const x = (i) => PAD.left + i * (chartW / values.length) + (chartW / values.length - barW) / 2;
  const y = (v)  => PAD.top  + chartH - (v / yMax) * chartH;
  const h = (v)  => (v / yMax) * chartH;

  const fmtDate = (str) => {
    if (!str) return "";
    const [, m, d] = str.split("-");
    return `${m}/${d}`;
  };

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40" role="img" aria-label={`${label} chart`}>
      {/* Y-axis grid lines + labels */}
      {Array.from({ length: yTicks + 1 }, (_, i) => {
        const v  = i * step;
        const cy = PAD.top + chartH - (v / yMax) * chartH;
        return (
          <g key={i}>
            <line x1={PAD.left} x2={W - PAD.right} y1={cy} y2={cy}
              stroke="#f3f4f6" strokeWidth="1" />
            <text x={PAD.left - 6} y={cy + 4} textAnchor="end"
              fontSize="9" fill="#9ca3af">
              {v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {values.map((v, i) => (
        <g key={i}>
          <rect
            x={x(i)} y={y(v)} width={barW} height={Math.max(h(v), 2)}
            rx="4" ry="4" fill={v > 0 ? color : "#f3f4f6"}
            opacity={v > 0 ? 0.85 : 1}
          />
          {/* Value label on top of bar */}
          {v > 0 && (
            <text x={x(i) + barW / 2} y={y(v) - 4}
              textAnchor="middle" fontSize="9" fill={color} fontWeight="600">
              {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v)}
            </text>
          )}
          {/* X-axis date label */}
          <text x={x(i) + barW / 2} y={H - 6}
            textAnchor="middle" fontSize="9" fill="#9ca3af">
            {fmtDate(data[i]?.workout_date)}
          </text>
        </g>
      ))}

      {/* Y-axis line */}
      <line x1={PAD.left} x2={PAD.left} y1={PAD.top} y2={PAD.top + chartH}
        stroke="#e5e7eb" strokeWidth="1" />
    </svg>
  );
}
