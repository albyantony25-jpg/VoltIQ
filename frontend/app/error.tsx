"use client";

import { useEffect } from "react";
import { AlertCircle, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Global Error Boundary caught:", error);
    }, [error]);

    return (
        <div className="flex items-center justify-center min-h-[70vh] p-6">
            <Card className="max-w-md w-full border-destructive/20 shadow-lg">
                <CardHeader className="text-center pb-2">
                    <div className="mx-auto bg-destructive/10 p-4 rounded-full w-16 h-16 flex items-center justify-center mb-4 text-destructive">
                        <AlertCircle className="w-8 h-8" />
                    </div>
                    <CardTitle className="text-2xl">Something went wrong!</CardTitle>
                    <CardDescription className="text-base mt-2">
                        A critical render error occurred while loading this page. Our team has been notified.
                    </CardDescription>
                </CardHeader>
                <CardContent className="flex flex-col items-center pt-4">
                    <div className="bg-muted p-4 rounded-md w-full overflow-hidden text-xs text-muted-foreground mb-6 font-mono">
                        {error.message || "Unknown rendering error"}
                    </div>
                    <Button onClick={() => reset()} className="w-full gap-2">
                        <RefreshCcw className="w-4 h-4" /> Reload Page
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
