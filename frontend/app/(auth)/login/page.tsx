"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import { toast } from 'sonner'
import { Eye, EyeOff, Zap, Loader2 } from 'lucide-react'
import { fetchApi } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [demoLoading, setDemoLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email, password
      })
      if (error) {
        setError(error.message)
        return
      }
      // Use window.location instead of router.push to force full reload
      // This ensures Supabase session cookies are properly set
      window.location.href = '/overview'
    } catch (err: any) {
      setError('Login failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setDemoLoading(true)
    setError('')
    try {
      const supabase = createBrowserClient()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'demo@energyiq.app',
        password: 'Demo@1234'
      })
      if (error) {
        toast.error('Demo login failed: ' + error.message)
        return
      }
      // For demo: always go directly to overview, skip home check
      window.location.href = '/overview'
    } catch (err: any) {
      toast.error('Demo login failed. Please try again.')
    } finally {
      setDemoLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-64 bg-amber-500/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="w-full max-w-sm relative z-10 flex flex-col items-center">
        {/* Header */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 text-white hover:text-amber-400 transition-colors mb-6">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-black fill-black" />
            </div>
            <span className="font-bold text-lg">Volt<span className="text-amber-400">IQ</span></span>
          </Link>
          <h1 className="text-2xl font-bold text-white">Welcome back</h1>
          <p className="text-neutral-500 text-sm mt-1">Sign in to your account</p>
        </div>

        {/* Login Card */}
        <div className="w-full bg-[#111] border border-[#1e1e1e] rounded-2xl p-8">
          
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-amber-500/60 transition-colors"
                placeholder="you@example.com"
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 pr-10 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-amber-500/60 transition-colors"
                  placeholder="••••••••"
                />
                <button 
                  type="button" 
                  onClick={() => setShowPass(p => !p)} 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || demoLoading}
              className="w-full mt-2 bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl transition-all disabled:opacity-60 disabled:hover:bg-amber-500 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Signing in...</> : 'Sign In'}
            </button>
          </form>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#1e1e1e]" />
            </div>
            <div className="relative flex justify-center text-xs text-neutral-600 px-3 bg-[#111] mx-auto w-fit">
              or
            </div>
          </div>

          <button
            type="button"
            onClick={handleDemoLogin}
            disabled={loading || demoLoading}
            className="w-full border border-[#2a2a2a] hover:border-amber-500/50 text-amber-400 font-medium py-3 rounded-xl transition-all text-sm flex items-center justify-center gap-2 hover:bg-amber-500/5 disabled:opacity-60"
          >
            {demoLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> Loading demo...</> : '⚡ Try Demo Account'}
          </button>
        </div>

        <p className="text-center text-sm text-neutral-600 mt-8">
          Don't have an account?{' '}
          <Link href="/register" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
            Register here
          </Link>
        </p>
      </div>
    </div>
  )
}
