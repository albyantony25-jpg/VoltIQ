import React, { useState, useEffect } from 'react';
import { Settings, Plus, Sun, MinusCircle } from 'lucide-react';

export const ScenarioBuilder = ({ appliances, config, setConfig }: { appliances: any[], config: any, setConfig: (c: any) => void }) => {

    const handleApplianceChange = (id: string, field: string, value: any) => {
        const existingChange = config.changes.find((c: any) => c.appliance_id === id);
        let newChanges = [...config.changes];

        if (existingChange) {
            newChanges = newChanges.map(c => c.appliance_id === id ? { ...c, [field]: value } : c);
        } else {
            newChanges.push({ appliance_id: id, [field]: value });
        }

        setConfig({ ...config, changes: newChanges });
    };

    const handleRemoveToggle = (id: string) => {
        const existingChange = config.changes.find((c: any) => c.appliance_id === id);
        let newChanges = [...config.changes];

        if (existingChange) {
            newChanges = newChanges.map(c => c.appliance_id === id ? { ...c, remove: !c.remove } : c);
        } else {
            newChanges.push({ appliance_id: id, remove: true });
        }

        setConfig({ ...config, changes: newChanges });
    };

    const handleSolarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setConfig({ ...config, add_solar_kwp: val > 0 ? val : null });
    };

    return (
        <div className="w-full space-y-8 max-h-[calc(100vh-140px)] overflow-y-auto pr-2 custom-scrollbar">

            {/* Context Section */}
            <div className="space-y-4">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-2">Simulation Engine</h3>

                <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <label className="text-sm font-medium text-slate-300 block mb-1">Scenario Name</label>
                    <input
                        type="text"
                        value={config.scenario_name}
                        onChange={(e) => setConfig({ ...config, scenario_name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-indigo-500"
                    />
                </div>

                <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                    <label className="text-sm font-medium text-slate-300 block mb-1">Projection Range (Months)</label>
                    <select
                        value={config.target_months}
                        onChange={(e) => setConfig({ ...config, target_months: parseInt(e.target.value) })}
                        className="w-full bg-slate-950 border border-slate-700 rounded px-3 py-2 text-white outline-none focus:border-indigo-500"
                    >
                        <option value={1}>1 Month (Immediate)</option>
                        <option value={3}>3 Months (Quarterly)</option>
                        <option value={6}>6 Months (Half Year)</option>
                        <option value={12}>12 Months (Annual)</option>
                    </select>
                </div>
            </div>

            {/* Solar Overlays */}
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <Sun className="w-4 h-4 text-yellow-500" />
                        Solar Overlay
                    </h3>
                </div>

                <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 space-y-4">
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-300">System Size (kWp)</span>
                        <span className="text-indigo-400 font-bold">{config.add_solar_kwp || 0} kWp</span>
                    </div>
                    <input
                        type="range"
                        min="0" max="15" step="0.5"
                        value={config.add_solar_kwp || 0}
                        onChange={handleSolarChange}
                        className="w-full accent-indigo-500"
                    />
                    <p className="text-xs text-slate-500">
                        Generates approx. ~{Math.round((config.add_solar_kwp || 0) * 4.5 * 30)} kWh / month based on your region's historical irradiation data.
                    </p>
                </div>
            </div>

            {/* Existing Appliances */}
            <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Existing Appliances
                    </h3>
                </div>

                <div className="space-y-3">
                    {appliances.map(app => {
                        const change = config.changes.find((c: any) => c.appliance_id === app.id);
                        const isRemoved = change?.remove || false;
                        const currUsage = change?.new_usage_hours ?? app.usage_hours;
                        const currEff = change?.new_efficiency_class ?? app.efficiency_class;

                        return (
                            <div key={app.id} className={`p-4 rounded-lg border transition-all ${isRemoved ? 'bg-slate-900/50 border-rose-500/20 opacity-50' : 'bg-slate-900 border-slate-800'}`}>
                                <div className="flex justify-between items-start mb-3">
                                    <div>
                                        <h4 className={`text-sm font-semibold ${isRemoved ? 'line-through text-slate-500' : 'text-slate-200'}`}>{app.name}</h4>
                                        <p className="text-xs text-slate-500">{app.category} • {app.rated_watts}W</p>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveToggle(app.id)}
                                        className={`p-1.5 rounded-md transition-colors ${isRemoved ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-800 text-slate-400 hover:text-rose-400'}`}
                                    >
                                        <MinusCircle className="w-4 h-4" />
                                    </button>
                                </div>

                                {!isRemoved && (
                                    <div className="space-y-3">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-500 w-16">Usage (hrs)</span>
                                            <input
                                                type="range" min="0" max="24" step="0.5"
                                                value={currUsage}
                                                onChange={(e) => handleApplianceChange(app.id, 'new_usage_hours', parseFloat(e.target.value))}
                                                className="flex-1 accent-indigo-500"
                                            />
                                            <span className="text-xs text-slate-300 w-8">{currUsage}</span>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-slate-500 w-16">Efficiency</span>
                                            <select
                                                value={currEff}
                                                onChange={(e) => handleApplianceChange(app.id, 'new_efficiency_class', e.target.value)}
                                                className="flex-1 bg-slate-950 border border-slate-700 rounded px-2 py-1 text-xs text-white outline-none focus:border-indigo-500"
                                            >
                                                <option value="A+++">A+++ (Highly Efficient)</option>
                                                <option value="A++">A++</option>
                                                <option value="A+">A+</option>
                                                <option value="A">A (Standard)</option>
                                                <option value="B">B</option>
                                                <option value="C">C</option>
                                                <option value="D">D (Inefficient)</option>
                                                <option value="G">G (Legacy)</option>
                                            </select>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Quick Add Form Placeholder */}
            <div>
                <button className="w-full py-3 border border-dashed border-slate-700 text-slate-400 rounded-lg hover:border-indigo-500 hover:text-indigo-400 transition-colors flex items-center justify-center gap-2 text-sm">
                    <Plus className="w-4 h-4" /> Add Virtual Appliance
                </button>
            </div>

        </div>
    )
}
