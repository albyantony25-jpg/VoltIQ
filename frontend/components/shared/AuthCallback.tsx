"use client";

import { useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function AuthCallback() {
    const searchParams = useSearchParams();
    const router = useRouter();

    useEffect(() => {
        // Supabase sends errors in the URL hash or query params
        // For example: ?error=access_denied&error_code=otp_expired
        
        const error = searchParams.get('error');
        const errorCode = searchParams.get('error_code');
        const errorDescription = searchParams.get('error_description');

        if (error || errorCode) {
            console.error('[AuthCallback] Error detected:', { error, errorCode, errorDescription });
            
            let message = 'Authentication failed.';
            
            if (errorCode === 'otp_expired') {
                message = 'The security link has expired. Please request a new one.';
            } else if (error === 'access_denied') {
                message = 'Access denied. Please try signing in again.';
            } else if (errorDescription) {
                message = decodeURIComponent(errorDescription).replace(/\+/g, ' ');
            }

            toast.error(message, {
                duration: 6000,
            });

            // Clean up the URL by pushing to /login or /
            router.replace('/login');
        }
    }, [searchParams, router]);

    return null; // This component is logic-only
}
