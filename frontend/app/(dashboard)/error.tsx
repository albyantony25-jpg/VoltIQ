"use client"

import { useEffect } from "react"
import { AlertCircle, RefreshCcw } from "lucide-react"

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Dashboard caught global error:", error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight text-white mb-2">Something went wrong!</h2>
            <p className="text-slate-400 max-w-md mb-8">
                An unexpected error occurred while loading this dashboard module. Our systems have logged the issue.
            </p>
            <button
                onClick={() => reset()}
                className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
                <RefreshCcw className="w-4 h-4" /> Try again
            </button>
        </div>
    )
}
