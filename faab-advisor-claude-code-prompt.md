# FAAB Advisor — Claude Code Build Instructions

## What to Build

Build an MVP web application called "FAAB Advisor" — a FAAB (Free Agent Acquisition Budget) bid recommendation tool for competitive fantasy baseball and football players.

## The Core Problem

In fantasy sports, FAAB is a blind bidding system for acquiring free agents. Existing tools give generic advice like "bid 10% on Player X." Our tool is different: it analyzes your specific league's opponent rosters, remaining budgets, and positional needs to produce opponent-aware bid recommendations.

## Tech Stack

- **Frontend:** React (Vite) + Tailwind CSS
- **Backend:** Node.js + Express (or Python FastAPI)
- **Database:** PostgreSQL (use Prisma ORM if Node, SQLAlchemy if Python)
- **Auth:** Simple email/password with JWT
- **State management:** React Context or Zustand (keep it simple for MVP)

## Data Model

```
User
  - id, email, password_hash, created_at

League
  - id, user_id, name, sport (baseball|football), platform, format_preset
  - scoring_settings (JSON), num_teams, faab_budget, faab_min_bid
  - waiver_schedule, created_at

Team (represents each team in a league — user's team + opponents)
  - id, league_id, team_name, is_user_team (boolean)
  - remaining_faab, standing_position

Player (reference data)
  - id, name, position, real_team, projected_stats (JSON)
  - ownership_pct

Roster (links teams to players)
  - team_id, player_id

FreeAgent (available players in a specific league's pool)
  - league_id, player_id

BidRecommendation (generated output)
  - league_id, player_id, base_bid, market_bid, aggressive_bid
  - confidence, opponents_needing, scarcity_level
  - reasoning (text), week_number, created_at

BidResult (post-waiver tracking)
  - recommendation_id, won (boolean), winning_bid_amount, created_at
```

## Core Algorithm (Bid Recommendation Engine)

This is the product's IP. Implement in this order:

### Layer 1: Base Player Valuation
- Take player's projected stats (rest-of-season projections)
- Apply league's scoring settings to compute a fantasy value
- Adjust for positional scarcity (count how many viable options exist at this position in the free agent pool)
- Return a base_bid as a dollar amount (% of total FAAB budget, scaled to season remaining)

### Layer 2: Opponent-Aware Market Adjustment
- For each opponent team in the league:
  - Scan their roster for positional holes (e.g., no starting QB, weak at SP)
  - Check their remaining FAAB (a team with $800 is a bigger threat than one with $50)
- Count opponents likely competing for this player/position
- Apply a demand multiplier:
  - 0 competitors → base bid sufficient (maybe even reduce)
  - 1-2 competitors → +5-15% over base
  - 3+ competitors → +15-30% over base
  - If a high-FAAB opponent has an acute need → additional premium
- This produces market_bid

### Layer 3: Budget Management
- Calculate season pacing: (remaining_faab / total_faab) vs (remaining_weeks / total_weeks)
- If user is spending faster than pace → recommend conservative bids
- If user has surplus → can afford to be aggressive
- aggressive_bid = market_bid * 1.3 (capped at reasonable maximum)

### Layer 4: Confidence Score
- High: Strong projection data + clear positional need + high scarcity
- Medium: Some uncertainty in projections or moderate scarcity
- Low: Speculative add or low impact on standings

## Key Pages / Views

### 1. Dashboard (All Leagues Overview)
- Card for each league showing: name, sport, platform, format, remaining FAAB, budget gauge, standing, # of recommendations
- Summary stats across all leagues: total FAAB remaining, total recommendations, cross-league opportunities
- Cross-league view: when the same player is available in multiple leagues, show how bids differ by context

### 2. League Detail View
- League config summary at top
- Budget pacing gauge with "ahead/on-pace/behind" indicator
- Opponent grid: each opponent's name, remaining FAAB, and positional needs (color-coded)
- Bid recommendation cards for each target player, showing:
  - Player name, position, team
  - Base bid | Recommended bid | Aggressive bid
  - Confidence badge (high/medium/low)
  - Scarcity level
  - Reasoning text
  - Expandable: opponent analysis detail, projected stats, budget impact %
- Export button → CSV of bid sheet

### 3. League Configuration
- Create/edit league form with presets:
  - NFBC Main Event (15-team, 5x5 roto, $1,000 FAAB, $1 min)
  - NFBC Online Championship (12-team, 5x5 roto, $1,000 FAAB)
  - Standard PPR (12-team, $100 FAAB)
  - Superflex PPR (12-team, $100 FAAB)
  - Guillotine League
- Custom scoring settings editor
- Save as reusable template

### 4. Data Input
- CSV upload with template download link
- Paste-from-clipboard area (tab-delimited)
- Manual entry form for roster + free agents
- CSV templates:
  - roster_template.csv: team_name, player_name, position, is_user_team, remaining_faab
  - free_agents_template.csv: player_name, position, real_team

### 5. Results Tracker
- After waivers process, input: won/lost + winning bid amount
- Dashboard showing: hit rate, average overpay, bid efficiency over time

## Design Direction

Dark theme, data-dense, monospace-influenced typography. Think Bloomberg terminal meets sports analytics dashboard. The target user is a sophisticated, numbers-driven player who wants information density, not flashy graphics.

Color palette: Navy/slate backgrounds (#020617, #0f172a), blue accents (#3b82f6), amber for warnings/aggressive (#f59e0b), green for confidence/value (#16a34a), red for alerts (#dc2626).

## What NOT to Build for MVP

- No real-time API integrations with fantasy platforms (user provides data manually)
- No proprietary projection model (use public projection data or let user input projections)
- No mobile app (responsive web is fine)
- No social features, no league chat, no sharing
- No complex ML model — the opponent-aware adjustment logic can be rule-based for V1

## Demo Data

A React demo file (faab-advisor-demo.jsx) is included showing the target UX with hardcoded sample data. Use it as a reference for the UI design and data shapes, but build the real app with proper backend data flow.

## Project Structure (Suggested)

```
faab-advisor/
├── client/                  # React frontend (Vite)
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── pages/           # Dashboard, LeagueDetail, Config, Input, Results
│   │   ├── hooks/           # Custom hooks for data fetching
│   │   ├── utils/           # Bid calculation helpers
│   │   └── App.jsx
│   └── package.json
├── server/                  # Backend API
│   ├── routes/              # Express routes
│   ├── services/            # Bid engine, data processing
│   │   └── bidEngine.js     # THE core algorithm
│   ├── models/              # Prisma schema or SQLAlchemy models
│   └── package.json
├── shared/                  # Shared types, constants
│   ├── scoring-presets.js   # League format presets
│   └── csv-templates/       # CSV template files
└── README.md
```

## Priority Order for Development

1. Database schema + League Configuration CRUD
2. Data input (CSV upload + paste)
3. Bid Recommendation Engine (Layer 1 → 2 → 3 → 4)
4. Dashboard + League Detail views
5. Export functionality
6. Results tracking
7. Polish + landing page
