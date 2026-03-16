import React from 'react';
import BidCard from '../components/BidCard';

function CrossLeagueView({ leagues }) {
    const playerMap = {};
    leagues.forEach(league => {
        (league.recommendations || []).forEach(rec => {
            if (!playerMap[rec.player_id]) playerMap[rec.player_id] = [];
            playerMap[rec.player_id].push({ league: league.name, leagueId: league.id, format: league.format_preset, ...rec });
        });
    });
    const multiLeaguePlayers = Object.entries(playerMap).filter(([_, entries]) => entries.length > 1);

    if (multiLeaguePlayers.length === 0) return null;

    return (
        <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 16, marginBottom: 20 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: "#f59e0b", marginBottom: 4 }}>Cross-League Opportunity</div>
            <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 12 }}>Same player available in multiple leagues — note how bids vary by context</div>
            {multiLeaguePlayers.map(([playerId, entries]) => (
                <div key={playerId} style={{ marginBottom: 12 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9", marginBottom: 6 }}>{entries[0].player?.name || 'Player'} <span style={{ fontWeight: 400, fontSize: 12, color: "#64748b" }}>· available in {entries.length} leagues</span></div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        {entries.map((e, i) => (
                            <div key={i} style={{ background: "#020617", border: "1px solid #1e293b", borderRadius: 8, padding: 10, minWidth: 200, flex: 1 }}>
                                <div style={{ fontSize: 11, color: "#94a3b8", marginBottom: 4 }}>{e.league}</div>
                                <div style={{ fontSize: 10, color: "#64748b", marginBottom: 6 }}>{e.format}</div>
                                <div style={{ display: "flex", gap: 16 }}>
                                    <div>
                                        <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase" }}>Base</div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: "#64748b" }}>${e.base_bid}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 9, color: "#3b82f6", textTransform: "uppercase" }}>Rec</div>
                                        <div style={{ fontSize: 16, fontWeight: 800, color: "#3b82f6" }}>${e.market_bid}</div>
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 9, color: "#64748b", textTransform: "uppercase" }}>Opponents</div>
                                        <div style={{ fontSize: 14, fontWeight: 700, color: "#e2e8f0" }}>{e.opponents_needing} need {e.player?.position}</div>
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

export default function Dashboard({ leagues, onSelectLeague }) {
    if (!leagues || leagues.length === 0) return <div style={{ textAlign: "center", padding: 40, color: "#64748b" }}>No leagues detected or loading...</div>;

    const totalRemaining = leagues.reduce((s, l) => s + (l.teams?.find(t => t.is_user_team)?.remaining_faab || 0), 0);
    const totalRecs = leagues.reduce((s, l) => s + (l.recommendations?.length || 0), 0);

    // Calculate cross league players
    let crossLeagueCount = 0;
    const playerMap = {};
    leagues.forEach(league => {
        (league.recommendations || []).forEach(rec => {
            if (!playerMap[rec.player_id]) playerMap[rec.player_id] = 0;
            playerMap[rec.player_id]++;
            if (playerMap[rec.player_id] === 2) crossLeagueCount++;
        });
    });

    return (
        <>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                {[
                    { label: "Active Leagues", value: leagues.length, color: "#f1f5f9" },
                    { label: "Total FAAB Remaining", value: `$${totalRemaining.toLocaleString()}`, color: "#3b82f6" },
                    { label: "Open Recommendations", value: totalRecs, color: "#f59e0b" },
                    { label: "Cross-League Targets", value: `${crossLeagueCount} players`, color: "#16a34a" },
                ].map((s, i) => (
                    <div key={i} style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 14, textAlign: "center" }}>
                        <div style={{ fontSize: 10, color: "#64748b", textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                    </div>
                ))}
            </div>

            <CrossLeagueView leagues={leagues} />

            {leagues.map(l => (
                <div key={l.id} style={{ marginBottom: 24 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                        <div>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "#f1f5f9" }}>{l.sport === "baseball" ? "⚾" : "🏈"} {l.name}</span>
                            <span style={{ fontSize: 11, color: "#64748b", marginLeft: 8 }}>{l.format_preset} · ${(l.teams?.find(t => t.is_user_team)?.remaining_faab || 0)} remaining</span>
                        </div>
                        <button onClick={() => onSelectLeague(l.id)} style={{
                            padding: "4px 12px", borderRadius: 6, border: "1px solid #1e293b", background: "transparent", color: "#3b82f6", fontSize: 11, cursor: "pointer", fontFamily: "inherit"
                        }}>View Detail →</button>
                    </div>
                    {(l.recommendations || []).length === 0 ? (
                        <div style={{ fontSize: 12, color: "#64748b", background: "#0f172a", padding: 16, borderRadius: 8, border: "1px solid #1e293b", textAlign: "center" }}>
                            No recommendations generated yet. Go to View Detail to run the engine.
                        </div>
                    ) : (
                        (l.recommendations || []).map((rec, i) => (
                            <BidCard key={rec.id || i} rec={rec} budget={l.teams?.find(t => t.is_user_team)?.remaining_faab || 0} />
                        ))
                    )}
                </div>
            ))}
        </>
    );
}
