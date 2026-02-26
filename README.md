# AI Advisor Prep Tool

An AI-powered intelligence system that handles pre-meeting research, synthesis, and post-call note extraction so financial advisors can show up fully present for clients.

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
