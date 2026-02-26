# AI Advisor Prep Tool

An AI-powered intelligence system that handles pre-meeting research, synthesis, and post-call note extraction so financial advisors can show up fully present for clients.

## The Problem

A Wealthsimple advisor managing 80 clients spends 20–30 minutes preparing for each meeting, manually reviewing notes, checking portfolio positions, and trying to remember what each client cares about. After the meeting, another 20 minutes goes to logging action items, updating preferences, and drafting a follow-up email. That's roughly 50 minutes of context work per client interaction that produces no direct client value. Across a full book, it's hours every week spent on synthesis instead of advice
The System

Advisor Prep is an AI-assisted workflow tool that handles the context work on both sides of every client meeting. It has five interconnected components: a triage dashboard that surfaces meeting urgency and portfolio drift across the full book; a client profile that accumulates structured preferences over time; a pre-meeting brief generator that synthesises the client's history, portfolio state, and open action items into a single AI-generated document; a transcript analyser that extracts decisions, action items, preferences, and flags from a post-call transcript; and a follow-up email drafter that composes a client-ready email from the analysis output.The backend is a FastAPI service using SQLite and GPT-4o. The preference model stores each signal with a category, source, and meeting attribution — so the system builds a structured memory of each client across every interaction, not just the most recent one. The portfolio rebalancing engine computes drift mathematically from live holdings and target allocations, and GPT-4o interprets that drift through the client's specific life context rather than in the abstract.

## The Human/AI Boundary

The boundary is intentional and explicit. The AI handles synthesis, extraction, and drafting — tasks that are time-consuming, mechanical, and error-prone when done by a busy human under time pressure. The human retains every judgment that matters: what to say in the meeting, what to recommend, whether to act on a flag, and whether to send an email.Concretely: the AI never speaks to clients, never makes a trade recommendation, and never takes an autonomous action. The "Send Email" button requires a human click after review. Extracted preferences can be deleted if wrong. The portfolio analysis surfaces questions for the advisor to raise — it does not tell them what to do. The brief is a preparation tool, not a script. This division isn't just a safety measure — it's the right design. The AI is good at never forgetting. The advisor is good at reading the room.

## Failure Modes
The system is designed so AI errors are visible and correctable before they matter. Extracted preferences are shown to the advisor before saving; incorrect ones can be deleted. Email drafts require explicit editing and confirmation before sending. The analysis is regeneratable — if the output looks wrong, the advisor can re-run it. Nothing in the system is write-only or irreversible.

## Scale
The data model is stateless per client and per request, so it scales horizontally without architectural changes. The dashboard's urgency filter — today a binary toggle — is the foundation of a priority queue that could surface the five clients who need attention from a book of five hundred.




## The Core Loop

```
Client Profile (persistent memory)
        ↓
  Pre-Meeting Brief (AI-generated)
        ↓
  Advisor ↔ Client Meeting
        ↓
  Transcript Upload / Paste
        ↓
  Post-Call Analysis (AI-extracted)
        ↓
  Updated Client Profile (feeds next brief)
```

## Setup

### Backend

```bash
cd backend
python3 -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env            # Add your OPENAI_API_KEY
python seed_data.py             # Populate 5 synthetic clients
uvicorn main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev                     # Runs on localhost:3000
```

## Features

- **Dashboard** — searchable client list with portfolio value, risk profile, next meeting date, and "Meeting Soon" status badges
- **Client Profile** — preference tags grouped by category (life goals, concerns, interests, constraints), meeting timeline with links to briefs and analyses
- **Pre-Meeting Brief** — AI-generated brief with client snapshot, talking points, flags, open action items, and preference reminders
- **Transcript Analysis** — paste or upload a transcript; AI extracts meeting summary, decisions, action items, preferences, and compliance flags; preferences auto-saved to client profile

## Human/AI Boundary

The AI synthesizes and surfaces information. The human advisor is responsible for all relationship judgment, financial recommendations, and compliance-sensitive decisions.

The system is explicitly designed to **never**:
- Recommend specific trades or financial products
- Draft client-facing messages
- Make assumptions about risk tolerance beyond what the client explicitly stated
- Take automated action on compliance flags

## Stack

- **Backend:** FastAPI · SQLAlchemy · SQLite · OpenAI GPT-4o
- **Frontend:** Next.js 15 · React · Tailwind CSS v4
