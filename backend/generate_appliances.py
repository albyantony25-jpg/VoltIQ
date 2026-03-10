import json
import os

appliances = [
    # HVAC (10 items)
    {"name": "1.5T Split AC 5-star", "category": "hvac", "rated_watts": 1500, "standby_watts": 5, "efficiency_class": "A+++", "usage_hours": 8},
    {"name": "2T Split AC 3-star", "category": "hvac", "rated_watts": 2200, "standby_watts": 5, "efficiency_class": "B", "usage_hours": 8},
    {"name": "1T Window AC 3-star", "category": "hvac", "rated_watts": 1200, "standby_watts": 5, "efficiency_class": "C", "usage_hours": 8},
    {"name": "Ceiling Fan", "category": "hvac", "rated_watts": 75, "standby_watts": 0, "efficiency_class": "A", "usage_hours": 12},
    {"name": "High-Speed Ceiling Fan", "category": "hvac", "rated_watts": 50, "standby_watts": 0, "efficiency_class": "A++", "usage_hours": 12},
    {"name": "Tower Fan", "category": "hvac", "rated_watts": 50, "standby_watts": 2, "efficiency_class": "A+", "usage_hours": 8},
    {"name": "Pedestal Fan", "category": "hvac", "rated_watts": 60, "standby_watts": 1, "efficiency_class": "A", "usage_hours": 8},
    {"name": "Air Cooler 40L", "category": "hvac", "rated_watts": 150, "standby_watts": 0, "efficiency_class": "B", "usage_hours": 10},
    {"name": "Room Heater 2000W", "category": "hvac", "rated_watts": 2000, "standby_watts": 0, "efficiency_class": "E", "usage_hours": 4},
    {"name": "Air Purifier", "category": "hvac", "rated_watts": 40, "standby_watts": 2, "efficiency_class": "A", "usage_hours": 12},

    # Kitchen (10 items)
    {"name": "Double-door Fridge 250L", "category": "kitchen", "rated_watts": 250, "standby_watts": 50, "efficiency_class": "A+", "usage_hours": 24},
    {"name": "Single-door Fridge 190L", "category": "kitchen", "rated_watts": 180, "standby_watts": 30, "efficiency_class": "A++", "usage_hours": 24},
    {"name": "Microwave 800W", "category": "kitchen", "rated_watts": 1200, "standby_watts": 3, "efficiency_class": "B", "usage_hours": 0.5},
    {"name": "Convection Microwave", "category": "kitchen", "rated_watts": 1500, "standby_watts": 4, "efficiency_class": "C", "usage_hours": 0.8},
    {"name": "Mixer Grinder 750W", "category": "kitchen", "rated_watts": 750, "standby_watts": 0, "efficiency_class": "C", "usage_hours": 0.3},
    {"name": "Induction Cooktop 2000W", "category": "kitchen", "rated_watts": 2000, "standby_watts": 2, "efficiency_class": "A", "usage_hours": 1},
    {"name": "Electric Kettle 1.5L", "category": "kitchen", "rated_watts": 1500, "standby_watts": 0, "efficiency_class": "B", "usage_hours": 0.2},
    {"name": "Dishwasher 12 Place", "category": "kitchen", "rated_watts": 1800, "standby_watts": 2, "efficiency_class": "A+", "usage_hours": 1.5},
    {"name": "Toaster 2 Slice", "category": "kitchen", "rated_watts": 800, "standby_watts": 0, "efficiency_class": "C", "usage_hours": 0.1},
    {"name": "Air Fryer 4L", "category": "kitchen", "rated_watts": 1400, "standby_watts": 1, "efficiency_class": "A", "usage_hours": 0.5},

    # Entertainment (9 items)
    {"name": "43\" LED TV", "category": "entertainment", "rated_watts": 100, "standby_watts": 2, "efficiency_class": "A+", "usage_hours": 4},
    {"name": "55\" 4K Smart TV", "category": "entertainment", "rated_watts": 150, "standby_watts": 3, "efficiency_class": "A", "usage_hours": 4},
    {"name": "32\" HD TV", "category": "entertainment", "rated_watts": 60, "standby_watts": 1, "efficiency_class": "A", "usage_hours": 4},
    {"name": "Gaming Console (PS5/Xbox)", "category": "entertainment", "rated_watts": 200, "standby_watts": 10, "efficiency_class": "C", "usage_hours": 2},
    {"name": "Laptop Standard", "category": "entertainment", "rated_watts": 65, "standby_watts": 1, "efficiency_class": "A++", "usage_hours": 6},
    {"name": "Gaming Laptop", "category": "entertainment", "rated_watts": 240, "standby_watts": 2, "efficiency_class": "C", "usage_hours": 4},
    {"name": "Desktop PC", "category": "entertainment", "rated_watts": 300, "standby_watts": 5, "efficiency_class": "B", "usage_hours": 4},
    {"name": "WiFi Router AC", "category": "entertainment", "rated_watts": 15, "standby_watts": 15, "efficiency_class": "A", "usage_hours": 24},
    {"name": "Soundbar 100W", "category": "entertainment", "rated_watts": 50, "standby_watts": 2, "efficiency_class": "B", "usage_hours": 2},

    # Lighting (8 items)
    {"name": "LED Bulb 9W", "category": "lighting", "rated_watts": 9, "standby_watts": 0, "efficiency_class": "A+++", "usage_hours": 6},
    {"name": "LED Bulb 12W", "category": "lighting", "rated_watts": 12, "standby_watts": 0, "efficiency_class": "A++", "usage_hours": 6},
    {"name": "Tube Light 36W", "category": "lighting", "rated_watts": 36, "standby_watts": 0, "efficiency_class": "A", "usage_hours": 6},
    {"name": "LED Tube 20W", "category": "lighting", "rated_watts": 20, "standby_watts": 0, "efficiency_class": "A++", "usage_hours": 6},
    {"name": "CFL 23W", "category": "lighting", "rated_watts": 23, "standby_watts": 0, "efficiency_class": "B", "usage_hours": 4},
    {"name": "LED Strip 5m", "category": "lighting", "rated_watts": 24, "standby_watts": 0, "efficiency_class": "A+", "usage_hours": 4},
    {"name": "Smart Bulb Color 10W", "category": "lighting", "rated_watts": 10, "standby_watts": 1, "efficiency_class": "A+", "usage_hours": 5},
    {"name": "Incandescent 60W", "category": "lighting", "rated_watts": 60, "standby_watts": 0, "efficiency_class": "G", "usage_hours": 2},

    # Laundry (8 items)
    {"name": "Washing Machine 6kg (Top)", "category": "laundry", "rated_watts": 400, "standby_watts": 2, "efficiency_class": "A+", "usage_hours": 1},
    {"name": "Washing Machine 8kg (Front)", "category": "laundry", "rated_watts": 2000, "standby_watts": 2, "efficiency_class": "A++", "usage_hours": 1},
    {"name": "Tumble Dryer", "category": "laundry", "rated_watts": 2500, "standby_watts": 2, "efficiency_class": "D", "usage_hours": 1},
    {"name": "Heat Pump Dryer", "category": "laundry", "rated_watts": 900, "standby_watts": 2, "efficiency_class": "A++", "usage_hours": 2},
    {"name": "Iron Box Dry", "category": "laundry", "rated_watts": 1000, "standby_watts": 0, "efficiency_class": "B", "usage_hours": 0.5},
    {"name": "Steam Iron", "category": "laundry", "rated_watts": 1600, "standby_watts": 0, "efficiency_class": "C", "usage_hours": 0.5},
    {"name": "Vacuum Cleaner", "category": "other", "rated_watts": 1400, "standby_watts": 0, "efficiency_class": "B", "usage_hours": 0.3},
    {"name": "Water Heater 25L", "category": "other", "rated_watts": 2000, "standby_watts": 10, "efficiency_class": "B", "usage_hours": 1},

    # EV (5 items)
    {"name": "Electric Scooter Charger (Slow)", "category": "ev", "rated_watts": 350, "standby_watts": 0, "efficiency_class": "A", "usage_hours": 4},
    {"name": "Electric Bike Charger (Fast)", "category": "ev", "rated_watts": 800, "standby_watts": 1, "efficiency_class": "A", "usage_hours": 3},
    {"name": "EV Car Charger 3.3kW", "category": "ev", "rated_watts": 3300, "standby_watts": 3, "efficiency_class": "A", "usage_hours": 8},
    {"name": "EV Car Charger 7.4kW", "category": "ev", "rated_watts": 7400, "standby_watts": 5, "efficiency_class": "A", "usage_hours": 6},
    {"name": "EV Car Charger 11kW", "category": "ev", "rated_watts": 11000, "standby_watts": 8, "efficiency_class": "A+", "usage_hours": 5},
]

for i, app in enumerate(appliances):
    app["id"] = f"tpl-{app['category']}-{i+1}"

# write to backend/data/appliance_library.json
path = os.path.join(os.path.dirname(__file__), "data", "appliance_library.json")
with open(path, "w") as f:
    json.dump(appliances, f, indent=2)

print(f"Generated {len(appliances)} items to {path}")
