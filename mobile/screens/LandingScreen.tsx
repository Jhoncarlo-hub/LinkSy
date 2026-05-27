import { useState } from 'react'
import { View, Text, TouchableOpacity, StatusBar } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

export default function LandingScreen({ navigation }: any) {
  const [dark, setDark] = useState(true)

  const t = {
    bg: dark ? '#0a0a0a' : '#f4f5f7',
    card: dark ? '#1a1a2e' : '#ffffff',
    text: dark ? '#ffffff' : '#111827',
    muted: dark ? '#6b7280' : '#9ca3af',
    border: dark ? '#2a2a4a' : '#e8eaed',
    btnPrimary: dark ? '#ffffff' : '#111827',
    btnPrimaryText: dark ? '#000000' : '#ffffff',
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.bg }}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />
      <View style={{ alignItems: 'flex-end', padding: 16 }}>
        <TouchableOpacity onPress={() => setDark(!dark)} style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: t.card, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontSize: 18 }}>{dark ? '☀️' : '🌙'}</Text>
        </TouchableOpacity>
      </View>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <View style={{ width: 72, height: 72, backgroundColor: t.card, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 24 }}>
          <Text style={{ fontSize: 36 }}>💬</Text>
        </View>
        <Text style={{ fontSize: 32, fontWeight: '800', color: t.text, marginBottom: 8 }}>LinkSy</Text>
        <Text style={{ fontSize: 14, color: t.muted, marginBottom: 56, textAlign: 'center' }}>Connect with anyone, anywhere</Text>
        <TouchableOpacity onPress={() => navigation.navigate('Login')} style={{ width: '100%', padding: 17, backgroundColor: t.btnPrimary, borderRadius: 14, alignItems: 'center', marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: t.btnPrimaryText }}>Log In</Text>
          <Text style={{ fontSize: 18, color: t.btnPrimaryText }}>→</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={{ width: '100%', padding: 17, backgroundColor: 'transparent', borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: t.border, flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 24 }}>
          <Text style={{ fontSize: 15, fontWeight: '700', color: t.text }}>Create Account</Text>
          <Text style={{ fontSize: 18, color: t.text }}>→</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}