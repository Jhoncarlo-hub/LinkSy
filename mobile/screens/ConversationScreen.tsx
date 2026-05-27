import { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, StatusBar, FlatList, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

export default function ConversationScreen({ route, navigation }: any) {
  const { conversation, user } = route.params
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [dark, setDark] = useState(true)
  const [otherUser, setOtherUser] = useState<any>(null)
  const flatListRef = useRef<any>(null)

  const t = {
    bg: dark ? '#0f1117' : '#f4f5f7',
    card: dark ? '#1a1d27' : '#ffffff',
    text: dark ? '#e5e7eb' : '#111827',
    muted: dark ? '#6b7280' : '#9ca3af',
    border: dark ? '#1e2433' : '#e8eaed',
    accent: '#6366f1',
    input: dark ? '#1e2433' : '#f0f2f5',
    bubble: dark ? '#1e2433' : '#ffffff',
  }

  useEffect(() => {
    const load = async () => {
      const { data: messages } = await supabase.from('messages').select('*').eq('conversation_id', conversation.id).order('created_at', { ascending: true })
      setMessages(messages || [])

      const { data: members } = await supabase.from('conversation_members').select('user_id').eq('conversation_id', conversation.id).neq('user_id', user.id)
      if (members && members.length > 0) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', members[0].user_id).single()
        setOtherUser(profile)
      }
    }
    load()

    const messageChannel = supabase
      .channel(`messages:${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new])
      })
      .subscribe()

    const profileChannel = supabase
      .channel(`profile_status:${conversation.id}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
      }, (payload: any) => {
        if (payload.new?.id !== user.id) {
          setOtherUser((prev: any) => prev ? { ...prev, is_online: payload.new.is_online, last_seen: payload.new.last_seen } : prev)
        }
      })
      .subscribe()

    return () => {
      supabase.removeChannel(messageChannel)
      supabase.removeChannel(profileChannel)
    }
  }, [])

  const sendMessage = async () => {
    if (!newMessage.trim()) return
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      content: newMessage.trim(),
      type: 'text'
    })
    setNewMessage('')
  }

  const getInitials = (name: string) => name?.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2) || '??'

  const getLastSeen = (lastSeen: string) => {
    if (!lastSeen) return 'Offline'
    const diff = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000 / 60)
    if (diff < 1) return 'Last seen just now'
    if (diff < 60) return `Last seen ${diff}m ago`
    if (diff < 1440) return `Last seen ${Math.floor(diff / 60)}h ago`
    return `Last seen ${Math.floor(diff / 1440)}d ago`
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: t.card, borderBottomWidth: 0.5, borderBottomColor: t.border }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 12 }}>
            <Text style={{ color: t.accent, fontSize: 24 }}>‹</Text>
          </TouchableOpacity>
          <View style={{ position: 'relative', marginRight: 10 }}>
            <View style={{ width: 38, height: 38, borderRadius: 19, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: 'white', fontWeight: '700', fontSize: 13 }}>{getInitials(conversation.name || '')}</Text>
            </View>
            {otherUser?.is_online && (
              <View style={{ position: 'absolute', bottom: 0, right: 0, width: 10, height: 10, borderRadius: 5, backgroundColor: '#22c55e', borderWidth: 2, borderColor: t.card }} />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ color: t.text, fontWeight: '700', fontSize: 15 }}>{conversation.name}</Text>
            <Text style={{ color: otherUser?.is_online ? '#22c55e' : t.muted, fontSize: 12 }}>
              {otherUser?.is_online ? '● Online' : getLastSeen(otherUser?.last_seen)}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <TouchableOpacity onPress={() => navigation.navigate('Call', { channelId: conversation.id, isVideo: false, callerName: conversation.name, user })} style={{ marginRight: 12 }}>
    <Text style={{ fontSize: 20 }}>📞</Text>
  </TouchableOpacity>
  <TouchableOpacity onPress={() => navigation.navigate('Call', { channelId: conversation.id, isVideo: true, callerName: conversation.name, user })} style={{ marginRight: 12 }}>
    <Text style={{ fontSize: 20 }}>🎥</Text>
  </TouchableOpacity>
  <TouchableOpacity onPress={() => setDark(!dark)}>
    <Text style={{ fontSize: 20 }}>{dark ? '☀️' : '🌙'}</Text>
  </TouchableOpacity>
</View>
          </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={{ padding: 16 }}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: t.muted, fontSize: 13, marginTop: 32 }}>No messages yet. Say hello! 👋</Text>
          }
          renderItem={({ item }) => {
            const isMe = item.sender_id === user?.id
            return (
              <View style={{ alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                <View style={{ maxWidth: '75%', padding: 12, borderRadius: 16, borderBottomRightRadius: isMe ? 4 : 16, borderBottomLeftRadius: isMe ? 16 : 4, backgroundColor: isMe ? t.accent : t.bubble, borderWidth: isMe ? 0 : 0.5, borderColor: t.border }}>
                  <Text style={{ color: isMe ? 'white' : t.text, fontSize: 14, lineHeight: 20 }}>{item.content}</Text>
                  <Text style={{ color: isMe ? 'rgba(255,255,255,0.6)' : t.muted, fontSize: 11, marginTop: 4, textAlign: 'right' }}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              </View>
            )
          }}
        />

        <View style={{ flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: t.card, borderTopWidth: 0.5, borderTopColor: t.border }}>
          <TextInput
            value={newMessage}
            onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor={t.muted}
            style={{ flex: 1, backgroundColor: t.input, borderRadius: 24, padding: 12, paddingHorizontal: 16, color: t.text, fontSize: 14, marginRight: 10 }}
            onSubmitEditing={sendMessage}
          />
          <TouchableOpacity onPress={sendMessage} style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: t.accent, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ color: 'white', fontSize: 18 }}>➤</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}