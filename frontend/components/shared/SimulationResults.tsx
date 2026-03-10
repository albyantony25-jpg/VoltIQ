import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { ArrowDown, ArrowUp, Zap, TreePine, Banknote, ShieldCheck } from 'lucide-react';

export const SimulationResults = ({ result, isSimulating }: { result: any, isSimulating: boolean }) => {
    if (!result) return (
        <div className="w-full h-full flex flex-col items-center justify-center text-slate-500 bg-slate-900 border border-slate-800 rounded-xl p-8">
            <Zap className="w-12 h-12 text-slate-700 mb-4" />
            <h3 className="text-xl font-bold text-slate-300">Run a Simulation</h3>
            <p className="text-slate-500 max-w-sm text-center">Modify your appliances or add solar in the Scenario Builder to see instant ROI projections here.</p>
        </div>
    );

    const isSaving = result.delta.money_saved_inr > 0;
    const isScoreImproving = result.delta.score_improvement > 0;

    return (
        <div className="w-full h-full flex flex-col gap-6 relative">
            {isSimulating && (
                <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex flex-col justify-center items-center rounded-xl border border-indigo-500/50">
                    <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
                    <p className="text-indigo-400 font-semibold animate-pulse">Running Physics Engine...</p>
                </div>
            )}

            {/* Headline KPIs */}
            <div className="flex gap-4">
                <div className={`flex-1 p-6 rounded-xl border ${isSaving ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-rose-500/10 border-rose-500/20'}`}>
                    <div className="flex items-center gap-2 mb-2">
                        <Banknote className={`w-5 h-5 ${isSaving ? 'text-emerald-500' : 'text-rose-500'}`} />
                        <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-300">Net Impact</h3>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className={`text-3xl font-bold ${isSaving ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isSaving ? '-' : '+'}₹{Math.abs(result.delta.money_saved_inr)}
                        </span>
                        <span className="text-slate-500 text-sm">/ month</span>
                    </div>
                </div>

                <div className="flex-1 bg-slate-900 border border-slate-800 p-6 rounded-xl transition-all">
                    <div className="flex justify-between items-end">
                        <div>
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">Carbon Avoided</h3>
                            <div className="flex items-baseline gap-2">
                                <span className="text-2xl font-bold text-teal-400">{result.delta.co2_saved_kg} kg</span>
                            </div>
                        </div>
                        <TreePine className="w-8 h-8 text-teal-500/50" />
                    </div>
                </div>

                <div className="flex-1 bg-slate-900 border border-slate-800 p-6 rounded-xl transition-all">
                    <div className="flex justify-between items-end">
                        <div>
                            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-2">Efficiency Score</h3>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl font-bold text-white">{result.simulated.efficiency_score}</span>
                                {isScoreImproving && (
                                    <span className="flex items-center text-emerald-400 text-sm bg-emerald-500/10 px-2 py-1 rounded">
                                        <ArrowUp className="w-3 h-3 mr-1" /> {result.delta.score_improvement}
                                    </span>
                                )}
                            </div>
                        </div>
                        <ShieldCheck className="w-8 h-8 text-indigo-500/50" />
                    </div>
                </div>
            </div>

            {/* Side by side comparison */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 p-6 rounded-xl border border-slate-800">
                    <h4 className="text-slate-400 font-semibold mb-4 text-sm tracking-wider">Current Baseline</h4>
                    <div className="space-y-4">
                        <div className="flex justify-between border-b border-slate-800 pb-2">
                            <span className="text-slate-500 text-sm">Monthly Consumption</span>
                            <span className="text-white font-medium">{result.baseline.monthly_kwh} kWh</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-500 text-sm">Estimated Bill</span>
                            <span className="text-white font-medium">₹{result.baseline.monthly_bill_inr}</span>
                        </div>
                    </div>
                </div>

                <div className="bg-indigo-950/30 p-6 rounded-xl border border-indigo-500/20 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500"></div>
                    <h4 className="text-indigo-400 font-semibold mb-4 text-sm tracking-wider">Simulated Future</h4>
                    <div className="space-y-4">
                        <div className="flex justify-between border-b border-indigo-500/20 pb-2">
                            <span className="text-slate-400 text-sm">Monthly Consumption</span>
                            <span className="text-white font-bold">{result.simulated.monthly_kwh} kWh</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-slate-400 text-sm">Estimated Bill</span>
                            <span className="text-white font-bold">₹{result.simulated.monthly_bill_inr}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 flex-1 min-h-[300px]">
                <h4 className="text-slate-300 font-semibold mb-6">Projection: Baseline vs Twin</h4>
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={result.month_by_month} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                        <XAxis dataKey="month" stroke="#666" tick={{ fill: '#888', fontSize: 12 }} />
                        <YAxis stroke="#666" tick={{ fill: '#888', fontSize: 12 }} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff' }}
                            itemStyle={{ color: '#e2e8f0' }}
                        />
                        <Legend wrapperStyle={{ paddingTop: '20px' }} />
                        <Line type="monotone" dataKey="baseline_kwh" name="Current Baseline (kWh)" stroke="#64748b" strokeWidth={2} dot={false} strokeDasharray="5 5" />
                        <Line type="monotone" dataKey="simulated_kwh" name="Digital Twin (kWh)" stroke="#6366f1" strokeWidth={3} dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }} activeDot={{ r: 6 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            {/* Recommendations / ROI */}
            {result.annual_projection.roi_months_if_investment && (
                <div className="bg-slate-900 p-4 rounded-lg flex items-center justify-between border border-emerald-500/20">
                    <span className="text-sm text-emerald-400">Total Investment Payback Period estimated at <strong>{Math.round(result.annual_projection.roi_months_if_investment / 12 * 10) / 10} years</strong>.</span>
                    <button className="text-sm bg-slate-800 hover:bg-slate-700 text-white px-4 py-2 rounded transition-colors">Save Scenario</button>
                </div>
            )}
            {!result.annual_projection.roi_months_if_investment && (
                <div className="bg-slate-900 p-4 rounded-lg flex items-center justify-end border border-slate-800">
                    <button className="text-sm bg-slate-800 hover:bg-indigo-600 text-white px-4 py-2 rounded transition-colors">Save Scenario</button>
                </div>
            )}
        </div>
    )
}
