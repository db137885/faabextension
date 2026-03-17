# FAAB Advisor — Claude Code Starter Prompt (Updated March 2026)

Copy everything below the line and paste it into Claude Code as your first prompt. Make sure the spec files (faab-advisor-claude-code-prompt.md, faab-bid-engine-spec.md, faab-advisor-demo.jsx, and the sample-data CSVs) are in the same project directory.

---

I'm building a web app called FAAB Advisor — a fantasy sports tool that helps competitive players make smarter FAAB (Free Agent Acquisition Budget) bids across multiple leagues. This is a real product I intend to launch and charge for.

## Context

In fantasy baseball and football, FAAB is a blind bidding system where every team gets a season-long budget (typically $100 or $1,000) to bid on free agent players. The highest bid wins. Today, every tool on the market gives generic advice like "bid 10% on Player X." My tool is different: it analyzes opponent rosters, their remaining budgets, and their positional needs to produce opponent-aware bid recommendations — telling you not just what a player is worth, but what you'll actually need to bid to win them in YOUR specific league.

The primary target platform is NFC (nfc.shgn.com), which hosts the NFBC — the largest high-stakes fantasy baseball and football platform. Users pay $125 to $15,000 per league.

## Important Constraint: No Scraping NFC

SportsHub (NFC's parent company) explicitly prohibits automated scraping, bots, and third-party tools interacting with their website in their Terms of Service. We CANNOT build a Chrome extension that reads data from NFC pages automatically. Instead, we use a **smart paste parser** — the user manually copies table data from their NFC league page and pastes it into our web app. Our app is intelligent enough to parse whatever NFC's tables look like when pasted as text. This is ToS-safe because the user is just copying and pasting their own data.

## Project Files — Read These First

1. `faab-advisor-claude-code-prompt.md` — Original build spec with data model and page descriptions (use as reference but THIS prompt overrides where they differ)
2. `faab-bid-engine-spec.md` — Complete bid engine algorithm with implementable pseudocode, multipliers, scoring presets, and league presets
3. `faab-advisor-demo.jsx` — Working React demo showing target UI/UX with hardcoded data
4. `sample-data/` — CSV files with realistic roster and free agent data

## Tech Stack

- **Frontend:** Vite + React + Tailwind CSS
- **Backend:** Node.js + Express
- **Database:** SQLite via Prisma ORM (simple for local dev; easy to migrate to PostgreSQL/Supabase later)
- **Auth:** Stub for now (hardcoded demo user) — real auth comes later

Keep it simple. No Redis, no external services, no payment integration yet. Everything runs locally with `npm run dev`.

## What to Build (Priority Order)

### 1. Project Scaffolding

Monorepo structure:
```
faab-advisor/
├── client/                # Vite + React + Tailwind
│   ├── src/
│   │   ├── components/    # Reusable UI (BidCard, BudgetGauge, OpponentGrid, etc.)
│   │   ├── pages/         # Dashboard, LeagueDetail, LeagueConfig, DataInput
│   │   ├── utils/         # Paste parser, formatters
│   │   └── App.jsx
│   └── package.json
├── server/                # Express API
│   ├── routes/
│   ├── services/
│   │   ├── bidEngine.js   # Core algorithm
│   │   └── pasteParser.js # Smart paste parser
│   ├── prisma/
│   │   └── schema.prisma
│   └── package.json
├── shared/                # Scoring presets, league presets, constants
└── package.json           # Root with "dev" script that runs both
```

Set up a root `package.json` with a `dev` script that starts both client and server concurrently. The client should proxy API requests to the server.

### 2. Database Schema (Prisma)

```prisma
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String?
  leagues   League[]
  createdAt DateTime @default(now())
}

model League {
  id              String    @id @default(uuid())
  userId          String
  user            User      @relation(fields: [userId], references: [id])
  name            String
  sport           String    // "baseball" | "football"
  platform        String    // "NFBC" | "ESPN" | "Yahoo" | "Sleeper" | "Fantrax" | "other"
  formatPreset    String?   // "nfbc_main_event" | "nfbc_oc" | "standard_ppr" | etc.
  scoringSettings Json      // Full scoring config
  numTeams        Int
  faabBudget      Int       // Total budget (100 or 1000)
  faabMinBid      Int       @default(0)  // 0 or 1
  totalWeeks      Int
  currentWeek     Int       @default(1)
  waiverDay       String?
  teams           Team[]
  freeAgents      FreeAgent[]
  recommendations BidRecommendation[]
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model Team {
  id            String   @id @default(uuid())
  leagueId      String
  league        League   @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  teamName      String
  isUserTeam    Boolean  @default(false)
  remainingFaab Int
  standing      String?  // "3rd" or "3-2" etc.
  roster        Roster[]
}

model Player {
  id              String   @id @default(uuid())
  name            String
  position        String   // "QB", "RB", "SP", "RP", etc.
  realTeam        String   // "CLE", "NYY", etc.
  projectedStats  Json?    // { W: 2, K: 16, ERA: 3.20, ... }
  ownershipPct    Float?
  gamesPlayed     Int?
  note            String?  // "Returning from IL", "Named closer", etc.
  roster          Roster[]
  freeAgent       FreeAgent[]
}

model Roster {
  id       String @id @default(uuid())
  teamId   String
  team     Team   @relation(fields: [teamId], references: [id], onDelete: Cascade)
  playerId String
  player   Player @relation(fields: [playerId], references: [id])
  @@unique([teamId, playerId])
}

model FreeAgent {
  id       String @id @default(uuid())
  leagueId String
  league   League @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  playerId String
  player   Player @relation(fields: [playerId], references: [id])
  @@unique([leagueId, playerId])
}

model BidRecommendation {
  id              String   @id @default(uuid())
  leagueId        String
  league          League   @relation(fields: [leagueId], references: [id], onDelete: Cascade)
  playerName      String
  position        String
  realTeam        String
  baseBid         Int
  marketBid       Int
  aggressiveBid   Int
  confidence      String   // "high" | "medium" | "low"
  scarcityLevel   String   // "very_high" | "high" | "medium" | "low"
  opponentsNeeding Int
  budgetImpact    Float    // percentage of remaining FAAB
  needMatch       Boolean
  reasoning       String
  projectedStats  Json?
  threatDetails   Json?    // Array of { team, faab, needLevel }
  weekNumber      Int
  result          BidResult?
  createdAt       DateTime @default(now())
}

model BidResult {
  id               String            @id @default(uuid())
  recommendationId String            @unique
  recommendation   BidRecommendation @relation(fields: [recommendationId], references: [id])
  didBid           Boolean
  won              Boolean?
  winningBidAmount Int?
  createdAt        DateTime          @default(now())
}
```

### 3. Seed Data + Demo Mode

Seed the database with the sample CSV data to create 3 demo leagues:
- **NFBC Online Championship** (12-team, 5x5 roto baseball, $1,000 FAAB)
- **NFBC Main Event Team 2** (15-team, 5x5 roto baseball, $1,000 FAAB)
- **High Stakes Superflex PPR** (12-team, superflex football, $100 FAAB)

Each should have realistic opponent rosters and a free agent pool. After seeding, automatically run the bid engine against all leagues so the dashboard shows pre-generated recommendations on first load.

Add a `npm run seed` command and a `npm run demo` command that resets the DB and reseeds.

### 4. The Smart Paste Parser (Key Innovation)

This is what replaces the Chrome extension scraper. Build `pasteParser.js` as a service that accepts raw pasted text (what you get when you select a table on a web page and Ctrl+C) and returns structured data.

```javascript
// Input: raw text that looks like tab-delimited table rows pasted from a browser
// The parser should handle:
// 1. Tab-delimited rows (standard browser table copy)
// 2. Multiple whitespace as delimiters (when tabs get lost)
// 3. Header row detection (skip it or use it to map columns)
// 4. Player names with special characters, Jr., III, etc.
// 5. Position strings like "SP", "RP", "SS/OF", "QB"
// 6. FAAB amounts with or without $ sign
// 7. Blank rows, extra whitespace, trailing newlines

function parsePastedRosterData(rawText) {
  // Detect format:
  // - If it has "Team" and "FAAB" columns → roster data
  // - If it has "Position" and projected stat columns → free agent data
  // Returns: { type: "roster" | "freeAgents", data: [...] }
}

function parsePastedFreeAgentData(rawText) {
  // Parse a free agent pool table
  // Returns array of { name, position, team, projections }
}
```

The parser should be forgiving — real users will paste messy data with inconsistent spacing. Use heuristics: if a column looks like dollar amounts, it's probably FAAB. If it looks like player names (mixed case, 2-3 words), it's the name column. If it matches known position abbreviations, it's position.

Test the parser against the sample CSV data reformatted as tab-delimited text to verify it works.

### 5. Bid Engine (The Core)

Implement the full algorithm from `faab-bid-engine-spec.md`. The functions to build, in order:

1. `calculateFantasyPoints(projections, scoringSettings)` — apply scoring weights
2. `positionalScarcity(position, freeAgentPool, leagueSize)` — scarcity multiplier
3. `calculateBaseBid(playerValue, scarcityMultiplier, league)` — value → FAAB dollars
4. `detectOpponentNeeds(opponent, position, sport)` — urgency score 0-3
5. `calculateCompetitivePressure(player, opponents, league)` — aggregate threat
6. `calculateMarketBid(baseBid, pressureScore, threatDetails, league)` — opponent adjustment
7. `budgetPacing(league)` — spend pace vs season remaining
8. `calculateAggressiveBid(marketBid, pacing, league)` — aggressive tier
9. `calculateConfidence(player, scarcity, pressureScore, needMatch)` — confidence
10. `generateReasoning(...)` — human-readable explanation
11. `generateBidRecommendation(...)` — orchestrator

Key edge cases from the spec:
- NFBC uses $1 minimum bids (no $0 bids), most others allow $0
- Budget sizes vary ($100 vs $1,000) — math must scale to any budget
- Superflex leagues: QBs dramatically more scarce — treat SUPERFLEX slot as QB need
- Baseball roto: ERA and WHIP are inverse (lower is better) — handle in SGP calculation
- Never recommend more than 50% of remaining FAAB for market bid, 60% for aggressive

Include the complete scoring presets and league presets from the spec file.

### 6. API Routes

```
POST   /api/leagues              — create league (with preset selection)
GET    /api/leagues              — list all leagues
GET    /api/leagues/:id          — league with teams, rosters, recommendations
PUT    /api/leagues/:id          — update league (current week, etc.)
DELETE /api/leagues/:id          — delete league

POST   /api/leagues/:id/paste    — accept pasted text, parse it, store rosters + FAs
POST   /api/leagues/:id/import   — accept CSV upload, parse and store
POST   /api/leagues/:id/run      — run bid engine, store recommendations
GET    /api/leagues/:id/recs     — get current recommendations

POST   /api/recs/:id/result      — record bid outcome
GET    /api/leagues/:id/history  — past recommendations + results

GET    /api/presets              — list available league presets
```

### 7. Frontend Pages

Build these four pages. Match the dark theme from `faab-advisor-demo.jsx`.

**Color palette:** Navy backgrounds (#020617, #0f172a), blue accents (#3b82f6), amber (#f59e0b), green (#16a34a), red (#dc2626). Monospace-influenced typography.

#### Page 1: Dashboard (route: `/`)
- Summary row: active leagues, total FAAB remaining, open recommendations, cross-league targets
- League cards (click to navigate to detail): sport icon, name, format, remaining FAAB with budget gauge, standing, recommendation count
- Cross-league view: when same player appears in multiple leagues, show side-by-side bids
- "Add League" button

#### Page 2: League Detail (route: `/leagues/:id`)
- Header: league name, platform, format, standing, week number
- Budget pacing gauge with ahead/on-pace/behind indicator
- Opponent grid: cards showing each opponent's name, remaining FAAB, positional needs (color-coded badges)
- Bid recommendation cards (expandable on click):
  - Player name, position, team
  - Three bid tiers: Base (gray) | Recommended (blue) | Aggressive (amber)
  - Confidence badge, scarcity badge, "fills your need" badge
  - Expanded: opponent analysis detail, projected stats, budget impact %
- "Run Engine" button (re-generates recommendations)
- "Export Bid Sheet" button → downloads CSV
- "Update Data" button → navigates to paste input

#### Page 3: League Setup (route: `/leagues/new` and `/leagues/:id/edit`)
- Preset dropdown: NFBC Main Event, NFBC OC, Standard PPR, Superflex TEP, Guillotine, Custom
- Selecting a preset auto-fills: scoring settings, num teams, budget, min bid, total weeks, waiver day
- "Custom" shows full scoring editor
- Sport toggle (baseball/football) filters available presets
- After saving, navigate to data input

#### Page 4: Data Input (route: `/leagues/:id/input`)

This is the most important UX in the app. Make it feel effortless.

**Primary input: Smart Paste**
- Large text area with helpful placeholder text:
  "Paste your league data here. Go to your NFC league page, select the roster table, copy it (Ctrl+C), and paste it here. We'll figure out the format automatically."
- On paste, immediately parse and show a preview table: "We detected 12 teams with rosters and FAAB budgets. Does this look right?"
- User confirms → data is stored and bid engine runs automatically
- Support two paste actions: one for rosters/teams, one for the free agent pool
- Show parsing status: ✓ Detected 12 teams, ✓ Found FAAB budgets, ✓ Identified 180 rostered players

**Secondary input: CSV Upload**
- Drag-and-drop zone or file picker
- Provide downloadable CSV templates with example data (link to templates)
- Same preview + confirm flow as paste

**Tertiary: Manual Entry**
- Simple forms for adding individual teams, players, FAAB amounts
- Useful for quick updates ("Team X spent $45 this week, update their FAAB")

After data is confirmed, automatically run the bid engine and redirect to League Detail showing fresh recommendations.

### 8. Export

"Export Bid Sheet" on League Detail generates a CSV:
```
Player,Position,Team,Base Bid,Recommended Bid,Aggressive Bid,Confidence,Notes
Gavin Williams,SP,CLE,28,41,58,high,"7 opponents need SP. High scarcity."
```

Also add "Copy to Clipboard" that formats as a clean text table for quick reference.

### 9. Results Tracker

After waivers process, the user records what happened:
- List of this week's recommendations with dropdowns: Won / Lost / Didn't Bid
- Field for actual winning bid amount
- Dashboard widget on League Detail showing:
  - Bid win rate
  - Average overpay (your bid vs winning bid, for wins)
  - Average miss (winning bid vs your bid, for losses)

## What NOT to Build

- No authentication system (use a hardcoded demo user for now)
- No payment/Stripe integration
- No Chrome extension (ToS risk with NFC — we use paste parser instead)
- No API integrations with fantasy platforms
- No real-time projection data feeds
- No mobile app
- No ML model — bid engine is rule-based

## Quality Bar

This needs to look and feel like a real product, not a prototype. I will be demoing this to potential beta users and a business partner. The UI should be polished — reference the demo.jsx for the aesthetic target. The bid engine numbers must make sense: a $28 base bid on an SP in a $1,000 NFBC league with 19 weeks remaining should feel reasonable. A $200 recommendation on a middling reliever should not.

## Verification

After everything is built and seeded with demo data:
1. Show me the dashboard with all 3 demo leagues
2. Click into one league and show the bid recommendations
3. Run the paste parser against the sample roster data formatted as tab-delimited text
4. Show me the engine output for the top 3 recommendations with full reasoning
5. Export a bid sheet CSV and show its contents

Let's start building.
