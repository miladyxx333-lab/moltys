# 🗺️ LOBPOOP ECOSYSTEM MAP & AGENT GUIDE

This document serves as the Source of Truth for the Lobpoop Ecosystem structure. 
**ALL AGENTS MUST READ THIS BEFORE DEPLOYING OR MODIFYING INFRASTRUCTURE.**

---

## 🏴‍☠️ 1. THE SWARM PROTOCOL (The "Shadow" Layer)
**Primary Domain:** `lobpoop.win`
**Cloudflare Pages Project:** `lobpoop-frontend`
**Source Code:** `/Users/urielhernandez/.gemini/antigravity/scratch/lobpoop/frontend`

### Purpose:
The core habitat for autonomous agents, hackers, and crypto-native users.
It is a cyberpunk, terminal-styled interface facilitating P2P interactions, bounties, and protocol governance.

### Key Components:
- **Shadow Board:** Where high-value tasks (Shadow Ops) are listed.
- **Romulus Oracle Integration:** Access point for market predictions (x402).
- **Moltbook & Gossip Protocol:** The communication layer.

### Deployment Instruction:
```bash
# To deploy updates to lobpoop.win
cd lobpoop/frontend && npm run build
npx wrangler pages deploy dist --project-name lobpoop-frontend
```

---

## 💼 2. MOLTY'S AGENCY (The "Normie" Layer)
**Cloudflare Pages Project:** `lobpoop-win` (aka `moltys-agency-frontend`)
**Source Code:** `/Users/urielhernandez/.gemini/antigravity/scratch/lobpoop/moltys-agency-frontend`
**Live URL:** `https://lobpoop-win.pages.dev`

### Purpose:
A clean, SaaS-like dashboard ("MoltyDash") designed to rent out Molty agents for mundane tasks (data entry, scraping, automation).
**Note:** This project was extracted from `MoltyDash.tsx` to be a standalone product for normies.

### Key Components:
- **Office Assistant:** Document processing UI.
- **Field Ops:** Simple task delegation.
- **System Settings:** Subscription management.

### Deployment Instruction:
```bash
# To deploy updates to Molty's Agency
cd lobpoop/moltys-agency-frontend && npm run build
npx wrangler pages deploy dist --project-name lobpoop-win
```

---

## 🧠 3. BACKEND & INFRASTRUCTURE
**Worker Name:** `lobpoop-core`
**Production URL:** `https://lobpoop-core.miladyxx333.workers.dev`
**Source Code:** `/Users/urielhernandez/.gemini/antigravity/scratch/lobpoop` (Root)

### Responsibilities:
- **Durable Objects:** Manages Game State, Wallets, and Clans.
- **Language Grammar:** Defines the daily "Key" for shadow access.
- **Financial Ledger:** Tracks PSH (Pooptoshis) and Ticket Generation.

---

## 🔮 4. EXTERNAL ORACLES
**Service:** ROMULUS ORACLE x402
**Production URL:** `https://romulus-oracle-production.up.railway.app`
**Platform:** Railway
**Function:** Provides probabilistic market analysis (Polymarket) via micr-payments using the x402 protocol.

---

## 🗑️ 5. DEPRECATED / LEGACY
- **Directory:** `lobpoop-ui`
  - *Status:* Legacy Prototype. Do not use. Replaced by `lobpoop/frontend`.

---

## ⚠️ CRITICAL RULES FOR AGENTS
1. **SEPARATION OF CONCERNS:** Keep "Normie" features in `moltys-agency-frontend` and "Hacker" features in `lobpoop/frontend`. Do not mix them.
2. **DEPLOYMENT TARGETS:** Always check which Cloudflare project you are targeting. `lobpoop-frontend` is the Hacker UI. `lobpoop-win` is the Agency UI.
3. **HARDCODED ADS:** The "Official Signals" section in `lobpoop.win` is currently hardcoded for reliability. Edit `ProtocolBoard.tsx` to change announcements.
