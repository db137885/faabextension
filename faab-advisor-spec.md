# FAAB Advisor — Product Specification & Project Plan

## Executive Summary

FAAB Advisor is a decision-quality tool for serious fantasy sports players managing FAAB (Free Agent Acquisition Budget) across multiple leagues. Unlike existing tools that provide generic "bid X%" advice, FAAB Advisor analyzes your specific league — opponent rosters, remaining budgets, positional scarcity, and scoring settings — to produce opponent-aware bid recommendations.

**Target user:** High-stakes fantasy baseball and football players managing 5–45+ leagues, spending $300–$15,000+ per season on entry fees, who currently spend 30+ minutes per league on FAAB decisions using spreadsheets or gut feel.

**Core value proposition:** "We tell you not just what a player is worth, but what you'll need to bid to win him in YOUR league."

**Revenue model:** Seasonal subscription ($200–$500/season) or one-time purchase ($500–$1,000).

---

## Problem Statement

FAAB bidding is the most under-optimized area in competitive fantasy sports. Every existing tool treats recommendations as one-size-fits-all — "bid 10% of your budget on Player X" — ignoring that the optimal bid depends entirely on your specific league context:

- Which opponents also need this position?
- How much FAAB do those opponents have remaining?
- How aggressive have those opponents historically bid?
- What does your remaining budget look like relative to the season timeline?
- How does this league's scoring settings affect the player's value?

The multi-league scaling problem compounds this. Managing FAAB for 45 leagues at 30 minutes each means 22+ hours per week — and the cognitive load makes suboptimal decisions inevitable.

---

## Competitive Landscape

### What exists today (and what's missing)

| Tool / Category | What It Does | What It Doesn't Do |
|---|---|---|
| **Expert columns** (FTN "Trust the Gut", Fantasy Six Pack, Razzball) | Weekly articles with generic FAAB bid ranges by player for standard league sizes | No league-specific context, no opponent analysis, no multi-league view |
| **FAABLab** | Crowd-sourced bid data showing what average players are bidding (football only) | Shows average bids, not optimal bids for YOUR league; no opponent awareness |
| **FantasyLife Waiver Wire Tool** | League-synced FAAB calculator with strategy presets (Aggressive/Conservative/Hoarder) | No opponent roster need analysis; presets are generic multipliers, not game theory; ESPN-only sync |
| **FantasyPros My Playbook** | Synced waiver assistant with expert consensus | No FAAB-specific intelligence; no opponent-aware adjustments |
| **Faabtastic** | Aggregates expert FAAB recommendations into cheatsheets | Pure aggregation, no personalization |
| **NFBC Pending FAAB / Copy Bids** | Multi-league bid management UI with watchlist + copy feature | Zero intelligence — just makes the manual process faster; no recommendations |
| **Smart Fantasy Baseball "The Process"** | Book/methodology with FAAB binning strategy and historical analysis | Educational content, not a tool; no real-time recommendations |

### White space (our differentiation)

1. **Opponent-aware bid adjustments** — Nobody programmatically analyzes opponent rosters, remaining budgets, and positional needs to adjust bid recommendations.
2. **Multi-league portfolio management** — No tool provides a dashboard across 10–45 leagues with consolidated FAAB decision-making.
3. **Baseball coverage** — The tool market skews heavily to football. Baseball FAAB runs 27 weeks with deeper player pools and more complex scoring, yet tooling barely exists beyond columns.

---

## MVP Feature Set (Version 1)

### Core Features

#### 1. League Configuration Manager
Users create and save league profiles with reusable templates.

**Required fields:**
- League name
- Sport (baseball / football)
- Platform (NFBC, ESPN, Yahoo, Fantrax, Sleeper, CBS, other)
- Number of teams
- Scoring format (standard, PPR, half-PPR, superflex, TE premium, roto 5x5, points, H2H categories, etc.)
- Custom scoring settings (passing TD value, reception value, IP requirements, category weights, etc.)
- FAAB budget total (e.g., $100, $1,000)
- FAAB minimum bid ($0 or $1)
- Waiver processing schedule (daily, weekly — which day)

**Presets for common formats:**
- NFBC Main Event (15-team, 5x5 roto, $1,000 FAAB, $1 min, Sunday processing)
- NFBC Online Championship (12-team, 5x5 roto, $1,000 FAAB)
- Standard PPR (12-team, $100 FAAB)
- Superflex + TE Premium (12-team, $100 FAAB)
- Guillotine League

#### 2. League State Input
For each league, the user provides current-week data.

**Your team:**
- Current roster (player names + positions)
- Remaining FAAB budget
- Current standings position (optional, for urgency weighting)

**Opponent teams:**
- Each opponent's roster (player names + positions)
- Each opponent's remaining FAAB budget

**Free agent pool:**
- Available players the user is considering bidding on

**Input methods (MVP — pick easiest to implement first):**
- CSV upload (define template format)
- Paste-from-clipboard (tab-delimited, from platform export or spreadsheet)
- Manual entry form
- (Future) URL scraping / API integration with platforms

#### 3. Bid Recommendation Engine (Core Algorithm)

This is the product's IP. The engine produces three bid values per player per league:

**Output format:**
```
Player: [Name] ([Position])
Base Value:          $35  (what this player is worth given league scoring)
Market-Adjusted Bid: $42  (accounting for opponent needs + budgets)
Aggressive Bid:      $55  (high-confidence win, accepts overpay risk)
Confidence:          High / Medium / Low
Budget Impact:       8.4% of remaining FAAB
```

**Algorithm components:**

**Layer 1 — Base Player Valuation:**
- Rest-of-season projected stats (source: public projections like Steamer, ATC, ECR, or FantasyPros consensus)
- League scoring settings applied to projections → fantasy point value
- Positional scarcity adjustment (how thin is this position in the free agent pool?)
- Schedule/matchup bonus (upcoming opponents, park factors for baseball, bye weeks for football)
- Roster fit adjustment (does the user actually need this position?)

**Layer 2 — Opponent-Aware Market Adjustment:**
- Scan each opponent roster for positional holes
- Count how many opponents likely need this player (or this position)
- Weight by each opponent's remaining FAAB (a team with $800 left is a bigger threat than one with $50)
- Apply demand multiplier:
  - 0 other teams need this position → base bid may be sufficient
  - 1–2 teams need it → modest increase (5–15%)
  - 3+ teams need it → significant increase (15–30%+)
- (Future) Opponent bidding history profile: "This manager overbids on closers"

**Layer 3 — Budget Management & Timing:**
- Where are we in the season? (Week 3 of 27 vs. Week 22 of 27)
- What percentage of FAAB has the user spent vs. league average?
- "Save vs. spend" recommendation based on remaining season value
- Portfolio view across leagues: "You're low on FAAB in 8 of your 15 leagues — be conservative"

**Layer 4 — Weighted Protections / Guardrails:**
- Flag when a bid exceeds X% of remaining budget with a warning
- Flag when the user is bidding on the same player across many leagues (concentration risk)
- Suggest bid differentiation: "Bid aggressively in leagues where you're contending, conservatively in long shots"

#### 4. Multi-League Dashboard
The killer feature for high-volume players.

- See all leagues at a glance: league name, remaining FAAB, record/standing, top free agent targets
- Batch view: "Player X is available in 12 of your 15 leagues — here are the recommended bids for each"
- Sort/filter by: sport, league format, urgency, FAAB remaining
- Export bid sheet (CSV or printable) to manually enter into each platform

#### 5. Post-Waiver Analysis (Learn & Improve)
After waivers process, the user inputs results.

- What did the winning bid end up being?
- Track your hit rate: "You won 60% of your bids this week"
- Track your efficiency: "You overpaid by an average of $12 per win"
- Over time, this data feeds back into the model to improve opponent profiling

---

## Technical Architecture (MVP)

### Recommended Stack

**Frontend:**
- React (Next.js or Vite) for the web app
- Tailwind CSS for styling
- Responsive design (desktop-first, but mobile-usable for quick checks)

**Backend:**
- Node.js / Express API (or Python FastAPI if ML modeling is prioritized)
- PostgreSQL for league configs, user data, historical bids
- Redis for caching player projections and computed valuations

**Data Sources (MVP — use free/public sources):**
- Player projections: FantasyPros API (consensus rankings), Steamer projections (public), FanGraphs
- Player news / injury status: Public APIs or RSS feeds
- Roster/scoring data: User-provided via CSV/paste (MVP); platform APIs (future)

**Authentication:**
- Simple email/password or OAuth (Google)
- Stripe for payments

### Data Model (Simplified)

```
User
├── Leagues[] (saved configurations)
│   ├── LeagueConfig (sport, scoring, format, budget)
│   ├── Teams[] (your team + opponents)
│   │   ├── Roster[] (players + positions)
│   │   └── remaining_faab: number
│   └── FreeAgentPool[] (available players)
├── BidHistory[] (past recommendations + outcomes)
└── Preferences (default strategy: conservative/balanced/aggressive)

Player (reference data)
├── projections: { stats by scoring system }
├── position_eligibility: string[]
├── ownership_pct: number (from public data)
└── recent_stats: { last 7/14/30 days }
```

---

## User Workflow (Weekly)

### Football (1x per week, ~15 mins per league → reduced to ~5 mins)

1. **Tuesday morning:** Log in, review which leagues have new free agents of interest
2. **Select leagues to process** (or "process all")
3. **Update league state:** Paste/upload current rosters + FAAB remaining (or manually update changes)
4. **Review recommendations:** Dashboard shows top targets across all leagues with bid amounts
5. **Adjust and export:** Tweak any bids, export bid sheet, manually enter into platforms
6. **Wednesday morning:** After waivers process, input results for tracking

### Baseball (3–4x per week, ~20 mins each → reduced to ~8 mins)

1. **Saturday/Sunday:** Primary FAAB session — review all leagues
2. **Mid-week check-ins:** Quick scans for injury-driven opportunities
3. Same flow as football but with more frequent updates

---

## MVP Build Plan

### Phase 0: Foundation (Week 1)
- [ ] Set up project repo, dev environment, CI/CD
- [ ] Design database schema
- [ ] Build authentication + user management
- [ ] Set up Stripe billing (or flag for later)

### Phase 1: League Config + Data Input (Weeks 2–3)
- [ ] League configuration CRUD with presets
- [ ] CSV upload parser (define template format for roster + free agent data)
- [ ] Paste-from-clipboard parser
- [ ] Manual entry forms
- [ ] Save/load league state

### Phase 2: Bid Recommendation Engine (Weeks 3–5)
- [ ] Player projection data pipeline (pull from public sources)
- [ ] Base valuation algorithm (projections × scoring settings)
- [ ] Positional scarcity calculator
- [ ] Opponent need analysis (scan rosters for holes)
- [ ] Market adjustment logic (demand multiplier based on opponent needs + budgets)
- [ ] Budget management calculator (season pacing)
- [ ] Output: bid recommendation cards with base/adjusted/aggressive values

### Phase 3: Multi-League Dashboard (Weeks 5–6)
- [ ] All-leagues overview page
- [ ] Cross-league player view ("Player X available in N leagues")
- [ ] Batch bid sheet export (CSV)
- [ ] FAAB budget health indicators per league

### Phase 4: Post-Waiver Tracking (Week 7)
- [ ] Bid result input (won/lost + winning bid amount)
- [ ] Hit rate and efficiency metrics
- [ ] Historical bid data storage (feeds future model improvements)

### Phase 5: Polish & Launch (Week 8)
- [ ] UI/UX refinement
- [ ] Onboarding flow
- [ ] Landing page
- [ ] Beta testing with target users (NFBC community, podcast listeners)

---

## Demo Mock-Up

A companion React demo (`faab-advisor-demo.jsx`) is included showing:
- The multi-league dashboard view
- A single-league FAAB recommendation screen with base/adjusted/aggressive bids
- Opponent need analysis visualization
- Budget pacing indicator

This demo uses hardcoded sample data for a 12-team NFBC Online Championship (baseball) and a 12-team Superflex PPR league (football) to illustrate the UX and core value proposition.

---

## Go-to-Market Strategy

### Target audience (in priority order)
1. **NFBC players** managing multiple leagues ($125–$15,000 entry fees)
2. **High-stakes football players** in FAAB leagues on Sleeper, Yahoo, ESPN, Fantrax
3. **Guillotine league players** (FAAB is the entire game mechanic)
4. **Serious recreational players** managing 3–10 FAAB leagues who want an edge

### Distribution channels
- NFBC forums and community (direct, high-trust)
- Fantasy baseball/football podcasts (guest appearances, sponsorships)
- Twitter/X fantasy sports community
- Reddit (r/fantasybaseball, r/fantasyfootball)
- Content marketing: publish FAAB analysis articles using the tool's methodology

### Pricing options to test
- **Option A (one-time):** $500–$1,000 per year, all features
- **Option B (seasonal subscription):** $200–$300 per sport per season
- **Option C (tiered):** Free tier (3 leagues, basic recs) → Pro ($200/season, unlimited leagues + opponent analysis)

---

## Open Questions for Founders

1. **Start with baseball or football?** Baseball has less competition and a longer season (more value), but football has a larger audience. Recommendation: launch for whichever season is next.
2. **Data input friction:** How much manual work is acceptable for V1? Is CSV upload enough, or do we need URL scraping from day one?
3. **Projection data licensing:** Can we use public projections (Steamer, FanGraphs) or do we need our own model?
4. **Pricing:** One-time vs. recurring? Need to validate with 10–20 potential users.
5. **Platform integrations timeline:** When do we invest in API connections to NFBC, Sleeper, ESPN, etc.?
6. **Legal:** Any concerns around using platform data or providing "financial advice" in a paid competition context?

---

## Appendix: Key FAAB Market Data

- NFBC uses $1,000 FAAB budget across 27 weekly periods (~$37/week average)
- Most other platforms default to $100 FAAB
- NFBC does not allow $0 bids; most other platforms do
- Winning bids become visible after processing on all major platforms
- All opponent rosters and remaining FAAB balances are publicly visible within leagues
- NFBC built a "Copy Bids" feature for multi-league management in 2023, acknowledging the pain point
- Darkhorse / RealTime Sports runs guillotine leagues and high-stakes football with FAAB
- FantasyLife is the most advanced competitor with league sync + FAAB calculator, but lacks opponent-aware intelligence
