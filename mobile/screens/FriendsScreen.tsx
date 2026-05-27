import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StatusBar, FlatList, TextInput } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

export default function FriendsScreen({ navigation }: any) {
  const [user, setUser] = useState<any>(null)
  const [dark, setDark] = useState(true)
  const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends')
  const [friends, setFriends] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [sentRequests, setSentRequests] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

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

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { navigation.replace('Landing'); return }
      setUser(user)
      await loadFriends(user.id)
      await loadRequests(user.id)
      await loadSentRequests(user.id)
      setLoading(false)
    }
    init()

    const channel = supabase
      .channel('friend_requests_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, () => {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) {
            loadRequests(user.id)
            loadSentRequests(user.id)
          }
        })
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friends' }, () => {
        supabase.auth.getUser().then(({ data: { user } }) => {
          if (user) loadFriends(user.id)
        })
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadFriends = async (userId: string) => {
    const { data } = await supabase
      .from('friends')
      .select('friend_id, profiles!friends_friend_id_fkey(id, username, full_name, is_online)')
      .eq('user_id', userId)
    setFriends(data || [])
  }

  const loadRequests = async (userId: string) => {
    const { data } = await supabase
      .from('friend_requests')
      .select('id, sender_id, profiles!friend_requests_sender_id_fkey(id, username, full_name)')
      .eq('receiver_id', userId)
      .eq('status', 'pending')
    setRequests(data || [])
  }

  const loadSentRequests = async (userId: string) => {
    const { data } = await supabase
      .from('friend_requests')
      .select('receiver_id')
      .eq('sender_id', userId)
      .eq('status', 'pending')
    setSentRequests((data || []).map((r: any) => r.receiver_id))
  }

  const searchUsers = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) { setSearchResults([]); return }
    const { data } = await supabase
      .from('profiles')
      .select('id, username, full_name, is_online')
      .ilike('username', `%${query}%`)
      .neq('id', user?.id)
      .limit(10)
    setSearchResults(data || [])
  }

  const sendFriendRequest = async (receiverId: string) => {
  try {
    console.log('Sending request to:', receiverId)
    console.log('From user:', user?.id)
    const { data, error } = await supabase.from('friend_requests').insert({
      sender_id: user.id,
      receiver_id: receiverId,
      status: 'pending'
    }).select()
    console.log('Result:', data, error)
    if (!error) {
      setSentRequests(prev => [...prev, receiverId])
    } else {
      console.log('Error:', error.message)
    }
  } catch (e) {
    console.log('Catch error:', e)
  }
}

  const acceptRequest = async (request: any) => {
    await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', request.id)
    await supabase.from('friends').insert([
      { user_id: user.id, friend_id: request.sender_id },
      { user_id: request.sender_id, friend_id: user.id }
    ])
    await loadFriends(user.id)
    await loadRequests(user.id)
    setTab('friends')
  }

  const rejectRequest = async (requestId: string) => {
    await supabase.from('friend_requests').update({ status: 'rejected' }).eq('id', requestId)
    await loadRequests(user.id)
  }

  const startChat = async (friend: any) => {
    const profile = friend.profiles
    const { data: existing } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', user.id)

    if (existing && existing.length > 0) {
      const ids = existing.map((m: any) => m.conversation_id)
      const { data: otherMember } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', profile.id)
        .in('conversation_id', ids)

      if (otherMember && otherMember.length > 0) {
        const { data: conv } = await supabase.from('conversations').select('*').eq('id', otherMember[0].conversation_id).single()
        navigation.navigate('Conversation', { conversation: conv, user })
        return
      }
    }

    const { data: conv } = await supabase
      .from('conversations')
      .insert({ name: profile.full_name || profile.username, is_group: false })
      .select()
      .single()
    if (!conv) return
    await supabase.from('conversation_members').insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: profile.id }
    ])
    navigation.navigate('Conversation', { conversation: conv, user })
  }

  const isFriend = (userId: string) => friends.some((f: any) => f.friend_id === userId)

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 16, backgroundColor: t.card, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: t.accent, fontSize: 24 }}>‹</Text>
        </TouchableOpacity>
        <Text style={{ fontSize: 18, fontWeight: '800', color: t.text }}>Friends</Text>
        <TouchableOpacity onPress={() => setDark(!dark)} style={{ width: 32, height: 32, borderRadius: 8, backgroundColor: t.input, alignItems: 'center', justifyContent: 'center' }}>
          <Text>{dark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>

      <View style={{ flexDirection: 'row', backgroundColor: t.card, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
        {(['friends', 'requests', 'search'] as const).map(t2 => (
          <TouchableOpacity key={t2} onPress={() => setTab(t2)} style={{ flex: 1, padding: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: tab === t2 ? t.accent : 'transparent' }}>
            <Text style={{ color: tab === t2 ? t.accent : t.muted, fontWeight: '600', fontSize: 13 }}>
              {t2 === 'requests' ? `Requests${requests.length > 0 ? ` (${requests.length})` : ''}` : t2.charAt(0).toUpperCase() + t2.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'friends' && (
        <FlatList
          data={friends}
          keyExtractor={item => item.friend_id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>👥</Text>
              <Text style={{ color: t.text, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>No friends yet</Text>
              <Text style={{ color: t.muted, fontSize: 13 }}>Search for users to add friends</Text>
            </View>
          }
          renderItem={({ item }) => {
            const profile = item.profiles
            return (
              <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: t.card, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: t.border }}>
                <View style={{ position: 'relative', marginRight: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: getColor(profile?.username || ''), alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={{ color: 'white', fontWeight: '700' }}>{getInitials(profile?.full_name || profile?.username || '')}</Text>
                  </View>
                  {profile?.is_online && (
                    <View style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e', borderWidth: 2, borderColor: t.card }} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: t.text, fontWeight: '600', fontSize: 14 }}>{profile?.full_name || profile?.username}</Text>
                  <Text style={{ color: profile?.is_online ? '#22c55e' : t.muted, fontSize: 12 }}>{profile?.is_online ? '● Online' : '○ Offline'}</Text>
                </View>
                <TouchableOpacity onPress={() => startChat(item)} style={{ backgroundColor: t.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
                  <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Chat</Text>
                </TouchableOpacity>
              </View>
            )
          }}
        />
      )}

      {tab === 'requests' && (
        <FlatList
          data={requests}
          keyExtractor={item => item.id}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', marginTop: 60 }}>
              <Text style={{ fontSize: 48, marginBottom: 12 }}>📭</Text>
              <Text style={{ color: t.text, fontSize: 16, fontWeight: '700', marginBottom: 8 }}>No pending requests</Text>
            </View>
          }
          renderItem={({ item }) => {
            const profile = item.profiles
            return (
              <View style={{ padding: 14, backgroundColor: t.card, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: t.border }}>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }}>
                  <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: getColor(profile?.username || ''), alignItems: 'center', justifyContent: 'center', marginRight: 12 }}>
                    <Text style={{ color: 'white', fontWeight: '700' }}>{getInitials(profile?.full_name || profile?.username || '')}</Text>
                  </View>
                  <View>
                    <Text style={{ color: t.text, fontWeight: '600', fontSize: 14 }}>{profile?.full_name || profile?.username}</Text>
                    <Text style={{ color: t.muted, fontSize: 12 }}>@{profile?.username}</Text>
                  </View>
                </View>
                <View style={{ flexDirection: 'row' }}>
                  <TouchableOpacity onPress={() => acceptRequest(item)} style={{ flex: 1, backgroundColor: t.accent, borderRadius: 10, padding: 10, alignItems: 'center', marginRight: 8 }}>
                    <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Accept</Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => rejectRequest(item.id)} style={{ flex: 1, backgroundColor: t.input, borderRadius: 10, padding: 10, alignItems: 'center' }}>
                    <Text style={{ color: t.muted, fontWeight: '700', fontSize: 13 }}>Decline</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )
          }}
        />
      )}

      {tab === 'search' && (
        <View style={{ flex: 1 }}>
          <View style={{ padding: 16 }}>
            <TextInput
              value={searchQuery}
              onChangeText={searchUsers}
              placeholder="Search by username..."
              placeholderTextColor={t.muted}
              autoCapitalize="none"
              style={{ backgroundColor: t.input, borderRadius: 12, padding: 12, color: t.text, fontSize: 14, borderWidth: 1, borderColor: t.border }}
            />
          </View>
          <FlatList
            data={searchResults}
            keyExtractor={item => item.id}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            ListEmptyComponent={
              <View style={{ alignItems: 'center', marginTop: 40 }}>
                <Text style={{ color: t.muted, fontSize: 13 }}>{searchQuery.length < 2 ? 'Type a username to search' : 'No users found'}</Text>
              </View>
            }
            renderItem={({ item }) => {
              const alreadyFriend = isFriend(item.id)
              const alreadySent = sentRequests.includes(item.id)
              return (
                <View style={{ flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: t.card, borderRadius: 14, marginBottom: 10, borderWidth: 1, borderColor: t.border }}>
                  <View style={{ position: 'relative', marginRight: 12 }}>
                    <View style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: getColor(item.username || ''), alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ color: 'white', fontWeight: '700' }}>{getInitials(item.full_name || item.username || '')}</Text>
                    </View>
                    {item.is_online && (
                      <View style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e', borderWidth: 2, borderColor: t.card }} />
                    )}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: t.text, fontWeight: '600', fontSize: 14 }}>{item.full_name || item.username}</Text>
                    <Text style={{ color: item.is_online ? '#22c55e' : t.muted, fontSize: 12 }}>@{item.username}</Text>
                  </View>
                  {alreadyFriend ? (
                    <View style={{ backgroundColor: '#22c55e', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
                      <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>Friends ✓</Text>
                    </View>
                  ) : alreadySent ? (
                    <View style={{ backgroundColor: t.input, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
                      <Text style={{ color: t.muted, fontWeight: '700', fontSize: 13 }}>Sent ✓</Text>
                    </View>
                  ) : (
                    <TouchableOpacity onPress={() => sendFriendRequest(item.id)} style={{ backgroundColor: t.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
                      <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>+ Add</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )
            }}
          />
        </View>
      )}
    </SafeAreaView>
  )
}