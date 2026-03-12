"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div className="flex h-[80vh] flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 rounded-full bg-red-500/10 p-5 shadow-lg shadow-red-500/10">
                <AlertTriangle className="h-10 w-10 text-red-500" />
            </div>
            <h2 className="mb-2 text-2xl font-bold tracking-tight text-white">Something malfunctioned</h2>
            <p className="mb-8 max-w-md text-slate-400">
                An unexpected error occurred while processing this part of the dashboard. Our AI monitoring has recorded this event.
            </p>
            <Button onClick={() => reset()} className="px-8" variant="outline">
                Attempt to Recover
            </Button>
        </div>
    );
}
