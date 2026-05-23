'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

export default function RegisterPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [agreed, setAgreed] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const router = useRouter()

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) { setError('Passwords do not match'); return }
    if (!agreed) { setError('Please agree to the Terms of Service'); return }
    setLoading(true)
    setError('')

    const { data, error: signUpError } = await supabase.auth.signUp({ email, password })
    if (signUpError) { setError(signUpError.message); setLoading(false); return }

    if (data.user) {
      const { error: profileError } = await supabase.from('profiles').insert({
        id: data.user.id, username, full_name: fullName,
      })
      if (profileError) { setError(profileError.message); setLoading(false); return }
      setSuccess('Account created! Redirecting to login...')
      setTimeout(() => router.push('/login'), 2000)
    }
    setLoading(false)
  }

  const inputStyle = {
    width: '100%',
    padding: '12px 14px 12px 40px',
    background: '#0f0f0f',
    border: '1px solid #2a2a2a',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#ffffff',
    outline: 'none',
    boxSizing: 'border-box' as const
  }

  return (
    <main style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: '24px' }}>
      <div style={{ width: '420px', background: '#161616', border: '1px solid #2a2a2a', borderRadius: '16px', padding: '40px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ width: '48px', height: '48px', background: '#ffffff', borderRadius: '12px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '22px', marginBottom: '16px' }}>💬</div>
          <h1 style={{ fontSize: '22px', fontWeight: '700', color: '#ffffff', margin: '0 0 6px' }}>Create your account</h1>
          <p style={{ fontSize: '13px', color: '#6b7280', margin: 0 }}>Sign up to get started</p>
        </div>

        {error && (
          <div style={{ padding: '12px', background: '#2a1515', border: '1px solid #ef4444', borderRadius: '8px', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: '#ef4444', margin: 0 }}>{error}</p>
          </div>
        )}
        {success && (
          <div style={{ padding: '12px', background: '#0f2a1a', border: '1px solid #22c55e', borderRadius: '8px', marginBottom: '16px' }}>
            <p style={{ fontSize: '13px', color: '#22c55e', margin: 0 }}>{success}</p>
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Full name */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#e5e7eb', display: 'block', marginBottom: '8px' }}>Full name</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>👤</span>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter your full name" required style={inputStyle} />
            </div>
          </div>

          {/* Email */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#e5e7eb', display: 'block', marginBottom: '8px' }}>Email</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>✉</span>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" required style={inputStyle} />
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#e5e7eb', display: 'block', marginBottom: '8px' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>🔒</span>
              <input type={showPassword ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Create a password" required style={{ ...inputStyle, paddingRight: '40px' }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <label style={{ fontSize: '13px', fontWeight: '500', color: '#e5e7eb', display: 'block', marginBottom: '8px' }}>Confirm password</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#6b7280' }}>🔒</span>
              <input type={showConfirm ? 'text' : 'password'} value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} placeholder="Confirm your password" required style={{ ...inputStyle, paddingRight: '40px' }} />
              <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#6b7280' }}>
                {showConfirm ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* Terms */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#9ca3af', cursor: 'pointer' }}>
            <input type="checkbox" checked={agreed} onChange={e => setAgreed(e.target.checked)} style={{ accentColor: '#6366f1', width: '16px', height: '16px' }} />
            I agree to the <span style={{ color: '#ffffff', fontWeight: '600' }}>Terms of Service</span> and <span style={{ color: '#ffffff', fontWeight: '600' }}>Privacy Policy</span>
          </label>

          <button
            type="submit"
            disabled={loading}
            style={{ padding: '13px', background: '#ffffff', color: '#000000', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', opacity: loading ? 0.7 : 1, marginTop: '4px' }}>
            {loading ? 'Creating account...' : 'Sign up'}
          </button>
        </form>

        <p style={{ fontSize: '13px', color: '#6b7280', marginTop: '20px', textAlign: 'center' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: '#ffffff', fontWeight: '600', textDecoration: 'none' }}>Login</Link>
        </p>
      </div>
    </main>
  )
}