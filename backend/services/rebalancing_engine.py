"""
Pure Python rebalancing engine — no AI involved.
Computes portfolio drift deterministically from holdings and target allocations.
"""
from typing import List, Dict, Any
from datetime import date

ASSET_CLASS_DISPLAY = {
    "canadian_equity": "Canadian Equity",
    "us_equity":       "US Equity",
    "intl_equity":     "International Equity",
    "canadian_bond":   "Canadian Bond",
    "global_bond":     "Global Bond",
    "cash":            "Cash",
    "real_estate":     "Real Estate",
    "alternative":     "Alternative",
}

ASSET_CLASS_ORDER = [
    "us_equity", "canadian_equity", "intl_equity",
    "canadian_bond", "global_bond", "real_estate", "alternative", "cash",
]


def run_rebalancing_engine(holdings: list, targets: list) -> Dict[str, Any]:
    """
    Inputs:
        holdings: list of PortfolioHolding ORM objects
        targets:  list of TargetAllocation ORM objects (account_type=None means overall)

    Returns:
        Engine output dict matching the spec schema.
    """
    if not holdings:
        return {
            "total_portfolio_value": 0,
            "as_of_date": date.today().isoformat(),
            "drift_score": 0,
            "account_breakdown": [],
            "allocation_summary": [],
            "flagged_items": [],
            "error": "No holdings data found for this client.",
        }

    # ── Total portfolio value ──────────────────────────────────────────────────
    total_value = sum(h.current_value for h in holdings)
    if total_value == 0:
        return {"error": "Total portfolio value is zero.", "total_portfolio_value": 0}

    # ── Actual allocation by asset class ──────────────────────────────────────
    actual_by_class: Dict[str, float] = {}
    for h in holdings:
        cls = h.asset_class or "cash"
        actual_by_class[cls] = actual_by_class.get(cls, 0.0) + h.current_value

    actual_pct: Dict[str, float] = {
        cls: val / total_value for cls, val in actual_by_class.items()
    }

    # ── Target map (overall targets only — account_type IS NULL) ──────────────
    overall_targets = [t for t in targets if t.account_type is None]
    target_pct: Dict[str, float] = {t.asset_class: t.target_pct for t in overall_targets}
    threshold_map: Dict[str, float] = {
        t.asset_class: t.drift_threshold for t in overall_targets
    }

    # ── All unique asset classes ───────────────────────────────────────────────
    all_classes = set(list(actual_pct.keys()) + list(target_pct.keys()))

    # Sort by canonical order, then alphabetically for any unknown classes
    def sort_key(cls):
        try:
            return ASSET_CLASS_ORDER.index(cls)
        except ValueError:
            return len(ASSET_CLASS_ORDER)

    sorted_classes = sorted(all_classes, key=sort_key)

    # ── Build allocation summary ───────────────────────────────────────────────
    allocation_summary = []
    total_abs_drift = 0.0
    flagged_items: List[str] = []

    for cls in sorted_classes:
        actual = actual_pct.get(cls, 0.0)
        target = target_pct.get(cls, 0.0)
        drift = actual - target
        threshold = threshold_map.get(cls, 0.05)
        flagged = abs(drift) > threshold
        trade_estimate = (target - actual) * total_value

        total_abs_drift += abs(drift)

        item = {
            "asset_class": cls,
            "display_name": ASSET_CLASS_DISPLAY.get(cls, cls.replace("_", " ").title()),
            "target_pct": round(target, 4),
            "actual_pct": round(actual, 4),
            "drift_pct": round(drift, 4),
            "drift_value": round(drift * total_value, 2),
            "actual_value": round(actual * total_value, 2),
            "flagged": flagged,
            "trade_estimate": round(trade_estimate, 2),
        }
        allocation_summary.append(item)

        if flagged:
            direction = "overweight" if drift > 0 else "underweight"
            pct_str = f"{abs(drift) * 100:.1f}%"
            dollar_str = f"${abs(drift * total_value):,.0f}"
            display = ASSET_CLASS_DISPLAY.get(cls, cls.replace("_", " ").title())
            flagged_items.append(f"{display} {direction} by {pct_str} ({dollar_str})")

    # Sort allocation_summary by absolute drift descending for UI display
    allocation_summary.sort(key=lambda x: abs(x["drift_pct"]), reverse=True)

    # ── Drift score (0–100) ────────────────────────────────────────────────────
    # Sum of absolute drifts in percentage points.
    # A well-balanced portfolio: 0. A severely drifted portfolio: 60-100+.
    drift_score = min(100, round(total_abs_drift * 100))

    # ── Account breakdown ──────────────────────────────────────────────────────
    account_values: Dict[str, float] = {}
    for h in holdings:
        acct = h.account_type or "Unknown"
        account_values[acct] = account_values.get(acct, 0.0) + h.current_value

    account_breakdown = sorted(
        [
            {
                "account_type": acct,
                "value": round(val, 2),
                "pct_of_portfolio": round(val / total_value, 4),
            }
            for acct, val in account_values.items()
        ],
        key=lambda x: -x["value"],
    )

    # ── Holdings by account (for drilldown) ───────────────────────────────────
    holdings_by_account: Dict[str, list] = {}
    for h in holdings:
        acct = h.account_type or "Unknown"
        if acct not in holdings_by_account:
            holdings_by_account[acct] = []
        holdings_by_account[acct].append({
            "ticker": h.ticker or "—",
            "name": h.name or "—",
            "asset_class": h.asset_class or "—",
            "display_name": ASSET_CLASS_DISPLAY.get(h.asset_class or "", "—"),
            "current_value": round(h.current_value, 2),
            "pct_of_account": round(
                h.current_value / account_values.get(h.account_type or "Unknown", 1), 4
            ),
        })

    # ── as_of_date ─────────────────────────────────────────────────────────────
    dates = [h.as_of_date for h in holdings if h.as_of_date]
    as_of_date = max(dates).isoformat() if dates else date.today().isoformat()

    return {
        "total_portfolio_value": round(total_value, 2),
        "as_of_date": as_of_date,
        "drift_score": drift_score,
        "account_breakdown": account_breakdown,
        "holdings_by_account": holdings_by_account,
        "allocation_summary": allocation_summary,
        "flagged_items": flagged_items,
    }
