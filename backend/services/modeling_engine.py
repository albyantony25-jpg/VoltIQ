import math
import uuid
import json
from datetime import datetime
from typing import List, Dict, Optional
from models.appliance import ApplianceBase, ApplianceCategory, EfficiencyClass
from models.simulation import (
    ConsumptionProfile, AnomalyResult, SavingOpportunity,
    HomeConsumptionSummary, UsageLog, TopConsumer
)

class ModelingEngine:
    """
    Physics-based energy simulation engine.
    Calculations are deterministic and aim to model household electricity usage accurately.
    """
    
    # Average flat rate for INR conversions in recommendations
    DEFAULT_INR_PER_KWH = 7.5 

    @staticmethod
    def calculate_daily_kwh(appliance: ApplianceBase) -> float:
        """
        Calculates the daily energy consumption in kWh for a single appliance.
        Considers load factors, age-based efficiency penalty, active usage, and standby usage.
        
        Args:
            appliance: ApplianceBase model instance
            
        Returns:
            float: Total daily kWh rounded to 4 decimal places
        """
        if appliance.usage_hours < 0 or appliance.usage_hours > 24:
            raise ValueError("usage_hours must be between 0 and 24")

        load_factors = {
            "hvac": 0.65, 
            "heating": 0.80, 
            "kitchen": 0.90, 
            "entertainment": 0.70, 
            "lighting": 1.0, 
            "ev": 0.95,
            "laundry": 0.85,
            "other": 0.85
        }
        
        # Determine the load factor, defaulting to 'other' (0.85) if not explicitly mapped
        cat_val = appliance.category.value if hasattr(appliance.category, 'value') else str(appliance.category)
        load_factor = load_factors.get(cat_val, 0.85)
        
        # Age penalty: 2% efficiency loss per year
        age_penalty = 1 + (appliance.age_years * 0.02)
        
        # Active consumption
        active_kwh = (appliance.rated_watts * load_factor * appliance.usage_hours) / 1000.0
        
        # Standby consumption (assumed 24/7 minus active hours realistically, but prompt implies 24h baseline)
        standby_kwh = (appliance.standby_watts * 24.0) / 1000.0
        
        daily_kwh = (active_kwh * age_penalty) + standby_kwh
        return round(daily_kwh, 4)

    @staticmethod
    def apply_seasonal_modifier(kwh: float, category: str, month: int) -> float:
        """
        Applies seasonal multipliers to energy consumption based on time of year.
        HVAC usage is heavily impacted by season.
        
        Args:
            kwh: Base consumption
            category: Appliance category string
            month: Integer 1-12
            
        Returns:
            float: Season-adjusted kWh rounded to 4 decimal places
        """
        if month < 1 or month > 12:
            raise ValueError("Month must be between 1 and 12")

        cat_val = category.value if hasattr(category, 'value') else str(category)
        
        if cat_val == "hvac":
            if 4 <= month <= 6:
                # Summer
                kwh *= 1.4
            elif month in (11, 12, 1, 2):
                # Winter
                kwh *= 1.6
            elif month in (3, 7, 8, 9, 10):
                # Mild / Monsoon
                kwh *= 0.7
                
        return round(kwh, 4)

    @staticmethod
    def _get_efficiency_score(eff_class: Optional[EfficiencyClass]) -> int:
        if eff_class == EfficiencyClass.A_PLUS_PLUS_PLUS: return 98
        if eff_class == EfficiencyClass.A_PLUS_PLUS: return 91
        if eff_class == EfficiencyClass.A_PLUS: return 84
        if eff_class == EfficiencyClass.A: return 75
        if eff_class == EfficiencyClass.B: return 64
        if eff_class == EfficiencyClass.C: return 51
        if eff_class == EfficiencyClass.D: return 38
        if eff_class in (EfficiencyClass.E, EfficiencyClass.F, EfficiencyClass.G): return 25
        return 50 # Default if undefined

    def calculate_consumption_profile(self, appliance: ApplianceBase, month: int) -> ConsumptionProfile:
        """
        Generates a comprehensive consumption profile for an appliance for a given month.
        
        Args:
            appliance: ApplianceBase instance
            month: Integer 1-12 representing the month running
            
        Returns:
            ConsumptionProfile with daily, weekly, monthly, and annual projections.
        """
        base_daily = self.calculate_daily_kwh(appliance)
        cat_val = appliance.category.value if hasattr(appliance.category, 'value') else str(appliance.category)
        
        adj_daily = self.apply_seasonal_modifier(base_daily, cat_val, month)
        
        daily_kwh = adj_daily
        weekly_kwh = round(daily_kwh * 7, 4)
        monthly_kwh = round(daily_kwh * 30, 4)
        annual_kwh = round(daily_kwh * 365, 4)
        
        eff_score = self._get_efficiency_score(appliance.efficiency_class)
        
        return ConsumptionProfile(
            daily_kwh=daily_kwh,
            weekly_kwh=weekly_kwh,
            monthly_kwh=monthly_kwh,
            annual_kwh=annual_kwh,
            cost_attribution_pct=0.0, # Will be set externally in simulate_home_total
            efficiency_score=eff_score
        )

    def detect_usage_anomaly(self, appliance_id: str, logs: List[UsageLog]) -> Optional[AnomalyResult]:
        """
        Detects anomalies by comparing the latest month's average against historical 3-month rolling data.
        Assumes logs are sorted chronologically.
        
        Returns AnomalyResult if detected, None otherwise.
        """
        if len(logs) < 30:
            return None # Not enough data for meaningful stats
            
        # Simplification: treat logs as daily. Split into 'latest month' (last 30) and 'historical' (before last 30)
        historical_logs = logs[:-30]
        latest_logs = logs[-30:]
        
        if len(historical_logs) < 10:
            return None
            
        hist_kwh = [log.computed_kwh for log in historical_logs]
        latest_kwh = [log.computed_kwh for log in latest_logs]
        
        hist_avg = sum(hist_kwh) / len(hist_kwh)
        hist_var = sum((x - hist_avg) ** 2 for x in hist_kwh) / len(hist_kwh)
        hist_std = math.sqrt(hist_var)
        
        latest_avg = sum(latest_kwh) / len(latest_kwh)
        
        # If latest month daily average is 2 std devs higher than history
        threshold = hist_avg + (2 * hist_std)
        
        if latest_avg > threshold and hist_avg > 0:
            dev_pct = ((latest_avg - hist_avg) / hist_avg) * 100.0
            
            severity = "low"
            if dev_pct > 100: severity = "critical"
            elif dev_pct > 50: severity = "high"
            elif dev_pct > 25: severity = "medium"
            
            return AnomalyResult(
                is_anomaly=True,
                deviation_pct=round(dev_pct, 4),
                expected_kwh=round(hist_avg * 30, 4),
                actual_kwh=round(latest_avg * 30, 4),
                severity=severity
            )
            
        return None

    def rank_saving_opportunities(self, appliances: List[ApplianceBase]) -> List[SavingOpportunity]:
        """
        Scans appliances and identifies the highest value optimization paths.
        Evaluates reducing usage, upgrading efficiency, and eliminating standby power.
        Returns top 5 opportunities sorted by savings.
        """
        opportunities = []
        
        for app in appliances:
            app_id = getattr(app, 'id', uuid.uuid4())
            base_daily = self.calculate_daily_kwh(app)
            
            # Scenario 1: Reduce usage by 1 hour
            if app.usage_hours > 1:
                test_app_1 = app.model_copy()
                test_app_1.usage_hours -= 1
                new_daily_1 = self.calculate_daily_kwh(test_app_1)
                daily_savings_1 = base_daily - new_daily_1
                if daily_savings_1 > 0:
                    opportunities.append(SavingOpportunity(
                        appliance_id=app_id,
                        appliance_name=app.name,
                        action_type="reduce_usage_by_1hr",
                        annual_saving_kwh=round(daily_savings_1 * 365, 4),
                        annual_saving_inr=round(daily_savings_1 * 365 * self.DEFAULT_INR_PER_KWH, 4)
                    ))
            
            # Scenario 2: Upgrade efficiency (Eliminate age penalty and boost class)
            if app.age_years > 5 or (app.efficiency_class in (EfficiencyClass.C, EfficiencyClass.D, EfficiencyClass.E, EfficiencyClass.F, EfficiencyClass.G)):
                test_app_2 = app.model_copy()
                test_app_2.age_years = 0
                test_app_2.efficiency_class = EfficiencyClass.A_PLUS_PLUS
                # Roughly assume rated watts decrease by 30% for high efficiency models
                test_app_2.rated_watts *= 0.7 
                new_daily_2 = self.calculate_daily_kwh(test_app_2)
                daily_savings_2 = base_daily - new_daily_2
                if daily_savings_2 > 0:
                    opportunities.append(SavingOpportunity(
                        appliance_id=app_id,
                        appliance_name=app.name,
                        action_type="upgrade_efficiency",
                        annual_saving_kwh=round(daily_savings_2 * 365, 4),
                        annual_saving_inr=round(daily_savings_2 * 365 * self.DEFAULT_INR_PER_KWH, 4)
                    ))
                    
            # Scenario 3: Eliminate standby (smart plug)
            if app.standby_watts > 5:
                test_app_3 = app.model_copy()
                test_app_3.standby_watts = 0
                new_daily_3 = self.calculate_daily_kwh(test_app_3)
                daily_savings_3 = base_daily - new_daily_3
                if daily_savings_3 > 0:
                    opportunities.append(SavingOpportunity(
                        appliance_id=app_id,
                        appliance_name=app.name,
                        action_type="eliminate_standby",
                        annual_saving_kwh=round(daily_savings_3 * 365, 4),
                        annual_saving_inr=round(daily_savings_3 * 365 * self.DEFAULT_INR_PER_KWH, 4)
                    ))

        # Sort by INR savings descending and take top 5
        opportunities.sort(key=lambda x: x.annual_saving_inr, reverse=True)
        return opportunities[:5]

    def simulate_home_total(self, appliances: List[ApplianceBase], month: int) -> HomeConsumptionSummary:
        """
        Simulates overall consumption for the entire home for a specific month.
        Aggregates categories, ranks consumers, and calculates all stats dynamically.
        """
        total_monthly = 0.0
        total_daily = 0.0
        by_category = {}
        consumers = []
        
        for app in appliances:
            prof = self.calculate_consumption_profile(app, month)
            cat_val = app.category.value if hasattr(app.category, 'value') else str(app.category)
            
            total_monthly += prof.monthly_kwh
            total_daily += prof.daily_kwh
            
            by_category[cat_val] = by_category.get(cat_val, 0.0) + prof.monthly_kwh
            
            consumers.append({
                "appliance_name": app.name,
                "kwh": prof.monthly_kwh,
                "prof_obj": prof # store temporarily to update cost_attribution_pct
            })
            
        top_consumers_models = []
        for c in consumers:
            pct = (c["kwh"] / total_monthly * 100) if total_monthly > 0 else 0
            c["prof_obj"].cost_attribution_pct = round(pct, 4)
            
            top_consumers_models.append(TopConsumer(
                appliance_name=c["appliance_name"],
                kwh=round(c["kwh"], 4),
                pct_of_total=round(pct, 4)
            ))
            
        top_consumers_models.sort(key=lambda x: x.kwh, reverse=True)
        
        # Round category totals
        for k in by_category:
            by_category[k] = round(by_category[k], 4)
            
        savings = self.rank_saving_opportunities(appliances)
        
        return HomeConsumptionSummary(
            total_daily_kwh=round(total_daily, 4),
            total_monthly_kwh=round(total_monthly, 4),
            by_category=by_category,
            top_consumers=top_consumers_models,
            anomalies=[], # Typically populated externally by querying usage_logs
            saving_opportunities=savings
        )

    @classmethod
    async def calculate_home_dashboard(cls, home_id: uuid.UUID, db) -> Dict:
        """
        Fetches authentic appliance data from DB and returns a full dashboard payload.
        """
        async with db.acquire() as conn:
            home = await conn.fetchrow("SELECT tariff_id FROM homes WHERE id = $1", home_id)
            if not home:
                return {"has_appliances": False}
                
            appliances_rows = await conn.fetch("SELECT * FROM appliances WHERE home_id = $1 AND is_active = true", home_id)
            
            if not appliances_rows:
                return {"has_appliances": False}
                
            appliances = []
            for r in appliances_rows:
                try: category_enum = ApplianceCategory(r['category'])
                except ValueError: category_enum = ApplianceCategory.other
                
                eff_enum = None
                if r['efficiency_class']:
                    try: eff_enum = EfficiencyClass(r['efficiency_class'])
                    except ValueError: pass
                        
                app = ApplianceBase(
                    name=r.get('name') or 'Appliance',
                    brand=r.get('brand') or 'Generic',
                    category=category_enum,
                    rated_watts=float(r.get('rated_watts') or 0),
                    standby_watts=float(r.get('standby_watts') or 0),
                    efficiency_class=eff_enum,
                    age_years=r.get('age_years') or 0,
                    is_active=r.get('is_active') if r.get('is_active') is not None else True,
                    usage_hours=float(r.get('usage_hours') or 0)
                )
                app.id = r.get('id')
                appliances.append(app)
                
            engine = cls()
            summary = engine.simulate_home_total(appliances, month=datetime.now().month)
            
            projected_bill = float(summary.total_monthly_kwh) * 7.5
            fixed_charge = 0.0
            
            if home['tariff_id']:
                tariff = await conn.fetchrow("SELECT * FROM tariffs WHERE id::text = $1", str(home['tariff_id']))
                if tariff:
                    fixed_charge = float(tariff['fixed_charge_inr'] or 0)
                    if tariff['slab_config']:
                        slabs = json.loads(tariff['slab_config']) if isinstance(tariff['slab_config'], str) else tariff['slab_config']
                        slabs = slabs or []
                        remaining = float(summary.total_monthly_kwh)
                        calc_bill = 0.0
                        for slab in slabs:
                            limit = float('inf')
                            if slab.get('to') is not None:
                                limit = slab['to'] - slab['from'] + 1
                            units = min(remaining, limit)
                            if units > 0:
                                calc_bill += units * slab['rate']
                                remaining -= units
                        projected_bill = calc_bill
                        
            projected_bill += fixed_charge
            
            total_eff = sum(engine._get_efficiency_score(a.efficiency_class) for a in appliances)
            avg_eff = int(total_eff / len(appliances)) if appliances else 50
            
            return {
                "has_appliances": True,
                "summary": summary.model_dump() if hasattr(summary, 'model_dump') else summary.dict(),
                "projected_bill": round(projected_bill, 2),
                "home_score": avg_eff
            }
