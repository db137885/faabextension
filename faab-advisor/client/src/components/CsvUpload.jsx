import { useState, useRef, useCallback } from 'react';
import DataPreview from './DataPreview.jsx';

const ROSTER_COLUMNS = ['team_name', 'player_name', 'position', 'real_team', 'is_user_team', 'remaining_faab'];
const FA_REQUIRED_COLUMNS = ['player_name', 'position', 'real_team'];

function parseCsvText(text) {
  const lines = text.trim().split('\n');
  if (lines.length < 2) return { rows: [], headers: [] };

  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Handle commas in quoted fields
    const values = [];
    let current = '';
    let inQuotes = false;
    for (const char of line) {
      if (char === '"') { inQuotes = !inQuotes; continue; }
      if (char === ',' && !inQuotes) { values.push(current.trim()); current = ''; continue; }
      current += char;
    }
    values.push(current.trim());

    const row = {};
    headers.forEach((h, idx) => { row[h] = values[idx] || ''; });
    rows.push(row);
  }

  return { rows, headers };
}

function detectType(headers) {
  if (headers.includes('team_name') && headers.includes('is_user_team')) return 'roster';
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

    const teamNames = new Set(userTeams.map(r => r.team_name));
    if (teamNames.size > 1) errors.push('Multiple team names marked as user team');
  } else {
    const missing = FA_REQUIRED_COLUMNS.filter(c => !headers.includes(c));
    if (missing.length) errors.push(`Missing columns: ${missing.join(', ')}`);
  }

  // Check for duplicate players
  const seen = new Set();
  rows.forEach((r, i) => {
    const key = `${r.player_name}|${r.position}`;
    if (seen.has(key)) errors.push(`Duplicate: ${r.player_name} (${r.position}) at row ${i + 2}`);
    seen.add(key);
  });

  // Check for empty player names
  rows.forEach((r, i) => {
    if (!r.player_name) errors.push(`Empty player_name at row ${i + 2}`);
    if (!r.position) errors.push(`Empty position at row ${i + 2}`);
  });

  return errors;
}

export default function CsvUpload({ type, onDataReady }) {
  const [dragOver, setDragOver] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [errors, setErrors] = useState([]);
  const [fileName, setFileName] = useState('');
  const inputRef = useRef(null);

  const processFile = useCallback((text, name) => {
    const { rows, headers } = parseCsvText(text);
    const detectedType = type || detectType(headers);
    const validationErrors = validateData(rows, headers, detectedType);

    setFileName(name);
    setErrors(validationErrors);
    setParsed({ rows, headers, type: detectedType });

    if (validationErrors.length === 0) {
      onDataReady(text, detectedType, rows);
    }
  }, [type, onDataReady]);

  const handleFile = useCallback((file) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => processFile(e.target.result, file.name);
    reader.readAsText(file);
  }, [processFile]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setDragOver(true);
  }, []);

  const isRoster = type === 'roster';

  return (
    <div className="space-y-4">
      {/* Template download */}
      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-400">Download template:</span>
        <button
          onClick={() => downloadTemplate(isRoster ? 'roster' : 'freeagent')}
          className="text-amber-400 hover:text-amber-300 underline"
        >
          {isRoster ? 'roster_template.csv' : 'free_agents_template.csv'}
        </button>
      </div>

      {/* Drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={() => setDragOver(false)}
        onClick={() => inputRef.current?.click()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${dragOver
            ? 'border-amber-400 bg-amber-500/5'
            : 'border-slate-700 hover:border-slate-500 bg-navy-800/30'
          }
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".csv,.txt"
          onChange={e => handleFile(e.target.files?.[0])}
          className="hidden"
        />
        <div className="text-slate-400 text-sm">
          {fileName ? (
            <span className="text-amber-400">{fileName}</span>
          ) : (
            <>
              <span className="text-slate-300">Drop a CSV file here</span>
              <span className="text-slate-500"> or click to browse</span>
            </>
          )}
        </div>
      </div>

      {/* Preview */}
      {parsed && (
        <DataPreview
          rows={parsed.rows}
          type={parsed.type}
          errors={errors}
        />
      )}

      {/* Confirm button when there are no critical errors */}
      {parsed && errors.length > 0 && (
        <button
          onClick={() => onDataReady(null, parsed.type, parsed.rows)}
          className="text-sm text-amber-400 hover:text-amber-300 underline"
        >
          Import anyway (ignoring warnings)
        </button>
      )}
    </div>
  );
}

function downloadTemplate(type) {
  let content;
  if (type === 'roster') {
    content = [
      'team_name,player_name,position,real_team,is_user_team,remaining_faab',
      'My Team,Josh Allen,QB,BUF,true,73',
      'My Team,Saquon Barkley,RB,PHI,true,73',
      'My Team,CeeDee Lamb,WR,DAL,true,73',
      'Opponent 1,Patrick Mahomes,QB,KC,false,88',
      'Opponent 1,Derrick Henry,RB,BAL,false,88',
    ].join('\n');
  } else {
    content = [
      'player_name,position,real_team,ownership_pct,proj_R,proj_HR,proj_RBI,proj_SB,proj_AVG,proj_W,proj_SV,proj_K,proj_ERA,proj_WHIP,games_played,note',
      'Gavin Williams,SP,CLE,22,,,,,,,0,85,3.20,1.08,8,Returning from IL',
      'Victor Robles,OF,SEA,12,18,3,12,14,.262,,,,,,30,Speed specialist',
    ].join('\n');
  }

  const blob = new Blob([content], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = type === 'roster' ? 'roster_template.csv' : 'free_agents_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}
