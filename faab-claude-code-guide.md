# What to Share with Claude Code — Complete Build Kit

## Overview

You have 4 documents to share with Claude Code. Together they give it everything needed to build a functional V1 — not just scaffolding, but a working tool you can demo.

**Share these files in this order:**

1. `faab-advisor-claude-code-prompt.md` — The build instructions (tech stack, data model, page descriptions, project structure, priority order)
2. `faab-bid-engine-spec.md` — The algorithm specification (concrete formulas, pseudocode, scoring presets with real values)
3. `sample-data/` folder — CSV templates with realistic sample data for testing
4. `faab-advisor-demo.jsx` — The React demo as a UI/UX reference

## What Each File Gives Claude Code

### The Build Prompt → Architecture & Structure
Tells Claude Code what to build, what stack to use, and how to organize the project. This is the "what."

### The Bid Engine Spec → The Brain
This is the most important supplemental file. The original prompt described the algorithm conceptually ("analyze opponent needs and adjust bids"). The engine spec provides:
- Implementable pseudocode for every calculation step
- Concrete multiplier values and thresholds (not placeholders)
- Complete scoring presets with real fantasy point values
- League configuration presets matching real-world formats (NFBC, PPR, Superflex, etc.)
- The reasoning generator that produces human-readable explanations for each bid

Without this, Claude Code would have to invent the math. With it, Claude Code can implement the exact logic.

### The Sample Data → Instant Testability
Real-looking rosters and free agent pools that Claude Code can seed into the database. This means:
- The app works out of the box with demo data
- You can show your colleague a populated dashboard immediately
- You can test the bid engine against realistic scenarios
- CSV templates double as the format users will actually upload

### The Demo → Visual Target
Shows exactly what the finished UI should look like. Claude Code can reference the component structure, color palette, data shapes, and interaction patterns (expandable cards, budget gauges, cross-league view).

---

## How to Prompt Claude Code Effectively

### Session 1: Project Setup + Data Model

Start with:
```
Read the files in this project directory. Start by setting up the project:
1. Initialize a Vite + React + Tailwind frontend
2. Initialize a Node.js + Express + Prisma backend  
3. Set up the database schema from the spec
4. Seed the database with the sample CSV data
5. Create basic API routes for CRUD on leagues and teams

Reference: faab-advisor-claude-code-prompt.md for architecture
Reference: faab-bid-engine-spec.md for the scoring presets and league presets to seed
Reference: sample-data/ for seed data
```

### Session 2: Bid Engine Implementation

```
Now implement the bid recommendation engine as a service.
Reference faab-bid-engine-spec.md for the complete algorithm.

Build these functions:
1. calculateFantasyPoints — apply scoring settings to player projections  
2. positionalScarcity — analyze the free agent pool
3. calculateBaseBid — convert value to FAAB dollars
4. calculateCompetitivePressure — scan opponent rosters for needs
5. calculateMarketBid — apply opponent-aware adjustment
6. budgetPacing — season pacing status
7. calculateAggressiveBid — aggressive tier
8. calculateConfidence — confidence scoring
9. generateReasoning — human-readable explanation
10. generateBidRecommendation — orchestrator that calls all of the above

Include the complete scoring presets and league presets from the spec.
Write tests using the sample data to verify the engine produces sensible outputs.
```

### Session 3: Frontend — Dashboard + League Detail

```
Build the frontend views. Reference faab-advisor-demo.jsx for the target UI.

Pages needed:
1. Dashboard — all leagues overview with summary stats, league cards, cross-league view
2. League Detail — budget gauge, opponent grid, bid recommendation cards (expandable)
3. League Config — create/edit with presets dropdown
4. Data Input — CSV upload + paste-from-clipboard

Match the dark theme and data-dense aesthetic from the demo.
Use the same color palette: navy backgrounds, blue accents, amber for aggressive/warnings.
```

### Session 4: Data Input + Export

```
Build the data input flow:
1. CSV upload that parses the roster and free agent templates
2. Paste-from-clipboard (tab-delimited) with auto-detection
3. After data is loaded, automatically run the bid engine and show recommendations
4. Export button that generates a CSV bid sheet for manual entry into platforms

Also build the results tracker:
1. After waivers process, user inputs: won/lost + winning bid amount
2. Dashboard shows hit rate and average overpay
```

---

## Tips for Getting the Best Results from Claude Code

### Be specific about edge cases upfront
Include these in your prompts:
- "Handle the case where a league uses $0 minimum bids vs $1 minimum"
- "NFBC uses $1,000 budget while most other platforms use $100 — the algorithm should work with any budget size"
- "In superflex leagues, QBs are dramatically more valuable — the need detection should treat the SUPERFLEX slot as a QB need if the opponent doesn't have 2 QBs"
- "For baseball roto, negative ERA and WHIP are better — the SGP calculation needs to handle inverse categories"

### Ask Claude Code to test with your sample data
After building each component, ask it to run the engine against the sample data and show you the output. This catches issues early:
```
Run the bid engine against the NFBC Online Championship sample data.
Show me the top 5 recommendations with full output including reasoning.
Do the numbers make sense? A $28 base bid on a SP in a $1,000 budget league 
with 19 remaining weeks should feel reasonable.
```

### Iterate on the bid engine tuning
The multipliers in the engine spec are starting points. After seeing real output:
```
The market adjustment seems too aggressive — a 7-opponent need is producing 
a 2x multiplier which feels high. Can we cap the multiplier at 1.6x for the 
market bid and reserve 2x for the aggressive bid only?
```

### Ask for a "demo mode" toggle
```
Add a "demo mode" that loads the sample data automatically so I can show 
the full product to my colleague without any data entry required.
The demo should show 3 leagues (2 baseball, 1 football) with pre-populated 
rosters and recommendations.
```

---

## What You Might Want to Add Later (But NOT for V1)

These are things to keep in mind but explicitly tell Claude Code to skip:

- **Platform API integrations** (Sleeper, ESPN, Yahoo, NFBC) — V2 feature
- **Historical bid database** (tracking bids across seasons for opponent profiling) — V2
- **Machine learning model** (predicting optimal bids from historical outcomes) — V3
- **Mobile app** — maybe never, responsive web is fine
- **Real-time projection updates** — V2, pull from an API instead of user input
- **Stripe / payment integration** — build separately when ready to charge
- **User-to-user features** (sharing, leagues, social) — never, keep it a solo power tool

---

## One More Thing: Your Own FAAB Data

If you have access to your own historical FAAB data from NFBC or other platforms, that would be incredibly valuable for tuning the engine. Specifically:

- **Past winning bids** for players you targeted (what did they actually go for?)
- **Your bid history** (what did you bid and did you win?)
- **League rosters from a real week** (to test the opponent need detection against reality)

Even a single week of real data from one of your leagues would help validate that the engine produces reasonable numbers. If you can export a week's worth of FAAB results from NFBC, share that with Claude Code and ask it to compare the engine's recommendations against what actually happened.
