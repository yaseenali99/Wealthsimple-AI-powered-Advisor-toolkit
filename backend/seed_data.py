"""
Populates the database with realistic synthetic demo data.
Run: python seed_data.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

import json
from datetime import datetime, timedelta, date
from database import engine, SessionLocal, Base
from models import (
    Client, ClientPreference, Meeting, PostCallAnalysis, Transcript,
    PortfolioHolding, TargetAllocation, RebalancingAnalysis, Brief,
)
from services.rebalancing_engine import run_rebalancing_engine

Base.metadata.create_all(bind=engine)

# ── Reference dates ──────────────────────────────────────────────────────────
NOW = datetime(2026, 2, 24, 12, 0, 0)


def d(days_offset: int) -> datetime:
    return NOW + timedelta(days=days_offset)


# ── Sample transcript text ────────────────────────────────────────────────────
DANIEL_TRANSCRIPT = """Advisor: Hi Daniel, good to connect again. It's been about two months since we last spoke. How have things been?

Daniel: Hey, yeah — things have been really good actually! I have some updates for you. So remember last time we talked about the home purchase timeline being around two years out? I've been doing more research and I want to move that up. I'm now thinking about 18 months, not 24.

Advisor: That's a meaningful shift. What's driving that for you?

Daniel: A couple of things. I got a promotion — I'm now a Senior Software Engineer — so my salary jumped to $145,000 a year. That's a pretty big increase. And I've been watching the housing market and I feel like I can't wait too long or prices are just going to keep climbing. It's honestly kind of stressful. Like I feel this pressure to move faster.

Advisor: I hear that. The housing market uncertainty is something a lot of our clients are grappling with right now. You're not alone in that feeling. What areas are you considering?

Daniel: Probably somewhere in the east end of Toronto. I'm thinking a max budget of around $700,000 to $750,000. I want to be realistic about what I can afford without overextending myself.

Advisor: That's a thoughtful approach. Let's talk about your accounts, because with this updated timeline we should revisit how you're positioning your savings. You've got your TFSA, RRSP, and the FHSA you opened last year.

Daniel: Yeah, and that's exactly what I wanted to ask you about. What should I prioritize for the down payment? FHSA or TFSA? I'm honestly confused about which makes more sense. Like, which one is better for a first home purchase?

Advisor: That's a great question and it's one I want to make sure I give you a thorough answer on rather than a quick one here. The short version is that both have meaningful advantages for first-time home buyers — but there are important differences in the deduction, contribution room, investment options, and what happens if your plans change. I'd rather put together a clear comparison document and send it to you after this call. Would that work?

Daniel: Yeah that would actually be super helpful. Like a breakdown I can actually read through?

Advisor: Exactly — a clear side-by-side comparison of FHSA versus TFSA for first home purchases, covering contribution room, tax treatment, investment flexibility, and what happens if you don't end up buying. I'll include the RRSP Home Buyers' Plan in there too so you have the full picture. I'll have it to you by end of this week.

Daniel: Perfect. That's exactly what I need. And the RRSP — should I still be contributing to that in the meantime?

Advisor: The RRSP is still very valuable given your income level — the deduction is quite meaningful at $145K. But we want to make sure we're sequencing things in the right order. The comparison document will cover that sequencing question directly.

Daniel: Okay good. And with the raise — I want to start putting away a lot more each month. I was doing $500 a month before, but I feel like I should be doing way more now. What's realistic?

Advisor: That's a great instinct. With your increased income, you have significantly more capacity. What does your monthly expense picture look like right now?

Daniel: My rent is $1,900, I don't have a car payment, and my general spending is pretty modest. I think I could realistically put away an extra $1,500 to $2,000 a month, maybe even a bit more if I'm disciplined.

Advisor: That's a strong savings capacity at your age. We should make sure we're allocating that across your accounts in the most tax-efficient way — and also making sure the investments inside those accounts match your timeline. The portion earmarked for the home purchase in 18 months should be positioned conservatively, while your longer-term RRSP and other savings can continue in your growth-oriented strategy.

Daniel: That makes total sense. Split by purpose, basically.

Advisor: Exactly. One more thing I wanted to revisit — you mentioned ESG investing last time and it sounds like you're still interested?

Daniel: Yeah, I keep thinking about it. I care about where my money is going. I'm not trying to go full activist investor or anything, but if there are options that align with my values without sacrificing returns, I'd like to explore that.

Advisor: Absolutely — there are ESG-screened options available within Wealthsimple's platform and I'm happy to walk you through them. For your longer-term holdings, incorporating some ESG exposure is very doable within your growth strategy.

Daniel: Great. I think that covers everything I had. My main stresses right now are just — housing market timing feels unpredictable, and I want to make sure I'm making smart moves with this extra income and not wasting the opportunity.

Advisor: Those are completely valid things to be thinking about. You're asking exactly the right questions. Let's get you that FHSA versus TFSA comparison by Friday, and then we'll schedule a follow-up in about 6 to 8 weeks to review your updated contribution strategy and make sure everything is properly allocated.

Daniel: That sounds great. Really appreciate it.

Advisor: Of course. Talk soon, Daniel.
"""


AS_OF = date(2026, 2, 24)


def h(client_id, account, asset_class, ticker, name, units, price, db):
    """Helper to create and add a PortfolioHolding."""
    db.add(PortfolioHolding(
        client_id=client_id,
        account_type=account,
        asset_class=asset_class,
        ticker=ticker,
        name=name,
        units=units,
        current_price=price,
        current_value=round(units * price, 2),
        as_of_date=AS_OF,
    ))


def t(client_id, asset_class, target_pct, threshold=0.05, db_obj=None):
    """Helper to create and add a TargetAllocation (overall portfolio, account_type=None)."""
    db_obj.add(TargetAllocation(
        client_id=client_id,
        account_type=None,
        asset_class=asset_class,
        target_pct=target_pct,
        drift_threshold=threshold,
    ))


def clear_data(db):
    db.query(PostCallAnalysis).delete()
    db.query(Transcript).delete()
    db.query(Brief).delete()
    db.query(RebalancingAnalysis).delete()
    db.query(TargetAllocation).delete()
    db.query(PortfolioHolding).delete()
    db.query(ClientPreference).delete()
    db.query(Meeting).delete()
    db.query(Client).delete()
    db.commit()


def seed():
    db = SessionLocal()
    clear_data(db)

    # ── Client 1: Margaret Chen ───────────────────────────────────────────────
    margaret = Client(
        name="Margaret Chen",
        email="margaret.chen@email.com",
        age=58,
        occupation="Retired Teacher",
        risk_profile="conservative",
        accounts=json.dumps(["RRSP", "TFSA", "Non-Registered"]),
        portfolio_value=820000.0,
    )
    db.add(margaret)
    db.flush()

    for cat, pref in [
        ("life_goal", "Wants income stability in retirement"),
        ("concern", "Concerned about inflation eroding purchasing power over time"),
        ("life_goal", "Daughter starting university next year — wants to ensure funds are available"),
        ("constraint", "Prefers morning meetings — not available after noon"),
    ]:
        db.add(ClientPreference(client_id=margaret.id, category=cat, preference=pref, source="manual"))

    m1_margaret = Meeting(client_id=margaret.id, scheduled_at=d(-300), meeting_type="onboarding", status="completed")
    m2_margaret = Meeting(client_id=margaret.id, scheduled_at=d(-180), meeting_type="quarterly_review", status="completed")
    m3_margaret = Meeting(client_id=margaret.id, scheduled_at=d(-90), meeting_type="quarterly_review", status="completed",
                          advisor_notes="Client concerned about GIC rates. Discussed laddering strategy.")
    m4_margaret = Meeting(client_id=margaret.id, scheduled_at=d(14), meeting_type="quarterly_review", status="upcoming")
    db.add_all([m1_margaret, m2_margaret, m3_margaret, m4_margaret])
    db.flush()

    t3_margaret = Transcript(
        client_id=margaret.id,
        meeting_id=m3_margaret.id,
        raw_text="Advisor discussed the current GIC ladder strategy. Margaret expressed concern about the recent CPI numbers and whether her portfolio can keep pace with inflation. She mentioned her daughter is applying to U of T next fall and asked about RESP contributions. Advisor noted the RESP was already set up. Action item: Review GIC ladder options and send summary.",
        processed=True,
    )
    db.add(t3_margaret)
    db.flush()

    db.add(PostCallAnalysis(
        transcript_id=t3_margaret.id,
        client_id=margaret.id,
        meeting_id=m3_margaret.id,
        summary="Margaret and her advisor discussed inflation concerns and their impact on her conservative portfolio. The upcoming GIC maturity dates were reviewed. Margaret mentioned her daughter starting university next fall and confirmed her RESP is already in place.",
        decisions_made=json.dumps([
            "Continue with current GIC ladder approach pending full review",
            "No immediate allocation changes — monitor inflation trajectory",
        ]),
        action_items=json.dumps([
            {"item": "Review GIC ladder options and send summary", "owner": "advisor", "due": "2025-12-15"},
        ]),
        extracted_preferences=json.dumps([
            {"category": "concern", "preference": "Worried that fixed-income returns may not keep pace with inflation long-term"},
            {"category": "life_goal", "preference": "Daughter starting university next fall — education costs are top of mind"},
        ]),
        flags=json.dumps([
            "Client expressed heightened concern about inflation — may warrant a portfolio review conversation",
        ]),
    ))

    # ── Client 2: Daniel Osei ─────────────────────────────────────────────────
    daniel = Client(
        name="Daniel Osei",
        email="daniel.osei@email.com",
        age=34,
        occupation="Software Engineer",
        risk_profile="growth",
        accounts=json.dumps(["TFSA", "RRSP", "FHSA"]),
        portfolio_value=145000.0,
    )
    db.add(daniel)
    db.flush()

    for cat, pref in [
        ("life_goal", "Wants to buy a home in the next 2 years — east end of Toronto"),
        ("interest", "Interested in ESG investing — wants values-aligned options without sacrificing returns"),
        ("life_goal", "Has FHSA room to maximize — wants to understand FHSA vs RRSP vs TFSA sequencing"),
        ("constraint", "Prefers automated solutions — doesn't want to actively manage decisions week to week"),
    ]:
        db.add(ClientPreference(client_id=daniel.id, category=cat, preference=pref, source="manual"))

    m1_daniel = Meeting(client_id=daniel.id, scheduled_at=d(-60), meeting_type="quarterly_review", status="completed",
                        advisor_notes="Discussed home purchase goals and account structure. Daniel wants FHSA clarity.")
    m2_daniel = Meeting(client_id=daniel.id, scheduled_at=d(2), meeting_type="quarterly_review", status="upcoming")
    db.add_all([m1_daniel, m2_daniel])
    db.flush()

    t1_daniel = Transcript(
        client_id=daniel.id,
        meeting_id=m1_daniel.id,
        raw_text="Initial discussion about Daniel's goals. He mentioned wanting to buy a home in about 2 years, interest in ESG, and wanting to maximize his FHSA. Advisor noted his TFSA is currently invested in a growth ETF portfolio. Action item: Send comparison of FHSA vs RRSP for first home purchase.",
        processed=True,
    )
    db.add(t1_daniel)
    db.flush()

    db.add(PostCallAnalysis(
        transcript_id=t1_daniel.id,
        client_id=daniel.id,
        meeting_id=m1_daniel.id,
        summary="Daniel and his advisor discussed his two-year home purchase goal and how to optimize his account structure toward that. His interest in ESG investing was confirmed. The FHSA vs RRSP question was flagged as needing a detailed follow-up.",
        decisions_made=json.dumps([
            "Continue current TFSA growth ETF allocation",
            "No immediate FHSA contribution changes pending comparison document",
        ]),
        action_items=json.dumps([
            {"item": "Send comparison of FHSA vs RRSP for first home purchase", "owner": "advisor", "due": "2025-12-31"},
        ]),
        extracted_preferences=json.dumps([
            {"category": "life_goal", "preference": "Wants to buy a home within 2 years"},
            {"category": "interest", "preference": "Interested in ESG investing options"},
        ]),
        flags=json.dumps([]),
    ))

    # ── Client 3: Priya Sharma ────────────────────────────────────────────────
    priya = Client(
        name="Priya Sharma",
        email="priya.sharma@email.com",
        age=42,
        occupation="Physician",
        risk_profile="balanced",
        accounts=json.dumps(["RRSP", "TFSA", "Corporate Account"]),
        portfolio_value=1200000.0,
    )
    db.add(priya)
    db.flush()

    for cat, pref in [
        ("life_goal", "Planning to open a medical clinic in 3 years — needs capital planning"),
        ("constraint", "Wants to minimize personal tax — income is high and variable"),
        ("interest", "Interested in setting up RESP for two young children"),
        ("concern", "Skeptical of cryptocurrency — does not want exposure"),
    ]:
        db.add(ClientPreference(client_id=priya.id, category=cat, preference=pref, source="manual"))

    m1_priya = Meeting(client_id=priya.id, scheduled_at=d(-365), meeting_type="onboarding", status="completed")
    m2_priya = Meeting(client_id=priya.id, scheduled_at=d(-270), meeting_type="quarterly_review", status="completed")
    m3_priya = Meeting(client_id=priya.id, scheduled_at=d(-180), meeting_type="quarterly_review", status="completed")
    m4_priya = Meeting(client_id=priya.id, scheduled_at=d(-60), meeting_type="quarterly_review", status="completed",
                       advisor_notes="Priya mentioned feeling overwhelmed by the complexity of the corporate account structure. Wants simplification.")
    m5_priya = Meeting(client_id=priya.id, scheduled_at=d(20), meeting_type="quarterly_review", status="upcoming")
    db.add_all([m1_priya, m2_priya, m3_priya, m4_priya, m5_priya])
    db.flush()

    t4_priya = Transcript(
        client_id=priya.id,
        meeting_id=m4_priya.id,
        raw_text="Priya mentioned she's been feeling overwhelmed by the complexity of managing both her personal and corporate investment accounts. She wants a simpler view of her overall financial picture. Discussed RESP contributions for her two children. She reiterated no interest in crypto exposure. Clinic planning still 3 years out.",
        processed=True,
    )
    db.add(t4_priya)
    db.flush()

    db.add(PostCallAnalysis(
        transcript_id=t4_priya.id,
        client_id=priya.id,
        meeting_id=m4_priya.id,
        summary="Priya expressed feeling overwhelmed by the complexity of managing her corporate and personal accounts simultaneously. RESP setup for her children was discussed. She confirmed no interest in crypto. Clinic timeline remains at 3 years.",
        decisions_made=json.dumps([
            "RESP accounts to be set up for both children before next meeting",
            "Advisor to prepare a simplified one-page view of Priya's full financial picture",
        ]),
        action_items=json.dumps([
            {"item": "Prepare simplified financial overview across personal and corporate accounts", "owner": "advisor", "due": "2026-01-31"},
            {"item": "Initiate RESP account setup for both children", "owner": "advisor", "due": "2026-02-15"},
        ]),
        extracted_preferences=json.dumps([
            {"category": "concern", "preference": "Feels overwhelmed by complexity of corporate account structure — wants simplification"},
        ]),
        flags=json.dumps([
            "Client expressed feeling overwhelmed by complexity — consider simplifying the advice and reporting approach",
        ]),
    ))

    # ── Client 4: James Whitfield ─────────────────────────────────────────────
    james = Client(
        name="James Whitfield",
        email="james.whitfield@email.com",
        age=67,
        occupation="Retired Executive",
        risk_profile="conservative",
        accounts=json.dumps(["RRIF", "TFSA", "Non-Registered"]),
        portfolio_value=2400000.0,
    )
    db.add(james)
    db.flush()

    for cat, pref in [
        ("life_goal", "Focused on estate planning and structured wealth transfer to his children"),
        ("concern", "Wants to minimize tax impact of RRIF minimum withdrawals"),
        ("interest", "Has philanthropic interests — mentioned Sick Kids Foundation as a cause he supports"),
        ("constraint", "Strongly prefers in-person meetings — not comfortable with video calls"),
    ]:
        db.add(ClientPreference(client_id=james.id, category=cat, preference=pref, source="manual"))

    m1_james = Meeting(client_id=james.id, scheduled_at=d(-450), meeting_type="onboarding", status="completed")
    m2_james = Meeting(client_id=james.id, scheduled_at=d(-360), meeting_type="quarterly_review", status="completed")
    m3_james = Meeting(client_id=james.id, scheduled_at=d(-270), meeting_type="quarterly_review", status="completed")
    m4_james = Meeting(client_id=james.id, scheduled_at=d(-180), meeting_type="quarterly_review", status="completed")
    m5_james = Meeting(client_id=james.id, scheduled_at=d(-30), meeting_type="quarterly_review", status="completed",
                       advisor_notes="Estate planning discussion. James wants to begin gifting to children. Flagged estate specialist referral.")
    m6_james = Meeting(client_id=james.id, scheduled_at=d(35), meeting_type="ad_hoc", status="upcoming")
    db.add_all([m1_james, m2_james, m3_james, m4_james, m5_james, m6_james])
    db.flush()

    t5_james = Transcript(
        client_id=james.id,
        meeting_id=m5_james.id,
        raw_text="James and his advisor discussed RRIF withdrawal strategy and tax optimization. James expressed interest in charitable giving through a donor-advised fund, specifically mentioning Sick Kids. He asked about gifts to his children during his lifetime versus via the estate. Advisor suggested introducing an estate planning specialist. James agreed and asked for an introduction before the next quarter.",
        processed=True,
    )
    db.add(t5_james)
    db.flush()

    db.add(PostCallAnalysis(
        transcript_id=t5_james.id,
        client_id=james.id,
        meeting_id=m5_james.id,
        summary="James and his advisor discussed RRIF withdrawal optimization and lifetime gifting to his children. He expressed interest in a donor-advised fund for his philanthropic goals, specifically mentioning Sick Kids Foundation. An estate planning specialist introduction was agreed upon.",
        decisions_made=json.dumps([
            "Proceed with donor-advised fund exploration for Sick Kids charitable giving",
            "Estate planning specialist to be introduced before next quarter",
        ]),
        action_items=json.dumps([
            {"item": "Introduce estate planning specialist before next quarter", "owner": "advisor", "due": "2026-03-15"},
            {"item": "Prepare donor-advised fund options overview", "owner": "advisor", "due": "2026-03-01"},
        ]),
        extracted_preferences=json.dumps([
            {"category": "life_goal", "preference": "Interested in donor-advised fund for charitable giving to Sick Kids Foundation"},
            {"category": "life_goal", "preference": "Considering lifetime gifting to children rather than waiting for estate"},
        ]),
        flags=json.dumps([]),
    ))

    # ── Client 5: Sofia Reyes ─────────────────────────────────────────────────
    sofia = Client(
        name="Sofia Reyes",
        email="sofia.reyes@email.com",
        age=29,
        occupation="Marketing Manager",
        risk_profile="aggressive",
        accounts=json.dumps(["TFSA", "RRSP"]),
        portfolio_value=38000.0,
    )
    db.add(sofia)
    db.flush()

    for cat, pref in [
        ("life_goal", "FIRE-focused — wants to retire by age 45"),
        ("interest", "Follows personal finance content closely — familiar with index investing concepts"),
        ("life_goal", "Recently promoted — income increased significantly, wants to invest more aggressively"),
        ("constraint", "Wants a low-maintenance approach — prefers passive index strategy over active management"),
    ]:
        db.add(ClientPreference(client_id=sofia.id, category=cat, preference=pref, source="manual"))

    m1_sofia = Meeting(client_id=sofia.id, scheduled_at=d(-90), meeting_type="onboarding", status="completed",
                       advisor_notes="Onboarding meeting. Sofia is very knowledgeable for her age. FIRE goal discussed. Set up TFSA with XEQT.")
    m2_sofia = Meeting(client_id=sofia.id, scheduled_at=d(18), meeting_type="quarterly_review", status="upcoming")
    db.add_all([m1_sofia, m2_sofia])
    db.flush()

    t1_sofia = Transcript(
        client_id=sofia.id,
        meeting_id=m1_sofia.id,
        raw_text="Onboarding call with Sofia. She mentioned her FIRE goal — retiring by 45. She is familiar with index investing and specifically asked about XEQT and VEQT. She mentioned she just got a promotion and her income went up significantly. She wants to maximize contributions. Advisor set up TFSA with XEQT allocation. No RRSP contributions yet — advisor to follow up on RRSP contribution room.",
        processed=True,
    )
    db.add(t1_sofia)
    db.flush()

    db.add(PostCallAnalysis(
        transcript_id=t1_sofia.id,
        client_id=sofia.id,
        meeting_id=m1_sofia.id,
        summary="Onboarding meeting with Sofia. Her FIRE goal of retiring by 45 was confirmed. She demonstrated strong financial literacy and asked specifically about XEQT and VEQT for her TFSA. Her recent promotion and increased income were discussed as an opportunity to accelerate savings.",
        decisions_made=json.dumps([
            "TFSA invested in XEQT — 100% equity, passive index approach",
            "RRSP to be opened and contribution room reviewed",
        ]),
        action_items=json.dumps([
            {"item": "Send RRSP contribution room overview and optimal contribution schedule", "owner": "advisor", "due": "2025-12-20"},
        ]),
        extracted_preferences=json.dumps([
            {"category": "interest", "preference": "Specifically asked about XEQT and VEQT — familiar with all-equity ETFs"},
            {"category": "life_goal", "preference": "FIRE goal confirmed — wants to retire by 45 using passive index investing"},
        ]),
        flags=json.dumps([]),
    ))

    # ── Portfolio Holdings & Target Allocations ───────────────────────────────
    #
    # Drift score formula: min(100, round(sum_of_all_abs_drifts * 100))
    # Target scores: Margaret ~65 (red), Daniel ~27 (amber), James ~11 (green),
    #                Priya ~64 (red), Sofia ~88 (red)

    # ── Margaret Chen — Conservative, $820K ───────────────────────────────────
    # Target: Bond 40%, CA Equity 20%, US Equity 15%, Intl Equity 10%, Cash 15%
    t(margaret.id, "canadian_bond",   0.40, 0.05, db)
    t(margaret.id, "canadian_equity", 0.20, 0.05, db)
    t(margaret.id, "us_equity",       0.15, 0.05, db)
    t(margaret.id, "intl_equity",     0.10, 0.05, db)
    t(margaret.id, "cash",            0.15, 0.05, db)

    h(margaret.id, "RRSP", "canadian_bond",   "ZAG.TO", "BMO Aggregate Bond ETF",        3200, 14.20, db)
    h(margaret.id, "RRSP", "canadian_bond",   "XBB.TO", "iShares Core Canadian Bond ETF",2100, 28.50, db)
    h(margaret.id, "RRSP", "canadian_equity", "XIC.TO", "iShares Core S&P/TSX Capped",   800,  38.60, db)
    h(margaret.id, "RRSP", "us_equity",       "VFV.TO", "Vanguard S&P 500 Index ETF",    220,  145.00, db)
    h(margaret.id, "TFSA", "canadian_equity", "XIC.TO", "iShares Core S&P/TSX Capped",   500,  38.60, db)
    h(margaret.id, "TFSA", "intl_equity",     "XEF.TO", "iShares MSCI EAFE IMI ETF",     600,  32.40, db)
    h(margaret.id, "TFSA", "cash",            "CASH",   "High Interest Savings",          1,    62000.0, db)
    h(margaret.id, "Non-Reg", "canadian_bond","ZAG.TO", "BMO Aggregate Bond ETF",         8500, 14.20, db)
    h(margaret.id, "Non-Reg", "canadian_bond","GIC",    "GIC (2yr, 4.8%)",               1,    180000.0, db)
    h(margaret.id, "Non-Reg", "cash",         "CASH",   "Cash / High Interest Savings",   1,    250000.0, db)

    # ── Daniel Osei — Growth, $145K ────────────────────────────────────────────
    # Target adjusted to reflect FHSA home purchase reserve:
    # US 35%, CA 20%, Intl 15%, Bond 0%, Cash 30% (acknowledges 18-month home purchase)
    t(daniel.id, "us_equity",       0.35, 0.05, db)
    t(daniel.id, "canadian_equity", 0.20, 0.05, db)
    t(daniel.id, "intl_equity",     0.15, 0.05, db)
    t(daniel.id, "cash",            0.30, 0.05, db)

    h(daniel.id, "TFSA", "us_equity",       "VFV.TO", "Vanguard S&P 500 Index ETF",     180,  145.00, db)
    h(daniel.id, "TFSA", "canadian_equity", "XIC.TO", "iShares Core S&P/TSX Capped",    400,  38.60, db)
    h(daniel.id, "TFSA", "cash",            "CASH",   "Cash / High Interest Savings",    1,    18000.0, db)
    h(daniel.id, "RRSP", "us_equity",       "VFV.TO", "Vanguard S&P 500 Index ETF",     200,  145.00, db)
    h(daniel.id, "RRSP", "intl_equity",     "XEF.TO", "iShares MSCI EAFE IMI ETF",      350,  32.40, db)
    h(daniel.id, "FHSA", "cash",            "CASH",   "Cash — Home Purchase Reserve",    1,    40000.0, db)
    h(daniel.id, "FHSA", "canadian_equity", "XIC.TO", "iShares Core S&P/TSX Capped",    120,  38.60, db)

    # ── Priya Sharma — Balanced, $1.2M ────────────────────────────────────────
    # Target: US 30%, CA 20%, Intl 15%, Bond 20%, Real Estate 10%, Cash 5%
    t(priya.id, "us_equity",       0.30, 0.05, db)
    t(priya.id, "canadian_equity", 0.20, 0.05, db)
    t(priya.id, "intl_equity",     0.15, 0.05, db)
    t(priya.id, "canadian_bond",   0.20, 0.05, db)
    t(priya.id, "real_estate",     0.10, 0.05, db)
    t(priya.id, "cash",            0.05, 0.05, db)

    h(priya.id, "RRSP", "canadian_bond",   "XBB.TO", "iShares Core Canadian Bond ETF",  4000, 28.50, db)
    h(priya.id, "RRSP", "us_equity",       "VFV.TO", "Vanguard S&P 500 Index ETF",      400,  145.00, db)
    h(priya.id, "RRSP", "canadian_equity", "XIC.TO", "iShares Core S&P/TSX Capped",     1200, 38.60, db)
    h(priya.id, "TFSA", "intl_equity",     "XEF.TO", "iShares MSCI EAFE IMI ETF",       900,  32.40, db)
    h(priya.id, "TFSA", "us_equity",       "VFV.TO", "Vanguard S&P 500 Index ETF",      350,  145.00, db)
    h(priya.id, "TFSA", "real_estate",     "ZRE.TO", "BMO Equal Weight REITs ETF",      800,  18.90, db)
    h(priya.id, "Corporate", "us_equity",  "QQQ",    "Invesco Nasdaq 100 ETF",          1200, 490.00, db)
    h(priya.id, "Corporate", "canadian_equity","SHOP.TO","Shopify Inc.",                 1800, 130.00, db)
    h(priya.id, "Corporate", "cash",       "CASH",   "Corporate Cash",                  1,    64650.0, db)

    # ── James Whitfield — Conservative, $2.4M ─────────────────────────────────
    # Targets reflect estate planning reality (higher cash for RRIF accumulation):
    # Bond 35%, CA Equity 10%, US Equity 8%, Intl 7%, Cash 30%, Alternative 10%
    t(james.id, "canadian_bond",   0.35, 0.05, db)
    t(james.id, "canadian_equity", 0.10, 0.05, db)
    t(james.id, "us_equity",       0.08, 0.05, db)
    t(james.id, "intl_equity",     0.07, 0.05, db)
    t(james.id, "cash",            0.30, 0.05, db)
    t(james.id, "alternative",     0.10, 0.05, db)

    h(james.id, "RRIF", "canadian_bond",   "ZAG.TO", "BMO Aggregate Bond ETF",         20000, 14.20, db)
    h(james.id, "RRIF", "canadian_bond",   "GIC",    "GIC Ladder (various maturities)", 1,     560000.0, db)
    h(james.id, "RRIF", "canadian_equity", "XIC.TO", "iShares Core S&P/TSX Capped",    5000,  38.60, db)
    h(james.id, "TFSA", "us_equity",       "VFV.TO", "Vanguard S&P 500 Index ETF",     1200,  145.00, db)
    h(james.id, "TFSA", "intl_equity",     "XEF.TO", "iShares MSCI EAFE IMI ETF",      3000,  32.40, db)
    h(james.id, "TFSA", "cash",            "CASH",   "Cash / High Interest Savings",    1,     240000.0, db)
    h(james.id, "Non-Reg", "alternative",  "XRE.TO", "iShares S&P/TSX REIT ETF",       6000,  16.40, db)
    h(james.id, "Non-Reg", "alternative",  "PRIV",   "Private Credit Fund",             1,     240000.0, db)
    h(james.id, "Non-Reg", "cash",         "CASH",   "Cash",                            1,     513400.0, db)

    # ── Sofia Reyes — Aggressive, $38K ────────────────────────────────────────
    # Target: US 50%, CA 30%, Intl 15%, Cash 5%
    t(sofia.id, "us_equity",       0.50, 0.05, db)
    t(sofia.id, "canadian_equity", 0.30, 0.05, db)
    t(sofia.id, "intl_equity",     0.15, 0.05, db)
    t(sofia.id, "cash",            0.05, 0.05, db)

    h(sofia.id, "TFSA", "us_equity",       "VFV.TO", "Vanguard S&P 500 Index ETF",     80,   145.00, db)
    h(sofia.id, "TFSA", "canadian_equity", "XIC.TO", "iShares Core S&P/TSX Capped",    200,  38.60, db)
    h(sofia.id, "TFSA", "cash",            "CASH",   "Cash / High Interest Savings",    1,    5000.0, db)
    h(sofia.id, "RRSP", "cash",            "CASH",   "Cash (new contributions)",        1,    13680.0, db)

    db.commit()

    # ── Pre-run the rebalancing engine for all clients ─────────────────────────
    # This seeds drift scores so dashboard dots and portfolio snapshots show
    # immediately without needing to click "Run Analysis" first.
    # AI narratives are NOT generated here (requires API call) — click "Run Analysis"
    # on the portfolio page to get GPT-4o context flags.
    print("  Running rebalancing engine for all clients...")
    for client_obj in [margaret, daniel, priya, james, sofia]:
        db.refresh(client_obj)
        holdings = db.query(PortfolioHolding).filter(
            PortfolioHolding.client_id == client_obj.id
        ).all()
        targets = db.query(TargetAllocation).filter(
            TargetAllocation.client_id == client_obj.id
        ).all()
        engine_out = run_rebalancing_engine(holdings, targets)
        score = engine_out.get("drift_score", 0)
        urgency = "high" if score > 40 else ("medium" if score > 20 else "low")

        analysis = RebalancingAnalysis(
            client_id=client_obj.id,
            portfolio_summary=json.dumps(engine_out),
            drift_flags=json.dumps(engine_out.get("flagged_items", [])),
            ai_narrative=(
                "Click 'Run Analysis' to generate a context-aware AI narrative "
                "interpreting this portfolio drift through the client's life goals and preferences."
            ),
            context_flags=json.dumps([]),
            overall_urgency=urgency,
            no_action_needed=(score <= 20),
        )
        db.add(analysis)
        color = "🔴" if score > 40 else ("🟡" if score > 20 else "🟢")
        print(f"    {client_obj.name}: drift score {score} {color} ({urgency} urgency)")

    db.commit()
    print("✓ Seed data created successfully.")
    print(f"  Clients: Margaret Chen, Daniel Osei, Priya Sharma, James Whitfield, Sofia Reyes")
    print(f"  Upcoming meeting for Daniel Osei in 2 days — will show 'Meeting Soon' badge")
    print(f"  Portfolio holdings and target allocations seeded for all 5 clients")
    print(f"  Expected drift scores: Margaret ~65 (red), Daniel ~27 (amber), James ~11 (green), Priya ~64 (red), Sofia ~88 (red)")
    db.close()


if __name__ == "__main__":
    seed()
