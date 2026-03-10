"use client"

import { useState, useEffect } from "react"
import { BillBreakdown, ApplianceCostAttribution } from "./components/BillBreakdown"
import { TariffSelector, Tariff } from "./components/TariffSelector"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchApi } from "@/lib/api"

// Since this is a client component holding state, we fetch data on mount or when tariff changes
export default function BillingDashboardClient() {
    const [tariffs, setTariffs] = useState<Tariff[]>([])
    const [selectedTariffId, setSelectedTariffId] = useState<string>("")
    const [loading, setLoading] = useState(true)
    const [billData, setBillData] = useState<any>(null)

    useEffect(() => {
        // Fetch public tariffs on load
        async function loadInitial() {
            try {
                const tData = await fetchApi(`/billing/tariffs`)
                setTariffs(tData)
                if (tData.length > 0) {
                    setSelectedTariffId(tData[0].id)
                }
            } catch (e) {
                console.error("error fetching tariffs", e)
            }
        }
        loadInitial()
    }, [])

    useEffect(() => {
        if (!selectedTariffId) return;

        async function fetchSimulation() {
            setLoading(true)
            try {
                // Simulate via the API
                const simData = await fetchApi(`/billing/simulate`, {
                    method: 'POST',
                    body: JSON.stringify({
                        total_units: 450, // Mock usage
                        tariff_id: selectedTariffId
                    })
                })

                // MOCK appliance attribution since the simulate endpoint currently just calculates total
                // In a real flow, the /simulate or /{home_id}/{month} includes attribution if requested
                const dummyAttribution = [
                    { appliance_name: "Samsung 1.5T AC (Master Bed)", monthly_kwh: 145.2, cost_inr: simData.total_bill * 0.32, pct_of_bill: 32.2 },
                    { appliance_name: "LG Double Door Refrigerator", monthly_kwh: 95.5, cost_inr: simData.total_bill * 0.21, pct_of_bill: 21.2 },
                    { appliance_name: "Sony 55' OLED TV", monthly_kwh: 45.0, cost_inr: simData.total_bill * 0.10, pct_of_bill: 10.0 },
                    { appliance_name: "V-Guard Water Heater", monthly_kwh: 80.0, cost_inr: simData.total_bill * 0.17, pct_of_bill: 17.7 },
                    { appliance_name: "Miscellaneous (Lights)", monthly_kwh: 84.3, cost_inr: simData.total_bill * 0.18, pct_of_bill: 18.9 },
                ].sort((a, b) => b.cost_inr - a.cost_inr)

                setBillData({
                    bill: simData,
                    appliances: dummyAttribution
                })
            } catch (e) {
                console.error("error simulating", e)
            } finally {
                setLoading(false)
            }
        }

        fetchSimulation()

    }, [selectedTariffId])

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-slate-50">Tariff & Billing Estimate</h1>
                    <p className="text-slate-400 mt-1">Live simulation of your electricity costs based on DISCOM slabs.</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-6 flex flex-col">

                    {/* TOTAL CARDS */}
                    <Card className="p-6 bg-card rounded-xl border border-border flex-shrink-0">
                        <p className="text-sm font-medium text-slate-400">Monthly Projection (450 kWh)</p>

                        {loading ? (
                            <Skeleton className="h-10 w-32 mt-2 bg-slate-800" />
                        ) : (
                            <h2 className="text-4xl font-bold text-white mt-2">
                                ₹{billData?.bill?.total_bill?.toFixed(2) || '0.00'}
                            </h2>
                        )}

                        <div className="mt-4 pt-4 border-t border-slate-700/50 space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Energy Charges</span>
                                {loading ? <Skeleton className="h-4 w-16 bg-slate-800" /> : <span className="text-slate-200">₹{billData?.bill?.energy_charge?.total_energy_charge?.toFixed(2)}</span>}
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Fixed Charges</span>
                                {loading ? <Skeleton className="h-4 w-16 bg-slate-800" /> : <span className="text-slate-200">₹{billData?.bill?.fixed_charge?.toFixed(2)}</span>}
                            </div>
                            <div className="flex justify-between text-sm text-slate-500">
                                <span>Fuel Surcharge</span>
                                {loading ? <Skeleton className="h-4 w-16 bg-slate-800" /> : <span>₹{billData?.bill?.fuel_surcharge?.toFixed(2)}</span>}
                            </div>
                            <div className="flex justify-between text-sm text-slate-500">
                                <span>Electricity Duty</span>
                                {loading ? <Skeleton className="h-4 w-16 bg-slate-800" /> : <span>₹{billData?.bill?.electricity_duty?.toFixed(2)}</span>}
                            </div>
                        </div>
                    </Card>

                    {/* SELECTOR */}
                    <div className="flex-grow">
                        {tariffs.length > 0 ? (
                            <TariffSelector
                                tariffs={tariffs as Tariff[]}
                                selectedId={selectedTariffId}
                                onSelect={setSelectedTariffId}
                                isLoading={loading}
                            />
                        ) : (
                            <Skeleton className="h-[250px] w-full bg-slate-900 rounded-xl" />
                        )}
                    </div>
                </div>

                <div className="lg:col-span-2 h-full flex flex-col">
                    {loading ? (
                        <Skeleton className="h-full min-h-[400px] w-full bg-slate-900 rounded-xl" />
                    ) : (
                        <div className="flex-grow">
                            <BillBreakdown
                                bill={billData?.bill}
                                appliances={billData?.appliances || []}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
