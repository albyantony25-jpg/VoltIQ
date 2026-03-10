import { Loader2 } from "lucide-react"

export default function Loading() {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
            <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
            <p className="font-medium text-sm animate-pulse">Loading dashboard module...</p>
        </div>
    )
}
