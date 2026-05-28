import { useState, useEffect, useRef } from 'react'
import { View, Text, TextInput, TouchableOpacity, StatusBar, FlatList, KeyboardAvoidingView, Platform } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'
import { supabase } from '../lib/supabase'

const C = {
  bg: '#080b18', card: '#0e1121', input: '#141728',
  accent: '#7c3aed', border: 'rgba(255,255,255,0.07)',
  text: '#fff', muted: '#6b7280', green: '#22c55e',
}

export default function ConversationScreen({ route, navigation }: any) {
  const { conversation, user } = route.params
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [otherUser, setOtherUser] = useState<any>(null)
  const flatListRef = useRef<any>(null)

  useEffect(() => {
    const load = async () => {
      const { data: msgs } = await supabase.from('messages').select('*')
        .eq('conversation_id', conversation.id).order('created_at', { ascending: true })
      setMessages(msgs || [])

      const { data: members } = await supabase.from('conversation_members')
        .select('user_id').eq('conversation_id', conversation.id).neq('user_id', user.id)
      if (members?.length) {
        const { data: profile } = await supabase.from('profiles').select('*').eq('id', members[0].user_id).single()
        setOtherUser(profile)
      }
    }
    load()

    const msgChannel = supabase.channel(`messages:${conversation.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversation.id}` },
        (payload) => setMessages(prev => [...prev, payload.new]))
      .subscribe()

    return () => { supabase.removeChannel(msgChannel) }
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

  const startCall = async (isVideo: boolean) => {
    if (!otherUser) return
    await supabase.from('call_signals').insert({
      caller_id: user.id,
      receiver_id: otherUser.id,
      channel_id: conversation.id,
      call_type: isVideo ? 'video' : 'voice',
      status: 'ringing'
    })
    navigation.navigate('Call', {
      channelId: conversation.id,
      isVideo,
      callerName: otherUser?.username || otherUser?.full_name || conversation.name,
      user
    })
  }

  const getInitials = (name: string) =>
    name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '??'

  const getLastSeen = (lastSeen: string) => {
    if (!lastSeen) return 'Offline'
    const diff = Math.floor((Date.now() - new Date(lastSeen).getTime()) / 1000 / 60)
    if (diff < 1) return 'Online'
    if (diff < 60) return `${diff}m ago`
    return `${Math.floor(diff / 60)}h ago`
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle="light-content" backgroundColor={C.bg} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>

        {/* Header */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16,
          paddingVertical: 14, backgroundColor: C.card,
          borderBottomWidth: 1, borderBottomColor: C.border
        }}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 10 }}>
            <Text style={{ color: C.text, fontSize: 26 }}>←</Text>
          </TouchableOpacity>

          <View style={{ position: 'relative', marginRight: 12 }}>
            <View style={{
              width: 42, height: 42, borderRadius: 21, backgroundColor: C.accent,
              alignItems: 'center', justifyContent: 'center'
            }}>
              <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                {getInitials(conversation.name || '')}
              </Text>
            </View>
            {otherUser?.is_online && (
              <View style={{
                position: 'absolute', bottom: 0, right: 0, width: 11, height: 11,
                borderRadius: 5.5, backgroundColor: C.green, borderWidth: 2, borderColor: C.card
              }} />
            )}
          </View>

          <View style={{ flex: 1 }}>
            <Text style={{ color: C.text, fontWeight: '700', fontSize: 16 }}>{conversation.name}</Text>
            <Text style={{ color: otherUser?.is_online ? C.green : C.muted, fontSize: 12 }}>
              {otherUser?.is_online ? '● Online' : getLastSeen(otherUser?.last_seen)}
            </Text>
          </View>

          <TouchableOpacity onPress={() => startCall(false)} style={{ marginRight: 14 }}>
            <Text style={{ fontSize: 22 }}>📞</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => startCall(true)} style={{ marginRight: 14 }}>
            <Text style={{ fontSize: 22 }}>🎥</Text>
          </TouchableOpacity>
          <TouchableOpacity>
            <Text style={{ color: C.muted, fontSize: 20 }}>⋮</Text>
          </TouchableOpacity>
        </View>

        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={item => item.id}
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
          contentContainerStyle={{ padding: 16, paddingBottom: 8 }}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={{ textAlign: 'center', color: C.muted, fontSize: 13, marginTop: 40 }}>
              No messages yet. Say hello! 👋
            </Text>
          }
          renderItem={({ item }) => {
            const isMe = item.sender_id === user?.id
            return (
              <View style={{ alignItems: isMe ? 'flex-end' : 'flex-start', marginBottom: 10 }}>
                <View style={{
                  maxWidth: '75%', padding: 13, borderRadius: 20,
                  borderBottomRightRadius: isMe ? 4 : 20,
                  borderBottomLeftRadius: isMe ? 20 : 4,
                  backgroundColor: isMe ? C.accent : C.card,
                  borderWidth: isMe ? 0 : 1, borderColor: C.border,
                  shadowColor: isMe ? C.accent : 'transparent',
                  shadowOpacity: 0.25, shadowRadius: 8,
                }}>
                  <Text style={{ color: '#fff', fontSize: 14, lineHeight: 20 }}>{item.content}</Text>
                  <Text style={{ color: isMe ? 'rgba(255,255,255,0.55)' : C.muted, fontSize: 11, marginTop: 4, textAlign: 'right' }}>
                    {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    {isMe ? ' ✓✓' : ''}
                  </Text>
                </View>
              </View>
            )
          }}
        />

        {/* Input bar */}
        <View style={{
          flexDirection: 'row', alignItems: 'center', padding: 12,
          backgroundColor: C.card, borderTopWidth: 1, borderTopColor: C.border
        }}>
          <TouchableOpacity style={{
            width: 38, height: 38, borderRadius: 19,
            backgroundColor: C.input, alignItems: 'center', justifyContent: 'center', marginRight: 10
          }}>
            <Text style={{ fontSize: 18 }}>+</Text>
          </TouchableOpacity>

          <TextInput
            value={newMessage} onChangeText={setNewMessage}
            placeholder="Type a message..."
            placeholderTextColor={C.muted}
            style={{
              flex: 1, backgroundColor: C.input, borderRadius: 24,
              paddingVertical: 11, paddingHorizontal: 16, color: C.text, fontSize: 14,
              marginRight: 10, borderWidth: 1, borderColor: C.border
            }}
            onSubmitEditing={sendMessage}
          />

          <TouchableOpacity style={{ marginRight: 10 }}>
            <Text style={{ fontSize: 22 }}>😊</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={sendMessage}
            style={{
              width: 44, height: 44, borderRadius: 22, backgroundColor: C.accent,
              alignItems: 'center', justifyContent: 'center',
              shadowColor: C.accent, shadowOpacity: 0.5, shadowRadius: 10, elevation: 5
            }}
          >
            <Text style={{ color: '#fff', fontSize: 18 }}>➤</Text>
          </TouchableOpacity>
        </View>

      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}