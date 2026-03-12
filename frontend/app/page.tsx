"use client";

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import AuthCallback from '@/components/shared/AuthCallback';
import { Suspense } from 'react';

/* ─── Intersection Observer hook ─── */
function useInView(threshold = 0.15) {
    const ref = useRef<HTMLDivElement>(null);
    const [inView, setInView] = useState(false);
    useEffect(() => {
        const el = ref.current;
        if (!el) return;
        const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold });
        obs.observe(el);
        return () => obs.disconnect();
    }, [threshold]);
    return { ref, inView };
}

/* ─── Count-up ─── */
function CountUp({ to, suffix = '' }: { to: number; suffix?: string }) {
    const { ref, inView } = useInView(0.5);
    const [val, setVal] = useState(0);
    useEffect(() => {
        if (!inView) return;
        let start = 0;
        const step = Math.ceil(to / 40);
        const id = setInterval(() => {
            start += step;
            if (start >= to) { setVal(to); clearInterval(id); } else setVal(start);
        }, 30);
        return () => clearInterval(id);
    }, [inView, to]);
    return <span ref={ref}>{val}{suffix}</span>;
}

const FEATURES = [
    { icon: '📊', title: 'Real Bill Prediction', desc: 'Accurate bill estimates using actual state tariff slabs from Indian DISCOMs.' },
    { icon: '🤖', title: 'AI Insights Engine', desc: 'GPT-4o analyzes your usage and finds saving opportunities tailored to you.' },
    { icon: '⚡', title: 'Appliance Intelligence', desc: '100+ brands with real manufacturer spec wattages — no guesswork.' },
    { icon: '💬', title: 'Energy Chat Assistant', desc: 'Ask anything about your energy in plain English. Get instant answers.' },
    { icon: '🌱', title: 'Sustainability Score', desc: 'Track your CO₂ footprint and compare with similar homes in your region.' },
    { icon: '🔮', title: 'Digital Twin', desc: 'Simulate changes — solar panels, new appliances — before spending rupees.' },
];

const HOW_IT_WORKS = [
    { step: '01', icon: '🏠', title: 'Set Up Your Home', desc: 'Tell us about your home — type, size, location, and electricity tariff provider.' },
    { step: '02', icon: '⚡', title: 'Add Your Appliances', desc: 'Select your appliances from our library of 100+ brands with real manufacturer wattages.' },
    { step: '03', icon: '🤖', title: 'Get AI Insights', desc: 'See your bill breakdown, efficiency score, and AI recommendations instantly.' },
];

function FadeUp({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
    const { ref, inView } = useInView();
    return (
        <div ref={ref} style={{ transitionDelay: `${delay}ms` }}
            className={`transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            {children}
        </div>
    );
}

export default function LandingPage() {
    const router = useRouter();
    const [demoLoading, setDemoLoading] = useState(false);
    const [heroVisible, setHeroVisible] = useState(false);
    const supabase = createBrowserClient();

    useEffect(() => {
        const t = setTimeout(() => setHeroVisible(true), 100);
        return () => clearTimeout(t);
    }, []);

    const handleDemoLogin = async () => {
        setDemoLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: 'demo@energyiq.app',
                password: 'Demo@1234',
            });
            if (error) { toast.error('Demo login failed. Please try later.'); return; }
            toast.success('Welcome to the VoltIQ Demo!');
            router.push('/overview');
        } catch { toast.error('Demo login failed.'); }
        finally { setDemoLoading(false); }
    };

    const words = "Know exactly where your electricity money goes".split(' ');

    return (
        <div className="min-h-screen bg-[#080808] text-white font-sans overflow-x-hidden">
            <Suspense fallback={null}>
                <AuthCallback />
            </Suspense>

            {/* ═══ NAV ═══ */}
            <nav className="fixed top-0 left-0 right-0 z-50 border-b border-[#1a1a1a] bg-[#080808]/90 backdrop-blur-xl">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-5 h-5 text-black fill-current">
                                <path d="M13 2L4.5 13.5H11L11 22L19.5 10.5H13L13 2Z"/>
                            </svg>
                        </div>
                        <span className="font-bold text-lg tracking-tight">Volt<span className="text-amber-400">IQ</span></span>
                    </div>
                    <div className="flex items-center gap-3">
                        <Link href="/login" className="text-sm text-neutral-400 hover:text-white transition-colors px-4">Sign In</Link>
                        <Link href="/register" className="text-sm bg-amber-500 hover:bg-amber-400 text-black font-semibold px-4 py-2 rounded-lg transition-colors">Get Started</Link>
                    </div>
                </div>
            </nav>

            {/* ═══ HERO ═══ */}
            <section className="min-h-screen flex flex-col items-center justify-center relative px-6 pt-16 overflow-hidden">
                {/* Background glow */}
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-amber-500/8 rounded-full blur-[120px]" />
                    <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-amber-600/5 rounded-full blur-[80px]" />
                </div>
                {/* Animated grid */}
                <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage: 'linear-gradient(#F59E0B 1px, transparent 1px), linear-gradient(90deg, #F59E0B 1px, transparent 1px)', backgroundSize: '60px 60px'}} />

                <div className="relative z-10 max-w-4xl mx-auto text-center">
                    {/* Badge */}
                    <div className={`inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 rounded-full px-4 py-1.5 text-sm text-amber-400 mb-8 transition-all duration-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        AI-Powered Energy Intelligence
                    </div>

                    {/* Heading — word by word */}
                    <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-[1.05] mb-6">
                        {words.map((word, i) => (
                            <span key={i} className={`inline-block mr-[0.25em] transition-all duration-500 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                                style={{ transitionDelay: `${200 + i * 80}ms` }}>
                                {word === 'electricity' ? <span className="text-amber-400">{word}</span> : word}
                            </span>
                        ))}
                    </h1>

                    <p className={`text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto mb-10 leading-relaxed transition-all duration-700 delay-700 ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        VoltIQ simulates your home's energy consumption, predicts your bill, and gives you AI-powered insights to save money.
                    </p>

                    {/* CTA Buttons */}
                    <div className={`flex flex-col sm:flex-row items-center justify-center gap-3 mb-6 transition-all duration-700 delay-[900ms] ${heroVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                        <Link href="/register" className="w-full sm:w-auto px-8 py-3.5 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition-all hover:scale-105 text-base shadow-lg shadow-amber-500/20">
                            Create Free Account
                        </Link>
                        <Link href="/login" className="w-full sm:w-auto px-8 py-3.5 border border-[#333] hover:border-amber-500/50 text-white font-medium rounded-xl transition-all hover:bg-white/5 text-base">
                            Sign In
                        </Link>
                        <button onClick={handleDemoLogin} disabled={demoLoading}
                            className="w-full sm:w-auto px-8 py-3.5 text-amber-400 hover:text-amber-300 font-medium rounded-xl transition-all hover:bg-amber-500/5 text-base">
                            {demoLoading ? 'Loading...' : 'Try Demo Account →'}
                        </button>
                    </div>

                    <p className={`text-sm text-neutral-600 transition-all duration-700 delay-[1100ms] ${heroVisible ? 'opacity-100' : 'opacity-0'}`}>
                        No hardware needed. 100% software simulation.
                    </p>
                </div>

                {/* Scroll indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                    <div className="w-6 h-10 border-2 border-neutral-700 rounded-full flex justify-center pt-2">
                        <div className="w-1 h-2 bg-amber-400 rounded-full" />
                    </div>
                </div>
            </section>

            {/* ═══ HOW IT WORKS ═══ */}
            <section id="how-it-works" className="py-28 px-6">
                <div className="max-w-6xl mx-auto">
                    <FadeUp>
                        <div className="text-center mb-16">
                            <p className="text-amber-400 text-sm font-semibold uppercase tracking-widest mb-3">How It Works</p>
                            <h2 className="text-4xl md:text-5xl font-black text-white">Three steps to energy clarity</h2>
                        </div>
                    </FadeUp>
                    <div className="grid md:grid-cols-3 gap-6">
                        {HOW_IT_WORKS.map((item, i) => (
                            <FadeUp key={i} delay={i * 150}>
                                <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-8 hover:border-amber-500/30 transition-all group relative overflow-hidden">
                                    <div className="absolute top-4 right-4 text-6xl font-black text-[#1a1a1a] group-hover:text-amber-500/10 transition-colors select-none">{item.step}</div>
                                    <div className="text-4xl mb-4">{item.icon}</div>
                                    <h3 className="text-xl font-bold text-white mb-3">{item.title}</h3>
                                    <p className="text-neutral-500 leading-relaxed text-sm">{item.desc}</p>
                                </div>
                            </FadeUp>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ FEATURES ═══ */}
            <section id="features" className="py-28 px-6 bg-[#0d0d0d]">
                <div className="max-w-6xl mx-auto">
                    <FadeUp>
                        <div className="text-center mb-16">
                            <p className="text-amber-400 text-sm font-semibold uppercase tracking-widest mb-3">Features</p>
                            <h2 className="text-4xl md:text-5xl font-black text-white">Everything you need to take control</h2>
                        </div>
                    </FadeUp>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {FEATURES.map((f, i) => (
                            <FadeUp key={i} delay={i * 100}>
                                <div className="bg-[#111] border border-[#1e1e1e] rounded-2xl p-6 hover:border-amber-500/20 transition-all group h-full">
                                    <div className="text-3xl mb-4">{f.icon}</div>
                                    <h3 className="font-bold text-white mb-2">{f.title}</h3>
                                    <p className="text-neutral-500 text-sm leading-relaxed">{f.desc}</p>
                                </div>
                            </FadeUp>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ STATS ═══ */}
            <section className="py-20 px-6 bg-gradient-to-r from-amber-600/10 via-amber-500/5 to-amber-600/10 border-y border-amber-500/10">
                <div className="max-w-5xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
                    {[
                        { num: 100, suffix: '+', label: 'Appliance brands' },
                        { text: 'Real', label: 'Tariff data from Indian DISCOMs' },
                        { text: 'GPT-4o', label: 'Powered AI insights' },
                        { num: 0, suffix: '', label: 'Hardware needed' },
                    ].map((s, i) => (
                        <FadeUp key={i} delay={i * 100}>
                            <div>
                                <div className="text-4xl md:text-5xl font-black text-amber-400 mb-2">
                                    {'text' in s ? s.text : <CountUp to={s.num} suffix={s.suffix} />}
                                </div>
                                <p className="text-neutral-500 text-sm">{s.label}</p>
                            </div>
                        </FadeUp>
                    ))}
                </div>
            </section>

            {/* ═══ CTA ═══ */}
            <section className="py-32 px-6 text-center relative overflow-hidden">
                <div className="absolute inset-0 pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[300px] bg-amber-500/6 rounded-full blur-[100px]" />
                </div>
                <div className="relative z-10 max-w-2xl mx-auto">
                    <FadeUp>
                        <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
                            Ready to understand your<br /><span className="text-amber-400">electricity bill?</span>
                        </h2>
                        <p className="text-neutral-500 mb-10">Join thousands of Indian households taking control of their energy costs.</p>
                        <Link href="/register" className="inline-flex items-center gap-2 px-10 py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl text-lg transition-all hover:scale-105 shadow-2xl shadow-amber-500/30">
                            Create Free Account
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" /></svg>
                        </Link>
                    </FadeUp>
                </div>
            </section>

            {/* ═══ FOOTER ═══ */}
            <footer className="border-t border-[#1a1a1a] py-12 px-6">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-amber-500 flex items-center justify-center">
                            <svg viewBox="0 0 24 24" className="w-4 h-4 text-black fill-current"><path d="M13 2L4.5 13.5H11L11 22L19.5 10.5H13L13 2Z"/></svg>
                        </div>
                        <span className="font-bold">Volt<span className="text-amber-400">IQ</span></span>
                    </div>
                    <p className="text-neutral-600 text-sm">Built for the AI Era of Energy Management</p>
                    <div className="flex gap-6 text-sm text-neutral-600">
                        <Link href="/login" className="hover:text-amber-400 transition-colors">Sign In</Link>
                        <Link href="/register" className="hover:text-amber-400 transition-colors">Register</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
