"""
ai_service.py
Multi-agent AI insight generation pipeline using GPT-4o function calling.
Agents: Analyst → Forecaster (parallel) → Advisor (parallel) → Orchestrator
"""

import asyncio
import json
import math
import random
import uuid
from datetime import datetime, timedelta, date
from typing import Any, Optional

import asyncpg
from groq import AsyncGroq
import logging
from tenacity import retry, stop_after_attempt, wait_exponential
from pydantic import BaseModel, Field, model_validator

logger = logging.getLogger(__name__)

from core.config import settings

# ---------------------------------------------------------------------------
# Pydantic Models
# ---------------------------------------------------------------------------

class AnomalyItem(BaseModel):
    month: str
    expected_kwh: float
    actual_kwh: float
    deviation_pct: float
    explanation: str

class AnalystReport(BaseModel):
    home_id: str
    target_month: str
    avg_monthly_kwh: float
    current_month_kwh: float
    peer_percentile: float            # 0–100, lower = greener
    anomalies: list[AnomalyItem]
    appliance_waste_scores: list[dict]  # {appliance_name, waste_score, rated_watts, usage_hours}
    bills_history: list[dict]
    context_bundle: dict

class Forecast(BaseModel):
    next_month_kwh: float
    next_month_bill_inr: float
    confidence: float = Field(ge=0, le=1)
    range_low: float
    range_high: float
    key_factors: list[str]
    reasoning: str

class Recommendation(BaseModel):
    priority: int
    appliance_name: str
    action: str
    effort: str                       # easy | medium | hard
    annual_saving_inr: float
    payback_months: Optional[int] = None
    reasoning: str

class InsightBundle(BaseModel):
    home_id: str
    target_month: str
    efficiency_grade: str             # A–F
    sustainability_score: float       # 0–100
    co2_kg: float
    peer_percentile: float
    anomalies: list[AnomalyItem]
    forecast: Forecast
    recommendations: list[Recommendation]
    generated_at: str
    expires_at: str


# ---------------------------------------------------------------------------
# OpenAI client
# ---------------------------------------------------------------------------

def _get_client() -> AsyncGroq:
    return AsyncGroq(api_key=settings.GROQ_API_KEY)

SYSTEM_PROMPT = (
    "You are an expert energy analyst AI. You have access to a household's complete energy "
    "consumption data. All monetary values in INR. All outputs must be in valid JSON matching "
    "the specified schema exactly. Every numeric claim must include a reasoning field explaining "
    "how you derived it. Never hallucinate figures — only use data provided in context."
)

MODEL = "llama3-70b-8192"

@retry(stop=stop_after_attempt(3), wait=wait_exponential(multiplier=1, min=1, max=3), reraise=True)
async def _call_openai_with_retry(**kwargs):
    client = _get_client()
    return await client.chat.completions.create(**kwargs)


# ---------------------------------------------------------------------------
# GPT function stubs (called by the Analyst agent via function calling)
# ---------------------------------------------------------------------------

def get_consumption_stats(appliance_id: str, months: int, bills: list[dict]) -> dict:
    """Compute average monthly kWh for an appliance from bill history."""
    if not bills:
        return {"avg_monthly_kwh": 0.0, "trend": "stable"}
    kwh_vals = [b.get("units_consumed", 0) for b in bills[-months:]]
    avg = sum(kwh_vals) / len(kwh_vals) if kwh_vals else 0
    trend = "increasing" if len(kwh_vals) >= 2 and kwh_vals[-1] > kwh_vals[0] else "stable"
    return {"avg_monthly_kwh": round(avg, 2), "trend": trend}


def compute_peer_comparison(city: str, home_type: str, monthly_kwh: float) -> dict:
    """Return a plausible peer percentile based on city + home_type baselines."""
    BASELINES = {
        ("Mumbai", "apartment"): 250, ("Mumbai", "villa"): 550,
        ("Bangalore", "apartment"): 220, ("Bangalore", "villa"): 500,
        ("Delhi", "apartment"): 300, ("Delhi", "villa"): 650,
        ("Pune", "apartment"): 230, ("Pune", "villa"): 490,
    }
    key = (city, home_type)
    baseline = BASELINES.get(key, 300)
    # Use a rough normal distribution assumption
    z = (monthly_kwh - baseline) / (baseline * 0.25)
    percentile = round(50 + 40 * math.tanh(z), 1)   # maps z → ~10–90
    return {"peer_avg_kwh": baseline, "percentile": max(1.0, min(99.0, percentile))}


def detect_anomalies(bills_history: list[dict]) -> list[dict]:
    """Flag months where usage deviated > 20% from rolling 3-month mean."""
    anomalies = []
    for i in range(3, len(bills_history)):
        window = [b["units_consumed"] for b in bills_history[i - 3:i] if b.get("units_consumed")]
        if not window:
            continue
        mean = sum(window) / len(window)
        actual = bills_history[i].get("units_consumed", 0) or 0
        dev = ((actual - mean) / mean * 100) if mean else 0
        if abs(dev) > 20:
            anomalies.append({
                "month": bills_history[i].get("billing_month", ""),
                "expected_kwh": round(mean, 2),
                "actual_kwh": round(actual, 2),
                "deviation_pct": round(dev, 1),
            })
    return anomalies


# ---------------------------------------------------------------------------
# Agent 1: ANALYST
# ---------------------------------------------------------------------------

ANALYST_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "get_consumption_stats",
            "description": "Returns average monthly kWh for an appliance.",
            "parameters": {
                "type": "object",
                "properties": {
                    "appliance_id": {"type": "string"},
                    "months": {"type": "integer", "description": "Look-back months"},
                },
                "required": ["appliance_id", "months"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "compute_peer_comparison",
            "description": "Returns peer percentile for a home.",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {"type": "string"},
                    "home_type": {"type": "string"},
                    "monthly_kwh": {"type": "number"},
                },
                "required": ["city", "home_type", "monthly_kwh"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "detect_anomalies",
            "description": "Detects months with anomalous usage.",
            "parameters": {
                "type": "object",
                "properties": {
                    "bills_history": {
                        "type": "array",
                        "items": {"type": "object"},
                    }
                },
                "required": ["bills_history"],
            },
        },
    },
]


async def run_analyst_agent(
    home_id: str,
    target_month: str,
    context_bundle: dict,
) -> AnalystReport:
    """
    Agent 1 – ANALYST: Calls GPT-4o with function calling to derive stats,
    peer comparison, and anomaly detection.  Falls back to local stubs on
    any OpenAI error.
    """
    bills = context_bundle.get("bills", [])
    home = context_bundle.get("home", {})
    appliances = context_bundle.get("appliances", [])

    # ---- Always compute locally (used as fallback and to seed GPT context) ----
    avg_monthly = (
        sum(b.get("units_consumed", 0) or 0 for b in bills) / len(bills)
        if bills else 0.0
    )
    current_kwh = avg_monthly    # approximation; could refine with usage_logs
    city = home.get("city", "Mumbai")
    home_type = home.get("home_type", "apartment")
    peer_data = compute_peer_comparison(city, home_type, avg_monthly)
    raw_anomalies = detect_anomalies(bills)

    anomalies = [
        AnomalyItem(
            month=a["month"],
            expected_kwh=a["expected_kwh"],
            actual_kwh=a["actual_kwh"],
            deviation_pct=a["deviation_pct"],
            explanation=f"Usage was {abs(a['deviation_pct']):.0f}% {'above' if a['deviation_pct'] > 0 else 'below'} the 3-month rolling average.",
        )
        for a in raw_anomalies
    ]

    waste_scores = [
        {
            "appliance_name": a.get("name", "Unknown"),
            "waste_score": round(
                (a.get("standby_watts", 0) or 0) / max(a.get("rated_watts", 1), 1) * 100, 1
            ),
            "rated_watts": a.get("rated_watts", 0),
            "usage_hours": 8,   # placeholder; no hourly logs in DB
        }
        for a in appliances
    ]
    waste_scores.sort(key=lambda x: x["waste_score"], reverse=True)

    # ---- Try GPT-4o enhanced analysis ----
    try:
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {
                "role": "user",
                "content": (
                    f"Analyse energy data for home {home_id} for {target_month}.\n"
                    f"Context:\n{json.dumps(context_bundle, default=str)[:6000]}\n\n"
                    "Use the available functions to compute peer comparison and detect anomalies, "
                    "then provide a brief analysis summary as JSON: "
                    '{"summary": str, "top_insight": str}'
                ),
            },
        ]

        # Agentic function-calling loop
        for _ in range(5):  # max 5 rounds
            response = await _call_openai_with_retry(
                model=MODEL,
                messages=messages,
                tools=ANALYST_TOOLS,
                tool_choice="auto",
            )
            msg = response.choices[0].message
            finish = response.choices[0].finish_reason

            if finish == "tool_calls" and msg.tool_calls:
                messages.append(msg)
                for tc in msg.tool_calls:
                    fn = tc.function.name
                    args = json.loads(tc.function.arguments)
                    if fn == "compute_peer_comparison":
                        result = compute_peer_comparison(**args)
                        peer_data = result   # update with GPT-guided params
                    elif fn == "detect_anomalies":
                        result = detect_anomalies(args.get("bills_history", bills))
                    else:
                        result = get_consumption_stats(
                            args.get("appliance_id", ""),
                            args.get("months", 6),
                            bills,
                        )
                    messages.append({
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": json.dumps(result),
                    })
            else:
                break  # GPT finished

    except Exception as e:
        logger.warning(f"AI generation failed for Analyst: {e}")
        # OpenAI unavailable — local stubs are already computed above
        pass

    return AnalystReport(
        home_id=home_id,
        target_month=target_month,
        avg_monthly_kwh=round(avg_monthly, 2),
        current_month_kwh=round(current_kwh, 2),
        peer_percentile=peer_data["percentile"],
        anomalies=anomalies,
        appliance_waste_scores=waste_scores,
        bills_history=bills,
        context_bundle=context_bundle,
    )


# ---------------------------------------------------------------------------
# Agent 2: FORECASTER
# ---------------------------------------------------------------------------

FORECASTER_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "Forecast",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "next_month_kwh": {"type": "number"},
                "next_month_bill_inr": {"type": "number"},
                "confidence": {"type": "number"},
                "range_low": {"type": "number"},
                "range_high": {"type": "number"},
                "key_factors": {"type": "array", "items": {"type": "string"}},
                "reasoning": {"type": "string"},
            },
            "required": [
                "next_month_kwh", "next_month_bill_inr", "confidence",
                "range_low", "range_high", "key_factors", "reasoning",
            ],
            "additionalProperties": False,
        },
    },
}


def _local_forecast(report: AnalystReport) -> Forecast:
    """Simple linear extrapolation from the last 6 months of bills."""
    bills = report.bills_history[-6:] if report.bills_history else []
    kwh_vals = [b.get("units_consumed", 0) or 0 for b in bills]
    if len(kwh_vals) >= 2:
        slope = (kwh_vals[-1] - kwh_vals[0]) / max(len(kwh_vals) - 1, 1)
        predicted = max(0, kwh_vals[-1] + slope)
    else:
        predicted = report.avg_monthly_kwh or 200.0

    # Very rough tariff: ₹8/unit all-in
    INR_PER_KWH = 8.0
    predicted_inr = predicted * INR_PER_KWH
    conf = 0.72 if len(kwh_vals) >= 4 else 0.50

    return Forecast(
        next_month_kwh=round(predicted, 2),
        next_month_bill_inr=round(predicted_inr, 2),
        confidence=conf,
        range_low=round(predicted * 0.88, 2),
        range_high=round(predicted * 1.15, 2),
        key_factors=[
            "Seasonal temperature variance",
            "Historical billing trend",
            "Appliance standby loads",
        ],
        reasoning=(
            f"Linear extrapolation over {len(kwh_vals)} months gives "
            f"{predicted:.1f} kWh. Bill estimate uses ₹{INR_PER_KWH}/unit all-in tariff."
        ),
    )


async def run_forecaster_agent(report: AnalystReport) -> Forecast:
    """Agent 2 – FORECASTER: Structured outputs via GPT-4o, with local fallback."""
    try:
        bills_summary = json.dumps(report.bills_history[-6:], default=str)[:3000]
        response = await _call_openai_with_retry(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Forecast energy consumption for next month.\n"
                        f"Last 6 months bills: {bills_summary}\n"
                        f"Average monthly kWh: {report.avg_monthly_kwh}\n"
                        f"Anomalies detected: {len(report.anomalies)}\n"
                        "Return the forecast JSON object."
                    ),
                },
            ],
            response_format=FORECASTER_SCHEMA,
        )
        raw = response.choices[0].message.content
        data = json.loads(raw)
        return Forecast(**data)
    except Exception as e:
        logger.warning(f"AI generation failed for Forecaster: {e}")
        return _local_forecast(report)


# ---------------------------------------------------------------------------
# Agent 3: ADVISOR
# ---------------------------------------------------------------------------

ADVISOR_SCHEMA = {
    "type": "json_schema",
    "json_schema": {
        "name": "RecommendationList",
        "strict": True,
        "schema": {
            "type": "object",
            "properties": {
                "recommendations": {
                    "type": "array",
                    "items": {
                        "type": "object",
                        "properties": {
                            "priority": {"type": "integer"},
                            "appliance_name": {"type": "string"},
                            "action": {"type": "string"},
                            "effort": {"type": "string"},
                            "annual_saving_inr": {"type": "number"},
                            "payback_months": {"anyOf": [{"type": "integer"}, {"type": "null"}]},
                            "reasoning": {"type": "string"},
                        },
                        "required": [
                            "priority", "appliance_name", "action",
                            "effort", "annual_saving_inr", "payback_months", "reasoning",
                        ],
                        "additionalProperties": False,
                    },
                }
            },
            "required": ["recommendations"],
            "additionalProperties": False,
        },
    },
}


def _local_advisor(report: AnalystReport) -> list[Recommendation]:
    """Rank appliances by waste score and produce template recommendations."""
    ACTIONS = {
        "hvac":          ("Set AC to 24°C instead of 18°C",           "easy",  4200, 0),
        "kitchen":       ("Replace with energy-star appliance",         "hard",  2800, 24),
        "entertainment": ("Enable auto-sleep on TV/set-top box",        "easy",  1200, None),
        "lighting":      ("Switch to LED bulbs throughout",             "easy",  1800, 18),
        "laundry":       ("Wash at 30°C, run full loads only",         "easy",  900,  None),
        "other":         ("Unplug standby devices at night",            "easy",  600,  None),
    }
    recs = []
    for i, ws in enumerate(report.appliance_waste_scores[:5], start=1):
        name = ws["appliance_name"]
        
        # Rule-based fallback: identify top consuming appliance, suggest reducing 1 hour/day
        if i == 1:
            action = f"Reduce usage by 1 hour/day"
            effort = "easy"
            saving = float((ws["rated_watts"] * 1 * 30 * 12) / 1000.0 * 8.0) # approx savings
            payback = None
        else:
            cat = "other"
            for key in ACTIONS:
                if key in name.lower():
                    cat = key
                    break
            action, effort, saving, payback = ACTIONS[cat]
            
        recs.append(Recommendation(
            priority=i,
            appliance_name=name,
            action=action,
            effort=effort,
            annual_saving_inr=float(saving),
            payback_months=payback if payback else None,
            reasoning=(
                f"{name} has a standby waste score of {ws['waste_score']:.0f}%. "
                f"This rule-based action can save approximately ₹{saving:,.0f}/year."
            ),
        ))
    # Ensure at least 3 recommendations
    if len(recs) < 3:
        recs.append(Recommendation(
            priority=len(recs) + 1,
            appliance_name="General",
            action="Shift heavy loads (washing machine, dishwasher) to off-peak hours",
            effort="easy",
            annual_saving_inr=1500.0,
            payback_months=None,
            reasoning="Time-shifting reduces peak tariff exposure and grid stress.",
        ))
    return recs


async def run_advisor_agent(report: AnalystReport) -> list[Recommendation]:
    """Agent 3 – ADVISOR: Structured GPT output with local fallback."""
    try:
        waste = json.dumps(report.appliance_waste_scores[:8], default=str)
        response = await _call_openai_with_retry(
            model=MODEL,
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Identify top energy-saving opportunities for this household.\n"
                        f"Appliance waste scores: {waste}\n"
                        f"Monthly avg kWh: {report.avg_monthly_kwh}\n"
                        f"Peer percentile: {report.peer_percentile}\n"
                        "Return a list of at most 6 recommendations."
                    ),
                },
            ],
            response_format=ADVISOR_SCHEMA,
        )
        raw = response.choices[0].message.content
        data = json.loads(raw)
        return [Recommendation(**r) for r in data["recommendations"]]
    except Exception as e:
        logger.warning(f"AI generation failed for Advisor: {e}")
        return _local_advisor(report)


# ---------------------------------------------------------------------------
# Scoring helpers
# ---------------------------------------------------------------------------

GRADE_THRESHOLDS = [
    (90, "A"), (75, "B"), (60, "C"), (45, "D"), (30, "E"), (0, "F")
]

def _compute_efficiency_grade(score: float) -> str:
    for threshold, grade in GRADE_THRESHOLDS:
        if score >= threshold:
            return grade
    return "F"


def _compute_sustainability_score(
    kwh: float,
    peer_avg_kwh: float,
    appliances: list[dict],
) -> float:
    """
    score = 100 - ((kwh / peer_avg) * 50) + efficiency_class_bonus
    Efficiency class bonus: A+++ → +10, A++ → +8, … G → 0
    """
    ratio = kwh / peer_avg_kwh if peer_avg_kwh > 0 else 1.0
    base = 100 - (ratio * 50)
    CLASS_BONUS = {"A+++": 10, "A++": 8, "A+": 6, "A": 4, "B": 2, "C": 1}
    bonus = sum(CLASS_BONUS.get(a.get("efficiency_class", ""), 0) for a in appliances)
    bonus = min(bonus, 15)  # cap bonus at 15
    return max(0.0, min(100.0, round(base + bonus, 1)))


# ---------------------------------------------------------------------------
# ORCHESTRATOR
# ---------------------------------------------------------------------------

async def generate_monthly_insights(
    home_id: str,
    target_month: str,
    db_pool: asyncpg.Pool,
) -> InsightBundle:
    """
    Main orchestrator:
      1. Fetch context bundle from DB
      2. Run ANALYST
      3. Run FORECASTER + ADVISOR in parallel
      4. Compute scores & CO₂
      5. Cache in ai_insights table
      6. Return InsightBundle
    """
    # ---- Step 1: Assemble context bundle ----
    context_bundle: dict = {"home": {}, "appliances": [], "bills": [], "tariff": None}
    try:
        async with db_pool.acquire() as conn:
            home_row = await conn.fetchrow(
                "SELECT * FROM homes WHERE id = $1", uuid.UUID(home_id)
            )
            if home_row:
                context_bundle["home"] = dict(home_row)

            app_rows = await conn.fetch(
                "SELECT * FROM appliances WHERE home_id = $1", uuid.UUID(home_id)
            )
            context_bundle["appliances"] = [dict(r) for r in app_rows]

            bill_rows = await conn.fetch(
                "SELECT * FROM bills WHERE home_id = $1 ORDER BY billing_month ASC",
                uuid.UUID(home_id)
            )
            context_bundle["bills"] = [dict(r) for r in bill_rows]

            tariff_row = await conn.fetchrow(
                "SELECT * FROM tariffs WHERE is_default = true LIMIT 1"
            )
            if tariff_row:
                context_bundle["tariff"] = dict(tariff_row)
    except Exception:
        pass  # continue with whatever we got

    # ---- Step 2: Analyst ----
    report = await run_analyst_agent(home_id, target_month, context_bundle)

    # ---- Step 3: Parallel Forecaster + Advisor ----
    forecast, recommendations = await asyncio.gather(
        run_forecaster_agent(report),
        run_advisor_agent(report),
    )

    # ---- Step 4: Scoring ----
    appliances = context_bundle.get("appliances", [])
    peer_avg = compute_peer_comparison(
        context_bundle["home"].get("city", "Mumbai"),
        context_bundle["home"].get("home_type", "apartment"),
        report.avg_monthly_kwh,
    )["peer_avg_kwh"]

    sustainability = _compute_sustainability_score(
        report.avg_monthly_kwh, peer_avg, appliances
    )
    grade = _compute_efficiency_grade(sustainability)
    co2_kg = round(report.avg_monthly_kwh * 0.82, 2)

    now = datetime.utcnow()
    expires = now + timedelta(days=30)

    bundle = InsightBundle(
        home_id=home_id,
        target_month=target_month,
        efficiency_grade=grade,
        sustainability_score=sustainability,
        co2_kg=co2_kg,
        peer_percentile=report.peer_percentile,
        anomalies=report.anomalies,
        forecast=forecast,
        recommendations=recommendations,
        generated_at=now.isoformat(),
        expires_at=expires.isoformat(),
    )

    # ---- Step 5: Cache in ai_insights table ----
    try:
        async with db_pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO ai_insights
                  (home_id, insight_type, title, content, confidence_score, target_month, expires_at)
                VALUES ($1, 'forecast', $2, $3, $4, $5, $6)
                ON CONFLICT DO NOTHING
                """,
                uuid.UUID(home_id),
                f"Monthly Report — {target_month}",
                json.dumps(bundle.model_dump(), default=str),
                forecast.confidence,
                target_month,
                expires,
            )
    except Exception:
        pass  # caching is best-effort

    return bundle
