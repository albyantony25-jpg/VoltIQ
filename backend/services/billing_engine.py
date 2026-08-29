import json
import os
import functools
from typing import List, Dict, Any
from models.billing import (
    SlabBreakdown, SlabResult, Tariff, BillResult, 
    ApplianceCostAttribution, BillTrend, BillPrediction, BillRecord
)

@functools.lru_cache(maxsize=1)
def load_tariffs() -> List[Tariff]:
    # Use absolute path resolution for production reliability
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    path = os.path.join(base_dir, "data", "tariffs_seed.json")
    
    if not os.path.exists(path):
        print(f"ERROR: Tariff seed file not found at {path}")
        return []
        
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return [Tariff(**t) for t in data]
    except Exception as e:
        print(f"ERROR loading tariffs: {str(e)}")
        import traceback
        traceback.print_exc()
        return []

def get_tariff_by_id(tariff_id: str) -> Tariff:
    tariffs = load_tariffs()
    for t in tariffs:
        if t.id == tariff_id:
            return t
    raise ValueError("Tariff not found")

def calculate_slab_charge(units: float, slab_config: List[Dict[str, Any]]) -> SlabBreakdown:
    slabs = []
    total_charge = 0.0
    remaining_units = units
    
    # Sort by "from" ascending
    sorted_slabs = sorted(slab_config, key=lambda x: x.get("from", 0))
    
    for slab in sorted_slabs:
        f = slab.get("from", 0)
        to = slab.get("to")
        rate = slab.get("rate", 0.0)
        
        if remaining_units <= 0:
            break
            
        if to is None:
            units_in_slab = remaining_units
        else:
            # Calculate the explicit slab size to handle missing/offset limits accurately
            slab_size = to - max(0, f - 1)
            units_in_slab = min(remaining_units, slab_size)
            
        charge = units_in_slab * rate
        slabs.append(SlabResult(**{
            "from": f,
            "to": to,
            "units_consumed": units_in_slab,
            "rate": rate,
            "charge": charge
        }))
        
        total_charge += charge
        remaining_units -= units_in_slab
        
    return SlabBreakdown(slabs=slabs, total_energy_charge=total_charge)

def calculate_full_bill(home_id: str, month: str, tariff: Tariff, total_units: float) -> BillResult:
    slab_dicts = []
    for s in tariff.slab_config:
        slab_dicts.append({
            "from": s.from_units,
            "to": s.to_units,
            "rate": s.rate
        })
        
    energy_charge = calculate_slab_charge(total_units, slab_dicts)
    fixed_charge = tariff.fixed_charge_inr
    fuel_surcharge = energy_charge.total_energy_charge * tariff.fuel_surcharge_pct
    electricity_duty = (energy_charge.total_energy_charge + fuel_surcharge) * tariff.electricity_duty_pct
    total_bill = energy_charge.total_energy_charge + fixed_charge + fuel_surcharge + electricity_duty
    
    return BillResult(
        energy_charge=energy_charge,
        fixed_charge_inr=fixed_charge,
        fuel_surcharge=fuel_surcharge,
        electricity_duty=electricity_duty,
        total_bill=total_bill
    )

def attribute_cost_to_appliances(appliances: List[Dict], total_bill: float) -> List[ApplianceCostAttribution]:
    total_home_kwh = sum(app.get("monthly_kwh", 0) for app in appliances)
    res = []
    if total_home_kwh <= 0:
        return res
        
    for app in appliances:
        pct = app.get("monthly_kwh", 0) / total_home_kwh
        cost = pct * total_bill
        res.append(ApplianceCostAttribution(
            appliance_name=app.get("name", "Unknown"),
            monthly_kwh=app.get("monthly_kwh", 0),
            cost_inr=cost,
            pct_of_bill=pct * 100 
        ))
        
    return sorted(res, key=lambda x: x.cost_inr, reverse=True)

def compute_bill_trend(bills: List[Dict]) -> BillTrend:
    if not bills:
        return BillTrend(
            month_over_month_change_pct=0.0,
            three_month_average_inr=0.0,
            six_month_average_inr=0.0,
            highest_bill=None,
            lowest_bill=None,
            trend_direction="stable"
        )
        
    # Sort bills by month assuming format YYYY-MM
    sorted_bills = sorted(bills, key=lambda x: x.get("billing_month", ""), reverse=True)
    amounts = [b.get("total_amount_inr", 0) for b in sorted_bills]
    
    highest = max(sorted_bills, key=lambda x: x.get("total_amount_inr", 0))
    lowest = min(sorted_bills, key=lambda x: x.get("total_amount_inr", 0))
    
    mom = 0.0
    if len(amounts) >= 2 and amounts[1] > 0:
        mom = ((amounts[0] - amounts[1]) / amounts[1]) * 100
        
    avg_3 = sum(amounts[:3]) / min(3, len(amounts))
    avg_6 = sum(amounts[:6]) / min(6, len(amounts))
    
    direction = "stable"
    if mom > 5.0:
        direction = "rising"
    elif mom < -5.0:
        direction = "falling"
        
    return BillTrend(
        month_over_month_change_pct=mom,
        three_month_average_inr=avg_3,
        six_month_average_inr=avg_6,
        highest_bill=BillRecord(month=highest.get("billing_month", ""), amount=highest.get("total_amount_inr", 0)),
        lowest_bill=BillRecord(month=lowest.get("billing_month", ""), amount=lowest.get("total_amount_inr", 0)),
        trend_direction=direction
    )

def predict_month_bill(home_id: str, days_elapsed: int, kwh_so_far: float, tariff: Tariff) -> BillPrediction:
    days_in_month = 30 # common standard
    if days_elapsed <= 0:
        days_elapsed = 1
        
    projected_units = (kwh_so_far / days_elapsed) * days_in_month
    
    # Calculate expected full bill based on projected units
    projected_bill_result = calculate_full_bill(home_id, "projected", tariff, projected_units)
    projected_amount = projected_bill_result.total_bill
    
    confidence = min(0.95, days_elapsed / 30.0)
    
    range_low = projected_amount * 0.92
    range_high = projected_amount * 1.08
    
    return BillPrediction(
        projected_units=projected_units,
        projected_amount=projected_amount,
        confidence=confidence,
        range_low=range_low,
        range_high=range_high
    )
