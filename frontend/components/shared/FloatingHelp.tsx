"use client";

import { useState } from "react";
import { HelpCircle, Play, Database, Github, Mail, X } from "lucide-react";
import { useTourStore } from "@/lib/tourStore";
import { motion, AnimatePresence } from "framer-motion";
import { fetchApi } from "@/lib/api";

export function FloatingHelp() {
    const [isOpen, setIsOpen] = useState(false);
    const startTour = useTourStore(state => state.startTour);

    const handleTourStart = () => {
        setIsOpen(false);
        startTour();
    };

    const handleLoadDemo = async () => {
        try {
            await fetchApi(`/demo/reset`, { method: 'POST' });
            window.location.reload();
        } catch (e) {
            console.error("Failed to load demo data", e);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 20, scale: 0.9 }}
                        transition={{ duration: 0.2 }}
                        className="bg-slate-900 border border-slate-700 w-72 rounded-xl shadow-2xl p-4 origin-bottom-right"
                    >
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="font-bold text-slate-200">How can we help?</h4>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-2">
                            <button onClick={handleTourStart} className="w-full flex items-center gap-3 p-3 rounded-lg bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 font-semibold transition-colors border border-indigo-600/30">
                                <Play className="w-4 h-4" /> Take the Tour
                            </button>
                            <button onClick={handleLoadDemo} className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors">
                                <Database className="w-4 h-4" /> Load Demo Data
                            </button>
                            <a href="https://github.com/your-repo" target="_blank" rel="noreferrer" className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors">
                                <Github className="w-4 h-4" /> View Source on GitHub
                            </a>
                            <a href="mailto:support@energyiq.app" className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors">
                                <Mail className="w-4 h-4" /> Email Feedback
                            </a>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <button
                onClick={() => setIsOpen(!isOpen)}
                className="h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-105 active:scale-95 border-2 border-indigo-400/30"
            >
                {isOpen ? <X className="w-6 h-6" /> : <HelpCircle className="w-6 h-6" />}
            </button>
        </div>
    );
}
