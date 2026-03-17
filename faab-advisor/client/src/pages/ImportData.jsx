import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import CsvUpload from '../components/CsvUpload.jsx';
import PasteImport from '../components/PasteImport.jsx';

export default function ImportData() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [league, setLeague] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('csv'); // 'csv' | 'paste'
  const [step, setStep] = useState('roster'); // 'roster' | 'freeagent' | 'processing' | 'done'
  const [rosterCsv, setRosterCsv] = useState(null);
  const [freeAgentCsv, setFreeAgentCsv] = useState(null);
  const [rosterRows, setRosterRows] = useState(null);
  const [faRows, setFaRows] = useState(null);
  const [importing, setImporting] = useState(false);
  const [runningEngine, setRunningEngine] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');

  useEffect(() => {
    fetch(`/api/leagues/${id}`)
      .then(r => r.json())
      .then(data => { setLeague(data); setLoading(false); })
      .catch(() => { setError('Failed to load league'); setLoading(false); });
  }, [id]);

  const handleRosterData = useCallback((csvText, type, rows) => {
    if (type === 'freeagent') {
      // User uploaded FA data in the roster step — store it and skip ahead
      setFreeAgentCsv(csvText);
      setFaRows(rows);
      setStep('freeagent');
      return;
    }
    setRosterCsv(csvText);
    setRosterRows(rows);
    setStep('freeagent');
  }, []);

  const handleFaData = useCallback((csvText, type, rows) => {
    if (type === 'roster') {
      // User uploaded roster data in the FA step — store it there
      setRosterCsv(csvText);
      setRosterRows(rows);
      return;
    }
    setFreeAgentCsv(csvText);
    setFaRows(rows);
  }, []);

  async function handleImport() {
    if (!rosterCsv && !freeAgentCsv) {
      setError('Please upload at least one data file');
      return;
    }

    setImporting(true);
    setError(null);
    setStep('processing');
    setStatus('Importing data...');

    try {
      // Step 1: Push Roster Text
      if (rosterCsv) {
         if (rosterCsv.includes('\t') || rosterCsv.substring(0, 30).includes(' ')) {
           await fetch(`/api/leagues/${id}/paste`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ pastedText: rosterCsv }),
           });
         } else {
           await fetch(`/api/leagues/${id}/import`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ rosterCsv }),
           });
         }
      }

      // Step 2: Push FA Text
      if (freeAgentCsv) {
         if (freeAgentCsv.includes('\t') || freeAgentCsv.substring(0, 50).includes(' ')) {
           await fetch(`/api/leagues/${id}/paste`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ pastedText: freeAgentCsv }),
           });
         } else {
           await fetch(`/api/leagues/${id}/import`, {
             method: 'POST',
             headers: { 'Content-Type': 'application/json' },
             body: JSON.stringify({ freeAgentCsv }),
           });
         }
      }

      // Step 3: Run bid engine
      setStatus('Running bid engine...');
      setRunningEngine(true);

      const recRes = await fetch(`/api/leagues/${id}/recommendations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!recRes.ok) {
        const data = await recRes.json();
        throw new Error(data.error || 'Failed to generate recommendations');
      }

      setStep('done');
      setStatus('Done! Redirecting...');

      // Navigate to league detail page
      setTimeout(() => navigate(`/league/${id}`), 800);
    } catch (err) {
      setError(err.message);
      setStep('freeagent'); // Go back to let them fix
    } finally {
      setImporting(false);
      setRunningEngine(false);
    }
  }

  if (loading) {
    return <div className="text-slate-400 text-center py-12">Loading...</div>;
  }

  if (!league) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 mb-4">League not found</div>
        <Link to="/" className="text-amber-400 hover:text-amber-300">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="text-sm text-slate-500 mb-1">
          <Link to="/" className="text-slate-400 hover:text-slate-300">Dashboard</Link>
          {' / '}
          <span>{league.name}</span>
        </div>
        <h1 className="text-2xl font-bold">Import Data</h1>
        <p className="text-sm text-slate-400 mt-1">
          {league.format} &middot; {league.numTeams} teams &middot; ${league.faabBudget} budget
        </p>
      </div>

      {/* Progress steps */}
      <div className="flex items-center gap-2 mb-8 text-sm">
        {['roster', 'freeagent', 'processing'].map((s, i) => {
          const labels = ['1. Rosters', '2. Free Agents', '3. Generate Bids'];
          const isActive = step === s || (step === 'done' && s === 'processing');
          const isPast = ['roster', 'freeagent', 'processing', 'done'].indexOf(step) > i;
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className={`w-8 h-px ${isPast ? 'bg-amber-500' : 'bg-slate-700'}`} />}
              <div className={`
                px-3 py-1 rounded-full text-xs font-medium
                ${isActive ? 'bg-amber-500 text-navy-950' : isPast ? 'bg-amber-500/20 text-amber-400' : 'bg-slate-800 text-slate-500'}
              `}>
                {labels[i]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Step: Roster */}
      {step === 'roster' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Upload Roster Data</h2>
            <p className="text-sm text-slate-400">
              All teams in one file — your team and opponent rosters. Mark your team with is_user_team=true.
            </p>
          </div>

          {/* Tab switcher */}
          <div className="flex gap-1 bg-navy-800 rounded p-1 w-fit">
            <button
              onClick={() => setTab('csv')}
              className={`px-4 py-1.5 rounded text-sm transition-colors ${
                tab === 'csv' ? 'bg-amber-500 text-navy-950 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CSV File
            </button>
            <button
              onClick={() => setTab('paste')}
              className={`px-4 py-1.5 rounded text-sm transition-colors ${
                tab === 'paste' ? 'bg-amber-500 text-navy-950 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Paste Data
            </button>
          </div>

          {tab === 'csv' ? (
            <CsvUpload type="roster" onDataReady={handleRosterData} />
          ) : (
            <PasteImport leagueId={id} onDataReady={handleRosterData} expectedType="roster" />
          )}

          {/* Skip button */}
          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep('freeagent')}
              className="text-sm text-slate-500 hover:text-slate-300"
            >
              Skip (no roster data)
            </button>
            {rosterCsv && (
              <button
                onClick={() => setStep('freeagent')}
                className="bg-amber-500 hover:bg-amber-400 text-navy-950 font-bold px-6 py-2 rounded transition-colors"
              >
                Next: Free Agents
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step: Free Agents */}
      {step === 'freeagent' && (
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-semibold mb-1">Upload Free Agent Data</h2>
            <p className="text-sm text-slate-400">
              Available free agents with projected stats. Include projections for better bid recommendations.
            </p>
          </div>

          {/* Show roster confirmation if we have it */}
          {rosterRows && (
            <div className="bg-navy-800 border border-slate-700 rounded px-4 py-2 text-sm flex items-center justify-between">
              <span className="text-slate-400">
                Roster: <span className="text-amber-400">{rosterRows.length} players</span>
                {' from '}
                <span className="text-amber-400">{new Set(rosterRows.map(r => r.team_name)).size} teams</span>
              </span>
              <button onClick={() => { setStep('roster'); setRosterCsv(null); setRosterRows(null); }} className="text-xs text-slate-500 hover:text-slate-300">
                Change
              </button>
            </div>
          )}

          {/* Tab switcher */}
          <div className="flex gap-1 bg-navy-800 rounded p-1 w-fit">
            <button
              onClick={() => setTab('csv')}
              className={`px-4 py-1.5 rounded text-sm transition-colors ${
                tab === 'csv' ? 'bg-amber-500 text-navy-950 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              CSV File
            </button>
            <button
              onClick={() => setTab('paste')}
              className={`px-4 py-1.5 rounded text-sm transition-colors ${
                tab === 'paste' ? 'bg-amber-500 text-navy-950 font-medium' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Paste Data
            </button>
          </div>

          {tab === 'csv' ? (
            <CsvUpload type="freeagent" onDataReady={handleFaData} />
          ) : (
            <PasteImport leagueId={id} onDataReady={handleFaData} expectedType="freeagent" />
          )}

          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded px-4 py-2 text-red-300 text-sm">
              {error}
            </div>
          )}

          <div className="flex justify-between items-center pt-2">
            <button
              onClick={() => setStep('roster')}
              className="text-sm text-slate-500 hover:text-slate-300"
            >
              Back
            </button>
            <button
              onClick={handleImport}
              disabled={importing || (!rosterCsv && !freeAgentCsv)}
              className="bg-amber-500 hover:bg-amber-400 text-navy-950 font-bold px-6 py-2 rounded transition-colors disabled:opacity-40"
            >
              {importing ? 'Importing...' : 'Import & Generate Bids'}
            </button>
          </div>
        </div>
      )}

      {/* Step: Processing */}
      {(step === 'processing' || step === 'done') && (
        <div className="text-center py-16 space-y-4">
          <div className={`text-4xl ${step === 'done' ? '' : 'animate-pulse'}`}>
            {step === 'done' ? '' : ''}
          </div>
          <div className="text-lg font-semibold">{status}</div>
          <div className="text-sm text-slate-400">
            {runningEngine && 'Analyzing opponent needs, positional scarcity, and budget pacing...'}
          </div>
          {step === 'processing' && (
            <div className="flex justify-center">
              <div className="w-48 h-1 bg-slate-800 rounded overflow-hidden">
                <div className="h-full bg-amber-500 rounded animate-pulse" style={{ width: runningEngine ? '75%' : '30%' }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
