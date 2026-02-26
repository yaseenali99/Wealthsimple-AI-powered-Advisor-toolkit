import json
from sqlalchemy.orm import Session
from models import ClientPreference, Meeting, PostCallAnalysis, Transcript, RebalancingAnalysis


def build_brief_context(client, meeting, db: Session):
    """Assemble all context needed for the pre-meeting brief prompt."""

    # ── Preferences ────────────────────────────────────────────────────────────
    preferences = (
        db.query(ClientPreference)
        .filter(ClientPreference.client_id == client.id)
        .order_by(ClientPreference.created_at.desc())
        .all()
    )
    pref_lines = [f"[{p.category.upper()}] {p.preference}" for p in preferences]
    formatted_prefs = "\n".join(pref_lines) if pref_lines else "No preferences recorded yet."

    # ── Last meeting analysis ──────────────────────────────────────────────────
    last_analysis = (
        db.query(PostCallAnalysis)
        .join(Transcript, PostCallAnalysis.transcript_id == Transcript.id)
        .join(Meeting, Transcript.meeting_id == Meeting.id)
        .filter(Meeting.client_id == client.id, Meeting.status == "completed")
        .order_by(Meeting.scheduled_at.desc())
        .first()
    )

    last_summary = "No previous meetings on record."
    open_action_items = "None"
    if last_analysis:
        last_summary = last_analysis.summary or "Summary not available."
        try:
            items = json.loads(last_analysis.action_items or "[]")
            if items:
                lines = []
                for item in items:
                    if isinstance(item, dict):
                        owner = item.get("owner", "")
                        due = item.get("due", "")
                        text = item.get("item", "")
                        lines.append(
                            f"- [{owner.upper()}] {text}"
                            + (f" (due: {due})" if due else "")
                        )
                    else:
                        lines.append(f"- {item}")
                open_action_items = "\n".join(lines)
        except (json.JSONDecodeError, TypeError):
            open_action_items = last_analysis.action_items or "None"

    # ── Portfolio rebalancing context (optional) ───────────────────────────────
    portfolio_section = ""
    latest_rebalancing = (
        db.query(RebalancingAnalysis)
        .filter(RebalancingAnalysis.client_id == client.id)
        .order_by(RebalancingAnalysis.generated_at.desc())
        .first()
    )

    if latest_rebalancing:
        try:
            summary_data = json.loads(latest_rebalancing.portfolio_summary or "{}")
            drift_score = summary_data.get("drift_score", 0)
        except (json.JSONDecodeError, TypeError):
            drift_score = 0

        overall_urgency = latest_rebalancing.overall_urgency or "low"

        try:
            context_flags = json.loads(latest_rebalancing.context_flags or "[]")
            flag_lines = []
            for cf in context_flags[:3]:  # top 3 only
                flag_lines.append(
                    f"  - {cf.get('flag', '')}: {cf.get('context', '')}"
                )
            flags_str = "\n".join(flag_lines) if flag_lines else "  None"
        except (json.JSONDecodeError, TypeError):
            flags_str = "  Portfolio analysis data unavailable."

        portfolio_section = f"""
PORTFOLIO REBALANCING SUMMARY:
Drift Score: {drift_score}/100
Overall Urgency: {overall_urgency}

Portfolio Context Flags (for brief integration):
{flags_str}

Note: Incorporate the most relevant portfolio flags into the brief's portfolio_flags section,
framed in the context of this client's goals and upcoming meeting. Include 0-3 items max.
Only include flags that are meaningfully connected to the client's life context."""

    # ── Format fields ──────────────────────────────────────────────────────────
    portfolio_str = f"${client.portfolio_value:,.0f}" if client.portfolio_value else "Not specified"
    accounts_str = client.accounts or "[]"
    try:
        accounts_list = json.loads(accounts_str)
        accounts_display = ", ".join(accounts_list)
    except (json.JSONDecodeError, TypeError):
        accounts_display = accounts_str

    meeting_date = meeting.scheduled_at.strftime("%B %d, %Y") if meeting.scheduled_at else "TBD"
    meeting_type_display = meeting.meeting_type.replace("_", " ").title()

    user_prompt = f"""Generate a pre-meeting brief for the following client.

CLIENT PROFILE:
Name: {client.name}
Age: {client.age or "Not specified"}
Occupation: {client.occupation or "Not specified"}
Risk Profile: {client.risk_profile or "Not specified"}
Accounts: {accounts_display}
Portfolio Value: {portfolio_str}

KNOWN PREFERENCES & LIFE CONTEXT:
{formatted_prefs}

LAST MEETING SUMMARY:
{last_summary}

OPEN ACTION ITEMS FROM LAST MEETING:
{open_action_items}

UPCOMING MEETING:
Type: {meeting_type_display}
Date: {meeting_date}
{portfolio_section}
Generate the pre-meeting brief now."""

    return user_prompt, user_prompt
