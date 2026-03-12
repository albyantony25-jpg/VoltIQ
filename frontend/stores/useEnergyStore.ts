import { create } from 'zustand';
import { Home, Appliance, Bill, AIInsight } from '../types';

interface EnergyState {
    activeHome: Home | null;
    activeHomeId: string | null;
    appliances: Appliance[];
    currentBill: Bill | null;
    insights: AIInsight[];
    isLoading: boolean;

    setActiveHome: (home: Home | null) => void;
    setActiveHomeId: (id: string | null) => void;
    setAppliances: (appliances: Appliance[]) => void;
    setCurrentBill: (bill: Bill | null) => void;
    setInsights: (insights: AIInsight[]) => void;
    setIsLoading: (loading: boolean) => void;
    initStore: () => Promise<void>;
}

export const useEnergyStore = create<EnergyState>((set) => ({
    activeHome: null,
    activeHomeId: null,
    appliances: [],
    currentBill: null,
    insights: [],
    isLoading: false,

    setActiveHome: (home) => set({ activeHome: home, activeHomeId: home?.id || null }),
    setActiveHomeId: (id) => set({ activeHomeId: id }),
    setAppliances: (appliances) => set({ appliances }),
    setCurrentBill: (bill) => set({ currentBill: bill }),
    setInsights: (insights) => set({ insights }),
    setIsLoading: (isLoading) => set({ isLoading }),
    initStore: async () => {
        try {
            const { createBrowserClient } = await import('../lib/supabase-browser');
            const supabase = createBrowserClient();
            const { data: { session } } = await supabase.auth.getSession();
            
            if (!session) {
                set({ activeHome: null, activeHomeId: null });
                return;
            }
            
            const res = await fetch(
                'http://localhost:8000/api/v1/homes/', 
                {
                    headers: {
                        'Authorization': `Bearer ${session.access_token}`
                    }
                }
            );
            const homes = await res.json();
            
            if (homes && homes.length > 0) {
                set({ activeHome: homes[0], activeHomeId: homes[0].id });
            } else {
                set({ activeHome: null, activeHomeId: null });
            }
        } catch (err) {
            console.error('initStore failed:', err);
            set({ activeHome: null, activeHomeId: null });
        }
    }
}));
