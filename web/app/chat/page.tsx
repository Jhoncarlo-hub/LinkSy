'use client'
import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'

type Message = { id: string; content: string; sender_id: string; created_at: string }
type Conversation = { id: string; name: string; is_group: boolean }

export default function ChatPage() {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConv, setActiveConv] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [search, setSearch] = useState('')
  const [dark, setDark] = useState(false)
  const [showNewChat, setShowNewChat] = useState(false)
  const [searchUser, setSearchUser] = useState('')
  const [foundUsers, setFoundUsers] = useState<any[]>([])
  const [activeSection, setActiveSection] = useState('inbox')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const t = {
    bg: dark ? '#0f1117' : '#f4f5f7',
    sidebar: dark ? '#161b27' : '#ffffff',
    border: dark ? '#1e2433' : '#e8eaed',
    input: dark ? '#1e2433' : '#f0f2f5',
    inputText: dark ? '#e5e7eb' : '#374151',
    text: dark ? '#e5e7eb' : '#111827',
    textMuted: dark ? '#6b7280' : '#9ca3af',
    bubble: dark ? '#1e2433' : '#ffffff',
    accent: '#6366f1',
    card: dark ? '#161b27' : '#ffffff',
    cardBorder: dark ? '#1e2433' : '#e8eaed',
  }

  const avatarColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4']
  const getColor = (name: string) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length]
  const getInitials = (name: string) => name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??'

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }
      setUser(user)

      const { data: members } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', user.id)

      if (members && members.length > 0) {
        const ids = members.map((m: any) => m.conversation_id)
        const { data: convs } = await supabase
          .from('conversations')
          .select('*')
          .in('id', ids)
          .order('created_at', { ascending: false })
        setConversations(convs || [])
      }
      setLoading(false)
    }
    init()
  }, [router])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (!activeConv) return
    const load = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', activeConv.id)
        .order('created_at', { ascending: true })
      setMessages(data || [])
    }
    load()

    const channel = supabase
      .channel(`messages:${activeConv.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${activeConv.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [activeConv])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const searchUsers = async (query: string) => {
    setSearchUser(query)
    if (query.length < 2) { setFoundUsers([]); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name')
      .ilike('username', `%${query}%`)
      .neq('id', user?.id)
      .limit(5)
    setFoundUsers(data || [])
  }

  const startConversation = async (otherUser: any) => {
    const { data: conv } = await supabase
      .from('conversations')
      .insert({ name: otherUser.full_name || otherUser.username, is_group: false })
      .select()
      .single()
    if (!conv) return
    await supabase.from('conversation_members').insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: otherUser.id }
    ])
    setConversations(prev => [conv, ...prev])
    setActiveConv(conv)
    setShowNewChat(false)
    setSearchUser('')
    setFoundUsers([])
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || !activeConv || !user) return
    await supabase.from('messages').insert({
      conversation_id: activeConv.id,
      sender_id: user.id,
      content: newMessage.trim(),
      type: 'text'
    })
    setNewMessage('')
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: t.bg }}>
      <p style={{ color: t.textMuted }}>Loading...</p>
    </div>
  )

  const navItems = [
    { id: 'inbox', label: 'Inbox', icon: '💬', count: conversations.length },
    { id: 'archive', label: 'Archive', icon: '🗂', count: 0 },
    { id: 'trash', label: 'Trash', icon: '🗑', count: 0 },
  ]

  const statusItems = [
    { label: 'Online', color: '#22c55e', count: 3 },
    { label: 'Busy', color: '#f59e0b', count: 2 },
    { label: 'Idle', color: '#8b5cf6', count: 4 },
    { label: 'Offline', color: '#6b7280', count: 12 },
  ]

  const s = (extra = {}) => ({ fontFamily: 'system-ui, sans-serif', ...extra })

  return (
    <div style={s({ display: 'flex', height: '100vh', background: t.bg, position: 'relative' })}>

      {/* Sidebar */}
      <div style={{ width: '300px', background: t.sidebar, borderRight: `1px solid ${t.border}`, display: 'flex', flexDirection: 'column' }}>

        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '20px', fontWeight: '800', color: t.accent }}>LinkSy</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button onClick={() => setDark(!dark)} style={{ width: '30px', height: '30px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.input, cursor: 'pointer', fontSize: '14px' }}>
              {dark ? '☀️' : '🌙'}
            </button>
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: getColor(user?.email || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '700', color: '#fff' }}>
              {getInitials(user?.email || '')}
            </div>
            <button onClick={handleLogout} style={{ fontSize: '12px', color: t.textMuted, background: 'none', border: 'none', cursor: 'pointer' }}>Logout</button>
          </div>
        </div>

        {/* Search */}
        <div style={{ padding: '12px 16px' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="🔍 Search conversations..." style={{ width: '100%', padding: '9px 12px', background: t.input, border: 'none', borderRadius: '8px', fontSize: '13px', color: t.inputText, outline: 'none', boxSizing: 'border-box' as const }} />
        </div>

        {/* New Conversation */}
        <div style={{ padding: '0 16px 12px' }}>
          <button onClick={() => setShowNewChat(true)} style={{ width: '100%', padding: '9px', background: t.accent, color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>
            + New Conversation
          </button>
        </div>

        {/* Nav */}
        <div style={{ padding: '0 8px' }}>
          {navItems.map(item => (
            <div key={item.id} onClick={() => setActiveSection(item.id)} style={{ padding: '10px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', background: activeSection === item.id ? (dark ? '#1e2433' : '#eef2ff') : 'transparent', marginBottom: '2px' }}>
              <span>{item.icon}</span>
              <span style={{ flex: 1, fontSize: '14px', fontWeight: '500', color: activeSection === item.id ? t.accent : t.text }}>{item.label}</span>
              {item.count > 0 && <span style={{ background: t.accent, color: 'white', borderRadius: '12px', padding: '2px 8px', fontSize: '12px', fontWeight: '600' }}>{item.count}</span>}
            </div>
          ))}
        </div>

        <div style={{ height: '1px', background: t.border, margin: '8px 16px' }} />

        {/* Create Group */}
        <div style={{ padding: '0 8px' }}>
          <div style={{ padding: '10px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
            <span>👥</span>
            <span style={{ fontSize: '14px', fontWeight: '500', color: t.text }}>Create a Group</span>
          </div>
        </div>

        <div style={{ height: '1px', background: t.border, margin: '8px 16px' }} />

        {/* Status */}
        <div style={{ padding: '0 16px 8px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '11px', fontWeight: '600', color: t.textMuted, textTransform: 'uppercase' as const, letterSpacing: '0.05em' }}>STATUS</span>
          </div>
          {statusItems.map(s => (
            <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '5px 0' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: s.color }} />
              <span style={{ flex: 1, fontSize: '13px', color: t.text }}>{s.label}</span>
              <span style={{ fontSize: '13px', color: t.textMuted }}>{s.count}</span>
            </div>
          ))}
        </div>

        {/* Conversation List */}
        {conversations.length > 0 && (
          <>
            <div style={{ height: '1px', background: t.border, margin: '8px 16px' }} />
            <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }}>
              {conversations.filter(c => c.name?.toLowerCase().includes(search.toLowerCase())).map(conv => (
                <div key={conv.id} onClick={() => setActiveConv(conv)} style={{ padding: '10px 12px', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', background: activeConv?.id === conv.id ? (dark ? '#1e2433' : '#eef2ff') : 'transparent', marginBottom: '2px' }}>
                  <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: getColor(conv.name || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                    {getInitials(conv.name || '')}
                  </div>
                  <div>
                    <div style={{ fontSize: '13px', fontWeight: '600', color: t.text }}>{conv.name}</div>
                    <div style={{ fontSize: '12px', color: t.textMuted }}>Direct message</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        {activeConv ? (
          <>
            {/* Chat Header */}
            <div style={{ padding: '14px 24px', background: dark ? '#161b27' : '#ffffff', borderBottom: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: getColor(activeConv.name || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff' }}>
                {getInitials(activeConv.name || '')}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '15px', fontWeight: '700', color: t.text }}>{activeConv.name}</div>
                <div style={{ fontSize: '12px', color: '#22c55e' }}>● Online</div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                {['📞', '🎥', '⋯'].map((icon, i) => (
                  <button key={i} style={{ width: '36px', height: '36px', borderRadius: '8px', border: `1px solid ${t.border}`, background: t.input, cursor: 'pointer', fontSize: '16px' }}>{icon}</button>
                ))}
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', flexDirection: 'column', gap: '12px', background: t.bg }}>
              {messages.length === 0 ? (
                <p style={{ textAlign: 'center', color: t.textMuted, fontSize: '13px', marginTop: '32px' }}>No messages yet. Say hello! 👋</p>
              ) : messages.map(msg => {
                const isMe = msg.sender_id === user?.id
                return (
                  <div key={msg.id} style={{ display: 'flex', justifyContent: isMe ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '60%', padding: '10px 14px', borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: isMe ? t.accent : t.bubble, color: isMe ? 'white' : t.text, fontSize: '13px', lineHeight: '1.5', border: isMe ? 'none' : `1px solid ${t.border}` }}>
                      {msg.content}
                      <div style={{ fontSize: '11px', color: isMe ? 'rgba(255,255,255,0.6)' : t.textMuted, marginTop: '4px', textAlign: 'right' }}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '16px 24px', background: dark ? '#161b27' : '#ffffff', borderTop: `1px solid ${t.border}`, display: 'flex', alignItems: 'center', gap: '10px' }}>
              <input value={newMessage} onChange={e => setNewMessage(e.target.value)} onKeyDown={handleKeyPress} placeholder="Type a message..." style={{ flex: 1, padding: '11px 16px', borderRadius: '24px', border: `1px solid ${t.border}`, fontSize: '13px', outline: 'none', background: t.input, color: t.inputText }} />
              <button onClick={sendMessage} style={{ width: '40px', height: '40px', borderRadius: '50%', background: t.accent, border: 'none', cursor: 'pointer', color: 'white', fontSize: '18px' }}>➤</button>
            </div>
          </>
        ) : (
          /* Welcome Screen */
          <div style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '40px', flexWrap: 'wrap' as const, gap: '24px' }}>
              <div>
                <h2 style={{ fontSize: '28px', fontWeight: '800', color: t.text, margin: '0 0 8px' }}>Welcome to LinkSy! 👋</h2>
                <p style={{ fontSize: '14px', color: t.textMuted, margin: 0 }}>Where ideas connect and conversations flow.</p>
                <div style={{ display: 'flex', gap: '12px', marginTop: '20px' }}>
                  <button onClick={() => setShowNewChat(true)} style={{ padding: '10px 20px', background: t.accent, color: 'white', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>+ New Conversation</button>
                  <button style={{ padding: '10px 20px', background: 'transparent', color: t.text, border: `1px solid ${t.border}`, borderRadius: '8px', fontSize: '13px', fontWeight: '600', cursor: 'pointer' }}>⊙ Learn More</button>
                </div>
              </div>
              <div style={{ fontSize: '80px', lineHeight: '1' }}>💬</div>
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: '700', color: t.text, marginBottom: '16px' }}>Get started</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>
              {[
                { icon: '💬', title: 'Start a conversation', desc: 'Ask anything, share ideas, or just say hi.' },
                { icon: '🗂', title: 'Organize your chats', desc: 'Use inbox to keep your conversations organized.' },
                { icon: '✨', title: 'Unlock more', desc: 'Invite friends and grow your network.' },
              ].map((card, i) => (
                <div key={i} style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: '12px', padding: '20px', cursor: 'pointer' }}>
                  <div style={{ fontSize: '28px', marginBottom: '12px' }}>{card.icon}</div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: t.text, marginBottom: '6px' }}>{card.title}</div>
                  <div style={{ fontSize: '12px', color: t.textMuted, lineHeight: '1.5', marginBottom: '12px' }}>{card.desc}</div>
                  <div style={{ fontSize: '18px', color: t.accent }}>→</div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: '700', color: t.text, margin: 0 }}>Recent Conversations</h3>
              <button style={{ fontSize: '13px', color: t.accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: '600' }}>View all</button>
            </div>
            {conversations.length === 0 ? (
              <div style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: '12px', padding: '32px', textAlign: 'center' as const }}>
                <p style={{ color: t.textMuted, fontSize: '13px', margin: 0 }}>No conversations yet. Start one!</p>
              </div>
            ) : conversations.slice(0, 5).map(conv => (
              <div key={conv.id} onClick={() => setActiveConv(conv)} style={{ background: t.card, border: `1px solid ${t.cardBorder}`, borderRadius: '12px', padding: '16px 20px', display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px', cursor: 'pointer' }}>
                <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: getColor(conv.name || ''), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '14px', fontWeight: '700', color: '#fff' }}>
                  {getInitials(conv.name || '')}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: t.text }}>{conv.name}</div>
                  <div style={{ fontSize: '12px', color: t.textMuted }}>Click to open conversation</div>
                </div>
                <span style={{ fontSize: '12px', color: t.textMuted }}>Just now</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* New Chat Modal */}
      {showNewChat && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: dark ? '#161b27' : '#ffffff', borderRadius: '16px', padding: '28px', width: '380px', border: `1px solid ${t.border}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: '700', color: t.text, margin: 0 }}>New Conversation</h3>
              <button onClick={() => setShowNewChat(false)} style={{ background: 'none', border: 'none', fontSize: '22px', cursor: 'pointer', color: t.textMuted }}>×</button>
            </div>
            <input value={searchUser} onChange={e => searchUsers(e.target.value)} placeholder="Search by username..." style={{ width: '100%', padding: '11px 14px', borderRadius: '8px', border: `1px solid ${t.border}`, fontSize: '13px', background: t.input, color: t.inputText, outline: 'none', marginBottom: '12px', boxSizing: 'border-box' as const }} />
            {foundUsers.length > 0 ? foundUsers.map(u => (
              <div key={u.id} onClick={() => startConversation(u)} style={{ padding: '12px', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '12px', background: t.input, marginBottom: '8px' }}>
                <div style={{ width: '38px', height: '38px', borderRadius: '50%', background: getColor(u.username), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: '700', color: '#fff', flexShrink: 0 }}>
                  {getInitials(u.full_name || u.username)}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600', color: t.text }}>{u.full_name || u.username}</div>
                  <div style={{ fontSize: '12px', color: t.textMuted }}>@{u.username}</div>
                </div>
              </div>
            )) : (
              <p style={{ fontSize: '13px', color: t.textMuted, textAlign: 'center' as const }}>
                {searchUser.length < 2 ? 'Type a username to search' : 'No users found'}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  )
}