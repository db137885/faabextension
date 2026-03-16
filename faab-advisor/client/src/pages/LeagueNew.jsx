import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const PRESETS = {
  nfbc_main_event: {
    label: 'NFBC Main Event',
    sport: 'baseball', platform: 'NFBC', format: '15-team 5x5 Roto',
    numTeams: 15, faabBudget: 1000, faabMinBid: 1,
    totalWeeks: 27, waiverDay: 'Sunday',
    scoring: 'roto_5x5_standard', roster: 'nfbc_15team',
  },
  nfbc_online_championship: {
    label: 'NFBC Online Championship',
    sport: 'baseball', platform: 'NFBC', format: '12-team 5x5 Roto',
    numTeams: 12, faabBudget: 1000, faabMinBid: 1,
    totalWeeks: 27, waiverDay: 'Sunday',
    scoring: 'roto_5x5_standard', roster: 'nfbc_12team',
  },
  standard_ppr: {
    label: 'Standard PPR',
    sport: 'football', platform: 'Sleeper', format: '12-team PPR',
    numTeams: 12, faabBudget: 100, faabMinBid: 0,
    totalWeeks: 17, waiverDay: 'Wednesday',
    scoring: 'ppr', roster: 'standard',
  },
  superflex_tep: {
    label: 'Superflex + TE Premium',
    sport: 'football', platform: 'Sleeper', format: '12-team SF PPR + TEP',
    numTeams: 12, faabBudget: 100, faabMinBid: 0,
    totalWeeks: 17, waiverDay: 'Wednesday',
    scoring: 'superflex_ppr_tep', roster: 'superflex',
  },
  guillotine: {
    label: 'Guillotine League',
    sport: 'football', platform: 'Sleeper', format: '17-team Half PPR Guillotine',
    numTeams: 17, faabBudget: 1000, faabMinBid: 0,
    totalWeeks: 16, waiverDay: 'Wednesday',
    scoring: 'half_ppr', roster: 'standard', special: 'guillotine',
  },
  custom: { label: 'Custom' },
};

const FOOTBALL_SCORING_DEFAULTS = {
  passingYards: 0.04, passingTD: 4, interception: -2,
  rushingYards: 0.1, rushingTD: 6,
  receivingYards: 0.1, receivingTD: 6,
  receptions: 1, fumblesLost: -2,
};

const SCORING_LABELS = {
  passingYards: 'Passing Yards (per yard)',
  passingTD: 'Passing TD',
  interception: 'Interception',
  rushingYards: 'Rushing Yards (per yard)',
  rushingTD: 'Rushing TD',
  receivingYards: 'Receiving Yards (per yard)',
  receivingTD: 'Receiving TD',
  receptions: 'Receptions (PPR)',
  fumblesLost: 'Fumbles Lost',
  te_reception_bonus: 'TE Reception Bonus',
};

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function LeagueNew() {
  const navigate = useNavigate();
  const [selectedPreset, setSelectedPreset] = useState('');
  const [name, setName] = useState('');
  const [sport, setSport] = useState('football');
  const [platform, setPlatform] = useState('');
  const [format, setFormat] = useState('');
  const [numTeams, setNumTeams] = useState(12);
  const [faabBudget, setFaabBudget] = useState(100);
  const [faabMinBid, setFaabMinBid] = useState(0);
  const [totalWeeks, setTotalWeeks] = useState(17);
  const [currentWeek, setCurrentWeek] = useState(1);
  const [waiverDay, setWaiverDay] = useState('Wednesday');
  const [scoring, setScoring] = useState({ ...FOOTBALL_SCORING_DEFAULTS });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  function handlePresetChange(key) {
    setSelectedPreset(key);
    if (key === 'custom' || !key) return;

    const p = PRESETS[key];
    setName(p.label);
    setSport(p.sport);
    setPlatform(p.platform);
    setFormat(p.format);
    setNumTeams(p.numTeams);
    setFaabBudget(p.faabBudget);
    setFaabMinBid(p.faabMinBid);
    setTotalWeeks(p.totalWeeks);
    setWaiverDay(p.waiverDay);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const body = selectedPreset && selectedPreset !== 'custom'
        ? { preset: selectedPreset, name, currentWeek }
        : {
            name: name || 'My League',
            sport, platform, format, numTeams,
            faabBudget, faabMinBid, totalWeeks, currentWeek,
            waiverDay,
            scoringSettings: scoring,
          };

      const res = await fetch('/api/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create league');
      }

      const league = await res.json();
      navigate(`/league/${league.id}/import`);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  const isCustom = selectedPreset === 'custom';
  const presetData = selectedPreset && selectedPreset !== 'custom' ? PRESETS[selectedPreset] : null;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create League</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Preset selector */}
        <div>
          <label className="block text-sm text-slate-400 mb-1">League Preset</label>
          <select
            value={selectedPreset}
            onChange={e => handlePresetChange(e.target.value)}
            className="w-full bg-navy-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
          >
            <option value="">Select a preset...</option>
            {Object.entries(PRESETS).map(([key, p]) => (
              <option key={key} value={key}>{p.label}</option>
            ))}
          </select>
        </div>

        {/* League name — always visible once a preset is selected */}
        {selectedPreset && (
          <>
            <div>
              <label className="block text-sm text-slate-400 mb-1">League Name</label>
              <input
                type="text"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="My League"
                className="w-full bg-navy-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Current Week</label>
              <input
                type="number"
                min={1}
                max={totalWeeks}
                value={currentWeek}
                onChange={e => setCurrentWeek(parseInt(e.target.value) || 1)}
                className="w-32 bg-navy-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </>
        )}

        {/* Preset summary */}
        {presetData && (
          <div className="bg-navy-800 border border-slate-700 rounded p-4 text-sm space-y-1">
            <div className="text-amber-400 font-semibold mb-2">Preset Settings</div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <span className="text-slate-400">Sport:</span>
              <span className="capitalize">{presetData.sport}</span>
              <span className="text-slate-400">Format:</span>
              <span>{presetData.format}</span>
              <span className="text-slate-400">Teams:</span>
              <span>{presetData.numTeams}</span>
              <span className="text-slate-400">FAAB Budget:</span>
              <span>${presetData.faabBudget}</span>
              <span className="text-slate-400">Min Bid:</span>
              <span>${presetData.faabMinBid}</span>
              <span className="text-slate-400">Weeks:</span>
              <span>{presetData.totalWeeks}</span>
              <span className="text-slate-400">Waiver Day:</span>
              <span>{presetData.waiverDay}</span>
              <span className="text-slate-400">Platform:</span>
              <span>{presetData.platform}</span>
            </div>
          </div>
        )}

        {/* Custom configuration */}
        {isCustom && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Sport</label>
                <select
                  value={sport}
                  onChange={e => setSport(e.target.value)}
                  className="w-full bg-navy-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="football">Football</option>
                  <option value="baseball">Baseball</option>
                </select>
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Platform</label>
                <input
                  type="text"
                  value={platform}
                  onChange={e => setPlatform(e.target.value)}
                  placeholder="Sleeper, ESPN, Yahoo..."
                  className="w-full bg-navy-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Format Description</label>
              <input
                type="text"
                value={format}
                onChange={e => setFormat(e.target.value)}
                placeholder="12-team PPR"
                className="w-full bg-navy-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">Teams</label>
                <input
                  type="number" min={2} max={32}
                  value={numTeams}
                  onChange={e => setNumTeams(parseInt(e.target.value) || 12)}
                  className="w-full bg-navy-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">FAAB Budget</label>
                <input
                  type="number" min={0}
                  value={faabBudget}
                  onChange={e => setFaabBudget(parseInt(e.target.value) || 100)}
                  className="w-full bg-navy-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Min Bid</label>
                <input
                  type="number" min={0}
                  value={faabMinBid}
                  onChange={e => setFaabMinBid(parseInt(e.target.value) || 0)}
                  className="w-full bg-navy-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Total Weeks</label>
                <input
                  type="number" min={1}
                  value={totalWeeks}
                  onChange={e => setTotalWeeks(parseInt(e.target.value) || 17)}
                  className="w-full bg-navy-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-1">Waiver Day</label>
              <select
                value={waiverDay}
                onChange={e => setWaiverDay(e.target.value)}
                className="w-full bg-navy-800 border border-slate-700 rounded px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
              >
                {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>

            {/* Scoring settings editor (football only for now) */}
            {sport === 'football' && (
              <div>
                <div className="text-amber-400 font-semibold text-sm mb-2">Scoring Settings</div>
                <div className="bg-navy-800 border border-slate-700 rounded p-4 grid grid-cols-2 gap-3">
                  {Object.entries(SCORING_LABELS).map(([key, label]) => (
                    <div key={key} className="flex items-center justify-between gap-2">
                      <label className="text-xs text-slate-400 shrink-0">{label}</label>
                      <input
                        type="number"
                        step="any"
                        value={scoring[key] ?? ''}
                        onChange={e => setScoring(s => ({
                          ...s,
                          [key]: e.target.value === '' ? undefined : parseFloat(e.target.value),
                        }))}
                        className="w-20 bg-navy-900 border border-slate-600 rounded px-2 py-1 text-right text-sm text-slate-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {sport === 'baseball' && (
              <div className="bg-navy-800 border border-slate-700 rounded p-4 text-sm text-slate-400">
                Baseball uses standard 5x5 Roto scoring (R, HR, RBI, SB, AVG / W, SV, K, ERA, WHIP).
                SGP denominators are auto-calculated based on league size.
              </div>
            )}
          </div>
        )}

        {error && (
          <div className="bg-red-900/50 border border-red-700 rounded px-4 py-2 text-red-300 text-sm">
            {error}
          </div>
        )}

        {selectedPreset && (
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-amber-500 hover:bg-amber-400 text-navy-950 font-bold py-3 rounded transition-colors disabled:opacity-50"
          >
            {submitting ? 'Creating...' : 'Create League & Import Data'}
          </button>
        )}
      </form>
    </div>
  );
}
