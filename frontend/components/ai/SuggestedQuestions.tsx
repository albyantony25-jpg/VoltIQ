"use client"

import { Lightbulb } from "lucide-react"

interface SuggestedQuestionsProps {
    onSelect: (q: string) => void;
}

const QUESTIONS = [
    "Why is my bill high this month?",
    "Which appliance wastes the most energy?",
    "How can I reduce my bill by 20%?",
    "Compare my usage with similar homes",
    "Predict my bill for end of month"
]

export function SuggestedQuestions({ onSelect }: SuggestedQuestionsProps) {
    return (
        <div className="w-full">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <Lightbulb className="h-3 w-3" /> Suggested for you
            </h4>
            <div className="flex flex-wrap gap-2">
                {QUESTIONS.map((q, i) => (
                    <button
                        key={i}
                        onClick={() => onSelect(q)}
                        className="text-sm font-medium text-indigo-300 bg-indigo-500/10 border border-indigo-500/20 hover:bg-indigo-500/20 hover:border-indigo-500/40 px-3 py-1.5 rounded-full transition-all duration-200 animate-in fade-in slide-in-from-bottom-2"
                        style={{ animationDelay: `${i * 100}ms` }}
                    >
                        {q}
                    </button>
                ))}
            </div>
        </div>
    )
}
