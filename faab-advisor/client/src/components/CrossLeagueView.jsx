export default function CrossLeagueView({ leagues }) {
  if (!leagues || leagues.length < 2) return null;

  // Build a map of player name → entries across leagues
  const playerMap = {};
  leagues.forEach(league => {
    (league.recommendations || []).forEach(rec => {
      const name = rec.player?.name || rec.playerName;
      if (!name) return;
      if (!playerMap[name]) playerMap[name] = [];
      playerMap[name].push({
        league: league.name,
        format: league.format,
        baseBid: rec.baseBid,
        marketBid: rec.marketBid,
        position: rec.player?.position || rec.position,
        opponentsNeeding: rec.opponentsNeeding,
      });
    });
  });

  const multiLeague = Object.entries(playerMap).filter(([_, entries]) => entries.length > 1);
  if (multiLeague.length === 0) return null;

  return (
    <div className="bg-navy-900 border border-slate-800 rounded-lg p-4 mb-5 animate-fade-in">
      <div className="text-sm font-bold text-amber-500 mb-1">Cross-League Opportunity</div>
      <p className="text-xs text-slate-500 mb-3">Same player available in multiple leagues — note how bids vary by context</p>
      {multiLeague.map(([player, entries]) => (
        <div key={player} className="mb-3 last:mb-0">
          <div className="text-sm font-bold text-slate-100 mb-2">
            {player} <span className="font-normal text-xs text-slate-600">available in {entries.length} leagues</span>
          </div>
          <div className="flex gap-2.5 flex-wrap">
            {entries.map((e, i) => (
              <div key={i} className="bg-navy-950 border border-slate-800 rounded-md p-2.5 min-w-[190px] flex-1">
                <div className="text-xs text-slate-400 mb-0.5">{e.league}</div>
                <div className="text-[10px] text-slate-600 mb-1.5">{e.format}</div>
                <div className="flex gap-4">
                  <div>
                    <div className="text-[9px] text-slate-600 uppercase">Base</div>
                    <div className="text-sm font-bold text-slate-600">${e.baseBid}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-blue-500 uppercase">Rec</div>
                    <div className="text-base font-extrabold text-blue-500">${e.marketBid}</div>
                  </div>
                  <div>
                    <div className="text-[9px] text-slate-600 uppercase">Opponents</div>
                    <div className="text-sm font-bold text-slate-200">{e.opponentsNeeding} need {e.position}</div>
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
