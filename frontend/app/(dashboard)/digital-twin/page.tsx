"use client"

import { useState, useEffect } from "react"
import { BatteryCharging } from "lucide-react"
import { ScenarioBuilder } from "@/components/appliances/ScenarioBuilder"
import { SimulationResults } from "@/components/shared/SimulationResults"

// Helper Hook for debounce
function useDebounce(value: any, delay: number) {
    const [debouncedValue, setDebouncedValue] = useState(value);
    useEffect(() => {
        const handler = setTimeout(() => { setDebouncedValue(value); }, delay);
        return () => { clearTimeout(handler); };
    }, [value, delay]);
    return debouncedValue;
}

export default function DigitalTwinPage() {
    const MOCK_HOME_ID = "00000000-0000-0000-0000-000000000000"

    const [appliances, setAppliances] = useState<any[]>([])
    const [config, setConfig] = useState({
        home_id: MOCK_HOME_ID,
        scenario_name: "Optimized Future",
        changes: [],
        add_appliances: [],
        add_solar_kwp: 0,
        target_months: 6
    })

    const [result, setResult] = useState<any>(null)
    const [isSimulating, setIsSimulating] = useState(false)

    const debouncedConfig = useDebounce(config, 800)

    useEffect(() => {
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/appliances?home_id=${MOCK_HOME_ID}`)
            .then(res => res.json())
            .then(data => setAppliances(data))
    }, [])

    // Trigger simulation automatically when state changes
    useEffect(() => {
        if (appliances.length === 0) return; // Wait to load

        setIsSimulating(true)
        fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/simulation/twin`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(debouncedConfig)
        })
            .then(res => res.json())
            .then(data => {
                setResult(data)
                setIsSimulating(false)
            })
            .catch(err => {
                console.error(err)
                setIsSimulating(false)
            })
    }, [debouncedConfig, appliances.length])

    return (
        <div className="w-full flex h-[calc(100vh-80px)] font-sans">
            {/* Left Drawer */}
            <div className="w-96 bg-slate-950 border-r border-slate-800 p-6 flex flex-col shrink-0 overflow-hidden">
                <div className="flex items-center gap-3 mb-6 shrink-0 border-b border-slate-800 pb-4">
                    <div className="p-2 bg-indigo-500/20 rounded-lg">
                        <BatteryCharging className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Digital Twin</h2>
                        <p className="text-xs text-slate-500">Model your home's energy future</p>
                    </div>
                </div>

                <ScenarioBuilder appliances={appliances} config={config} setConfig={setConfig} />
            </div>

            {/* Right Pane */}
            <div className="flex-1 p-8 overflow-y-auto bg-[#0A0A0B]">
                <div className="max-w-5xl mx-auto h-full space-y-6 flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold text-white">{config.scenario_name || "Simulation"} Results</h1>
                    </div>
                    <div className="flex-1">
                        <SimulationResults result={result} isSimulating={isSimulating} />
                    </div>
                </div>
            </div>
        </div>
    )
}
