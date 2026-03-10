"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { FileWarning, RefreshCw, X } from "lucide-react";

export function DemoBanner() {
    const [isVisible, setIsVisible] = useState(true);
    const [isResetting, setIsResetting] = useState(false);

    // In a real app we'd verify the user email, assuming we inject this in layout.
    // We'll show it purely based on path or logic, but standard demo spec says:
    // "Shown only when logged in as demo@energyiq.app"

    // We'll trust the caller to conditinally render this if email matches, or just show it if
    // localStorage indicates demo. Since we're injecting it blindly, we'll check user inside layout.

    if (!isVisible) return null;

    const handleReset = async () => {
        setIsResetting(true);
        try {
            await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/demo/reset`, { method: 'POST' });
            window.location.reload();
        } catch (e) {
            console.error("Failed to reset:", e);
            setIsResetting(false);
        }
    };

    return (
        <div className="bg-indigo-600 px-4 py-2 sm:px-6 lg:px-8 border-b border-indigo-500 shadow-md z-50 relative flex items-center justify-between">
            <div className="flex items-center gap-3 text-white text-sm font-medium">
                <span className="flex h-6 w-6 items-center justify-center rounded-sm bg-black/20">
                    <FileWarning className="w-4 h-4" />
                </span>
                <span>
                    👋 You're viewing the demo account — <strong>Sharma Family Home, Bengaluru</strong>
                </span>
            </div>

            <div className="flex items-center gap-4">
                <button
                    onClick={handleReset}
                    disabled={isResetting}
                    className="flex items-center gap-2 border border-white/20 bg-black/10 hover:bg-black/20 text-white rounded-md px-3 py-1 text-xs font-semibold transition-all"
                >
                    <RefreshCw className={`w-3 h-3 ${isResetting ? "animate-spin" : ""}`} />
                    {isResetting ? "Resetting..." : "Reset Demo Data"}
                </button>
                <button onClick={() => setIsVisible(false)} className="text-white/70 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    )
}
