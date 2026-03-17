export function detectPastedDataType(rawText) {
  const lines = rawText.split('\n').filter(l => l.trim().length > 0);
  if (lines.length === 0) return { type: 'unknown', data: [] };

  const sampleContext = lines.slice(0, 10).join(' ').toLowerCase();

  // Heuristics
  const hasFaabOrBudget = sampleContext.includes('faab') || sampleContext.includes('budget') || sampleContext.match(/\$\d+/);
  const hasMultipleTeams = sampleContext.includes('team') && hasFaabOrBudget;
  const hasPosition = sampleContext.match(/\b(qb|rb|wr|te|sp|rp|of|ss|1b|2b|3b|c)\b/i);
  
  // If it's a roster dump, it usually has team names and FAAB balances
  // NFBC Standings / FAAB table often just has Rank, Team, FAAB
  // Real roster tables have Team, numerous players, and FAAB at the bottom or top
  if (hasFaabOrBudget && !sampleContext.includes('proj')) {
    return 'roster';
  } else if (hasPosition || sampleContext.includes('proj') || sampleContext.includes('available')) {
    return 'freeAgents';
  }

  // Fallback heuristic: lots of positions -> free agents
  const positionMatches = rawText.match(/\b(QB|RB|WR|TE|SP|RP|OF|SS|1B|2B|3B|C)\b/g);
  if (positionMatches && positionMatches.length > 5) {
    return 'freeAgents';
  }

  return 'roster'; // default guess
}

export function parsePastedRosterData(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);
  const teams = [];
  
  // A very forgiving parser that looks for "$[number]" or "FAAB: [number]" to identify teams
  // and looks for known positions to identify players.
  
  let currentTeam = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Check for FAAB amount
    const faabMatch = line.match(/(?:faab|budget)?\s*\$?(\d{1,4})(?:\.00)?\b/i);
    // Rough check if line might be a team name (no positions, short-ish)
    const hasPosition = line.match(/\b(QB|RB|WR|TE|SP|RP|OF|SS|1B|2B|3B|C|UTIL|FLEX)\b/);

    if (!hasPosition && line.length > 2 && line.length < 30 && !line.match(/^[\d\s]+$/)) {
      // Might be a team header
      if (currentTeam) teams.push(currentTeam);
      currentTeam = {
        team_name: line.replace(/faab|budget|\$\d+/gi, '').trim() || `Team ${teams.length + 1}`,
        remaining_faab: faabMatch ? parseInt(faabMatch[1], 10) : null,
        players: [],
        is_user_team: false
      };
      
      // Look ahead or behind for FAAB if not found yet
      if (!currentTeam.remaining_faab && faabMatch) {
        currentTeam.remaining_faab = parseInt(faabMatch[1], 10);
      }
    } else if (currentTeam && hasPosition) {
      // Probably a player row. 
      // e.g. "Gerrit Cole SP NYY" or "SP Gerrit Cole" 
      // Let's extract the name by removing the position and team acronyms
      const cleanLine = line.replace(/\b(QB|RB|WR|TE|SP|RP|OF|SS|1B|2B|3B|C|UTIL|FLEX)\b/g, '')
                            .replace(/\b[A-Z]{2,3}\b/g, '') // remove real teams like NYY, CLE
                            .replace(/[\d\.\-\$]+/g, '') // remove numbers/stats
                            .trim();
                            
      // Clean up multiple spaces
      const playerName = cleanLine.replace(/\s+/g, ' ').trim();
      
      if (playerName.length > 3) {
        currentTeam.players.push(playerName);
      }
    } else if (faabMatch && currentTeam && currentTeam.remaining_faab === null) {
        currentTeam.remaining_faab = parseInt(faabMatch[1], 10);
    }
  }
  
  if (currentTeam) teams.push(currentTeam);

  // If we couldn't parse teams properly, fallback to tabular NFBC FAAB style:
  // "Rank \t Team Name \t FAAB"
  if (teams.length === 0 || teams.every(t => t.players.length === 0)) {
     return parseTabularTeams(lines);
  }

  // Provide defaults for missing FAAB
  return teams.map(t => ({
    ...t,
    remaining_faab: t.remaining_faab !== null ? t.remaining_faab : 1000
  }));
}

function parseTabularTeams(lines) {
  const teams = [];
  lines.forEach(line => {
    const columns = line.split(/\t|\s{2,}/); // split by tab or multiple spaces
    if (columns.length >= 2) {
      const faabCol = columns.find(c => c.includes('$') || !isNaN(c.trim()));
      let faab = 1000;
      if (faabCol) {
        const match = faabCol.match(/\$?(\d+)/);
        if (match) faab = parseInt(match[1], 10);
      }
      
      const nameCol = columns.find(c => c.length > 3 && isNaN(c.trim()) && !c.includes('$'));
      
      if (nameCol) {
        teams.push({
          team_name: nameCol.trim(),
          remaining_faab: faab,
          players: [],
          is_user_team: false
        });
      }
    }
  });
  return teams;
}

export function parsePastedFreeAgentData(rawText) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l);
  const freeAgents = [];
  
  // Header detection
  let headerFound = false;
  let nameIndex = -1, posIndex = -1, teamIndex = -1;

  for (let line of lines) {
    const columns = line.split(/\t|\s{2,}/);
    
    if (!headerFound && (line.toLowerCase().includes('player') || line.toLowerCase().includes('name'))) {
      headerFound = true;
      nameIndex = columns.findIndex(c => c.toLowerCase().includes('player') || c.toLowerCase().includes('name'));
      posIndex = columns.findIndex(c => c.toLowerCase().includes('pos'));
      teamIndex = columns.findIndex(c => c.toLowerCase().includes('team') && !c.toLowerCase().includes('opp'));
      continue;
    }

    if (columns.length >= 2) {
      let name, pos, realTeam;
      
      if (nameIndex !== -1 && posIndex !== -1) {
        name = columns[nameIndex];
        pos = columns[posIndex];
        realTeam = teamIndex !== -1 ? columns[teamIndex] : 'FA';
      } else {
        // Heuristic fallback if no header
        // Try to find position
        const posMatch = line.match(/\b(QB|RB|WR|TE|SP|RP|OF|SS|1B|2B|3B|C)\b/);
        pos = posMatch ? posMatch[1] : 'UNK';
        
        // Assume first long string is name
        const strings = columns.filter(c => isNaN(c.replace(/[\$\.\-]/g, '')));
        name = strings[0] || 'Unknown Player';
        realTeam = strings[1] || 'FA';
      }
      
      // Cleanup
      if (name) {
         name = name.replace(/\b(QB|RB|WR|TE|SP|RP|OF|SS|1B|2B|3B|C)\b/g, '').replace(/[^a-zA-Z\s\.\-]/g, '').trim();
         if (name.length > 2) {
            freeAgents.push({
              name: name,
              position: pos,
              real_team: realTeam,
              projections: {} // Projections parsing can get super complex, leave empty for MVP unless specifically needed
            });
         }
      }
    }
  }

  return freeAgents;
}
