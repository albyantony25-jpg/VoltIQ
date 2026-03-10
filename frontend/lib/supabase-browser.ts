// Browser-side Supabase client — safe to use in Client Components
import { createBrowserClient as _createBrowserClient } from '@supabase/ssr'

export function createBrowserClient() {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL! || 'https://placeholder.supabase.co'
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! || 'placeholder'

    const client = _createBrowserClient(url, key)

    // If using a placeholder URL, intercept all network requests so the UI doesn't hang
    if (url.includes('placeholder.supabase.co') || url.includes('your-supabase-url')) {
        const dummyUser = {
            id: '00000000-0000-0000-0000-000000000000',
            email: 'demo@example.com',
            user_metadata: { full_name: 'Local Demo User' }
        }

        // Helper to simulate network delay for React state handling
        const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

        // 1. Mock Auth
        const mockAuth = {
            getSession: async () => { await delay(100); return { data: { session: { user: dummyUser, access_token: 'fake-token' } }, error: null } },
            getUser: async () => { await delay(100); return { data: { user: dummyUser }, error: null } },
            signInWithPassword: async () => { await delay(500); return { data: { user: dummyUser, session: { user: dummyUser, access_token: 'fake-token' } }, error: null } },
            signInWithOAuth: async () => { await delay(500); return { data: { url: '/overview', provider: 'google' }, error: null } },
            signUp: async () => { await delay(500); return { data: { user: dummyUser }, error: null } },
            signOut: async () => { await delay(100); return { error: null } },
            onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => { } } } })
        }

        // Use a Proxy so Next.js doesn't accidentally call the real methods or get confused by missing ones bindings
        client.auth = new Proxy(client.auth, {
            get(target, prop) {
                if (prop in mockAuth) {
                    return mockAuth[prop as keyof typeof mockAuth]
                }
                const original = target[prop as keyof typeof target]
                if (typeof original === 'function') {
                    return original.bind(target)
                }
                return original
            }
        }) as any

        // 2. Mock DB (return a pre-existing home so the setup wizard is bypassed and we can test the dashboard) !!
        client.from = (table: string) => {
            const mockChain = {
                select: () => mockChain,
                eq: () => mockChain,
                order: () => mockChain,
                limit: () => mockChain,
                single: async () => {
                    if (table === 'homes') return { data: { id: '11111111-1111-1111-1111-111111111111', name: 'Demo Home' }, error: null }
                    return { data: null, error: null }
                },
                then: (resolve: any) => {
                    if (table === 'homes') return resolve({ data: [{ id: '11111111-1111-1111-1111-111111111111', name: 'Demo Home' }], error: null })
                    return resolve({ data: [], error: null })
                }
            }
            return mockChain as any
        }
    }

    return client
}
