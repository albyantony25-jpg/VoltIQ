"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@/lib/supabase-browser';
import { toast } from 'sonner';
import AuthCallback from '@/components/shared/AuthCallback';
import { Suspense } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';

const FEATURES = [
    { icon: '⌘', title: 'Real Bill Prediction', desc: 'Accurate bill estimates using actual state tariff slabs.' },
    { icon: '✨', title: 'AI Insights Engine', desc: 'Analyzes your usage and finds saving opportunities tailored to you.' },
    { icon: '⚡', title: 'Appliance Intelligence', desc: 'Library of 100+ brands with real manufacturer spec wattages.' },
    { icon: '💬', title: 'Energy Chat Assistant', desc: 'Ask anything about your energy in plain English. Get instant answers.' },
    { icon: '🌍', title: 'Sustainability Score', desc: 'Track your CO₂ footprint and compare with similar homes.' },
    { icon: '🔮', title: 'Digital Twin', desc: 'Simulate changes — solar panels, new appliances — before spending.' },
];

const HOW_IT_WORKS = [
    { step: '01', title: 'Set Up Your Home', desc: 'Tell us about your home — type, size, location, and electricity provider.' },
    { step: '02', title: 'Add Appliances', desc: 'Select your appliances from our library of 100+ brands with real wattages.' },
    { step: '03', title: 'Get AI Insights', desc: 'See your bill breakdown, efficiency score, and AI recommendations instantly.' },
];

// 3D Card Effect Component
function TiltCard({ children }: { children: React.ReactNode }) {
    return (
        <motion.div
            whileHover={{ scale: 1.02, rotateX: 2, rotateY: -2 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="h-full bg-card border border-border/50 rounded-3xl p-8 hover:border-primary/20 transition-all group overflow-hidden relative"
        >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="relative z-10">{children}</div>
        </motion.div>
    );
}

export default function LandingPage() {
    const router = useRouter();
    const [demoLoading, setDemoLoading] = useState(false);
    const supabase = createBrowserClient();
    
    // Parallax scroll effects
    const { scrollYProgress } = useScroll();
    const heroY = useTransform(scrollYProgress, [0, 1], [0, 200]);
    const heroOpacity = useTransform(scrollYProgress, [0, 0.3], [1, 0]);
    const glowScale = useTransform(scrollYProgress, [0, 1], [1, 1.5]);

    const handleDemoLogin = async () => {
        setDemoLoading(true);
        try {
            const { error } = await supabase.auth.signInWithPassword({
                email: 'demo@voltiq.app',
                password: 'Demo@1234',
            });
            if (error) { toast.error('Demo login failed. Please try later.'); return; }
            toast.success('Welcome to VoltIQ.');
            router.push('/overview');
        } catch { toast.error('Demo login failed.'); }
        finally { setDemoLoading(false); }
    };

    return (
        <div className="min-h-screen bg-background text-foreground font-sans overflow-x-hidden selection:bg-primary selection:text-primary-foreground">
            <Suspense fallback={null}>
                <AuthCallback />
            </Suspense>

            {/* ═══ NAV ═══ */}
            <motion.nav 
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/70 backdrop-blur-2xl"
            >
                <div className="max-w-6xl mx-auto px-6 h-14 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="font-bold text-lg tracking-tighter">VoltIQ</span>
                    </div>
                    <div className="flex items-center gap-6">
                        <Link href="/login" className="text-sm text-muted-foreground hover:text-foreground transition-colors">Sign In</Link>
                        <Link href="/register" className="text-sm bg-primary text-primary-foreground font-medium px-4 py-1.5 rounded-full hover:scale-105 transition-transform">
                            Get Started
                        </Link>
                    </div>
                </div>
            </motion.nav>

            {/* ═══ HERO ═══ */}
            <section className="relative min-h-screen flex flex-col items-center justify-center px-6 pt-20 overflow-hidden">
                {/* Minimalist Glow */}
                <motion.div style={{ scale: glowScale }} className="absolute inset-0 pointer-events-none flex justify-center items-center">
                    <div className="w-[800px] h-[400px] bg-primary/5 rounded-[100%] blur-[120px] opacity-70" />
                </motion.div>

                <motion.div style={{ y: heroY, opacity: heroOpacity }} className="relative z-10 max-w-4xl mx-auto text-center mt-10">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                        className="inline-flex items-center gap-2 bg-secondary/50 border border-border rounded-full px-4 py-1.5 text-xs text-muted-foreground mb-8 backdrop-blur-sm"
                    >
                        <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                        AI-Powered Energy Intelligence
                    </motion.div>

                    <motion.h1 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                        className="text-6xl md:text-8xl font-medium tracking-tighter leading-[1.05] mb-6 text-transparent bg-clip-text bg-gradient-to-b from-foreground to-foreground/60"
                    >
                        Know exactly where your energy goes.
                    </motion.h1>

                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 1, delay: 0.3 }}
                        className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-12 leading-relaxed font-light"
                    >
                        VoltIQ simulates your home's energy consumption, predicts your bill, and gives you AI-powered insights to save money. No hardware needed.
                    </motion.p>

                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 1, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Link href="/register" className="w-full sm:w-auto px-8 py-3.5 bg-primary text-primary-foreground font-medium rounded-full hover:scale-105 transition-all text-sm">
                            Create Free Account
                        </Link>
                        <button onClick={handleDemoLogin} disabled={demoLoading}
                            className="w-full sm:w-auto px-8 py-3.5 border border-border hover:bg-secondary text-foreground font-medium rounded-full transition-colors text-sm">
                            {demoLoading ? 'Loading...' : 'Try Demo Account'}
                        </button>
                    </motion.div>
                </motion.div>
                
                {/* 3D Dashboard Mockup Element */}
                <motion.div 
                    initial={{ opacity: 0, y: 100, rotateX: 20 }}
                    animate={{ opacity: 1, y: 0, rotateX: 0 }}
                    transition={{ duration: 1.2, delay: 0.6, ease: [0.16, 1, 0.3, 1] }}
                    style={{ perspective: 1000 }}
                    className="absolute -bottom-32 md:-bottom-48 left-1/2 -translate-x-1/2 w-[90%] max-w-5xl h-[400px] md:h-[600px] border border-border/50 rounded-t-[2rem] bg-card/80 backdrop-blur-2xl shadow-2xl overflow-hidden hidden sm:block"
                >
                    {/* Fake UI Header */}
                    <div className="h-12 border-b border-border/50 flex items-center px-6 gap-2">
                        <div className="w-3 h-3 rounded-full bg-border" />
                        <div className="w-3 h-3 rounded-full bg-border" />
                        <div className="w-3 h-3 rounded-full bg-border" />
                    </div>
                    {/* Fake UI Body */}
                    <div className="p-8 grid grid-cols-3 gap-6 h-full">
                        <div className="col-span-2 space-y-6">
                            <div className="h-32 bg-secondary/50 rounded-2xl border border-border/30" />
                            <div className="h-64 bg-gradient-to-t from-secondary/50 to-transparent rounded-2xl border border-border/30" />
                        </div>
                        <div className="space-y-6">
                            <div className="h-48 bg-secondary/30 rounded-2xl border border-border/30" />
                            <div className="h-48 bg-secondary/30 rounded-2xl border border-border/30" />
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* ═══ HOW IT WORKS ═══ */}
            <section className="py-32 px-6 relative z-20 bg-background">
                <div className="max-w-6xl mx-auto">
                    <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true, margin: "-100px" }}
                        transition={{ duration: 0.8 }}
                        className="text-center mb-20"
                    >
                        <h2 className="text-4xl md:text-6xl font-medium tracking-tighter mb-4">Three steps to clarity.</h2>
                        <p className="text-muted-foreground text-lg font-light">A completely software-based approach to home energy.</p>
                    </motion.div>
                    
                    <div className="grid md:grid-cols-3 gap-8">
                        {HOW_IT_WORKS.map((item, i) => (
                            <motion.div 
                                key={i} 
                                initial={{ opacity: 0, y: 30 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true, margin: "-50px" }}
                                transition={{ duration: 0.7, delay: i * 0.2 }}
                            >
                                <TiltCard>
                                    <div className="text-5xl font-light text-muted-foreground/30 mb-6 font-mono tracking-tighter">{item.step}</div>
                                    <h3 className="text-xl font-medium mb-3">{item.title}</h3>
                                    <p className="text-muted-foreground leading-relaxed text-sm font-light">{item.desc}</p>
                                </TiltCard>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ FEATURES ═══ */}
            <section className="py-32 px-6 bg-card border-y border-border/50">
                <div className="max-w-6xl mx-auto">
                    <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.8 }}
                        className="mb-20"
                    >
                        <h2 className="text-4xl md:text-6xl font-medium tracking-tighter mb-4">Everything you need.</h2>
                    </motion.div>
                    
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
                        {FEATURES.map((f, i) => (
                            <motion.div 
                                key={i} 
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ duration: 0.6, delay: i * 0.1 }}
                                className="group"
                            >
                                <div className="text-2xl mb-4 text-primary opacity-80">{f.icon}</div>
                                <h3 className="font-medium text-lg mb-2">{f.title}</h3>
                                <p className="text-muted-foreground text-sm leading-relaxed font-light">{f.desc}</p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* ═══ CTA ═══ */}
            <section className="py-40 px-6 text-center relative overflow-hidden bg-background">
                <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className="relative z-10 max-w-2xl mx-auto"
                >
                    <h2 className="text-5xl md:text-7xl font-medium tracking-tighter mb-6">
                        Start saving today.
                    </h2>
                    <p className="text-muted-foreground mb-12 text-lg font-light">Join thousands of households taking control of their energy costs.</p>
                    <Link href="/register" className="inline-flex items-center justify-center px-10 py-4 bg-primary text-primary-foreground font-medium rounded-full text-sm transition-all hover:scale-105">
                        Create Free Account
                    </Link>
                </motion.div>
            </section>

            {/* ═══ FOOTER ═══ */}
            <footer className="border-t border-border/40 py-12 px-6 bg-background">
                <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
                    <span className="font-medium tracking-tight text-sm">VoltIQ</span>
                    <p className="text-muted-foreground text-xs font-light">Built for the AI Era of Energy Management.</p>
                    <div className="flex gap-6 text-xs text-muted-foreground">
                        <Link href="/login" className="hover:text-foreground transition-colors">Sign In</Link>
                        <Link href="/register" className="hover:text-foreground transition-colors">Register</Link>
                    </div>
                </div>
            </footer>
        </div>
    );
}
