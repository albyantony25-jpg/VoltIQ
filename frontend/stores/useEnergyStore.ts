import { create } from 'zustand';
import { Home, Appliance, Bill, AIInsight } from '../types';

interface EnergyState {
    activeHome: Home | null;
    appliances: Appliance[];
    currentBill: Bill | null;
    insights: AIInsight[];
    isLoading: boolean;

    setActiveHome: (home: Home) => void;
    setAppliances: (appliances: Appliance[]) => void;
    setCurrentBill: (bill: Bill) => void;
    setInsights: (insights: AIInsight[]) => void;
    setIsLoading: (loading: boolean) => void;
}

export const useEnergyStore = create<EnergyState>((set) => ({
    activeHome: null,
    appliances: [],
    currentBill: null,
    insights: [],
    isLoading: false,

    setActiveHome: (home) => set({ activeHome: home }),
    setAppliances: (appliances) => set({ appliances }),
    setCurrentBill: (bill) => set({ currentBill: bill }),
    setInsights: (insights) => set({ insights }),
    setIsLoading: (isLoading) => set({ isLoading }),
}));
