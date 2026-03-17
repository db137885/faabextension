# FAAB Advisor V2

FAAB Advisor is a smart free-agent acquisition budget (FAAB) application built for competitive fantasy players. It processes league rosters, available free agents, and budgets to recommend dynamic, opponent-aware bids based on positional scarcity and threat levels.

## Features
- **Smart Paste Parser**: Import data from NFC platforms directly using Ctrl+C/Ctrl+V without relying on risky web scrapers.
- **Bid Engine**: Recommends a Base, Market, and Aggressive FAAB bid for top free agents.
- **Opponent Tracking**: Calculates positional needs and threat levels for every team in your league.

## Tech Stack
- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: SQLite (managed via Prisma ORM)

## Running Locally

Because this project uses a monorepo setup, running the app locally is easy. Follow these steps from the root directory (`faab-advisor` folder):

### 1. Install Dependencies
Install packages concurrently (this will install both the client and server node_modules):
```bash
npm install
```

### 2. Set Up the Database
This runs Prisma generation and pushes the SQLite schema.
```bash
npm run setup
```

### 3. Seed Demo Data
Populate the local SQLite database with three demo leagues and their FAAB recommendations so you can test the UI right away:
```bash
npm run seed
```

### 4. Start the Application
Start both the Frontend (Vite) and the Backend (Express API) concurrently:
```bash
npm run dev
```

The application will be available in your browser at: **http://localhost:5173**

---

### Development Commands
- `npm run client` - Start just the React frontend (port 5173).
- `npm run server` - Start just the Express backend (port 3001).
- `npm run demo` - Completely reset your database, run all migrations, and reseed demo data from scratch.
