import React from 'react';
import {
    Tv, Refrigerator, Wind, Zap, Car, Lightbulb,
    Settings, Trash2, Edit2, Info, Droplet, Fan
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const CATEGORY_STYLES: Record<string, { icon: any, color: string, bg: string }> = {
    hvac: { icon: Wind, color: 'text-accent', bg: 'bg-accent/10' },
    kitchen: { icon: Refrigerator, color: 'text-orange-500', bg: 'bg-orange-500/10' },
    entertainment: { icon: Tv, color: 'text-purple-500', bg: 'bg-purple-500/10' },
    lighting: { icon: Lightbulb, color: 'text-yellow-500', bg: 'bg-yellow-500/10' },
    laundry: { icon: Droplet, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
    ev: { icon: Car, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    other: { icon: Zap, color: 'text-gray-500', bg: 'bg-gray-500/10' }
};

export const EFFICIENCY_COLORS: Record<string, string> = {
    'A+++': 'bg-green-600 hover:bg-green-600',
    'A++': 'bg-green-500 hover:bg-green-500',
    'A+': 'bg-lime-500 hover:bg-lime-500',
    'A': 'bg-yellow-400 hover:bg-yellow-400 text-black',
    'B': 'bg-yellow-500 hover:bg-yellow-500',
    'C': 'bg-orange-500 hover:bg-orange-500',
    'D': 'bg-orange-600 hover:bg-orange-600',
    'E': 'bg-red-500 hover:bg-red-500',
    'F': 'bg-red-600 hover:bg-red-600',
    'G': 'bg-red-700 hover:bg-red-700',
};

interface ApplianceCardProps {
    appliance: any;
    onEdit?: (app: any) => void;
    onDelete?: (id: string) => void;
}

export function ApplianceCard({ appliance, onEdit, onDelete }: ApplianceCardProps) {
    const style = CATEGORY_STYLES[appliance.category] || CATEGORY_STYLES.other;
    const Icon = style.icon;

    // Calculate basic monthly consumption if not provided by simulation yet
    const monthlyKwh = ((appliance.rated_watts * appliance.usage_hours * 30) / 1000).toFixed(1);
    const costPerKwh = 8.0; // Mock rate in INR
    const monthlyCost = (parseFloat(monthlyKwh) * costPerKwh).toFixed(0);

    return (
        <Card className="hover:shadow-md transition-shadow bg-card border-border">
            <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${style.bg}`}>
                        <Icon className={`w-5 h-5 ${style.color}`} />
                    </div>
                    <div>
                        <CardTitle className="text-base font-semibold line-clamp-1" title={appliance.name}>
                            {appliance.name}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground capitalize">{appliance.category}</p>
                    </div>
                </div>
                <div className="flex gap-1">
                    {onEdit && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-accent" onClick={() => onEdit(appliance)}>
                            <Edit2 className="h-4 w-4" />
                        </Button>
                    )}
                    {onDelete && (
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-500 hover:text-red-500" onClick={() => onDelete(appliance.id)}>
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </CardHeader>

            <CardContent>
                <div className="mt-2 grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Power Rating</p>
                        <p className="text-sm font-semibold">{appliance.rated_watts} W</p>
                    </div>

                    <div className="space-y-1">
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Usage</p>
                        <p className="text-sm font-semibold">{appliance.usage_hours} hrs/day</p>
                    </div>

                    <div className="space-y-1 col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Monthly Est.</p>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-lg font-bold text-slate-900 dark:text-white">{monthlyKwh}</span>
                                    <span className="text-xs font-semibold text-slate-500">kWh</span>
                                </div>
                                <p className="text-xs font-medium text-slate-400">~ ₹{monthlyCost} / mo</p>
                            </div>

                            {appliance.efficiency_class && (
                                <div className="text-right">
                                    <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-1">Efficiency</p>
                                    <Badge className={`${EFFICIENCY_COLORS[appliance.efficiency_class] || 'bg-slate-500'} font-bold`}>
                                        {appliance.efficiency_class}
                                    </Badge>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
