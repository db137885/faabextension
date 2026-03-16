import React, { useState } from "react";

const confidenceColors = { high: "#16a34a", medium: "#d97706", low: "#dc2626" };
const scarcityBadge = {
  "very high": { bg: "#7f1d1d", text: "#fca5a5" },
  high: { bg: "#78350f", text: "#fde68a" },
  medium: { bg: "#1e3a5f", text: "#93c5fd" },
  low: { bg: "#1a2e1a", text: "#86efac" }
};

export default function BidCard({ rec, budget }) {
  const [expanded, setExpanded] = useState(false);
  const [showTooltip, setShowTooltip] = useState(false);

  const scarcityLevel = rec.scarcity_level || rec.scarcity || "medium";
  const sb = scarcityBadge[scarcityLevel] || scarcityBadge.medium;
  const playerPosition = rec.player?.position || rec.position;

  // Simple hardcoded tooltip text for MVP demonstration
  const scarcityExplanations = {
    "very high": "Critical shortage: < 1 viable starter available per team needing this position.",
    "high": "High shortage: 1-1.5 viable starters available per team needing this position.",
    "medium": "Balanced market: 1.5-2 viable starters available per team needing this position.",
    "low": "Surplus: > 2 viable starters available per team needing this position."
  };

  return (
    <div style={{
      background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 16, marginBottom: 12,
      cursor: "pointer", transition: "all 0.2s ease",
      borderLeft: `3px solid ${confidenceColors[rec.confidence]}`
    }} onClick={() => setExpanded(!expanded)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>{rec.player?.name || rec.player}</span>
            <span style={{ fontSize: 12, padding: "2px 8px", background: "#1e293b", borderRadius: 4, color: "#94a3b8", fontWeight: 600 }}>{playerPosition}</span>
            <span style={{ fontSize: 11, color: "#64748b" }}>{rec.player?.real_team || rec.team}</span>
            <div
              style={{ position: "relative" }}
              onMouseEnter={() => setShowTooltip(true)}
              onMouseLeave={() => setShowTooltip(false)}
            >
              <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 3, background: sb.bg, color: sb.text, fontWeight: 600, cursor: "help" }}>
                {scarcityLevel} scarcity
              </span>
              {showTooltip && (
                <div style={{
                  position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", marginBottom: 8,
                  background: "#1e293b", border: "1px solid #334155", borderRadius: 6, padding: "8px 12px",
                  fontSize: 10, color: "#e2e8f0", width: 200, textAlign: "center", zIndex: 10,
                  boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.5)"
                }}>
                  {scarcityExplanations[scarcityLevel]}
                  <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", borderWidth: 5, borderStyle: "solid", borderColor: "#1e293b transparent transparent transparent" }} />
                </div>
              )}
            </div>
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.4, maxWidth: 500 }}>{rec.reasoning || rec.reason}</div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Base</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#64748b" }}>${rec.base_bid || rec.baseBid}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#3b82f6", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Recommended</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#3b82f6" }}>${rec.market_bid || rec.marketBid}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#f59e0b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Aggressive</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b" }}>${rec.aggressive_bid || rec.aggressiveBid}</div>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #1e293b" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Opponent Analysis</div>
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, padding: "3px 8px", background: "#1e293b", borderRadius: 4, color: "#f1f5f9" }}>
                  {rec.opponents_needing || rec.opponentsNeed} opponents need {playerPosition}
                </span>
                <span style={{ fontSize: 11, padding: "3px 8px", background: "#1e293b", borderRadius: 4, color: "#94a3b8" }}>
                  {((rec.market_bid || rec.marketBid) / budget * 100).toFixed(1)}% of remaining FAAB
                </span>
              </div>
            </div>
            {rec.transientDetails?.projections && (
              <div>
                <div style={{ fontSize: 11, color: "#3b82f6", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Projected Stats</div>
                <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                  {Object.entries(rec.transientDetails.projections).map(([k, v]) => (
                    <div key={k} style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 10, color: "#64748b" }}>{k}</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: "#e2e8f0" }}>{v}</div>
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: confidenceColors[rec.confidence] }} />
                  <span style={{ fontSize: 11, color: confidenceColors[rec.confidence], fontWeight: 600, textTransform: "capitalize" }}>{rec.confidence} confidence</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
