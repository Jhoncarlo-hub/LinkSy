import 'react-native-url-polyfill/auto'
import { registerRootComponent } from 'expo'
import { useEffect, useState } from 'react'
import { View, Text, TouchableOpacity, Modal, Vibration } from 'react-native'
import { NavigationContainer, createNavigationContainerRef } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { supabase } from './lib/supabase'
import LandingScreen from './screens/LandingScreen'
import LoginScreen from './screens/LoginScreen'
import RegisterScreen from './screens/RegisterScreen'
import ChatScreen from './screens/ChatScreen'
import ConversationScreen from './screens/ConversationScreen'
import FriendsScreen from './screens/FriendsScreen'
import CallScreen from './screens/CallScreen'

const Stack = createNativeStackNavigator()
export const navigationRef = createNavigationContainerRef<any>()

function App() {
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [incomingCall, setIncomingCall] = useState<any>(null)

  // Track auth state and load profile
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) loadProfile(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) loadProfile(session.user.id)
      else setCurrentUser(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const loadProfile = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    if (data) setCurrentUser(data)
  }

  // Listen for incoming calls
  useEffect(() => {
    if (!currentUser?.id) return

    const channel = supabase
      .channel(`incoming_calls:${currentUser.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'call_signals',
        filter: `receiver_id=eq.${currentUser.id}`
      }, async (payload) => {
        const signal = payload.new as any
        if (signal.status !== 'ringing') return

        const { data: callerProfile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', signal.caller_id)
          .single()

        setIncomingCall({ ...signal, callerProfile })
        Vibration.vibrate([400, 200, 400, 200, 400], true)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [currentUser?.id])

  const acceptCall = async () => {
    if (!incomingCall) return
    Vibration.cancel()
    await supabase.from('call_signals').update({ status: 'accepted' }).eq('id', incomingCall.id)
    const call = incomingCall
    setIncomingCall(null)
    navigationRef.navigate('Call', {
      channelId: call.channel_id,
      isVideo: call.call_type === 'video',
      callerName: call.callerProfile?.username || call.callerProfile?.full_name || 'Unknown',
      user: currentUser,
    })
  }

  const rejectCall = async () => {
    if (!incomingCall) return
    Vibration.cancel()
    await supabase.from('call_signals').update({ status: 'rejected' }).eq('id', incomingCall.id)
    setIncomingCall(null)
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer ref={navigationRef}>
        <Stack.Navigator screenOptions={{ headerShown: false }} initialRouteName="Landing">
          <Stack.Screen name="Landing" component={LandingScreen} />
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Register" component={RegisterScreen} />
          <Stack.Screen name="Chat" component={ChatScreen} />
          <Stack.Screen name="Conversation" component={ConversationScreen} />
          <Stack.Screen name="Friends" component={FriendsScreen} />
          <Stack.Screen name="Call" component={CallScreen} />
        </Stack.Navigator>
      </NavigationContainer>

      {/* Incoming Call Modal — rendered OUTSIDE NavigationContainer so it shows on any screen */}
      <Modal visible={!!incomingCall} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.88)', alignItems: 'center', justifyContent: 'center' }}>
          <View style={{ backgroundColor: '#1a1d27', borderRadius: 28, padding: 36, alignItems: 'center', width: '82%' }}>

            <View style={{ width: 84, height: 84, borderRadius: 42, backgroundColor: '#6366f1', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
              <Text style={{ color: 'white', fontSize: 34, fontWeight: '700' }}>
                {incomingCall?.callerProfile?.username?.[0]?.toUpperCase() || '?'}
              </Text>
            </View>

            <Text style={{ color: 'white', fontSize: 22, fontWeight: '700', marginBottom: 6 }}>
              {incomingCall?.callerProfile?.username || 'Unknown'}
            </Text>
            <Text style={{ color: '#9ca3af', fontSize: 14, marginBottom: 8 }}>
              Incoming {incomingCall?.call_type === 'video' ? '📹 Video Call' : '📞 Voice Call'}
            </Text>

            {/* Pulsing ring indicator */}
            <Text style={{ fontSize: 28, marginBottom: 32 }}>
              {incomingCall?.call_type === 'video' ? '🎥' : '📳'}
            </Text>

            <View style={{ flexDirection: 'row', gap: 32 }}>
              {/* Reject */}
              <View style={{ alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={rejectCall}
                  style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: '#ef4444', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}
                >
                  <Text style={{ fontSize: 28 }}>📵</Text>
                </TouchableOpacity>
                <Text style={{ color: '#9ca3af', fontSize: 12 }}>Decline</Text>
              </View>

              {/* Accept */}
              <View style={{ alignItems: 'center' }}>
                <TouchableOpacity
                  onPress={acceptCall}
                  style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: '#22c55e', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}
                >
                  <Text style={{ fontSize: 28 }}>📞</Text>
                </TouchableOpacity>
                <Text style={{ color: '#9ca3af', fontSize: 12 }}>Accept</Text>
              </View>
            </View>

          </View>
        </View>
      </Modal>
    </SafeAreaProvider>
  )
}

registerRootComponent(App)