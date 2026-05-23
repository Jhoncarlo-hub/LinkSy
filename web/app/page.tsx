import Link from 'next/link'

export default function Home() {
  return (
    <main style={{ minHeight: '100vh', background: '#d1d5db', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ background: '#1c1c2e', borderRadius: '20px', padding: '48px 40px', width: '360px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '26px', fontWeight: '700', color: '#ffffff', margin: '0 0 8px' }}>LinkSy</h1>
        <p style={{ fontSize: '13px', color: '#6b7280', margin: '0 0 36px' }}>Connect with anyone, anywhere</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <Link href="/login" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 22px', background: '#e5e7eb', color: '#111827', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
            Log In <span>→</span>
          </Link>
          <Link href="/register" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '15px 22px', background: 'transparent', color: '#e5e7eb', border: '1px solid #374151', borderRadius: '10px', textDecoration: 'none', fontSize: '14px', fontWeight: '600' }}>
            Create Account <span>→</span>
          </Link>
        </div>
      </div>
    </main>
  )
}