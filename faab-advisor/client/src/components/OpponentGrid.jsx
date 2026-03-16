export default function OpponentGrid({ opponents }) {
  if (!opponents || opponents.length === 0) return null;

  return (
    <div className="bg-navy-900 border border-slate-800 rounded-lg p-4 mb-5">
      <h3 className="text-sm font-bold text-slate-100 mb-3">Opponent FAAB & Needs</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {opponents.map((opp) => (
          <div key={opp.id} className="bg-navy-950 rounded-md p-2.5 border border-slate-800">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-semibold text-slate-200 truncate">{opp.teamName}</span>
              <span className={`text-xs font-bold ${
                opp.remainingFaab > 700 ? 'text-green-500' :
                opp.remainingFaab > 400 ? 'text-amber-500' : 'text-red-500'
              }`}>
                ${opp.remainingFaab}
              </span>
            </div>
            {opp.needs && opp.needs.length > 0 && (
              <div className="flex gap-1 flex-wrap">
                {opp.needs.map((n, j) => (
                  <span key={j} className="text-[10px] px-1.5 py-0.5 bg-navy-800 rounded text-slate-500">
                    {n}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
