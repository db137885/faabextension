import { useState, useEffect } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import LeagueDetail from './pages/LeagueDetail';
import ImportData from './pages/ImportData';

function LeagueDetailWrapper() {
   const { leagueId } = useParams();
   return <LeagueDetail leagueId={leagueId} />;
}

export default function App() {
  const [leagues, setLeagues] = useState([]);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetch('/api/leagues')
      .then(res => res.json())
      .then(data => setLeagues(data))
      .catch(err => console.error(err));
  }, [location.pathname]);

  return (
    <div style={{ fontFamily: "'JetBrains Mono', 'SF Mono', 'Fira Code', monospace", background: "#020617", minHeight: "100vh", color: "#f1f5f9" }}>
      <div style={{ borderBottom: "1px solid #1e293b", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }} onClick={() => navigate('/')}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: -0.5 }}>
            <span style={{ color: "#3b82f6" }}>FAAB</span>
            <span style={{ color: "#f59e0b" }}>Advisor</span>
          </div>
          <span style={{ fontSize: 10, padding: "2px 8px", background: "#1e293b", borderRadius: 4, color: "#64748b", textTransform: "uppercase", letterSpacing: 1 }}>Beta</span>
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => navigate('/')} style={{
              padding: "6px 14px", borderRadius: 6, border: "none", cursor: "pointer", fontSize: 12, fontWeight: 600, fontFamily: "inherit",
              background: location.pathname === '/' ? "#1e293b" : "transparent", color: location.pathname === '/' ? "#f1f5f9" : "#64748b", transition: "all 0.2s"
          }}>All Leagues</button>
        </div>
      </div>

      <div style={{ padding: 24, maxWidth: 1100, margin: "0 auto" }}>
        <Routes>
           <Route path="/" element={<Dashboard leagues={leagues} />} />
           <Route path="/league/:leagueId" element={<LeagueDetailWrapper />} />
           <Route path="/import/:id" element={<ImportData />} />
        </Routes>
      </div>

      <div style={{ borderTop: "1px solid #1e293b", padding: "12px 24px", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "#475569" }}>FAAB Advisor MVP · Connected to Live DB</div>
      </div>
    </div>
  );
}
