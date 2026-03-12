import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: Request) {
  console.log('[API auth/login] Received POST request')
  
  try {
    const { email, password } = await request.json()
    console.log('[API auth/login] Parsed body successfully for:', email)

    const response = NextResponse.json({ success: true })

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return request.headers.get('cookie')?.split('; ').map(c => {
              const [name, ...v] = c.split('=')
              return { name, value: v.join('=') }
            }) || []
          },
          setAll(cookiesToSet) {
            console.log(`[API auth/login] Setting ${cookiesToSet.length} cookies`)
            cookiesToSet.forEach(({ name, value, options }) =>
              response.cookies.set(name, value, options)
            )
          },
        },
      }
    )

    console.log('[API auth/login] Created Supabase server client. Calling signInWithPassword...')
    
    // Add a manual timeout race condition just in case Supabase fetch hangs infinitely
    const { data, error } = await Promise.race([
      supabase.auth.signInWithPassword({ email, password }),
      new Promise<any>((_, reject) => setTimeout(() => reject(new Error("Supabase signIn timeout after 5s")), 5000))
    ]);

    console.log('[API auth/login] signInWithPassword completed. Error:', error)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }

    console.log('[API auth/login] Success. Returning response.')
    return response
  } catch (err: any) {
    console.error('[API auth/login] FATAL CRASH:', err)
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 })
  }
}
