"use client";

import { useEffect, useState, Suspense } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
    Home, FileText, Bell, LayoutDashboard,
    Settings, Activity, BrainCircuit, Monitor,
    Menu, X, Moon, Sun, ChevronDown, UserIcon
} from 'lucide-react';
import { createBrowserClient } from '@/lib/supabase-browser';
import { useTheme } from 'next-themes';
import HomeSetupWizard from '@/components/shared/HomeSetupWizard';
import { VQLogo } from '@/components/shared/VQLogo';
import { TopNav } from '@/components/shared/TopNav';
import { motion, AnimatePresence } from 'framer-motion';
import { DemoBanner } from '@/components/shared/DemoBanner';
import { FloatingHelp } from '@/components/shared/FloatingHelp';
import { TourOverlay } from '@/components/shared/TourOverlay';
import { useEnergyStore } from '@/stores/useEnergyStore';
import { fetchApi } from '@/lib/api';

function SidebarItem({ item, isActive }: { item: any, isActive: boolean }) {
    const [showTooltip, setShowTooltip] = useState(false);
    const [hasHovered, setHasHovered] = useState(false);

    const handleMouseEnter = () => {
        if (!hasHovered && item.tooltip) {
            setShowTooltip(true);
            setHasHovered(true);
            setTimeout(() => setShowTooltip(false), 3000);
        }
    };

    return (
        <div onMouseEnter={handleMouseEnter} className="relative z-20">
            <Link
                href={item.href}
                data-tour={item.tourId}
                className={`relative flex items-center md:justify-center lg:justify-start gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                    ? 'text-amber-400 font-semibold'
                    : 'text-neutral-500 hover:text-white hover:bg-white/5'
                    }`}
            >
                {isActive && (
                    <motion.div
                        layoutId="active-sidebar-nav"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-amber-500 rounded-r-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    />
                )}
                {isActive && <div className="absolute inset-0 bg-amber-500/10 rounded-lg -z-10" />}
                <item.icon className="h-5 w-5 z-10 box-content flex-shrink-0" />
                <span className="z-10 md:hidden lg:block text-sm whitespace-nowrap">{item.name}</span>
                {item.badge && (
                    <span className={`ml-auto md:hidden lg:inline-flex text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10 ${item.badge === 'AI' ? 'bg-indigo-500/20 text-indigo-400' :
                        item.badge === 'NEW' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-amber-500/20 text-amber-500'
                        }`}>
                        {item.badge}
                    </span>
                )}
            </Link>

            <AnimatePresence>
                {/* Tooltip on tablet icon-only mode or desktop custom tooltip */}
                {(showTooltip || (hasHovered && item.tooltip)) && (
                    <motion.div
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0 }}
                        className="absolute left-[calc(100%+8px)] top-1/2 -translate-y-1/2 w-48 bg-slate-800 text-xs text-slate-200 p-2.5 text-center rounded-lg shadow-2xl border border-slate-700 pointer-events-none"
                    >
                        {item.tooltip}
                        <div className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-2 bg-slate-800 border-l border-b border-slate-700 rotate-45" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

const bottomNavItems = [
    { name: 'Overview', href: '/overview', icon: LayoutDashboard },
    { name: 'Appliances', href: '/appliances', icon: Home },
    { name: 'Insights', href: '/insights', icon: Activity },
    { name: 'Chat', href: '/chat', icon: BrainCircuit },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();

    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<any>(null);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const { setActiveHome, setActiveHomeId, initStore } = useEnergyStore();

    useEffect(() => {
        const supabase = createBrowserClient();
        
        const checkAuthAndHome = async () => {
            try {
                console.log("[Layout] Initializing auth and store...");
                const { data: { session }, error } = await supabase.auth.getSession();

                if (error) {
                    console.error("[Layout] Supabase session error:", error);
                    window.location.href = '/login';
                    return;
                }

                if (!session?.user) {
                    console.warn("[Layout] No user session found, redirecting to /login");
                    window.location.href = '/login';
                    return;
                }

                console.log("[Layout] User authenticated:", session.user.id);
                setUser(session.user);
                setIsAuthenticated(true);

                // Check if user has a home configured
                console.log("[Layout] Calling initStore()...");
                try {
                    await initStore();
                    const currentState = useEnergyStore.getState();
                    if (!currentState.activeHomeId) {
                        console.log("[Layout] No home found in store, redirecting to /setup");
                        window.location.href = '/setup';
                        return;
                    }
                } catch (err: any) {
                    console.error("[Layout] Fatal error in checkAuthAndHome:", err);
                    window.location.href = '/setup';
                    return;
                }
                console.log("[Layout] initStore() completed.");
            } catch (err: any) {
                console.error("[Layout] Fatal error in checkAuthAndHome:", err);
            } finally {
                setIsLoading(false);
            }
        };

        checkAuthAndHome();

        const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_OUT') {
                window.location.href = '/login';
            }
            if (event === 'SIGNED_IN') {
                initStore().then(() => {
                    const currentState = useEnergyStore.getState();
                    if (!currentState.activeHomeId) {
                        window.location.href = '/setup';
                    }
                });
            }
        });

        return () => subscription.unsubscribe();
    }, [router, initStore]);

    if (isLoading) {
        return (
            <div className="flex h-screen items-center justify-center bg-background">
                <div className="animate-spin h-10 w-10 text-accent rounded-full border-4 border-t-transparent"></div>
            </div>
        );
    }

    if (!isAuthenticated) return null;

    const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

    const navItems = [
        { name: 'Overview', href: '/overview', icon: LayoutDashboard, group: 'Main', tourId: 'sidebar-modules' },
        { name: 'Appliances', href: '/appliances', icon: Home, group: 'Main' },
        { name: 'Billing', href: '/billing', icon: FileText, group: 'Main' },
        { name: 'AI Insights', href: '/insights', icon: Activity, group: 'Intelligence', badge: 'AI', tooltip: "GPT-4o analyzes 6 months of your data to find patterns", tourId: 'nav-insights' },
        { name: 'Volt Assistant', href: '/chat', icon: BrainCircuit, group: 'Intelligence', badge: 'AI', tooltip: "Ask anything — EnergyIQ knows your home's energy profile", tourId: 'nav-chat' },
        { name: 'Reports', href: '/reports', icon: FileText, group: 'Advanced' },
        { name: 'Efficiency Score', href: '/score', icon: Activity, group: 'Advanced', badge: 'NEW', tooltip: "Personalized grade based on appliance efficiency + usage behavior" },
        { name: 'Digital Twin', href: '/digital-twin', icon: Monitor, group: 'Advanced', badge: 'BETA' },
    ];

    return (
        <div className="flex flex-col h-screen bg-background text-foreground overflow-hidden">
            {user?.email === 'demo@example.com' && <DemoBanner />}
            <TourOverlay />
            <FloatingHelp />

            <div className="flex flex-1 overflow-hidden relative">

                {/* Mobile Sidebar Overlay */}
                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 z-20 bg-background/80 backdrop-blur-sm md:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside
                    className={`fixed inset-y-0 left-0 z-40 bg-[#0d0d0d] border-r border-[#1a1a1a] shadow-2xl transition-all duration-300 ease-in-out flex flex-col
                    w-[240px] md:static md:w-[64px] lg:w-[240px]
                    ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
                    `}
                >
                    <div className="p-4 md:p-3 lg:p-6 border-b border-border flex items-center justify-between md:justify-center lg:justify-between h-[60px] lg:h-[72px]">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-slate-950 rounded-lg flex items-center justify-center shadow-sm border border-slate-800 shadow-amber-500/10 shrink-0">
                                <VQLogo className="h-5 w-5" />
                            </div>
                            <h2 className="text-xl font-bold tracking-tight md:hidden lg:block whitespace-nowrap overflow-hidden">VoltIQ</h2>
                        </div>
                        <button className="md:hidden p-1 text-muted-foreground" onClick={() => setIsMobileMenuOpen(false)}>
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <nav className="flex-1 p-2 lg:p-4 flex flex-col gap-1 overflow-y-auto h-[calc(100vh-140px)]">
                        {['Main', 'Intelligence', 'Advanced'].map(group => (
                            <div key={group}>
                                <div className="text-[10px] lg:text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4 px-2 lg:px-3 text-center lg:text-left md:hidden lg:block">
                                    {group}
                                </div>
                                {navItems.filter(i => i.group === group).map(item => {
                                    const isActive = pathname === item.href;
                                    return <SidebarItem key={item.href} item={item} isActive={isActive} />;
                                })}
                            </div>
                        ))}
                    </nav>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 flex flex-col min-w-0">

                    {/* TopNav handles the header area, auth dummy props, and notification bell */}
                    <TopNav />

                    {/* Page Content */}
                    <div className="flex-1 overflow-auto p-4 sm:p-6 lg:p-8 bg-muted/10 relative pb-20 md:pb-4">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={pathname}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="h-full min-w-0"
                            >
                                <Suspense fallback={
                                    <div className="flex h-full items-center justify-center p-8">
                                        <div className="animate-spin h-8 w-8 text-indigo-500 rounded-full border-4 border-t-transparent"></div>
                                    </div>
                                }>
                                    {children}
                                </Suspense>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex justify-around items-center h-16 pb-safe">
                {bottomNavItems.map(item => {
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center justify-center w-full h-full min-h-[44px] ${isActive ? 'text-accent' : 'text-muted-foreground'}`}
                        >
                            <item.icon className="h-5 w-5 mb-1" />
                            <span className="text-[10px] font-medium">{item.name}</span>
                        </Link>
                    )
                })}
                <button
                    onClick={() => setIsMobileMenuOpen(true)}
                    className="flex flex-col items-center justify-center w-full h-full min-h-[44px] text-muted-foreground"
                >
                    <Menu className="h-5 w-5 mb-1" />
                    <span className="text-[10px] font-medium">More</span>
                </button>
            </div>
        </div>
    );
}
