import React from 'react';

export default function BudgetGauge({ remaining, total, week, totalWeeks }) {
  const pct = (remaining / total) * 100;
  const expectedPct = ((totalWeeks - week) / totalWeeks) * 100;
  const status = pct > expectedPct + 10 ? "ahead" : pct < expectedPct - 10 ? "behind" : "on-pace";
  const statusColors = { ahead: "#16a34a", "on-pace": "#3b82f6", behind: "#dc2626" };
  const statusLabels = { ahead: "Ahead of Pace", "on-pace": "On Pace", behind: "Spending Fast" };

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>
        <span>${remaining} / ${total}</span>
        <span style={{ color: statusColors[status], fontWeight: 600 }}>{statusLabels[status]}</span>
      </div>
      <div style={{ height: 6, background: "#1e293b", borderRadius: 3, position: "relative", overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${statusColors[status]}, ${statusColors[status]}88)`, borderRadius: 3, transition: "width 0.6s ease" }} />
        <div style={{ position: "absolute", left: `${expectedPct}%`, top: -2, width: 2, height: 10, background: "#f8fafc", borderRadius: 1, opacity: 0.5 }} />
      </div>
      <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>Week {week} of {totalWeeks} · {pct.toFixed(0)}% remaining</div>
    </div>
  );
}
