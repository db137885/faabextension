import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import BudgetGauge from '../components/BudgetGauge';
import BidCard from '../components/BidCard';

export default function LeagueDetail({ leagueId }) {
    const navigate = useNavigate();
    const [league, setLeague] = useState(null);
    const [recommendations, setRecommendations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [engineLoading, setEngineLoading] = useState(false);

    const fetchLeague = async () => {
        try {
            const res = await fetch(`/api/leagues/${leagueId}`);
            const data = await res.json();
            setLeague(data);
            setRecommendations(data.recommendations || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchLeague();
    }, [leagueId]);

    const runEngine = async () => {
        setEngineLoading(true);
        try {
            const res = await fetch(`/api/leagues/${leagueId}/recommendations`, {
                method: 'POST'
            });
            const data = await res.json();
            setRecommendations(data.sort((a, b) => b.marketBid - a.marketBid));
        } catch (e) {
            console.error(e);
        } finally {
            setEngineLoading(false);
        }
    };

    if (loading || !league) return <div style={{ textAlign: "center", padding: 40 }}>Loading league {leagueId}...</div>;

    const userTeam = league.teams?.find(t => t.is_user_team) || {};
    const opponents = league.teams?.filter(t => !t.is_user_team) || [];

    return (
        <div style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                    <h2 style={{ fontSize: 18, fontWeight: 800, color: "#f1f5f9", margin: "0 0 4px 0" }}>
                        {league.sport === "baseball" ? "⚾" : "🏈"} {league.name}
                    </h2>
                    <div style={{ fontSize: 12, color: "#64748b" }}>
                        {league.platform} · {league.format_preset} · Week 8
                    </div>
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button
                        onClick={() => navigate(`/import/${leagueId}`)}
                        style={{
                            padding: "8px 16px", borderRadius: 6, border: "1px solid #10b981",
                            background: "transparent", color: "#10b981",
                            fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit"
                        }}>
                        Import / Paste Data
                    </button>
                    {recommendations.length > 0 && (
                        <button
                            onClick={() => setRecommendations([])}
                            style={{
                                padding: "8px 16px", borderRadius: 6, border: "1px solid #3b82f6",
                                background: "transparent", color: "#3b82f6",
                                fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit"
                            }}>
                            Clear Results
                        </button>
                    )}
                    <button
                        onClick={runEngine}
                        disabled={engineLoading}
                        style={{
                            padding: "8px 16px", borderRadius: 6, border: "none",
                            background: engineLoading ? "#3b82f650" : "#3b82f6", color: "#fff",
                            fontSize: 12, fontWeight: 700, cursor: engineLoading ? "not-allowed" : "pointer", fontFamily: "inherit"
                        }}>
                        {engineLoading ? 'Analyzing...' : 'Run Bid Engine'}
                    </button>
                </div>
            </div>

            <div style={{ marginTop: 16 }}>
                <BudgetGauge remaining={userTeam.remaining_faab || 0} total={league.faab_budget} week={8} totalWeeks={league.total_weeks || 17} />
            </div>

            {opponents.length > 0 && (
                <div style={{ background: "#0f172a", border: "1px solid #1e293b", borderRadius: 10, padding: 16, marginTop: 20, marginBottom: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 10 }}>Opponent FAAB & Scanned Needs</div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
                        {opponents.map((opp, i) => (
                            <div key={i} style={{ background: "#020617", borderRadius: 6, padding: 10, border: "1px solid #1e293b" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: "#e2e8f0" }}>{opp.team_name}</span>
                                    <span style={{ fontSize: 12, fontWeight: 700, color: opp.remaining_faab > (league.faab_budget * 0.6) ? "#16a34a" : opp.remaining_faab > (league.faab_budget * 0.3) ? "#f59e0b" : "#dc2626" }}>
                                        ${opp.remaining_faab}
                                    </span>
                                </div>
                                {/* Simplified needs display: for MVP Demo, engine logic is internal so we just show raw team info */}
                                <div style={{ fontSize: 10, color: "#64748b" }}>
                                    {opp.rosters?.length || 0} active players
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            <div style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9", marginBottom: 10 }}>
                FAAB Recommendations — Click to expand
            </div>
            {recommendations.length > 0 ? (
                recommendations.map((rec, i) => (
                    <BidCard key={rec.id || i} rec={rec} budget={userTeam.remaining_faab || 0} />
                ))
            ) : (
                <div style={{ fontSize: 12, color: "#64748b", background: "#0f172a", padding: 24, borderRadius: 8, border: "1px dashed #1e293b", textAlign: "center" }}>
                    No recommendations available for this week. Click "Run Bid Engine" to generate dynamically.
                </div>
            )}

            {recommendations.length > 0 && (
                <div style={{ textAlign: "center", padding: 20, marginTop: 12 }}>
                    <button style={{
                        padding: "10px 24px", borderRadius: 8, border: "1px solid #3b82f6", background: "#3b82f620", color: "#3b82f6",
                        fontSize: 13, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5
                    }}>Export Bid Sheet (CSV)</button>
                    <div style={{ fontSize: 10, color: "#64748b", marginTop: 6 }}>Download formatted bids to manually enter into platforms</div>
                </div>
            )}
        </div>
    );
}
