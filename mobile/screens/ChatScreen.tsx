import { useState, useEffect } from 'react'
import { View, Text, TouchableOpacity, StatusBar, FlatList, TextInput, Modal, Alert } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

const C = {
  bg: '#080b18', card: '#0e1121', input: '#141728',
  accent: '#7c3aed', border: 'rgba(255,255,255,0.07)',
  text: '#fff', muted: '#6b7280', secondary: '#9ca3af', green: '#22c55e',
}

const BottomTabs = ({ active, navigation, user }: any) => (
  <View style={{
    flexDirection: 'row', backgroundColor: '#0a0d1c',
    borderTopWidth: 1, borderTopColor: C.border, paddingBottom: 8, paddingTop: 10
  }}>
    {[
      { key: 'Chat', label: 'Chats', icon: '💬' },
      { key: 'Friends', label: 'Friends', icon: '👥' },
      { key: 'Profile', label: 'Profile', icon: '👤' },
    ].map(tab => (
      <TouchableOpacity
        key={tab.key}
        onPress={() => tab.key !== active && navigation.navigate(tab.key, { user })}
        style={{ flex: 1, alignItems: 'center' }}
      >
        <Text style={{ fontSize: 22, marginBottom: 2 }}>{tab.icon}</Text>
        <Text style={{
          fontSize: 11, fontWeight: '600',
          color: active === tab.key ? C.accent : C.muted
        }}>{tab.label}</Text>
        {active === tab.key && (
          <View style={{ width: 4, height: 4, borderRadius: 2, backgroundColor: C.accent, marginTop: 3 }} />
        )}
      </TouchableOpacity>
    ))}
  </View>
)

export default function ChatScreen({ route, navigation }: any) {
  const { user } = route.params
  const [conversations, setConversations] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [showNewModal, setShowNewModal] = useState(false)
  const [friends, setFriends] = useState<any[]>([])

  useEffect(() => {
    loadConversations()
    const channel = supabase
      .channel('conversations_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, loadConversations)
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadConversations = async () => {
    const { data: members } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', user.id)

    if (!members?.length) return

    const ids = members.map(m => m.conversation_id)
    const { data: convs } = await supabase
      .from('conversations')
      .select('*')
      .in('id', ids)
      .order('updated_at', { ascending: false })

    const withMessages = await Promise.all((convs || []).map(async (c) => {
      const { data: msgs } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', c.id)
        .order('created_at', { ascending: false })
        .limit(1)
      return { ...c, lastMessage: msgs?.[0] || null }
    }))

    setConversations(withMessages)
  }

  const openNewConv = async () => {
    const { data } = await supabase
      .from('friends')
      .select('*')
      .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)

    const friendIds = (data || []).map((f: any) => f.user_id === user.id ? f.friend_id : f.user_id)
    if (!friendIds.length) return Alert.alert('No friends yet', 'Add some friends first!')

    const { data: profiles } = await supabase.from('profiles').select('*').in('id', friendIds)
    setFriends(profiles || [])
    setShowNewModal(true)
  }

  const startConversation = async (friend: any) => {
    const { data: existingMember } = await supabase
      .from('conversation_members')
      .select('conversation_id')
      .eq('user_id', user.id)

    if (existingMember?.length) {
      const { data: shared } = await supabase
        .from('conversation_members')
        .select('conversation_id')
        .eq('user_id', friend.id)
        .in('conversation_id', existingMember.map(m => m.conversation_id))

      if (shared?.length) {
        const { data: conv } = await supabase.from('conversations').select('*').eq('id', shared[0].conversation_id).single()
        setShowNewModal(false)
        return navigation.navigate('Conversation', { conversation: conv, user })
      }
    }

    const { data: conv } = await supabase.from('conversations').insert({
      name: friend.username || friend.full_name,
      is_group: false,
    }).select().single()

    await supabase.from('conversation_members').insert([
      { conversation_id: conv.id, user_id: user.id },
      { conversation_id: conv.id, user_id: friend.id },
    ])
    setShowNewModal(false)
    navigation.navigate('Conversation', { conversation: conv, user })
  }

  const getInitials = (name: string) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'

  const filtered = conversations.filter(c =>
    c.name?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />

      {/* Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 }}>
        <Text style={{ color: C.accent, fontSize: 26, fontWeight: '900', flex: 1, letterSpacing: 1 }}>LinkSy</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Friends', { user })}
          style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
          <Text style={{ fontSize: 22 }}>👥</Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ marginRight: 10 }}>
          <Text style={{ fontSize: 22 }}>☀️</Text>
        </TouchableOpacity>
        <View style={{
          width: 36, height: 36, borderRadius: 18,
          backgroundColor: C.accent, alignItems: 'center', justifyContent: 'center',
          borderWidth: 2, borderColor: 'rgba(139,92,246,0.4)'
        }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 14 }}>
            {getInitials(user?.username || user?.full_name || '')}
          </Text>
        </View>
      </View>

      {/* Search */}
      <View style={{ paddingHorizontal: 20, marginBottom: 14 }}>
        <View style={{
          flexDirection: 'row', alignItems: 'center', backgroundColor: C.input,
          borderRadius: 14, paddingHorizontal: 14, borderWidth: 1, borderColor: C.border
        }}>
          <Text style={{ fontSize: 16, marginRight: 8 }}>🔍</Text>
          <TextInput
            value={search} onChangeText={setSearch}
            placeholder="Search conversations..."
            placeholderTextColor={C.muted}
            style={{ flex: 1, color: C.text, paddingVertical: 13, fontSize: 14 }}
          />
        </View>
      </View>

      {/* New Conversation */}
      <View style={{ paddingHorizontal: 20, marginBottom: 20 }}>
        <TouchableOpacity
          onPress={openNewConv}
          style={{
            backgroundColor: C.accent, borderRadius: 14, paddingVertical: 14,
            flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
            shadowColor: C.accent, shadowOpacity: 0.4, shadowRadius: 12, elevation: 6
          }}
        >
          <Text style={{ color: '#fff', fontSize: 18, marginRight: 8 }}>💬</Text>
          <Text style={{ color: '#fff', fontSize: 15, fontWeight: '700' }}>+ New Conversation</Text>
        </TouchableOpacity>
      </View>

      {/* Conversations */}
      <Text style={{ color: C.secondary, fontSize: 13, fontWeight: '600', paddingHorizontal: 20, marginBottom: 12 }}>
        Recent Chats
      </Text>

      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 16 }}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <Text style={{ color: C.muted, textAlign: 'center', marginTop: 40, fontSize: 14 }}>
            No conversations yet
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => navigation.navigate('Conversation', { conversation: item, user })}
            style={{
              flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
              borderRadius: 18, padding: 14, marginBottom: 10,
              borderWidth: 1, borderColor: C.border
            }}
          >
            <View style={{
              width: 50, height: 50, borderRadius: 25, backgroundColor: C.accent,
              alignItems: 'center', justifyContent: 'center', marginRight: 14, position: 'relative'
            }}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 17 }}>
                {getInitials(item.name || '')}
              </Text>
              <View style={{
                position: 'absolute', bottom: 1, right: 1,
                width: 12, height: 12, borderRadius: 6,
                backgroundColor: C.green, borderWidth: 2, borderColor: C.card
              }} />
            </View>

            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 }}>
                <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>{item.name}</Text>
                {item.lastMessage && (
                  <Text style={{ color: C.muted, fontSize: 11 }}>
                    {new Date(item.lastMessage.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                )}
              </View>
              <Text style={{ color: C.muted, fontSize: 13 }} numberOfLines={1}>
                {item.lastMessage?.content || 'No messages yet'}
              </Text>
            </View>
          </TouchableOpacity>
        )}
      />

      <BottomTabs active="Chat" navigation={navigation} user={user} />

      {/* New Conversation Modal */}
      <Modal visible={showNewModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'flex-end' }}>
          <View style={{ backgroundColor: '#0e1121', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, maxHeight: '70%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <Text style={{ color: C.text, fontSize: 18, fontWeight: '800' }}>Start a Conversation</Text>
              <TouchableOpacity onPress={() => setShowNewModal(false)}>
                <Text style={{ color: C.muted, fontSize: 24 }}>✕</Text>
              </TouchableOpacity>
            </View>
            <FlatList
              data={friends}
              keyExtractor={item => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  onPress={() => startConversation(item)}
                  style={{
                    flexDirection: 'row', alignItems: 'center',
                    paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border
                  }}
                >
                  <View style={{
                    width: 44, height: 44, borderRadius: 22, backgroundColor: C.accent,
                    alignItems: 'center', justifyContent: 'center', marginRight: 14
                  }}>
                    <Text style={{ color: '#fff', fontWeight: '700' }}>
                      {getInitials(item.username || item.full_name || '')}
                    </Text>
                  </View>
                  <View>
                    <Text style={{ color: C.text, fontWeight: '700', fontSize: 15 }}>
                      {item.full_name || item.username}
                    </Text>
                    <Text style={{ color: C.muted, fontSize: 12 }}>@{item.username}</Text>
                  </View>
                  <View style={{ flex: 1, alignItems: 'flex-end' }}>
                    <View style={{ backgroundColor: C.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 6 }}>
                      <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Chat</Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  )
}