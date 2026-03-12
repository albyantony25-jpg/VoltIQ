"use client"

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createBrowserClient } from '@/lib/supabase-browser'
import Link from 'next/link'
import { Eye, EyeOff, Zap, Loader2 } from 'lucide-react'

export default function RegisterPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPass, setShowPass] = useState(false)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    
    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError('')
    
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, fullName })
      })
      
      if (!res.ok) {
        const errorData = await res.json()
        setError(errorData.error || 'Registration failed')
        setLoading(false)
        return
      }
      
      // Refresh browser client token manually from new cookies
      createBrowserClient();
      
      // Auto-redirect to setup after successful registration
      router.push('/setup')
    } catch (err: any) {
      setError('An unexpected error occurred.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#080808] flex items-center justify-center px-4 relative overflow-hidden py-12">
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
          <h1 className="text-2xl font-bold text-white">Create an account</h1>
          <p className="text-neutral-500 text-sm mt-1">Start optimizing your energy today</p>
        </div>

        {/* Register Card */}
        <div className="w-full bg-[#111] border border-[#1e1e1e] rounded-2xl p-8">
          
          {error && (
            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-500 text-xs text-center font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleRegister} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Full Name</label>
              <input
                type="text"
                required
                value={fullName}
                onChange={e => setFullName(e.target.value)}
                className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-amber-500/60 transition-colors"
                placeholder="Rahul Sharma"
              />
            </div>

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
                  placeholder="At least 6 characters"
                  minLength={6}
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

            <div>
              <label className="block text-xs font-medium text-neutral-400 mb-1.5">Confirm Password</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl px-4 py-3 pr-10 text-white text-sm placeholder-neutral-600 focus:outline-none focus:border-amber-500/60 transition-colors"
                  placeholder="Repeat your password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl transition-all disabled:opacity-60 disabled:hover:bg-amber-500 flex items-center justify-center gap-2 text-sm"
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Creating Account...</> : 'Create Account'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-neutral-600 mt-8">
          Already have an account?{' '}
          <Link href="/login" className="text-amber-400 hover:text-amber-300 font-medium transition-colors">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  )
}
