'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) { setError(signInError.message); setLoading(false); return }
    router.push('/chat')
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ width: '420px', background: '#161616', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '40px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '48px', height: '48px', background: '#ffffff', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '16px' }}>💬</div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', margin: '0 0 6px' }}>Welcome back</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Login to your account</p>
        </div>

        {error && (
          <div style={{ padding: '12px', background: '#2a1515', border: '1px solid #ef4444', borderRadius: '8px', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: '#ef4444', margin: 0 }}>{error}</p>
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#e5e7eb', display: 'block', marginBottom: '8px' }}>Email</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: '16px' }}>✉</span>
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                style={{ width: '100%', padding: '12px 14px 12px 40px', background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '8px', fontSize: '13px', color: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#e5e7eb', display: 'block', marginBottom: '8px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280', fontSize: '16px' }}>🔒</span>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                style={{ width: '100%', padding: '12px 40px 12px 40px', background: '#0f0f0f', border: '1px solid #2a2a2a', borderRadius: '8px', fontSize: '13px', color: '#ffffff', outline: 'none', boxSizing: 'border-box' }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280', fontSize: '16px' }}>
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#9ca3af', cursor: 'pointer' }}>
              <input type="checkbox" style={{ accentColor: '#6366f1' }} />
              Remember me
            </label>
            <a href="#" style={{ fontSize: '13px', color: '#9ca3af', textDecoration: 'none' }}>Forgot password?</a>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{ padding: '13px', background: '#ffffff', color: '#000000', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', opacity: loading ? 0.7 : 1, marginTop: '4px' }}>
            {loading ? 'Signing in...' : 'Login'}
          </button>
        </form>

        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '20px', textAlign: 'center' }}>
          Don't have an account?{' '}
          <Link href="/register" style={{ color: '#ffffff', fontWeight: '600', textDecoration: 'none' }}>Sign up</Link>
        </p>
      </div>
    </main>
  )
}