"use client";

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Zap, Check, ChevronRight, Home, Building2, TreePine, LayoutGrid } from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase-browser';
import { fetchApi } from '@/lib/api';
import { useEnergyStore } from '@/stores/useEnergyStore';
import { toast } from 'sonner';

const HOME_TYPES = [
    { id: 'apartment', label: 'Apartment', icon: Building2, emoji: '🏢' },
    { id: 'villa', label: 'Villa', icon: Home, emoji: '🏠' },
    { id: 'bungalow', label: 'Bungalow', icon: TreePine, emoji: '🏡' },
    { id: 'row_house', label: 'Row House', icon: LayoutGrid, emoji: '🏘' },
];

function Stepper({ current }: { current: number }) {
    return (
        <div className="flex items-center gap-2 mb-10">
            {[1, 2].map(n => (
                <div key={n} className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-all ${current >= n ? 'bg-amber-500 text-black' : 'bg-[#1a1a1a] text-neutral-500'}`}>
                        {current > n ? <Check className="w-4 h-4" /> : n}
                    </div>
                    <span className={`text-xs font-medium ${current >= n ? 'text-white' : 'text-neutral-600'}`}>
                        {n === 1 ? 'Home Details' : 'Tariff Plan'}
                    </span>
                    {n < 2 && <div className={`w-12 h-px ${current > n ? 'bg-amber-500' : 'bg-[#1e1e1e]'}`} />}
                </div>
            ))}
        </div>
    );
}

function NumericInput({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
    return (
        <div>
            <label className="block text-xs font-medium text-neutral-400 mb-1.5">{label}</label>
            <div className="flex items-center gap-2">
                <button type="button" onClick={() => onChange(Math.max(min, value - 1))}
                    className="w-9 h-9 rounded-lg bg-[#1a1a1a] border border-[#252525] text-white hover:bg-[#222] hover:border-amber-500/40 transition-all flex items-center justify-center text-lg font-bold">−</button>
                <span className="w-12 text-center text-white font-bold text-lg">{value}</span>
                <button type="button" onClick={() => onChange(Math.min(max, value + 1))}
                    className="w-9 h-9 rounded-lg bg-[#1a1a1a] border border-[#252525] text-white hover:bg-[#222] hover:border-amber-500/40 transition-all flex items-center justify-center text-lg font-bold">+</button>
            </div>
        </div>
    );
}

export default function SetupPage() {
    const router = useRouter();
    const { setActiveHome, setActiveHomeId } = useEnergyStore();
    const [step, setStep] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [tariffs, setTariffs] = useState<any[]>([]);
    const [loadingTariffs, setLoadingTariffs] = useState(false);
    const supabase = createBrowserClient();

    // Form state
    const [homeName, setHomeName] = useState('My Home');
    const [homeType, setHomeType] = useState('apartment');
    const [city, setCity] = useState('');
    const [bedrooms, setBedrooms] = useState(2);
    const [occupants, setOccupants] = useState(3);
    const [area, setArea] = useState('');
    const [tariffId, setTariffId] = useState('');

    // Auth check
    useEffect(() => {
        const check = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) router.push('/login');
        };
        check();
    }, [supabase, router]);

    // Load tariffs on step 2
    useEffect(() => {
        if (step !== 2 || tariffs.length > 0) return;
        setLoadingTariffs(true);
        fetch('http://localhost:8000/api/v1/tariffs/')
            .then(res => res.json())
            .then(data => setTariffs(Array.isArray(data) ? data : []))
            .catch((err) => {
                console.error("Tariff fetch error:", err);
                toast.error('Could not load tariffs.');
            })
            .finally(() => setLoadingTariffs(false));
    }, [step, tariffs.length]);

    const goToStep2 = () => {
        if (!homeName.trim()) { toast.error('Please enter a home name.'); return; }
        if (!city.trim()) { toast.error('Please enter your city.'); return; }
        setStep(2);
    };

    const handleSubmit = async () => {
        if (!tariffId) { toast.error('Please select a tariff plan.'); return; }
        setIsSubmitting(true);
        try {
            const supabase = createBrowserClient()
            const { data: { session } } = await supabase.auth.getSession()
            
            const res = await fetch('http://localhost:8000/api/v1/homes/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session?.access_token}`
                },
                body: JSON.stringify({
                    name: homeName,
                    home_type: homeType,
                    city: city,
                    bedrooms: Number(bedrooms),
                    occupants: Number(occupants),
                    area_sqft: area ? Number(area) : null,
                    tariff_id: tariffId
                })
            })
            
            if (!res.ok) {
                const err = await res.text()
                console.error('Failed:', err)
                toast.error('Failed to create home: ' + err)
                setIsSubmitting(false)
                return
            }
            
            const home = await res.json()
            useEnergyStore.getState().setActiveHome(home)
            window.location.href = '/overview'
            
        } catch (err: any) {
            toast.error(err.message || 'Failed to create home. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4 py-12 relative overflow-hidden">
            {/* Glow */}
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

            <div className="w-full max-w-xl relative z-10">
                {/* Logo */}
                <div className="flex items-center gap-2 mb-8">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                        <Zap className="w-5 h-5 text-black fill-black" />
                    </div>
                    <span className="font-bold text-lg text-white">Volt<span className="text-amber-400">IQ</span></span>
                </div>

                <Stepper current={step} />

                {/* ─── STEP 1: Home Details ─── */}
                {step === 1 && (
                    <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-8">
                        <h1 className="text-2xl font-bold text-white mb-1">Tell us about your home</h1>
                        <p className="text-neutral-500 text-sm mb-8">This helps us calculate accurate energy estimates</p>

                        <div className="space-y-6">
                            {/* Home Name */}
                            <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Home Name</label>
                                <input
                                    value={homeName} onChange={e => setHomeName(e.target.value)}
                                    className="w-full bg-[#0a0a0a] border border-[#252525] rounded-xl px-4 py-3 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-amber-500/60 transition-colors"
                                    placeholder="e.g. My Home, Sharma Residence"
                                />
                            </div>

                            {/* Home Type */}
                            <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-2">Home Type</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {HOME_TYPES.map(t => (
                                        <button key={t.id} type="button" onClick={() => setHomeType(t.id)}
                                            className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all text-sm font-medium ${homeType === t.id ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-[#252525] bg-[#0a0a0a] text-neutral-400 hover:border-[#333] hover:text-white'}`}>
                                            <span className="text-2xl">{t.emoji}</span>
                                            <span className="text-xs">{t.label}</span>
                                            {homeType === t.id && <Check className="w-3 h-3 text-amber-400" />}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* City */}
                            <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-1.5">City</label>
                                <input
                                    value={city} onChange={e => setCity(e.target.value)}
                                    className="w-full bg-[#0a0a0a] border border-[#252525] rounded-xl px-4 py-3 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-amber-500/60 transition-colors"
                                    placeholder="e.g. Bengaluru"
                                />
                            </div>

                            {/* Bedrooms + Occupants */}
                            <div className="grid grid-cols-2 gap-6">
                                <NumericInput label="Bedrooms" value={bedrooms} onChange={setBedrooms} min={1} max={10} />
                                <NumericInput label="Occupants" value={occupants} onChange={setOccupants} min={1} max={20} />
                            </div>

                            {/* Area (optional) */}
                            <div>
                                <label className="block text-xs font-medium text-neutral-400 mb-1.5">Area in sqft <span className="text-neutral-600">(optional)</span></label>
                                <input
                                    type="number" value={area} onChange={e => setArea(e.target.value)}
                                    className="w-full bg-[#0a0a0a] border border-[#252525] rounded-xl px-4 py-3 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-amber-500/60 transition-colors"
                                    placeholder="1200"
                                />
                            </div>
                        </div>

                        <button onClick={goToStep2}
                            className="w-full mt-8 bg-amber-500 hover:bg-amber-400 text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
                            Continue <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                )}

                {/* ─── STEP 2: Tariff ─── */}
                {step === 2 && (
                    <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-8">
                        <h1 className="text-2xl font-bold text-white mb-1">Select your electricity provider</h1>
                        <p className="text-neutral-500 text-sm mb-8">We'll use official tariff rates to calculate your bill</p>

                        {loadingTariffs ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                            </div>
                        ) : (
                            <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                                {tariffs.map((t: any) => (
                                    <button key={t.id} onClick={() => setTariffId(t.id)} type="button"
                                        className={`w-full text-left flex items-center justify-between p-4 rounded-xl border transition-all ${tariffId === t.id ? 'border-amber-500 bg-amber-500/10' : 'border-[#222] bg-[#0d0d0d] hover:border-[#333]'}`}>
                                        <div>
                                            <p className="font-bold text-white text-lg leading-tight">{t.state || t.name}</p>
                                            <p className="text-neutral-500 text-sm mt-0.5">{t.discom || t.provider || ''}</p>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${t.tariff_type === 'slab' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'}`}>
                                                {t.tariff_type === 'slab' ? 'Slab-based' : 'Flat rate'}
                                            </span>
                                            {tariffId === t.id && (
                                                <div className="w-6 h-6 rounded-full bg-amber-500 flex items-center justify-center">
                                                    <Check className="w-3.5 h-3.5 text-black" />
                                                </div>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}

                        <div className="flex gap-3 mt-8">
                            <button onClick={() => setStep(1)} className="px-5 py-3 border border-[#252525] text-neutral-400 rounded-xl hover:text-white hover:border-[#333] transition-colors text-sm">
                                Back
                            </button>
                            <button onClick={handleSubmit} disabled={isSubmitting || !tariffId}
                                className="flex-1 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-black font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-2 text-sm">
                                {isSubmitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating...</> : 'Set Up My Home →'}
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: #111; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 4px; }`}</style>
        </div>
    );
}
