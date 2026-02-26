from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
from datetime import datetime

from database import get_db
from models import Client, ClientPreference, PortfolioHolding, TargetAllocation, RebalancingAnalysis
from services.rebalancing_engine import run_rebalancing_engine
from services.openai_service import generate_rebalancing_narrative

router = APIRouter()


@router.get("/{client_id}")
def get_portfolio(client_id: int, db: Session = Depends(get_db)):
    """Return holdings + targets + latest rebalancing analysis."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    holdings = (
        db.query(PortfolioHolding)
        .filter(PortfolioHolding.client_id == client_id)
        .order_by(PortfolioHolding.account_type, PortfolioHolding.asset_class)
        .all()
    )
    targets = (
        db.query(TargetAllocation)
        .filter(TargetAllocation.client_id == client_id)
        .all()
    )
    analysis = (
        db.query(RebalancingAnalysis)
        .filter(RebalancingAnalysis.client_id == client_id)
        .order_by(RebalancingAnalysis.generated_at.desc())
        .first()
    )

    def holding_to_dict(h):
        return {
            "id": h.id,
            "account_type": h.account_type,
            "asset_class": h.asset_class,
            "ticker": h.ticker,
            "name": h.name,
            "units": h.units,
            "current_price": h.current_price,
            "current_value": h.current_value,
            "as_of_date": h.as_of_date.isoformat() if h.as_of_date else None,
        }

    def target_to_dict(t):
        return {
            "id": t.id,
            "account_type": t.account_type,
            "asset_class": t.asset_class,
            "target_pct": t.target_pct,
            "drift_threshold": t.drift_threshold,
        }

    def analysis_to_dict(a):
        if not a:
            return None
        return {
            "id": a.id,
            "generated_at": a.generated_at.isoformat(),
            "portfolio_summary": a.portfolio_summary,
            "drift_flags": a.drift_flags,
            "ai_narrative": a.ai_narrative,
            "context_flags": a.context_flags,
            "overall_urgency": a.overall_urgency,
            "no_action_needed": a.no_action_needed,
            "last_rebalanced": a.last_rebalanced.isoformat() if a.last_rebalanced else None,
        }

    return {
        "client_id": client_id,
        "holdings": [holding_to_dict(h) for h in holdings],
        "targets": [target_to_dict(t) for t in targets],
        "analysis": analysis_to_dict(analysis),
    }


@router.post("/{client_id}/analyze")
def analyze_portfolio(client_id: int, db: Session = Depends(get_db)):
    """Run the rebalancing engine + generate GPT-4o narrative, save result."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    holdings = (
        db.query(PortfolioHolding)
        .filter(PortfolioHolding.client_id == client_id)
        .all()
    )
    targets = (
        db.query(TargetAllocation)
        .filter(TargetAllocation.client_id == client_id)
        .all()
    )
    preferences = (
        db.query(ClientPreference)
        .filter(ClientPreference.client_id == client_id)
        .all()
    )

    if not holdings:
        raise HTTPException(status_code=422, detail="No holdings found for this client.")

    # Step 1: Pure Python engine (deterministic, no AI)
    engine_output = run_rebalancing_engine(holdings, targets)

    if "error" in engine_output and engine_output.get("total_portfolio_value", 0) == 0:
        raise HTTPException(status_code=422, detail=engine_output["error"])

    # Step 2: GPT-4o contextual interpretation
    ai_result = generate_rebalancing_narrative(client, preferences, engine_output)

    # Step 3: Persist
    analysis = RebalancingAnalysis(
        client_id=client_id,
        portfolio_summary=json.dumps(engine_output),
        drift_flags=json.dumps(engine_output.get("flagged_items", [])),
        ai_narrative=ai_result.get("narrative", ""),
        context_flags=json.dumps(ai_result.get("context_flags", [])),
        overall_urgency=ai_result.get("overall_urgency", "low"),
        no_action_needed=ai_result.get("no_action_needed", False),
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    return {
        "id": analysis.id,
        "generated_at": analysis.generated_at.isoformat(),
        "portfolio_summary": analysis.portfolio_summary,
        "drift_flags": analysis.drift_flags,
        "ai_narrative": analysis.ai_narrative,
        "context_flags": analysis.context_flags,
        "overall_urgency": analysis.overall_urgency,
        "no_action_needed": analysis.no_action_needed,
        "last_rebalanced": None,
    }


@router.post("/{client_id}/holdings")
def upsert_holdings(client_id: int, holdings: list, db: Session = Depends(get_db)):
    """Bulk replace holdings for a client (replaces all existing)."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    db.query(PortfolioHolding).filter(PortfolioHolding.client_id == client_id).delete()
    for h in holdings:
        holding = PortfolioHolding(client_id=client_id, **h)
        db.add(holding)
    db.commit()
    return {"status": "ok", "count": len(holdings)}


@router.put("/{client_id}/targets")
def update_targets(client_id: int, targets: list, db: Session = Depends(get_db)):
    """Replace all target allocations for a client."""
    client = db.query(Client).filter(Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    db.query(TargetAllocation).filter(TargetAllocation.client_id == client_id).delete()
    for t in targets:
        target = TargetAllocation(client_id=client_id, **t)
        db.add(target)
    db.commit()
    return {"status": "ok", "count": len(targets)}


@router.get("/{client_id}/history")
def get_history(client_id: int, db: Session = Depends(get_db)):
    """List all past rebalancing analyses for a client."""
    analyses = (
        db.query(RebalancingAnalysis)
        .filter(RebalancingAnalysis.client_id == client_id)
        .order_by(RebalancingAnalysis.generated_at.desc())
        .all()
    )
    return [
        {
            "id": a.id,
            "generated_at": a.generated_at.isoformat(),
            "overall_urgency": a.overall_urgency,
            "no_action_needed": a.no_action_needed,
            "drift_score": json.loads(a.portfolio_summary or "{}").get("drift_score", 0),
        }
        for a in analyses
    ]
