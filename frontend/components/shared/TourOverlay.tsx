"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTourStore, TOUR_STEPS } from "@/lib/tourStore";
import { X, ChevronRight, ChevronLeft } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

export function TourOverlay() {
    const { isActive, currentStep, nextStep, prevStep, endTour } = useTourStore();
    const [rect, setRect] = useState<DOMRect | null>(null);
    const router = useRouter();
    const pathname = usePathname();
    const step = TOUR_STEPS[currentStep];

    const updateRect = () => {
        if (!isActive || !step) return;
        const targetEl = document.querySelector(step.target);
        if (targetEl) {
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            setTimeout(() => {
                setRect(targetEl.getBoundingClientRect());
            }, 300);
        } else {
            console.warn("Tour target not found: ", step.target);
            setRect(null);
        }
    };

    useEffect(() => {
        if (isActive && step) {
            // Navigate if needed
            if (step.route && pathname !== step.route) {
                router.push(step.route);
            } else {
                updateRect();
            }
        } else {
            setRect(null);
        }

        const handleResize = () => updateRect();
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize, true);
        return () => {
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleResize, true);
        };
    }, [isActive, currentStep, step?.route, pathname, router]);

    // Force update rect after a short delay to account for page transitions
    useEffect(() => {
        if (isActive) {
            const t = setTimeout(updateRect, 600);
            return () => clearTimeout(t);
        }
    }, [isActive, pathname, currentStep]);

    if (!isActive || !step) return null;

    // Calculate tooltip position based on rect
    let style: any = { opacity: 0 };
    if (rect) {
        const MARGIN = 16;
        style = { opacity: 1 };
        if (step.placement === 'right') {
            style.top = rect.top + rect.height / 2;
            style.left = rect.right + MARGIN;
            style.transform = 'translateY(-50%)';
        } else if (step.placement === 'left') {
            style.top = rect.top + rect.height / 2;
            style.left = rect.left - MARGIN;
            style.transform = 'translate(-100%, -50%)';
        } else if (step.placement === 'bottom') {
            style.top = rect.bottom + MARGIN;
            style.left = rect.left + rect.width / 2;
            style.transform = 'translateX(-50%)';
        } else if (step.placement === 'top') {
            style.top = rect.top - MARGIN;
            style.left = rect.left + rect.width / 2;
            style.transform = 'translate(-50%, -100%)';
        }

        // Ensure tooltip stays in viewport
        style.top = Math.max(20, Math.min(style.top, window.innerHeight - 200));
        style.left = Math.max(20, Math.min(style.left, window.innerWidth - 300));
    } else {
        // Fallback center screen
        style = {
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            opacity: 1
        };
    }

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[100] pointer-events-none">
                {/* Spotlight Overlay */}
                {rect && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="absolute inset-0 bg-black/50 pointer-events-auto"
                        style={{
                            clipPath: `polygon(0% 0%, 0% 100%, ${rect.left - 8}px 100%, ${rect.left - 8}px ${rect.top - 8}px, ${rect.right + 8}px ${rect.top - 8}px, ${rect.right + 8}px ${rect.bottom + 8}px, ${rect.left - 8}px ${rect.bottom + 8}px, ${rect.left - 8}px 100%, 100% 100%, 100% 0%)`
                        }}
                    />
                )}

                {/* Tooltip Card */}
                <motion.div
                    key={currentStep}
                    initial={{ opacity: 0, scale: 0.9, ...style }}
                    animate={{ opacity: 1, scale: 1, ...style }}
                    transition={{ type: "spring", stiffness: 300, damping: 25 }}
                    className="absolute z-[101] pointer-events-auto bg-slate-900 border border-indigo-500 shadow-2xl rounded-xl p-5 w-80 text-white flex flex-col gap-3"
                >
                    <div className="flex items-start justify-between">
                        <h3 className="font-bold text-lg text-indigo-400">{TOUR_STEPS[currentStep].description}</h3>
                        <button onClick={endTour} className="text-slate-400 hover:text-white p-1">
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="flex items-center justify-between mt-4">
                        <span className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                            Step {currentStep + 1} of {TOUR_STEPS.length}
                        </span>

                        <div className="flex gap-2">
                            {currentStep > 0 && (
                                <button onClick={prevStep} className="p-2 bg-slate-800 hover:bg-slate-700 rounded-md transition-colors">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                            )}
                            {currentStep < TOUR_STEPS.length - 1 ? (
                                <button onClick={nextStep} className="flex items-center gap-1 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-md transition-colors">
                                    Next <ChevronRight className="w-4 h-4" />
                                </button>
                            ) : (
                                <button onClick={endTour} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold rounded-md transition-colors">
                                    Finish
                                </button>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
