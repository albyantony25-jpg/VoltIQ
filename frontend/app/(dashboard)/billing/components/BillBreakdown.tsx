"use client"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

export type BillResult = {
    energy_charge: {
        total_energy_charge: number;
        slabs: any[];
    }
    fixed_charge: number;
    fuel_surcharge: number;
    electricity_duty: number;
    total_bill: number;
};

export type ApplianceCostAttribution = {
    appliance_name: string;
    monthly_kwh: number;
    cost_inr: number;
    pct_of_bill: number;
};

interface BillBreakdownProps {
    bill: BillResult;
    appliances: ApplianceCostAttribution[];
}

export function BillBreakdown({ bill, appliances }: BillBreakdownProps) {
    return (
        <Card className="border-slate-800 bg-card h-full">
            <CardHeader>
                <CardTitle className="text-xl">Itemized Appliance Breakdown</CardTitle>
                <CardDescription>Estimated cost attribution per appliance for this month</CardDescription>
            </CardHeader>
            <CardContent>
                {appliances.length === 0 ? (
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/20 rounded-lg border border-dashed border-slate-700">
                        <p className="text-slate-400">No active appliances found.</p>
                        <p className="text-sm text-slate-500 mt-1">Add appliances in the inventory to see cost attribution.</p>
                    </div>
                ) : (
                    <Table>
                        <TableHeader>
                            <TableRow className="border-slate-800 hover:bg-transparent">
                                <TableHead className="text-slate-400">Appliance</TableHead>
                                <TableHead className="text-right text-slate-400">Usage (kWh)</TableHead>
                                <TableHead className="text-right text-slate-400">% of Bill</TableHead>
                                <TableHead className="text-right text-emerald-400">Est. Cost</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {appliances.map((app, idx) => (
                                <TableRow key={idx} className="border-slate-800/50 hover:bg-slate-800/30">
                                    <TableCell className="font-medium text-slate-300">{app.appliance_name}</TableCell>
                                    <TableCell className="text-right text-slate-400">{app.monthly_kwh.toFixed(1)}</TableCell>
                                    <TableCell className="text-right text-slate-400">
                                        <Badge variant="outline" className="text-xs bg-slate-900 border-slate-700 font-mono">
                                            {app.pct_of_bill.toFixed(1)}%
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right font-semibold text-slate-200">
                                        ₹{app.cost_inr.toFixed(2)}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                )}
            </CardContent>
        </Card>
    )
}
