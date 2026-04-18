/**
 * DonutChart — SVG semi-circle gauge for BMI, quit probability, consistency.
 * Pure React, zero dependencies.
 */
import React from "react";

export function DonutChart({ value, max = 100, color = "#2563eb", label, sublabel, size = 160 }) {
  const r      = 54;
  const cx     = size / 2;
  const cy     = size / 2 + 10;
  const pct    = Math.min(value / max, 1);
  const circ   = Math.PI * r;           // semicircle circumference
  const offset = circ * (1 - pct);
  const strokeW = 12;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size * 0.65} viewBox={`0 0 ${size} ${size * 0.65}`}>
        {/* Track */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke="#f3f4f6" strokeWidth={strokeW} strokeLinecap="round"
        />
        {/* Fill */}
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" stroke={color} strokeWidth={strokeW} strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(.22,1,.36,1)" }}
        />
      </svg>
      <div className="-mt-4 text-center">
        <div className="text-2xl font-bold tabular-nums" style={{ color }}>
          {typeof value === "number" ? value.toFixed(value < 10 ? 1 : 0) : value}
        </div>
        {label    && <div className="text-xs font-semibold text-gray-500 mt-0.5">{label}</div>}
        {sublabel && <div className="text-xs text-gray-400">{sublabel}</div>}
      </div>
    </div>
  );
}
