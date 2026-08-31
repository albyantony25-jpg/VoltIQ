import asyncio
import os
import sys
import json

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from services.ai_service import run_forecaster_agent, run_advisor_agent, AnalystReport
from routers.chat import execute_tool
from pydantic import BaseModel
import uuid

# Mock Analyst Report for testing
def get_mock_report(kwh=300):
    return AnalystReport(
        home_id=str(uuid.uuid4()),
        target_month="2026-08",
        avg_monthly_kwh=kwh,
        current_month_kwh=kwh,
        peer_percentile=50.0,
        anomalies=[],
        appliance_waste_scores=[
            {"appliance_name": "AC", "waste_score": 30, "rated_watts": 1500, "usage_hours": 8}
        ],
        bills_history=[{"billing_month": f"2026-0{i}", "units_consumed": kwh} for i in range(1, 7)],
        context_bundle={}
    )

EVAL_SUITE = [
    # Insights Forecaster Tests
    {
        "name": "Forecast parsing and basic logic (avg usage)",
        "type": "forecaster",
        "input": get_mock_report(300),
        "validate": lambda out: 250 <= out.next_month_kwh <= 350 and out.next_month_bill_inr > 0
    },
    {
        "name": "Forecast parsing and basic logic (high usage)",
        "type": "forecaster",
        "input": get_mock_report(800),
        "validate": lambda out: 700 <= out.next_month_kwh <= 900
    },
    # Insights Advisor Tests
    {
        "name": "Advisor recommends actions for AC",
        "type": "advisor",
        "input": get_mock_report(400),
        "validate": lambda out: any("AC" in r.appliance_name.upper() for r in out)
    },
    {
        "name": "Advisor provides payback periods",
        "type": "advisor",
        "input": get_mock_report(400),
        "validate": lambda out: all(hasattr(r, "payback_months") for r in out)
    },
    # Chat Tool Calling Tests (Mocked DB)
    {
        "name": "Tool - get_bill_breakdown missing DB",
        "type": "tool",
        "tool_name": "get_bill_breakdown",
        "args": {"month": "2026-08"},
        "validate": lambda out: "Database unavailable" in out
    },
    {
        "name": "Tool - compare_tariffs missing DB",
        "type": "tool",
        "tool_name": "compare_tariffs",
        "args": {"state": "Kerala"},
        "validate": lambda out: "Database unavailable" in out
    }
]

async def run_evals():
    print(f"Running {len(EVAL_SUITE)} AI evaluations...")
    passed = 0
    
    for i, test in enumerate(EVAL_SUITE):
        try:
            if test["type"] == "forecaster":
                out = await run_forecaster_agent(test["input"])
                result = test["validate"](out)
            elif test["type"] == "advisor":
                out = await run_advisor_agent(test["input"])
                result = test["validate"](out)
            elif test["type"] == "tool":
                out = await execute_tool(test["tool_name"], test["args"], uuid.uuid4(), None)
                result = test["validate"](out)
            else:
                result = False
                
            if result:
                print(f"[{i+1}/{len(EVAL_SUITE)}] PASS: {test['name']}")
                passed += 1
            else:
                print(f"[{i+1}/{len(EVAL_SUITE)}] FAIL: {test['name']}")
        except Exception as e:
            print(f"[{i+1}/{len(EVAL_SUITE)}] ERROR: {test['name']} - {e}")

    print(f"\nEval Summary: {passed}/{len(EVAL_SUITE)} passed. Score: {passed/len(EVAL_SUITE)*100:.1f}%")

if __name__ == "__main__":
    asyncio.run(run_evals())
