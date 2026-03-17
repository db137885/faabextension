# FAAB Advisor — Follow-Up Session Prompts (Updated)

Use these after the initial build is working. Each is a separate Claude Code session.

---

## Session 2: Polish the Paste Parser + Data Input UX

```
The paste parser is the most important UX in the app. Let's harden it.

1. Test with multiple paste formats:
   - Tab-delimited (standard browser table copy)
   - Space-delimited (what you get from some older sites)
   - Comma-separated (if someone copies from Excel)
   - Mixed whitespace with inconsistent column widths
   
   For each format, the parser should produce the same clean output.

2. Add intelligent column detection:
   - A column of names (mixed case, 2-3 words, maybe with Jr./III) → player name
   - A column matching position abbreviations (QB, RB, WR, TE, SP, RP, C, SS, OF, etc.) → position
   - A column of dollar amounts or pure numbers in the $0-1000 range → FAAB remaining
   - A column matching MLB/NFL team abbreviations (CLE, NYY, KC, etc.) → real team
   - If there's a header row, use it to confirm column mapping

3. Add a "How to copy your data" help panel:
   - Step-by-step with screenshots placeholder:
     "1. Go to your NFC league page"
     "2. Navigate to the FAAB or Roster page"  
     "3. Select the table (click the first cell, shift+click the last cell)"
     "4. Copy (Ctrl+C or Cmd+C)"
     "5. Paste here"
   - Include a "Try with sample data" button that pre-fills the paste box
     with the sample roster data so users can see how it works

4. Handle partial updates:
   - "I already loaded my league last week. This week Team X spent $45 
     on a player. Let me just update that one team's FAAB."
   - Quick-edit mode: show current teams with FAAB amounts, let user 
     click and edit individual values

5. After paste is confirmed and data stored, automatically run the bid 
   engine and redirect to League Detail with a success toast:
   "✓ 12 teams loaded. 8 free agents analyzed. 5 recommendations generated."
```

---

## Session 3: Export, Results Tracking, and History

```
Three features:

1. Bid Sheet Export:
   - "Export Bid Sheet" button on League Detail
   - Generates CSV: Player, Position, Team, Base Bid, Recommended, Aggressive, Confidence, Notes
   - "Copy to Clipboard" button formats as a clean text table:
     Gavin Williams  SP  CLE  Base: $28  Rec: $41  Agg: $58  [HIGH]
   - Both should be one-click actions

2. Results Tracker:
   - New section at bottom of League Detail: "Record This Week's Results"
   - For each recommendation: Won / Lost / Didn't Bid dropdown + winning bid amount field
   - On save, store BidResult records
   - Show cumulative stats in a card at the top of League Detail:
     - Bid win rate (e.g., "Won 4 of 6 bids this week")
     - Average overpay on wins (e.g., "You overpaid by $8 on average")
     - Average miss on losses (e.g., "Winning bid was $12 more than yours on average")
     - Season totals across all weeks

3. History View:
   - Tab or section on League Detail: "Past Weeks"
   - Expandable rows showing each past week's recommendations + outcomes
   - Visual trend: are you getting more efficient over time?
```

---

## Session 4: Multi-League Power Features + Polish

```
These features matter most for the 20+ league user:

1. Cross-League Batch View:
   - On the Dashboard, show a "This Week's Top Targets" section
   - Group by player: "Gavin Williams available in 3 of your leagues"
   - Show the recommended bid for each league side-by-side
   - Highlight where bids differ significantly (different league context)

2. Quick Update Flow:
   - "New Week" button on Dashboard that lets you bump all leagues 
     to the next week number and enter updated FAAB remaining for opponents
   - Ideally: paste the FAAB standings table from NFC (just team names + 
     FAAB amounts) and the parser updates existing teams

3. League Templates:
   - After configuring one league, "Save as Template" 
   - When creating a new league of the same format, one-click setup
   - Useful for someone with 15 NFBC Online Championships (same format, 
     different opponents)

4. UI Polish:
   - Loading spinners on all async operations
   - Empty states with clear CTAs ("No leagues yet. Create your first league →")
   - Error toasts with helpful messages
   - Keyboard shortcuts: Escape closes expanded cards
   - Responsive: usable on iPad (some users check during FAAB sessions)
   - Dashboard should look good with 1, 5, and 20+ leagues

5. README.md:
   - Local setup instructions (npm install, npm run seed, npm run dev)
   - Architecture overview (client/server/shared)
   - How to add a new scoring preset
   - How to adjust bid engine tuning parameters
   - "Demo mode" explanation
```

---

## Session 5 (Optional): Bid Engine Tuning

```
Let's validate the bid engine produces sensible numbers.

Run the engine against all 3 demo leagues and show me every recommendation 
with the full calculation breakdown:
- Fantasy value → base bid (show the math)
- Opponent needs detected (which teams, what urgency)
- Competitive pressure score → market adjustment multiplier
- Budget pacing status → aggressive bid modifier
- Final: base | market | aggressive

Scenarios to sanity-check:

1. Same player (Gavin Williams SP) in the 12-team OC vs 15-team Main Event:
   The 15-team league should have a notably higher market bid because there 
   are more opponents competing for scarce SP.

2. Drake Maye QB in a Superflex league:
   Should be treated as extremely high value/scarcity. If 4 opponents need 
   a QB in superflex, the market bid should be aggressive.

3. A low-scarcity position (OF in baseball with many options in the FA pool):
   Base bid and market bid should be modest even if the player is decent.

4. A league where the user's budget pacing is "behind" (spent too fast):
   All recommendations should scale down. The reasoning should mention this.

5. When no opponents need the position:
   Market bid should be LESS than base bid (we can get a discount).

Adjust multipliers if anything looks off. The goal: a knowledgeable fantasy 
player should look at every recommendation and think "yeah, that feels about right."
```

---

## Tips

- Start every session by asking Claude Code to read the spec files
- After each feature, run the app and verify visually
- Commit to git after each working session
- The paste parser is the highest-leverage feature to get right — it's the first thing every user does
- If Claude Code suggests scope creep, ask: "Does this help me demo to beta users next week?"
