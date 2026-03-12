"use client"

import { useState, useEffect } from "react"
import { BatteryCharging, Play } from "lucide-react"
import { ScenarioBuilder } from "@/components/appliances/ScenarioBuilder"
import { SimulationResults } from "@/components/shared/SimulationResults"
import { useEnergyStore } from "@/stores/useEnergyStore"
import { fetchApi } from "@/lib/api"

export default function DigitalTwinPage() {
    const { activeHomeId } = useEnergyStore()

    const [appliances, setAppliances] = useState<any[]>([])
    const [config, setConfig] = useState({
        home_id: activeHomeId,
        scenario_name: "Optimized Future",
        changes: [],
        add_appliances: [],
        add_solar_kwp: 0,
        target_months: 6
    })

    const [result, setResult] = useState<any>(null)
    const [isSimulating, setIsSimulating] = useState(false)

    useEffect(() => {
        if (!activeHomeId) return;
        fetchApi(`/appliances?home_id=${activeHomeId}`)
            .then(data => setAppliances(data))
    }, [activeHomeId])

    // Manual simulation trigger
    const handleSimulate = async () => {
        if (!activeHomeId) return;
        setIsSimulating(true)
        try {
            const data = await fetchApi(`/simulation/twin`, {
                method: "POST",
                body: JSON.stringify({ ...config, home_id: activeHomeId })
            })
            setResult(data)
        } catch (err) {
            console.error(err)
        } finally {
            setIsSimulating(false)
        }
    }

    if (!activeHomeId) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center space-y-4">
                    <h2 className="text-2xl font-bold text-slate-200">No Home Selected</h2>
                    <p className="text-slate-400">Please set up a home to access the AI digital twin.</p>
                </div>
            </div>
        )
    }

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
                        <button
                            onClick={handleSimulate}
                            disabled={isSimulating}
                            className="bg-indigo-600 hover:bg-indigo-500 text-white px-6 py-2.5 rounded-lg flex items-center justify-center gap-2 font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_25px_rgba(79,70,229,0.5)]"
                        >
                            {isSimulating ? (
                                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Play className="w-4 h-4" />
                            )}
                            {isSimulating ? "Simulating..." : "Run Simulation"}
                        </button>
                    </div>
                    <div className="flex-1 border border-slate-800 rounded-xl overflow-hidden bg-slate-900 shadow-xl relative">
                        <SimulationResults result={result} isSimulating={isSimulating} />
                    </div>
                </div>
            </div>
        </div>
    )
}
