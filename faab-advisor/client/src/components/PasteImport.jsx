import { useState, useCallback } from 'react';
import DataPreview from './DataPreview.jsx';

const ROSTER_COLUMNS = ['team_name', 'player_name', 'position', 'real_team', 'is_user_team', 'remaining_faab'];
const FA_REQUIRED_COLUMNS = ['player_name', 'position', 'real_team'];

function parseTabDelimited(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { rows: [], headers: [], csvText: '' };

  // Detect delimiter: tab or comma
  const firstLine = lines[0];
  const delimiter = firstLine.includes('\t') ? '\t' : ',';

  const headers = firstLine.split(delimiter).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'));
  const rows = [];
  const csvLines = [headers.join(',')];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = line.split(delimiter).map(v => v.trim());
    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
    csvLines.push(values.join(','));
  }

  return { rows, headers, csvText: csvLines.join('\n') };
}

function detectType(headers) {
  if (headers.includes('team_name') && headers.includes('is_user_team')) return 'roster';
  if (headers.includes('ownership_pct') || headers.some(h => h.startsWith('proj_'))) return 'freeagent';
  if (headers.includes('player_name') && headers.includes('position')) return 'freeagent';
  return null;
}

function validateData(rows, headers, type) {
  const errors = [];

  if (type === 'roster') {
    const missing = ROSTER_COLUMNS.filter(c => !headers.includes(c));
    if (missing.length) errors.push(`Missing columns: ${missing.join(', ')}`);

    const userTeams = rows.filter(r => r.is_user_team === 'true');
    if (userTeams.length === 0) errors.push('No rows marked as is_user_team=true');
  } else if (type === 'freeagent') {
    const missing = FA_REQUIRED_COLUMNS.filter(c => !headers.includes(c));
    if (missing.length) errors.push(`Missing columns: ${missing.join(', ')}`);
  }

  // Duplicate check
  const seen = new Set();
  rows.forEach((r, i) => {
    const key = `${r.player_name}|${r.position}`;
    if (seen.has(key)) errors.push(`Duplicate: ${r.player_name} (${r.position}) at row ${i + 2}`);
    seen.add(key);
  });

  return errors;
}

export default function PasteImport({ onDataReady }) {
  const [text, setText] = useState('');
  const [parsed, setParsed] = useState(null);
  const [detectedType, setDetectedType] = useState(null);
  const [errors, setErrors] = useState([]);

  const handleParse = useCallback(() => {
    if (!text.trim()) return;

    const { rows, headers, csvText } = parseTabDelimited(text);
    if (rows.length === 0) {
      setErrors(['No data rows found. Make sure to include column headers in the first row.']);
      return;
    }

    const type = detectType(headers);
    if (!type) {
      setErrors([
        'Could not detect data type. Expected columns:',
        'Roster: team_name, player_name, position, real_team, is_user_team, remaining_faab',
        'Free Agents: player_name, position, real_team',
      ]);
      return;
    }

    const validationErrors = validateData(rows, headers, type);
    setDetectedType(type);
    setErrors(validationErrors);
    setParsed({ rows, headers, csvText });

    if (validationErrors.length === 0) {
      onDataReady(csvText, type, rows);
    }
  }, [text, onDataReady]);

  return (
    <div className="space-y-4">
      <div className="text-sm text-slate-400">
        Paste tab-delimited data (copied from a spreadsheet) or comma-separated data.
        Include column headers in the first row.
      </div>

      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        placeholder={
          'team_name\tplayer_name\tposition\treal_team\tis_user_team\tremaining_faab\n' +
          'My Team\tJosh Allen\tQB\tBUF\ttrue\t73'
        }
        rows={8}
        className="w-full bg-navy-800 border border-slate-700 rounded px-3 py-2 text-sm text-slate-100 font-mono resize-y focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
      />

      <div className="flex items-center gap-3">
        <button
          onClick={handleParse}
          disabled={!text.trim()}
          className="bg-slate-700 hover:bg-slate-600 text-slate-100 px-4 py-2 rounded text-sm transition-colors disabled:opacity-40"
        >
          Parse & Preview
        </button>
        {detectedType && (
          <span className="text-xs text-slate-400">
            Detected: <span className="text-amber-400">{detectedType === 'roster' ? 'Roster Data' : 'Free Agent Data'}</span>
          </span>
        )}
      </div>

      {parsed && (
        <DataPreview
          rows={parsed.rows}
          type={detectedType}
          errors={errors}
        />
      )}

      {parsed && errors.length > 0 && (
        <button
          onClick={() => onDataReady(parsed.csvText, detectedType, parsed.rows)}
          className="text-sm text-amber-400 hover:text-amber-300 underline"
        >
          Import anyway (ignoring warnings)
        </button>
      )}
    </div>
  );
}
