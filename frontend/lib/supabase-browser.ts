import { createBrowserClient as _createBrowserClient } from '@supabase/ssr'

let client: any = null

export function createBrowserClient() {
  if (client) return client
  
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  
  if (!url || !key) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local')
  }
  
  client = _createBrowserClient(url, key)
  return client
}
