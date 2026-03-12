import { createBrowserClient } from './supabase-browser';
import { toast } from 'sonner';

export const fetchApi = async (endpoint: string, options: RequestInit = {}) => {
    let baseUrl = 
        process.env.NEXT_PUBLIC_API_URL || 
        process.env.NEXT_PUBLIC_API_BASE_URL || 
        'http://localhost:8000'; // absolute fallback

    // Ensure API path is respected since .env string was shortened
    if (!baseUrl.endsWith('/api/v1') && !baseUrl.includes('/api/v1')) {
        baseUrl = baseUrl.endsWith('/') ? `${baseUrl}api/v1` : `${baseUrl}/api/v1`;
    }

    console.log('[API] baseUrl:', baseUrl);
    console.log('[API] calling:', endpoint);

    let authHeader = {};
    try {
        const supabase = createBrowserClient();
        // First try getSession, then fallback to refreshSession if token is missing
        let { data: { session } } = await supabase.auth.getSession();
        if (!session) {
            // Session might not be loaded yet on first render — try a refresh
            const { data: refreshed } = await supabase.auth.refreshSession();
            session = refreshed.session;
        }
        const token = session?.access_token || null;
        if (token) {
            authHeader = { Authorization: `Bearer ${token}` };
        }
    } catch (err) {
        console.warn("Could not get supabase session for api request", err);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30s for bulk operations

    // Helper to conditionally apply trailing slashes to prevent 307 CORS dropouts
    const ensureTrailingSlash = (url: string) => {
        const [path, query] = url.split('?');
        const hasUUID = /[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}/.test(path);
        const hasSlash = path.endsWith('/');
        const isGenerate = path.endsWith('/generate');
        const isTwin = path.endsWith('/twin');
        if (hasUUID || hasSlash || isGenerate || isTwin) return url;
        return query ? `${path}/?${query}` : `${path}/`;
    };

    // Ensure no double slashes if both have leading/trailing slashes
    const normalizedBaseUrl = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const normalizedEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const fullUrl = ensureTrailingSlash(`${normalizedBaseUrl}${normalizedEndpoint}`);
    console.log(`[API REQUEST] Fetching: ${fullUrl}`);

    try {
        const response = await fetch(fullUrl, {
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
        console.error(`[API ERROR] Failed to fetch ${fullUrl}:`, err);
        throw err;
    }
};
