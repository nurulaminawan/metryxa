"use client";

import { useState } from "react";

export function BarChart({ title, caption, unit, points, active, onPick }) {
  const max = Math.max(1, ...points.map((point) => point.value || 0));
  const [hover, setHover] = useState(null);
  const current = hover ?? active;
  if (!points.length) return null;
  return (
    <figure className="chart">
      <figcaption>
        <strong>{title}</strong>
        <span>{caption}</span>
      </figcaption>
      <div className="chart-plot" role="list">
        {points.map((point, index) => (
          <button
            key={point.id}
            type="button"
            role="listitem"
            className={index === current ? "is-active" : ""}
            style={{ "--h": `${Math.max(8, ((point.value || 0) / max) * 100)}%` }}
            aria-pressed={index === active}
            aria-label={`${point.label}: ${point.value} ${unit}`}
            onMouseEnter={() => setHover(index)}
            onMouseLeave={() => setHover(null)}
            onFocus={() => setHover(index)}
            onBlur={() => setHover(null)}
            onClick={() => onPick?.(index)}
          >
            <span className="chart-tip">
              {point.label}
              <b>{point.value} {unit}</b>
            </span>
            <i />
            <em>{point.short}</em>
          </button>
        ))}
      </div>
    </figure>
  );
}

export function MeterChart({ title, caption, rows }) {
  return (
    <figure className="chart">
      <figcaption>
        <strong>{title}</strong>
        <span>{caption}</span>
      </figcaption>
      {rows.map((row) => (
        <div className="meter" key={row.label} title={row.note || row.label}>
          <span>{row.label}</span>
          <div className="meter-track"><i style={{ "--w": `${Math.max(0, Math.min(100, row.value || 0))}%` }} /></div>
          <b>{row.value}</b>
        </div>
      ))}
    </figure>
  );
}
