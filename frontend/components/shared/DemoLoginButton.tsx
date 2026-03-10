import React from "react"
import { Button } from "@/components/ui/button"
import { Sparkles } from "lucide-react"

interface DemoLoginButtonProps {
    onDemoSelect?: (email: string, pass: string) => void;
}

export function DemoLoginButton({ onDemoSelect }: DemoLoginButtonProps) {
    const handleDemoClick = () => {
        if (onDemoSelect) {
            onDemoSelect("demo@voltiq.app", "Demo@1234")
        }
    }

    return (
        <div className="flex flex-col items-center gap-3 mt-4 w-full">
            <div className="relative flex items-center justify-center w-full">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-950 px-3 text-xs font-semibold text-slate-500 absolute">OR</span>
            </div>

            <Button
                variant="outline"
                type="button"
                onClick={handleDemoClick}
                className="w-full border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:border-indigo-500/50 hover:text-indigo-300 transition-all font-medium h-12"
            >
                <Sparkles className="w-4 h-4 mr-2" />
                Try Demo — No signup needed
            </Button>

            <p className="text-[11px] text-slate-500 text-center font-medium">
                Loads a pre-built home with 6 months of data
            </p>
        </div>
    )
}
