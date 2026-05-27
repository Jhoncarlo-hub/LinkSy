import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StatusBar, FlatList, TextInput, Modal, AppState } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

export default function ChatScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null)
  const [conversations, setConversations] = useState<any[]>([])
  const [dark, setDark] = useState(true)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [searchUser, setSearchUser] = useState('')
  const [foundUsers, setFoundUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({})

  const t = {
    bg: dark ? '#0f1117' : '#f4f5f7',
    card: dark ? '#1a1d27' : '#ffffff',
    text: dark ? '#e5e7eb' : '#111827',
    muted: dark ? '#6b7280' : '#9ca3af',
    border: dark ? '#1e2433' : '#e8eaed',
    accent: '#6366f1',
    input: dark ? '#1e2433' : '#f0f2f5',
  }

  const avatarColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6']
  const getColor = (name: string) => avatarColors[(name?.charCodeAt(0) || 0) % avatarColors.length]
  const getInitials = (name: string) => name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??'

  const setOnlineStatus = async (userId: string, isOnline: boolean) => {
    await supabase.from('profiles').update({
      is_online: isOnline,
      last_seen: new Date().toISOString()
    }).eq('id', userId)
  }

  const loadUnreadCounts = async (userId: string) => {
    const { data } = await supabase
      .from('conversation_members')
      .select('conversation_id, unread_count')
      .eq('user_id', userId)
    if (data) {
      const counts: Record<string, number> = {}
      data.forEach((m: any) => {
        counts[m.conversation_id] = m.unread_count || 0
      })
      setUnreadCounts(counts)
    }
  }

  const resetUnread = async (conversationId: string, userId: string) => {
    await supabase
      .from('conversation_members')
      .update({ unread_count: 0 })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
    setUnreadCounts(prev => ({ ...prev, [conversationId]: 0 }))
  }

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigation.replace('Landing'); return }
      setUser(user)
      await setOnlineStatus(user.id, true)

      const { data: members } = await supabase.from('conversation_members').select('conversation_id').eq('user_id', user.id)
      if (members && members.length > 0) {
        const ids = members.map((m: any) => m.conversation_id)
        const { data: convs } = await supabase.from('conversations').select('*').in('id', ids).order('created_at', { ascending: false })
        setConversations(convs || [])
      }
      await loadUnreadCounts(user.id)
      setLoading(false)
    }
    init()

    const appStateSub = AppState.addEventListener('change', async (state) => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) await setOnlineStatus(user.id, state === 'active')
    })

    const channel = supabase
      .channel('unread_updates')
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'conversation_members',
      }, () => {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) loadUnreadCounts(user.id)
        })
      })
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, () => {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) loadUnreadCounts(user.id)
        })
      })
      .subscribe()

    return () => {
      appStateSub.remove()
      supabase.removeChannel(channel)
    }
  }, [])

  const searchUsers = async (query: string) => {
    setSearchUser(query)
    if (query.length < 2) { setFoundUsers([]); return }
    const { data } = await supabase.from('profiles').select('id, username, full_name, is_online').ilike('username', `%${query}%`).neq('id', user?.id).limit(5)
    setFoundUsers(data || [])
  }

  const startConversation = async (otherUser: any) => {
    const { data: existing } = await supabase.from('conversation_members').select('conversation_id').eq('user_id', user.id)
    if (existing && existing.length > 0) {
      const ids = existing.map((m: any) => m.conversation_id)
      const { data: otherMember } = await supabase.from('conversation_members').select('conversation_id').eq('user_id', otherUser.id).in('conversation_id', ids)
      if (otherMember && otherMember.length > 0) {
        const { data: conv } = await supabase.from('conversations').select('*').eq('id', otherMember[0].conversation_id).single()
        setShowModal(false)
        setSearchUser('')
        setFoundUsers([])
        navigation.navigate('Conversation', { conversation: conv, user })
        return
      }
    }
    const { data: conv } = await supabase.from('conversations').insert({ name: otherUser.full_name || otherUser.username, is_group: false }).select().single()
    if (!conv) return
    await supabase.from('conversation_members').insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: otherUser.id }
    ])
    setConversations(prev => [conv, ...prev])
    setShowModal(false)
    setSearchUser('')
    setFoundUsers([])
    navigation.navigate('Conversation', { conversation: conv, user })
  }

  const handleLogout = async () => {
    await setOnlineStatus(user.id, false)
    await supabase.auth.signOut()
    navigation.replace('Landing')
  }

  const handleOpenConversation = async (item: any) => {
    await resetUnread(item.id, user.id)
    navigation.navigate('Conversation', { conversation: item, user })
  }

  const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0)

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: t.muted }}>Loading...</Text>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: t.card, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: t.accent }}>LinkSy</Text>
          {totalUnread > 0 && (
            <View style={{ marginLeft: 8, backgroundColor: '#ef4444', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 2 }}>
              <Text style={{ color: 'white', fontSize: 11, fontWeight: '700' }}>{totalUnread}</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <TouchableOpacity onPress={() => navigation.navigate('Friends')} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: t.input, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
            <Text>👥</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setDark(!dark)} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: t.input, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
            <Text>{dark ? '☀️' : '🌙'}</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout}>
            <Text style={{ color: t.muted, fontSize: 13 }}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={{ padding: 12, backgroundColor: t.card }}>
        <TextInput value={search} onChangeText={setSearch} placeholder="🔍 Search conversations..." placeholderTextColor={t.muted} style={{ backgroundColor: t.input, borderRadius: 10, padding: 10, color: t.text, fontSize: 13 }} />
      </View>

      <View style={{ padding: 12, backgroundColor: t.card, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
        <TouchableOpacity onPress={() => setShowModal(true)} style={{ backgroundColor: t.accent, borderRadius: 10, padding: 12, alignItems: 'center' }}>
          <Text style={{ color: 'white', fontWeight: '700', fontSize: 14 }}>+ New Conversation</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={conversations.filter(c => c.name?.toLowerCase().includes(search.toLowerCase()))}
        keyExtractor={item => item.id}
        ListEmptyComponent={
          <View style={{ alignItems: 'center', marginTop: 60 }}>
            <Text style={{ fontSize: 48, marginBottom: 12 }}>💬</Text>
            <Text style={{ color: t.text, fontSize: 18, fontWeight: '700', marginBottom: 8 }}>Welcome to LinkSy!</Text>
            <Text style={{ color: t.muted, fontSize: 13 }}>Start a new conversation</Text>
          </View>
        }
        renderItem={({ item }) => {
          const unread = unreadCounts[item.id] || 0
          return (
            <TouchableOpacity onPress={() => handleOpenConversation(item)} style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: t.card, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
              <View style={{ position: 'relative', marginRight: 12 }}>
                <View style={{ width: 46, height: 46, borderRadius: 23, backgroundColor: getColor(item.name || ''), alignItems: 'center', justifyContent: 'center' }}>
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 15 }}>{getInitials(item.name || '')}</Text>
                </View>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: t.text, fontWeight: unread > 0 ? '800' : '600', fontSize: 14 }}>{item.name}</Text>
                <Text style={{ color: t.muted, fontSize: 12 }}>{unread > 0 ? 'New message!' : 'Tap to open chat'}</Text>
              </View>
              {unread > 0 && (
                <View style={{ backgroundColor: t.accent, borderRadius: 12, minWidth: 22, height: 22, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 }}>
                  <Text style={{ color: 'white', fontSize: 12, fontWeight: '700' }}>{unread}</Text>
                </View>
              )}
            </TouchableOpacity>
          )
        }}
      />

      <Modal visible={showModal} animationType="slide" transparent>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
          <View style={{ backgroundColor: dark ? '#1a1d27' : '#ffffff', borderRadius: 16, padding: 24, width: '100%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 17, fontWeight: '700', color: t.text }}>New Conversation</Text>
              <TouchableOpacity onPress={() => { setShowModal(false); setSearchUser(''); setFoundUsers([]) }}>
                <Text style={{ fontSize: 22, color: t.muted }}>×</Text>
              </TouchableOpacity>
            </View>
            <TextInput value={searchUser} onChangeText={searchUsers} placeholder="Search by username..." placeholderTextColor={t.muted} autoCapitalize="none" style={{ backgroundColor: t.input, borderRadius: 10, padding: 12, color: t.text, fontSize: 13, marginBottom: 12 }} />
            {foundUsers.map(u => (
              <TouchableOpacity key={u.id} onPress={() => startConversation(u)} style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: t.input, borderRadius: 10, marginBottom: 8 }}>
                <View style={{ position: 'relative', marginRight: 12 }}>
                  <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: getColor(u.username), alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>{getInitials(u.full_name || u.username)}</Text>
                  </View>
                  {u.is_online && (
                    <View style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e', borderWidth: 2, borderColor: t.input }} />
                  )}
                </View>
                <View>
                  <Text style={{ color: t.text, fontWeight: '600', fontSize: 13 }}>{u.full_name || u.username}</Text>
                  <Text style={{ color: u.is_online ? '#22c55e' : t.muted, fontSize: 12 }}>@{u.username}</Text>
                </View>
              </TouchableOpacity>
            ))}
            {foundUsers.length === 0 && (
              <Text style={{ color: t.muted, fontSize: 13, textAlign: 'center' }}>{searchUser.length < 2 ? 'Type a username to search' : 'No users found'}</Text>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}