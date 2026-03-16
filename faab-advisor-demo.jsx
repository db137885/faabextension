import { useState } from "react";

const LEAGUES = [
  {
    id: 1, name: "NFBC Online Championship #4", sport: "baseball", platform: "NFBC",
    format: "12-team 5x5 Roto", budget: 1000, remaining: 714, week: 8, totalWeeks: 27,
    standing: "3rd", record: null,
    opponents: [
      { name: "Team Alvarez", faab: 820, needs: ["SP", "OF"] },
      { name: "Team Soto", faab: 550, needs: ["C", "SP"] },
      { name: "Team Ohtani", faab: 910, needs: ["RP"] },
      { name: "Team Acuna", faab: 340, needs: ["SP", "SS", "OF"] },
      { name: "Team Judge", faab: 680, needs: ["SP", "2B"] },
      { name: "Team Tatis", faab: 790, needs: ["SP"] },
      { name: "Team Betts", faab: 445, needs: ["C", "OF"] },
      { name: "Team Turner", faab: 615, needs: ["SP", "RP"] },
      { name: "Team Lindor", faab: 520, needs: ["OF"] },
      { name: "Team Harper", faab: 380, needs: ["SP", "3B"] },
      { name: "Team Witt", faab: 730, needs: ["SP", "OF"] },
    ],
    recommendations: [
      {
        player: "Gavin Williams", position: "SP", team: "CLE",
        reason: "Returning from IL, averaged 9.2 K/9 before injury. Two-start week upcoming vs DET + CWS.",
        baseBid: 28, marketBid: 41, aggressiveBid: 58,
        confidence: "high", opponentsNeed: 7, scarcity: "high",
        needMatch: true, budgetImpact: 5.7,
        opponentDetail: "7 of 11 opponents need SP. Team Ohtani ($910 remaining) and Team Witt ($730) are biggest threats.",
        projection: { W: 2, K: 16, ERA: 3.20, WHIP: 1.08 }
      },
      {
        player: "Luis Matos", position: "OF", team: "SF",
        reason: "Called up Tuesday, hitting .310/.365/.520 at AAA. Everyday role in SF outfield.",
        baseBid: 19, marketBid: 24, aggressiveBid: 35,
        confidence: "medium", opponentsNeed: 4, scarcity: "medium",
        needMatch: false, budgetImpact: 3.4,
        opponentDetail: "4 opponents need OF but only Team Alvarez ($820) has significant budget pressure.",
        projection: { AVG: ".275", HR: 3, RBI: 12, SB: 4 }
      },
      {
        player: "Yennier Cano", position: "RP", team: "BAL",
        reason: "Named closer after Fujinami DFA. Elite groundball rate, save opportunities locked in.",
        baseBid: 42, marketBid: 46, aggressiveBid: 62,
        confidence: "high", opponentsNeed: 2, scarcity: "very high",
        needMatch: true, budgetImpact: 6.4,
        opponentDetail: "Only 2 opponents need RP but closers are extremely scarce. Team Ohtani ($910) historically overpays for relievers.",
        projection: { SV: 5, ERA: 2.40, WHIP: 0.95, K: 11 }
      },
    ]
  },
  {
    id: 2, name: "High Stakes Superflex PPR", sport: "football", platform: "Sleeper",
    format: "12-team SF PPR + TEP", budget: 100, remaining: 73, week: 6, totalWeeks: 17,
    standing: null, record: "3-2",
    opponents: [
      { name: "GridIron Kings", faab: 88, needs: ["QB", "RB"] },
      { name: "TD Machines", faab: 42, needs: ["WR"] },
      { name: "Waiver Wizards", faab: 95, needs: ["QB", "TE"] },
      { name: "Playoff Push", faab: 61, needs: ["RB", "WR"] },
      { name: "Tank Nation", faab: 15, needs: ["QB", "RB", "WR"] },
      { name: "Contender SZN", faab: 80, needs: ["RB"] },
      { name: "Stack Attack", faab: 70, needs: ["TE", "RB"] },
      { name: "Bye Week Blues", faab: 55, needs: ["QB"] },
      { name: "Red Zone", faab: 38, needs: ["WR", "TE"] },
      { name: "Deep Threats", faab: 82, needs: ["QB", "RB"] },
      { name: "Snap Counts", faab: 67, needs: ["RB"] },
    ],
    recommendations: [
      {
        player: "Drake Maye", position: "QB", team: "NE",
        reason: "Named starter. In superflex, any starting QB is premium. Rushing upside adds floor.",
        baseBid: 22, marketBid: 34, aggressiveBid: 48,
        confidence: "high", opponentsNeed: 4, scarcity: "very high",
        needMatch: true, budgetImpact: 46.6,
        opponentDetail: "4 opponents need QB in a SUPERFLEX league. Waiver Wizards ($95) and GridIron Kings ($88) will bid aggressively. This is a league-defining add.",
        projection: { "Pts/Wk": 16.2, "Pass Yds": 225, "Rush Yds": 28, "TDs": 1.5 }
      },
      {
        player: "Audric Estime", position: "RB", team: "DEN",
        reason: "Javonte Williams out 4-6 weeks. Estime gets early-down and goal-line work immediately.",
        baseBid: 15, marketBid: 21, aggressiveBid: 30,
        confidence: "medium", opponentsNeed: 5, scarcity: "medium",
        needMatch: false, budgetImpact: 28.8,
        opponentDetail: "5 opponents need RB. Contender SZN ($80) and Deep Threats ($82) are most likely competitors.",
        projection: { "Pts/Wk": 12.8, "Rush Yds": 62, "Rec": 1.5, "TDs": 0.6 }
      },
      {
        player: "Tucker Kraft", position: "TE", team: "GB",
        reason: "TE premium league. Luke Musgrave on IR, Kraft becomes the clear TE1 in a top-5 offense.",
        baseBid: 8, marketBid: 12, aggressiveBid: 18,
        confidence: "medium", opponentsNeed: 3, scarcity: "low",
        needMatch: false, budgetImpact: 16.4,
        opponentDetail: "3 opponents need TE. Stack Attack ($70) is the main threat. TE premium scoring makes this more valuable than it appears.",
        projection: { "Pts/Wk": 11.4, "Rec": 4.2, "Yds": 48, "TDs": 0.4 }
      },
    ]
  },
  {
    id: 3, name: "NFBC Main Event Team 2", sport: "baseball", platform: "NFBC",
    format: "15-team 5x5 Roto", budget: 1000, remaining: 580, week: 8, totalWeeks: 27,
    standing: "7th", record: null,
    opponents: [],
    recommendations: [
      {
        player: "Gavin Williams", position: "SP", team: "CLE",
        baseBid: 35, marketBid: 52, aggressiveBid: 70,
        reason: "15-team league = deeper rosters = higher demand. Same player, very different bid.",
        confidence: "high", opponentsNeed: 9, scarcity: "very high",
        needMatch: true, budgetImpact: 9.0,
        opponentDetail: "9 of 14 opponents need SP in this 15-team format. Scarcity is extreme.",
        projection: { W: 2, K: 16, ERA: 3.20, WHIP: 1.08 }
      },
    ]
  }
];

const confidenceColors = { high: "#16a34a", medium: "#d97706", low: "#dc2626" };
const scarcityBadge = { "very high": { bg: "#7f1d1d", text: "#fca5a5" }, high: { bg: "#78350f", text: "#fde68a" }, medium: { bg: "#1e3a5f", text: "#93c5fd" }, low: { bg: "#1a2e1a", text: "#86efac" } };

function BudgetGauge({ remaining, total, week, totalWeeks }) {
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
      <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>Week {week} of {totalWeeks} · {pct.toFixed(0)}% remaining (expected: ~{expectedPct.toFixed(0)}%)</div>
    </div>
  );
}

function BidCard({ rec, budget }) {
  const [expanded, setExpanded] = useState(false);
  const sb = scarcityBadge[rec.scarcity] || scarcityBadge.medium;

  return (
    <div style={{
      background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 16, marginBottom: 12,
      cursor: "pointer", transition: "all 0.2s ease",
      borderLeft: `3px solid ${confidenceColors[rec.confidence]}`
    }} onClick={() => setExpanded(!expanded)}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: "#f1f5f9" }}>{rec.player}</span>
            <span style={{ fontSize: 12, padding: "2px 8px", background: "#1e293b", borderRadius: 4, color: "#94a3b8", fontWeight: 600 }}>{rec.position}</span>
            <span style={{ fontSize: 11, color: "#64748b" }}>{rec.team}</span>
            <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 3, background: sb.bg, color: sb.text, fontWeight: 600 }}>{rec.scarcity} scarcity</span>
          </div>
          <div style={{ fontSize: 12, color: "#94a3b8", lineHeight: 1.4, maxWidth: 500 }}>{rec.reason}</div>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Base</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#64748b" }}>${rec.baseBid}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#3b82f6", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Recommended</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: "#3b82f6" }}>${rec.marketBid}</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 10, color: "#f59e0b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 2 }}>Aggressive</div>
            <div style={{ fontSize: 18, fontWeight: 700, color: "#f59e0b" }}>${rec.aggressiveBid}</div>
          </div>
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #1e293b" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <div>
              <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Opponent Analysis</div>
              <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.6 }}>{rec.opponentDetail}</div>
              <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                <span style={{ fontSize: 11, padding: "3px 8px", background: "#1e293b", borderRadius: 4, color: "#f1f5f9" }}>
                  {rec.opponentsNeed} opponents need {rec.position}
                </span>
                <span style={{ fontSize: 11, padding: "3px 8px", background: rec.needMatch ? "#14532d" : "#1e293b", borderRadius: 4, color: rec.needMatch ? "#86efac" : "#94a3b8" }}>
                  {rec.needMatch ? "Fills your roster need" : "Nice-to-have add"}
                </span>
                <span style={{ fontSize: 11, padding: "3px 8px", background: "#1e293b", borderRadius: 4, color: rec.budgetImpact > 10 ? "#fca5a5" : "#94a3b8" }}>
                  {rec.budgetImpact}% of remaining FAAB
                </span>
              </div>
            </div>
            <div>
              <div style={{ fontSize: 11, color: "#3b82f6", fontWeight: 700, marginBottom: 6, textTransform: "uppercase", letterSpacing: 1 }}>Projected Stats (Next 2 Weeks)</div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                {Object.entries(rec.projection).map(([k, v]) => (
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
          </div>
        </div>
      )}
    </div>
  );
}

function LeagueCard({ league, onSelect, isSelected }) {
  const sportIcon = league.sport === "baseball" ? "⚾" : "🏈";
  return (
    <div onClick={() => onSelect(league.id)} style={{
      background: isSelected ? "#0f172a" : "#020617",
      border: `1px solid ${isSelected ? "#3b82f6" : "#1e293b"}`,
      borderRadius: 10, padding: 14, cursor: "pointer", transition: "all 0.2s ease",
      minWidth: 280
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>{sportIcon} {league.name}</span>
        <span style={{ fontSize: 11, padding: "2px 8px", background: "#1e293b", borderRadius: 4, color: "#94a3b8" }}>{league.format}</span>
      </div>
      <div style={{ fontSize: 11, color: "#64748b", marginBottom: 4 }}>{league.platform} · {league.standing ? `${league.standing} place` : league.record}</div>
      <BudgetGauge remaining={league.remaining} total={league.budget} week={league.week} totalWeeks={league.totalWeeks} />
      <div style={{ marginTop: 8, fontSize: 11, color: "#3b82f6" }}>
        {league.recommendations.length} recommendation{league.recommendations.length !== 1 ? "s" : ""} this period
      </div>
    </div>
  );
}

function CrossLeagueView() {
  const playerMap = {};
  LEAGUES.forEach(league => {
    league.recommendations.forEach(rec => {
      if (!playerMap[rec.player]) playerMap[rec.player] = [];
      playerMap[rec.player].push({ league: league.name, leagueId: league.id, format: league.format, ...rec });
    });
  });
  const multiLeaguePlayers = Object.entries(playerMap).filter(([_, entries]) => entries.length > 1);

  if (multiLeaguePlayers.length === 0) return null;

  return (
    <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 16, marginBottom: 20 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>Cross-League Opportunity</div>
      <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>Same player available in multiple leagues — note how bids vary by context</div>
      {multiLeaguePlayers.map(([player, entries]) => (
        <div key={player} style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>{player} <span style={{ fontWeight: 400, fontSize: 12, color: "#64748b" }}>· available in {entries.length} leagues</span></div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {entries.map((e, i) => (
              <div key={i} style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8, padding: 10, minWidth: 200, flex: 1 }}>
                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>{e.league}</div>
                <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6 }}>{e.format}</div>
                <div style={{ display: "flex", gap: 16 }}>
                  <div>
                    <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase" }}>Base</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#64748b" }}>${e.baseBid}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: "#3b82f6", textTransform: "uppercase" }}>Rec</div>
                    <div style={{ fontSize: 16, fontWeight: 800, color: "#3b82f6" }}>${e.marketBid}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase" }}>Opponents</div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{e.opponentsNeed} need {e.position}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function FAABAdvisor() {
  const [selectedLeague, setSelectedLeague] = useState(LEAGUES[0].id);
  const [view, setView] = useState("dashboard");
  const league = LEAGUES.find(l => l.id === selectedLeague);

  return (
    <div style={{ fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace", background: "#020617", minHeight: "100vh", color: "#f1f5f9" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid #1e293b", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>
            <span style={{ color: "#3b82f6" }}>FAAB</span>
            <span style={{ color: "#f59e0b" }}>Advisor</span>
          </div>
          <span style={{ fontSize: 10, padding: "2px 8px", background: "#1e293b", borderRadius: 4, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>Demo</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["dashboard", "league"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
              background: view === v ? "#1e293b" : "transparent", color: view === v ? "#f1f5f9" : "#64748b", transition: "all 0.2s"
            }}>{v === "dashboard" ? "All Leagues" : "League Detail"}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
        {/* League selector */}
        <div style={{ display: "flex", gap: 12, marginBottom: 20, overflowX: "auto", paddingBottom: 4 }}>
          {LEAGUES.map(l => (
            <LeagueCard key={l.id} league={l} onSelect={(id) => { setSelectedLeague(id); setView("league"); }} isSelected={selectedLeague === l.id && view === "league"} />
          ))}
        </div>

        {view === "dashboard" ? (
          <>
            {/* Summary stats */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
              {[
                { label: "Active Leagues", value: LEAGUES.length, color: "#f1f5f9" },
                { label: "Total FAAB Remaining", value: `$${LEAGUES.reduce((s, l) => s + l.remaining, 0).toLocaleString()}`, color: "#3b82f6" },
                { label: "Open Recommendations", value: LEAGUES.reduce((s, l) => s + l.recommendations.length, 0), color: "#f59e0b" },
                { label: "Cross-League Targets", value: "1 player", color: "#16a34a" },
              ].map((s, i) => (
                <div key={i} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 14, textAlign: "center" }}>
                  <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                </div>
              ))}
            </div>

            <CrossLeagueView />

            {/* All recommendations grouped by league */}
            {LEAGUES.map(l => (
              <div key={l.id} style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{l.sport === "baseball" ? "⚾" : "🏈"} {l.name}</span>
                    <span style={{ fontSize: 11, color: "#64748b", marginLeft: 8 }}>{l.format} · ${l.remaining} remaining</span>
                  </div>
                  <button onClick={() => { setSelectedLeague(l.id); setView("league"); }} style={{
                    padding: "4px 12px", borderRadius: 6, border: "1px solid #1e293b", background: "transparent", color: "#3b82f6", fontSize: 11, cursor: "pointer", fontFamily: "inherit"
                  }}>View Detail →</button>
                </div>
                {l.recommendations.map((rec, i) => (
                  <BidCard key={i} rec={rec} budget={l.remaining} />
                ))}
              </div>
            ))}
          </>
        ) : (
          <>
            {/* League detail view */}
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", margin: "0 0 4px 0" }}>
                {league.sport === "baseball" ? "⚾" : "🏈"} {league.name}
              </h2>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {league.platform} · {league.format} · {league.standing ? `${league.standing} place` : league.record} · Week {league.week}
              </div>
              <BudgetGauge remaining={league.remaining} total={league.budget} week={league.week} totalWeeks={league.totalWeeks} />
            </div>

            {/* Opponent FAAB overview */}
            {league.opponents.length > 0 && (
              <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 10 }}>Opponent FAAB & Needs</div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                  {league.opponents.map((opp, i) => (
                    <div key={i} style={{ background: "#020617", borderRadius: 6, padding: 10, border: "1px solid #1e293b" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{opp.name}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: opp.faab > 700 ? "#16a34a" : opp.faab > 400 ? "#f59e0b" : "#dc2626" }}>${opp.faab}</span>
                      </div>
                      <div style={{ display: "flex", gap: 4 }}>
                        {opp.needs.map((n, j) => (
                          <span key={j} style={{ fontSize: 10, padding: "1px 6px", background: "#1e293b", borderRadius: 3, color: "#94a3b8" }}>{n}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 10 }}>
              FAAB Recommendations — Click to expand
            </div>
            {league.recommendations.map((rec, i) => (
              <BidCard key={i} rec={rec} budget={league.remaining} />
            ))}

            {/* Export placeholder */}
            <div style={{ textAlign: "center", padding: 20, marginTop: 12 }}>
              <button style={{
                padding: "10px 24px", borderRadius: 8, border: "1px solid #3b82f6", background: "#3b82f620", color: "#3b82f6",
                fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5
              }}>Export Bid Sheet (CSV)</button>
              <div style={{ fontSize: 10, color: "#64748b", marginTop: 6 }}>Download formatted bids to manually enter into {league.platform}</div>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: "1px solid #1e293b", padding: "12px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "#475569" }}>FAAB Advisor MVP Demo · Sample data for illustration · Not connected to live platforms</div>
      </div>
    </div>
  );
}
