"use client";

import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchApi } from '@/lib/api';
import { useEnergyStore } from '@/stores/useEnergyStore';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import {
    Search, Plus, Check, Trash2, Edit3, X, Zap, Loader2
} from 'lucide-react';

/* ─── Constants ─── */
const LOAD_FACTORS: Record<string, number> = {
    hvac: 0.65, kitchen: 0.90, entertainment: 0.70,
    lighting: 1.0, laundry: 0.85, ev: 0.90, other: 0.85,
};
const EFFICIENCY_COLORS: Record<string, string> = {
    'A+++': 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
    'A++': 'bg-teal-500/15 text-teal-400 border-teal-500/30',
    'A+': 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    'A': 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    'B': 'bg-orange-500/15 text-orange-400 border-orange-500/30',
    'C': 'bg-red-500/15 text-red-400 border-red-500/30',
};
const BRAND_COLORS: Record<string, string> = {
    'lg': '#A50034', 'samsung': '#1428A0', 'voltas': '#E8392A', 'daikin': '#009FE3',
    'hitachi': '#E60012', 'carrier': '#FF6A00', 'blue star': '#0072CE', 'whirlpool': '#1F3D7A',
    'panasonic': '#003DA5', 'havells': '#E31937', 'orient': '#1B4F72', 'crompton': '#F7931E',
    'bajaj': '#004B87', 'usha': '#D32F2F', 'atomberg': '#6366F1', 'syska': '#FFC107',
    'philips': '#0B69A3', 'godrej': '#008000', 'haier': '#C62828', 'bosch': '#E20015',
    'sony': '#484848', 'mi': '#FF6900', 'oneplus': '#EB0028', 'dell': '#007DB8',
    'hp': '#0096D6', 'lenovo': '#E2231A', 'asus': '#00549E', 'acer': '#83B81A',
    'apple': '#555555', 'ather': '#1ABC9C', 'tata': '#0066B3', 'ifb': '#003366',
    'preethi': '#D4145A', 'sujata': '#FF5722', 'prestige': '#8B0000', 'pigeon': '#E65100',
    'morphy richards': '#B71C1C', 'tp-link': '#4CAF50', 'netgear': '#222222', 'dyson': '#663399',
    'racold': '#FF5722', 'ao smith': '#1565C0', 'symphony': '#4FC3F7', 'ola': '#2E7D32',
    'tvs': '#1A237E', 'mg': '#CC0033', 'hyundai': '#1A3263', 'eureka forbes': '#F57C00',
    'wipro': '#3F4FA0', 'generic': '#78909C',
};
const CAT_TABS = ['all', 'hvac', 'kitchen', 'entertainment', 'lighting', 'laundry', 'ev', 'other'];
const CAT_LABELS: Record<string, string> = {
    all: 'All', hvac: 'HVAC', kitchen: 'Kitchen', entertainment: 'Entertainment',
    lighting: 'Lighting', laundry: 'Laundry', ev: 'EV', other: 'Other'
};

/* ─── Client-side cost calc ─── */
function calcMonthlyCost(watts: number, category: string, hours: number, age: number, tariff?: any): { kwh: number; cost: number } {
    const loadFactor = LOAD_FACTORS[category?.toLowerCase()] || 0.85;
    const agePenalty = 1 + (age * 0.02);
    const dailyKwh = (watts * loadFactor * hours * agePenalty) / 1000;
    const kwh = dailyKwh * 30;
    let cost = kwh * 7.5; // fallback flat rate
    if (tariff?.tariff_type === 'flat') {
        cost = kwh * (tariff.flat_rate || 7.5);
    } else if (tariff?.tariff_type === 'slab' && tariff.slab_config) {
        let remaining = kwh; cost = 0;
        for (const slab of tariff.slab_config) {
            const limit = slab.to ? slab.to - slab.from + 1 : Infinity;
            const units = Math.min(remaining, limit);
            if (units > 0) { cost += units * slab.rate; remaining -= units; }
            if (remaining <= 0) break;
        }
    }
    return { kwh, cost };
}

/* ─── Config Panel ─── */
function ConfigPanel({
    app, tariff, onClose, onAdd
}: { app: any; tariff: any; onClose: () => void; onAdd: (hours: number, age: number, qty: number) => void }) {
    const [hours, setHours] = useState(app.typical_usage_hours || 4);
    const [age, setAge] = useState(0);
    const [modalQty, setModalQty] = useState(1);
    const { kwh, cost } = calcMonthlyCost(app.rated_watts, app.category, hours, age, tariff);
    const brandColor = BRAND_COLORS[app.brand?.toLowerCase()] || '#F59E0B';

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-4">
            <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-card border border-border/50 rounded-2xl p-6 shadow-2xl">
                {/* Header */}
                <div className="flex items-start gap-4 mb-6">
                    <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white text-lg font-medium tracking-tight shrink-0 shadow-sm"
                        style={{ backgroundColor: brandColor }}>
                        {app.brand?.charAt(0) || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="font-medium tracking-tight text-foreground text-base">{app.brand}</p>
                        <p className="text-muted-foreground text-sm truncate font-light">{app.model_name || app.appliance_type}</p>
                        <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded border mt-1 ${EFFICIENCY_COLORS[app.efficiency_class] || EFFICIENCY_COLORS['A']}`}>
                            {app.efficiency_class} • {app.rated_watts}W
                        </span>
                    </div>
                    <button onClick={onClose} className="text-muted-foreground hover:text-foreground transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Hours slider */}
                <div className="mb-5">
                    <div className="flex justify-between mb-2">
                        <label className="text-sm text-foreground font-medium">Hours per day</label>
                        <span className="text-primary font-medium text-sm">{hours} hrs</span>
                    </div>
                    <input type="range" min="0.5" max="24" step="0.5" value={hours}
                        onChange={e => setHours(Number(e.target.value))}
                        className="w-full h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary" />
                    <div className="flex justify-between text-xs text-muted-foreground mt-1 font-light"><span>0.5</span><span>24</span></div>
                </div>

                {/* Age picker */}
                <div className="mb-6">
                    <div className="flex justify-between mb-2">
                        <label className="text-sm text-foreground font-medium">Appliance age</label>
                        <span className="text-primary font-medium text-sm">{age} yrs</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button type="button" onClick={() => setAge(a => Math.max(0, a - 1))}
                            className="w-9 h-9 rounded-lg bg-secondary border border-border/50 text-foreground hover:border-primary/40 transition-all flex items-center justify-center font-medium text-lg">−</button>
                        <div className="flex-1 h-2 bg-secondary rounded-full overflow-hidden">
                            <div className="h-full bg-primary/40 rounded-full transition-all" style={{ width: `${(age / 20) * 100}%` }} />
                        </div>
                        <button type="button" onClick={() => setAge(a => Math.min(20, a + 1))}
                            className="w-9 h-9 rounded-lg bg-secondary border border-border/50 text-foreground hover:border-primary/40 transition-all flex items-center justify-center font-medium text-lg">+</button>
                        <span className="w-12 text-center text-foreground font-medium">{age} yrs</span>
                    </div>
                </div>

                {/* Quantity selector */}
                <div className="flex items-center justify-between mt-4">
                  <span className="text-muted-foreground font-medium text-sm">Quantity</span>
                  <div className="flex items-center gap-3 bg-secondary/50 border border-border/50 rounded-xl px-3 py-1.5">
                    <button
                      onClick={() => setModalQty(q => Math.max(1, q - 1))}
                      className="text-muted-foreground hover:text-foreground text-xl leading-none w-6 h-6 flex items-center justify-center"
                    >−</button>
                    <span className="text-foreground font-medium w-6 text-center">{modalQty}</span>
                    <button
                      onClick={() => setModalQty(q => Math.min(20, q + 1))}
                      className="text-muted-foreground hover:text-foreground text-xl leading-none w-6 h-6 flex items-center justify-center"
                    >+</button>
                  </div>
                </div>

                {/* Live preview */}
                <div className="bg-secondary/30 border border-border/50 rounded-xl p-4 mb-6 mt-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-xs text-muted-foreground font-light">Monthly consumption</p>
                            <p className="text-lg font-medium tracking-tight text-foreground">{(kwh * modalQty).toFixed(1)} kWh</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground font-light">Estimated cost</p>
                            <p className="text-lg font-medium tracking-tight text-primary">₹{(cost * modalQty).toLocaleString()}/mo</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button onClick={onClose} className="flex-1 py-3 border border-border/50 text-muted-foreground rounded-xl hover:border-border hover:text-foreground transition-colors text-sm font-medium">Cancel</button>
                    <button onClick={() => onAdd(hours, age, modalQty)} className="flex-1 py-3 bg-primary hover:scale-[1.02] text-primary-foreground font-medium rounded-xl transition-all shadow-sm text-sm">
                        ✓ Add to My Home
                    </button>
                </div>
            </div>
        </div>
    );
}

/* ─── My Appliance Card ─── */
function MyApplianceCard({ app, tariff, onDelete, onEdit }: any) {
    const [editing, setEditing] = useState(false);
    const [localHours, setLocalHours] = useState(app.usage_hours_per_day || app.usage_hours || 4);
    const queryClient = useQueryClient();
    const { kwh, cost } = calcMonthlyCost(app.rated_watts, app.category, localHours, app.age_years || 0, tariff);

    const editMutation = useMutation({
        mutationFn: () => fetchApi(`/appliances/${app.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ usage_hours_per_day: localHours }),
        }),
        onSuccess: () => {
            toast.success('Usage updated!');
            queryClient.invalidateQueries({ queryKey: ['home_dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['my_appliances'] });
            setEditing(false);
        },
        onError: () => toast.error('Failed to update.'),
    });

    const brandColor = BRAND_COLORS[app.brand?.toLowerCase()] || '#F59E0B';

    return (
        <div className="bg-card border border-border/50 rounded-2xl p-4 hover:border-primary/20 transition-all shadow-sm">
            <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-medium tracking-tight shrink-0 shadow-sm"
                    style={{ backgroundColor: brandColor }}>
                    {app.brand?.charAt(0) || '?'}
                </div>
                <div className="flex-1 min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{app.brand} {app.model_name || ''}</p>
                    <p className="text-muted-foreground font-light text-xs capitalize">{app.category} • {app.rated_watts}W</p>
                </div>
                <div className="flex gap-1">
                    <button onClick={() => setEditing(e => !e)} className="p-1.5 text-muted-foreground hover:text-primary transition-colors"><Edit3 className="w-3.5 h-3.5" /></button>
                    <button onClick={() => onDelete(app.id)} className="p-1.5 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
            </div>

            {editing ? (
                <div className="mt-2">
                    <div className="flex justify-between mb-1">
                        <span className="text-xs text-muted-foreground font-light">Hours/day</span>
                        <span className="text-xs text-primary font-medium">{localHours}h</span>
                    </div>
                    <input type="range" min="0.5" max="24" step="0.5" value={localHours}
                        onChange={e => setLocalHours(Number(e.target.value))}
                        className="w-full h-1.5 bg-secondary rounded-full appearance-none cursor-pointer accent-primary mb-2" />
                    <button onClick={() => editMutation.mutate()} disabled={editMutation.isPending}
                        className="w-full py-2 bg-primary text-primary-foreground text-xs font-medium rounded-lg hover:scale-[1.02] transition-all flex items-center justify-center gap-1 shadow-sm">
                        {editMutation.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Save
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-2 mt-2">
                    <div className="bg-secondary/50 rounded-lg p-2 border border-border/30">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Monthly</p>
                        <p className="text-sm font-medium tracking-tight text-foreground">{kwh.toFixed(1)} kWh</p>
                    </div>
                    <div className="bg-secondary/50 rounded-lg p-2 border border-border/30">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-0.5">Cost</p>
                        <p className="text-sm font-medium tracking-tight text-primary">₹{cost.toFixed(0)}</p>
                    </div>
                </div>
            )}
        </div>
    );
}

/* ─── Main Page ─── */
export default function AppliancesPage() {
    const { activeHomeId, activeHome } = useEnergyStore();
    const router = useRouter();
    const queryClient = useQueryClient();

    const [category, setCategory] = useState('all');
    const [search, setSearch] = useState('');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [configuringApp, setConfiguringApp] = useState<any>(null);
    const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
    const [library, setLibrary] = useState<any[]>([]);
    const [libLoading, setLibLoading] = useState(true);

    /* ─── Fetch library ─── */
    useEffect(() => {
        const loadLibrary = async () => {
            try {
                setLibLoading(true);
                const data = await fetchApi('/appliances/library');
                console.log('Library loaded:', data.length, 'items');
                setLibrary(Array.isArray(data) ? data : []);
            } catch (err) {
                console.error('Failed to load library:', err);
            } finally {
                setLibLoading(false);
            }
        };
        loadLibrary();
    }, []);

    /* ─── Fetch my appliances ─── */
    const { data: myAppliances = [], isLoading: myLoading } = useQuery({
        queryKey: ['my_appliances', activeHomeId],
        queryFn: () => fetchApi(`/appliances/?home_id=${activeHomeId}`),
        enabled: !!activeHomeId,
        staleTime: 2 * 60 * 1000,
    });

    /* ─── Fetch tariff for cost preview ─── */
    const { data: tariffData } = useQuery({
        queryKey: ['tariff_detail', activeHome?.tariff_id],
        queryFn: () => fetchApi(`/billing/tariffs/${activeHome?.tariff_id}`),
        enabled: !!activeHome?.tariff_id,
        staleTime: 60 * 60 * 1000,
    });

    const isFirstTime = myAppliances.length === 0 && !myLoading;

    /* ─── Filter library ─── */
    const filtered = useMemo(() => {
        let res: any[] = library;
        if (category !== 'all') {
            res = res.filter((a: any) => a.category === category);
        }
        if (search.trim()) {
            const q = search.toLowerCase();
            res = res.filter((a: any) =>
                (a.brand || '').toLowerCase().includes(q) ||
                (a.appliance_type || '').toLowerCase().includes(q) ||
                (a.model_name || '').toLowerCase().includes(q)
            );
        }
        return res;
    }, [library, category, search]);

    /* ─── Add appliance mutation ─── */
    const addMutation = useMutation({
        mutationFn: ({ app, hours, age }: { app: any; hours: number; age: number }) =>
            fetchApi('/appliances/', {
                method: 'POST',
                body: JSON.stringify({
                    home_id: activeHomeId,
                    name: app.model_name || app.appliance_type || 'Appliance',
                    brand: app.brand || 'Generic',
                    category: app.category,
                    rated_watts: app.rated_watts,
                    standby_watts: app.standby_watts || 0,
                    efficiency_class: app.efficiency_class || 'A',
                    age_years: age,
                    usage_hours: hours,
                }),
            }),
        onSuccess: (_, { app }) => {
            toast.success(`${app.brand} ${app.appliance_type || ''} added!`);
            setAddedIds(prev => new Set([...prev, app.id]));
            setConfiguringApp(null);
            queryClient.invalidateQueries({ queryKey: ['my_appliances'] });
            queryClient.invalidateQueries({ queryKey: ['home_dashboard'] });
        },
        onError: () => toast.error('Failed to add appliance.'),
    });

    /* ─── Delete mutation ─── */
    const deleteMutation = useMutation({
        mutationFn: (id: string) => fetchApi(`/appliances/${id}`, { method: 'DELETE' }),
        onSuccess: () => {
            toast.success('Appliance removed.');
            queryClient.invalidateQueries({ queryKey: ['my_appliances'] });
            queryClient.invalidateQueries({ queryKey: ['home_dashboard'] });
        },
        onError: () => toast.error('Failed to remove appliance.'),
    });

    const handleConfirmAdd = async (hours: number, age: number, qty: number = 1) => {
        if (!configuringApp || !activeHomeId) return;
        
        // Loop qty times
        for (let i = 0; i < qty; i++) {
            await addMutation.mutateAsync({ app: configuringApp, hours, age });
        }
    };

    return (
        <div className="space-y-8 pb-16">
            {/* ─── First-time banner ─── */}
            {isFirstTime && (
                <div className="bg-primary/10 border border-primary/20 rounded-2xl p-5 flex items-start gap-4">
                    <Zap className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium tracking-tight text-primary">👋 Welcome! Select your appliances below</p>
                        <p className="text-primary/70 text-sm mt-0.5 font-light">Add your home appliances to activate your energy dashboard and see your bill prediction.</p>
                    </div>
                </div>
            )}

            {/* ─── My Appliances (returning users) ─── */}
            {myAppliances.length > 0 && (
                <div>
                    <h2 className="text-xl font-medium tracking-tight text-foreground mb-4 flex items-center gap-2">
                        <Check className="w-5 h-5 text-emerald-400" /> My Home Appliances
                        <span className="text-sm font-light text-muted-foreground">({myAppliances.length} devices)</span>
                    </h2>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {myAppliances.map((app: any) => (
                            <MyApplianceCard key={app.id} app={app} tariff={tariffData}
                                onDelete={(id: string) => setDeleteConfirmId(id)}
                                onEdit={() => { }} />
                        ))}
                    </div>
                    {/* Done button — right below the user's appliances */}
                    <div className="flex justify-center mt-6">
                        <button
                            onClick={() => router.push('/overview')}
                            className="px-8 py-3 bg-primary text-primary-foreground font-medium rounded-full flex items-center gap-2 hover:scale-105 transition-all text-sm shadow-sm"
                        >
                            Done — View My Dashboard <span>→</span>
                        </button>
                    </div>
                </div>
            )}

            {/* ─── Library Section ─── */}
            <div>
                <h2 className="text-xl font-medium tracking-tight text-foreground mb-4">Appliance Library</h2>

                {/* Filter tabs */}
                <div className="flex overflow-x-auto gap-2 pb-2 mb-4 no-scrollbar">
                    {CAT_TABS.map(c => (
                        <button key={c} onClick={() => setCategory(c)}
                            className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-all ${category === c ? 'bg-primary text-primary-foreground shadow-sm' : 'bg-card border border-border/50 text-muted-foreground hover:text-foreground hover:border-border'}`}>
                            {CAT_LABELS[c]}
                        </button>
                    ))}
                </div>

                {/* Search */}
                <div className="relative mb-5">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <input type="text" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by brand or appliance type..."
                        className="w-full bg-card border border-border/50 rounded-xl pl-10 pr-4 py-3 text-sm font-light text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary/40 transition-colors shadow-sm" />
                </div>

                {/* Library grid */}
                {libLoading ? (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Array(9).fill(0).map((_, i) => (
                            <div key={i} className="bg-card border border-border/50 rounded-2xl p-4 animate-pulse h-28" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16 text-muted-foreground font-light">
                        <Search className="w-8 h-8 mx-auto mb-3 opacity-40" />
                        <p>No appliances found. Try a different search.</p>
                    </div>
                ) : (
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {filtered.map((app: any) => {
                            const brandColor = BRAND_COLORS[app.brand?.toLowerCase()] || '#F59E0B';
                            const effClass = EFFICIENCY_COLORS[app.efficiency_class] || EFFICIENCY_COLORS['A'];
                            const isAdded = addedIds.has(app.id);
                            return (
                                <div key={app.id} className={`bg-card border rounded-2xl p-4 transition-all shadow-sm ${isAdded ? 'border-emerald-500/40 bg-emerald-500/5' : 'border-border/50 hover:border-primary/20'}`}>
                                    <div className="flex items-start gap-3 mb-3">
                                        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white text-sm font-medium tracking-tight shrink-0 shadow-sm"
                                            style={{ backgroundColor: brandColor }}>
                                            {app.brand?.charAt(0) || '?'}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium tracking-tight text-foreground text-sm truncate">{app.brand}</p>
                                            <p className="text-muted-foreground text-xs truncate font-light">{app.model_name}</p>
                                            <p className="text-muted-foreground/80 text-xs font-light">{app.appliance_type}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <span className="text-xs font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded border border-border/30">{app.rated_watts}W</span>
                                        <span className={`text-xs font-medium px-2 py-0.5 rounded border ${effClass}`}>{app.efficiency_class}</span>
                                    </div>
                                    {isAdded ? (
                                        <div className="flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                                            <Check className="w-4 h-4" /> Added ✓
                                        </div>
                                    ) : (
                                        <button onClick={() => setConfiguringApp(app)}
                                            className="w-full py-2 text-sm font-medium text-primary border border-primary/20 rounded-xl hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all flex items-center justify-center gap-1 shadow-sm">
                                            <Plus className="w-3.5 h-3.5" /> Add to Home
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>


            {/* Config panel modal */}
            {configuringApp && (
                <ConfigPanel
                    app={configuringApp}
                    tariff={tariffData}
                    onClose={() => setConfiguringApp(null)}
                    onAdd={handleConfirmAdd}
                />
            )}

            {/* Delete confirmation modal */}
            {deleteConfirmId && (
                <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 px-4">
                    <div className="bg-card border border-border/50 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
                        <h3 className="text-foreground font-medium tracking-tight text-lg mb-2">Remove Appliance?</h3>
                        <p className="text-muted-foreground text-sm font-light mb-6">This appliance will be removed from your home.</p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setDeleteConfirmId(null)}
                                className="flex-1 px-4 py-2.5 rounded-xl border border-border/50 text-muted-foreground font-medium text-sm hover:bg-secondary hover:text-foreground transition-colors shadow-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => {
                                    deleteMutation.mutate(deleteConfirmId);
                                    setDeleteConfirmId(null);
                                }}
                                className="flex-1 px-4 py-2.5 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 font-medium text-sm transition-colors shadow-sm"
                            >
                                Remove
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`.no-scrollbar::-webkit-scrollbar { display: none; } .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }`}</style>
        </div>
    );
}
