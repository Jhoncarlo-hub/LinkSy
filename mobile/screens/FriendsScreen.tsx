import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StatusBar, FlatList, TextInput, Modal } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

const C = {
  bg: '#080b18', card: '#0e1121', input: '#141728',
  accent: '#7c3aed', border: 'rgba(255,255,255,0.07)',
  text: '#fff', muted: '#6b7280', green: '#22c55e', red: '#ef4444',
}

const BottomTabs = ({ active, navigation, user }: any) => (
  <View style={{ flexDirection: 'row', backgroundColor: '#0a0d1c', borderTopWidth: 1, borderTopColor: C.border, paddingBottom: 8, paddingTop: 10 }}>
    {[
      { key: 'Chat', label: 'Chats', icon: '💬' },
      { key: 'Friends', label: 'Friends', icon: '👥' },
      { key: 'Profile', label: 'Profile', icon: '👤' },
    ].map(tab => (
      <TouchableOpacity key={tab.key} onPress={() => tab.key !== active && navigation.navigate(tab.key, { user })} style={{ flex: 1, alignItems: 'center' }}>
        <Text style={{ fontSize: 22, marginBottom: 2 }}>{tab.icon}</Text>
        <Text style={{ fontSize: 11, fontWeight: '600', color: active === tab.key ? C.accent : C.muted }}>{tab.label}</Text>
        {active === tab.key && <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.accent, marginTop: 3 }} />}
      </TouchableOpacity>
    ))}
  </View>
)

export default function FriendsScreen({ route, navigation }: any) {
  const { user } = route.params
  const [tab, setTab] = useState<'friends' | 'requests' | 'search'>('friends')
  const [friends, setFriends] = useState<any[]>([])
  const [requests, setRequests] = useState<any[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [selectedFriend, setSelectedFriend] = useState<any>(null)

  useEffect(() => { loadFriends(); loadRequests() }, [])

  const loadFriends = async () => {
    const { data } = await supabase.from('friends').select('*').or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
    const ids = (data || []).map((f: any) => f.user_id === user.id ? f.friend_id : f.user_id)
    if (!ids.length) return
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', ids)
    setFriends(profiles || [])
  }

  const loadRequests = async () => {
    const { data } = await supabase.from('friend_requests').select('*').eq('receiver_id', user.id).eq('status', 'pending')
    if (!data?.length) return
    const { data: profiles } = await supabase.from('profiles').select('*').in('id', data.map((r: any) => r.sender_id))
    setRequests((profiles || []).map((p: any) => ({ ...p, requestId: data.find((r: any) => r.sender_id === p.id)?.id })))
  }

  const searchUsers = async (q: string) => {
    setSearchQuery(q)
    if (q.length < 2) return setSearchResults([])
    const { data } = await supabase.from('profiles').select('*').ilike('username', `%${q}%`).neq('id', user.id).limit(20)
    setSearchResults(data || [])
  }

  const sendRequest = async (receiverId: string) => {
    await supabase.from('friend_requests').insert({ sender_id: user.id, receiver_id: receiverId, status: 'pending' })
    setSearchResults(prev => prev.filter(u => u.id !== receiverId))
  }

  const acceptRequest = async (req: any) => {
    await supabase.from('friend_requests').update({ status: 'accepted' }).eq('id', req.requestId)
    await supabase.from('friends').insert({ user_id: user.id, friend_id: req.id })
    loadFriends(); loadRequests()
  }

  const startChat = async (friend: any) => {
    setSelectedFriend(null)
    const { data: myConvs } = await supabase.from('conversation_members').select('conversation_id').eq('user_id', user.id)
    if (myConvs?.length) {
      const { data: shared } = await supabase.from('conversation_members').select('conversation_id').eq('user_id', friend.id).in('conversation_id', myConvs.map((m: any) => m.conversation_id))
      if (shared?.length) {
        const { data: conv } = await supabase.from('conversations').select('*').eq('id', shared[0].conversation_id).single()
        return navigation.navigate('Conversation', { conversation: conv, user })
      }
    }
    const { data: conv } = await supabase.from('conversations').insert({ name: friend.username || friend.full_name, is_group: false }).select().single()
    await supabase.from('conversation_members').insert([{ conversation_id: conv.id, user_id: user.id }, { conversation_id: conv.id, user_id: friend.id }])
    navigation.navigate('Conversation', { conversation: conv, user })
  }

  const startCall = async (friend: any, isVideo: boolean) => {
    setSelectedFriend(null)
    const { data: myConvs } = await supabase.from('conversation_members').select('conversation_id').eq('user_id', user.id)
    let channelId = `call_${user.id}_${friend.id}`
    if (myConvs?.length) {
      const { data: shared } = await supabase.from('conversation_members').select('conversation_id').eq('user_id', friend.id).in('conversation_id', myConvs.map((m: any) => m.conversation_id))
      if (shared?.length) channelId = shared[0].conversation_id
    }
    await supabase.from('call_signals').insert({ caller_id: user.id, receiver_id: friend.id, channel_id: channelId, call_type: isVideo ? 'video' : 'voice', status: 'ringing' })
    navigation.navigate('Call', { channelId, isVideo, callerName: friend.username || friend.full_name, user })
  }

  const getInitials = (name: string) => name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'

  const online = friends.filter(f => f.is_online)
  const offline = friends.filter(f => !f.is_online)

  const FriendRow = ({ item, onPress }: any) => (
    <TouchableOpacity onPress={() => onPress?.(item)} style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
      <View style={{ position: 'relative', marginRight: 14 }}>
        <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 16 }}>{getInitials(item.username || item.full_name || '')}</Text>
        </View>
        {item.is_online && <View style={{ position: 'absolute', bottom: 1, right: 1, width: 12, height: 12, borderRadius: 6, backgroundColor: C.green, borderWidth: 2, borderColor: C.bg }} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>{item.full_name || item.username}</Text>
        <Text style={{ color: item.is_online ? C.green : C.muted, fontSize: 12 }}>
          @{item.username} • {item.is_online ? 'Online' : 'Offline'}
        </Text>
      </View>
      <TouchableOpacity onPress={() => startChat(item)} style={{ backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 8 }}>
        <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>💬 Chat</Text>
      </TouchableOpacity>
    </TouchableOpacity>
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 }}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
          <Text style={{ color: C.text, fontSize: 26 }}>←</Text>
        </TouchableOpacity>
        <Text style={{ color: C.text, fontSize: 24, fontWeight: '800', flex: 1 }}>Friends</Text>
        <Text style={{ fontSize: 22 }}>☀️</Text>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: 'row', paddingHorizontal: 20, marginBottom: 16 }}>
        {(['friends', 'requests', 'search'] as const).map(t => (
          <TouchableOpacity key={t} onPress={() => setTab(t)} style={{ marginRight: 24, paddingBottom: 10, borderBottomWidth: 2.5, borderBottomColor: tab === t ? C.accent : 'transparent' }}>
            <Text style={{ color: tab === t ? C.accent : C.muted, fontWeight: '700', fontSize: 15, textTransform: 'capitalize' }}>
              {t.charAt(0).toUpperCase() + t.slice(1)}
              {t === 'requests' && requests.length > 0 ? ` ${requests.length}` : ''}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'friends' && (
        <FlatList
          data={[]}
          keyExtractor={() => ''}
          contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={<>
            {online.length > 0 && <>
              <Text style={{ color: C.secondary, fontSize: 13, fontWeight: '700', marginBottom: 10, color: C.muted }}>Online ({online.length})</Text>
              {online.map(f => <FriendRow key={f.id} item={f} onPress={setSelectedFriend} />)}
            </>}
            {offline.length > 0 && <>
              <Text style={{ color: C.muted, fontSize: 13, fontWeight: '700', marginTop: 20, marginBottom: 10 }}>All Friends ({friends.length})</Text>
              {offline.map(f => <FriendRow key={f.id} item={f} onPress={setSelectedFriend} />)}
            </>}
            {friends.length === 0 && <Text style={{ color: C.muted, textAlign: 'center', marginTop: 50, fontSize: 14 }}>No friends yet. Search to add some!</Text>}
          </>}
          renderItem={() => null}
        />
      )}

      {tab === 'requests' && (
        <FlatList
          data={requests}
          keyExtractor={item => item.id}
          contentContainerStyle={{ paddingHorizontal: 20 }}
          ListEmptyComponent={<Text style={{ color: C.muted, textAlign: 'center', marginTop: 50, fontSize: 14 }}>No pending requests</Text>}
          renderItem={({ item }) => (
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border }}>
              <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                <Text style={{ color: '#fff', fontWeight: '700' }}>{getInitials(item.username || '')}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>{item.full_name || item.username}</Text>
                <Text style={{ color: C.muted, fontSize: 12 }}>@{item.username}</Text>
              </View>
              <TouchableOpacity onPress={() => acceptRequest(item)} style={{ backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8, marginRight: 8 }}>
                <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Accept</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {tab === 'search' && (
        <View style={{ flex: 1, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: C.input, borderRadius: 14, paddingHorizontal: 14, marginBottom: 16, borderWidth: 1, borderColor: C.border }}>
            <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
            <TextInput value={searchQuery} onChangeText={searchUsers} placeholder="Search by username..." placeholderTextColor={C.muted} style={{ flex: 1, color: C.text, paddingVertical: 13, fontSize: 14 }} autoCapitalize="none" />
          </View>
          <FlatList
            data={searchResults}
            keyExtractor={item => item.id}
            ListEmptyComponent={searchQuery.length > 1 ? <Text style={{ color: C.muted, textAlign: 'center', marginTop: 40 }}>No users found</Text> : null}
            renderItem={({ item }) => (
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border }}>
                <View style={{ width: 48, height: 48, borderRadius: 24, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', marginRight: 14 }}>
                  <Text style={{ color: '#fff', fontWeight: '700' }}>{getInitials(item.username || '')}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ color: C.text, fontWeight: '700' }}>{item.full_name || item.username}</Text>
                  <Text style={{ color: C.muted, fontSize: 12 }}>@{item.username} • {item.is_online ? '🟢 Online' : 'Offline'}</Text>
                </View>
                <TouchableOpacity onPress={() => sendRequest(item.id)} style={{ backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 }}>
                  <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>+ Add</Text>
                </TouchableOpacity>
              </View>
            )}
          />
        </View>
      )}

      <BottomTabs active="Friends" navigation={navigation} user={user} />

      {/* Friend Profile Modal */}
      <Modal visible={!!selectedFriend} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#0e1121', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 28 }}>
            <TouchableOpacity onPress={() => setSelectedFriend(null)} style={{ alignSelf: 'flex-end', marginBottom: 16 }}>
              <Text style={{ color: C.muted, fontSize: 22 }}>✕</Text>
            </TouchableOpacity>

            <View style={{ alignItems: 'center', marginBottom: 24 }}>
              <View style={{ position: 'relative', marginBottom: 14 }}>
                <View style={{ width: 90, height: 90, borderRadius: 45, backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: 'rgba(139,92,246,0.4)' }}>
                  <Text style={{ color: '#fff', fontSize: 36, fontWeight: '800' }}>
                    {(selectedFriend?.username || selectedFriend?.full_name || '?')[0].toUpperCase()}
                  </Text>
                </View>
                {selectedFriend?.is_online && (
                  <View style={{ position: 'absolute', bottom: 4, right: 4, width: 16, height: 16, borderRadius: 8, backgroundColor: C.green, borderWidth: 2.5, borderColor: '#0e1121' }} />
                )}
              </View>
              <Text style={{ color: C.text, fontSize: 22, fontWeight: '800' }}>{selectedFriend?.full_name || selectedFriend?.username}</Text>
              <Text style={{ color: selectedFriend?.is_online ? C.green : C.muted, fontSize: 13, marginTop: 4 }}>
                {selectedFriend?.is_online ? '● Online' : '○ Offline'}
              </Text>
            </View>

            {/* Action buttons */}
            <View style={{ flexDirection: 'row', justifyContent: 'center', marginBottom: 28, gap: 24 }}>
              {[
                { icon: '💬', label: 'Message', action: () => startChat(selectedFriend) },
                { icon: '📞', label: 'Voice Call', action: () => startCall(selectedFriend, false) },
                { icon: '🎥', label: 'Video Call', action: () => startCall(selectedFriend, true) },
                { icon: '⋯', label: 'More', action: () => {} },
              ].map(btn => (
                <TouchableOpacity key={btn.label} onPress={btn.action} style={{ alignItems: 'center' }}>
                  <View style={{ width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(124,58,237,0.18)', alignItems: 'center', justifyContent: 'center', marginBottom: 6, borderWidth: 1, borderColor: 'rgba(124,58,237,0.25)' }}>
                    <Text style={{ fontSize: 22 }}>{btn.icon}</Text>
                  </View>
                  <Text style={{ color: C.muted, fontSize: 11, fontWeight: '600' }}>{btn.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* About */}
            <View style={{ backgroundColor: C.input, borderRadius: 16, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: C.border }}>
              <Text style={{ color: C.muted, fontSize: 12, fontWeight: '700', marginBottom: 6 }}>ABOUT</Text>
              <Text style={{ color: C.text, fontSize: 14 }}>{selectedFriend?.bio || "Hey there! I'm using LinkSy 🚀"}</Text>
            </View>

            {/* Options */}
            <View style={{ backgroundColor: C.input, borderRadius: 16, borderWidth: 1, borderColor: C.border, overflow: 'hidden' }}>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border }}>
                <Text style={{ fontSize: 18, marginRight: 14 }}>👤</Text>
                <Text style={{ color: C.text, fontSize: 15 }}>View Profile</Text>
              </TouchableOpacity>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: C.border }}>
                <Text style={{ fontSize: 18, marginRight: 14 }}>🔔</Text>
                <Text style={{ color: C.text, fontSize: 15 }}>Mute Notifications</Text>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <View style={{ width: 44, height: 24, borderRadius: 12, backgroundColor: C.border }} />
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 16 }}>
                <Text style={{ fontSize: 18, marginRight: 14 }}>🚫</Text>
                <Text style={{ color: C.red, fontSize: 15, fontWeight: '600' }}>Block User</Text>
                <View style={{ flex: 1, alignItems: 'flex-end' }}>
                  <Text style={{ color: C.muted, fontSize: 18 }}>›</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}