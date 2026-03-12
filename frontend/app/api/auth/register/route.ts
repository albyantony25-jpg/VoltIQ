import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function POST(request: Request) {
  const { email, password, fullName } = await request.json()

  // Use a completely empty response object to hold the cookies initially
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
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName }
    }
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return response
}
