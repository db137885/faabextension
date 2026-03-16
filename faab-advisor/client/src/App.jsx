import { useState, useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import LeagueDetail from './pages/LeagueDetail';

export default function App() {
  const [leagues, setLeagues] = useState([]);
  const [selectedLeague, setSelectedLeague] = useState(null);
  const [view, setView] = useState('dashboard');

  useEffect(() => {
    fetch('http://localhost:3000/api/leagues')
      .then(res => res.json())
      .then(data => setLeagues(data))
      .catch(err => console.error(err));
  }, [view]);

  const handleSelectLeague = (id) => {
    setSelectedLeague(id);
    setView('league');
  };

  return (
    <div style={{ fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace", background: "#020617", minHeight: "100vh", color: "#f1f5f9" }}>
      <div style={{ borderBottom: "1px solid #1e293b", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>
            <span style={{ color: "#3b82f6" }}>FAAB</span>
            <span style={{ color: "#f59e0b" }}>Advisor</span>
          </div>
          <span style={{ fontSize: 10, padding: "2px 8px", background: "#1e293b", borderRadius: 4, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>Beta</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {["dashboard", "league"].map(v => (
            <button key={v} onClick={() => {
              if (v === 'league' && !selectedLeague && leagues.length > 0) setSelectedLeague(leagues[0].id);
              if (v === 'league' && !selectedLeague && leagues.length === 0) return;
              setView(v);
            }} style={{
              padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
              background: view === v ? "#1e293b" : "transparent", color: view === v ? "#f1f5f9" : "#64748b", transition: "all 0.2s"
            }}>{v === "dashboard" ? "All Leagues" : "League Detail"}</button>
          ))}
        </div>
      </div>

      <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
        {view === "dashboard" ? (
          <Dashboard leagues={leagues} onSelectLeague={handleSelectLeague} />
        ) : (
          selectedLeague ? <LeagueDetail leagueId={selectedLeague} /> : <div style={{ textAlign: "center", padding: 40 }}>Please select a league from the Dashboard.</div>
        )}
      </div>

      <div style={{ borderTop: "1px solid #1e293b", padding: "12px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "#475569" }}>FAAB Advisor MVP · Connected to Live DB</div>
      </div>
    </div>
  );
}
