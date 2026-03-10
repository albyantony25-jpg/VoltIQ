import { promises as fs } from "fs"
import path from "path"

// MOCK DATA GENERATOR ONLY FOR PROTOTYPING UI
export async function getBillingData(tariffId: string = "MAH-01") {
    // Simulate network delay
    await new Promise(r => setTimeout(r, 600))

    // Return mock breakdown
    return {
        bill: {
            energy_charge: {
                total_energy_charge: 2100.50,
                slabs: []
            },
            fixed_charge: 110.0,
            fuel_surcharge: 105.02,
            electricity_duty: 352.88,
            total_bill: 2668.40
        },
        appliances: [
            {
                appliance_name: "Samsung 1.5T AC (Master Bed)",
                monthly_kwh: 145.2,
                cost_inr: 850.50,
                pct_of_bill: 31.8
            },
            {
                appliance_name: "LG Double Door Refrigerator",
                monthly_kwh: 95.5,
                cost_inr: 510.30,
                pct_of_bill: 19.1
            },
            {
                appliance_name: "Sony 55' OLED TV",
                monthly_kwh: 45.0,
                cost_inr: 250.80,
                pct_of_bill: 9.4
            },
            {
                appliance_name: "V-Guard Water Heater",
                monthly_kwh: 80.0,
                cost_inr: 450.20,
                pct_of_bill: 16.8
            },
            {
                appliance_name: "Miscellaneous (Lights/Fans)",
                monthly_kwh: 120.0,
                cost_inr: 606.60,
                pct_of_bill: 22.9
            }
        ]
    }
}

export async function getTariffs() {
    // We can read directly from the backend seed for the prototype if running locally,
    // or fetch from an API eventually. For now, we fetch from the local python seed.
    try {
        const seedPath = path.join(process.cwd(), "..", "backend", "data", "tariffs_seed.json")
        const fileContent = await fs.readFile(seedPath, "utf-8")
        return JSON.parse(fileContent)
    } catch (e) {
        console.error("Failed to load tariffs locally:", e)
        return []
    }
}
