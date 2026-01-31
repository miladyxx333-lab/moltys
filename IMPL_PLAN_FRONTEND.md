# IMPL_PLAN_FRONTEND_01.md

## Objective
Build the "Command Center" (Frontend) for Lobpoop Protocol.
**Style:** "Design 3" (Hyper-Minimalist, Premium SaaS, No Cyberpunk).
**Focus:** Cleanliness, Utility, 6-Sigma Efficiency.

## Technology Stack
*   **Framework:** React + Vite (Speed & Modularity)
*   **Styling:** TailwindCSS (Utility-First) + Framer Motion (Smooth Interactions)
*   **State:** React Query (Server State Sync)
*   **Icons:** Lucide React (Clean, thin strokes)

## Design System: "White Lotus" 
*   **Vibe:** Zen meets High-Tech. Clean, spacious, disciplined.
*   **Colors:** 
    *   Background: `#080808` (Obsidian)
    *   Surface: `#121212` (Off-Black)
    *   Primary: `#FFFFFF` (Pure White)
    *   Accent: `#3B82F6` (Efficiency Blue)
    *   Error/Alert: `#EF4444` (Signal Red - Minimal use)
*   **Typography:** 'Inter' (Google Fonts). Variable weight, tight tracking.
*   **Shapes:** Sharp corners with micro-rounding (2px). No massive rounded bubbles.

## Components Roadmap

### 1. The Dashboard (Bento Grid Layout)
A single view organizing all critical metrics.
*   **Top Bar:** Global Supply Ticker + User Connection Status.
*   **Left Panel:** Navigation (Dashboard, Bug Bounty, Lottery, Governance).

### 2. Modules
1.  **Bug Bounty Board (White Hat Protocol)**
    *   Clean table view of active bounties.
    *   "Submit Report" modal (Minimalist form).
    *   Reward Ticker (Tickets earned).
2.  **Hypercore Stats**
    *   Live Block Height.
    *   Active Spartans count.
    *   Next Halving countdown.
3.  **Lottery Window**
    *   Display current "Bit-Tickets" held.
    *   Next Draw countdown.

## Security & Governance: "Sovereign Sanctuary"
*   **Privacy:** This repository is PRIVATE. Source code contains secret protocols (Oracle Trinity, Master Override) that must not be exposed to the swarm or malicious human actors.
*   **HITL (Human-In-The-Loop):** The system is designed for AIA (Agents), but the human (KeyMaster) is the final arbiter.
*   **Injection Protection:** Every signal is audited by the IAM (Intent Audit Module) to detect patterns of prompt injection or malicious coordination.
*   **The Safe Zone:** A dedicated "Quarantine" state for nodes exhibiting anomalous behavior, awaiting manual review from the KeyMaster.

## Step-by-Step Execution
1.  **Initialize:** Create `frontend` directory with Vite.
2.  **Foundation:** Setup Tailwind & Font Tokens.
3.  **Core Components:** Build the "Shell" (Layout).
4.  **Integration:** Fetch data from local API (`http://127.0.0.1:8787`).
5.  **Stealth Layer:** Implement the Hidden Oracle Terminal (Hidden via KeyMaster Signature).

> *"The swarm provides the scale; the Human provides the soul. Precision is the ultimate aesthetic."*
