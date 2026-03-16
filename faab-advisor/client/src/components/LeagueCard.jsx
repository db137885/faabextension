import React from 'react';
import BudgetGauge from './BudgetGauge';

export default function LeagueCard({ league, onSelect, isSelected }) {
  const sportIcon = league.sport === "baseball" ? "⚾" : "🏈";
  const userTeam = league.teams?.find(t => t.is_user_team);
  const remaining = userTeam?.remaining_faab || 0;

  return (
    <div onClick={() => onSelect(league.id)} style={{
      background: isSelected ? "#0f172a" : "#020617",
      border: `1px solid ${isSelected ? "#3b82f6" : "#1e293b"}`,
      borderRadius: 10, padding: 14, cursor: "pointer", transition: "all 0.2s ease",
      minWidth: 280
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{sportIcon} {league.name}</span>
        <span style={{ fontSize: 11, padding: "2px 8px", background: "#1e293b", borderRadius: 4, color: "#94a3b8" }}>{league.format_preset}</span>
      </div>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{league.platform}</div>
      <BudgetGauge remaining={remaining} total={league.faab_budget} week={8} totalWeeks={league.total_weeks || 17} />
      <div style={{ marginTop: 8, fontSize: 11, color: "#3b82f6" }}>
        {(league.recommendations || []).length} recommendations
      </div>
    </div>
  );
}
