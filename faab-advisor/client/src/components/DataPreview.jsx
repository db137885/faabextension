import { useMemo } from 'react';

export default function DataPreview({ rows, type, errors }) {
  const columns = useMemo(() => {
    if (!rows || rows.length === 0) return [];
    return Object.keys(rows[0]);
  }, [rows]);

  if (!rows || rows.length === 0) return null;

  const teamCount = type === 'roster'
    ? new Set(rows.map(r => r.team_name)).size
    : null;
  const playerCount = rows.length;

  return (
    <div className="space-y-3">
      {/* Summary stats */}
      <div className="flex gap-4 text-sm">
        <span className="text-slate-400">
          {type === 'roster' ? 'Roster' : 'Free Agents'}:
        </span>
        <span className="text-amber-400">{playerCount} players</span>
        {teamCount && (
          <span className="text-amber-400">{teamCount} teams</span>
        )}
      </div>

      {/* Validation errors */}
      {errors && errors.length > 0 && (
        <div className="bg-red-900/30 border border-red-700 rounded p-3 space-y-1">
          {errors.map((err, i) => (
            <div key={i} className="text-red-300 text-xs">{err}</div>
          ))}
        </div>
      )}

      {/* Data table */}
      <div className="border border-slate-700 rounded overflow-hidden max-h-64 overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="bg-navy-800 sticky top-0">
            <tr>
              <th className="px-2 py-1.5 text-left text-slate-400 font-medium">#</th>
              {columns.map(col => (
                <th key={col} className="px-2 py-1.5 text-left text-slate-400 font-medium whitespace-nowrap">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {rows.slice(0, 50).map((row, i) => (
              <tr key={i} className="hover:bg-navy-800/50">
                <td className="px-2 py-1 text-slate-500">{i + 1}</td>
                {columns.map(col => (
                  <td key={col} className="px-2 py-1 text-slate-300 whitespace-nowrap">
                    {String(row[col] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > 50 && (
          <div className="bg-navy-800 px-3 py-1 text-xs text-slate-500 text-center">
            Showing 50 of {rows.length} rows
          </div>
        )}
      </div>
    </div>
  );
}
