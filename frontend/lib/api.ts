import { createBrowserClient } from './supabase';
import { toast } from 'sonner';

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || `${process.env.NEXT_PUBLIC_API_URL}/api/v1`;

    let authHeader = {};
    try {
        const supabase = createBrowserClient();
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
            authHeader = { Authorization: `Bearer ${session.access_token}` };
        }
    } catch (err) {
        console.warn("Could not get supabase session for api request", err);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
        const response = await fetch(`${baseUrl}${endpoint}`, {
            ...options,
            signal: controller.signal,
            headers: {
                'Content-Type': 'application/json',
                ...authHeader,
                ...options.headers,
            },
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
            if (response.status === 401) {
                const supabase = createBrowserClient();
                await supabase.auth.signOut();
                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                }
                throw new Error("Unauthorized");
            }
            if (response.status === 429) {
                const retryAfter = response.headers.get("Retry-After") || "a few";
                toast.error(`Rate limit reached. Try again in ${retryAfter} minutes.`);
                throw new Error("Rate limit exceeded");
            }
            if (response.status >= 500) {
                toast.error("Something went wrong. Our team has been notified.");
                throw new Error("Internal Server Error");
            }

            let errorDetails = response.statusText;
            try {
                const errJson = await response.json();
                errorDetails = errJson.detail || errJson.message || errorDetails;
            } catch (e) { }
            throw new Error(`API error: ${response.status} ${errorDetails}`);
        }

        return await response.json();
    } catch (err: any) {
        clearTimeout(timeoutId);
        if (err.name === 'AbortError') {
            toast.error("Request timed out. Check your connection.");
            throw new Error("Request timeout");
        }
        throw err;
    }
};
