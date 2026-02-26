import os
import json
from openai import OpenAI
from dotenv import load_dotenv

# Resolve path explicitly so it works regardless of working directory
_ENV_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".env")
load_dotenv(_ENV_PATH, override=True)

_api_key = os.getenv("OPENAI_API_KEY")
if not _api_key:
    raise RuntimeError(f"OPENAI_API_KEY not found. Looked for .env at: {_ENV_PATH}")

client = OpenAI(api_key=_api_key)

REBALANCING_SYSTEM_PROMPT = """You are an AI assistant helping a Wealthsimple financial advisor understand their client's portfolio drift and what it means in the context of that client's life.

You will receive:
1. A portfolio drift analysis (computed mathematically — treat this as factual)
2. The client's profile, risk tolerance, and life preferences

Your job is to write a plain-language narrative that helps the advisor understand:
- What the portfolio drift means for this client specifically
- Which flags are most important given the client's life context and timeline
- What questions the advisor might want to raise (not answers — questions)

Critical constraints:
- Never recommend specific securities, funds, or trades
- Never tell the advisor what to do — only surface what to consider and why
- Never override the client's stated risk profile
- Flag urgency only when genuinely warranted by the client's timeline or life context
- Keep the narrative concise — advisors are busy
- If no flags are meaningful in context, say so clearly

Output must be valid JSON matching this schema:
{
  "narrative": "string (2-4 sentences, plain language portfolio health summary in client context)",
  "context_flags": [
    {
      "flag": "string (the drift item)",
      "context": "string (why it matters for this specific client)",
      "urgency": "low or medium or high",
      "suggested_question": "string (a question for the advisor to consider raising)"
    }
  ],
  "no_action_needed": false,
  "overall_urgency": "low or medium or high"
}"""

BRIEF_SYSTEM_PROMPT = """You are an AI assistant that helps financial advisors prepare for client meetings at Wealthsimple.

Your role is to synthesize client information into a clear, structured pre-meeting brief. 
You surface relevant context, flag important items, and remind the advisor of what matters to this client as a person.

Important constraints:
- Never recommend specific trades, securities, or financial products
- Never make assumptions about the client's risk tolerance beyond what is explicitly stated in their profile
- Never draft client-facing messages or communications
- Flag emotional or sensitive topics for advisor awareness only — do not suggest how to respond
- Be concise. Advisors are busy. Every sentence must earn its place.

Output must be valid JSON matching this schema:
{
  "client_snapshot": "string (2-3 sentences)",
  "talking_points": ["string"],
  "flags": ["string"],
  "open_action_items": ["string"],
  "preference_reminders": ["string"],
  "portfolio_flags": ["string"]
}"""

EMAIL_DRAFT_SYSTEM_PROMPT = """You are an AI assistant helping a Wealthsimple financial advisor draft a post-meeting follow-up email to their client.

Your job is to write a warm, professional email that the advisor will review and edit before sending.

Guidelines:
- Write from the advisor's perspective to the client
- Tone: warm and professional — like a trusted advisor, not a corporate template
- Be concise. Clients are busy. Every sentence must earn its place.
- Do NOT use hollow filler phrases like "I hope this email finds you well" or "Please don't hesitate to reach out"
- Summarize the call in 2-3 focused sentences
- List action items clearly with owners (advisor vs. client) and due dates where known
- Suggest a timeframe for the next meeting (do not pick a specific date — leave that to the advisor)
- End with a warm, brief sign-off

Output must be valid JSON matching this schema exactly:
{
  "subject": "string (short, specific subject line — not generic)",
  "body": "string (full email body, plain text, use \\n for line breaks)"
}"""


ANALYSIS_SYSTEM_PROMPT = """You are an AI assistant that analyzes financial advisor-client meeting transcripts at Wealthsimple.

Your job is to extract structured, accurate information from a conversation transcript. 
You are building a memory layer for the advisor — so they never have to manually take notes.

Important constraints:
- Only extract what was explicitly said. Do not infer or assume.
- Preferences must be direct signals from the client, not interpretations.
- Flags are for advisor awareness only. You are not making recommendations.
- If something is ambiguous, note the ambiguity rather than resolving it.
- Never include personally identifying information beyond the client's first name.

Output must be valid JSON matching this schema:
{
  "summary": "string (3-4 sentences covering what was discussed)",
  "decisions_made": ["string"],
  "action_items": [
    {"item": "string", "owner": "advisor or client", "due": "string or null"}
  ],
  "extracted_preferences": [
    {"category": "life_goal or concern or interest or constraint", "preference": "string"}
  ],
  "flags": ["string"]
}"""


def _parse_json_response(content: str) -> dict:
    """Strip markdown fences if present and parse JSON."""
    text = content.strip()
    if text.startswith("```"):
        lines = text.split("\n")
        # Drop first line (```json or ```) and last line (```)
        text = "\n".join(lines[1:-1]).strip()
    return json.loads(text)


def generate_brief(user_prompt: str) -> dict:
    response = client.chat.completions.create(
        model="gpt-4o",
        temperature=0.3,
        messages=[
            {"role": "system", "content": BRIEF_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
    )
    return _parse_json_response(response.choices[0].message.content)


def generate_rebalancing_narrative(client_obj, preferences: list, engine_output: dict) -> dict:
    """GPT-4o interprets portfolio drift through the lens of the client's life context."""
    pref_lines = [
        f"[{p.category.upper()}] {p.preference}"
        for p in preferences
        if p.category in ("life_goal", "concern", "constraint")
    ]
    formatted_prefs = "\n".join(pref_lines) if pref_lines else "No specific life context recorded."

    flagged_str = (
        "\n".join(f"  - {item}" for item in engine_output.get("flagged_items", []))
        or "  None"
    )

    alloc_rows = []
    for item in engine_output.get("allocation_summary", []):
        sign = "+" if item["drift_pct"] >= 0 else ""
        flag_marker = " ⚑" if item["flagged"] else ""
        alloc_rows.append(
            f"  {item['display_name']:<25}  Target: {item['target_pct']*100:5.1f}%  "
            f"Actual: {item['actual_pct']*100:5.1f}%  "
            f"Drift: {sign}{item['drift_pct']*100:5.1f}%{flag_marker}"
        )
    alloc_table = "\n".join(alloc_rows) or "  No allocation data."

    accounts_str = client_obj.accounts or "[]"
    user_prompt = f"""Generate a context-aware rebalancing narrative for the following client.

CLIENT PROFILE:
Name: {client_obj.name}
Age: {client_obj.age or "Not specified"}
Occupation: {client_obj.occupation or "Not specified"}
Risk Profile: {client_obj.risk_profile or "Not specified"}
Accounts: {accounts_str}

LIFE CONTEXT & PREFERENCES:
{formatted_prefs}

PORTFOLIO DRIFT ANALYSIS (computed, treat as factual):
Total Portfolio Value: ${engine_output.get('total_portfolio_value', 0):,.0f}
Drift Score: {engine_output.get('drift_score', 0)}/100
As Of: {engine_output.get('as_of_date', 'Unknown')}

Flagged Drift Items:
{flagged_str}

Full Allocation Summary:
{alloc_table}

Generate the context-aware rebalancing narrative now."""

    response = client.chat.completions.create(
        model="gpt-4o",
        temperature=0.3,
        messages=[
            {"role": "system", "content": REBALANCING_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
    )
    return _parse_json_response(response.choices[0].message.content)


def generate_draft_email(client_obj, analysis_obj) -> dict:
    """Draft a post-meeting follow-up email based on the post-call analysis."""
    import json as _json

    def _load(field):
        if not field:
            return []
        try:
            return _json.loads(field)
        except Exception:
            return []

    decisions = _load(analysis_obj.decisions_made)
    action_items = _load(analysis_obj.action_items)

    decisions_str = (
        "\n".join(f"  - {d}" for d in decisions) if decisions else "  None recorded"
    )

    action_items_str = ""
    for item in action_items:
        owner = item.get("owner", "").capitalize()
        due = f" (due {item['due']})" if item.get("due") else ""
        action_items_str += f"  - [{owner}] {item.get('item', '')}{due}\n"
    if not action_items_str:
        action_items_str = "  None recorded"

    user_prompt = f"""Draft a post-meeting follow-up email for the following advisor-client interaction.

CLIENT:
Name: {client_obj.name}
Email: {client_obj.email or "not on file"}

MEETING SUMMARY:
{analysis_obj.summary or "No summary available."}

DECISIONS MADE:
{decisions_str}

ACTION ITEMS:
{action_items_str}

Draft the follow-up email now."""

    response = client.chat.completions.create(
        model="gpt-4o",
        temperature=0.4,
        messages=[
            {"role": "system", "content": EMAIL_DRAFT_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
    )
    return _parse_json_response(response.choices[0].message.content)


def analyze_transcript(client_obj, transcript_obj) -> dict:
    accounts_str = client_obj.accounts or "[]"
    user_prompt = f"""Analyze the following meeting transcript between a Wealthsimple advisor and their client.

CLIENT CONTEXT:
Name: {client_obj.name}
Risk Profile: {client_obj.risk_profile or "Not specified"}
Accounts: {accounts_str}

TRANSCRIPT:
{transcript_obj.raw_text}

Produce a structured post-call analysis now."""

    response = client.chat.completions.create(
        model="gpt-4o",
        temperature=0.2,
        messages=[
            {"role": "system", "content": ANALYSIS_SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
    )
    return _parse_json_response(response.choices[0].message.content)
