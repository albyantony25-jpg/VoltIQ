"use client";

import { useEffect, useState } from 'react';
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
                className={`relative flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all ${isActive
                    ? 'text-accent font-semibold'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                    }`}
            >
                {isActive && (
                    <motion.div
                        layoutId="active-sidebar-nav"
                        className="absolute left-0 top-0 bottom-0 w-1 bg-accent rounded-r-full"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    />
                )}
                {isActive && <div className="absolute inset-0 bg-accent/10 rounded-lg -z-10" />}
                <item.icon className="h-5 w-5 z-10 box-content" />
                <span className="z-10">{item.name}</span>
                {item.badge && (
                    <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full z-10 ${item.badge === 'AI' ? 'bg-indigo-500/20 text-indigo-400' :
                        item.badge === 'NEW' ? 'bg-emerald-500/20 text-emerald-400' :
                            'bg-amber-500/20 text-amber-500'
                        }`}>
                        {item.badge}
                    </span>
                )}
            </Link>

            <AnimatePresence>
                {showTooltip && (
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

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const pathname = usePathname();
    const { theme, setTheme } = useTheme();

    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [user, setUser] = useState<any>(null);

    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [showWizard, setShowWizard] = useState(false);

    useEffect(() => {
        const supabase = createBrowserClient();
        const checkAuthAndHome = async () => {
            // Check auth session
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                // [AUDIT] console.log("Local Dev: Bypassing Supabase auth since we have no real backend keys.");
                const dummyUserId = '00000000-0000-0000-0000-000000000000';
                setUser({ id: dummyUserId, email: 'demo@example.com', user_metadata: { full_name: 'Local Demo User' } });
                setIsAuthenticated(true);

                // Allow the wizard to show up locally if the mock database has no homes,
                // but we also bypass query errors gracefully
                const { data: homes, error } = await supabase
                    .from('homes')
                    .select('*')
                    .eq('user_id', dummyUserId)
                    .limit(1);

                if (error || !homes || homes.length === 0) {
                    setShowWizard(true);
                }

                setIsLoading(false);
                return;
            }

            setUser(session.user);
            setIsAuthenticated(true);

            // Check if user has a home configured
            const { data: homes, error } = await supabase
                .from('homes')
                .select('*')
                .eq('user_id', session.user.id)
                .limit(1);

            if (!error && (!homes || homes.length === 0)) {
                setShowWizard(true);
            }

            setIsLoading(false);
        };

        checkAuthAndHome();
    }, [router]);

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

                {/* Home Setup Wizard Modal */}
                {showWizard && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
                        <div className="w-full max-w-2xl px-4">
                            <HomeSetupWizard onComplete={() => setShowWizard(false)} user={user} />
                        </div>
                    </div>
                )}

                {/* Mobile Sidebar Overlay */}
                {isMobileMenuOpen && (
                    <div
                        className="fixed inset-0 z-20 bg-background/80 backdrop-blur-sm md:hidden"
                        onClick={() => setIsMobileMenuOpen(false)}
                    />
                )}

                {/* Sidebar */}
                <aside
                    className={`fixed inset-y-0 left-0 z-30 w-64 border-r border-border bg-card shadow-lg md:static md:translate-x-0 transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}
                >
                    <div className="p-6 border-b border-border flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="h-8 w-8 bg-slate-950 rounded-lg flex items-center justify-center shadow-sm border border-slate-800 shadow-amber-500/10">
                                <VQLogo className="h-5 w-5" />
                            </div>
                            <h2 className="text-xl font-bold tracking-tight">VoltIQ</h2>
                        </div>
                        <button className="md:hidden p-1 text-muted-foreground" onClick={() => setIsMobileMenuOpen(false)}>
                            <X className="h-5 w-5" />
                        </button>
                    </div>

                    <nav className="flex-1 p-4 flex flex-col gap-1 overflow-y-auto h-[calc(100vh-140px)]">
                        {['Main', 'Intelligence', 'Advanced'].map(group => (
                            <div key={group}>
                                <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 mt-4 px-3">
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
                    <div className="flex-1 overflow-auto p-4 sm:p-8 bg-muted/10 relative">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={pathname}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                className="h-full"
                            >
                                {children}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </main>
            </div>
        </div>
    );
}
