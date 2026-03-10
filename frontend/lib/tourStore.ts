import { create } from 'zustand';

export type TourStep = {
    target: string;
    description: string;
    placement: 'top' | 'bottom' | 'left' | 'right';
    route?: string;
};

export const TOUR_STEPS: TourStep[] = [
    { target: '[data-tour="sidebar-modules"]', description: "This is your energy command center. 8 modules, all AI-powered.", placement: "right" },
    { target: '[data-tour="kpi-cards"]', description: "Your live energy stats — bill forecast updates daily.", placement: "bottom" },
    { target: '[data-tour="main-chart"]', description: "30 days of simulated consumption. Click any bar for details.", placement: "top" },
    { target: '[data-tour="score-gauge"]', description: "Your personalized efficiency grade — we'll explain how to improve it.", placement: "left" },
    { target: '[data-tour="nav-insights"]', description: "AI analyzed 6 months of your data and found these patterns.", placement: "right", route: "/insights" },
    { target: '[data-tour="insight-card-0"]', description: "Every insight explains its own reasoning. Tap 'Why?' to see.", placement: "bottom", route: "/insights" },
    { target: '[data-tour="nav-chat"]', description: "Ask EnergyIQ anything about your energy — it knows your home.", placement: "right", route: "/chat" },
    { target: '[data-tour="chat-input"]', description: "Let's ask how to reduce the bill. Watch it reference your actual data.", placement: "top", route: "/chat" },
    { target: '[data-tour="tour-finish"]', description: "That's EnergyIQ. Built for real homes. Ready to scale.", placement: "bottom" }
];

interface TourState {
    isActive: boolean;
    currentStep: number;
    startTour: () => void;
    nextStep: () => void;
    prevStep: () => void;
    endTour: () => void;
}

export const useTourStore = create<TourState>((set) => ({
    isActive: false,
    currentStep: 0,
    startTour: () => {
        if (typeof window !== 'undefined') localStorage.removeItem('tour_completed');
        set({ isActive: true, currentStep: 0 });
    },
    nextStep: () => set((state) => ({ currentStep: Math.min(state.currentStep + 1, TOUR_STEPS.length - 1) })),
    prevStep: () => set((state) => ({ currentStep: Math.max(state.currentStep - 1, 0) })),
    endTour: () => {
        if (typeof window !== 'undefined') localStorage.setItem('tour_completed', 'true');
        set({ isActive: false, currentStep: 0 });
    }
}));
