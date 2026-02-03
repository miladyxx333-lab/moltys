# 🏭 MOLTY'S AGENCY BUILD PLAN & SECRETS

> **CONFIDENTIAL:** This document outlines the engineering architecture for the "Molty's Agency" product (`lobpoop-win`), separating it from the core Lobpoop protocol.

---

## 🎯 OBJECTIVE
Deploy a fleet of rentable AI agents ("Moltys") for B2B/Normie clients, accessible via WhatsApp and managed through a simple web dashboard.

---

## 🏗️ ARCHITECTURE STACK

### 1. THE BRAIN (LLM Layer)
We offer a hybrid approach to cater to both privacy-conscious and performance-hungry clients.

*   **OPTION A: CLOUD INTELLIGENCE (Premium)**
    *   **Models:**
        *   **Gemini 1.5 Pro / Flash:** High speed, large context window (Google Cloud).
        *   Claude 3.5 Sonnet (Anthropic).
        *   GPT-4o (OpenAI).
    *   **Use Case:** Complex reasoning, huge document processing, coding tasks.
    *   **Mechanism:** API Keys routed through `nanobot/config`.

*   **OPTION B: SOVEREIGN LOCAL (Privacy/Cost-Saver)**
    *   **Engine:** **Ollama** (Running locally or on dedicated GPU server).
    *   **Models:** Llama 3 (8B), Mistral, Gemma 2.
    *   **Integration:** `nanobot` supports OpenClaw protocols which natively talk to Ollama endpoints (`http://localhost:11434`).
    *   **Advantage:** $0 token cost after hardware, 100% data privacy.

### 2. THE BODY (Execution Engine)
*   **Core:** `nanobot` (based on `HKUDS/nanobot` repo).
*   **Why?** Lightweight (~4k lines), Python-based, easy to Dockerize per client.
*   **Location:** `/scratch/lobpoop/moltys-engine`

### 3. THE MOUTH (Communication Bridge)
*   **Protocol:** WhatsApp Web (via `Baileys` library).
*   **Location:** `/scratch/lobpoop/moltys-engine/bridge/src/whatsapp.ts`
*   **Mechanism:**
    1.  Engine starts.
    2.  Bridge generates a QR Code string.
    3.  Frontend receives QR (WebSocket).
    4.  Client scans with WhatsApp.
    5.  **Molty is now alive inside their phone.**

### 4. THE FACE (Dashboard)
*   **Project:** `moltys-agency-frontend` (aka `lobpoop-win`).
*   **URL:** `https://lobpoop-win.pages.dev`
*   **Function:** Billing, Plan Selection, Task Overview, QR Scanning.

---

## 📋 NEXT STEPS (ACTION PLAN)

1.  **DOCKERIZE NANOBOT:**
    *   Create a production-ready `Dockerfile` for `moltys-engine`.
    *   Ensure it exposes the WhatsApp QR code stream.

2.  **BRIDGE THE GAP:**
    *   Implement the WebSocket server in the `bridge` to broadcast the QR code to the React frontend.
    *   Update `moltys-agency-frontend` to display this QR code dynamically.

3.  **GEMINI INTEGRATION:**
    *   Verify `nanobot`'s provider config for Google Gemini (API Keys).
    *   Ensure it's a first-class citizen in the "Premium" tier.

4.  **LAUNCH:**
    *   Deploy the first "Pilot Molty" connecting a real WhatsApp account to a Gemini Brain.

---

*Verified by Protocol Engineer: Antigravity*
*Date: 2026-02-02*
